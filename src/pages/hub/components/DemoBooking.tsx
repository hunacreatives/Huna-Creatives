import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useDemo } from '@/contexts/DemoContext';
import { openBooking } from '@/lib/demoBooking';

const NUDGE_SEEN = 'hub_demo_book_nudge_seen';
const NUDGE_DELAY_MS = 90_000; // ~90s of exploring before the gentle nudge

// Fired by the demo bar's Exit button so we can offer a call before they leave.
export const EXIT_INTENT_EVENT = 'sentro:demo-exit-intent';

/**
 * Booking CTAs for the demo: a one-time slide-in nudge and an exit-intent
 * modal. Mount once per layout and pass the real exit handler. Demo-only.
 */
export default function DemoBooking({ onExit }: { onExit: () => void }) {
  const { isDemo } = useDemo();
  const [showNudge, setShowNudge] = useState(false);
  const [showExit, setShowExit] = useState(false);

  // One-time timed nudge
  useEffect(() => {
    if (!isDemo) return;
    if (localStorage.getItem(NUDGE_SEEN) === '1') return;
    const t = setTimeout(() => setShowNudge(true), NUDGE_DELAY_MS);
    return () => clearTimeout(t);
  }, [isDemo]);

  // Exit-intent (dispatched by the Exit button)
  useEffect(() => {
    if (!isDemo) return;
    const onExitIntent = () => setShowExit(true);
    window.addEventListener(EXIT_INTENT_EVENT, onExitIntent);
    return () => window.removeEventListener(EXIT_INTENT_EVENT, onExitIntent);
  }, [isDemo]);

  if (!isDemo) return null;

  const dismissNudge = () => {
    localStorage.setItem(NUDGE_SEEN, '1');
    setShowNudge(false);
  };
  const book = () => { openBooking(); };

  return createPortal(
    <>
      {/* One-time slide-in nudge (bottom-right) */}
      {showNudge && !showExit && (
        <div className="fixed bottom-4 right-4 z-[110] w-[320px] max-w-[calc(100vw-2rem)] rounded-2xl p-4 animate-[bookIn_0.4s_cubic-bezier(0.22,1,0.36,1)]"
          style={{ background: 'rgba(255,255,255,0.99)', boxShadow: '0 16px 50px rgba(31,41,55,0.24)', border: '1px solid rgba(0,0,0,0.06)' }}>
          <button onClick={dismissNudge} aria-label="Dismiss" className="absolute top-3 right-3 text-gray-300 hover:text-gray-500 cursor-pointer">
            <i className="ri-close-line" />
          </button>
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FF6B35]/12 text-[#FF6B35] flex items-center justify-center flex-shrink-0">
              <i className="ri-calendar-check-line text-lg" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-800">Enjoying the demo?</p>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">Book a free 20-minute exploration call and we’ll set this up for your team.</p>
              <div className="flex items-center gap-2 mt-3">
                <button onClick={() => { book(); dismissNudge(); }}
                  className="text-xs font-semibold text-white px-3 py-2 rounded-lg cursor-pointer"
                  style={{ background: 'linear-gradient(135deg, #FF6B35, #e53a00)', boxShadow: '0 4px 14px rgba(255,107,53,0.35)' }}>
                  Book a call
                </button>
                <button onClick={dismissNudge} className="text-xs font-medium text-gray-400 hover:text-gray-600 cursor-pointer px-2 py-2">
                  Maybe later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Exit-intent modal */}
      {showExit && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4" style={{ background: 'rgba(15,10,8,0.55)' }}
          onClick={() => setShowExit(false)}>
          <div className="w-full max-w-sm rounded-3xl p-6 text-center animate-[bookIn_0.35s_cubic-bezier(0.22,1,0.36,1)]"
            style={{ background: 'rgba(255,255,255,0.99)', boxShadow: '0 24px 70px rgba(15,10,8,0.4)' }}
            onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-2xl bg-[#FF6B35]/12 text-[#FF6B35] flex items-center justify-center mx-auto mb-3">
              <i className="ri-calendar-check-line text-2xl" />
            </div>
            <h3 className="text-lg font-bold text-gray-800">Before you go…</h3>
            <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">
              Want to see Sentro running for your own team? Book a free 20-minute exploration call — no pressure.
            </p>
            <button onClick={book}
              className="w-full mt-5 text-sm font-semibold text-white py-3 rounded-xl cursor-pointer"
              style={{ background: 'linear-gradient(135deg, #FF6B35, #e53a00)', boxShadow: '0 4px 20px rgba(255,107,53,0.4)' }}>
              Book an exploration call →
            </button>
            <button onClick={() => { setShowExit(false); onExit(); }}
              className="w-full mt-2 text-sm font-medium text-gray-400 hover:text-gray-600 py-2 cursor-pointer">
              Exit the demo
            </button>
          </div>
        </div>
      )}

      <style>{`@keyframes bookIn { from { opacity: 0; transform: translateY(16px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }`}</style>
    </>,
    document.body
  );
}
