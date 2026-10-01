import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { CONSENT_EVENT, trackPageView } from '@/lib/metaPixel';

// The site is a single-page app, so each route change is reported as a page view
export default function MetaPixelPageViews() {
  const location = useLocation();

  useEffect(() => {
    trackPageView();
  }, [location.pathname]);

  useEffect(() => {
    const onConsent = () => trackPageView();
    window.addEventListener(CONSENT_EVENT, onConsent);
    return () => window.removeEventListener(CONSENT_EVENT, onConsent);
  }, []);

  return null;
}
