import { useEffect, useState } from 'react';
import type { LeadList, ListProgress } from './types';

// What the caller is working through right now, and what comes after it.
export function CallerListBanner({ lists, progress, listId }: {
  lists: LeadList[];
  progress: ListProgress[];
  listId: number | null | undefined;
}) {
  const list = lists.find(l => l.id === listId);
  if (!list) return null;
  const mine = progress.find(p => p.list_id === list.id);
  const next = lists.find(l => l.sort_order > list.sort_order && !l.paused
    && (progress.find(p => p.list_id === l.id)?.remaining ?? 0) > 0);
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-1">
      <div className="min-w-0">
        <p className="text-[11px] text-gray-500">Now calling</p>
        <p className="text-lg font-bold text-gray-800 leading-tight">{list.name}</p>
      </div>
      {mine && (
        <div className="flex-1 min-w-40">
          <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
            <div className="h-full bg-sky-500" style={{ width: `${mine.total ? (mine.called / mine.total) * 100 : 0}%` }} />
          </div>
          <p className="text-[11px] text-gray-500 mt-1">{mine.called.toLocaleString()} of {mine.total.toLocaleString()} called</p>
        </div>
      )}
      {next && <p className="text-xs text-gray-500">Next: <span className="font-medium text-gray-700">{next.name}</span></p>}
    </div>
  );
}

// Who to ask for and what to ask. Stays open the first time a caller meets a
// list, and remembers being closed on this device.
export function CallGuide({ list }: { list: LeadList | undefined }) {
  const storageKey = list ? `smartgrid_guide_seen_${list.key}` : '';
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!storageKey) return;
    try { setOpen(localStorage.getItem(storageKey) !== '1'); } catch { setOpen(true); }
  }, [storageKey]);

  if (!list || (!list.ask_for && !list.questions.length && !list.good_fit)) return null;

  const toggle = () => {
    setOpen(o => {
      try { localStorage.setItem(storageKey, o ? '1' : '0'); } catch { /* storage unavailable */ }
      return !o;
    });
  };

  return (
    <div className="rounded-lg border border-sky-100 bg-sky-50/60">
      <button type="button" onClick={toggle} className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-left">
        <span className="text-sm font-semibold text-sky-900">Calling {list.name}: what to ask</span>
        <i className={`${open ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'} text-sky-700`}></i>
      </button>
      {open && (
        <div className="px-4 pb-3 space-y-2 text-sm text-gray-700">
          {list.ask_for && <p><span className="font-medium text-gray-800">Ask for:</span> {list.ask_for}</p>}
          {list.questions.length > 0 && (
            <ul className="list-disc pl-5 space-y-0.5">
              {list.questions.map(q => <li key={q}>{q}</li>)}
            </ul>
          )}
          {list.good_fit && <p><span className="font-medium text-gray-800">Good fit:</span> {list.good_fit}</p>}
        </div>
      )}
    </div>
  );
}
