// After booking or paying: ?type=class|waitlist|pass|retreat. Calm and factual.

import { ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CLASS, IMAGES, LOC, ME, PRODUCT, TEACHER, TODAY_KEY, wallets, waitlistCount } from '../lib/data';
import { addDays, dateLabel, dayLabel, peso, rangeLabel, studioDateKey, studioTime, tzCity, yourTime } from '../lib/format';
import { to, useDemo } from '../lib/demo';
import { Button, ButtonLink, Empty, Icon, Panel, Photo, cx } from '../ui/kit';
import { Wrap } from '../ui/layouts';
import { DEPOSIT_RATE, ORDER_NUMBER, SESSION, balanceDueDate, buildOrder, paidDropins, passCreditsLeft, retreatBySlug, shortRetreatTitle, usdExact } from './CheckoutOrder';

const W1 = wallets.find((w) => w.id === 'w1')!;

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[96px_minmax(0,1fr)] sm:grid-cols-[132px_minmax(0,1fr)] gap-3 py-3.5 text-[14.5px]">
      <dt className="text-[var(--ink-2)]">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

const Sub = ({ children }: { children: ReactNode }) => <div className="num text-[13px] text-[var(--ink-3)] mt-0.5">{children}</div>;

function Directions({ href }: { href: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[13.5px] font-medium text-[var(--teal)] mt-1">
      Directions <Icon name="ri-arrow-right-up-line" />
    </a>
  );
}

function Header({ icon, tone = 'teal', title, children }: { icon: string; tone?: 'teal' | 'amber'; title: string; children?: ReactNode }) {
  return (
    <div className="mb-7">
      <div className={cx('w-11 h-11 rounded-full flex items-center justify-center mb-5',
        tone === 'teal' ? 'bg-[var(--teal-soft)] text-[var(--teal)]' : 'bg-[rgba(176,120,20,0.12)] text-[#8a5d0c]')}>
        <Icon name={icon} className="text-[22px]" />
      </div>
      <h1 className="serif text-[30px] md:text-[40px] leading-[1.1]">{title}</h1>
      {children && <div className="text-[15.5px] text-[var(--ink-2)] mt-2.5 max-w-[58ch] leading-relaxed">{children}</div>}
    </div>
  );
}

function CalendarButtons({ name }: { name: string }) {
  const { toast } = useDemo();
  const file = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[13.5px] text-[var(--ink-2)] mr-1 w-full sm:w-auto">Add to calendar</span>
      <Button variant="secondary" icon="ri-google-fill" onClick={() => toast('Added to Google Calendar')}>Google</Button>
      <Button variant="secondary" icon="ri-apple-fill" onClick={() => toast(`Downloaded ${file}.ics`)}>Apple (.ics)</Button>
    </div>
  );
}

function OrderLine({ paid }: { paid: string | null }) {
  if (!paid) return null;
  return <p className="num text-[13.5px] text-[var(--ink-3)] mt-4">Order {ORDER_NUMBER} · receipt sent to {ME.email}</p>;
}

