import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatManilaDateTime } from '@/lib/smartgridShift';

export interface NoteMeta {
  notes?: string;
  notes_edited_at?: string;
}

interface Props {
  activityId: number;
  meta: NoteMeta | null;
  canEdit: boolean;
  // Shown instead of the Edit button when this note will be editable later
  lockedHint?: string;
  onSaved: (meta: Record<string, unknown>) => void;
}

// A call's note with in-place editing. Saving goes through edit_lead_call_note,
// which only touches the note text and keeps the first version.
export default function CallNote({ activityId, meta, canEdit, lockedHint, onSaved }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const notes = meta?.notes || '';

  const save = async () => {
    setSaving(true);
    const { data, error } = await supabase.rpc('edit_lead_call_note', { p_activity_id: activityId, p_notes: draft.trim() });
    setSaving(false);
    if (error) {
      alert(`Couldn't save: ${error.message}`);
      return;
    }
    onSaved(data as Record<string, unknown>);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="mt-1.5 space-y-1.5">
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          rows={3}
          autoFocus
          className="w-full px-2.5 py-2 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/30"
        />
        <div className="flex gap-2">
          <button
            onClick={save}
            disabled={saving || draft.trim() === notes.trim()}
            className="px-3 py-1 text-xs font-medium rounded-md bg-sky-500 text-white hover:bg-sky-600 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save note'}
          </button>
          <button onClick={() => setEditing(false)} disabled={saving} className="px-3 py-1 text-xs text-gray-600 rounded-md hover:bg-gray-100">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {notes && <p className="text-gray-600 mt-1 whitespace-pre-wrap">{notes}</p>}
      <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[11px] text-gray-400">
        {meta?.notes_edited_at && <span>Edited {formatManilaDateTime(meta.notes_edited_at)}</span>}
        {canEdit ? (
          <button onClick={() => { setDraft(notes); setEditing(true); }} className="text-sky-600 hover:text-sky-700 font-medium">
            {notes ? 'Edit note' : 'Add note'}
          </button>
        ) : lockedHint && <span>{lockedHint}</span>}
      </p>
    </>
  );
}
