import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { LEAD_FIELDS, type CallLogEntry, type Caller, type TrackerLead } from './types';

const PAGE = 1000; // PostgREST caps each response at 1,000 rows
const SAFETY_REFRESH_MS = 2 * 60 * 1000;

async function fetchAll<T>(build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>) {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < PAGE) return rows;
  }
}

export function useLeadTrackerData(projectId: number) {
  const [leads, setLeads] = useState<TrackerLead[]>([]);
  const [callLog, setCallLog] = useState<CallLogEntry[]>([]);
  const [callers, setCallers] = useState<Caller[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [live, setLive] = useState(false);
  // Only the newest load may write state, so a slow response can't overwrite a fresher one
  const loadSeq = useRef(0);

  const load = useCallback(async () => {
    const seq = ++loadSeq.current;
    try {
      const [leadRows, logRows, callerRes] = await Promise.all([
        fetchAll<TrackerLead>((from, to) =>
          supabase.from('hub_project_leads').select(LEAD_FIELDS).eq('project_id', projectId)
            .order('id', { ascending: true }).range(from, to) as any),
        fetchAll<CallLogEntry>((from, to) =>
          supabase.from('hub_project_activity').select('id, entity_id, user_id, created_at, meta')
            .eq('project_id', projectId).eq('action', 'lead_outcome_logged')
            .order('id', { ascending: true }).range(from, to) as any),
        supabase.from('hub_project_contractors').select('contractor_id, hub_users(id, full_name)')
          .eq('project_id', projectId).eq('project_role', 'Cold Caller'),
      ]);
      if (callerRes.error) throw callerRes.error;
      if (seq !== loadSeq.current) return;

      const seen = new Set<string>();
      const callerList: Caller[] = [];
      for (const row of (callerRes.data || []) as any[]) {
        const u = row.hub_users;
        if (u?.id && !seen.has(u.id)) {
          seen.add(u.id);
          callerList.push({ id: u.id, name: u.full_name });
        }
      }
      callerList.sort((a, b) => a.name.localeCompare(b.name));

      setLeads(leadRows);
      setCallLog(logRows);
      setCallers(callerList);
      setError(null);
      setLastUpdated(Date.now());
    } catch (err: any) {
      if (seq !== loadSeq.current) return;
      console.error('Lead tracker load failed:', err);
      setError(err?.message || 'Could not load tracker data');
    } finally {
      if (seq === loadSeq.current) setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  // Live: apply inserts/updates as they happen; a periodic full reload covers anything missed
  useEffect(() => {
    const channel = supabase
      .channel(`lead-tracker-${projectId}`)
      .on('postgres_changes' as any, {
        event: 'INSERT', schema: 'public', table: 'hub_project_activity', filter: `project_id=eq.${projectId}`,
      }, (payload: any) => {
        const row = payload.new as CallLogEntry & { action?: string };
        if (row?.action !== 'lead_outcome_logged') return;
        setCallLog(prev => (prev.some(e => e.id === row.id) ? prev : [...prev, row]));
        setLastUpdated(Date.now());
      })
      .on('postgres_changes' as any, {
        event: '*', schema: 'public', table: 'hub_project_leads', filter: `project_id=eq.${projectId}`,
      }, (payload: any) => {
        const row = payload.new as TrackerLead | undefined;
        if (!row?.id) return;
        setLeads(prev => {
          const i = prev.findIndex(l => l.id === row.id);
          if (i === -1) return [...prev, row];
          const next = prev.slice();
          next[i] = { ...prev[i], ...row };
          return next;
        });
        setLastUpdated(Date.now());
      })
      .subscribe(status => setLive(status === 'SUBSCRIBED'));

    const interval = setInterval(load, SAFETY_REFRESH_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [projectId, load]);

  // Put a caller's uncalled leads back: their callbacks stay theirs, everything
  // else returns to the shared pool so the other caller can pick it up.
  const releaseCaller = useCallback(async (callerId: string) => {
    const cb = await supabase.from('hub_project_leads')
      .update({ locked_by: null, locked_at: null, status: 'callback_pending' })
      .eq('project_id', projectId).eq('locked_by', callerId).eq('outcome', 'callback').not('callback_date', 'is', null)
      .select('id');
    if (cb.error) throw cb.error;
    const rest = await supabase.from('hub_project_leads')
      .update({ locked_by: null, locked_at: null, status: 'new', assigned_to: null })
      .eq('project_id', projectId).eq('locked_by', callerId)
      .select('id');
    if (rest.error) throw rest.error;
    await load();
    return (cb.data?.length || 0) + (rest.data?.length || 0);
  }, [projectId, load]);

  const patchLead = useCallback((id: string, changes: Partial<TrackerLead>) => {
    setLeads(prev => prev.map(l => (l.id === id ? { ...l, ...changes } : l)));
  }, []);

  return { leads, callLog, callers, loading, error, lastUpdated, live, reload: load, patchLead, releaseCaller };
}
