import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { useDemo } from '@/contexts/DemoContext';
import { HINTS, getPageHelp, HelpEntry } from '@/lib/helpContent';

interface InfoHintProps {
  /** Look up copy from the HINTS registry by id… */
  id?: string;
  /** …or pass copy inline. */
  title?: string;
  body?: string;
  /** Visual size of the ⓘ trigger. */
  size?: 'sm' | 'md';
  className?: string;
}

const POP_WIDTH = 260;

/**
 * A small ⓘ button that opens a popover explaining a page or control.
 * Renders ONLY in the demo (isDemo) — real staff never see it.
 * The popover is portaled to <body> with fixed positioning so it can never be
 * clipped by an overflow-hidden card or hidden behind a stacking context.
 */
export default function InfoHint({ id, title, body, size = 'sm', className = '' }: InfoHintProps) {
  const { isDemo } = useDemo();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; arrow: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClose = () => { if (closeTimer.current) clearTimeout(closeTimer.current); };
  const openNow = () => { cancelClose(); setOpen(true); };
  // Small delay so moving the cursor from the dot to the popover keeps it open.
  const scheduleClose = () => { cancelClose(); closeTimer.current = setTimeout(() => setOpen(false), 140); };

  useEffect(() => () => cancelClose(), []);

  const place = useCallback(() => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    let left = cx - POP_WIDTH / 2;
    left = Math.max(10, Math.min(left, window.innerWidth - POP_WIDTH - 10));
    const top = r.bottom + 10;
    setPos({ top, left, arrow: cx - left });
  }, []);

  useEffect(() => {
    if (!open) return;
    place();
    const onDown = (e: MouseEvent) => {
      if (btnRef.current?.contains(e.target as Node)) return;
      if (popRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onEsc);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onEsc);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, place]);

  if (!isDemo) return null;

  const entry: HelpEntry | undefined = id ? HINTS[id] : (title ? { title, body: body ?? '' } : undefined);
  if (!entry) return null;

  const dim = size === 'md' ? 'w-5 h-5 text-[13px]' : 'w-4 h-4 text-[11px]';

  return (
    <span className="relative inline-flex align-middle" data-tour="help-hint">
      <button
        ref={btnRef}
        type="button"
        aria-label={`Help: ${entry.title}`}
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); setOpen((o) => !o); }}
        onMouseEnter={openNow}
        onMouseLeave={scheduleClose}
        className={`${dim} ${className} relative inline-flex items-center justify-center rounded-full bg-[#FF6B35]/15 hover:bg-[#FF6B35]/25 transition-colors cursor-pointer`}
      >
        {/* faint pulsing ring */}
        <span
          aria-hidden
          className="absolute inset-0 rounded-full bg-[#FF6B35]/40 animate-ping"
          style={{ animationDuration: '2.4s' }}
        />
        {/* solid center dot */}
        <span className="relative rounded-full bg-[#FF6B35]" style={{ width: '38%', height: '38%' }} />
      </button>

      {open && pos && createPortal(
        <div
          ref={popRef}
          className="fixed z-[120] rounded-2xl p-4 text-left"
          style={{
            top: pos.top, left: pos.left, width: POP_WIDTH,
            background: 'rgba(255,255,255,0.99)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(0,0,0,0.06)',
            boxShadow: '0 12px 44px rgba(31,41,55,0.22)',
          }}
          onMouseEnter={openNow}
          onMouseLeave={scheduleClose}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="absolute -top-1.5 w-3 h-3 rotate-45 bg-white"
            style={{ left: pos.arrow - 6, borderLeft: '1px solid rgba(0,0,0,0.06)', borderTop: '1px solid rgba(0,0,0,0.06)' }}
          />
          <div className="flex items-start gap-2 mb-1.5">
            <span className="mt-0.5 w-4 h-4 rounded-full bg-[#FF6B35]/15 text-[#FF6B35] text-[10px] inline-flex items-center justify-center flex-shrink-0">
              <i className="ri-lightbulb-line" />
            </span>
            <p className="text-sm font-semibold text-gray-800 leading-tight">{entry.title}</p>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">{entry.body}</p>
        </div>,
        document.body
      )}
    </span>
  );
}

/**
 * Page-level ⓘ that auto-resolves "what is this page" from the current route.
 * Drop it next to a page title; shows nothing if there's no entry or not in demo.
 */
export function PageHelp() {
  const { isDemo } = useDemo();
  const { pathname } = useLocation();
  if (!isDemo) return null;
  const entry = getPageHelp(pathname);
  if (!entry) return null;
  return <InfoHint title={entry.title} body={entry.body} size="md" />;
}
