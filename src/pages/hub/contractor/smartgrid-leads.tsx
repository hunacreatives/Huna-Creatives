import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useHubAuth } from '@/hooks/useHubAuth';
import { useDemo } from '@/contexts/DemoContext';
import { supabase } from '@/lib/supabase';
import ContractorLayout from '@/pages/hub/components/ContractorLayout';

interface Lead {
  id: string;
  account_name: string;
  phone: string | null;
  email: string | null;
  primary_contact: string | null;
  status: string;
  assigned_to: string | null;
  locked_by: string | null;
  attempts_count: number;
  email_found: boolean;
  phone_found: boolean;
  contact_name_found: boolean;
  outcome: string | null;
  call_notes: string | null;
  callback_date: string | null;
  callback_time: string | null;
  follow_up_email_sent: boolean;
  follow_up_email_sent_at: string | null;
  caller_attempts: Record<string, number>;
  last_caller_id: string | null;
}

interface ActivityLog {
  id: number;
  created_at: string;
  action: string;
  meta: { outcome?: string; notes?: string };
  hub_users?: { full_name: string } | null;
}

interface FormState {
  called: boolean;
  emailFound: boolean;
  phoneFound: boolean;
  emailValue?: string;
  phoneValue?: string;
  outcome: 'interested' | 'not_interested' | 'callback' | 'voicemail' | 'no_answer' | 'skip' | '';
  callNotes: string;
  callbackDate?: string;
  callbackTime?: string;
  followUpEmailSent: boolean;
  meetingScheduled: boolean;
  nextCallGoal?: 'email' | 'meeting' | 'bill';
}

// The night shift runs past midnight, so a shift belongs to the Manila date it
// started on (noon cutoff, same rule slack-attendance uses).
const currentShiftDay = () =>
  new Date(Date.now() - 12 * 60 * 60 * 1000).toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });

