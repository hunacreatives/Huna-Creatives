import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const navItems = [
  { to: '/hub/admin/dashboard', label: 'Dashboard', icon: 'ri-layout-grid-line' },
  { to: '/hub/admin/contractors', label: 'Contractors', icon: 'ri-team-line' },
  { to: '/hub/admin/attendance', label: 'Attendance', icon: 'ri-time-line' },
  { to: '/hub/admin/requests', label: 'Requests', icon: 'ri-inbox-line' },
  { to: '/hub/admin/timeoff', label: 'Time-Off', icon: 'ri-calendar-event-line' },
  { to: '/hub/admin/overtime', label: 'Overtime', icon: 'ri-timer-flash-line' },
  { divider: true, label: 'Finance' },
  { to: '/hub/admin/payroll', label: 'Payroll', icon: 'ri-bar-chart-2-line' },
  { to: '/hub/admin/docrequests', label: 'Doc Requests', icon: 'ri-file-list-3-line' },
  { divider: true, label: 'Content' },
  { to: '/hub/admin/sop', label: 'SOP Library', icon: 'ri-book-open-line' },
  { to: '/hub/admin/announcements', label: 'Announcements', icon: 'ri-megaphone-line' },
  { to: '/hub/admin/clients', label: 'Client Assignments', icon: 'ri-building-2-line' },
  { to: '/hub/admin/assets', label: 'Asset Access', icon: 'ri-key-2-line' },
  { to: '/hub/admin/credentials', label: 'Credentials Vault', icon: 'ri-lock-2-line' },
  { to: '/hub/admin/auditlog', label: 'Audit Log', icon: 'ri-shield-check-line' },
  { to: '/hub/admin/settings', label: 'Settings', icon: 'ri-settings-3-line' },
];

interface Props {
  collapsed: boolean;
  onToggle: () => void;
}

export default function AdminSidebar({ collapsed, onToggle }: Props) {
  const { hubUser, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/hub/login');
  };

  return (
    <aside
      className={`h-screen bg-[#111827] flex flex-col transition-all duration-300 ease-in-out flex-shrink-0 ${
        collapsed ? 'w-[60px]' : 'w-[220px]'
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
        {collapsed ? (
          <div className="w-7 h-7 bg-[#FF6B35] rounded-lg flex items-center justify-center flex-shrink-0">
            <i className="ri-home-heart-line text-white text-xs"></i>
          </div>
        ) : (
          <img src="/images/fc04818c74ad69bdfb22b93a6a0c6a72.png" alt="Huna Creatives" className="h-7 w-auto flex-shrink-0" />
        )}
        {!collapsed && (
          <span className="text-white/40 text-xs tracking-widest uppercase font-medium whitespace-nowrap overflow-hidden">
            Huna Hub
          </span>
        )}
        <button
          onClick={onToggle}
          className={`ml-auto text-gray-400 hover:text-white transition-colors cursor-pointer ${collapsed ? 'mx-auto' : ''}`}
        >
          <i className={`text-sm ${collapsed ? 'ri-menu-unfold-line' : 'ri-menu-fold-line'}`}></i>
        </button>
      </div>

      {/* Role badge */}
      {!collapsed && (
        <div className="px-4 py-2">
          <span className="text-xs text-[#FF6B35] font-medium bg-[#FF6B35]/10 px-2 py-0.5 rounded-full whitespace-nowrap">
            {hubUser?.role === 'owner' ? 'Owner' : 'HR / Admin'}
          </span>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
        {navItems.map((item, idx) => {
          if ((item as any).divider) {
            return !collapsed ? (
              <div key={idx} className="pt-3 pb-1 px-2.5">
                <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider">{item.label}</p>
              </div>
            ) : <div key={idx} className="border-t border-white/10 my-2"></div>;
          }
          return (
            <NavLink
              key={item.to}
              to={item.to!}
              className={({ isActive }) =>
                `flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-[#FF6B35] text-white'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                } ${collapsed ? 'justify-center' : ''}`
              }
              title={collapsed ? item.label : undefined}
            >
              <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                <i className={`${item.icon} text-sm`}></i>
              </div>
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* User info */}
      <div className="border-t border-white/10 p-3">
        {!collapsed ? (
          <div className="flex items-center gap-2.5">
            {hubUser?.avatar_url ? (
              <img src={hubUser.avatar_url} alt={hubUser.full_name} className="w-8 h-8 rounded-full object-cover object-top flex-shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#FF6B35] flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">{hubUser?.full_name?.charAt(0).toUpperCase() || '?'}</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate">{hubUser?.full_name}</p>
              <p className="text-gray-500 text-xs truncate">{hubUser?.email}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="text-gray-500 hover:text-red-400 transition-colors cursor-pointer flex-shrink-0"
              title="Sign out"
            >
              <i className="ri-logout-box-r-line text-sm"></i>
            </button>
          </div>
        ) : (
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center text-gray-500 hover:text-red-400 transition-colors cursor-pointer py-1"
            title="Sign out"
          >
            <i className="ri-logout-box-r-line text-sm"></i>
          </button>
        )}
      </div>
    </aside>
  );
}