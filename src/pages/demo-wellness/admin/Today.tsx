// Studio admin — Today. KPIs, today's classes, things that need a decision,
// six months of revenue and the activity feed. Studio time only.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CLASS, LOC, MEMBER, TEACHER, TODAY_KEY, activity, bookedCount, members, orders, retreatBookings,
  revenueByMonth, rosterFor, sessions, waitlistCount, wallets,
} from '../lib/data';
import { BRAND } from '../lib/data';
import { addDays, ago, dayLabel, peso, studioDateKey, studioTime } from '../lib/format';
import { to, useDemo } from '../lib/demo';
import type { Session } from '../lib/types';
import { Badge, Button, ButtonLink, FillBar, Icon, PageTitle, Panel, SectionTitle, Stat, cx } from '../ui/kit';
import { LocationSwitch } from '../ui/layouts';

type Loc = 'all' | 'beach' | 'town';

const inLoc = (s: Session, loc: Loc) => loc === 'all' || s.locationId === loc;
const sessionsOn = (key: string, loc: Loc) =>
  sessions.filter((s) => studioDateKey(s.start) === key && inLoc(s, loc)).sort((a, b) => a.start.localeCompare(b.start));

/** Active members by home base. Sample figures for a studio this size. */
const ACTIVE_MEMBERS = { beach: { now: 186, added: 14 }, town: { now: 94, added: 9 }, online: { now: 52, added: 6 } };

const SERIES = [
  { key: 'beach' as const, label: 'Seaside', color: '#075056' },
  { key: 'town' as const, label: 'Downtown', color: '#5e9aa3' },
  { key: 'online' as const, label: 'Online', color: '#ef6323' },
];

const pctChange = (a: number, b: number) => (b ? Math.round(((a - b) / b) * 100) : 0);

