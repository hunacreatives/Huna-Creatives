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

interface LeadsStats {
  total: number;
  complete: number;
  calling: number;
  attempted: number;
  todayActivity?: { caller: string; count: number }[];
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

  useEffect(() => {
    fetchLeads();
  }, [projectId]);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('hub_project_leads')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setLeads(data || []);
      calculateStats(data || []);
    } catch (err) {
      console.error('Error fetching leads:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (leadsData: Lead[]) => {
    const total = leadsData.length;
    const complete = leadsData.filter(l => l.status === 'complete').length;
    const calling = leadsData.filter(l => l.status === 'calling').length;
    const attempted = leadsData.filter(l => l.status === 'attempted').length;

    setStats({
      total,
      complete,
      calling,
      attempted,
    });
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
                  <tr key={lead.id} className="border-b border-gray-50 hover:bg-gray-50">
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
    </div>
  );
}