export default function SmartGridLeadsPage() {
  const navigate = useNavigate();
  const { hubUser: realHubUser } = useAuth();
  const { hubUser: demoHubUser } = useHubAuth();
  const { isDemo } = useDemo();
  const hubUser = isDemo ? demoHubUser : realHubUser;

  const [loading, setLoading] = useState(true);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [queue, setQueue] = useState<Lead[]>([]);
  const [currentLeadIndex, setCurrentLeadIndex] = useState(0);
  const [formState, setFormState] = useState<FormState>({
    called: false,
    emailFound: false,
    phoneFound: false,
    outcome: '',
    callNotes: '',
    followUpEmailSent: false,
  });
  const [saving, setSaving] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [callHistory, setCallHistory] = useState<ActivityLog[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const copyPhoneToClipboard = () => {
    if (currentLead?.phone) {
      navigator.clipboard.writeText(currentLead.phone);
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2000);
    }
  };

  // Load SmartGrid project and fetch queue
  useEffect(() => {
    const init = async () => {
      if (!hubUser?.id) return;
      setLoading(true);
      try {
        // Find SmartGrid Western project
        const { data: projects } = await supabase
          .from('hub_projects')
          .select('id')
          .eq('project_name', 'SmartGrid Western')
          .limit(1);

        if (!projects || projects.length === 0) {
          console.error('SmartGrid Western project not found');
          return;
        }

        const pId = projects[0].id;
        setProjectId(pId);

        // Resume a saved batch only for leads still locked to this caller; the
        // rest may have been released and handed to someone else since.
        const batchKey = `smartgrid_batch_${hubUser.id}`;
        try {
          localStorage.removeItem('smartgrid_batch');
          const saved = localStorage.getItem(batchKey);
          if (saved) {
            const { queue: savedQueue, currentIndex } = JSON.parse(saved);
            const remaining: Lead[] = (savedQueue || []).slice(currentIndex || 0);
            if (remaining.length > 0) {
              const { data: stillMine } = await supabase
                .from('hub_project_leads')
                .select('*')
                .in('id', remaining.map(l => l.id))
                .eq('locked_by', hubUser.id);
              const byId = new Map(((stillMine || []) as Lead[]).map(l => [l.id, l]));
              const valid = remaining.filter(l => byId.has(l.id)).map(l => byId.get(l.id)!);
              if (valid.length > 0) {
                setQueue(valid);
                setCurrentLeadIndex(0);
                setLoading(false);
                return;
              }
            }
            localStorage.removeItem(batchKey);
          }
        } catch (e) {
          console.log('No saved batch');
        }

        // Fetch initial queue (30 unassigned leads)
        await loadQueue(pId, hubUser.id);
      } catch (err) {
        console.error('Init error:', err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [hubUser?.id]);

  // Save current position to localStorage whenever it changes
  useEffect(() => {
    if (queue.length > 0 && hubUser?.id) {
      try {
        localStorage.setItem(`smartgrid_batch_${hubUser.id}`, JSON.stringify({
          queue,
          currentIndex: currentLeadIndex,
        }));
      } catch (e) {
        console.error('Failed to save batch to localStorage:', e);
      }
    }
  }, [queue, currentLeadIndex]);

  // Fetch call history when current lead changes
  useEffect(() => {
    if (currentLead && currentLead.attempts_count > 0) {
      fetchCallHistory(currentLead.id);
    } else {
      setCallHistory([]);
    }
  }, [currentLead?.id]);

  // Only rows still unlocked get claimed, so two callers can never lock the same lead.
  const claimLeads = async (candidates: Lead[], userId: string): Promise<Lead[]> => {
    if (candidates.length === 0) return [];
    const { data: claimed, error } = await supabase
      .from('hub_project_leads')
      .update({
        locked_by: userId,
        locked_at: new Date().toISOString(),
        status: 'calling',
        last_caller_id: userId,
      })
      .in('id', candidates.map(l => l.id))
      .is('locked_by', null)
      .select('*');
    if (error || !claimed) return [];
    const byId = new Map((claimed as Lead[]).map(l => [l.id, l]));
    return candidates.filter(l => byId.has(l.id)).map(l => byId.get(l.id)!);
  };

  const loadQueue = async (pId: number, userId: string) => {
    try {
      // 24-hour cooldown to prevent same-day overlaps
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      // Callbacks due on or before this shift (a missed day must not drop them)
      const today = currentShiftDay();
      const { data: dueCallbacks } = await supabase
        .from('hub_project_leads')
        .select('*')
        .eq('project_id', pId)
        .eq('status', 'callback_pending')
        .eq('assigned_to', userId)
        .lte('callback_date', today)
        .order('callback_date', { ascending: true })
        .order('callback_time', { ascending: true, nullsFirst: true });

      const callbacksLocked = await claimLeads((dueCallbacks || []) as Lead[], userId);

      const fetchCandidates = async (assignedOnly: boolean) => {
        let q = supabase
          .from('hub_project_leads')
          .select('*')
          .eq('project_id', pId)
          .in('status', ['new', 'calling'])
          .is('locked_by', null)
          .or(`last_worked_at.is.null,last_worked_at.lt.${twentyFourHoursAgo}`);
        q = assignedOnly ? q.eq('assigned_to', userId) : q.is('assigned_to', null);
        const { data, error } = await q
          .order('last_worked_at', { ascending: true, nullsFirst: true })
          .order('attempts_count', { ascending: true })
          .order('id', { ascending: true })
          .limit(30);
        if (error) throw error;
        // Skip leads this caller has already tried 3+ times
        return ((data || []) as Lead[]).filter(lead => ((lead.caller_attempts || {})[userId] || 0) < 3);
      };

      // Pre-assigned leads first, otherwise the unassigned pool. If another caller
      // claimed some of the same rows first, fetch again for the next ones.
      let newLeads: Lead[] = await claimLeads(await fetchCandidates(true), userId);
      for (let attempt = 0; newLeads.length === 0 && attempt < 3; attempt++) {
        const candidates = await fetchCandidates(false);
        if (candidates.length === 0) break;
        newLeads = await claimLeads(candidates, userId);
      }

      if (newLeads.length === 0 && callbacksLocked.length === 0) {
        setQueue([]);
        setCurrentLeadIndex(0);
        return;
      }

      // Callbacks appear first, then new leads
      const queueData = [...callbacksLocked, ...newLeads];
      setQueue(queueData as Lead[]);
      setCurrentLeadIndex(0);
      resetForm();
      setCallHistory([]);
    } catch (err) {
      console.error('Load queue error:', err);
    }
  };

  const resetForm = () => {
    setFormState({
      called: false,
      emailFound: false,
      phoneFound: false,
      outcome: '',
      callNotes: '',
      followUpEmailSent: false,
      meetingScheduled: false,
      nextCallGoal: undefined,
    });
  };

  const fetchCallHistory = async (leadId: string) => {
    if (!projectId) return;
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
      setCallHistory((data as any) || []);
    } catch (err) {
      console.error('Error fetching call history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const currentLead = queue[currentLeadIndex];

  const handleSave = async () => {
    if (!currentLead || !hubUser?.id || !projectId) return;
    setSaving(true);
    try {
      const isFailedAttempt = ['voicemail', 'no_answer'].includes(formState.outcome);
      const hasEmail = currentLead.email || formState.emailValue;

      // Determine new status based on outcome
      let newStatus = 'calling';
      let newCallerAttempts = { ...currentLead.caller_attempts } || {};

      if (formState.outcome === 'skip') {
        newStatus = 'calling';
      } else if (formState.outcome === 'callback') {
        // Callback stays with this caller even when the email was captured
        // (the next call is for the meeting or the utility bill).
        newStatus = 'callback_pending';
      } else if (formState.outcome === 'not_interested') {
        // Not interested = complete (no email coming)
        newStatus = 'complete';
      } else if (formState.outcome === 'interested') {
        // Interested: complete if email, recirculate if not
        if (hasEmail) {
          newStatus = 'complete';
        } else {
          newCallerAttempts[hubUser.id] = (newCallerAttempts[hubUser.id] || 0) + 1;
          newStatus = newCallerAttempts[hubUser.id] >= 3 ? 'attempted' : 'new';
        }
      } else if (isFailedAttempt) {
        // Increment this caller's failed attempts
        newCallerAttempts[hubUser.id] = (newCallerAttempts[hubUser.id] || 0) + 1;

        if (newCallerAttempts[hubUser.id] >= 3) {
          // This caller has hit 3 attempts, check if all callers have
          const { data: allCallers } = await supabase
            .from('hub_project_contractors')
            .select('user_id')
            .eq('project_id', projectId)
            .eq('project_role', 'Cold Caller');

          const allHitLimit = (allCallers || []).every(c => {
            const attemptsForCaller = newCallerAttempts[c.user_id as string] || 0;
            return attemptsForCaller >= 3;
          });

          newStatus = allHitLimit ? 'attempted' : 'new';
        } else {
          newStatus = 'new';
        }
      }

      const updates: any = {
        status: newStatus,
        email_found: formState.emailFound,
        phone_found: formState.phoneFound,
        call_notes: formState.callNotes,
        last_contact_at: new Date().toISOString(),
        last_worked_at: new Date().toISOString(),
        caller_attempts: newCallerAttempts,
        last_caller_id: hubUser.id,
        follow_up_email_sent: formState.followUpEmailSent,
      };

      // Only increment attempts_count on actual failed attempts and completed contacts
      if (isFailedAttempt || formState.outcome === 'interested' || formState.outcome === 'not_interested' || formState.outcome === 'callback') {
        updates.attempts_count = (currentLead.attempts_count || 0) + 1;
      }

      if (formState.followUpEmailSent) {
        updates.follow_up_email_sent_at = new Date().toISOString();
      }

      // For callback_pending, keep the caller assigned but release the lock
      if (newStatus === 'callback_pending') {
        updates.assigned_to = hubUser.id;
        updates.locked_by = null;
      } else if (newStatus !== 'calling') {
        // For other terminal statuses, unlock
        updates.locked_by = null;
      }

      // Update email/phone if found
      if (formState.emailFound && formState.emailValue) {
        updates.email = formState.emailValue;
      }
      if (formState.phoneFound && formState.phoneValue) {
        updates.phone = formState.phoneValue;
      }

      if (formState.outcome && formState.outcome !== 'skip') {
        updates.outcome = formState.outcome;
      }

      if (formState.callbackDate) {
        updates.callback_date = formState.callbackDate;
      }
      if (formState.callbackTime) {
        updates.callback_time = formState.callbackTime;
      }

      if (formState.meetingScheduled) {
        updates.meeting_scheduled = true;
        updates.meeting_scheduled_at = new Date().toISOString();
      }

      if (formState.nextCallGoal) {
        updates.next_call_goal = formState.nextCallGoal;
      }

      const { error } = await supabase
        .from('hub_project_leads')
        .update(updates)
        .eq('id', currentLead.id);

      if (error) throw error;

      // Activity log is what the admin stats count, so a failed write must not be silent
      const activityRow = {
        project_id: projectId,
        user_id: hubUser.id,
        entity_type: 'lead',
        entity_id: currentLead.id,
        action: 'lead_outcome_logged',
        meta: {
          lead_id: currentLead.id,
          outcome: formState.outcome,
          new_status: newStatus,
          email_found: formState.emailFound,
          phone_found: formState.phoneFound,
          notes: formState.callNotes,
          follow_up_email_sent: formState.followUpEmailSent,
          callback_date: formState.callbackDate || null,
        },
      };
      let { error: logErr } = await supabase.from('hub_project_activity').insert(activityRow);
      if (logErr) ({ error: logErr } = await supabase.from('hub_project_activity').insert(activityRow));
      if (logErr) {
        console.error('Activity log error:', logErr);
        alert('Call saved, but it was not logged for tracking. Please tell your admin.');
      }

      if (newStatus === 'complete') {
        setCompletedCount(c => c + 1);
      }

      // Move to next lead or show completion
      if (currentLeadIndex < queue.length - 1) {
        // Claim next lead
        const nextLead = queue[currentLeadIndex + 1];
        await supabase
          .from('hub_project_leads')
          .update({
            locked_by: hubUser.id,
            status: 'calling',
            last_caller_id: hubUser.id,
          })
          .eq('id', nextLead.id);

        setCurrentLeadIndex(c => c + 1);
        resetForm();
        setCallHistory([]);
      } else {
        // Queue empty, clear saved batch and reload
        try {
          localStorage.removeItem(`smartgrid_batch_${hubUser.id}`);
        } catch (e) {
          console.error('Failed to clear batch from localStorage:', e);
        }
        setQueue([]);
        if (projectId) {
          await loadQueue(projectId, hubUser.id);
        }
      }
    } catch (err) {
      console.error('Save error:', err);
      alert('Error saving lead. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    if (!currentLead || !hubUser?.id) return;
    setSaving(true);
    try {
      // Release lock without updating status
      const { error } = await supabase
        .from('hub_project_leads')
        .update({ locked_by: null })
        .eq('id', currentLead.id);

      if (error) throw error;

      // Move to next
      if (currentLeadIndex < queue.length - 1) {
        const nextLead = queue[currentLeadIndex + 1];
        await supabase
          .from('hub_project_leads')
          .update({
            locked_by: hubUser.id,
            status: 'calling',
            last_caller_id: hubUser.id,
          })
          .eq('id', nextLead.id);

        setCurrentLeadIndex(c => c + 1);
        resetForm();
        setCallHistory([]);
      } else {
        setQueue([]);
        if (projectId) {
          await loadQueue(projectId, hubUser.id);
        }
      }
    } catch (err) {
      console.error('Skip error:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ContractorLayout>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block p-3 bg-white rounded-full mb-4 shadow-sm">
              <i className="ri-loader-4-line animate-spin text-sky-500 text-2xl"></i>
            </div>
            <p className="text-gray-600 font-medium">Loading your queue...</p>
          </div>
        </div>
      </ContractorLayout>
    );
  }

  if (!currentLead && queue.length === 0) {
    return (
      <ContractorLayout>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
          <div className="max-w-sm text-center">
            <div className="inline-block p-4 bg-emerald-50 rounded-full mb-4">
              <i className="ri-checkbox-circle-fill text-emerald-600 text-3xl"></i>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Queue Complete</h2>
            <p className="text-sm text-gray-600 mb-6">You've called all available leads in this batch. Great work!</p>
            <div className="flex gap-3">
              <button
                onClick={() => loading ? null : loadQueue(projectId!, hubUser!.id)}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <i className={`ri-reload-line ${loading ? 'animate-spin' : ''}`}></i>
                {loading ? 'Loading...' : 'Request Next Batch'}
              </button>
              <button
                onClick={() => navigate('/hub/contractor/projects')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg font-medium text-sm transition-colors"
              >
                <i className="ri-arrow-left-line"></i>
                Back to Projects
              </button>
            </div>
          </div>
        </div>
      </ContractorLayout>
    );
  }

  return (
    <ContractorLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="max-w-2xl mx-auto mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">My Queue</h1>
            <p className="text-sm text-gray-500 mt-1">SmartGrid Western · {currentLeadIndex + 1} of {queue.length} leads</p>
          </div>
          <button
            onClick={() => navigate('/hub/contractor/projects')}
            className="inline-flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 rounded-lg hover:bg-white transition-colors"
            title="Back to projects"
          >
            <i className="ri-arrow-left-line"></i>
            <span className="text-sm font-medium">Back</span>
          </button>
        </div>

        {/* Progress bar */}
        <div className="max-w-2xl mx-auto mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-600">
              {completedCount} completed
            </span>
            <span className="text-xs text-gray-400">
              {Math.round((completedCount / Math.max(completedCount + queue.length - currentLeadIndex, 1)) * 100)}%
            </span>
          </div>
          <div className="w-full h-2 bg-white rounded-full overflow-hidden shadow-sm">
            <div
              className="h-full bg-emerald-400 transition-all duration-300"
              style={{
                width: `${(completedCount / Math.max(completedCount + queue.length, 1)) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Lead card */}
        {currentLead && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 space-y-6">
              {/* Callback badge */}
              {currentLead.callback_date && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2">
                  <i className="ri-phone-line text-amber-600 text-lg"></i>
                  <div className="text-sm text-amber-900">
                    <p className="font-semibold">Scheduled Callback</p>
                    <p className="text-xs text-amber-800">You said you'd call them back</p>
                    {currentLead.next_call_goal && (
                      <p className="text-xs font-medium text-amber-700 mt-1">
                        🎯 Goal: {currentLead.next_call_goal === 'email' ? 'Get Email' : currentLead.next_call_goal === 'meeting' ? 'Schedule Meeting' : 'Get Electric Bill'}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Account info */}
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-gray-800">{currentLead.account_name}</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {currentLead.phone && (
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Phone</p>
                      <button
                        onClick={copyPhoneToClipboard}
                        className="flex items-center gap-2 text-sm text-gray-800 font-mono hover:text-sky-600 hover:bg-sky-50 px-2 py-1 rounded transition-colors cursor-pointer"
                        title="Copy phone number"
                      >
                        {currentLead.phone}
                        <i className={`text-xs transition-all ${copiedPhone ? 'ri-check-line text-emerald-500' : 'ri-file-copy-line text-gray-400'}`}></i>
                      </button>
                    </div>
                  )}
                  {currentLead.email && (
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Email</p>
                      <p className="text-sm text-gray-800 font-mono truncate">{currentLead.email}</p>
                    </div>
                  )}
                  {currentLead.primary_contact && (
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Contact</p>
                      <p className="text-sm text-gray-800">{currentLead.primary_contact}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-gray-100"></div>

              {/* Call History */}
              {callHistory.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-xs font-semibold text-amber-900 mb-3">Previous Call History</p>
                  <div className="space-y-2">
                    {callHistory.map(log => (
                      <div key={log.id} className="text-xs text-amber-800">
                        <p className="font-medium">
                          {new Date(log.created_at).toLocaleDateString()} · {log.hub_users?.full_name || 'Unknown'} · {log.meta?.outcome || 'N/A'}
                        </p>
                        {log.meta?.notes && <p className="text-amber-700 mt-1">{log.meta.notes}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Form fields */}
              <div className="space-y-4">
                {/* Checkboxes */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={formState.called}
                      onChange={e => setFormState(s => ({ ...s, called: e.target.checked }))}
                      className="w-4 h-4 rounded border-gray-300 text-sky-500 focus:ring-0 cursor-pointer"
                    />
                    <span className="text-sm text-gray-700 group-hover:text-gray-800">Called</span>
                  </label>
                  {!currentLead.email && (
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={formState.emailFound}
                        onChange={e => setFormState(s => ({ ...s, emailFound: e.target.checked }))}
                        className="w-4 h-4 rounded border-gray-300 text-sky-500 focus:ring-0 cursor-pointer"
                      />
                      <span className="text-sm text-gray-700 group-hover:text-gray-800">Email Found</span>
                    </label>
                  )}
                  {!currentLead.phone && (
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={formState.phoneFound}
                        onChange={e => setFormState(s => ({ ...s, phoneFound: e.target.checked }))}
                        className="w-4 h-4 rounded border-gray-300 text-sky-500 focus:ring-0 cursor-pointer"
                      />
                      <span className="text-sm text-gray-700 group-hover:text-gray-800">Phone Found</span>
                    </label>
                  )}
                </div>

                {/* Follow-up Email Sent (show if email exists or was found) */}
                {(currentLead.email || formState.emailFound) && (
                  <label className="flex items-center gap-3 cursor-pointer group p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                    <input
                      type="checkbox"
                      checked={formState.followUpEmailSent}
                      onChange={e => setFormState(s => ({ ...s, followUpEmailSent: e.target.checked }))}
                      className="w-4 h-4 rounded border-emerald-300 text-emerald-600 focus:ring-0 cursor-pointer"
                    />
                    <span className="text-sm text-emerald-700 group-hover:text-emerald-800 font-medium">Follow-up Email Sent</span>
                  </label>
                )}

                {/* Meeting Scheduled (show if interested or callback) */}
                {(formState.outcome === 'interested' || formState.outcome === 'callback') && (
                  <label className="flex items-center gap-3 cursor-pointer group p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <input
                      type="checkbox"
                      checked={formState.meetingScheduled}
                      onChange={e => setFormState(s => ({ ...s, meetingScheduled: e.target.checked }))}
                      className="w-4 h-4 rounded border-blue-300 text-blue-600 focus:ring-0 cursor-pointer"
                    />
                    <span className="text-sm text-blue-700 group-hover:text-blue-800 font-medium">Meeting Scheduled with Decision Maker</span>
                  </label>
                )}

                {/* Next Call Goal (show only for callback outcome) */}
                {formState.outcome === 'callback' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">What's the Goal for This Callback?</label>
                    <select
                      value={formState.nextCallGoal || ''}
                      onChange={e => setFormState(s => ({ ...s, nextCallGoal: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                    >
                      <option value="">Select goal...</option>
                      <option value="email">Get Their Email</option>
                      <option value="meeting">Schedule Meeting with Dan/Chris</option>
                      <option value="bill">Get Electric Bill</option>
                    </select>
                  </div>
                )}

                {/* Email input (show if Email Found checked) */}
                {formState.emailFound && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Email Address</label>
                    <input
                      type="email"
                      value={formState.emailValue || ''}
                      onChange={e => setFormState(s => ({ ...s, emailValue: e.target.value }))}
                      placeholder="Enter email address found during call"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                    />
                  </div>
                )}

                {/* Phone input (show if Phone Found checked) */}
                {formState.phoneFound && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Phone Number</label>
                    <input
                      type="tel"
                      value={formState.phoneValue || ''}
                      onChange={e => setFormState(s => ({ ...s, phoneValue: e.target.value }))}
                      placeholder="Enter phone number found during call"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                    />
                  </div>
                )}

                {/* Outcome dropdown */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Outcome</label>
                  <select
                    value={formState.outcome}
                    onChange={e => setFormState(s => ({ ...s, outcome: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                  >
                    <option value="">Select outcome...</option>
                    <option value="interested">Interested</option>
                    <option value="not_interested">Not Interested</option>
                    <option value="callback">Callback</option>
                    <option value="voicemail">Voicemail</option>
                    <option value="no_answer">No Answer</option>
                    <option value="skip">Skip (save for later)</option>
                  </select>
                </div>

                {/* Callback date/time (show if outcome = callback) */}
                {formState.outcome === 'callback' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">Callback Date</label>
                      <input
                        type="date"
                        value={formState.callbackDate || ''}
                        onChange={e => setFormState(s => ({ ...s, callbackDate: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">Callback Time</label>
                      <input
                        type="time"
                        value={formState.callbackTime || ''}
                        onChange={e => setFormState(s => ({ ...s, callbackTime: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                      />
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Call Notes</label>
                  <textarea
                    value={formState.callNotes}
                    onChange={e => setFormState(s => ({ ...s, callNotes: e.target.value }))}
                    placeholder="Add any notes from this call..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 resize-none"
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="border-t border-gray-100 pt-6 flex gap-3">
                <button
                  onClick={handleSkip}
                  disabled={saving}
                  className="flex-1 px-4 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-50 border border-gray-200 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Skip
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !formState.outcome || (formState.outcome === 'interested' && !currentLead.email && !formState.emailValue) || (formState.outcome === 'callback' && !formState.callbackDate)}
                  className="flex-1 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  title={formState.outcome === 'interested' && !currentLead.email && !formState.emailValue ? 'Email required for Interested outcome' : formState.outcome === 'callback' && !formState.callbackDate ? 'Pick a callback date' : ''}
                >
                  {saving ? (
                    <>
                      <i className="ri-loader-4-line animate-spin"></i>
                      Saving...
                    </>
                  ) : (
                    <>
                      <i className="ri-check-line"></i>
                      Save & Next
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ContractorLayout>
  );
}
