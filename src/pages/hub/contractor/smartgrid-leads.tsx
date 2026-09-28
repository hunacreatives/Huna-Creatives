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
}

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
  });
  const [saving, setSaving] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);

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

  const loadQueue = async (pId: number, userId: string) => {
    try {
      const { data, error } = await supabase
        .from('hub_project_leads')
        .select('*')
        .eq('project_id', pId)
        .in('status', ['new', 'calling'])
        .is('locked_by', null)
        .order('attempts_count', { ascending: true })
        .limit(30);

      if (error) throw error;

      if (!data || data.length === 0) {
        setQueue([]);
        setCurrentLeadIndex(0);
        return;
      }

      // Soft-claim first lead
      if (data.length > 0) {
        const { error: claimErr } = await supabase
          .from('hub_project_leads')
          .update({
            locked_by: userId,
            status: 'calling',
          })
          .eq('id', data[0].id);

        if (!claimErr) {
          data[0] = { ...data[0], locked_by: userId, status: 'calling' };
        }
      }

      setQueue(data as Lead[]);
      setCurrentLeadIndex(0);
      resetForm();
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
    });
  };

  const currentLead = queue[currentLeadIndex];

  const handleSave = async () => {
    if (!currentLead || !hubUser?.id || !projectId) return;
    setSaving(true);
    try {
      const newStatus = formState.outcome === 'skip' ? 'calling' : 'complete';
      const updates: any = {
        status: newStatus,
        attempts_count: (currentLead.attempts_count || 0) + 1,
        email_found: formState.emailFound,
        phone_found: formState.phoneFound,
        call_notes: formState.callNotes,
        last_contact_at: new Date().toISOString(),
      };

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

      const { error } = await supabase
        .from('hub_project_leads')
        .update(updates)
        .eq('id', currentLead.id);

      if (error) throw error;

      // Write activity log
      await supabase.from('hub_project_activity').insert({
        project_id: projectId,
        user_id: hubUser.id,
        entity_type: 'lead',
        entity_id: currentLead.id,
        action: 'lead_outcome_logged',
        meta: {
          outcome: formState.outcome,
          email_found: formState.emailFound,
          phone_found: formState.phoneFound,
          notes: formState.callNotes,
        },
      });

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
          })
          .eq('id', nextLead.id);

        setCurrentLeadIndex(c => c + 1);
        resetForm();
      } else {
        // Queue empty, reload
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
          })
          .eq('id', nextLead.id);

        setCurrentLeadIndex(c => c + 1);
        resetForm();
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
            <p className="text-sm text-gray-600 mb-6">You've called all available leads for today. Great work!</p>
            <button
              onClick={() => navigate('/hub/contractor/projects')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg font-medium text-sm transition-colors"
            >
              <i className="ri-arrow-left-line"></i>
              Back to Projects
            </button>
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
              {/* Account info */}
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-gray-800">{currentLead.account_name}</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {currentLead.phone && (
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Phone</p>
                      <p className="text-sm text-gray-800 font-mono">{currentLead.phone}</p>
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
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={formState.emailFound}
                      onChange={e => setFormState(s => ({ ...s, emailFound: e.target.checked }))}
                      className="w-4 h-4 rounded border-gray-300 text-sky-500 focus:ring-0 cursor-pointer"
                    />
                    <span className="text-sm text-gray-700 group-hover:text-gray-800">Email Found</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={formState.phoneFound}
                      onChange={e => setFormState(s => ({ ...s, phoneFound: e.target.checked }))}
                      className="w-4 h-4 rounded border-gray-300 text-sky-500 focus:ring-0 cursor-pointer"
                    />
                    <span className="text-sm text-gray-700 group-hover:text-gray-800">Phone Found</span>
                  </label>
                </div>

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
                  disabled={saving || !formState.outcome}
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
