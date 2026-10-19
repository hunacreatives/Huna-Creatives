// One-page checkout for a pass (?product=), a drop-in (?session=) or a retreat
// (?retreat=&room=&addons=&guests=&pay=). Visual only: nothing is charged.

import { Fragment, ReactNode, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { LOC, ME, PRODUCT, TEACHER } from '../lib/data';
import { USD_RATE, dateLabel, dayLabel, peso, rangeLabel, studioDateKey, studioTime, tzCity, usd, yourTime } from '../lib/format';
import { to, useDemo } from '../lib/demo';
import { Avatar, Button, ButtonLink, Empty, Field, Glass, Icon, OptionCard, Panel, Tabs, cx } from '../ui/kit';
import { Wrap } from '../ui/layouts';
import { CheckoutOrder, DEPOSIT_RATE, buildOrder, checkPromo, paidDropins, usdExact } from './CheckoutOrder';

type Currency = 'USD' | 'PHP';
type Method = 'card' | 'paypal';

interface Money { discount: number; total: number; dueToday: number; balance: number; promo: { code: string; percent: number } | null }

function backLink(o: CheckoutOrder): [string, string] {
  if (o.kind === 'class') return [to('/schedule'), 'Schedule'];
  if (o.kind === 'retreat') return [to(`/retreats/${o.retreat!.slug}`), o.retreat!.title];
  return [to('/passes'), 'Passes'];
}

/** Small lines under the item title in the summary. */
function ItemMeta({ o, tz }: { o: CheckoutOrder; tz: string }) {
  if (o.kind === 'pass') {
    const p = o.product!;
    const what = p.kind === 'online' ? 'Live and on-demand online' : p.credits === null ? 'Unlimited classes' : p.credits === 1 ? 'One class' : `${p.credits} classes`;
    const valid = p.kind === 'monthly' || p.kind === 'online' ? 'Renews monthly' : `Valid ${p.validityDays} days`;
    return <div>{what} · {valid}{p.kind !== 'online' && ' · Both studios'}</div>;
  }
  if (o.kind === 'class') {
    const s = o.session!;
    const day = dayLabel(studioDateKey(s.start));
    const online = s.locationId === null;
    return (
      <>
        <div className="num">
          {day} · {online ? `${yourTime(s.start, tz)} your time` : `${studioTime(s.start)} studio time`}
        </div>
        <div className="num text-[var(--ink-3)]">
          {online ? `${studioTime(s.start)} studio time` : `${yourTime(s.start, tz)} in ${tzCity(tz)}`}
        </div>
        <div>{online ? 'Online' : LOC[s.locationId!].name} · {TEACHER[s.instructorId].name}</div>
      </>
    );
  }
  const r = o.retreat!;
  return <div>{rangeLabel(r.startDate, r.endDate)} · {LOC[r.locationId].name}</div>;
}

function Thumb({ o, size = 64 }: { o: CheckoutOrder; size?: number }) {
  return o.image
    ? <img src={o.image} alt="" className="rounded-xl object-cover flex-shrink-0" style={{ width: size, height: size }} />
    : <span className="rounded-xl bg-[var(--teal-soft)] text-[var(--teal)] flex items-center justify-center flex-shrink-0" style={{ width: size, height: size }}>
        <Icon name="ri-coupon-3-line" className="text-[22px]" />
      </span>;
}

function SummaryBody({ o, m, tz, currency }: { o: CheckoutOrder; m: Money; tz: string; currency: Currency }) {
  const row = (k: ReactNode, v: ReactNode, cls = '') => (
    <div className={cx('flex items-start justify-between gap-4 text-[14px]', cls)}><span>{k}</span><span className="num text-right whitespace-nowrap">{v}</span></div>
  );
  return (
    <>
      <div className="flex gap-3.5">
        <Thumb o={o} />
        <div className="min-w-0 text-[13px] text-[var(--ink-2)] leading-snug space-y-0.5">
          <div className="text-[15px] font-semibold text-[var(--ink)] leading-tight mb-1">{o.title}</div>
          <ItemMeta o={o} tz={tz} />
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-[var(--line)] space-y-2.5">
        {o.lines.map((l) => <Fragment key={l.label}>{row(<span className="text-[var(--ink-2)]">{l.label}</span>, peso(l.amount))}</Fragment>)}
        {m.promo && row(
          <span className="text-[var(--ok)] inline-flex items-center gap-1.5"><Icon name="ri-price-tag-3-line" />{m.promo.code} · {m.promo.percent}% off</span>,
          <span className="text-[var(--ok)]">−{peso(m.discount)}</span>,
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-[var(--line)] space-y-2.5">
        {row(<span className="font-semibold">Total</span>, <span className="font-semibold text-[17px]">{peso(m.total)}</span>, 'items-baseline')}
        {o.deposit && (
          <>
            {row(<span className="font-medium">Deposit today ({Math.round(DEPOSIT_RATE * 100)}%)</span>, <span className="font-medium">{peso(m.dueToday)}</span>)}
            {row(<span className="text-[var(--ink-2)]">Balance due {dateLabel(o.balanceDue!)}</span>, <span className="text-[var(--ink-2)]">{peso(m.balance)}</span>)}
          </>
        )}
        {currency === 'USD' && (
          <div className="num text-[12.5px] text-[var(--ink-3)] text-right">Charged as {usdExact(m.dueToday)}</div>
        )}
      </div>
    </>
  );
}

function Step({ n, title, children, aside }: { n: number; title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <Panel>
      <div className="flex items-center gap-3 mb-4">
        <span className="num w-7 h-7 rounded-full border border-[var(--line-2)] text-[13px] font-semibold flex items-center justify-center flex-shrink-0">{n}</span>
        <h2 className="text-[16px] font-semibold flex-1">{title}</h2>
        {aside}
      </div>
      {children}
    </Panel>
  );
}

export default function Checkout() {
  const [params] = useSearchParams();
  const order = useMemo(() => buildOrder(params), [params]);
  const { viewerTz, book, toast } = useDemo();
  const navigate = useNavigate();

  const [signedIn, setSignedIn] = useState(true);
  const [code, setCode] = useState('');
  const [promo, setPromo] = useState<Money['promo']>(null);
  const [promoError, setPromoError] = useState('');
  const [method, setMethod] = useState<Method>('card');
  const [currency, setCurrency] = useState<Currency>(ME.country === 'Philippines' ? 'PHP' : 'USD');
  const [processing, setProcessing] = useState(false);
  const [details, setDetails] = useState(false);

  if (!order) {
    return (
      <Wrap className="pt-14">
        <Panel>
          <Empty icon="ri-shopping-bag-3-line" title="Nothing to check out">
            Pick a pass or a class first.
            <div className="flex justify-center gap-2 mt-4">
              <ButtonLink to={to('/passes')} variant="secondary">See passes</ButtonLink>
              <ButtonLink to={to('/schedule')}>Book a class</ButtonLink>
            </div>
          </Empty>
        </Panel>
      </Wrap>
    );
  }

  const discount = promo ? Math.round((order.subtotal * promo.percent) / 100) : 0;
  const total = order.subtotal - discount;
  const dueToday = order.deposit ? Math.round(total * DEPOSIT_RATE) : total;
  const money: Money = { discount, total, dueToday, balance: total - dueToday, promo };
  const chargeCur: Currency = method === 'paypal' ? 'USD' : currency;
  const charge = chargeCur === 'USD' ? usdExact(dueToday) : peso(dueToday);
  const [backTo, backLabel] = backLink(order);

  const applyPromo = () => {
    const r = checkPromo(code);
    if (!r) return;
    if ('error' in r) { setPromoError(r.error); setPromo(null); return; }
    setPromo(r); setPromoError(''); setCode('');
  };

  const pay = () => {
    if (processing) return;
    setProcessing(true);
    setTimeout(() => {
      if (order.kind === 'class') {
        paidDropins.add(order.session!.id);
        book(order.session!.id, 'booked');
      }
      navigate(to(`${order.confirmPath}&paid=${dueToday}&total=${total}&cur=${chargeCur}`));
    }, 600);
  };

  return (
    <Wrap className="pt-6 md:pt-10 pb-6">
      <Link to={backTo} className="inline-flex items-center gap-1 text-[14px] text-[var(--ink-2)] hover:text-[var(--ink)] min-h-[44px] -mt-2 max-w-full">
        <Icon name="ri-arrow-left-line" /><span className="truncate">{backLabel}</span>
      </Link>
      <h1 className="serif text-[32px] md:text-[40px] leading-tight mb-5 md:mb-7">Checkout</h1>

      {/* Mobile: summary collapses to one row */}
      <div className="lg:hidden sticky top-[76px] z-20 mb-4">
        <Glass strong className="px-4 py-3">
          <button type="button" onClick={() => setDetails((d) => !d)} aria-expanded={details}
            className="w-full flex items-center gap-3 text-left min-h-[44px]">
            <Thumb o={order} size={40} />
            <span className="flex-1 min-w-0">
              <span className="block text-[13px] text-[var(--ink-2)] truncate">{order.title}</span>
              <span className="num block text-[16px] font-semibold">{charge}{order.deposit && <span className="text-[13px] font-normal text-[var(--ink-2)]"> today</span>}</span>
            </span>
            <span className="text-[13.5px] font-medium text-[var(--teal)] inline-flex items-center gap-0.5 whitespace-nowrap">
              {details ? 'Hide details' : 'Show details'}<Icon name={details ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'} className="text-[18px]" />
            </span>
          </button>
          {details && <div className="pt-4 pb-1 mt-3 border-t border-[var(--line)] rise max-h-[60vh] overflow-y-auto"><SummaryBody o={order} m={money} tz={viewerTz} currency={chargeCur} /></div>}
        </Glass>
      </div>

      <div className="grid gap-6 lg:gap-10 lg:grid-cols-[minmax(0,1fr)_400px] items-start">
        <div className="space-y-4 min-w-0">
          {/* 1. Details */}
          <Step n={1} title="Your details">
            {signedIn ? (
              <div className="flex items-center gap-3">
                <Avatar name={ME.name} size={40} />
                <div className="min-w-0 flex-1 text-[14.5px] leading-snug">
                  <div><span className="text-[var(--ink-2)]">Booking as</span> <span className="font-medium">{ME.name}</span></div>
                  <div className="text-[var(--ink-2)] truncate">{ME.email}</div>
                </div>
                <button type="button" onClick={() => setSignedIn(false)} className="h-11 px-2 -mr-2 text-[14px] font-medium text-[var(--teal)] whitespace-nowrap">Not you?</button>
              </div>
            ) : (
              <div className="rise">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 mb-4">
                  <p className="text-[14px] text-[var(--ink-2)]">Continue as guest. Your booking goes to this email.</p>
                  <button type="button" className="text-[13.5px] font-medium text-[var(--teal)] min-h-[44px] sm:min-h-0"
                    onClick={() => { setSignedIn(true); toast(`Signed in as ${ME.name}`); }}>
                    Have an account? Sign in
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="First name"><input className="input" autoComplete="given-name" /></Field>
                  <Field label="Last name"><input className="input" autoComplete="family-name" /></Field>
                  <Field label="Email"><input className="input" type="email" autoComplete="email" /></Field>
                  <Field label="WhatsApp (optional)" hint="For class reminders"><input className="input" type="tel" autoComplete="tel" placeholder="+61 412 345 678" /></Field>
                </div>
              </div>
            )}
          </Step>

          {/* 2. Promo */}
          <Step n={2} title="Promo code">
            {promo ? (
              <div className="flex items-center gap-3 rounded-xl bg-[rgba(47,122,79,0.07)] px-4 min-h-[48px]">
                <Icon name="ri-price-tag-3-line" className="text-[var(--ok)]" />
                <span className="flex-1 text-[14px]"><span className="font-medium">{promo.code}</span> applied · {promo.percent}% off</span>
                <button type="button" onClick={() => setPromo(null)} className="h-11 text-[13.5px] font-medium text-[var(--ink-2)] hover:text-[var(--ink)]">Remove</button>
              </div>
            ) : (
              <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); applyPromo(); }}>
                <div className="flex-1 min-w-0">
                  <input className={cx('input uppercase placeholder:normal-case', promoError && '!border-[var(--bad)]')} value={code} placeholder="Code"
                    aria-invalid={!!promoError} aria-describedby={promoError ? 'promo-err' : undefined}
                    onChange={(e) => { setCode(e.target.value); setPromoError(''); }} />
                  {promoError && <p id="promo-err" className="text-[13px] text-[var(--bad)] mt-1.5">{promoError}</p>}
                </div>
                <Button type="submit" variant="secondary" disabled={!code.trim()}>Apply</Button>
              </form>
            )}
          </Step>

          {/* 3. Payment */}
          <Step n={3} title="Payment">
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={pay} disabled={processing} aria-label="Pay with Apple Pay"
                className="h-12 rounded-full bg-black text-white inline-flex items-center justify-center gap-1 text-[16px] font-medium active:scale-[0.98] transition disabled:opacity-50">
                <Icon name="ri-apple-fill" className="text-[19px] -mt-0.5" />Pay
              </button>
              <button type="button" onClick={pay} disabled={processing} aria-label="Pay with Google Pay"
                className="h-12 rounded-full bg-white border border-[var(--line-2)] inline-flex items-center justify-center gap-1.5 text-[16px] font-medium active:scale-[0.98] transition hover:border-[var(--ink-3)] disabled:opacity-50">
                <Icon name="ri-google-fill" className="text-[17px]" />Pay
              </button>
            </div>

            <div className="flex items-center gap-3 my-5 text-[12.5px] text-[var(--ink-3)]">
              <span className="h-px flex-1 bg-[var(--line)]" />or<span className="h-px flex-1 bg-[var(--line)]" />
            </div>

            <div className="space-y-3">
              <OptionCard selected={method === 'card'} onSelect={() => setMethod('card')}
                title="Card" meta="Visa, Mastercard, Amex, JCB"
                right={<span className="flex gap-1 text-[var(--ink-3)] text-[20px]"><Icon name="ri-visa-line" /><Icon name="ri-mastercard-line" /></span>} />

              {method === 'card' && (
                <div className="rise space-y-3 pb-1">
                  <Field label="Card number">
                    <div className="relative">
                      <input className="input pr-11 num" inputMode="numeric" autoComplete="cc-number" placeholder="1234 1234 1234 1234" />
                      <Icon name="ri-bank-card-line" className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[18px] text-[var(--ink-3)]" />
                    </div>
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Expiry"><input className="input num" inputMode="numeric" autoComplete="cc-exp" placeholder="MM / YY" /></Field>
                    <Field label="CVC"><input className="input num" inputMode="numeric" autoComplete="cc-csc" placeholder="123" /></Field>
                  </div>
                  <Field label="Name on card"><input className="input" autoComplete="cc-name" defaultValue={signedIn ? ME.name : ''} /></Field>

                  <div className="pt-1">
                    <span className="block text-[13px] font-medium text-[var(--ink-2)] mb-1.5">Currency</span>
                    <Tabs<Currency> value={currency} onChange={setCurrency}
                      options={[{ value: 'USD', label: 'Pay in US$' }, { value: 'PHP', label: 'Pay in ₱' }]} />
                    <p className="num text-[13px] text-[var(--ink-2)] mt-2">
                      {currency === 'USD'
                        ? <>{peso(dueToday)} is <span className="font-medium text-[var(--ink)]">{usdExact(dueToday)}</span> at ₱{USD_RATE} to US$1. No foreign transaction fee from us.</>
                        : <>Charged as <span className="font-medium text-[var(--ink)]">{peso(dueToday)}</span>. Your bank converts it at its own rate (about {usd(dueToday)}).</>}
                    </p>
                  </div>
                </div>
              )}

              <OptionCard selected={method === 'paypal'} onSelect={() => setMethod('paypal')}
                title="PayPal" meta={method === 'paypal' ? `You approve ${usdExact(dueToday)} on PayPal, then come back here.` : 'Charged in US$'}
                right={<Icon name="ri-paypal-fill" className="text-[20px] text-[#1f4f9a]" />} />
            </div>

            <Button size="lg" block className="mt-6 !h-[52px] text-[16px]" onClick={pay} disabled={processing}>
              {processing
                ? <><Icon name="ri-loader-4-line" className="animate-spin text-[18px]" />Processing…</>
                : <span className="num">{method === 'paypal' ? `Pay ${charge} with PayPal` : `Pay ${charge}`}</span>}
            </Button>

            <p className="flex gap-2 text-[13px] text-[var(--ink-2)] mt-4 leading-snug">
              <Icon name="ri-information-line" className="text-[15px] mt-[1px] flex-shrink-0" />{order.cancellation}
            </p>
            <p className="flex items-center gap-1.5 text-[12px] text-[var(--ink-3)] mt-2">
              <Icon name="ri-lock-line" />Payments by Xendit. Cards charged in US$ or pesos.
            </p>
          </Step>
        </div>

        {/* Desktop summary */}
        <aside className="hidden lg:block sticky top-[92px]">
          <Glass strong className="p-6">
            <h2 className="text-[13.5px] font-medium text-[var(--ink-2)] mb-4">Order summary</h2>
            <SummaryBody o={order} m={money} tz={viewerTz} currency={chargeCur} />
          </Glass>
          {order.kind === 'class' && (
            <p className="text-[13px] text-[var(--ink-2)] mt-4 px-2">
              Coming more than twice? A <Link to={to('/passes')} className="text-[var(--teal)] font-medium">5-class pass</Link> works out at {peso(PRODUCT.pack5.price / 5)} a class.
            </p>
          )}
        </aside>
      </div>
    </Wrap>
  );
}
