// The signed-in guest's account: bookings, passes, retreats, receipts, settings.

import { ReactNode, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Session } from '../lib/types';
import { CLASS, LOC, ME, PRODUCT, TEACHER, bookings, orders, retreatBookings, retreats, waitlistCount, wallets } from '../lib/data';
import { dateLabel, dayLabel, peso, rangeLabel, relativeDay, studioDateKey, studioTime, tzCity, yourTime } from '../lib/format';
import { to, useDemo } from '../lib/demo';
import { Avatar, Badge, Button, ButtonLink, Empty, Field, Icon, Panel, SectionTitle, Sheet, Tabs, Toggle, cx } from '../ui/kit';
import { Wrap } from '../ui/layouts';
import { LATE_CANCEL_HOURS, SESSION, lateCancelled, paidDropins, passCreditsLeft, shortRetreatTitle, usdExact } from './CheckoutOrder';

type Tab = 'upcoming' | 'waitlist' | 'past';

const TIMEZONES = [
  'Australia/Sydney', 'Australia/Melbourne', 'Australia/Brisbane', 'Pacific/Auckland', 'Asia/Manila', 'Asia/Singapore',
  'Asia/Tokyo', 'Asia/Seoul', 'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Amsterdam',
  'America/New_York', 'America/Toronto', 'America/Los_Angeles',
];

const MY_WALLETS = wallets.filter((w) => w.memberId === ME.id);
const MY_RETREATS = retreatBookings.filter((b) => b.memberId === ME.id);
const MY_ORDERS = orders.filter((o) => o.memberId === ME.id);
const PAST = bookings
  .filter((b) => b.memberId === ME.id && b.status === 'checked_in')
  .map((b) => SESSION[b.sessionId]).filter(Boolean)
  .sort((a, b) => b.start.localeCompare(a.start));

const memberSince = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'Asia/Manila' }).format(new Date(ME.joinedAt));

function DateTile({ iso, muted }: { iso: string; muted?: boolean }) {
  const key = studioDateKey(iso);
  const [wk, d, mon] = dayLabel(key).split(' ');
  return (
    <div className={cx('w-[52px] flex-shrink-0 rounded-2xl border text-center py-1.5', muted ? 'border-[var(--line)] text-[var(--ink-3)]' : 'border-[var(--line-2)] bg-white')}>
      <div className="text-[11.5px] text-[var(--ink-2)] leading-tight">{wk}</div>
      <div className="serif num text-[22px] leading-none my-0.5">{d}</div>
      <div className="text-[11.5px] text-[var(--ink-2)] leading-tight">{mon}</div>
    </div>
  );
}

/** "Today · 5:00 pm studio time · 8:00 pm Sydney" (online shows your time first). */
function TimeLine({ s, tz }: { s: Session; tz: string }) {
  const rel = relativeDay(studioDateKey(s.start));
  const prefix = rel === 'Today' || rel === 'Tomorrow' ? `${rel} · ` : '';
  return s.locationId === null
    ? <div className="num text-[13.5px] text-[var(--ink-2)]">{prefix}{yourTime(s.start, tz)} your time <span className="text-[var(--ink-3)]">· {studioTime(s.start)} studio time</span></div>
    : <div className="num text-[13.5px] text-[var(--ink-2)]">{prefix}{studioTime(s.start)} studio time <span className="text-[var(--ink-3)]">· {yourTime(s.start, tz)} {tzCity(tz)}</span></div>;
}

function BookingRow({ s, tz, actions, badge, muted }: { s: Session; tz: string; actions?: ReactNode; badge?: ReactNode; muted?: boolean }) {
  const c = CLASS[s.classTypeId];
  const loc = s.locationId ? LOC[s.locationId] : null;
  const room = loc?.rooms.find((r) => r.id === s.roomId);
  const cancelled = s.status === 'cancelled';
  return (
    <li className="flex gap-4 px-5 md:px-6 py-4">
      <DateTile iso={s.start} muted={muted || cancelled} />
      <div className="flex-1 min-w-0 sm:flex sm:items-center sm:gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cx('font-medium text-[15px]', cancelled && 'line-through text-[var(--ink-3)]')}>{c.name}</span>
            {cancelled ? <Badge tone="red">Cancelled by studio</Badge> : badge}
          </div>
          <TimeLine s={s} tz={tz} />
          <div className="text-[13.5px] text-[var(--ink-2)] truncate">
            {TEACHER[s.instructorId].name} · {loc ? <>{loc.name}{room && ` · ${room.name}`}</> : 'Online'}
          </div>
          {cancelled && s.cancelNote && <div className="text-[13px] text-[var(--bad)] mt-1">{s.cancelNote}</div>}
        </div>
        {actions && !cancelled && <div className="mt-3 sm:mt-0 flex items-center gap-2 flex-shrink-0">{actions}</div>}
      </div>
    </li>
  );
}

