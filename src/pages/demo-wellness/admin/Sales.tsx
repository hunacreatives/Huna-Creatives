// Admin · Sales. Month summary, orders with a detail drawer (refund, receipt), payouts.

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { LOC, MEMBER, TODAY_KEY, orders, revenueByMonth } from '../lib/data';
import { USD_RATE, addDays, dateLabel, peso, studioDateKey, studioTime } from '../lib/format';
import { to, useDemo } from '../lib/demo';
import type { Order, OrderStatus } from '../lib/types';
import { Avatar, Badge, Button, Chip, Empty, Field, Icon, OptionCard, PageTitle, Panel, Rows, SectionTitle, Sheet, Stat, cx } from '../ui/kit';
import { LocationSwitch } from '../ui/layouts';

type Kind = 'all' | 'pass' | 'dropin' | 'retreat' | 'online';
const KINDS: { v: Kind; l: string; test: (o: Order) => boolean }[] = [
  { v: 'all', l: 'All', test: () => true },
  { v: 'pass', l: 'Passes', test: (o) => o.kind === 'pass' },
  { v: 'dropin', l: 'Drop-ins', test: (o) => o.kind === 'dropin' },
  { v: 'retreat', l: 'Retreats', test: (o) => o.kind === 'retreat' },
  { v: 'online', l: 'Online', test: (o) => o.kind === 'online' || o.kind === 'rental' },
];
const STATUS: Record<OrderStatus, ['green' | 'gray' | 'red' | 'amber', string]> = {
  paid: ['green', 'Paid'], refunded: ['gray', 'Refunded'], failed: ['red', 'Failed'], pending: ['amber', 'Pending'],
};
const METHOD: Record<Order['method'], { icon: string; label: string }> = {
  card: { icon: 'ri-bank-card-line', label: 'Card' },
  paypal: { icon: 'ri-paypal-line', label: 'PayPal' },
  gcash: { icon: 'ri-smartphone-line', label: 'GCash' },
};
const FEE = 0.04;
const monthKey = TODAY_KEY.slice(0, 7);
const usdAmount = (php: number) => `US$${(php / USD_RATE).toFixed(2)}`;
const cardOf = (o: Order) => ['Visa ···· 4417', 'Mastercard ···· 2290', 'Visa ···· 0815', 'Amex ···· 1009'][Number(o.id.slice(1)) % 4];

