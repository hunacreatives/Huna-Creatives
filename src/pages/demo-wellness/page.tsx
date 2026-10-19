// Salt & Stillness — a click-through demo of a custom yoga studio site and its
// back end, for prospects. UI only: sample data, nothing saved or sent.
// Lives at /demo/wellness (guest site) and /demo/wellness/admin (studio admin).

import { useEffect } from 'react';
import { Outlet, Route, Routes, useLocation } from 'react-router-dom';
import './ui/theme.css';
import { DemoWellnessProvider } from './lib/demo';
import { AdminLayout, SiteLayout } from './ui/layouts';

import Home from './site/Home';
import Schedule from './site/Schedule';
import Passes from './site/Passes';
import Checkout from './site/Checkout';
import Confirmation from './site/Confirmation';
import Account from './site/Account';
import Retreats from './site/Retreats';
import RetreatDetail from './site/RetreatDetail';
import Online from './site/Online';

import AdminToday from './admin/Today';
import AdminSchedule from './admin/Schedule';
import AdminClassRoster from './admin/ClassRoster';
import AdminClients from './admin/Clients';
import AdminRetreats from './admin/Retreats';
import AdminRetreatManifest from './admin/RetreatManifest';
import AdminProducts from './admin/Products';
import AdminSales from './admin/Sales';
import AdminReports from './admin/Reports';
import AdminStaff from './admin/Staff';
import AdminLibrary from './admin/Library';

function useDemoHead() {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = 'Salt & Stillness Yoga — demo by Huna Creatives';
    const robots = document.createElement('meta');
    robots.name = 'robots';
    robots.content = 'noindex, nofollow';
    document.head.appendChild(robots);
    return () => { document.title = prevTitle; robots.remove(); };
  }, []);
}

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

export default function WellnessDemo() {
  useDemoHead();
  return (
    <DemoWellnessProvider>
      <div className="ssw">
        <ScrollTop />
        <Routes>
          <Route element={<SiteLayout><Outlet /></SiteLayout>}>
            <Route index element={<Home />} />
            <Route path="schedule" element={<Schedule />} />
            <Route path="passes" element={<Passes />} />
            <Route path="checkout" element={<Checkout />} />
            <Route path="confirmation" element={<Confirmation />} />
            <Route path="account" element={<Account />} />
            <Route path="retreats" element={<Retreats />} />
            <Route path="retreats/:slug" element={<RetreatDetail />} />
            <Route path="online" element={<Online />} />
          </Route>
          <Route path="admin" element={<AdminLayout><Outlet /></AdminLayout>}>
            <Route index element={<AdminToday />} />
            <Route path="schedule" element={<AdminSchedule />} />
            <Route path="classes/:sessionId" element={<AdminClassRoster />} />
            <Route path="clients" element={<AdminClients />} />
            <Route path="retreats" element={<AdminRetreats />} />
            <Route path="retreats/:id" element={<AdminRetreatManifest />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="sales" element={<AdminSales />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="staff" element={<AdminStaff />} />
            <Route path="library" element={<AdminLibrary />} />
          </Route>
          <Route path="*" element={<SiteLayout><Home /></SiteLayout>} />
        </Routes>
      </div>
    </DemoWellnessProvider>
  );
}
