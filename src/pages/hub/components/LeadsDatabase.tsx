import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { fmt, fmtDate } from '@/pages/hub/admin/projects/shared';
import CommissionsReport from './CommissionsReport';

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
  meeting_scheduled?: boolean;
  meeting_scheduled_at?: string | null;
  bill_received?: boolean;
  bill_received_at?: string | null;
  next_call_goal?: string | null;
  created_at: string;
  hub_users?: { full_name: string } | null;
}

interface Contractor {
  id: string;
  full_name: string;
}

interface CallerStats {
  callerId: string;
  callerName: string;
  callsToday: number;
  successfulToday: number;
  callbacksToday: number;
  billReceivedToday: number;
}

interface LeadsStats {
  total: number;
  complete: number;
  calling: number;
  attempted: number;
  todayStats?: CallerStats[];
}

// The night shift runs past midnight, so work counts toward the Manila date the
// shift started on (noon cutoff, same rule slack-attendance uses).
const shiftDayOf = (ts: string | number) =>
  new Date(new Date(ts).getTime() - 12 * 60 * 60 * 1000).toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });

const addDays = (day: string, n: number) => {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

interface Props {
  projectId: number;
  isAdmin: boolean;
}

export default function LeadsDatabase({ projectId, isAdmin }: Props) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<LeadsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'calling' | 'complete' | 'callback_pending' | 'attempted'>('all');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [timePeriod, setTimePeriod] = useState<'daily' | 'weekly' | 'monthly' | 'lifetime'>('daily');
  const [allTimePeriodStats, setAllTimePeriodStats] = useState<Record<string, CallerStats[]> | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalLeads, setTotalLeads] = useState(0);
  const leadsPerPage = 50;
  const [followUpFilter, setFollowUpFilter] = useState<'all' | 'pending' | 'sent'>('all');
  const [leadHistory, setLeadHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [assignedFilter, setAssignedFilter] = useState<string | null>(null);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(() => shiftDayOf(Date.now()));
  const selectedDateRef = useRef(selectedDate);
  selectedDateRef.current = selectedDate;

  useEffect(() => {
    fetchLeads(0, '');
    if (isAdmin) {
      fetchContractors();
    }
  }, [projectId, isAdmin]);

  // Refresh caller stats every minute while the page is open
  useEffect(() => {
    if (!isAdmin) return;
    const interval = setInterval(() => {
      calculateStats(leads, totalLeads, selectedDateRef.current);
    }, 60000);
    return () => clearInterval(interval);
  }, [projectId, isAdmin, leads, totalLeads]);

  // Update stats when time period changes
  useEffect(() => {
    if (allTimePeriodStats) {
      setStats(prev => prev ? { ...prev, todayStats: allTimePeriodStats[timePeriod] || [] } : null);
    }
  }, [timePeriod, allTimePeriodStats]);

  // Recalculate stats when selected date changes
  useEffect(() => {
    if (stats) {
      calculateStats(leads, totalLeads, selectedDate);
    }
  }, [selectedDate]);

  const fetchLeads = async (page = 0, searchQuery = '', status = statusFilter, assigned = assignedFilter) => {
    setLoading(true);
    try {
      const start = page * leadsPerPage;
      const end = start + leadsPerPage - 1;

      let query = supabase
        .from('hub_project_leads')
        .select('*, hub_users!assigned_to(id, full_name)', { count: 'exact' })
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      // Apply status filter
      if (status !== 'all') {
        query = query.eq('status', status);
      }

      // Apply assigned filter
      if (assigned) {
        query = query.or(`assigned_to.eq.${assigned},locked_by.eq.${assigned}`);
      }

      // If searching, apply search filters
      if (searchQuery.trim()) {
        query = query.or(
          `account_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`
        );
      }

      const { data, error, count } = await query.range(start, end);

      if (error) throw error;

      const totalCount = count || 0;
      setLeads(data || []);
      setTotalLeads(totalCount);
      setCurrentPage(page);

      if (isAdmin) {
        await calculateStats(data || [], totalCount);
      } else {
        calculateStats(data || [], totalCount);
      }
    } catch (err) {
      console.error('Error fetching leads:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = async (_leadsData: Lead[], total: number = totalLeads, dateStr: string = selectedDateRef.current) => {
    const countStatus = async (status: string) => {
      const { count } = await supabase
        .from('hub_project_leads')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', projectId)
        .eq('status', status);
      return count || 0;
    };
    const [complete, calling, attempted] = await Promise.all([
      countStatus('complete'),
      countStatus('calling'),
      countStatus('attempted'),
    ]);

    const allStats: Record<string, CallerStats[]> = {};

    if (isAdmin) {
      try {
        // The call log is the record of who called which lead and when
        const activity: any[] = [];
        for (let from = 0; ; from += 1000) {
          const { data, error } = await supabase
            .from('hub_project_activity')
            .select('id, entity_id, user_id, created_at, meta')
            .eq('project_id', projectId)
            .eq('action', 'lead_outcome_logged')
            .order('id', { ascending: true })
            .range(from, from + 999);
          if (error) throw error;
          activity.push(...(data || []));
          if (!data || data.length < 1000) break;
        }

        const [{ data: bills }, { data: users }, { data: callers }] = await Promise.all([
          supabase
            .from('hub_project_leads')
            .select('id, last_caller_id, bill_received_at')
            .eq('project_id', projectId)
            .eq('bill_received', true),
          supabase.from('hub_users').select('id, full_name'),
          supabase
            .from('hub_project_contractors')
            .select('user_id')
            .eq('project_id', projectId)
            .eq('project_role', 'Cold Caller'),
        ]);

        const userMap = new Map((users || []).map(u => [u.id, u.full_name]));

        const inPeriod: Record<string, (day: string) => boolean> = {
          daily: day => day === dateStr,
          weekly: day => day > addDays(dateStr, -7) && day <= dateStr,
          monthly: day => day.slice(0, 7) === dateStr.slice(0, 7) && day <= dateStr,
          lifetime: day => day <= dateStr,
        };

        for (const [period, matches] of Object.entries(inPeriod)) {
          const callerMap = new Map<string, { calls: Set<string>; successful: Set<string>; callbacks: Set<string>; bills: Set<string> }>();
          const forCaller = (id: string) => {
            if (!callerMap.has(id)) {
              callerMap.set(id, { calls: new Set(), successful: new Set(), callbacks: new Set(), bills: new Set() });
            }
            return callerMap.get(id)!;
          };
          // Show every cold caller, even before their first call of the shift
          for (const c of callers || []) if (c.user_id) forCaller(c.user_id);

          for (const a of activity) {
            if (!a.user_id || !matches(shiftDayOf(a.created_at))) continue;
            const caller = forCaller(a.user_id);
            const leadId = String(a.entity_id);
            caller.calls.add(leadId);
            if (a.meta?.email_found) caller.successful.add(leadId);
            if (a.meta?.outcome === 'callback') caller.callbacks.add(leadId);
          }

          // Bills are marked by admin, credited to the caller who last worked the lead
          for (const b of bills || []) {
            if (!b.last_caller_id || !b.bill_received_at || !matches(shiftDayOf(b.bill_received_at))) continue;
            forCaller(b.last_caller_id).bills.add(b.id);
          }

          allStats[period] = Array.from(callerMap.entries())
            .map(([callerId, c]) => ({
              callerId,
              callerName: userMap.get(callerId) || 'Unknown',
              callsToday: c.calls.size,
              successfulToday: c.successful.size,
              callbacksToday: c.callbacks.size,
              billReceivedToday: c.bills.size,
            }))
            .sort((x, y) => x.callerName.localeCompare(y.callerName));
        }

        setAllTimePeriodStats(allStats);
      } catch (err) {
        console.error('Error fetching stats:', err);
      }
    }

    setStats({
      total,
      complete,
      calling,
      attempted,
      todayStats: allStats[timePeriod] || [],
    });
  };

  const fetchContractors = async () => {
    try {
      const { data, error } = await supabase
        .from('hub_project_contractors')
        .select('hub_users(id, full_name)')
        .eq('project_id', projectId)
        .eq('project_role', 'Cold Caller');

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

  const fetchLeadHistory = async (leadId: string) => {
    setHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .from('hub_project_activity')
        .select(`
          id,
          created_at,
          action,
          meta,
          hub_users:user_id(full_name)
        `)
        .eq('project_id', projectId)
        .eq('entity_type', 'lead')
        .eq('entity_id', leadId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeadHistory((data as any) || []);
    } catch (err) {
      console.error('Error fetching lead history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleLeadClick = (lead: Lead) => {
    setSelectedLead(lead);
    setAssignedTo(lead.assigned_to);
    if (lead.attempts_count > 0) {
      fetchLeadHistory(lead.id);
    } else {
      setLeadHistory([]);
    }
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

    if (followUpFilter === 'pending') {
      if (!lead.email || lead.follow_up_email_sent) return false;
    } else if (followUpFilter === 'sent') {
      if (!lead.follow_up_email_sent) return false;
    }

    if (assignedFilter) {
      if (lead.assigned_to !== assignedFilter && lead.locked_by !== assignedFilter) return false;
    }

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
      {/* Time period selector + date picker */}
      {isAdmin && (
        <div className="flex gap-2 flex-wrap items-center">
          {(['daily', 'weekly', 'monthly', 'lifetime'] as const).map(period => (
            <button
              key={period}
              onClick={() => setTimePeriod(period)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors capitalize ${
                timePeriod === period
                  ? 'bg-sky-500 text-white'
                  : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {period}
            </button>
          ))}
          <div className="flex items-center gap-2 ml-auto">
            <label className="text-xs font-medium text-gray-600">Date:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500"
            />
          </div>
        </div>
      )}

      {/* Caller performance stats */}
      {isAdmin && stats.todayStats && stats.todayStats.length > 0 && (
        <div className="bg-gradient-to-r from-sky-50 to-blue-50 rounded-xl border border-sky-200 p-4">
          <p className="text-xs font-semibold text-sky-700 mb-3 capitalize">{timePeriod.toUpperCase()} PERFORMANCE</p>
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
                    <span className="text-[10px] text-gray-500">Callbacks set</span>
                    <span className="text-sm font-bold text-sky-600">{caller.callbacksToday}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-500">Bill received</span>
                    <span className="text-sm font-bold text-sky-600">{caller.billReceivedToday}</span>
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

      {/* Caller workload tabs */}
      {isAdmin && (
        <div className="flex gap-2 flex-wrap mb-4">
          <button
            onClick={() => {
              setAssignedFilter(null);
              fetchLeads(0, searchTerm, statusFilter, null);
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              assignedFilter === null
                ? 'bg-sky-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Callers ({leads.length})
          </button>
          {contractors.map(c => {
            const count = leads.filter(l => l.assigned_to === c.id || l.locked_by === c.id).length;
            return (
              <button
                key={c.id}
                onClick={() => {
                  setAssignedFilter(c.id);
                  fetchLeads(0, searchTerm, statusFilter, c.id);
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  assignedFilter === c.id
                    ? 'bg-sky-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {c.full_name} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Payouts report */}
      {isAdmin && (
        <CommissionsReport projectId={projectId} />
      )}

      {/* Search & filter */}
      {isAdmin && (
        <div className="flex gap-2 flex-wrap">
          <input
            type="text"
            placeholder="Search by account, email, or phone..."
            value={searchTerm}
            onChange={e => {
              const value = e.target.value;
              setSearchTerm(value);

              // Debounce search: clear previous timeout and set new one
              if (searchTimeout) clearTimeout(searchTimeout);
              const timeout = setTimeout(() => {
                fetchLeads(0, value);
              }, 300);
              setSearchTimeout(timeout);
            }}
            className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 flex-1 min-w-48"
          />
          <select
            value={statusFilter}
            onChange={e => {
              setStatusFilter(e.target.value as any);
              fetchLeads(0, searchTerm, e.target.value as any, assignedFilter);
            }}
            className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none cursor-pointer"
          >
            <option value="all">All statuses</option>
            <option value="new">New</option>
            <option value="calling">Calling</option>
            <option value="complete">Complete</option>
            <option value="callback_pending">Callback Scheduled</option>
            <option value="attempted">Attempted</option>
          </select>
          <select
            value={followUpFilter}
            onChange={e => setFollowUpFilter(e.target.value as any)}
            className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none cursor-pointer"
          >
            <option value="all">All follow-ups</option>
            <option value="pending">Follow-up Pending</option>
            <option value="sent">Follow-up Sent</option>
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
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Assigned To</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map(lead => (
                  <tr
                    key={lead.id}
                    className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => isAdmin && handleLeadClick(lead)}
                  >
                    <td className="px-4 py-2.5 font-medium text-gray-800">{lead.account_name}</td>
                    <td className="px-4 py-2.5 text-gray-600">{lead.primary_contact}</td>
                    <td className="px-4 py-2.5 text-blue-600 text-xs truncate">{lead.email || '–'}</td>
                    <td className="px-4 py-2.5">{lead.phone_found ? '✓' : '–'}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${
                        lead.status === 'complete' ? 'bg-emerald-100 text-emerald-700' :
                        lead.status === 'calling' ? 'bg-sky-100 text-sky-700' :
                        lead.status === 'callback_pending' ? 'bg-amber-100 text-amber-700' :
                        lead.status === 'attempted' ? 'bg-gray-100 text-gray-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {lead.status === 'callback_pending' ? 'Callback Scheduled' : lead.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">{lead.attempts_count}</td>
                    <td className="px-4 py-2.5 text-gray-600 text-xs">{lead.hub_users?.full_name || '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalLeads > 0 && (
            <div className="px-4 py-3 bg-gray-50 flex items-center justify-between text-xs text-gray-400">
              <span>Page {currentPage + 1} of {Math.ceil(totalLeads / leadsPerPage)}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => fetchLeads(currentPage - 1, searchTerm)}
                  disabled={currentPage === 0}
                  className="px-3 py-1 rounded bg-gray-200 disabled:opacity-50 hover:bg-gray-300 disabled:cursor-not-allowed"
                >
                  ← Prev
                </button>
                <button
                  onClick={() => fetchLeads(currentPage + 1, searchTerm)}
                  disabled={currentPage >= Math.ceil(totalLeads / leadsPerPage) - 1}
                  className="px-3 py-1 rounded bg-gray-200 disabled:opacity-50 hover:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Next →
                </button>
              </div>
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

              <div className="border-t border-gray-100 pt-4 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Status</p>
                  <p className="text-sm text-gray-700">{selectedLead.status}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Attempts</p>
                  <p className="text-sm text-gray-700">{selectedLead.attempts_count}</p>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Assigned To</p>
                <p className="text-sm text-gray-700">{selectedLead.hub_users?.full_name || '–'}</p>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Follow-up Email</p>
                <p className="text-sm text-gray-700">{selectedLead.follow_up_email_sent ? '✓ Sent' : '–'}</p>
              </div>

              <div className="border-t border-gray-100 pt-4 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Meeting Scheduled</p>
                  <p className="text-sm text-gray-700">{selectedLead.meeting_scheduled ? '✓ Yes' : '–'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Bill Received</p>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedLead.bill_received || false}
                      onChange={async (e) => {
                        try {
                          await supabase
                            .from('hub_project_leads')
                            .update({ bill_received: e.target.checked, bill_received_at: e.target.checked ? new Date().toISOString() : null })
                            .eq('id', selectedLead.id);
                          // Refresh the lead
                          if (selectedLead) {
                            setSelectedLead({ ...selectedLead, bill_received: e.target.checked });
                          }
                        } catch (err) {
                          console.error('Error updating bill received:', err);
                        }
                      }}
                      className="w-4 h-4 rounded border-gray-300 text-sky-500 focus:ring-0 cursor-pointer"
                    />
                    <span className="text-sm text-gray-700">{selectedLead.bill_received ? '✓ Received' : 'Mark received'}</span>
                  </label>
                </div>
              </div>

              {selectedLead.next_call_goal && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Next Call Goal</p>
                  <p className="text-sm text-gray-700 bg-amber-50 p-2 rounded">
                    {selectedLead.next_call_goal === 'email' ? '📧 Get Email' : selectedLead.next_call_goal === 'meeting' ? '📅 Schedule Meeting' : '📄 Get Electric Bill'}
                  </p>
                </div>
              )}

              {/* Call History */}
              {leadHistory.length > 0 && (
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-xs font-semibold text-gray-600 mb-2">Call History</p>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {leadHistory.map(log => (
                      <div key={log.id} className="text-xs bg-gray-50 p-3 rounded border border-gray-200">
                        <p className="font-medium text-gray-700">
                          {new Date(log.created_at).toLocaleString()} · {log.hub_users?.full_name || 'Unknown'}
                        </p>
                        <p className="text-gray-600 mt-1 font-medium">Outcome: {log.meta?.outcome || 'N/A'}</p>
                        {log.meta?.notes && (
                          <p className="text-gray-700 mt-2 bg-white p-2 rounded whitespace-pre-wrap">{log.meta.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
