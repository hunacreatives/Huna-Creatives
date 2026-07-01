import { useState, useEffect, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useDemo } from '@/contexts/DemoContext';
import { DASHBOARD_TOUR, TourStep } from '@/lib/helpContent';
import { openBooking } from '@/lib/demoBooking';

const SEEN_KEY = 'hub_demo_tour_seen';

interface Rect { top: number; left: number; width: number; height: number; }

/**
 * First-visit spotlight walkthrough for the demo. Renders only in the demo,
 * once per browser (localStorage). Mount it on the admin dashboard.
 * Elements are targeted via data-tour="<anchor>".
 */
export default function DemoTour({ steps = DASHBOARD_TOUR }: { steps?: TourStep[] }) {
  const { isDemo } = useDemo();
  const [active, setActive] = useState(false);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  // Start once, shortly after mount so the dashboard has rendered.
  useEffect(() => {
    if (!isDemo) return;
    if (localStorage.getItem(SEEN_KEY) === '1') return;
    const t = setTimeout(() => setActive(true), 700);
    return () => clearTimeout(t);
  }, [isDemo]);

  const step = steps[i];

  const measure = useCallback(() => {
    if (!step?.anchor) { setRect(null); return; }
    const el = document.querySelector(`[data-tour="${step.anchor}"]`);
    if (!el) { setRect(null); return; }
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [step]);

  useLayoutEffect(() => {
    if (!active) return;
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [active, measure]);

  if (!isDemo || !active || !step) return null;

  const finish = () => {
    localStorage.setItem(SEEN_KEY, '1');
    setActive(false);
  };
  const next = () => (i < steps.length - 1 ? setI(i + 1) : finish());
  const back = () => setI(Math.max(0, i - 1));

  const pad = 8;
  const spot = rect
    ? { top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }
    : null;

  // Tooltip placement: below the spotlight, else centered.
  const tipWidth = 300;
  let tipStyle: React.CSSProperties;
  if (spot) {
    const belowSpace = window.innerHeight - (spot.top + spot.height);
    const placeBelow = belowSpace > 180;
    const top = placeBelow ? spot.top + spot.height + 12 : Math.max(12, spot.top - 12 - 170);
    let left = spot.left + spot.width / 2 - tipWidth / 2;
    left = Math.max(12, Math.min(left, window.innerWidth - tipWidth - 12));
    tipStyle = { top, left, width: tipWidth };
  } else {
    tipStyle = { top: '50%', left: '50%', width: tipWidth, transform: 'translate(-50%, -50%)' };
  }

  return createPortal(
    <div className="fixed inset-0 z-[100]">
      {/* Dimmer + spotlight cutout (box-shadow trick) */}
      {spot ? (
        <div
          className="absolute rounded-xl transition-all duration-300 pointer-events-none"
          style={{
            top: spot.top, left: spot.left, width: spot.width, height: spot.height,
            boxShadow: '0 0 0 9999px rgba(15,10,8,0.62)',
            border: '2px solid rgba(255,107,53,0.9)',
          }}
        />
      ) : (
        <div className="absolute inset-0" style={{ background: 'rgba(15,10,8,0.62)' }} />
      )}

      {/* Tooltip card */}
      <div
        className="absolute rounded-2xl p-5"
        style={{
          ...tipStyle,
          background: 'rgba(255,255,255,0.98)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: '0 16px 50px rgba(15,10,8,0.35)',
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-semibold tracking-widest uppercase text-[#FF6B35]">
            Step {i + 1} of {steps.length}
          </span>
          <button onClick={finish} className="text-gray-300 hover:text-gray-500 cursor-pointer" aria-label="Skip tour">
            <i className="ri-close-line" />
          </button>
        </div>
        <h3 className="text-base font-bold text-gray-800 mb-1.5">{step.title}</h3>
        <p className="text-sm text-gray-500 leading-relaxed mb-4">{step.body}</p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {steps.map((_, idx) => (
              <span key={idx} className={`h-1.5 rounded-full transition-all ${idx === i ? 'w-4 bg-[#FF6B35]' : 'w-1.5 bg-gray-200'}`} />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {i > 0 && (
              <button onClick={back} className="text-xs font-medium text-gray-400 hover:text-gray-600 cursor-pointer px-2 py-1.5">
                Back
              </button>
            )}
            {step.cta ? (
              <button
                onClick={() => { openBooking(); finish(); }}
                className="text-xs font-semibold text-white cursor-pointer px-4 py-2 rounded-xl flex items-center gap-1.5"
                style={{ background: 'linear-gradient(135deg, #FF6B35, #e53a00)', boxShadow: '0 4px 16px rgba(255,107,53,0.4)' }}
              >
                <i className="ri-calendar-check-line" /> Book a call
              </button>
            ) : (
              <button
                onClick={next}
                className="text-xs font-semibold text-white cursor-pointer px-4 py-2 rounded-xl"
                style={{ background: 'linear-gradient(135deg, #FF6B35, #e53a00)', boxShadow: '0 4px 16px rgba(255,107,53,0.4)' }}
              >
                {i < steps.length - 1 ? 'Next →' : 'Got it'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
