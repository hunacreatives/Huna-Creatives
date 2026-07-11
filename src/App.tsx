import { BrowserRouter, useLocation } from "react-router-dom";
import { AppRoutes } from "./router";
import { I18nextProvider } from "react-i18next";
import i18n from "./i18n";
import { useEffect, useRef, Suspense } from "react";
import ScrollToTop from "./components/feature/ScrollToTop";
import { AuthProvider } from "./contexts/AuthContext";
import { DemoProvider } from "./contexts/DemoContext";

// Pages that use a light/white background
const LIGHT_BG_ROUTES = ['/about', '/hub'];
const DARK_HUB_ROUTES = ['/hub/login'];
// Routes where navigation should feel instant (no fade animation)
const NO_TRANSITION_ROUTES = ['/hub'];

function PageTransitionWrapper({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Sync html + body background with the page so overscroll never flickers
    const isDarkHubRoute = DARK_HUB_ROUTES.some((r) => location.pathname.startsWith(r));
    const isLight = LIGHT_BG_ROUTES.some((r) => location.pathname.startsWith(r));
    const bg = isDarkHubRoute ? '#0a0608' : isLight ? '#ffffff' : '#0a0a0a';
    document.documentElement.style.background = bg;
    document.body.style.background = bg;
  }, [location.pathname]);

  useEffect(() => {
    const isHub = NO_TRANSITION_ROUTES.some((r) => location.pathname.startsWith(r));
    if (isHub) return; // hub sections switch instantly like tabs
    const el = wrapperRef.current;
    if (!el) return;
    el.classList.remove('page-enter');
    void el.offsetWidth;
    el.classList.add('page-enter');
  }, [location.pathname]);

  return (
    <div ref={wrapperRef} className="page-enter">
      {children}
    </div>
  );
}

function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <BrowserRouter basename={__BASE_PATH__}>
        <DemoProvider>
          <AuthProvider>
            <PageTransitionWrapper>
              <Suspense fallback={
                <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 32, height: 32, border: '3px solid rgba(255,107,53,0.9)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'app-boot-spin 0.8s linear infinite' }} />
                  <style>{`@keyframes app-boot-spin{to{transform:rotate(360deg)}}`}</style>
                </div>
              }>
                <AppRoutes />
              </Suspense>
            </PageTransitionWrapper>
            <ScrollToTop />
          </AuthProvider>
        </DemoProvider>
      </BrowserRouter>
    </I18nextProvider>
  );
}

export default App;
