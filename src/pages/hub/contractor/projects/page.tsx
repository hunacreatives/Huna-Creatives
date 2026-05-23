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

interface ProjectRow {
  id: number;
  percentage: number;
  payout_status: string;
  paid_at: string | null;
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

export default function ContractorProjectsPage() {
  const { hubUser } = useAuth();
  const [rows, setRows] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hubUser) return;
    supabase
      .from('hub_project_contractors')
      .select('id, percentage, payout_status, paid_at, hub_projects(id, client_name, project_name, service, contract_price, status, start_date, deadline, notes, hub_project_payments(amount), hub_project_costs(amount))')
      .eq('contractor_id', hubUser.id)
      .then(({ data }) => {
        setRows((data as ProjectRow[]) ?? []);
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
                {active.map(r => <ProjectCard key={r.id} row={r} />)}
              </div>
            )}
            {other.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Other</p>
                {other.map(r => <ProjectCard key={r.id} row={r} />)}
              </div>
            )}
          </>
        )}
      </div>
    </ContractorLayout>
  );
}

function ProjectCard({ row }: { row: ProjectRow }) {
  const p = row.hub_projects;
  if (!p) return null;

  const totalPaid = p.hub_project_payments.reduce((s, x) => s + x.amount, 0);
  const totalCosts = p.hub_project_costs.reduce((s, x) => s + x.amount, 0);
  const netProfit = p.contract_price - totalCosts;
  const myCut = netProfit * (row.percentage / 100);
  const paidPct = p.contract_price > 0 ? Math.min((totalPaid / p.contract_price) * 100, 100) : 0;
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
        {row.payout_status === 'paid' ? (
          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium flex-shrink-0">Paid</span>
        ) : (
          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium flex-shrink-0">Pending payout</span>
        )}
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
          <span className="text-gray-700 font-medium">Your cut ({row.percentage}%)</span>
          <span className="font-bold text-[#FF6B35]">{fmt(myCut)}</span>
        </div>
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
