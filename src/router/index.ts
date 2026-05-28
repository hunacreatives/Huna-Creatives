import { useNavigate, type NavigateFunction } from "react-router-dom";
import { useRoutes, useLocation } from "react-router-dom";
import { useEffect } from "react";
import routes from "./config";

let navigateResolver: (navigate: ReturnType<typeof useNavigate>) => void;

declare global {
  interface Window {
    REACT_APP_NAVIGATE: ReturnType<typeof useNavigate>;
  }
}

export const navigatePromise = new Promise<NavigateFunction>((resolve) => {
  navigateResolver = resolve;
});

export function AppRoutes() {
  const element = useRoutes(routes);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    window.REACT_APP_NAVIGATE = navigate;
    navigateResolver(window.REACT_APP_NAVIGATE);
  });

  // Pre-fetch all hub pages as soon as the user is in the hub
  // so subsequent navigation between sections is instant
  useEffect(() => {
    if (!location.pathname.startsWith('/hub')) return;
    import('../pages/hub/admin/contractors/page');
    import('../pages/hub/admin/payroll/page');
    import('../pages/hub/admin/attendance/page');
    import('../pages/hub/admin/projects/page');
    import('../pages/hub/admin/clients/page');
    import('../pages/hub/admin/requests/page');
    import('../pages/hub/admin/timeoff/page');
    import('../pages/hub/admin/announcements/page');
    import('../pages/hub/admin/sop/page');
    import('../pages/hub/admin/performance/page');
    import('../pages/hub/admin/invoice-log/page');
    import('../pages/hub/contractor/dashboard/page');
    import('../pages/hub/contractor/payouts/page');
    import('../pages/hub/contractor/attendance/page');
  }, []);

  return element;
}
