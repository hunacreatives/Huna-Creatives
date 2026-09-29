import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface OutcomeBreakdown {
  interested: number;
  callback: number;
  notInterested: number;
  voicemail: number;
  noAnswer: number;
  skip: number;
}

interface CallerStat {
  callerId: string;
  callerName: string;
  callsToday: number;
  successfulToday: number;
  emailFoundToday: number;
  phoneFoundToday: number;
  interestedToday: number;
  callbackToday: number;
  notInterestedToday: number;
  voicemailToday: number;
  noAnswerToday: number;
}

interface DashboardStats {
  total: number;
  complete: number;
  calling: number;
  attempted: number;
  outcomes: OutcomeBreakdown;
  callerStats: CallerStat[];
}

const DASHBOARD_PASSWORD = 'smartgrid';

interface Lead {
  id: string;
  account_name: string;
  phone: string | null;
  email: string | null;
  primary_contact: string | null;
  status: string;
  outcome: string | null;
  assigned_to: string | null;
  attempts_count: number;
  callback_date: string | null;
  callback_time: string | null;
  created_at: string;
}

export default function SmartGridDashboard() {
  const [authenticated, setAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [timePeriod, setTimePeriod] = useState<'daily' | 'weekly' | 'monthly' | 'lifetime'>('daily');
  const [tab, setTab] = useState<'stats' | 'contacts'>('stats');
  const [searchQuery, setSearchQuery] = useState('');

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === DASHBOARD_PASSWORD) {
      setAuthenticated(true);
      setPasswordInput('');
      fetchStats();
      fetchLeads();
    } else {
      alert('Incorrect password');
      setPasswordInput('');
    }
  };

  const fetchLeads = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/smartgrid-leads-list`
      );

      if (!response.ok) throw new Error('Failed to fetch leads');

      const data = await response.json();
      setLeads(data);
    } catch (err) {
      console.error('Error fetching leads:', err);
    }
  };

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/smartgrid-dashboard-stats`
      );

      if (!response.ok) throw new Error('Failed to fetch stats');

      const data = await response.json();
      const callerStats = data[timePeriod] || [];

      setStats({
        total: data.total,
        complete: data.complete,
        calling: data.calling,
        attempted: data.attempted,
        outcomes: data.outcomes,
        callerStats,
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authenticated) {
      fetchStats();
      fetchLeads();
      // Poll every 15 seconds for live updates
      const interval = setInterval(() => {
        fetchStats();
        fetchLeads();
      }, 15000);
      return () => clearInterval(interval);
    }
  }, [authenticated, timePeriod]);

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-lg p-8 space-y-6">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-800">SmartGrid Western</h1>
              <p className="text-sm text-gray-500 mt-2">Lead Calling Dashboard</p>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Password</label>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={e => setPasswordInput(e.target.value)}
                  placeholder="Enter password"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                className="w-full px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-lg font-medium transition-colors"
              >
                Access Dashboard
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const completePct = stats?.total ? Math.round((stats.complete / stats.total) * 100) : 0;

  const filteredLeads = leads.filter(lead =>
    lead.account_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lead.phone?.includes(searchQuery) ||
    lead.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lead.primary_contact?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">SmartGrid Western</h1>
            <p className="text-sm text-gray-500 mt-1">Lead Calling Campaign Progress</p>
          </div>
          <button
            onClick={() => setAuthenticated(false)}
            className="px-4 py-2 text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
          >
            Logout
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setTab('stats')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              tab === 'stats'
                ? 'bg-sky-500 text-white'
                : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            Stats
          </button>
          <button
            onClick={() => setTab('contacts')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              tab === 'contacts'
                ? 'bg-sky-500 text-white'
                : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            All Contacts ({leads.length})
          </button>
        </div>

        {/* Stats Tab */}
        {tab === 'stats' && (
          <div className="space-y-6">
            {/* Time period selector */}
            <div className="flex gap-2 flex-wrap">
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
            </div>

        {/* Overall stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-100">
            <p className="text-lg font-bold text-gray-800">{stats?.complete}/{stats?.total}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Complete ({completePct}%)</p>
          </div>
          <div className="bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-100">
            <p className="text-lg font-bold text-sky-600">{stats?.calling}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">In Progress</p>
          </div>
          <div className="bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-100">
            <p className="text-lg font-bold text-gray-600">{stats?.attempted}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Attempted</p>
          </div>
          <div className="bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-100">
            <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-400" style={{ width: `${completePct}%` }} />
            </div>
            <p className="text-[10px] text-gray-400 mt-1">{completePct}% complete</p>
          </div>
        </div>

        {/* Outcome breakdown */}
        {stats?.outcomes && (
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 p-4">
            <p className="text-xs font-semibold text-emerald-700 mb-3">CALL OUTCOMES (All Time)</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <div className="bg-white rounded-lg px-3 py-2 border border-emerald-100">
                <p className="text-[10px] text-gray-500">Interested</p>
                <p className="text-sm font-bold text-emerald-600">{stats.outcomes.interested}</p>
              </div>
              <div className="bg-white rounded-lg px-3 py-2 border border-emerald-100">
                <p className="text-[10px] text-gray-500">Callback</p>
                <p className="text-sm font-bold text-sky-600">{stats.outcomes.callback}</p>
              </div>
              <div className="bg-white rounded-lg px-3 py-2 border border-emerald-100">
                <p className="text-[10px] text-gray-500">Not Interested</p>
                <p className="text-sm font-bold text-gray-600">{stats.outcomes.notInterested}</p>
              </div>
              <div className="bg-white rounded-lg px-3 py-2 border border-emerald-100">
                <p className="text-[10px] text-gray-500">Voicemail</p>
                <p className="text-sm font-bold text-amber-600">{stats.outcomes.voicemail}</p>
              </div>
              <div className="bg-white rounded-lg px-3 py-2 border border-emerald-100">
                <p className="text-[10px] text-gray-500">No Answer</p>
                <p className="text-sm font-bold text-amber-600">{stats.outcomes.noAnswer}</p>
              </div>
              <div className="bg-white rounded-lg px-3 py-2 border border-emerald-100">
                <p className="text-[10px] text-gray-500">Skip</p>
                <p className="text-sm font-bold text-gray-600">{stats.outcomes.skip}</p>
              </div>
            </div>
            <div className="mt-2 text-[10px] text-emerald-600">
              <p>Qualified: <span className="font-bold">{stats.outcomes.interested + stats.outcomes.callback}</span> prospects</p>
            </div>
          </div>
        )}

        {/* Caller performance */}
        {stats?.callerStats && stats.callerStats.length > 0 && (
          <div className="bg-gradient-to-r from-sky-50 to-blue-50 rounded-xl border border-sky-200 p-4">
            <p className="text-xs font-semibold text-sky-700 mb-3 capitalize">{timePeriod.toUpperCase()} PERFORMANCE</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {stats.callerStats.map(caller => {
                const callbackRate = caller.callsToday > 0 ? ((caller.interestedToday + caller.callbackToday) / caller.callsToday * 100).toFixed(0) : 0;
                return (
                  <div key={caller.callerId} className="bg-white rounded-lg px-4 py-3 border border-sky-100">
                    <p className="text-xs font-medium text-gray-700 mb-2">{caller.callerName}</p>
                    <div className="space-y-1.5 text-[10px]">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Calls</span>
                        <span className="font-bold text-gray-800">{caller.callsToday}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Qualified</span>
                        <span className="font-bold text-emerald-600">{caller.interestedToday + caller.callbackToday} ({callbackRate}%)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Interested</span>
                        <span className="font-bold text-sky-600">{caller.interestedToday}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Callback</span>
                        <span className="font-bold text-sky-600">{caller.callbackToday}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Progress bar */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-600">Overall Progress</span>
            <span className="text-xs text-gray-400">{completePct}%</span>
          </div>
          <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-400 transition-all" style={{ width: `${completePct}%` }} />
          </div>
        </div>
          </div>
        )}

        {/* Contacts Tab */}
        {tab === 'contacts' && (
          <div className="space-y-4">
            <div>
              <input
                type="text"
                placeholder="Search by name, phone, email, or contact..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              />
              <p className="text-xs text-gray-500 mt-2">{filteredLeads.length} of {leads.length} leads</p>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Account Name</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Contact</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Phone</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Email</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Outcome</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Attempts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeads.length > 0 ? (
                      filteredLeads.map(lead => (
                        <tr key={lead.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-gray-800 font-medium">{lead.account_name}</td>
                          <td className="px-4 py-3 text-gray-600">{lead.primary_contact || '—'}</td>
                          <td className="px-4 py-3 text-gray-600">{lead.phone || '—'}</td>
                          <td className="px-4 py-3 text-gray-600 text-xs">{lead.email || '—'}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              lead.status === 'complete' ? 'bg-emerald-100 text-emerald-700' :
                              lead.status === 'calling' ? 'bg-sky-100 text-sky-700' :
                              lead.status === 'attempted' ? 'bg-amber-100 text-amber-700' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {lead.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600 text-xs">
                            {lead.outcome ? (
                              <span className={`px-2 py-1 rounded font-medium ${
                                lead.outcome === 'interested' || lead.outcome === 'callback' ? 'bg-emerald-50 text-emerald-700' :
                                lead.outcome === 'not_interested' ? 'bg-red-50 text-red-700' :
                                'bg-gray-50 text-gray-600'
                              }`}>
                                {lead.outcome.replace('_', ' ')}
                              </span>
                            ) : '—'}
                          </td>
                          <td className="px-4 py-3 text-gray-600 text-center">{lead.attempts_count}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="px-4 py-6 text-center text-gray-500">
                          No leads found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