function greeting() {
  const h = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', hour: 'numeric', hourCycle: 'h23' }).format(new Date()));
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export default function AdminToday() {
  const { adminLoc } = useDemo();
  const loc = adminLoc as Loc;
  const now = new Date().toISOString();

  const today = useMemo(() => sessionsOn(TODAY_KEY, loc), [loc]);
  const lastWeek = useMemo(() => sessionsOn(addDays(TODAY_KEY, -7), loc), [loc]);

  // KPIs
  const live = (list: Session[]) => list.filter((s) => s.status === 'scheduled');
  const bookings = live(today).reduce((n, s) => n + bookedCount(s), 0);
  const bookingsLw = live(lastWeek).reduce((n, s) => n + bookedCount(s), 0);
  const occ = (list: Session[]) => {
    const studio = live(list).filter((s) => s.locationId !== null);
    const cap = studio.reduce((n, s) => n + s.capacity, 0);
    return cap ? studio.reduce((n, s) => n + bookedCount(s), 0) / cap : 0;
  };
  const occToday = occ(today);
  const occLw = occ(lastWeek);
  const monthRev = (i: number) => {
    const r = revenueByMonth[i];
    return loc === 'all' ? r.beach + r.town + r.online : r[loc];
  };
  const revNow = monthRev(revenueByMonth.length - 1);
  const revPrev = monthRev(revenueByMonth.length - 2);
  const am = loc === 'all'
    ? Object.values(ACTIVE_MEMBERS).reduce((a, b) => ({ now: a.now + b.now, added: a.added + b.added }), { now: 0, added: 0 })
    : ACTIVE_MEMBERS[loc];
  const lwDay = dayLabel(addDays(TODAY_KEY, -7), { weekday: 'long' }).split(' ')[0];
  const prevMonth = revenueByMonth[revenueByMonth.length - 2].month;

  return (
    <div className="text-[14px]">
      <PageTitle admin
        title={<>{greeting()}, {BRAND.owner}<span className="text-[var(--ink-3)] font-normal"> · {dayLabel(TODAY_KEY, { weekday: 'long', month: 'long' })}</span></>}
        actions={<LocationSwitch />} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Stat label="Bookings today" icon="ri-calendar-check-line" value={bookings}
          trend={{ value: `${Math.abs(pctChange(bookings, bookingsLw))}%`, up: bookings >= bookingsLw }} hint={`vs last ${lwDay}`} />
        <Stat label="Occupancy today" icon="ri-donut-chart-line" value={`${Math.round(occToday * 100)}%`}
          trend={{ value: `${Math.abs(Math.round((occToday - occLw) * 100))} pts`, up: occToday >= occLw }} hint="studio classes" />
        <Stat label="Revenue this month" icon="ri-money-dollar-circle-line" value={peso(revNow)}
          trend={{ value: `${Math.abs(pctChange(revNow, revPrev))}%`, up: revNow >= revPrev }} hint={`vs ${prevMonth}`} />
        <Stat label="Active members" icon="ri-group-line" value={am.now}
          trend={{ value: `${am.added}`, up: true }} hint="joined this month" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.45fr_1fr] mt-4 [&>*]:min-w-0">
        <TodaysClasses list={today} now={now} />
        <NeedsAttention loc={loc} today={today} now={now} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.45fr_1fr] mt-4 [&>*]:min-w-0">
        <Panel>
          <SectionTitle>Revenue, last 6 months</SectionTitle>
          <RevenueChart series={SERIES.filter((s) => loc === 'all' || s.key === loc)} />
        </Panel>
        <Panel>
          <SectionTitle>Recent activity</SectionTitle>
          <ul className="space-y-1">
            {activity.map((a) => (
              <li key={a.id} className="flex items-start gap-3 py-2">
                <span className="w-8 h-8 rounded-full bg-[var(--teal-soft)] text-[var(--teal)] flex items-center justify-center flex-shrink-0">
                  <Icon name={a.icon} className="text-[16px]" />
                </span>
                <div className="min-w-0 flex-1 pt-1.5 leading-snug">{a.text}</div>
                <span className="num text-[12.5px] text-[var(--ink-3)] pt-1.5 whitespace-nowrap">{ago(a.at)}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

/* ---------- Today's classes ---------- */

function TodaysClasses({ list, now }: { list: Session[]; now: string }) {
  return (
    <Panel pad={false}>
      <div className="px-5 md:px-6 pt-5"><SectionTitle action={<Link to={to('/admin/schedule')} className="text-[13.5px] font-medium text-[var(--teal)]">Full schedule</Link>}>Today's classes</SectionTitle></div>
      {list.length === 0 && <div className="px-6 pb-6 text-[var(--ink-2)]">No classes today at this location.</div>}
      <ul className="divide-y divide-[var(--line)] border-t border-[var(--line)]">
        {list.map((s) => {
          const c = CLASS[s.classTypeId];
          const end = new Date(new Date(s.start).getTime() + c.duration * 60000).toISOString();
          const done = end < now;
          const running = !done && s.start <= now;
          const cancelled = s.status === 'cancelled';
          const wl = waitlistCount(s);
          const place = s.locationId ? `${LOC[s.locationId].name} · ${LOC[s.locationId].rooms.find((r) => r.id === s.roomId)?.name}` : 'Online · Zoom';
          return (
            <li key={s.id}>
              <Link to={to(`/admin/classes/${s.id}`)} className={cx('flex items-center gap-3 md:gap-4 px-5 md:px-6 py-3 hover:bg-[rgba(7,80,86,0.035)] transition-colors', (done || cancelled) && 'opacity-55')}>
                <span className="num w-[62px] flex-shrink-0 font-medium">{studioTime(s.start)}</span>
                <div className="min-w-0 flex-1">
                  <div className={cx('font-medium truncate', cancelled && 'line-through')}>{c.name}</div>
                  <div className="text-[13px] text-[var(--ink-2)] truncate">{TEACHER[s.instructorId].name} · {place}</div>
                  <div className="sm:hidden mt-1.5 flex items-center gap-2">
                    <FillBar booked={bookedCount(s)} capacity={s.capacity} className="flex-1" />
                    {wl > 0 && !done && <Badge tone="amber" dot={false}>{wl} waiting</Badge>}
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-2 w-[200px] flex-shrink-0 justify-end">
                  {cancelled ? <Badge tone="red">Cancelled</Badge>
                    : <>
                      <FillBar booked={bookedCount(s)} capacity={s.capacity} className="w-[110px]" />
                      {wl > 0 && !done && <Badge tone="amber" dot={false}>{wl} waiting</Badge>}
                    </>}
                </div>
                <span className="w-[52px] flex-shrink-0 text-right text-[12.5px]">
                  {done ? <span className="text-[var(--ink-3)]">Done</span>
                    : running ? <Badge tone="teal" dot className="!px-2">Now</Badge>
                    : <Icon name="ri-arrow-right-s-line" className="text-[18px] text-[var(--ink-3)]" />}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

/* ---------- Needs attention ---------- */

interface Item { id: string; icon: string; text: string; loc: Loc | 'online'; action: { label: string; toast?: string; href?: string } }

function NeedsAttention({ loc, today, now }: { loc: Loc; today: Session[]; now: string }) {
  const { toast } = useDemo();
  const [done, setDone] = useState<string[]>([]);

  const items = useMemo(() => {
    const out: Item[] = [];
    const failed = orders.find((o) => o.status === 'failed');
    if (failed) {
      const m = MEMBER[failed.memberId];
      out.push({ id: 'renewal', icon: 'ri-bank-card-line', text: `${m.name}'s monthly renewal failed`, loc: failed.locationId ?? 'online',
        action: { label: 'Retry card', toast: `Card charged · ${m.name.split(' ')[0]}'s membership renewed` } });
    }
    // A full class later today (or tomorrow) with a waitlist: auto-promotion waiting for a yes.
    const upcomingFull = sessions.filter((s) => s.start > now && s.status === 'scheduled' && s.locationId && waitlistCount(s) > 0
      && s.start < new Date(Date.now() + 2 * 86400000).toISOString() && (loc === 'all' || s.locationId === loc))
      .sort((a, b) => a.start.localeCompare(b.start))[0];
    if (upcomingFull) {
      const inClass = new Set(rosterFor(upcomingFull).map((m) => m.id));
      const next = members.find((m) => !inClass.has(m.id) && m.homeLocation === upcomingFull.locationId) ?? members[0];
      const when = studioDateKey(upcomingFull.start) === TODAY_KEY ? studioTime(upcomingFull.start) : `tomorrow ${studioTime(upcomingFull.start)}`;
      out.push({ id: 'waitlist', icon: 'ri-arrow-up-circle-line', text: `Spot opened in ${CLASS[upcomingFull.classTypeId].name} ${when} for ${next.name}`,
        loc: upcomingFull.locationId as Loc, action: { label: 'Confirm', toast: `${next.name} moved into the class · email sent` } });
    }
    // Unsigned waivers among people booked into today's remaining classes.
    const unsigned: string[] = [];
    today.filter((s) => s.status === 'scheduled' && s.locationId).forEach((s) => rosterFor(s).forEach((m) => {
      if (!m.waiverSigned && !unsigned.includes(m.name)) unsigned.push(m.name);
    }));
    if (unsigned.length) {
      const names = unsigned.slice(0, 2);
      out.push({ id: 'waivers', icon: 'ri-file-warning-line', text: `Waivers missing for today: ${names.join(' and ')}`,
        loc: loc, action: { label: 'Send links', toast: `Waiver links sent to ${names.join(' and ')}` } });
    }
    // Retreat balances.
    const due = retreatBookings.filter((b) => b.retreatId === 'r2' && b.paid < b.total);
    if (due.length && loc !== 'town') {
      const total = due.reduce((n, b) => n + b.total - b.paid, 0);
      out.push({ id: 'retreat', icon: 'ri-home-heart-line', text: `Stillness Week: ${due.length} balances due, ${peso(total)}`, loc: 'beach',
        action: { label: 'Open manifest', href: to('/admin/retreats/r2') } });
    }
    // Passes expiring in the next 7 days.
    const weekEnd = new Date(Date.now() + 7 * 86400000).toISOString();
    const expiring = wallets.filter((w) => w.status === 'active' && w.expiresAt > now && w.expiresAt < weekEnd
      && (loc === 'all' || MEMBER[w.memberId].homeLocation === loc));
    if (expiring.length) {
      out.push({ id: 'expiring', icon: 'ri-timer-line', text: `${expiring.length} ${expiring.length === 1 ? 'pass expires' : 'passes expire'} this week`, loc: loc,
        action: { label: 'Send reminder', toast: `Reminder sent to ${expiring.length} ${expiring.length === 1 ? 'client' : 'clients'}` } });
    }
    return out.filter((i) => loc === 'all' || i.loc === loc);
  }, [loc, today, now]);

  return (
    <Panel pad={false}>
      <div className="px-5 md:px-6 pt-5"><SectionTitle>Needs attention</SectionTitle></div>
      {items.length === 0 && <div className="px-6 pb-6 text-[var(--ink-2)]">Nothing waiting on you here.</div>}
      <ul className="divide-y divide-[var(--line)] border-t border-[var(--line)]">
        {items.map((i) => {
          const isDone = done.includes(i.id);
          return (
            <li key={i.id} className="flex items-center gap-3 px-5 md:px-6 py-3 min-h-[60px]">
              <Icon name={isDone ? 'ri-check-line' : i.icon} className={cx('text-[18px] flex-shrink-0', isDone ? 'text-[var(--ok)]' : 'text-[var(--ink-2)]')} />
              <span className={cx('flex-1 min-w-0 leading-snug', isDone && 'text-[var(--ink-3)] line-through')}>{i.text}</span>
              {i.action.href
                ? <ButtonLink to={i.action.href} variant="secondary" size="sm">{i.action.label}</ButtonLink>
                : <Button variant="secondary" size="sm" disabled={isDone}
                    onClick={() => { setDone((d) => [...d, i.id]); toast(i.action.toast!); }}>{isDone ? 'Done' : i.action.label}</Button>}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

/* ---------- Revenue chart (SVG, stacked columns) ---------- */

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(600);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

/** Rect with only the top corners rounded. */
function topRounded(x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, h, w / 2);
  return `M${x},${y + h} V${y + rr} Q${x},${y} ${x + rr},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${y + h} Z`;
}

const compact = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}K` : `${n}`);

function RevenueChart({ series }: { series: typeof SERIES }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const H = 220, padL = 44, padB = 26, padT = 8;
  const plotH = H - padB - padT;
  const totals = revenueByMonth.map((m) => series.reduce((n, s) => n + m[s.key], 0));
  const rawMax = Math.max(...totals);
  const step = rawMax > 400000 ? 200000 : rawMax > 200000 ? 100000 : 50000;
  const max = Math.ceil(rawMax / step) * step;
  const ticks = Array.from({ length: max / step + 1 }, (_, i) => i * step);
  const band = (width - padL) / revenueByMonth.length;
  const barW = Math.min(24, band * 0.42);
  const y = (v: number) => padT + plotH - (v / max) * plotH;
  const GAP = 2;

  return (
    <div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3 text-[13px] text-[var(--ink-2)]">
        {series.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: s.color }} />{s.label}</span>
        ))}
      </div>
      <div ref={ref} className="relative" onMouseLeave={() => setHover(null)}>
        <svg width={width} height={H} role="img" aria-label="Revenue by month and location" className="block">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={padL} x2={width} y1={y(t)} y2={y(t)} stroke="rgba(36,48,55,0.08)" strokeWidth={1} />
              <text x={padL - 8} y={y(t) + 4} textAnchor="end" fontSize={11.5} fill="var(--ink-3)" className="num">{t === 0 ? '0' : `₱${compact(t)}`}</text>
            </g>
          ))}
          {revenueByMonth.map((m, i) => {
            const cx0 = padL + band * i + band / 2;
            const x = cx0 - barW / 2;
            let base = y(0);
            const segs = series.map((s, si) => {
              const h = (m[s.key] / max) * plotH;
              const top = base - h;
              const isTop = si === series.length - 1;
              const drawH = Math.max(0, h - (si > 0 ? GAP : 0));
              const el = isTop
                ? <path key={s.key} d={topRounded(x, top, barW, drawH, 4)} fill={s.color} />
                : <rect key={s.key} x={x} y={top} width={barW} height={drawH} fill={s.color} />;
              base = top;
              return el;
            });
            return (
              <g key={m.month} opacity={hover === null || hover === i ? 1 : 0.45} style={{ transition: 'opacity .15s' }}>
                {segs}
                <text x={cx0} y={H - 8} textAnchor="middle" fontSize={12} fill={hover === i ? 'var(--ink)' : 'var(--ink-3)'}>{m.month}</text>
                <rect x={padL + band * i} y={padT} width={band} height={plotH + padB - 4} fill="transparent"
                  onMouseEnter={() => setHover(i)} onClick={() => setHover(i)} />
              </g>
            );
          })}
        </svg>
        {hover !== null && (
          <div className="absolute z-10 pointer-events-none paper rounded-xl px-3 py-2.5 text-[12.5px] min-w-[150px]"
            style={{ left: Math.min(Math.max(padL + band * hover + band / 2 - 80, 0), width - 170), top: 0 }}>
            <div className="font-semibold mb-1.5">{revenueByMonth[hover].month}</div>
            {[...series].reverse().map((s) => (
              <div key={s.key} className="flex items-center gap-2 py-0.5">
                <span className="w-2 h-2 rounded-[2px]" style={{ background: s.color }} />
                <span className="text-[var(--ink-2)] flex-1">{s.label}</span>
                <span className="num font-medium">{peso(revenueByMonth[hover][s.key])}</span>
              </div>
            ))}
            {series.length > 1 && (
              <div className="flex justify-between gap-3 border-t border-[var(--line)] mt-1.5 pt-1.5">
                <span className="text-[var(--ink-2)]">Total</span><span className="num font-semibold">{peso(totals[hover])}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
