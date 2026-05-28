import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const navItems = [
  { to: '/hub/admin/dashboard', label: 'Dashboard', icon: 'ri-layout-grid-line' },
  { to: '/hub/admin/contractors', label: 'Contractors', icon: 'ri-team-line' },
  { to: '/hub/admin/attendance', label: 'Attendance', icon: 'ri-time-line' },
  { to: '/hub/admin/requests', label: 'Requests', icon: 'ri-inbox-line' },
  { to: '/hub/admin/timeoff', label: 'Time-Off', icon: 'ri-calendar-event-line' },
  { to: '/hub/admin/overtime', label: 'Overtime', icon: 'ri-timer-flash-line' },
  { to: '/hub/admin/performance', label: 'Performance', icon: 'ri-medal-line', devOnly: true },
  { divider: true, label: 'Finance' },
  { to: '/hub/admin/payroll', label: 'Payroll', icon: 'ri-bar-chart-2-line' },
  { to: '/hub/admin/projects', label: 'Projects', icon: 'ri-folder-line' },
  { to: '/hub/admin/invoice-log', label: 'Invoice Log', icon: 'ri-bill-line' },
  { to: '/hub/admin/docrequests', label: 'Doc Requests', icon: 'ri-file-list-3-line' },
  { to: '/hub/admin/documents', label: 'Contracts', icon: 'ri-pen-nib-line' },
  { divider: true, label: 'Content' },
  { to: '/hub/admin/sop', label: 'SOP Library', icon: 'ri-book-open-line' },
  { to: '/hub/admin/announcements', label: 'Announcements', icon: 'ri-megaphone-line' },
  { to: '/hub/admin/questionnaires', label: 'Questionnaires', icon: 'ri-questionnaire-line', devOnly: true },
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
  const visibleNavItems = navItems.filter((item) => !(item as { devOnly?: boolean }).devOnly || hubUser?.is_developer);

  const handleSignOut = async () => {
    await signOut();
    navigate('/hub/login');
  };

  return (
    <aside
      className={`h-screen px-4 py-5 bg-transparent flex flex-col transition-all duration-300 ease-in-out flex-shrink-0 ${
        collapsed ? 'w-[92px]' : 'w-[290px]'
      }`}
    >
      <div className="flex flex-col flex-1 min-h-0 rounded-[30px] bg-[#111827] overflow-hidden">

        {/* Logo */}
        <div className={`flex items-center gap-3 px-5 h-[74px] border-b border-white/8 ${collapsed ? 'justify-center px-0' : ''}`}>
          <div className="w-10 h-10 rounded-2xl bg-[#FF6B35] text-white flex items-center justify-center shadow-sm flex-shrink-0">
            <span className="text-sm font-black tracking-tight">S</span>
          </div>
          {!collapsed && (
            <>
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/40 font-semibold">Huna Ops</p>
                <p className="text-[20px] font-semibold text-white leading-none">Sentro</p>
              </div>
              <button
                onClick={onToggle}
                className="ml-auto w-9 h-9 rounded-full border border-white/10 text-white/40 hover:text-white cursor-pointer transition-colors"
              >
                <i className="ri-menu-fold-line text-sm"></i>
              </button>
            </>
          )}
        </div>

        {/* User card */}
        {!collapsed && hubUser && (
          <div className="px-4 pt-4">
            <div className="rounded-2xl border border-white/8 bg-white/5 px-3.5 py-3 flex items-center gap-3">
              {hubUser.avatar_url ? (
                <img src={hubUser.avatar_url} alt={hubUser.full_name} className="w-9 h-9 rounded-full object-cover object-top flex-shrink-0" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-[#FF6B35] flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-white">{hubUser.full_name.charAt(0)}</span>
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{hubUser.full_name}</p>
                <p className="text-xs text-white/40 capitalize truncate">{hubUser.role}</p>
              </div>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className={`flex-1 min-h-0 overflow-y-auto pt-4 pb-3 ${collapsed ? 'px-2' : 'px-3'}`}>
          {visibleNavItems.map((item, idx) => {
            if ((item as any).divider) {
              return !collapsed ? (
                <div key={idx} className="pt-4 pb-2 px-3">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-white/25">{item.label}</p>
                </div>
              ) : <div key={idx} className="mx-3 my-3 border-t border-white/8"></div>;
            }
            return (
              <NavLink
                key={item.to}
                to={item.to!}
                className={({ isActive }) =>
                  `group flex items-center gap-3 px-3 py-2.5 rounded-2xl text-[15px] transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-[#FF6B35]/15 text-[#FF6B35]'
                      : 'text-white/50 hover:bg-white/5 hover:text-white'
                  } ${collapsed ? 'justify-center px-2' : ''}`
                }
                title={collapsed ? item.label : undefined}
              >
                <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                  <i className={`${item.icon} text-[18px]`}></i>
                </div>
                {!collapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* Sign out */}
        <div className={`border-t border-white/8 p-3 ${collapsed ? 'px-2' : ''}`}>
          <button
            onClick={handleSignOut}
            className={`flex items-center gap-2.5 text-white/30 hover:text-red-400 transition-colors cursor-pointer w-full rounded-2xl px-3 py-2.5 hover:bg-white/5 ${collapsed ? 'justify-center px-0' : ''}`}
            title="Sign out"
          >
            <i className="ri-logout-box-r-line text-[18px] flex-shrink-0"></i>
            {!collapsed && <span className="text-sm">Sign out</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}