function CreditBar({ left, total, muted }: { left: number; total: number; muted?: boolean }) {
  return (
    <div className="flex gap-1" aria-label={`${left} of ${total} classes left`}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className="h-2 flex-1 rounded-full"
          style={{ background: i < left ? (muted ? 'var(--ink-3)' : 'var(--teal)') : 'rgba(36,48,55,0.10)' }} />
      ))}
    </div>
  );
}

function SettingRow({ title, meta, children }: { title: string; meta: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-4 min-h-[56px] py-2">
      <div className="flex-1 min-w-0">
        <div className="text-[14.5px] font-medium">{title}</div>
        <div className="text-[13px] text-[var(--ink-2)]">{meta}</div>
      </div>
      {children}
    </div>
  );
}

export default function Account() {
  const { viewerTz, setViewerTz, myBookings, cancelBooking, toast } = useDemo();
  const [tab, setTab] = useState<Tab>('upcoming');
  const [lateFor, setLateFor] = useState<Session | null>(null);
  const [emailRem, setEmailRem] = useState(true);
  const [waRem, setWaRem] = useState(false);
  const now = Date.now();

  const mine = (status: 'booked' | 'waitlist') => myBookings
    .filter((b) => b.status === status).map((b) => SESSION[b.sessionId])
    .filter((s) => s && new Date(s.start).getTime() + CLASS[s.classTypeId].duration * 60000 > now)
    .sort((a, b) => a.start.localeCompare(b.start));
  const upcoming = mine('booked');
  const waitlist = mine('waitlist');
  const creditsLeft = passCreditsLeft(myBookings);
  const tzOptions = TIMEZONES.includes(viewerTz) ? TIMEZONES : [viewerTz, ...TIMEZONES];

  const doCancel = (s: Session, late: boolean) => {
    const name = CLASS[s.classTypeId].name;
    if (late) lateCancelled.add(s.id);
    cancelBooking(s.id);
    setLateFor(null);
    if (late) toast(`Cancelled ${name}. Late cancel, so the credit was used`, 'warn');
    else if (paidDropins.has(s.id)) toast(`Cancelled ${name}. ${peso(PRODUCT.dropin.price)} is back as account credit`);
    else toast(`Cancelled ${name}. The credit is back on your pass`);
  };
  const askCancel = (s: Session) => {
    const hours = (new Date(s.start).getTime() - now) / 3600000;
    if (hours < LATE_CANCEL_HOURS) setLateFor(s); else doCancel(s, false);
  };

  const upcomingActions = (s: Session) => {
    if (s.locationId !== null) {
      return <Button variant="secondary" className="!h-11 sm:!h-9 sm:!px-3.5 sm:!text-[13.5px]" onClick={() => askCancel(s)}>Cancel</Button>;
    }
    const opensAt = new Date(new Date(s.start).getTime() - 15 * 60000);
    const open = now >= opensAt.getTime();
    return (
      <>
        {!open && <span className="num text-[12.5px] text-[var(--ink-3)] mr-1">Opens {yourTime(opensAt.toISOString(), viewerTz)}</span>}
        <Button className="!h-11 sm:!h-9 sm:!px-3.5 sm:!text-[13.5px]" icon="ri-live-line" disabled={!open} onClick={() => toast('Opening the live class in a new tab', 'info')}>Join</Button>
        <Button variant="ghost" className="!h-11 sm:!h-9 sm:!px-3 sm:!text-[13.5px]" onClick={() => askCancel(s)}>Cancel</Button>
      </>
    );
  };

  const list: Record<Tab, ReactNode> = {
    upcoming: upcoming.length
      ? upcoming.map((s) => <BookingRow key={s.id} s={s} tz={viewerTz} actions={upcomingActions(s)} />)
      : <li><Empty icon="ri-calendar-line" title="No classes booked">
          <ButtonLink to={to('/schedule')} size="sm" className="mt-3">See the schedule</ButtonLink>
        </Empty></li>,
    waitlist: waitlist.length
      ? waitlist.map((s) => (
          <BookingRow key={s.id} s={s} tz={viewerTz}
            badge={<Badge tone="amber">Number {Math.max(1, waitlistCount(s))}</Badge>}
            actions={<Button variant="secondary" className="!h-11 sm:!h-9 sm:!px-3.5 sm:!text-[13.5px]"
              onClick={() => { cancelBooking(s.id); toast(`Left the waitlist for ${CLASS[s.classTypeId].name}`); }}>Leave</Button>} />
        ))
      : <li><Empty icon="ri-time-line" title="You're not on any waitlists">Full classes show a "Join waitlist" button on the schedule.</Empty></li>,
    past: PAST.map((s) => <BookingRow key={s.id} s={s} tz={viewerTz} muted badge={<Badge tone="green">Attended</Badge>} />),
  };

  return (
    <Wrap className="pt-8 md:pt-12 pb-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Avatar name={ME.name} size={60} />
        <div className="flex-1 min-w-0">
          <h1 className="serif text-[28px] md:text-[36px] leading-tight truncate">{ME.name}</h1>
          <p className="text-[14px] text-[var(--ink-2)]">Member since {memberSince} · {ME.country}</p>
        </div>
        <Button variant="ghost" size="sm" className="hidden sm:inline-flex" onClick={() => toast('Signed out (not really, this is a demo)', 'info')}>Sign out</Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] items-start">
        {/* Left: bookings + retreats */}
        <div className="space-y-6 min-w-0">
          <Panel pad={false}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 md:px-6 pt-5 pb-4 border-b border-[var(--line)]">
              <h2 className="text-[16px] font-semibold">Your classes</h2>
              <Tabs<Tab> value={tab} onChange={setTab} options={[
                { value: 'upcoming', label: 'Upcoming', count: upcoming.length },
                { value: 'waitlist', label: 'Waitlist', count: waitlist.length },
                { value: 'past', label: 'Past', count: PAST.length },
              ]} />
            </div>
            <ul className="divide-y divide-[var(--line)]">{list[tab]}</ul>
            {tab === 'upcoming' && upcoming.length > 0 && (
              <p className="px-5 md:px-6 py-3.5 border-t border-[var(--line)] text-[13px] text-[var(--ink-3)]">
                Free cancellation up to {LATE_CANCEL_HOURS} hours before class.
              </p>
            )}
          </Panel>

          <Panel pad={false}>
            <div className="px-5 md:px-6 pt-5"><SectionTitle action={<Link to={to('/retreats')} className="text-[13.5px] font-medium text-[var(--teal)]">All retreats</Link>}>Retreats</SectionTitle></div>
            <ul className="divide-y divide-[var(--line)] pb-1">
              {MY_RETREATS.map((b) => {
                const r = retreats.find((x) => x.id === b.retreatId)!;
                const full = b.paid >= b.total;
                return (
                  <li key={b.id}>
                    <Link to={to(`/retreats/${r.slug}`)} className="flex items-center gap-4 px-5 md:px-6 py-3.5 hover:bg-[rgba(7,80,86,0.03)]">
                      <img src={r.images[0]} alt="" className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-[15px] truncate">{shortRetreatTitle(r)}</div>
                        <div className="num text-[13.5px] text-[var(--ink-2)]">{rangeLabel(r.startDate, r.endDate)} · {LOC[r.locationId].name}</div>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          <Badge tone={full ? 'green' : 'amber'}>{full ? 'Paid in full' : `${peso(b.total - b.paid)} due`}</Badge>
                          {b.forms.waiver && <Badge tone="gray" dot={false}>Waiver signed</Badge>}
                        </div>
                      </div>
                      <Icon name="ri-arrow-right-s-line" className="text-[20px] text-[var(--ink-3)]" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Panel>
        </div>

        {/* Right: passes, receipts, settings */}
        <div className="space-y-6 min-w-0">
          <Panel>
            <SectionTitle action={<Link to={to('/passes')} className="text-[13.5px] font-medium text-[var(--teal)] min-h-[44px] inline-flex items-center">Buy another</Link>}>Your passes</SectionTitle>
            <div className="space-y-5">
              {MY_WALLETS.map((w) => {
                const p = PRODUCT[w.productId];
                const active = w.status === 'active';
                const left = w.id === 'w1' ? creditsLeft : w.creditsLeft ?? 0;
                const total = w.creditsTotal ?? 0;
                return (
                  <div key={w.id} className={cx(!active && 'opacity-55')}>
                    <div className="flex items-center justify-between gap-3 mb-2.5">
                      <span className="font-medium text-[15px]">{p.name}</span>
                      {active ? <Badge tone="green">Active</Badge> : <Badge tone="gray">Used up</Badge>}
                    </div>
                    <CreditBar left={left} total={total} muted={!active} />
                    <div className="flex items-baseline justify-between gap-3 mt-2.5 text-[13.5px]">
                      <span className="num"><span className="font-medium">{left} of {total}</span> <span className="text-[var(--ink-2)]">classes left</span></span>
                      <span className="num text-[var(--ink-2)]">{active ? `Expires ${dateLabel(w.expiresAt)}` : `Ended ${dateLabel(w.expiresAt)}`}</span>
                    </div>
                    {active && p.includesOnDemand && <div className="text-[13px] text-[var(--ink-3)] mt-1">Both studios · online library included</div>}
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel pad={false}>
            <div className="px-5 md:px-6 pt-5"><SectionTitle>Receipts</SectionTitle></div>
            <ul className="divide-y divide-[var(--line)] pb-1">
              {MY_ORDERS.map((o) => (
                <li key={o.id} className="flex items-center gap-3 px-5 md:px-6 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-[14.5px] font-medium truncate">{o.items[0].label}</div>
                    <div className="num text-[13px] text-[var(--ink-2)]">{dateLabel(o.createdAt)} · {o.number}</div>
                  </div>
                  <div className="text-right">
                    <div className="num text-[14.5px] font-medium">{peso(o.total)}</div>
                    {o.chargedCurrency === 'USD' && <div className="num text-[12px] text-[var(--ink-3)]">{usdExact(o.total)}</div>}
                  </div>
                  <button type="button" aria-label={`Download ${o.number} as PDF`} onClick={() => toast(`Downloaded ${o.number}.pdf`)}
                    className="w-11 h-11 -mr-2 rounded-full inline-flex items-center justify-center text-[var(--ink-2)] hover:bg-[rgba(36,48,55,0.06)]">
                    <Icon name="ri-download-2-line" className="text-[18px]" />
                  </button>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel>
            <SectionTitle>Settings</SectionTitle>
            <Field label="Your timezone" hint="In-studio classes show studio time first, then yours.">
              <select className="input" value={viewerTz} onChange={(e) => { setViewerTz(e.target.value); toast(`Times now shown for ${tzCity(e.target.value)}`); }}>
                {tzOptions.map((tz) => <option key={tz} value={tz}>{tzCity(tz)}</option>)}
              </select>
            </Field>
            <div className="mt-3 divide-y divide-[var(--line)]">
              <SettingRow title="Email reminders" meta={`The evening before, to ${ME.email}`}>
                <Toggle label="Email reminders" on={emailRem} onChange={(v) => { setEmailRem(v); toast(v ? 'Email reminders on' : 'Email reminders off'); }} />
              </SettingRow>
              <SettingRow title="WhatsApp reminders" meta={`2 hours before class, to ${ME.phone}`}>
                <Toggle label="WhatsApp reminders" on={waRem} onChange={(v) => { setWaRem(v); toast(v ? 'WhatsApp reminders on' : 'WhatsApp reminders off'); }} />
              </SettingRow>
            </div>
            <Button variant="ghost" size="sm" className="sm:hidden mt-3 -ml-2" onClick={() => toast('Signed out (not really, this is a demo)', 'info')}>Sign out</Button>
          </Panel>
        </div>
      </div>

      <Sheet open={!!lateFor} onClose={() => setLateFor(null)} title={`Cancel within ${LATE_CANCEL_HOURS} hours?`}
        subtitle={lateFor ? `${CLASS[lateFor.classTypeId].name} · ${relativeDay(studioDateKey(lateFor.start))} ${studioTime(lateFor.start)} studio time` : undefined}
        footer={lateFor && (
          <div className="flex flex-col-reverse sm:flex-row gap-2.5 sm:justify-end">
            <Button variant="danger" size="lg" onClick={() => doCancel(lateFor, true)}>Cancel anyway</Button>
            <Button size="lg" onClick={() => setLateFor(null)}>Keep my spot</Button>
          </div>
        )}>
        {lateFor && (
          <div className="space-y-3 text-[14.5px] leading-relaxed">
            <p>
              This class starts in{' '}
              <span className="num font-medium">{Math.max(1, Math.round((new Date(lateFor.start).getTime() - now) / 3600000))} hours</span>.
              Cancelling inside {LATE_CANCEL_HOURS} hours uses the credit, so it won't go back on your pass.
            </p>
            <p className="text-[var(--ink-2)]">If someone from the waitlist takes your spot, we return the credit automatically.</p>
          </div>
        )}
      </Sheet>
    </Wrap>
  );
}
