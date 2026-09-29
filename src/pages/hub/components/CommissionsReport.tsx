import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Commission {
  id: number;
  lead_id: string;
  user_id: string;
  milestone: string;
  amount: number;
  created_at: string;
  paid: boolean;
  paid_at: string | null;
  hub_project_leads?: { account_name: string; primary_contact: string } | null;
  hub_users?: { full_name: string } | null;
}

interface Props {
  projectId: number;
}

export default function CommissionsReport({ projectId }: Props) {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [marking, setMarking] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetchCommissions();
  }, [projectId, selectedMonth]);

  const fetchCommissions = async () => {
    setLoading(true);
    try {
      const [year, month] = selectedMonth.split('-').map(Number);
      const startDate = new Date(year, month - 1, 1).toISOString();
      const endDate = new Date(year, month, 1).toISOString();

      const { data, error } = await supabase
        .from('hub_project_commissions')
        .select(
          `id, lead_id, user_id, milestone, amount, created_at, paid, paid_at,
           hub_project_leads(account_name, primary_contact),
           hub_users(full_name)`
        )
        .eq('project_id', projectId)
        .gte('created_at', startDate)
        .lt('created_at', endDate)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCommissions((data || []) as Commission[]);
    } catch (err) {
      console.error('Error fetching commissions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAllPaid = async () => {
    if (!confirm(`Mark all ${selectedMonth} commissions as paid?`)) return;

    setMarking(true);
    try {
      const [year, month] = selectedMonth.split('-').map(Number);
      const startDate = new Date(year, month - 1, 1).toISOString();
      const endDate = new Date(year, month, 1).toISOString();
      const now = new Date().toISOString();

      const { error } = await supabase
        .from('hub_project_commissions')
        .update({ paid: true, paid_at: now })
        .eq('project_id', projectId)
        .eq('paid', false)
        .gte('created_at', startDate)
        .lt('created_at', endDate);

      if (error) throw error;
      await fetchCommissions();
    } catch (err) {
      console.error('Error marking as paid:', err);
      alert('Error marking commissions as paid');
    } finally {
      setMarking(false);
    }
  };

  const pendingCount = commissions.filter(c => !c.paid).length;
  const totalEarned = commissions.reduce((sum, c) => sum + Number(c.amount), 0);
  const totalPaid = commissions.filter(c => c.paid).reduce((sum, c) => sum + Number(c.amount), 0);
  const totalPending = commissions.filter(c => !c.paid).reduce((sum, c) => sum + Number(c.amount), 0);

  return (
    <div className="space-y-4">
      {/* Collapsed summary view */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div>
              <p className="text-xs font-medium text-gray-600">September 2026</p>
              <p className="text-2xl font-bold text-gray-800">${totalEarned.toFixed(2)}</p>
            </div>
            <div className="flex gap-6 text-sm">
              <div>
                <p className="text-xs text-emerald-600">Paid</p>
                <p className="font-bold text-emerald-700">${totalPaid.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-amber-600">Pending</p>
                <p className="font-bold text-amber-700">${totalPending.toFixed(2)}</p>
              </div>
            </div>
          </div>
          <i className={`ri-chevron-${expanded ? 'up' : 'down'}-line text-gray-400 text-xl transition-transform`}></i>
        </button>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="space-y-4">
          {/* Month selector and actions */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Select Month</label>
                <select
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 cursor-pointer"
                >
                  <option value="2026-01">January 2026</option>
                  <option value="2026-02">February 2026</option>
                  <option value="2026-03">March 2026</option>
                  <option value="2026-04">April 2026</option>
                  <option value="2026-05">May 2026</option>
                  <option value="2026-06">June 2026</option>
                  <option value="2026-07">July 2026</option>
                  <option value="2026-08">August 2026</option>
                  <option value="2026-09" selected>September 2026</option>
                  <option value="2026-10">October 2026</option>
                  <option value="2026-11">November 2026</option>
                  <option value="2026-12">December 2026</option>
                </select>
              </div>

              <div className="flex gap-2">
                {pendingCount > 0 && (
                  <button
                    onClick={handleMarkAllPaid}
                    disabled={marking}
                    className="px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
                  >
                    {marking ? 'Marking...' : `Mark All Paid (${pendingCount})`}
                  </button>
                )}
                <button
                  onClick={() => window.print()}
                  className="px-3 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg font-medium text-sm transition-colors"
                >
                  Print/Export
                </button>
              </div>
            </div>
          </div>

          {/* Commissions table */}
          {loading ? (
            <div className="text-center text-gray-500 text-sm py-8">Loading...</div>
          ) : commissions.length === 0 ? (
            <div className="text-center text-gray-500 text-sm py-8">No commissions for this month</div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Lead</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Contact</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Caller</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Milestone</th>
                      <th className="text-right px-4 py-3 font-semibold text-gray-600">Amount</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Earned</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {commissions.map(commission => (
                      <tr key={commission.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-800">
                          {commission.hub_project_leads?.account_name || 'Unknown'}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {commission.hub_project_leads?.primary_contact || '–'}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {commission.hub_users?.full_name || 'Unknown'}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          <span className={`inline-block px-2 py-1 rounded text-[10px] font-medium ${
                            commission.milestone === 'email' ? 'bg-blue-100 text-blue-700' :
                            commission.milestone === 'meeting' ? 'bg-purple-100 text-purple-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {commission.milestone === 'email' ? '📧 Email' :
                             commission.milestone === 'meeting' ? '📅 Meeting' :
                             '📄 Bill'}
                          </span>
                        </td>
                        <td className="text-right px-4 py-3 font-bold text-gray-800">
                          ${Number(commission.amount).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-[11px]">
                          {new Date(commission.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          {commission.paid ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-[10px] font-medium">
                              <i className="ri-check-line"></i>
                              {new Date(commission.paid_at!).toLocaleDateString()}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded text-[10px] font-medium">
                              <i className="ri-time-line"></i>
                              Pending
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 border-t border-gray-100 font-semibold">
                      <td className="px-4 py-3 text-gray-800">{commissions.length} commissions</td>
                      <td colSpan={4} className="text-right text-gray-600"></td>
                      <td className="text-right px-4 py-3 text-gray-800">${totalEarned.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Print styles */}
      <style>{`
        @media print {
          body { background: white; }
          .space-y-4 > * { page-break-inside: avoid; }
          button { display: none; }
          input[type="month"] { display: none; }
        }
      `}</style>
    </div>
  );
}
