import { ReactNode, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useHubAuth } from '@/hooks/useHubAuth';
import { useDemo } from '@/contexts/DemoContext';
import ContractorSidebar from './ContractorSidebar';
import NotificationBell from './NotificationBell';
import DevToolbar from './DevToolbar';

interface Props {
  children: ReactNode;
  title?: string;
  actions?: ReactNode;
}

export default function ContractorLayout({ children, title, actions }: Props) {
  const { loading, session } = useAuth();
  const { hubUser } = useHubAuth();
  const { isDemo, demoRole, demoSignOut, setDemoRole } = useDemo();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!isDemo && !loading && !session) {
      navigate('/hub/login', { replace: true });
    }
  }, [loading, session, isDemo]);

  useEffect(() => {
    if (!loading && hubUser && hubUser.role === 'contractor' && hubUser.onboarding_completed === false) {
      const path = window.location.pathname;
      if (path !== '/hub/contractor/onboarding') {
        navigate('/hub/contractor/onboarding', { replace: true });
      }
    }
    // developer viewing as contractor bypasses onboarding check
  }, [loading, hubUser]);

  if (!isDemo && (loading || !hubUser)) return (
    <div className="flex h-screen items-center justify-center bg-[#FAFAFA]">
      <i className="ri-loader-4-line animate-spin text-2xl text-gray-300"></i>
    </div>
  );

  return (
    <div className={`relative flex ${isDemo ? 'h-screen pt-8' : 'h-screen'} overflow-hidden`} style={{ background: 'linear-gradient(135deg, #d6e0ee 0%, #e8edf8 45%, #f4f6fb 100%)' }}>
      {isDemo && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-[#111827] text-white text-xs flex items-center justify-between px-4 py-1.5 gap-4">
          <span className="text-white/40 hidden sm:block flex-shrink-0">Demo</span>
          <div className="flex items-center gap-1 flex-1 justify-center">
            {(['owner', 'admin', 'contractor'] as const).map(role => (
              <button
                key={role}
                onClick={() => {
                  setDemoRole(role);
                  navigate(role === 'contractor' ? '/hub/contractor/dashboard' : '/hub/admin/dashboard');
                }}
                className={`px-3 py-1 rounded-full text-[11px] font-medium capitalize transition-colors cursor-pointer ${demoRole === role ? 'bg-white text-[#111827]' : 'text-white/50 hover:text-white'}`}
              >
                {role}
              </button>
            ))}
          </div>
          <button onClick={() => { demoSignOut(); navigate('/hub/demo'); }} className="text-white/40 hover:text-white transition-colors cursor-pointer flex-shrink-0 text-[11px]">Exit</button>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:block relative z-10">
        <ContractorSidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="w-[220px] flex-shrink-0">
            <ContractorSidebar collapsed={false} onToggle={() => setMobileOpen(false)} />
          </div>
          <div className="flex-1 bg-black/20 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      {/* Main content */}
      <div className="relative z-10 flex-1 min-w-0 overflow-hidden lg:px-4 lg:pb-4 lg:pt-5 md:px-5 md:pb-5">
        <div className="flex h-full flex-col lg:rounded-[34px] overflow-hidden lg:shadow-xl lg:shadow-indigo-100/50"
          style={{ background: 'rgba(255,255,255,0.60)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.75)' }}
        >
          {/* Top bar */}
          <header className="border-b border-white/60 px-4 md:px-6 h-[78px] flex items-center gap-4 flex-shrink-0 bg-transparent">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden w-10 h-10 rounded-2xl border border-gray-100 bg-white text-gray-500 hover:text-gray-900 cursor-pointer"
            >
              <i className="ri-menu-line text-lg"></i>
            </button>
            <div className="flex-1 min-w-0">
              {title && <h1 className="text-gray-900 font-semibold text-[28px] leading-tight truncate">{title}</h1>}
            </div>
            <div className="flex items-center gap-3">
              {actions}
              <NotificationBell />
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto overscroll-none p-4 md:p-6 bg-transparent">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
      <DevToolbar />
    </div>
  );
}