import { BrowserRouter, useLocation } from "react-router-dom";
import { AppRoutes } from "./router";
import { I18nextProvider } from "react-i18next";
import i18n from "./i18n";
import { useEffect, useRef } from "react";
import ScrollToTop from "./components/feature/ScrollToTop";
import { AuthProvider } from "./contexts/AuthContext";
import { DemoProvider } from "./contexts/DemoContext";

// Pages that use a light/white background
const LIGHT_BG_ROUTES = ['/about', '/hub'];

function PageTransitionWrapper({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Sync html + body background with the page so overscroll never flickers
    const isLight = LIGHT_BG_ROUTES.some((r) => location.pathname.startsWith(r));
    const bg = isLight ? '#ffffff' : '#0a0a0a';
    document.documentElement.style.background = bg;
    document.body.style.background = bg;
  }, [location.pathname]);

  useEffect(() => {
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
              <AppRoutes />
            </PageTransitionWrapper>
            <ScrollToTop />
          </AuthProvider>
        </DemoProvider>
      </BrowserRouter>
    </I18nextProvider>
  );
}

export default App;
