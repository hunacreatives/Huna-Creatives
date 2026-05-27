import { ReactNode, useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
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
  const containerRef = useRef<HTMLDivElement>(null);

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
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const go = (result: SearchResult) => {
    navigate(result.path);
    setOpen(false);
    setQuery('');
    setResults([]);
  };

  const typeColors: Record<string, string> = {
    contractor: 'text-[#FF6B35]', project: 'text-teal-600', invoice: 'text-sky-600', request: 'text-violet-600',
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-1.5 w-52">
        <i className="ri-search-line text-gray-400 text-sm flex-shrink-0"></i>
        <input
          ref={inputRef}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={e => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, results.length - 1)); }
            if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
            if (e.key === 'Enter' && results[activeIdx]) go(results[activeIdx]);
            if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur(); }
          }}
          placeholder="Search…"
          className="bg-transparent text-sm text-gray-700 placeholder-gray-400 focus:outline-none w-full"
        />
        {query && (
          <button onClick={() => { setQuery(''); setResults([]); }} className="text-gray-400 hover:text-gray-600 cursor-pointer flex-shrink-0">
            <i className="ri-close-line text-sm"></i>
          </button>
        )}
        {!query && <kbd className="hidden sm:inline text-[10px] text-gray-400 bg-white border border-gray-200 rounded px-1 flex-shrink-0">⌘K</kbd>}
      </div>

      {open && query.length >= 2 && (
        <div className="absolute top-full right-0 mt-1.5 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <i className="ri-loader-4-line animate-spin text-gray-300"></i>
            </div>
          ) : results.length === 0 ? (
            <div className="px-4 py-5 text-center">
              <p className="text-sm text-gray-400">No results for "{query}"</p>
            </div>
          ) : (
            <div className="py-1.5">
              {results.map((r, i) => (
                <button
                  key={`${r.type}-${r.id}`}
                  onClick={() => go(r)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors cursor-pointer ${i === activeIdx ? 'bg-gray-50' : 'hover:bg-gray-50'}`}
                >
                  <div className={`w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0`}>
                    <i className={`${r.icon} text-sm ${typeColors[r.type]}`}></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{r.title}</p>
                    <p className="text-xs text-gray-400 truncate capitalize">{r.subtitle}</p>
                  </div>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 flex-shrink-0 capitalize`}>{r.type}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
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
            <GlobalSearch />
            <NotificationBell />
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
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
      <DevToolbar />
    </div>
  );
}
