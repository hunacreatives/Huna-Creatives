import { useState, FormEvent } from 'react';
import { supabase } from '@/lib/supabase';

interface Props {
  userId: string;
  date: string;
  fullName: string;
  currentHours: number | null;
  onClose: () => void;
  onSuccess: () => void;
}

const REASONS = [
  'Paid Holiday',
  'Make-up Hours',
  'Manual Correction',
  'System Error Fix',
  'Other',
];

export default function EditHoursModal({ userId, date, fullName, currentHours, onClose, onSuccess }: Props) {
  const [hours, setHours] = useState(currentHours != null ? String(currentHours) : '');
  const [reason, setReason] = useState('Paid Holiday');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const displayDate = new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const h = parseFloat(hours);
    if (isNaN(h) || h < 0 || h > 24) {
      setError('Enter a valid number of hours (0–24).');
      return;
    }
    setLoading(true);
    setError('');

    const overrideReason = reason === 'Other' && notes.trim() ? notes.trim() : reason + (notes.trim() ? ` — ${notes.trim()}` : '');

    const { error: err } = await supabase
      .from('hub_daily_hours')
      .upsert(
        {
          user_id: userId,
          date,
          hours_raw: h,
          hours_capped: h,
          is_manual: true,
          override_reason: overrideReason,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,date' }
      );

    setLoading(false);
    if (err) { setError(err.message); return; }
    onSuccess();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-[#111827] text-sm">Edit Hours</h2>
            <p className="text-xs text-gray-400 mt-0.5">{fullName} · {displayDate}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer">
            <i className="ri-close-line text-lg"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">Hours to apply *</label>
            <div className="relative">
              <input
                required
                type="number"
                step="0.25"
                min="0"
                max="24"
                value={hours}
                onChange={e => setHours(e.target.value)}
                placeholder="e.g. 8"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] pr-10"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">hrs</span>
            </div>
            {currentHours != null && (
              <p className="text-xs text-gray-400">Current: {currentHours.toFixed(2)}h</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">Reason *</label>
            <select
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] bg-white"
            >
              {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">Notes {reason !== 'Other' ? '(optional)' : '*'}</label>
            <input
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder={reason === 'Paid Holiday' ? 'e.g. Cebu Day holiday' : 'Add details...'}
              required={reason === 'Other'}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]"
            />
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2.5 flex gap-2 text-xs text-amber-700">
            <i className="ri-information-line flex-shrink-0 mt-0.5"></i>
            <span>This will override the logged hours for this day and will be counted toward payroll.</span>
          </div>

          {error && (
            <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 text-sm border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 cursor-pointer">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 text-sm bg-[#FF6B35] text-white rounded-lg hover:bg-[#e55a27] disabled:opacity-60 cursor-pointer">
              {loading ? 'Saving…' : 'Save & Apply'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
