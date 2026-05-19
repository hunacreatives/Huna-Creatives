import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const navItems = [
  { to: '/hub/contractor/dashboard', label: 'Dashboard', icon: 'ri-layout-grid-line' },
  { to: '/hub/contractor/attendance', label: 'My Attendance', icon: 'ri-time-line' },
  { to: '/hub/contractor/requests', label: 'Requests', icon: 'ri-inbox-line' },
  { to: '/hub/contractor/timeoff', label: 'Time-Off', icon: 'ri-calendar-event-line' },
  { divider: true, label: 'Finance & Docs' },
  { to: '/hub/contractor/payouts', label: 'My Payouts', icon: 'ri-money-dollar-circle-line' },
  { to: '/hub/contractor/documents', label: 'Documents', icon: 'ri-file-list-3-line' },
  { divider: true, label: 'Resources' },
  { to: '/hub/contractor/sop', label: 'SOP Library', icon: 'ri-book-open-line' },
  { to: '/hub/contractor/announcements', label: 'Announcements', icon: 'ri-megaphone-line' },
  { to: '/hub/contractor/profile', label: 'My Profile', icon: 'ri-user-line' },
];

interface Props {
  collapsed: boolean;
  onToggle: () => void;
}

export default function ContractorSidebar({ collapsed, onToggle }: Props) {
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
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
        <div className="w-7 h-7 bg-[#FF6B35] rounded-lg flex items-center justify-center flex-shrink-0">
          <i className="ri-briefcase-4-fill text-white text-xs"></i>
        </div>
        {!collapsed && (
          <span className="text-white font-semibold text-sm tracking-tight whitespace-nowrap overflow-hidden">
            Contractor Hub
          </span>
        )}
        <button
          onClick={onToggle}
          className={`ml-auto text-gray-400 hover:text-white transition-colors cursor-pointer ${collapsed ? 'mx-auto' : ''}`}
        >
          <i className={`text-sm ${collapsed ? 'ri-menu-unfold-line' : 'ri-menu-fold-line'}`}></i>
        </button>
      </div>

      {!collapsed && (
        <div className="px-4 py-2">
          <span className="text-xs text-emerald-400 font-medium bg-emerald-400/10 px-2 py-0.5 rounded-full whitespace-nowrap">
            Contractor
          </span>
        </div>
      )}

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
              <p className="text-gray-500 text-xs truncate">{hubUser?.department}</p>
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