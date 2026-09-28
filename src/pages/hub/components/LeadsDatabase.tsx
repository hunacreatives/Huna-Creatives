import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { fmt, fmtDate } from '@/pages/hub/admin/projects/shared';

interface Lead {
  id: string;
  account_name: string;
  email: string | null;
  phone: string | null;
  primary_contact: string | null;
  status: string;
  assigned_to: string | null;
  attempts_count: number;
  email_found: boolean;
  phone_found: boolean;
  contact_name_found: boolean;
  created_at: string;
  hub_users?: { full_name: string } | null;
}

interface Contractor {
  id: string;
  full_name: string;
}

interface LeadsStats {
  total: number;
  complete: number;
  calling: number;
  attempted: number;
  todayStats?: { callerId: string; callerName: string; callsToday: number; successfulToday: number; emailFoundToday: number; phoneFoundToday: number }[];
}

interface Props {
  projectId: number;
  isAdmin: boolean;
}

export default function LeadsDatabase({ projectId, isAdmin }: Props) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<LeadsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'calling' | 'complete' | 'attempted'>('all');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchLeads();
    if (isAdmin) {
      fetchContractors();
    }
  }, [projectId, isAdmin]);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('hub_project_leads')
        .select('*, hub_project_activity(action, created_at)')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setLeads(data || []);
      if (isAdmin) {
        await calculateStats(data || []);
      } else {
        calculateStats(data || []);
      }
    } catch (err) {
      console.error('Error fetching leads:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = async (leadsData: Lead[]) => {
    const total = leadsData.length;
    const complete = leadsData.filter(l => l.status === 'complete').length;
    const calling = leadsData.filter(l => l.status === 'calling').length;
    const attempted = leadsData.filter(l => l.status === 'attempted').length;

    // Calculate today's per-caller stats from activity log
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let todayStats: { callerId: string; callerName: string; callsToday: number; successfulToday: number; emailFoundToday: number; phoneFoundToday: number }[] = [];

    if (isAdmin) {
      try {
        const { data: activities, error } = await supabase
          .from('hub_project_activity')
          .select('user_id, hub_users(full_name), meta, created_at')
          .eq('project_id', projectId)
          .eq('entity_type', 'lead')
          .gte('created_at', today.toISOString());

        if (!error && activities) {
          const callerMap = new Map<string, { name: string; calls: Set<string>; successful: number; emailFound: number; phoneFound: number }>();

          activities.forEach((activity: any) => {
            if (!activity.user_id) return;
            const callerId = activity.user_id;
            const callerName = activity.hub_users?.full_name || 'Unknown';

            if (!callerMap.has(callerId)) {
              callerMap.set(callerId, { name: callerName, calls: new Set(), successful: 0, emailFound: 0, phoneFound: 0 });
            }

            const caller = callerMap.get(callerId)!;
            caller.calls.add(activity.meta?.lead_id || '');

            if (activity.meta?.outcome === 'interested' || activity.meta?.outcome === 'callback') {
              caller.successful++;
            }
            if (activity.meta?.email_found) {
              caller.emailFound++;
            }
            if (activity.meta?.phone_found) {
              caller.phoneFound++;
            }
          });

          todayStats = Array.from(callerMap.entries()).map(([callerId, data]) => ({
            callerId,
            callerName: data.name,
            callsToday: data.calls.size,
            successfulToday: data.successful,
            emailFoundToday: data.emailFound,
            phoneFoundToday: data.phoneFound,
          }));
        }
      } catch (err) {
        console.error('Error fetching today stats:', err);
      }
    }

    setStats({
      total,
      complete,
      calling,
      attempted,
      todayStats,
    });
  };

  const fetchContractors = async () => {
    try {
      const { data, error } = await supabase
        .from('hub_project_contractors')
        .select('hub_users(id, full_name)')
        .eq('project_id', projectId);

      if (error) throw error;

      const contractorList: Contractor[] = (data || [])
        .map((pc: any) => pc.hub_users)
        .filter(Boolean)
        .filter((u, i, arr) => arr.findIndex(x => x.id === u.id) === i); // dedupe

      setContractors(contractorList);
    } catch (err) {
      console.error('Error fetching contractors:', err);
    }
  };

  const handleLeadClick = (lead: Lead) => {
    setSelectedLead(lead);
    setAssignedTo(lead.assigned_to);
  };

  const handleSaveReassign = async () => {
    if (!selectedLead) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('hub_project_leads')
        .update({ assigned_to: assignedTo || null })
        .eq('id', selectedLead.id);

      if (error) throw error;

      // Update local state
      setLeads(prev =>
        prev.map(l =>
          l.id === selectedLead.id
            ? { ...l, assigned_to: assignedTo || null }
            : l
        )
      );

      setSelectedLead(null);
    } catch (err) {
      console.error('Error saving reassign:', err);
      alert('Error saving reassignment');
    } finally {
      setSaving(false);
    }
  };

  const filteredLeads = leads.filter(lead => {
    if (statusFilter !== 'all' && lead.status !== statusFilter) return false;
    if (!searchTerm) return true;
    return (
      lead.account_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.phone?.includes(searchTerm)
    );
  });

  if (loading) {
    return <div className="text-center py-8 text-gray-400">Loading leads...</div>;
  }

  if (!stats) {
    return <div className="text-center py-8 text-gray-400">No data</div>;
  }

  const completePct = stats.total > 0 ? Math.round((stats.complete / stats.total) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Today's caller performance */}
      {isAdmin && stats.todayStats && stats.todayStats.length > 0 && (
        <div className="bg-gradient-to-r from-sky-50 to-blue-50 rounded-xl border border-sky-200 p-4">
          <p className="text-xs font-semibold text-sky-700 mb-3">TODAY'S PERFORMANCE</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {stats.todayStats.map(caller => (
              <div key={caller.callerId} className="bg-white rounded-lg px-3 py-2.5 border border-sky-100">
                <p className="text-xs font-medium text-gray-700 truncate">{caller.callerName}</p>
                <div className="mt-1.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-500">Calls</span>
                    <span className="text-sm font-bold text-gray-800">{caller.callsToday}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-500">Successful</span>
                    <span className="text-sm font-bold text-emerald-600">{caller.successfulToday}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-500">Email found</span>
                    <span className="text-sm font-bold text-sky-600">{caller.emailFoundToday}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-500">Phone found</span>
                    <span className="text-sm font-bold text-sky-600">{caller.phoneFoundToday}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Header stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="bg-white rounded-xl px-3 py-2.5 shadow-sm border border-gray-100/80">
          <p className="text-lg font-bold text-gray-800">{stats.complete}/{stats.total}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Complete ({completePct}%)</p>
        </div>
        <div className="bg-white rounded-xl px-3 py-2.5 shadow-sm border border-gray-100/80">
          <p className="text-lg font-bold text-sky-600">{stats.calling}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">In Progress</p>
        </div>
        <div className="bg-white rounded-xl px-3 py-2.5 shadow-sm border border-gray-100/80">
          <p className="text-lg font-bold text-gray-600">{stats.attempted}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Attempted</p>
        </div>
        <div className="bg-white rounded-xl px-3 py-2.5 shadow-sm border border-gray-100/80">
          <div className="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-400" style={{ width: `${completePct}%` }} />
          </div>
          <p className="text-[10px] text-gray-400 mt-1">{completePct}% done</p>
        </div>
      </div>

      {/* Search & filter */}
      {isAdmin && (
        <div className="flex gap-2 flex-wrap">
          <input
            type="text"
            placeholder="Search by account, email, or phone..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 flex-1 min-w-48"
          />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none cursor-pointer"
          >
            <option value="all">All statuses</option>
            <option value="new">New</option>
            <option value="calling">Calling</option>
            <option value="complete">Complete</option>
            <option value="attempted">Attempted</option>
          </select>
        </div>
      )}

      {/* Table */}
      {isAdmin && filteredLeads.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Account</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Contact</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Email</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Phone</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Status</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Attempts</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.slice(0, 50).map(lead => (
                  <tr
                    key={lead.id}
                    className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => isAdmin && handleLeadClick(lead)}
                  >
                    <td className="px-4 py-2.5 font-medium text-gray-800">{lead.account_name}</td>
                    <td className="px-4 py-2.5 text-gray-600">{lead.primary_contact}</td>
                    <td className="px-4 py-2.5">{lead.email_found ? '✓' : '–'}</td>
                    <td className="px-4 py-2.5">{lead.phone_found ? '✓' : '–'}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${
                        lead.status === 'complete' ? 'bg-emerald-100 text-emerald-700' :
                        lead.status === 'calling' ? 'bg-sky-100 text-sky-700' :
                        lead.status === 'attempted' ? 'bg-gray-100 text-gray-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">{lead.attempts_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredLeads.length > 50 && (
            <div className="px-4 py-3 bg-gray-50 text-center text-xs text-gray-400">
              Showing 50 of {filteredLeads.length} leads
            </div>
          )}
        </div>
      )}

      {!isAdmin && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
          My Queue view coming soon for cold callers.
        </div>
      )}

      {/* Detail modal */}
      {isAdmin && selectedLead && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-lg max-w-sm w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">Edit Lead</h3>
              <button
                onClick={() => setSelectedLead(null)}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ✕
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              {/* Lead info */}
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Account</p>
                <p className="text-sm font-medium text-gray-800">{selectedLead.account_name}</p>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Contact</p>
                <p className="text-sm text-gray-700">{selectedLead.primary_contact || '–'}</p>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Email</p>
                <p className="text-sm text-gray-700 break-all">{selectedLead.email || '–'}</p>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Phone</p>
                <p className="text-sm text-gray-700">{selectedLead.phone || '–'}</p>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-medium text-gray-500 mb-1">Status</p>
                <p className="text-sm text-gray-700">{selectedLead.status}</p>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Attempts</p>
                <p className="text-sm text-gray-700">{selectedLead.attempts_count}</p>
              </div>

              {/* Reassign dropdown */}
              <div className="border-t border-gray-100 pt-4">
                <label className="block text-xs font-medium text-gray-600 mb-2">Assign To</label>
                <select
                  value={assignedTo || ''}
                  onChange={e => setAssignedTo(e.target.value || null)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                >
                  <option value="">Unassigned</option>
                  {contractors.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.full_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Buttons */}
            <div className="border-t border-gray-100 px-6 py-4 flex gap-3">
              <button
                onClick={() => setSelectedLead(null)}
                className="flex-1 px-4 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-50 border border-gray-200 rounded-lg font-medium text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveReassign}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <i className="ri-loader-4-line animate-spin"></i>
                    Saving...
                  </>
                ) : (
                  <>
                    <i className="ri-check-line"></i>
                    Save
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
