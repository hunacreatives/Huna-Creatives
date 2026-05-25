import { ReactNode, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import ContractorSidebar from './ContractorSidebar';
import NotificationBell from './NotificationBell';
import DevToolbar from './DevToolbar';

interface Props {
  children: ReactNode;
  title?: string;
  actions?: ReactNode;
}

export default function ContractorLayout({ children, title, actions }: Props) {
  const { hubUser, loading, session } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!loading && !session) {
      navigate('/hub/login', { replace: true });
    }
  }, [loading, session]);

  useEffect(() => {
    if (!loading && hubUser && hubUser.role === 'contractor' && hubUser.onboarding_completed === false) {
      const path = window.location.pathname;
      if (path !== '/hub/contractor/onboarding') {
        navigate('/hub/contractor/onboarding', { replace: true });
      }
    }
    // developer viewing as contractor bypasses onboarding check
  }, [loading, hubUser]);

  if (loading || !hubUser) return (
    <div className="flex h-screen items-center justify-center bg-[#FAFAFA]">
      <i className="ri-loader-4-line animate-spin text-2xl text-gray-300"></i>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#FAFAFA] overflow-hidden">
      <div className="hidden lg:block">
        <ContractorSidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      </div>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="w-[220px]">
            <ContractorSidebar collapsed={false} onToggle={() => setMobileOpen(false)} />
          </div>
          <div className="flex-1 bg-black/50" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white border-b border-gray-100 px-4 md:px-6 h-[57px] flex items-center gap-4 flex-shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden text-gray-500 hover:text-gray-700 cursor-pointer"
          >
            <i className="ri-menu-line text-lg"></i>
          </button>
          <div className="flex-1 min-w-0">
            {title && <h1 className="text-[#111827] font-semibold text-base truncate">{title}</h1>}
          </div>
          <div className="flex items-center gap-3">
            {actions}
            <NotificationBell />
            <div className="hidden sm:flex items-center gap-2 text-sm text-gray-500">
              <span className="text-gray-400">|</span>
              <img
                src={hubUser?.avatar_url || ''}
                alt={hubUser?.full_name}
                className="w-6 h-6 rounded-full object-cover object-top"
              />
              <span className="font-medium text-gray-700 whitespace-nowrap">{hubUser.full_name}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
      <DevToolbar />
    </div>
  );
}