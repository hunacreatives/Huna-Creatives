import { ReactNode, useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useDemo } from '@/contexts/DemoContext';
import { supabase } from '@/lib/supabase';
import AdminSidebar from './AdminSidebar';
import NotificationBell from './NotificationBell';
import DevToolbar from './DevToolbar';

interface Props {
  children: ReactNode;
  title?: string;
  actions?: ReactNode;
}

interface SearchResult {
  type: 'contractor' | 'project' | 'invoice' | 'request';
  id: string | number;
  title: string;
  subtitle: string;
  path: string;
  icon: string;
}

function GlobalSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); return; }
    setLoading(true);
    const like = `%${q}%`;
    const [cRes, pRes, iRes, rRes] = await Promise.all([
      supabase.from('hub_users').select('id, full_name, department, role').ilike('full_name', like).eq('status', 'active').limit(4),
      supabase.from('hub_projects').select('id, project_name, client_name, status').or(`project_name.ilike.${like},client_name.ilike.${like}`).limit(4),
      supabase.from('hub_invoice_log').select('id, invoice_number, client_name, project_name').or(`invoice_number.ilike.${like},client_name.ilike.${like}`).limit(3),
      supabase.from('hub_requests').select('id, title, type, status').ilike('title', like).limit(3),
    ]);

    const out: SearchResult[] = [];
    for (const c of (cRes.data || [])) {
      out.push({ type: 'contractor', id: c.id, title: c.full_name, subtitle: c.department || c.role, path: `/hub/admin/contractors/${c.id}`, icon: 'ri-user-line' });
    }
    for (const p of (pRes.data || [])) {
      out.push({ type: 'project', id: p.id, title: p.project_name, subtitle: p.client_name, path: '/hub/admin/projects', icon: 'ri-folder-line' });
    }
    for (const inv of (iRes.data || [])) {
      out.push({ type: 'invoice', id: inv.id, title: `Invoice #${inv.invoice_number}`, subtitle: inv.client_name, path: '/hub/admin/invoice-log', icon: 'ri-bill-line' });
    }
    for (const r of (rRes.data || [])) {
      out.push({ type: 'request', id: r.id, title: r.title, subtitle: r.type, path: '/hub/admin/requests', icon: 'ri-inbox-line' });
    }
    setResults(out);
    setActiveIdx(0);
    setLoading(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(query), 200);
    return () => clearTimeout(t);
  }, [query, search]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 10);
    return () => clearTimeout(t);
  }, [open]);

  const go = (result: SearchResult) => {
    navigate(result.path);
    setOpen(false);
    setQuery('');
    setResults([]);
  };

  const typeColors: Record<string, string> = {
    contractor: 'text-[#FF6B35]', project: 'text-teal-600', invoice: 'text-sky-600', request: 'text-violet-600',
  };
  const quickActions = [
    { label: 'Dashboard page', path: '/hub/admin/dashboard', icon: 'ri-home-5-line' },
    { label: 'Projects page', path: '/hub/admin/projects', icon: 'ri-folder-line' },
    { label: 'Payroll page', path: '/hub/admin/payroll', icon: 'ri-bank-card-line' },
    { label: 'Contractors page', path: '/hub/admin/contractors', icon: 'ri-team-line' },
    { label: 'Attendance page', path: '/hub/admin/attendance', icon: 'ri-time-line' },
    { label: 'Schedule invoice', path: '/hub/admin/invoice-log', icon: 'ri-calendar-schedule-line' },
  ];
  const activeFilter = query.length >= 2 ? 'Results' : 'All';

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-3 min-w-[260px] rounded-2xl border border-[#e5e7eb] bg-white px-4 py-2.5 text-left shadow-[0_10px_30px_rgba(15,23,42,0.04)] transition-colors hover:bg-white"
      >
        <i className="ri-search-line text-[#9ca3af] text-base flex-shrink-0"></i>
        <span className="flex-1 text-sm text-[#6b7280] truncate">Search projects, people, or type a command...</span>
        <kbd className="hidden sm:inline text-[10px] text-[#6b7280] bg-[#f9fafb] border border-[#e5e7eb] rounded-lg px-1.5 py-0.5 flex-shrink-0">⌘ K</kbd>
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] bg-[rgba(34,25,16,0.22)] backdrop-blur-[2px] p-4 md:p-8" onClick={() => setOpen(false)}>
          <div className="mx-auto mt-[6vh] w-full max-w-4xl rounded-[32px] border border-[#e5e7eb] bg-white shadow-[0_40px_120px_rgba(15,23,42,0.16)] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="border-b border-[#e5e7eb] px-6 pt-5 pb-4">
              <div className="flex items-center gap-3 rounded-[22px] border border-[#e5e7eb] bg-white px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                <i className="ri-search-line text-[#9ca3af] text-xl flex-shrink-0"></i>
                <input
                  ref={inputRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, Math.max(results.length - 1, 0))); }
                    if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
                    if (e.key === 'Enter' && results[activeIdx]) go(results[activeIdx]);
                    if (e.key === 'Escape') setOpen(false);
                  }}
                  placeholder="Search meetings, people, or type a command..."
                  className="w-full bg-transparent text-[17px] text-[#111827] placeholder:text-[#9ca3af] focus:outline-none"
                />
                {query ? (
                  <button onClick={() => { setQuery(''); setResults([]); }} className="text-[#9ca3af] hover:text-[#4b5563] cursor-pointer">
                    <i className="ri-close-line text-lg"></i>
                  </button>
                ) : (
                  <kbd className="text-[11px] text-[#6b7280] bg-[#f9fafb] border border-[#e5e7eb] rounded-xl px-2 py-1">⌘ K</kbd>
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {['All', 'Training', 'Interview', 'Design task', 'Review', 'Onboarding', activeFilter].filter((value, idx, arr) => arr.indexOf(value) === idx).map(label => (
                  <button
                    key={label}
                    type="button"
                    className={`rounded-2xl border px-3.5 py-1.5 text-sm transition-colors ${label === activeFilter ? 'border-[#e9e2fb] bg-[#ede8ff] text-[#6e59cf]' : 'border-[#e5e7eb] bg-white text-[#4b5563]'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-0 lg:grid-cols-[1.45fr_0.95fr]">
              <div className="border-b lg:border-b-0 lg:border-r border-[#e5e7eb]">
                <div className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[15px] font-semibold text-[#374151]">{query.length >= 2 ? `Search results (${results.length})` : 'Recent surfaces'}</p>
                    <div className="flex items-center gap-2 text-[#9ca3af]">
                      <button className="w-8 h-8 rounded-xl border border-[#e5e7eb] bg-white"><i className="ri-arrow-left-s-line"></i></button>
                      <button className="w-8 h-8 rounded-xl border border-[#e5e7eb] bg-white"><i className="ri-arrow-right-s-line"></i></button>
                    </div>
                  </div>
                </div>

                {query.length >= 2 ? (
                  <div className="px-4 pb-4">
                    {loading ? (
                      <div className="flex items-center justify-center py-12">
                        <i className="ri-loader-4-line animate-spin text-2xl text-[#cbd5e1]"></i>
                      </div>
                    ) : results.length === 0 ? (
                      <div className="rounded-[24px] border border-dashed border-[#e5e7eb] bg-[#fcfcfd] px-5 py-12 text-center">
                        <p className="text-sm text-[#6b7280]">No results for "{query}"</p>
                      </div>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {results.map((r, i) => (
                          <button
                            key={`${r.type}-${r.id}`}
                            onClick={() => go(r)}
                            className={`rounded-[24px] border px-4 py-4 text-left bg-white transition-all shadow-[0_10px_30px_rgba(15,23,42,0.04)] ${i === activeIdx ? 'border-[#ddd4ff] ring-2 ring-[#ede8ff]' : 'border-[#e5e7eb] hover:border-[#ddd4ff]'}`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="w-11 h-11 rounded-2xl bg-[#f3f4f6] flex items-center justify-center flex-shrink-0">
                                <i className={`${r.icon} text-lg ${typeColors[r.type]}`}></i>
                              </div>
                              <span className="rounded-full bg-[#f3f4f6] px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-[#6b7280]">{r.type}</span>
                            </div>
                            <p className="mt-5 text-[17px] font-semibold leading-tight text-[#201c18]">{r.title}</p>
                            <p className="mt-1 text-sm text-[#6b7280]">{r.subtitle}</p>
                            <div className="mt-4 inline-flex items-center gap-1 rounded-full bg-[#f9fafb] px-2.5 py-1 text-xs text-[#6b7280]">
                              Open
                              <i className="ri-arrow-right-up-line"></i>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="px-4 pb-4">
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      {[
                        { name: 'Projects', meta: 'Project browser', icon: 'ri-folder-line', tone: 'bg-[#f3f4f6]', text: 'text-[#201c18]' },
                        { name: 'Team', meta: 'Contractors', icon: 'ri-team-line', tone: 'bg-[#eef5ff]', text: 'text-[#2d5fa7]' },
                        { name: 'Payroll', meta: 'Payments', icon: 'ri-bank-card-line', tone: 'bg-[#eff8ef]', text: 'text-[#2f7a4c]' },
                        { name: 'Attendance', meta: 'Daily sync', icon: 'ri-time-line', tone: 'bg-[#fff3ea]', text: 'text-[#d1673d]' },
                      ].map(card => (
                        <div key={card.name} className="rounded-[24px] border border-[#e5e7eb] bg-white px-4 py-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
                          <div className={`w-12 h-12 rounded-2xl ${card.tone} ${card.text} flex items-center justify-center`}>
                            <i className={`${card.icon} text-xl`}></i>
                          </div>
                          <p className="mt-6 text-[17px] font-semibold text-[#201c18]">{card.name}</p>
                          <p className="mt-1 text-sm text-[#6b7280]">{card.meta}</p>
                          <button
                            onClick={() => navigate(card.name === 'Projects' ? '/hub/admin/projects' : card.name === 'Team' ? '/hub/admin/contractors' : card.name === 'Payroll' ? '/hub/admin/payroll' : '/hub/admin/attendance')}
                            className="mt-4 w-full rounded-2xl border border-[#e5e7eb] bg-[#f9fafb] px-3 py-2 text-sm text-[#374151] hover:bg-white cursor-pointer"
                          >
                            Detail
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="px-6 py-5">
                <p className="text-[15px] font-semibold text-[#374151]">Quick actions ({quickActions.length})</p>
                <div className="mt-4 space-y-1">
                  {quickActions.map(action => (
                    <button
                      key={action.label}
                      onClick={() => { navigate(action.path); setOpen(false); }}
                      className="group flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-[#374151] hover:bg-[#f9fafb] transition-colors"
                    >
                      <div className="w-9 h-9 rounded-xl border border-[#e5e7eb] bg-white flex items-center justify-center text-[#9ca3af]">
                        <i className={`${action.icon} text-base`}></i>
                      </div>
                      <span className="flex-1 text-[15px]">{action.label}</span>
                      <div className="w-8 h-8 rounded-xl border border-transparent bg-transparent text-[#9ca3af] flex items-center justify-center group-hover:border-[#e5e7eb] group-hover:bg-white">
                        <i className="ri-arrow-right-s-line"></i>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="mt-8 rounded-[24px] border border-dashed border-[#e5e7eb] bg-[#fcfcfd] px-4 py-4">
                  <div className="flex items-center justify-between text-sm text-[#6b7280]">
                    <span>Use</span>
                    <span className="inline-flex items-center gap-1">
                      <kbd className="rounded-lg border border-[#e5e7eb] bg-white px-2 py-0.5 text-[11px]">↑</kbd>
                      <kbd className="rounded-lg border border-[#e5e7eb] bg-white px-2 py-0.5 text-[11px]">↓</kbd>
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm text-[#6b7280]">
                    <span>to navigate</span>
                    <span className="inline-flex items-center gap-1">
                      Type
                      <kbd className="rounded-lg border border-[#e5e7eb] bg-white px-2 py-0.5 text-[11px]">/</kbd>
                      for commands
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function AdminLayout({ children, title, actions }: Props) {
  const { hubUser, loading, session } = useAuth();
  const { isDemo, demoRole, demoSignOut, setDemoRole } = useDemo();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebar-collapsed') === 'true');
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleCollapsed = () => setCollapsed(prev => {
    const next = !prev;
    localStorage.setItem('sidebar-collapsed', String(next));
    return next;
  });

  useEffect(() => {
    if (!isDemo && !loading && !session) {
      navigate('/hub/login', { replace: true });
    }
  }, [loading, session, isDemo]);

  if (!isDemo && (loading || !hubUser)) return (
    <div className="flex h-screen items-center justify-center bg-white">
      <i className="ri-loader-4-line animate-spin text-2xl text-[#cbd5e1]"></i>
    </div>
  );

  return (
    <div className={`relative flex ${isDemo ? 'h-screen pt-8' : 'h-screen'} overflow-hidden bg-[#f0f2f5]`}>
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
        <AdminSidebar collapsed={collapsed} onToggle={() => toggleCollapsed()} />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="w-[260px] flex-shrink-0">
            <AdminSidebar collapsed={false} onToggle={() => setMobileOpen(false)} />
          </div>
          <div className="flex-1 bg-black/20 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      {/* Main content */}
      <div className="relative z-10 flex-1 min-w-0 overflow-hidden lg:px-4 lg:pb-4 lg:pt-5 md:px-5 md:pb-5">
        <div className="flex h-full flex-col lg:rounded-[34px] lg:border lg:border-white/70 bg-white overflow-hidden lg:shadow-xl lg:shadow-indigo-100/50">
        {/* Top bar */}
        <header className="border-b border-gray-100/80 px-4 md:px-6 h-[78px] flex items-center gap-4 flex-shrink-0 bg-white/90 backdrop-blur-sm">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden w-10 h-10 rounded-2xl border border-gray-100 bg-white text-gray-500 hover:text-gray-900 cursor-pointer"
          >
            <i className="ri-menu-line text-lg"></i>
          </button>
          <div className="flex-1 min-w-0">
            {title && (
              <h1 className="text-gray-900 font-semibold text-[28px] leading-tight truncate">{title}</h1>
            )}
          </div>
          <div className="flex items-center gap-3 min-w-0">
            {actions}
            <GlobalSearch />
            <NotificationBell />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto overscroll-none p-4 md:p-6 bg-gradient-to-br from-sky-50 via-indigo-50/60 to-white">
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
