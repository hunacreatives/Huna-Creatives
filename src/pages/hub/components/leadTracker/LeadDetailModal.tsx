import { useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatManilaDateTime } from '@/lib/smartgridShift';
import { GOAL_LABEL, OUTCOME_LABEL, leadStatusLabel, type CallLogEntry, type Caller, type TrackerLead } from './types';
import RoomsBadge from './RoomsBadge';

interface Props {
  lead: TrackerLead;
  callLog: CallLogEntry[];
  callers: Caller[];
  onClose: () => void;
  onChanged: (id: string, changes: Partial<TrackerLead>) => void;
}

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <p className="text-[11px] font-medium text-gray-500 mb-0.5">{label}</p>
    <div className="text-sm text-gray-800 break-words">{children}</div>
  </div>
);

export default function LeadDetailModal({ lead, callLog, callers, onClose, onChanged }: Props) {
  const [assignedTo, setAssignedTo] = useState(lead.assigned_to || '');
  const [saving, setSaving] = useState(false);
  const names = useMemo(() => new Map(callers.map(c => [c.id, c.name])), [callers]);
  const history = useMemo(
    () => callLog.filter(e => String(e.entity_id) === lead.id).sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [callLog, lead.id],
  );
  const status = leadStatusLabel(lead);

  const update = async (changes: Partial<TrackerLead>) => {
    setSaving(true);
    const { error } = await supabase.from('hub_project_leads').update(changes).eq('id', lead.id);
    setSaving(false);
    if (error) {
      alert(`Could not save: ${error.message}`);
      return false;
    }
    onChanged(lead.id, changes);
    return true;
  };

  const toggleReply = (checked: boolean) =>
    update({ email_reply_received: checked, email_reply_received_at: checked ? new Date().toISOString() : null });

  const toggleBill = (checked: boolean) =>
    update({ bill_received: checked, bill_received_at: checked ? new Date().toISOString() : null });

  const saveAssignment = async () => {
    if (await update({ assigned_to: assignedTo || null })) onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-3.5 flex items-center justify-between">
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-800 truncate">{lead.account_name}</h3>
            <div className="mt-1 flex items-center gap-1.5">
              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${status.tone}`}>{status.label}</span>
              <RoomsBadge rooms={lead.number_of_rooms} />
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl" aria-label="Close">✕</button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {lead.retired_at && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-stone-50 border border-stone-200">
              <p className="flex-1 text-xs text-stone-700">
                Retired{lead.retired_reason ? ` (${lead.retired_reason.toLowerCase()})` : ''}. Callers won't get this lead.
              </p>
              <button
                onClick={() => update({ retired_at: null, retired_reason: null })}
                disabled={saving}
                className="shrink-0 px-2.5 py-1 text-[11px] font-medium rounded-md bg-white border border-stone-300 text-stone-700 hover:bg-stone-100 disabled:opacity-50"
              >
                Return to calling pool
              </button>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Contact">{lead.primary_contact || '–'}</Field>
            <Field label="Phone">{lead.phone || '–'}</Field>
            <div className="col-span-2"><Field label="Email">{lead.email || '–'}</Field></div>
            <Field label="Attempts">{lead.attempts_count}</Field>
            <Field label="Last worked by">{lead.last_caller_id ? names.get(lead.last_caller_id) || '–' : '–'}</Field>
            {lead.status === 'callback_pending' && (
              <>
                <Field label="Callback">{lead.callback_date || '–'}{lead.callback_time ? ` · ${lead.callback_time.slice(0, 5)}` : ''}</Field>
                <Field label="Goal">{lead.next_call_goal ? GOAL_LABEL[lead.next_call_goal] : '–'}</Field>
              </>
            )}
            <Field label="Follow-up email">{lead.follow_up_email_sent ? 'Sent' : '–'}</Field>
            <Field label="Meeting booked">{lead.meeting_scheduled ? 'Yes' : '–'}</Field>
          </div>

          {lead.email && (
            <label className="flex items-center gap-2 cursor-pointer p-3 rounded-lg bg-emerald-50 border border-emerald-100" title="Tick when they reply to the email sent from alex@smartgridwestern.com ($5 to SmartGrid)">
              <input type="checkbox" checked={lead.email_reply_received} disabled={saving} onChange={e => toggleReply(e.target.checked)} className="w-4 h-4 rounded" />
              <span className="text-sm text-emerald-800 font-medium">Replied to our email</span>
              {lead.email_reply_received_at && <span className="text-[11px] text-emerald-700 ml-auto">{formatManilaDateTime(lead.email_reply_received_at)}</span>}
            </label>
          )}

          <label className="flex items-center gap-2 cursor-pointer p-3 rounded-lg bg-sky-50 border border-sky-100">
            <input type="checkbox" checked={lead.bill_received} disabled={saving} onChange={e => toggleBill(e.target.checked)} className="w-4 h-4 rounded" />
            <span className="text-sm text-sky-800 font-medium">Utility bill received</span>
            {lead.bill_received_at && <span className="text-[11px] text-sky-700 ml-auto">{formatManilaDateTime(lead.bill_received_at)}</span>}
          </label>

          <div className="border-t border-gray-100 pt-3">
            <p className="text-xs font-semibold text-gray-600 mb-2">Call history ({history.length})</p>
            {history.length === 0 ? (
              <p className="text-xs text-gray-400">Not called yet.</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {history.map(h => (
                  <div key={h.id} className="text-xs bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                    <p className="text-gray-700">
                      <b>{OUTCOME_LABEL[h.meta?.outcome || ''] || h.meta?.outcome || '–'}</b> · {names.get(h.user_id || '') || 'Former caller'} · {formatManilaDateTime(h.created_at)}
                    </p>
                    {h.meta?.email_found && <p className="text-emerald-700 mt-0.5">Email captured</p>}
                    {h.meta?.notes && <p className="text-gray-600 mt-1 whitespace-pre-wrap">{h.meta.notes}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-gray-100 pt-3">
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Assigned caller</label>
            <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
              <option value="">Unassigned (shared pool)</option>
              {callers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        <div className="border-t border-gray-100 px-5 py-3 flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Close</button>
          <button
            onClick={saveAssignment}
            disabled={saving || assignedTo === (lead.assigned_to || '')}
            className="flex-1 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
          >
            Save assignment
          </button>
        </div>
      </div>
    </div>
  );
}
