import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

const STORAGE_KEY = 'huna_cookie_consent';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function applyConsent(granted: boolean) {
  window.gtag?.('consent', 'update', {
    analytics_storage: granted ? 'granted' : 'denied',
    ad_storage: granted ? 'granted' : 'denied',
    ad_user_data: granted ? 'granted' : 'denied',
    ad_personalization: granted ? 'granted' : 'denied',
  });
}

// Only shown on the public marketing site — the Hub is a logged-in internal
// tool, not a visitor-facing surface this banner needs to gate.
export default function CookieConsent() {
  const location = useLocation();
  const [visible, setVisible] = useState(false);

  const isHub = location.pathname.startsWith('/hub');

  useEffect(() => {
    // The Hub is a logged-in internal tool, not an anonymous public visitor
    // surface — skip the consent gate there entirely rather than leaving GA
    // permanently denied with no banner ever available to grant it.
    if (isHub) { applyConsent(true); return; }
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'granted') {
      applyConsent(true);
    } else if (!stored) {
      setVisible(true);
    }
    // 'denied' stays denied — index.html's consent default already covers it.
  }, [isHub]);

  if (isHub) return null;
  if (!visible) return null;

  const decide = (granted: boolean) => {
    localStorage.setItem(STORAGE_KEY, granted ? 'granted' : 'denied');
    applyConsent(granted);
    setVisible(false);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 sm:p-5">
      <div className="max-w-2xl mx-auto rounded-2xl border border-white/10 bg-[#111111] shadow-2xl shadow-black/40 px-5 py-4 sm:px-6 sm:py-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <p className="text-white/70 text-xs sm:text-[13px] leading-relaxed flex-1">
            We use cookies to understand how visitors use this site. See our{' '}
            <a href="/privacy" className="text-orange-400 hover:underline">Privacy Policy</a> to learn more.
          </p>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => decide(false)}
              className="px-4 py-2 rounded-lg text-xs font-medium text-white/60 hover:text-white/90 border border-white/10 hover:border-white/20 transition-colors cursor-pointer whitespace-nowrap"
            >
              Decline
            </button>
            <button
              onClick={() => decide(true)}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 transition-colors cursor-pointer whitespace-nowrap"
            >
              Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
