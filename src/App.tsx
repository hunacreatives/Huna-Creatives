import { BrowserRouter, useLocation } from "react-router-dom";
import { AppRoutes } from "./router";
import { I18nextProvider } from "react-i18next";
import i18n from "./i18n";
import { useEffect, useRef } from "react";
import ScrollToTop from "./components/feature/ScrollToTop";

function PageTransitionWrapper({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const wrapperRef = useRef<HTMLDivElement>(null);

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
        <PageTransitionWrapper>
          <AppRoutes />
        </PageTransitionWrapper>
        <ScrollToTop />
      </BrowserRouter>
    </I18nextProvider>
  );
}

export default App;
