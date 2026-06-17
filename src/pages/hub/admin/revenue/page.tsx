import { useEffect, useState, useMemo } from 'react';
import AdminLayout from '@/pages/hub/components/AdminLayout';
import { supabase } from '@/lib/supabase';
import { useHubAuth as useAuth } from '@/hooks/useHubAuth';
import { useDemo } from '@/contexts/DemoContext';
import { getSetting } from '@/lib/settings';

const fmt = (n: number) => `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface Project {
  id: number;
  project_name: string;
  client_name: string;
  project_type: string;
  service: string | null;
  status: string;
  contract_price: number;
  monthly_rate: number | null;
  monthly_rate_currency?: string | null;
  hub_project_payments: { id: number; amount: number; paid_at: string }[];
  hub_project_costs: { id: number; amount: number; date: string }[];
}

export default function RevenuePage() {
  const { hubUser } = useAuth();
  const { isDemo } = useDemo();
  const isOwner = hubUser?.role === 'owner' || isDemo;

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [usdRate, setUsdRate] = useState(56);
  const [statsPeriod, setStatsPeriod] = useState<'month' | 'year' | 'all'>('all');
  const [statsDateFrom, setStatsDateFrom] = useState('');
  const [statsDateTo, setStatsDateTo] = useState('');

  useEffect(() => {
    getSetting('usd_rate', '56').then(v => setUsdRate(parseFloat(v)));
  }, []);

  useEffect(() => {
    if (isDemo) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('hub_projects')
        .select('id, project_name, client_name, project_type, service, status, contract_price, monthly_rate, monthly_rate_currency, hub_project_payments(id, amount, paid_at), hub_project_costs(id, amount, date)')
        .order('created_at', { ascending: false });
      setProjects((data as Project[]) ?? []);
      setLoading(false);
    })();
  }, [isDemo]);

  const summaryTotals = useMemo(() => {
    const now = new Date();
    const filterPayment = (paid_at: string) => {
      if (statsPeriod === 'month') {
        const m = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        return paid_at.startsWith(m);
      }
      if (statsPeriod === 'year') return paid_at.startsWith(String(now.getFullYear()));
      if (statsPeriod === 'custom') {
        if (statsDateFrom && paid_at < statsDateFrom) return false;
        if (statsDateTo && paid_at > statsDateTo) return false;
      }
      return true;
    };
    let contractValue = 0, costs = 0, collected = 0, mrr = 0;
    for (const p of projects.filter(p => p.project_type !== 'internal')) {
      if (p.project_type === 'retainer') {
        const rate = p.monthly_rate ?? 0;
        mrr += p.monthly_rate_currency === 'USD' ? rate * usdRate : rate;
      } else {
        contractValue += p.contract_price ?? 0;
      }
      costs += p.hub_project_costs.reduce((s, x) => s + x.amount, 0);
      collected += p.hub_project_payments.filter(x => filterPayment(x.paid_at)).reduce((s, x) => s + x.amount, 0);
    }
    const collectionPct = contractValue > 0 ? Math.min((collected / contractValue) * 100, 100) : 0;
    return { contractValue, costs, netProfit: contractValue - costs, collected, collectionPct, mrr };
  }, [projects, statsPeriod, statsDateFrom, statsDateTo, usdRate]);

  const monthlyCollections = useMemo(() => {
    const now = new Date();
    const months: { key: string; label: string; total: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.push({ key, label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }), total: 0 });
    }
    for (const p of projects) {
      for (const pay of p.hub_project_payments) {
        const k = pay.paid_at.slice(0, 7);
        const mo = months.find(m => m.key === k);
        if (mo) mo.total += pay.amount;
      }
    }
    return months;
  }, [projects]);

  const serviceBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of projects.filter(p => p.project_type !== 'internal')) {
      const key = p.service || 'General';
      const value = p.project_type === 'retainer'
        ? (p.monthly_rate_currency === 'USD' ? (p.monthly_rate ?? 0) * usdRate : (p.monthly_rate ?? 0))
        : (p.contract_price ?? 0);
      map[key] = (map[key] ?? 0) + value;
    }
    const total = Object.values(map).reduce((s, v) => s + v, 0) || 1;
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value]) => ({ name, value, pct: Math.round((value / total) * 100) }));
  }, [projects, usdRate]);

  const topClients = useMemo(() => {
    const map: Record<string, { name: string; collected: number; contractValue: number }> = {};
    for (const p of projects.filter(p => p.project_type === 'client')) {
      if (!map[p.client_name]) map[p.client_name] = { name: p.client_name, collected: 0, contractValue: 0 };
      map[p.client_name].contractValue += p.contract_price ?? 0;
      map[p.client_name].collected += p.hub_project_payments.reduce((s, x) => s + x.amount, 0);
    }
    return Object.values(map).sort((a, b) => b.collected - a.collected).slice(0, 6);
  }, [projects]);

  if (loading) return (
    <AdminLayout title="Revenue">
      <div className="flex items-center justify-center h-40">
        <i className="ri-loader-4-line animate-spin text-2xl text-gray-300"></i>
      </div>
    </AdminLayout>
  );

  const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];

  return (
    <AdminLayout title="Revenue">
      <div className="space-y-6">

        {/* Period filter */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex gap-1 bg-gray-100 p-0.5 rounded-xl">
            {(['month', 'year', 'all'] as const).map(p => (
              <button key={p} onClick={() => setStatsPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${statsPeriod === p ? 'bg-white text-[#111827] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {p === 'month' ? 'This Month' : p === 'year' ? 'This Year' : 'All Time'}
              </button>
            ))}
          </div>
          <button onClick={() => setStatsPeriod('custom' as any)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium border cursor-pointer transition-all ${statsPeriod === 'custom' ? 'bg-[#111827] text-white border-[#111827]' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
            Custom
          </button>
          {(statsPeriod as string) === 'custom' && (
            <div className="flex items-center gap-1.5">
              <input type="date" value={statsDateFrom} onChange={e => setStatsDateFrom(e.target.value)}
                className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none" />
              <span className="text-xs text-gray-400">to</span>
              <input type="date" value={statsDateTo} onChange={e => setStatsDateTo(e.target.value)}
                className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none" />
            </div>
          )}
          {(statsPeriod as string) !== 'all' && <p className="text-[11px] text-gray-400 ml-1">Filtering Collected by payment date</p>}
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' }}>
            <p className="text-[11px] text-blue-200 uppercase tracking-widest font-semibold">Project Value</p>
            <p className="text-[22px] font-bold text-white mt-1.5 leading-none">{fmt(summaryTotals.contractValue)}</p>
            <p className="text-xs text-blue-200 mt-1.5">{projects.filter(p => p.project_type === 'client').length} one-time project{projects.filter(p => p.project_type === 'client').length !== 1 ? 's' : ''}</p>
          </div>
          {isOwner && (
            <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)' }}>
              <p className="text-[11px] text-violet-200 uppercase tracking-widest font-semibold">Monthly Retainer</p>
              <p className="text-[22px] font-bold text-white mt-1.5 leading-none">{fmt(summaryTotals.mrr)}</p>
              <p className="text-xs text-violet-200 mt-1.5">{projects.filter(p => p.project_type === 'retainer' && p.status === 'ongoing').length} active client{projects.filter(p => p.project_type === 'retainer' && p.status === 'ongoing').length !== 1 ? 's' : ''}</p>
            </div>
          )}
          <div className="rounded-2xl p-5 bg-white border border-gray-100">
            <p className="text-[11px] text-gray-400 uppercase tracking-widest font-semibold">Active</p>
            <p className="text-[22px] font-bold text-[#111827] mt-1.5 leading-none">{projects.filter(p => p.status === 'ongoing').length}</p>
            <p className="text-xs text-gray-400 mt-1.5">Projects + retainers</p>
          </div>
          <div className="rounded-2xl p-5 bg-white border border-gray-100">
            <p className="text-[11px] text-gray-400 uppercase tracking-widest font-semibold">Collected</p>
            <p className="text-[22px] font-bold text-emerald-600 mt-1.5 leading-none">{fmt(summaryTotals.collected)}</p>
            <p className="text-xs text-gray-400 mt-1.5">{summaryTotals.collectionPct.toFixed(0)}% of one-time contracts</p>
          </div>
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Monthly Collections — 12 months */}
          <div className="lg:col-span-2 bg-white border border-gray-100 rounded-2xl p-5">
            <p className="text-sm font-semibold text-[#111827] mb-4">Monthly Collections</p>
            {(() => {
              const maxVal = Math.max(...monthlyCollections.map(m => m.total), 1);
              return (
                <div className="flex items-end gap-1.5 h-32">
                  {monthlyCollections.map(m => (
                    <div key={m.key} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                      <span className="text-[8px] text-gray-400 font-medium leading-none">{m.total > 0 ? `₱${(m.total / 1000).toFixed(0)}k` : ''}</span>
                      <div className="w-full rounded-t-md transition-all" style={{ height: `${Math.max((m.total / maxVal) * 80, m.total > 0 ? 6 : 2)}px`, background: m.total > 0 ? '#2563eb' : '#e5e7eb' }} />
                      <span className="text-[8px] text-gray-400 leading-none truncate w-full text-center">{m.label}</span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* By Service */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5">
            <p className="text-sm font-semibold text-[#111827] mb-4">By Service</p>
            {serviceBreakdown.length === 0 ? (
              <p className="text-xs text-gray-300 italic">No services set</p>
            ) : (
              <div className="space-y-3">
                {serviceBreakdown.map((s, i) => (
                  <div key={s.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] text-gray-600 font-medium truncate">{s.name}</span>
                      <span className="text-[11px] text-gray-400 ml-2 flex-shrink-0">{s.pct}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${s.pct}%`, background: COLORS[i % COLORS.length] }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Top clients by collected */}
        {topClients.length > 0 && (
          <div className="bg-white border border-gray-100 rounded-2xl p-5">
            <p className="text-sm font-semibold text-[#111827] mb-4">Top Clients — One-Time Projects</p>
            <div className="space-y-3">
              {topClients.map(c => {
                const pct = c.contractValue > 0 ? Math.min((c.collected / c.contractValue) * 100, 100) : 0;
                return (
                  <div key={c.name} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-bold text-blue-500">{c.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-800 truncate">{c.name}</span>
                        <span className="text-xs text-gray-500 ml-2 flex-shrink-0">{fmt(c.collected)} <span className="text-gray-300">/ {fmt(c.contractValue)}</span></span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  );
}
