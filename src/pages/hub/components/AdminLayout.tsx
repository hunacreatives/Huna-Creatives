import { ReactNode, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import AdminSidebar from './AdminSidebar';

interface Props {
  children: ReactNode;
  title?: string;
  actions?: ReactNode;
}

export default function AdminLayout({ children, title, actions }: Props) {
  const { hubUser, loading, session } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!loading && !session) {
      navigate('/hub/login', { replace: true });
    }
  }, [loading, session]);

  if (loading || !hubUser) return (
    <div className="flex h-screen items-center justify-center bg-[#FAFAFA]">
      <i className="ri-loader-4-line animate-spin text-2xl text-gray-300"></i>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#FAFAFA] overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <AdminSidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="w-[220px]">
            <AdminSidebar collapsed={false} onToggle={() => setMobileOpen(false)} />
          </div>
          <div className="flex-1 bg-black/50" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-100 px-4 md:px-6 py-3.5 flex items-center gap-4 flex-shrink-0">
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
            <div className="hidden sm:flex items-center gap-2 text-sm text-gray-500">
              <span className="text-gray-400">|</span>
              {hubUser.avatar_url ? (
                <img src={hubUser.avatar_url} alt={hubUser.full_name} className="w-7 h-7 rounded-full object-cover object-top flex-shrink-0" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-[#FF6B35] flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-bold">{hubUser.full_name.charAt(0)}</span>
                </div>
              )}
              <span className="font-medium text-gray-700 whitespace-nowrap">{hubUser.full_name}</span>
              <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                {hubUser.role === 'owner' ? 'Owner' : 'Admin'}
              </span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}