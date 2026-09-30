import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useHubAuth } from '@/hooks/useHubAuth';
import { useDemo } from '@/contexts/DemoContext';
import { supabase } from '@/lib/supabase';
import ContractorLayout from '@/pages/hub/components/ContractorLayout';
import { formatManilaDateTime, formatShiftDay } from '@/lib/smartgridShift';

interface WorkedLead {
  id: string;
  account_name: string;
  primary_contact: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  callback_date: string | null;
  callback_time: string | null;
  next_call_goal: 'email' | 'meeting' | 'bill' | null;
  assigned_to: string | null;
  meeting_scheduled: boolean;
  bill_received: boolean;
  email_reply_received: boolean;
  email_reply_received_at: string | null;
}

interface CallEntry {
  id: number;
  entity_id: string;
  user_id: string;
  created_at: string;
  meta: { outcome?: string; notes?: string; email_found?: boolean; callback_date?: string | null } | null;
  hub_users?: { full_name: string } | null;
}

const OUTCOME: Record<string, { label: string; tone: string }> = {
  interested: { label: 'Interested', tone: 'bg-emerald-100 text-emerald-700' },
  callback: { label: 'Callback', tone: 'bg-amber-100 text-amber-700' },
  not_interested: { label: 'Not interested', tone: 'bg-rose-100 text-rose-700' },
  voicemail: { label: 'Voicemail', tone: 'bg-gray-100 text-gray-600' },
  no_answer: { label: 'No answer', tone: 'bg-gray-100 text-gray-600' },
};
const GOAL: Record<string, string> = { email: 'Get email', meeting: 'Book meeting', bill: 'Get utility bill' };

type Filter = 'all' | 'callbacks' | 'emails' | 'replied' | 'interested' | 'no_contact';
const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'callbacks', label: 'My callbacks' },
  { value: 'emails', label: 'Emails captured' },
  { value: 'replied', label: 'Replied' },
  { value: 'interested', label: 'Interested' },
  { value: 'no_contact', label: 'Voicemail / no answer' },
];

