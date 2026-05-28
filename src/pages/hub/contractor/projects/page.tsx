import { useEffect, useState } from 'react';
import ContractorLayout from '@/pages/hub/components/ContractorLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

const fmt = (n: number) => `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const statusCfg: Record<string, { label: string; cls: string }> = {
  ongoing:   { label: 'Ongoing',   cls: 'bg-sky-100 text-sky-700' },
  completed: { label: 'Completed', cls: 'bg-emerald-100 text-emerald-700' },
  paused:    { label: 'Paused',    cls: 'bg-amber-100 text-amber-700' },
  cancelled: { label: 'Cancelled', cls: 'bg-gray-100 text-gray-500' },
};

interface ContractorPayout { id: number; amount: number; paid_at: string; notes: string | null; receipt_url: string | null; }

interface ProjectRow {
  id: number;
  percentage: number;
  payout_type: string;
  fixed_amount: number | null;
  payout_status: string;
  paid_at: string | null;
  hub_project_contractor_payouts: ContractorPayout[];
  hub_projects: {
    id: number;
    client_name: string;
    project_name: string;
    service: string | null;
    contract_price: number;
    status: string;
    start_date: string | null;
    deadline: string | null;
    notes: string | null;
    hub_project_payments: { amount: number }[];
    hub_project_costs: { amount: number }[];
  };
}

interface ProjectRowRaw {
  id: number;
  percentage: number;
  payout_type: string;
  fixed_amount: number | null;
  payout_status: string;
  paid_at: string | null;
  hub_project_contractor_payouts: ContractorPayout[];
  hub_projects: {
    id: number;
    client_name: string;
    project_name: string;
    service: string | null;
    contract_price: number;
    status: string;
    start_date: string | null;
    deadline: string | null;
    notes: string | null;
    hub_project_payments: { amount: number }[];
    hub_project_costs: { amount: number }[];
  }[];
}

export default function ContractorProjectsPage() {
  const { hubUser } = useAuth();
  const [rows, setRows] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!hubUser) return;
    supabase
      .from('hub_project_contractors')
      .select('id, percentage, payout_type, fixed_amount, payout_status, paid_at, hub_project_contractor_payouts(id, amount, paid_at, notes, receipt_url), hub_projects(id, client_name, project_name, service, contract_price, status, start_date, deadline, notes, hub_project_payments(amount), hub_project_costs(amount))')
      .eq('contractor_id', hubUser.id)
      .then(({ data }) => {
        const normalized = ((data ?? []) as ProjectRowRaw[]).map((row) => ({
          ...row,
          hub_project_contractor_payouts: row.hub_project_contractor_payouts ?? [],
          hub_projects: row.hub_projects[0],
        }));
        setRows(normalized);
        setLoading(false);
      });
  }, [hubUser]);

  const active = rows.filter(r => r.hub_projects?.status === 'ongoing');
  const other = rows.filter(r => r.hub_projects?.status !== 'ongoing');

  return (
    <ContractorLayout title="My Projects">
      <div className="max-w-2xl space-y-6">
        {loading ? (
          <div className="flex justify-center py-12"><i className="ri-loader-4-line animate-spin text-xl text-gray-400"></i></div>
        ) : rows.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-xl p-10 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <i className="ri-folder-open-line text-gray-400 text-xl"></i>
            </div>
            <p className="text-sm font-medium text-gray-500">No projects assigned yet</p>
            <p className="text-xs text-gray-400 mt-1">Your admin will assign you when a project starts.</p>
          </div>
        ) : (
          <>
            {active.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Active</p>
                {active.map(r => <ProjectCard key={r.id} row={r} onReceiptClick={setLightboxUrl} />)}
              </div>
            )}
            {other.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Other</p>
                {other.map(r => <ProjectCard key={r.id} row={r} onReceiptClick={setLightboxUrl} />)}
              </div>
            )}
          </>
        )}
      </div>

      {lightboxUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center sm:p-4" onClick={() => setLightboxUrl(null)}>
          <div className="relative max-w-3xl max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <img src={lightboxUrl} alt="Receipt" className="max-w-full max-h-[85vh] rounded-xl object-contain shadow-2xl" />
            <button onClick={() => setLightboxUrl(null)} className="absolute top-2 right-2 w-8 h-8 bg-black/60 text-white rounded-full flex items-center justify-center hover:bg-black cursor-pointer">
              <i className="ri-close-line text-sm"></i>
            </button>
            <a href={lightboxUrl} target="_blank" rel="noopener noreferrer" className="absolute bottom-2 right-2 flex items-center gap-1.5 px-3 py-1.5 bg-black/60 text-white text-xs rounded-lg hover:bg-black">
              <i className="ri-external-link-line text-xs"></i> Open full size
            </a>
          </div>
        </div>
      )}
    </ContractorLayout>
  );
}

function ProjectCard({ row, onReceiptClick }: { row: ProjectRow; onReceiptClick: (url: string) => void }) {
  const p = row.hub_projects;
  if (!p) return null;

  const totalPaid = p.hub_project_payments.reduce((s, x) => s + x.amount, 0);
  const totalCosts = p.hub_project_costs.reduce((s, x) => s + x.amount, 0);
  const netProfit = p.contract_price - totalCosts;
  const isFixed = row.payout_type === 'fixed';
  const myCut = isFixed ? (row.fixed_amount ?? 0) : netProfit * (row.percentage / 100);
  const paidPct = p.contract_price > 0 ? Math.min((totalPaid / p.contract_price) * 100, 100) : 0;
  const payouts = row.hub_project_contractor_payouts ?? [];
  const totalPaidOut = payouts.reduce((s, x) => s + x.amount, 0);
  const payoutPct = myCut > 0 ? Math.min((totalPaidOut / myCut) * 100, 100) : 0;
  const isFullyPaid = totalPaidOut >= myCut && myCut > 0;
  const cfg = statusCfg[p.status] ?? statusCfg.ongoing;

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-[#111827]">{p.project_name}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.cls}`}>{cfg.label}</span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{p.client_name}{p.service ? ` · ${p.service}` : ''}</p>
          {p.deadline && (
            <p className="text-xs text-gray-400 mt-0.5">
              Due {new Date(p.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          )}
        </div>
        {isFullyPaid
          ? <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium flex-shrink-0">Paid in full</span>
          : totalPaidOut > 0
            ? <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium flex-shrink-0">{fmt(totalPaidOut)} received</span>
            : <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium flex-shrink-0">Pending payout</span>
        }
      </div>

      {/* Financials breakdown */}
      <div className="bg-gray-50 rounded-xl p-3.5 space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Contract price</span>
          <span className="font-medium text-gray-800">{fmt(p.contract_price)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Operational costs</span>
          <span className="font-medium text-rose-500">− {fmt(totalCosts)}</span>
        </div>
        <div className="border-t border-gray-200 pt-2 flex justify-between text-xs">
          <span className="text-gray-500 font-medium">Net profit</span>
          <span className="font-semibold text-emerald-600">{fmt(netProfit)}</span>
        </div>
        <div className="border-t border-dashed border-gray-200 pt-2 flex justify-between text-sm">
          <span className="text-gray-700 font-medium">{isFixed ? 'Your fee (fixed)' : `Your cut (${row.percentage}%)`}</span>
          <span className="font-bold text-[#FF6B35]">{fmt(myCut)}</span>
        </div>
      </div>

      {/* Your payout progress */}
      <div>
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>Your payouts received</span>
          <span>{fmt(totalPaidOut)} / {fmt(myCut)} ({payoutPct.toFixed(0)}%)</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${isFullyPaid ? 'bg-emerald-400' : 'bg-amber-400'}`} style={{ width: `${payoutPct}%` }} />
        </div>
        {payouts.length > 0 && (
          <div className="mt-2 space-y-1">
            {payouts.map(pp => (
              <div key={pp.id} className="flex items-center gap-2 text-[11px] text-gray-400 flex-wrap">
                <i className="ri-check-line text-emerald-400 text-[10px]"></i>
                <span className="font-medium text-gray-600">{fmt(pp.amount)}</span>
                <span>· {new Date(pp.paid_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                {pp.notes && <span>· {pp.notes}</span>}
                {pp.receipt_url && (
                  <button onClick={() => onReceiptClick(pp.receipt_url!)} className="cursor-pointer flex-shrink-0 flex items-center gap-1 text-sky-500 hover:text-sky-700">
                    <i className="ri-image-line text-[10px]"></i>
                    <span>View receipt</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Client collection progress */}
      <div>
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>Client payments collected</span>
          <span>{fmt(totalPaid)} / {fmt(p.contract_price)} ({paidPct.toFixed(0)}%)</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-400 rounded-full transition-all" style={{ width: `${paidPct}%` }} />
        </div>
      </div>

      {p.notes && <p className="text-xs text-gray-400 italic">{p.notes}</p>}
    </div>
  );
}