export default function Confirmation() {
  const [params] = useSearchParams();
  const { viewerTz, myBookings, cancelBooking, toast } = useDemo();
  const navigate = useNavigate();
  const type = params.get('type');
  const paidNum = Number(params.get('paid')) || 0;
  const cur = params.get('cur') === 'PHP' ? 'PHP' : 'USD';
  const money = (php: number) => (cur === 'USD' ? usdExact(php) : peso(php));
  const paid = paidNum ? money(paidNum) : null;

  // ---- Class booked or waitlisted ----------------------------------------
  if ((type === 'class' || type === 'waitlist') && SESSION[params.get('session') ?? '']) {
    const s = SESSION[params.get('session')!];
    const c = CLASS[s.classTypeId];
    const t = TEACHER[s.instructorId];
    const online = s.locationId === null;
    const loc = online ? null : LOC[s.locationId!];
    const room = loc?.rooms.find((r) => r.id === s.roomId);
    const key = studioDateKey(s.start);
    const waitlist = type === 'waitlist';
    const viaDropin = !!paid || paidDropins.has(s.id);
    const left = passCreditsLeft(myBookings);
    const position = Math.max(1, waitlistCount(s));

    return (
      <Wrap className="pt-10 md:pt-16 pb-6">
        <div className="max-w-[720px] mx-auto">
          {waitlist ? (
            <Header icon="ri-time-line" tone="amber" title="You're on the waitlist — not booked yet">
              If a spot opens up to 2 hours before class, we book you in automatically, use a credit from your pass, and message you.
            </Header>
          ) : (
            <Header icon="ri-check-line" title={`You're booked for ${c.name}`}>
              {online ? 'The join link opens in your account 15 minutes before class.' : 'Arrive 10 minutes early. Mats, props and water are at the studio.'}
            </Header>
          )}

          <Panel pad={false} className="overflow-hidden">
            <div className="h-36 md:h-48"><Photo src={loc ? loc.image : IMAGES.yoga} /></div>
            <dl className="px-5 md:px-6 py-1 divide-y divide-[var(--line)]">
              {waitlist && <Detail label="Class"><span className="font-medium">{c.name}</span></Detail>}
              <Detail label="Date"><span className="font-medium">{dayLabel(key, { weekday: 'long', month: 'long' })}</span></Detail>
              <Detail label="Time">
                {online ? (
                  <><span className="num font-medium">{yourTime(s.start, viewerTz)}</span> your time ({tzCity(viewerTz)})<Sub>{studioTime(s.start)} studio time</Sub></>
                ) : (
                  <><span className="num font-medium">{studioTime(s.start)}</span> studio time<Sub>{yourTime(s.start, viewerTz)} in {tzCity(viewerTz)}</Sub></>
                )}
                <Sub>{c.duration} min with {t.name}</Sub>
              </Detail>
              <Detail label="Location">
                {loc ? (
                  <><span className="font-medium">{loc.name}</span>{room && <> · {room.name}</>}<Sub>{loc.address}</Sub><Directions href={loc.mapUrl} /></>
                ) : <span className="font-medium">Online, live</span>}
              </Detail>
              {waitlist ? (
                <Detail label="Waitlist"><span className="num font-medium">Number {position}</span><Sub>No credit used until you are moved in</Sub></Detail>
              ) : viaDropin ? (
                <Detail label="Paid"><span className="num font-medium">{paid ?? peso(PRODUCT.dropin.price)}</span> · drop-in</Detail>
              ) : (
                <Detail label="Your pass">
                  <span className="num font-medium">{left} of {W1.creditsTotal} classes left</span>
                  <Sub>10-class pass · expires {dateLabel(W1.expiresAt)}</Sub>
                </Detail>
              )}
            </dl>
          </Panel>
          <OrderLine paid={paid} />

          <div className="mt-7 space-y-5">
            {!waitlist && <CalendarButtons name={c.name} />}
            <div className="flex flex-col sm:flex-row gap-2.5">
              <ButtonLink to={to('/account')} variant={waitlist ? 'primary' : 'secondary'} size="lg">Manage booking</ButtonLink>
              <ButtonLink to={to('/schedule')} variant={waitlist ? 'secondary' : 'primary'} size="lg">Book another class</ButtonLink>
              {waitlist && (
                <Button variant="ghost" size="lg" onClick={() => { cancelBooking(s.id); toast(`Left the waitlist for ${c.name}`); navigate(to('/schedule')); }}>
                  Leave waitlist
                </Button>
              )}
            </div>
          </div>
        </div>
      </Wrap>
    );
  }

  // ---- Pass bought --------------------------------------------------------
  if (type === 'pass' && PRODUCT[params.get('product') ?? '']) {
    const p = PRODUCT[params.get('product')!];
    const recurring = p.kind === 'monthly' || p.kind === 'online';
    const until = addDays(TODAY_KEY, p.validityDays);
    const name = p.name.charAt(0).toLowerCase() + p.name.slice(1);
    return (
      <Wrap className="pt-10 md:pt-16 pb-6">
        <div className="max-w-[720px] mx-auto">
          <Header icon="ri-check-line" title={`Your ${name} is ready`}>
            {p.kind === 'online' ? 'Live classes and the on-demand library are open now.' : 'Book any class at Seaside or Downtown with it.'}
          </Header>
          <Panel pad={false}>
            <dl className="px-5 md:px-6 py-1 divide-y divide-[var(--line)]">
              <Detail label={p.kind === 'online' ? 'Includes' : 'Classes'}>
                <span className="font-medium">{p.kind === 'online' ? 'Every live online class' : p.credits === null ? 'Unlimited' : p.credits}</span>
                {p.kind === 'pack' && <Sub>Share credits with a friend when you book</Sub>}
              </Detail>
              <Detail label={recurring ? 'Renews' : 'Valid until'}>
                <span className="num font-medium">{dateLabel(until)}</span>
                {recurring && <Sub>Freeze or cancel anytime from your account</Sub>}
              </Detail>
              {p.kind !== 'online' && <Detail label="Studios"><span className="font-medium">Seaside and Downtown</span></Detail>}
              <Detail label="Online library"><span className="font-medium">{p.includesOnDemand ? 'Included' : 'Not included'}</span></Detail>
              <Detail label="Paid"><span className="num font-medium">{paid ?? peso(p.price)}</span></Detail>
            </dl>
          </Panel>
          <OrderLine paid={paid ?? 'yes'} />
          <div className="mt-7 flex flex-col sm:flex-row gap-2.5">
            {p.kind === 'online'
              ? <ButtonLink to={to('/online')} size="lg">Go to online classes</ButtonLink>
              : <ButtonLink to={to('/schedule')} size="lg">Book a class</ButtonLink>}
            <ButtonLink to={to('/account')} variant="secondary" size="lg">Go to your account</ButtonLink>
          </div>
        </div>
      </Wrap>
    );
  }

  // ---- Retreat ------------------------------------------------------------
  const r = type === 'retreat' ? retreatBySlug(params.get('retreat')) : undefined;
  if (r) {
    const order = buildOrder(params)!;
    const deposit = order.deposit;
    const total = Number(params.get('total')) || order.subtotal;
    const paidToday = paidNum || (deposit ? Math.round(total * DEPOSIT_RATE) : total);
    const balance = total - paidToday;
    const due = balanceDueDate(r);
    const loc = LOC[r.locationId];
    const room = r.rooms.find((x) => x.id === params.get('room'));
    const guests = Math.max(1, Number(params.get('guests')) || 1);
    const addOnIds = (params.get('addons') ?? '').split(',');
    const addOns = r.addOns.filter((a) => addOnIds.includes(a.id));
    const name = shortRetreatTitle(r);

    const steps: { icon: string; title: string; text: string; action?: [string, string] }[] = [
      { icon: 'ri-file-list-3-line', title: 'Pre-arrival form', text: 'Diet, health notes and an emergency contact. About 3 minutes.', action: ['Start', 'Pre-arrival form opened'] },
      r.kind === 'multi'
        ? { icon: 'ri-flight-land-line', title: 'Flight details', text: 'So we can meet you and plan transfers. Add them when you have them.', action: ['Add', 'Flight details form opened'] }
        : { icon: 'ri-map-pin-time-line', title: 'Meet at the studio at 7:45 am', text: r.gettingThere },
    ];
    if (deposit) steps.push({ icon: 'ri-calendar-event-line', title: `Balance due ${dateLabel(due)}`, text: `${peso(balance)}. We email a payment link a week before; you can also pay from your account.` });

    return (
      <Wrap className="pt-10 md:pt-16 pb-6">
        <div className="max-w-[720px] mx-auto">
          <Header icon="ri-check-line" title={deposit ? `Your place on ${name} is held` : `Your place on ${name} is confirmed`}>
            {deposit ? 'Your deposit is in. The details are in your email and your account.' : 'Paid in full. The details are in your email and your account.'}
          </Header>

          <Panel pad={false} className="overflow-hidden">
            <div className="h-36 md:h-48"><Photo src={r.images[0]} /></div>
            <dl className="px-5 md:px-6 py-1 divide-y divide-[var(--line)]">
              <Detail label="Dates">
                <span className="num font-medium">{rangeLabel(r.startDate, r.endDate)}</span>
                {r.kind === 'multi' && <Sub>Check-in from 2:00 pm local time</Sub>}
              </Detail>
              <Detail label="Location">
                <span className="font-medium">{loc.name}</span><Sub>{loc.area}</Sub><Directions href={loc.mapUrl} />
              </Detail>
              {room && <Detail label="Room"><span className="font-medium">{room.name}</span>{guests > 1 && <> · {guests} guests</>}</Detail>}
              {!room && guests > 1 && <Detail label="Guests"><span className="num font-medium">{guests}</span></Detail>}
              {addOns.length > 0 && <Detail label="Add-ons"><span className="font-medium">{addOns.map((a) => a.name).join(', ')}</span></Detail>}
              <Detail label={deposit ? 'Paid today' : 'Paid'}>
                <span className="num font-medium">{money(paidToday)}</span>
                {deposit && <Sub>{peso(balance)} balance due {dateLabel(due)}</Sub>}
              </Detail>
            </dl>
          </Panel>
          <OrderLine paid={paid ?? 'yes'} />

          <h2 className="serif text-[24px] mt-10 mb-3">Next steps</h2>
          <Panel pad={false}>
            <ol className="divide-y divide-[var(--line)]">
              {steps.map((st) => (
                <li key={st.title} className="flex items-start gap-3.5 px-5 md:px-6 py-4">
                  <span className="w-9 h-9 rounded-full border border-[var(--line-2)] flex items-center justify-center flex-shrink-0 text-[var(--ink-2)]">
                    <Icon name={st.icon} className="text-[17px]" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-[14.5px]">{st.title}</div>
                    <p className="text-[13.5px] text-[var(--ink-2)] mt-0.5">{st.text}</p>
                  </div>
                  {st.action && <Button variant="quiet" size="sm" className="!h-10" onClick={() => toast(st.action![1], 'info')}>{st.action[0]}</Button>}
                </li>
              ))}
            </ol>
          </Panel>

          <div className="mt-7 space-y-5">
            <CalendarButtons name={name} />
            <div className="flex flex-col sm:flex-row gap-2.5">
              <ButtonLink to={to('/account')} size="lg">Manage booking</ButtonLink>
              <ButtonLink to={to('/schedule')} variant="secondary" size="lg">Book a class</ButtonLink>
            </div>
          </div>
        </div>
      </Wrap>
    );
  }

  return (
    <Wrap className="pt-14">
      <Panel>
        <Empty icon="ri-file-search-line" title="We couldn't find that booking">
          It may have been cancelled. Your bookings are all in <Link to={to('/account')} className="text-[var(--teal)] font-medium">your account</Link>.
        </Empty>
      </Panel>
    </Wrap>
  );
}