// Read-only history of every hotel this caller has logged a call on. Unlike
// My Queue, opening this page never claims leads.
export default function SmartGridMyLeadsPage() {
  const navigate = useNavigate();
  const { hubUser: realHubUser } = useAuth();
  const { hubUser: demoHubUser } = useHubAuth();
  const { isDemo } = useDemo();
  const hubUser = isDemo ? demoHubUser : realHubUser;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leads, setLeads] = useState<Map<string, WorkedLead>>(new Map());
  const [calls, setCalls] = useState<CallEntry[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    if (!hubUser?.id) return;
    const load = async () => {
      setLoading(true);
      try {
        const { data: projects } = await supabase.from('hub_projects').select('id').eq('project_name', 'SmartGrid Western').limit(1);
        const projectId = projects?.[0]?.id;
        if (!projectId) throw new Error('SmartGrid Western project not found');

        const mine: CallEntry[] = [];
        for (let from = 0; ; from += 1000) {
          const { data, error: err } = await supabase
            .from('hub_project_activity')
            .select('id, entity_id, user_id, created_at, meta')
            .eq('project_id', projectId)
            .eq('action', 'lead_outcome_logged')
            .eq('user_id', hubUser.id)
            .order('id', { ascending: true })
            .range(from, from + 999);
          if (err) throw err;
          mine.push(...((data || []) as CallEntry[]));
          if (!data || data.length < 1000) break;
        }

        const ids = [...new Set(mine.filter(c => c.meta?.outcome !== 'skip').map(c => String(c.entity_id)))];
        const leadMap = new Map<string, WorkedLead>();
        const allCalls: CallEntry[] = [];
        // Chunked so the id list stays within URL limits
        for (let i = 0; i < ids.length; i += 150) {
          const chunk = ids.slice(i, i + 150);
          const [leadRes, callRes] = await Promise.all([
            supabase.from('hub_project_leads')
              .select('id, account_name, primary_contact, phone, email, status, callback_date, callback_time, next_call_goal, assigned_to, meeting_scheduled, bill_received, email_reply_received, email_reply_received_at')
              .in('id', chunk),
            supabase.from('hub_project_activity')
              .select('id, entity_id, user_id, created_at, meta, hub_users:user_id(full_name)')
              .eq('project_id', projectId)
              .eq('action', 'lead_outcome_logged')
              .in('entity_id', chunk),
          ]);
          if (leadRes.error) throw leadRes.error;
          if (callRes.error) throw callRes.error;
          for (const l of (leadRes.data || []) as WorkedLead[]) leadMap.set(l.id, l);
          allCalls.push(...((callRes.data || []) as any[]));
        }
        setLeads(leadMap);
        setCalls(allCalls.filter(c => c.meta?.outcome !== 'skip'));
        setError(null);
      } catch (err: any) {
        console.error('My leads load failed:', err);
        setError(err?.message || 'Could not load your leads');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [hubUser?.id]);

  const [savingReply, setSavingReply] = useState<string | null>(null);
  // A reply to the email sent from alex@smartgridwestern.com is what SmartGrid pays for
  const setReply = async (lead: WorkedLead, replied: boolean) => {
    const changes = { email_reply_received: replied, email_reply_received_at: replied ? new Date().toISOString() : null };
    setSavingReply(lead.id);
    setLeads(prev => new Map(prev).set(lead.id, { ...lead, ...changes }));
    const { error: err } = await supabase.from('hub_project_leads').update(changes).eq('id', lead.id);
    setSavingReply(null);
    if (err) {
      setLeads(prev => new Map(prev).set(lead.id, lead));
      alert(`Couldn't save: ${err.message}`);
    }
  };

  const rows = useMemo(() => {
    if (!hubUser?.id) return [];
    const byLead = new Map<string, CallEntry[]>();
    for (const c of calls) {
      const id = String(c.entity_id);
      if (!byLead.has(id)) byLead.set(id, []);
      byLead.get(id)!.push(c);
    }
    const q = search.trim().toLowerCase();
    return [...byLead.entries()]
      .map(([id, history]) => {
        history.sort((a, b) => b.created_at.localeCompare(a.created_at));
        const myLast = history.find(c => c.user_id === hubUser.id)!;
        return { lead: leads.get(id), history, myLast, myEmail: history.some(c => c.user_id === hubUser.id && c.meta?.email_found) };
      })
      .filter((r): r is typeof r & { lead: WorkedLead } => !!r.lead && !!r.myLast)
      .filter(r => {
        const o = r.myLast.meta?.outcome;
        if (filter === 'callbacks') return r.lead.status === 'callback_pending' && r.lead.assigned_to === hubUser.id;
        if (filter === 'emails') return r.myEmail;
        if (filter === 'replied') return r.lead.email_reply_received;
        if (filter === 'interested') return o === 'interested';
        if (filter === 'no_contact') return o === 'voicemail' || o === 'no_answer';
        return true;
      })
      .filter(r => !q || r.lead.account_name.toLowerCase().includes(q) || r.lead.primary_contact?.toLowerCase().includes(q)
        || r.lead.email?.toLowerCase().includes(q) || r.lead.phone?.includes(q))
      .sort((a, b) => {
        if (filter === 'callbacks') return (a.lead.callback_date || '').localeCompare(b.lead.callback_date || '');
        return b.myLast.created_at.localeCompare(a.myLast.created_at);
      });
  }, [calls, leads, search, filter, hubUser?.id]);

  return (
    <ContractorLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 px-4 sm:px-6 py-6">
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">My Leads</h1>
              <p className="text-sm text-gray-500 mt-1">Every hotel you've called, newest first</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => navigate('/hub/contractor/smartgrid-leads')} className="px-3 py-2 text-sm font-medium rounded-lg bg-sky-500 text-white hover:bg-sky-600">
                My Queue
              </button>
              <button onClick={() => navigate('/hub/contractor/projects')} className="px-3 py-2 text-sm text-gray-600 rounded-lg hover:bg-white">
                Back
              </button>
            </div>
          </div>

          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search hotel, contact, email or phone…"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/30"
          />
          <div className="flex flex-wrap gap-2">
            {FILTERS.map(f => (
              <button key={f.value} onClick={() => setFilter(f.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full ${filter === f.value ? 'bg-sky-500 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
                {f.label}
              </button>
            ))}
          </div>

          {loading && <p className="text-sm text-gray-400 text-center py-8">Loading your leads…</p>}
          {error && <p className="text-sm text-rose-600 text-center py-4">{error}</p>}
          {!loading && !error && rows.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">{search || filter !== 'all' ? 'Nothing matches.' : "You haven't logged any calls yet."}</p>
          )}
          {!loading && rows.length > 0 && <p className="text-xs text-gray-500">{rows.length} hotels</p>}

          <div className="space-y-2">
            {rows.map(({ lead, history, myLast }) => {
              const o = OUTCOME[myLast.meta?.outcome || ''];
              const open = openId === lead.id;
              return (
                <div key={lead.id} className="bg-white rounded-xl border border-gray-100 shadow-sm">
                  <button onClick={() => setOpenId(open ? null : lead.id)} className="w-full text-left px-4 py-3 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-gray-800">{lead.account_name}</p>
                      {o && <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap ${o.tone}`}>{o.label}</span>}
                    </div>
                    <p className="text-xs text-gray-600">
                      {lead.primary_contact || '–'}{lead.phone ? ` · ${lead.phone}` : ''}{lead.email ? ` · ${lead.email}` : ''}
                    </p>
                    <p className="text-xs text-gray-400">
                      Your last call {formatManilaDateTime(myLast.created_at)}
                      {lead.status === 'callback_pending' && lead.callback_date && (
                        <span className="text-amber-700"> · Callback {formatShiftDay(lead.callback_date)}{lead.callback_time ? ` ${lead.callback_time.slice(0, 5)}` : ''}{lead.next_call_goal ? ` · ${GOAL[lead.next_call_goal]}` : ''}</span>
                      )}
                      {lead.meeting_scheduled && <span className="text-violet-700"> · Meeting booked</span>}
                      {lead.bill_received && <span className="text-sky-700"> · Bill received</span>}
                    </p>
                    {myLast.meta?.notes && !open && <p className="text-xs text-gray-600 truncate">{myLast.meta.notes}</p>}
                  </button>
                  {lead.email && (
                    <div className="px-4 pb-3 -mt-1">
                      <button
                        onClick={() => setReply(lead, !lead.email_reply_received)}
                        disabled={savingReply === lead.id}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-60 ${
                          lead.email_reply_received
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : 'bg-white border-gray-200 text-gray-600 hover:border-emerald-300 hover:text-emerald-700'
                        }`}
                        title="Tap when they reply to the email from alex@smartgridwestern.com. Tap again to undo."
                      >
                        <i className={lead.email_reply_received ? 'ri-checkbox-circle-fill' : 'ri-checkbox-blank-circle-line'} />
                        {lead.email_reply_received
                          ? `Replied to our email${lead.email_reply_received_at ? ` · ${formatManilaDateTime(lead.email_reply_received_at)}` : ''}`
                          : 'Mark: replied to our email'}
                      </button>
                    </div>
                  )}
                  {open && (
                    <div className="border-t border-gray-100 px-4 py-3 space-y-2">
                      <p className="text-xs font-semibold text-gray-600">Call history</p>
                      {history.map(h => (
                        <div key={h.id} className="text-xs bg-gray-50 rounded-lg p-2.5">
                          <p className="text-gray-700">
                            <b>{OUTCOME[h.meta?.outcome || '']?.label || h.meta?.outcome}</b> · {h.hub_users?.full_name || 'Caller'} · {formatManilaDateTime(h.created_at)}
                            {h.meta?.email_found && <span className="text-emerald-700"> · email captured</span>}
                          </p>
                          {h.meta?.notes && <p className="text-gray-600 mt-1 whitespace-pre-wrap">{h.meta.notes}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </ContractorLayout>
  );
}