export default function AdminSales() {
  const { adminLoc } = useDemo();
  const [kind, setKind] = useState<Kind>('all');
  const [status, setStatus] = useState<OrderStatus | 'any'>('any');
  const [overrides, setOverrides] = useState<Record<string, Partial<Order>>>({});
  const [openId, setOpenId] = useState<string | null>(null);

  const all = useMemo(() => orders.map((o) => ({ ...o, ...overrides[o.id] })), [overrides]);
  const inLoc = all.filter((o) => adminLoc === 'all' || o.locationId === adminLoc);
  const byKind = inLoc.filter(KINDS.find((k) => k.v === kind)!.test);
  const rows = byKind.filter((o) => status === 'any' || o.status === status);

  const month = inLoc.filter((o) => studioDateKey(o.createdAt).startsWith(monthKey));
  // Month-to-date total matches Today and Reports; the table below lists the latest orders.
  const cur = revenueByMonth[revenueByMonth.length - 1];
  const gross = adminLoc === 'all' ? cur.beach + cur.town + cur.online : cur[adminLoc];
  const refunds = month.filter((o) => o.status === 'refunded').reduce((s, o) => s + o.total, 0);
  const net = (gross - refunds) * (1 - FEE);
  const open = all.find((o) => o.id === openId);

  return (
    <div className="text-[14px]">
      <PageTitle admin title="Sales" subtitle="Every payment across both studios and online, in pesos." actions={<LocationSwitch />} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <Stat icon="ri-funds-line" label="Gross this month" value={peso(gross)} hint="Cards, PayPal and GCash" />
        <Stat icon="ri-refund-2-line" label="Refunds" value={peso(refunds)} hint={`${month.filter((o) => o.status === 'refunded').length} this month`} />
        <Stat icon="ri-bank-line" label="Net after fees" value={peso(net)} hint="Card and PayPal fees ≈ 4%" />
      </div>

      <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
        <div className="flex gap-1.5 overflow-x-auto no-bar -mx-3 px-3 md:mx-0 md:px-0 pb-1 md:pb-0">
          {KINDS.map((k) => <Chip key={k.v} active={kind === k.v} onClick={() => setKind(k.v)} count={inLoc.filter(k.test).length}>{k.l}</Chip>)}
        </div>
        <select className="input md:ml-auto md:w-[170px]" style={{ height: 36, fontSize: 13.5 }} value={status} onChange={(e) => setStatus(e.target.value as OrderStatus | 'any')} aria-label="Status">
          <option value="any">Any status</option>
          {Object.entries(STATUS).map(([k, [, l]]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </div>

      <Panel pad={false} className="overflow-hidden">
        {rows.length === 0 ? <Empty icon="ri-receipt-line" title="No orders match">Try another filter.</Empty> : (
          <div className="overflow-x-auto">
            <table className="tbl min-w-[900px]">
              <thead><tr><th>Order</th><th>Date</th><th>Client</th><th>Item</th><th>Method</th><th>Charged in</th><th className="r">Amount</th><th>Status</th></tr></thead>
              <tbody>
                {rows.map((o) => {
                  const m = MEMBER[o.memberId];
                  const [tone, label] = STATUS[o.status];
                  return (
                    <tr key={o.id} className="clickable" onClick={() => setOpenId(o.id)}>
                      <td className="num font-medium whitespace-nowrap">{o.number}</td>
                      <td className="num whitespace-nowrap text-[var(--ink-2)]">{dateLabel(o.createdAt).replace(/ \d{4}$/, '')} · {studioTime(o.createdAt)}</td>
                      <td><div className="flex items-center gap-2"><Avatar name={m.name} size={26} /><span className="whitespace-nowrap">{m.name}</span></div></td>
                      <td className="max-w-[240px] truncate">{o.items[0].label}</td>
                      <td><span className="inline-flex items-center gap-1.5 text-[var(--ink-2)] whitespace-nowrap"><Icon name={METHOD[o.method].icon} className="text-[16px]" />{METHOD[o.method].label}</span></td>
                      <td className="text-[var(--ink-2)]">{o.chargedCurrency === 'USD' ? 'US$' : '₱'}</td>
                      <td className={cx('r num font-medium', o.status === 'refunded' && 'line-through text-[var(--ink-3)]', o.status === 'failed' && 'text-[var(--ink-3)]')}>{peso(o.total)}</td>
                      <td><Badge tone={tone}>{label}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <SectionTitle className="mt-8">Payouts</SectionTitle>
      <Panel pad={false} className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="tbl min-w-[520px]">
            <thead><tr><th>Arrived</th><th>Bank</th><th className="r">Amount</th><th>Status</th></tr></thead>
            <tbody>
              {[[3, 148260], [10, 171940], [17, 129575]].map(([d, amt]) => (
                <tr key={d}>
                  <td className="num">{dateLabel(addDays(TODAY_KEY, -d))}</td>
                  <td className="text-[var(--ink-2)]">BPI ···· 2210</td>
                  <td className="r num font-medium">{peso(amt)}</td>
                  <td><Badge tone="green">Paid out</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <p className="text-[12.5px] text-[var(--ink-3)] mt-2">Weekly on Mondays. Next payout {dateLabel(addDays(TODAY_KEY, 4))}.</p>

      {open && <OrderSheet key={open.id} o={open} onClose={() => setOpenId(null)} onRefund={(note) => setOverrides((x) => ({ ...x, [open.id]: { status: 'refunded', refundNote: note } }))} />}
    </div>
  );
}

function OrderSheet({ o, onClose, onRefund }: { o: Order; onClose: () => void; onRefund: (note: string) => void }) {
  const { toast } = useDemo();
  const m = MEMBER[o.memberId];
  const [refunding, setRefunding] = useState(false);
  const [dest, setDest] = useState<'card' | 'credit'>('card');
  const [amount, setAmount] = useState(String(o.total));
  const [reason, setReason] = useState('Change of plans');
  const [tone, label] = STATUS[o.status];
  const t0 = new Date(o.createdAt).getTime();
  const at = (mins: number) => new Date(t0 + mins * 60000).toISOString();

  const timeline: { icon: string; text: string; at: string; tone?: string }[] = [
    { icon: 'ri-shopping-cart-2-line', text: 'Checkout started', at: at(-2) },
    ...(o.status === 'failed'
      ? [{ icon: 'ri-close-circle-line', text: 'Card declined by the bank (insufficient funds)', at: o.createdAt, tone: 'var(--bad)' },
         { icon: 'ri-mail-line', text: 'Pay link sent to the client', at: at(1) }]
      : o.status === 'pending'
        ? [{ icon: 'ri-time-line', text: 'Waiting for PayPal to confirm', at: o.createdAt, tone: 'var(--warn)' }]
        : [{ icon: 'ri-checkbox-circle-line', text: `Paid ${o.chargedCurrency === 'USD' ? usdAmount(o.total) : peso(o.total)}`, at: o.createdAt, tone: 'var(--ok)' },
           { icon: 'ri-mail-check-line', text: 'Receipt emailed', at: at(1) },
           ...(o.status === 'refunded' ? [{ icon: 'ri-refund-2-line', text: o.refundNote ?? 'Refunded', at: at(60 * 26) }] : [])]),
  ];

  const confirmRefund = () => {
    const amt = Number(amount) || o.total;
    onRefund(`${dest === 'card' ? 'Refunded to card' : 'Added as studio credit'} — ${reason}`);
    toast(dest === 'card' ? `${peso(amt)} refunded to ${o.method === 'paypal' ? 'PayPal' : 'card'}. Arrives in 5–10 days.` : `${peso(amt)} added to ${m.name.split(' ')[0]}'s account as credit`);
    setRefunding(false);
  };

  return (
    <Sheet open onClose={onClose} title={<span className="flex items-center gap-2.5">Order {o.number}<Badge tone={tone}>{label}</Badge></span>} subtitle={`${dateLabel(o.createdAt)} · ${studioTime(o.createdAt)}`}
      footer={!refunding && (
        <div className="flex flex-wrap justify-end gap-2">
          {o.status === 'paid' && <Button variant="danger" icon="ri-refund-2-line" onClick={() => setRefunding(true)}>Refund</Button>}
          {o.status === 'failed'
            ? <Button icon="ri-links-line" onClick={() => toast(`New pay link sent to ${m.email}`)}>Send pay link</Button>
            : <Button variant="secondary" icon="ri-mail-send-line" onClick={() => toast(`Receipt sent to ${m.email}`)}>Resend receipt</Button>}
        </div>
      )}>
      <div className="space-y-6">
        <Link to={to(`/admin/clients?member=${m.id}`)} className="flex items-center gap-3 p-3 -m-1 rounded-2xl hover:bg-[rgba(36,48,55,0.04)]">
          <Avatar name={m.name} size={36} />
          <div className="min-w-0 flex-1"><div className="font-medium">{m.name}</div><div className="text-[13px] text-[var(--ink-2)] truncate">{m.email}</div></div>
          <Icon name="ri-arrow-right-s-line" className="text-[var(--ink-3)]" />
        </Link>

        <div>
          {o.items.map((it, i) => (
            <div key={i} className="flex items-start justify-between gap-4 pb-2.5"><span>{it.label}</span><span className="num">{peso(it.amount)}</span></div>
          ))}
          <Rows rows={[
            ['Total', peso(o.total)],
            ['Charged', o.chargedCurrency === 'USD' ? `${usdAmount(o.total)} at ₱${USD_RATE.toFixed(2)}` : 'In pesos'],
            ['Method', o.method === 'card' ? cardOf(o) : o.method === 'paypal' ? 'PayPal' : 'GCash via Xendit'],
            ['Processing fee', o.status === 'paid' || o.status === 'refunded' ? peso(o.total * FEE) : '—'],
            ['Location', o.locationId ? LOC[o.locationId].name : 'Online'],
          ]} />
        </div>

        {refunding && (
          <div className="rounded-2xl border border-[var(--line-2)] bg-white p-4 space-y-4">
            <div className="font-medium">Refund</div>
            <div className="space-y-2">
              <OptionCard selected={dest === 'card'} onSelect={() => setDest('card')} title={`To ${o.method === 'paypal' ? 'PayPal' : o.method === 'gcash' ? 'GCash' : 'card'}`} meta="Back to the original payment, 5–10 days" />
              <OptionCard selected={dest === 'credit'} onSelect={() => setDest('credit')} title="As studio credit" meta="Instant. Usable on classes, passes and retreats" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Amount (₱)"><input className="input num" type="number" max={o.total} value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
              <Field label="Reason">
                <select className="input" value={reason} onChange={(e) => setReason(e.target.value)}>
                  {['Change of plans', 'Class cancelled', 'Charged twice', 'Medical', 'Other'].map((r) => <option key={r}>{r}</option>)}
                </select>
              </Field>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setRefunding(false)}>Cancel</Button>
              <Button variant="danger" onClick={confirmRefund}>Refund {peso(Number(amount) || 0)}</Button>
            </div>
          </div>
        )}

        <div>
          <div className="text-[13px] font-medium text-[var(--ink-2)] mb-3">Payment timeline</div>
          <ol className="space-y-3">
            {timeline.map((e, i) => (
              <li key={i} className="flex items-start gap-3">
                <Icon name={e.icon} className="text-[17px] mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div style={e.tone ? { color: e.tone } : undefined}>{e.text}</div>
                  <div className="text-[12.5px] text-[var(--ink-3)] num">{dateLabel(e.at)} · {studioTime(e.at)}</div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </Sheet>
  );
}
