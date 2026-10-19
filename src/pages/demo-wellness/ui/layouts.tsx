// Shells for the two halves of the demo: the guest website and the studio admin.

import { ReactNode, useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { BRAND, PHOTO_CREDITS, locations, staff } from '../lib/data';
import { to, useDemo } from '../lib/demo';
import { Avatar, Icon, btnClass, cx } from './kit';

function Orbs({ dim }: { dim?: boolean }) {
  return <div className={cx('orbs', dim && 'dim')} aria-hidden="true"><div className="orb orb-1" /><div className="orb orb-2" /><div className="orb orb-3" /></div>;
}

export function Wordmark({ small }: { small?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg width={small ? 22 : 26} height={small ? 22 : 26} viewBox="0 0 32 32" aria-hidden="true">
        <circle cx="16" cy="16" r="15" fill="none" stroke="var(--teal)" strokeWidth="1.6" />
        <path d="M5 19c3.5-2.6 7.3-2.6 11 0s7.5 2.6 11 0" fill="none" stroke="var(--teal)" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="16" cy="11.5" r="3.4" fill="var(--orange)" />
      </svg>
      <span className={cx('serif font-medium tracking-tight', small ? 'text-[17px]' : 'text-[19px]')}>{BRAND.name}</span>
    </span>
  );
}

function Toasts() {
  const { toasts } = useDemo();
  return (
    <div className="fixed z-[80] left-1/2 -translate-x-1/2 bottom-24 md:bottom-8 flex flex-col items-center gap-2 pointer-events-none w-[calc(100%-32px)] max-w-[420px]">
      {toasts.map((t) => (
        <div key={t.id} role="status" className="rise pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-2xl text-[14px] text-white shadow-[0_12px_32px_rgba(20,28,32,0.28)]"
          style={{ background: t.tone === 'warn' ? '#7a4a12' : '#1f2b31' }}>
          <Icon name={t.tone === 'warn' ? 'ri-information-line' : 'ri-check-line'} className="text-[17px] text-[#9fd6cf]" />{t.text}
        </div>
      ))}
    </div>
  );
}

/** Floating switch between the guest site and the admin, plus the sample-data note. */
function DemoSwitch({ admin }: { admin?: boolean }) {
  return (
    <div className="fixed z-[70] bottom-4 right-4 md:bottom-5 md:right-5">
      <div className="glass-strong rounded-full p-1 flex items-center gap-1 text-[13px] font-medium shadow-[var(--shadow-lg)]">
        <span className="hidden sm:inline px-2.5 text-[var(--ink-3)] font-normal">Demo · sample data</span>
        <Link to={to()} className={cx('h-8 px-3 rounded-full inline-flex items-center gap-1.5', !admin ? 'bg-[var(--ink)] text-white' : 'text-[var(--ink-2)] hover:bg-black/5')}>
          <Icon name="ri-global-line" />Website
        </Link>
        <Link to={to('/admin')} className={cx('h-8 px-3 rounded-full inline-flex items-center gap-1.5', admin ? 'bg-[var(--ink)] text-white' : 'text-[var(--ink-2)] hover:bg-black/5')}>
          <Icon name="ri-dashboard-line" />Studio admin
        </Link>
      </div>
    </div>
  );
}

const SITE_NAV = [
  { to: '/schedule', label: 'Schedule' },
  { to: '/passes', label: 'Passes' },
  { to: '/retreats', label: 'Retreats' },
  { to: '/online', label: 'Online' },
];

export function SiteLayout({ children }: { children: ReactNode }) {
  const [menu, setMenu] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => setMenu(false), [pathname]);
  return (
    <div className="relative min-h-screen">
      <Orbs />
      <header className="sticky top-0 z-50 px-3 md:px-6 pt-3">
        <nav className="glass rounded-full max-w-[1200px] mx-auto h-14 pl-4 pr-2 flex items-center gap-2" aria-label="Main">
          <Link to={to()} className="mr-auto md:mr-6" aria-label={`${BRAND.name} home`}><Wordmark /></Link>
          <div className="hidden md:flex items-center gap-1 mr-auto">
            {SITE_NAV.map((n) => (
              <NavLink key={n.to} to={to(n.to)}
                className={({ isActive }) => cx('h-9 px-3.5 rounded-full inline-flex items-center text-[14.5px] transition-colors',
                  isActive ? 'bg-white/80 text-[var(--ink)] font-medium' : 'text-[var(--ink-2)] hover:text-[var(--ink)]')}>
                {n.label}
              </NavLink>
            ))}
          </div>
          <NavLink to={to('/account')} aria-label="Your account"
            className={({ isActive }) => cx('w-10 h-10 rounded-full inline-flex items-center justify-center transition-colors', isActive ? 'bg-white/80' : 'hover:bg-white/60')}>
            <Icon name="ri-user-3-line" className="text-[19px]" />
          </NavLink>
          <Link to={to('/schedule')} className={cx(btnClass('primary', 'sm'), 'hidden sm:inline-flex')}>Book a class</Link>
          <button type="button" className="md:hidden w-10 h-10 rounded-full inline-flex items-center justify-center hover:bg-white/60" aria-label="Menu" onClick={() => setMenu(true)}>
            <Icon name="ri-menu-line" className="text-[20px]" />
          </button>
        </nav>
      </header>

      {menu && (
        <>
          <div className="scrim" onClick={() => setMenu(false)} />
          <div className="fixed z-[73] top-3 left-3 right-3 glass-strong rounded-3xl p-3 rise" style={{ background: 'rgba(255,255,255,0.94)' }}>
            <div className="flex items-center justify-between pl-2 pb-2"><Wordmark small />
              <button type="button" className="w-10 h-10 rounded-full inline-flex items-center justify-center" aria-label="Close menu" onClick={() => setMenu(false)}><Icon name="ri-close-line" className="text-[20px]" /></button>
            </div>
            {[{ to: '', label: 'Home' }, ...SITE_NAV, { to: '/account', label: 'Your bookings' }].map((n) => (
              <Link key={n.to} to={to(n.to)} className="flex items-center justify-between h-12 px-3 rounded-2xl text-[16px] hover:bg-black/5">
                {n.label}<Icon name="ri-arrow-right-s-line" className="text-[var(--ink-3)]" />
              </Link>
            ))}
            <Link to={to('/schedule')} className={cx(btnClass('primary', 'lg', true), 'mt-2')}>Book a class</Link>
          </div>
        </>
      )}

      {/* No z-index here: a stacking context would trap sheets under the sticky nav. */}
      <main className="relative">{children}</main>

      <footer className="relative z-10 mt-20 border-t border-[var(--line)] bg-white/50">
        <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-12 grid gap-10 md:grid-cols-[1.3fr_1fr_1fr_1fr]">
          <div>
            <Wordmark />
            <p className="text-[14px] text-[var(--ink-2)] mt-3 max-w-[34ch]">Yoga on the beach and in town. Classes daily, retreats through the year, and online wherever you are.</p>
          </div>
          {locations.map((l) => (
            <div key={l.id} className="text-[14px]">
              <div className="font-medium mb-2">{l.name}</div>
              <p className="text-[var(--ink-2)]">{l.address}</p>
              <a href={l.mapUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 mt-2 text-[var(--teal)] font-medium">Directions <Icon name="ri-arrow-right-up-line" /></a>
            </div>
          ))}
          <div className="text-[14px] text-[var(--ink-2)] space-y-1.5">
            <div className="font-medium text-[var(--ink)] mb-2">Contact</div>
            <div>{BRAND.email}</div>
            <div>WhatsApp {BRAND.whatsapp}</div>
            <div>Instagram {BRAND.instagram}</div>
          </div>
        </div>
        <div className="max-w-[1200px] mx-auto px-4 md:px-6 pb-24 md:pb-10 text-[12px] text-[var(--ink-3)] space-y-1">
          <p>{BRAND.full} is a sample studio. This is a demo of the Huna Creatives booking platform for studios; prices, people and bookings are made up.</p>
          <p>{PHOTO_CREDITS}</p>
        </div>
      </footer>
      <DemoSwitch />
      <Toasts />
    </div>
  );
}

const ADMIN_NAV = [
  { to: '/admin', label: 'Today', icon: 'ri-home-5-line', end: true },
  { to: '/admin/schedule', label: 'Schedule', icon: 'ri-calendar-2-line' },
  { to: '/admin/clients', label: 'Clients', icon: 'ri-group-line' },
  { to: '/admin/retreats', label: 'Retreats', icon: 'ri-sun-line' },
  { to: '/admin/library', label: 'Online', icon: 'ri-play-circle-line' },
  { to: '/admin/products', label: 'Passes & promos', icon: 'ri-coupon-3-line' },
  { to: '/admin/sales', label: 'Sales', icon: 'ri-bank-card-line' },
  { to: '/admin/reports', label: 'Reports', icon: 'ri-bar-chart-2-line' },
  { to: '/admin/staff', label: 'Staff & settings', icon: 'ri-settings-3-line' },
];

/** Location switcher shared by admin pages (All / Seaside / Downtown). */
export function LocationSwitch() {
  const { adminLoc, setAdminLoc } = useDemo();
  const opts = [{ v: 'all' as const, l: 'All locations' }, ...locations.map((l) => ({ v: l.id, l: l.name }))];
  return (
    <div className="inline-flex p-1 rounded-full bg-[rgba(36,48,55,0.06)] gap-1">
      {opts.map((o) => (
        <button key={o.v} type="button" onClick={() => setAdminLoc(o.v)} aria-pressed={adminLoc === o.v}
          className={cx('h-8 px-3 rounded-full text-[13px] font-medium whitespace-nowrap transition-all',
            adminLoc === o.v ? 'bg-white text-[var(--ink)] shadow-[0_1px_3px_rgba(36,48,55,0.12)]' : 'text-[var(--ink-2)] hover:text-[var(--ink)]')}>
          {o.l}
        </button>
      ))}
    </div>
  );
}

export function AdminLayout({ children }: { children: ReactNode }) {
  const owner = staff[0];
  const { toast } = useDemo();
  return (
    <div className="relative min-h-screen">
      <Orbs dim />
      {/* Sidebar (desktop) */}
      <aside className="hidden lg:flex fixed z-40 top-3 bottom-3 left-3 w-[232px] glass rounded-[24px] flex-col p-3">
        <Link to={to('/admin')} className="px-2.5 pt-1.5 pb-4"><Wordmark small /></Link>
        <nav className="flex-1 space-y-0.5" aria-label="Admin">
          {ADMIN_NAV.map((n) => (
            <NavLink key={n.to} to={to(n.to)} end={n.end}
              className={({ isActive }) => cx('flex items-center gap-2.5 h-10 px-3 rounded-xl text-[14px] transition-colors',
                isActive ? 'bg-white text-[var(--ink)] font-medium shadow-[0_1px_3px_rgba(36,48,55,0.08)]' : 'text-[var(--ink-2)] hover:bg-white/50 hover:text-[var(--ink)]')}>
              {({ isActive }) => <><Icon name={n.icon} className={cx('text-[17px]', isActive && 'text-[var(--teal)]')} />{n.label}</>}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-2.5 p-2 rounded-xl">
          <Avatar name={owner.name} size={32} color="#075056" />
          <div className="min-w-0 text-[13px] leading-tight">
            <div className="font-medium truncate">{owner.name}</div>
            <div className="text-[var(--ink-3)]">Owner</div>
          </div>
        </div>
      </aside>

      {/* Top bar */}
      <div className="lg:pl-[248px] relative">
        <header className="sticky top-0 z-30 px-3 lg:pl-0 pt-3">
          <div className="glass rounded-full h-14 pl-4 pr-2 flex items-center gap-2">
            <Link to={to('/admin')} className="lg:hidden mr-1"><Wordmark small /></Link>
            <button type="button" onClick={() => toast('Search finds clients, classes and orders — try ⌘K in the real build', 'info')}
              className="hidden md:flex items-center gap-2 h-9 px-3.5 rounded-full bg-white/70 border border-[var(--line)] text-[13.5px] text-[var(--ink-3)] w-[300px] hover:border-[var(--line-2)]">
              <Icon name="ri-search-line" />Search clients, classes, orders<span className="ml-auto text-[11.5px] border border-[var(--line-2)] rounded-md px-1.5 py-0.5">⌘K</span>
            </button>
            <div className="ml-auto flex items-center gap-1.5">
              <Link to={to()} className={btnClass('ghost', 'sm')}><Icon name="ri-external-link-line" /><span className="hidden sm:inline">View website</span></Link>
              <button type="button" aria-label="Notifications" onClick={() => toast('3 things need attention — see Today', 'info')}
                className="relative w-10 h-10 rounded-full inline-flex items-center justify-center hover:bg-white/60">
                <Icon name="ri-notification-3-line" className="text-[19px]" /><span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[var(--orange)]" />
              </button>
            </div>
          </div>
          {/* Mobile nav rail */}
          <nav className="lg:hidden mt-2 flex gap-1.5 overflow-x-auto no-bar pb-1" aria-label="Admin">
            {ADMIN_NAV.map((n) => (
              <NavLink key={n.to} to={to(n.to)} end={n.end}
                className={({ isActive }) => cx('flex-shrink-0 inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-[13px] font-medium border',
                  isActive ? 'bg-[var(--ink)] text-white border-[var(--ink)]' : 'bg-white/75 text-[var(--ink-2)] border-[var(--line)]')}>
                <Icon name={n.icon} />{n.label}
              </NavLink>
            ))}
          </nav>
        </header>
        <main className="px-3 lg:pl-0 lg:pr-6 pt-6 pb-28 max-w-[1240px]">{children}</main>
      </div>
      <DemoSwitch admin />
      <Toasts />
    </div>
  );
}

/** Content width on the guest site. */
export const Wrap = ({ children, className = '' }: { children: ReactNode; className?: string }) =>
  <div className={cx('max-w-[1200px] mx-auto px-4 md:px-6', className)}>{children}</div>;
