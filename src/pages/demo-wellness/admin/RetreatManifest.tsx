// Admin · Retreat manifest (/admin/retreats/:id). Guests, rooms, payments, settings.

import { Fragment, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { LOC, MEMBER, RETREAT, TODAY_KEY } from '../lib/data';
import { dateLabel, peso, rangeLabel } from '../lib/format';
import { to, useDemo } from '../lib/demo';
import type { Retreat, RetreatBooking } from '../lib/types';
import { Avatar, Badge, Button, Chip, Empty, Field, Icon, PageTitle, Panel, Sheet, Stat, Tabs, Toggle, cx } from '../ui/kit';
import { BALANCE_DAYS, DEPOSIT_PCT, balanceDueKey, formsComplete, retreatStats } from './RetreatsData';

type Tab = 'guests' | 'rooms' | 'payments' | 'settings';

export default function AdminRetreatManifest() {
  const { id } = useParams();
  const r = RETREAT[id ?? ''];
  const { toast } = useDemo();
  const [tab, setTab] = useState<Tab>('guests');
  const [composing, setComposing] = useState(false);

  if (!r) {
    return (
      <Panel>
        <Empty icon="ri-sun-line" title="Retreat not found">
          <Link to={to('/admin/retreats')} className="text-[var(--teal)] font-medium">Back to retreats</Link>
        </Empty>
      </Panel>
    );
  }

  const st = retreatStats(r);
  const multi = r.kind === 'multi';
  const tabs: { value: Tab; label: string; count?: number }[] = [
    { value: 'guests', label: 'Guests', count: st.list.length },
    ...(multi ? [{ value: 'rooms' as Tab, label: 'Rooms' }] : []),
    { value: 'payments', label: 'Payments' },
    { value: 'settings', label: 'Settings' },
  ];

  return (
    <div className="text-[14px]">
      <Link to={to('/admin/retreats')} className="inline-flex items-center gap-1 text-[13.5px] text-[var(--ink-2)] hover:text-[var(--ink)] mb-3">
        <Icon name="ri-arrow-left-line" />Retreats
      </Link>
      <PageTitle admin title={r.title.replace(' (draft)', '')}
        subtitle={<span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="num">{rangeLabel(r.startDate, r.endDate)}</span><span className="text-[var(--ink-3)]">·</span>{LOC[r.locationId].name}
          {r.status === 'draft' && <Badge tone="gray">Draft</Badge>}
        </span>}
        actions={<>
          <Button size="sm" variant="secondary" icon="ri-printer-line" onClick={() => toast('Manifest sent to the printer — one page per room')}>Print manifest</Button>
          <Button size="sm" variant="secondary" icon="ri-download-2-line" onClick={() => toast(`Exported ${st.list.length} guests to CSV`)}>Export CSV</Button>
          <Button size="sm" icon="ri-mail-send-line" onClick={() => setComposing(true)} disabled={!st.list.length}>Message guests</Button>
        </>} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Stat icon="ri-group-line" label="Guests booked" value={<>{st.guests}<span className="text-[var(--ink-3)] text-[18px] font-medium">/{r.capacity}</span></>} />
        <Stat icon="ri-wallet-3-line" label="Collected" value={peso(st.collected)} />
        <Stat icon="ri-time-line" label="Outstanding" value={peso(st.outstanding)} hint={st.outstanding ? `Balance due ${dateLabel(balanceDueKey(r))}` : undefined} />
        <Stat icon="ri-file-list-3-line" label="Forms complete" value={<>{st.formsDone}<span className="text-[var(--ink-3)] text-[18px] font-medium">/{st.list.length}</span></>}
          hint={multi ? 'Pre-arrival form and waiver' : 'Waiver signed'} />
      </div>

      <Tabs<Tab> value={tab} onChange={setTab} options={tabs} className="mb-4" />

      {tab === 'guests' && <Guests r={r} list={st.list} />}
      {tab === 'rooms' && <Rooms r={r} list={st.list} />}
      {tab === 'payments' && <Payments r={r} list={st.list} />}
      {tab === 'settings' && <Settings r={r} />}

      <Compose open={composing} onClose={() => setComposing(false)} r={r} list={st.list} />
    </div>
  );
}

const roomName = (r: Retreat, b: RetreatBooking) => r.rooms.find((x) => x.id === b.roomId)?.name ?? '—';
const formFilled = (b: RetreatBooking) => Boolean(b.forms.diet && b.forms.emergency);

function Guests({ r, list }: { r: Retreat; list: RetreatBooking[] }) {
  const [openNote, setOpenNote] = useState<string | null>(null);
  const multi = r.kind === 'multi';
  if (!list.length) return <Panel><Empty icon="ri-group-line" title="No guests yet">Bookings appear here once the retreat is published.</Empty></Panel>;
  const cols = multi ? 8 : 4;
  return (
    <Panel pad={false} className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className={cx('tbl', multi ? 'min-w-[1080px]' : 'min-w-[620px]')}>
          <thead><tr>
            <th>Guest</th>{multi && <th>Room</th>}<th>Paid</th><th className="r">Balance due</th>
            {multi && <><th>Diet</th><th>Flight</th><th>Form</th></>}<th>Waiver</th>
          </tr></thead>
          <tbody>
            {list.map((b) => {
              const m = MEMBER[b.memberId];
              const full = b.paid >= b.total;
              return (
                <Fragment key={b.id}>
                  <tr>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={m.name} size={30} />
                        <Link to={to(`/admin/clients?member=${m.id}`)} className="font-medium whitespace-nowrap hover:text-[var(--teal)]">{m.name}</Link>
                        {b.forms.health && (
                          <button type="button" title={b.forms.health} onClick={() => setOpenNote(openNote === b.id ? null : b.id)} aria-expanded={openNote === b.id}>
                            <Badge tone="amber" dot={false}><Icon name="ri-heart-pulse-line" />Health note</Badge>
                          </button>
                        )}
                      </div>
                    </td>
                    {multi && <td className="whitespace-nowrap">{roomName(r, b)}</td>}
                    <td className="whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Badge tone={full ? 'green' : 'amber'}>{full ? 'Paid in full' : 'Deposit paid'}</Badge>
                        {!full && <span className="num text-[13px] text-[var(--ink-2)]">{peso(b.paid)} of {peso(b.total)}</span>}
                      </div>
                    </td>
                    <td className="r num">{full ? <span className="text-[var(--ink-3)]">—</span> : peso(b.total - b.paid)}</td>
                    {multi && <>
                      <td className="whitespace-nowrap">{b.forms.diet || <span className="text-[var(--ink-3)]">—</span>}</td>
                      <td className="whitespace-nowrap text-[13px] num">{b.forms.flight || <span className="text-[var(--ink-3)]">Not yet</span>}</td>
                      <td>{formFilled(b) ? <Badge tone="green">Complete</Badge> : <Badge tone="red">Missing</Badge>}</td>
                    </>}
                    <td>{b.forms.waiver ? <span className="inline-flex items-center gap-1 text-[var(--ok)]"><Icon name="ri-check-line" />Signed</span> : <Badge tone="red">Missing</Badge>}</td>
                  </tr>
                  {openNote === b.id && (
                    <tr><td colSpan={cols} style={{ height: 'auto' }} className="py-2.5 bg-[rgba(176,120,20,0.05)] text-[13.5px] text-[var(--ink-2)]">
                      <Icon name="ri-lock-line" className="mr-1.5 text-[var(--ink-3)]" />{b.forms.health}<span className="text-[var(--ink-3)]"> · shared with teachers only</span>
                    </td></tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function Rooms({ r, list }: { r: Retreat; list: RetreatBooking[] }) {
  if (!r.rooms.length) return <Panel><Empty icon="ri-hotel-bed-line" title="No rooms set up yet">Add room types in Settings before publishing.</Empty></Panel>;
  return (
    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
      {r.rooms.map((room) => {
        const inRoom = list.filter((b) => b.roomId === room.id);
        return (
          <Panel key={room.id} className="flex flex-col">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold">{room.name}</div>
                <div className="text-[13px] text-[var(--ink-2)] mt-0.5">{room.type === 'private' ? 'Private' : 'Shared'} · sleeps {room.sleeps} · <span className="num">{peso(room.pricePerPerson)}</span> pp</div>
              </div>
              {room.available === 0 ? <Badge tone="gray">Sold out</Badge> : <Badge tone="teal">{room.available} left</Badge>}
            </div>
            <div className="mt-4 space-y-2 flex-1">
              {inRoom.length === 0 && <div className="text-[13.5px] text-[var(--ink-3)]">No one assigned yet.</div>}
              {inRoom.map((b) => (
                <div key={b.id} className="flex items-center gap-2.5">
                  <Avatar name={MEMBER[b.memberId].name} size={28} />
                  <span>{MEMBER[b.memberId].name}</span>
                </div>
              ))}
            </div>
          </Panel>
        );
      })}
    </div>
  );
}

const METHODS = ['Visa ···· 4417', 'Mastercard ···· 2290', 'PayPal', 'Visa ···· 0815'];

function paymentsOf(r: Retreat, b: RetreatBooking) {
  const method = METHODS[Number(b.id.replace(/\D/g, '')) % METHODS.length];
  if (b.paid >= b.total) return { lines: [{ label: r.kind === 'day' ? 'Ticket' : 'Paid in full', at: b.createdAt, amount: b.paid, method }], due: null };
  return { lines: [{ label: `Deposit (${DEPOSIT_PCT}%)`, at: b.createdAt, amount: b.paid, method }], due: { key: balanceDueKey(r), amount: b.total - b.paid } };
}

function Payments({ r, list }: { r: Retreat; list: RetreatBooking[] }) {
  const { toast } = useDemo();
  const owing = list.filter((b) => b.paid < b.total);
  if (!list.length) return <Panel><Empty icon="ri-bank-card-line" title="No payments yet" /></Panel>;
  return (
    <div className="space-y-3">
      {owing.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[var(--ink-2)]">{owing.length} {owing.length === 1 ? 'guest has' : 'guests have'} a balance left.</p>
          <Button size="sm" icon="ri-notification-3-line" onClick={() => toast(`Balance reminder sent to ${owing.length} guests with a pay link`)}>Send balance reminder</Button>
        </div>
      )}
      <Panel pad={false} className="divide-y divide-[var(--line)]">
        {list.map((b) => {
          const m = MEMBER[b.memberId];
          const { lines, due } = paymentsOf(r, b);
          const overdue = due && due.key < TODAY_KEY;
          return (
            <div key={b.id} className="px-4 md:px-5 py-4">
              <div className="flex items-center gap-2.5 mb-2">
                <Avatar name={m.name} size={28} />
                <span className="font-medium">{m.name}</span>
                <span className="ml-auto num text-[13px] text-[var(--ink-3)]">{peso(b.total)} total</span>
              </div>
              <div className="pl-[38px] space-y-1.5">
                {lines.map((l, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[13.5px]">
                    <Icon name="ri-checkbox-circle-fill" className="text-[var(--ok)]" />
                    <span>{l.label}</span>
                    <span className="text-[var(--ink-3)] num">{dateLabel(l.at)} · {l.method}</span>
                    <span className="ml-auto num font-medium">{peso(l.amount)}</span>
                  </div>
                ))}
                {due && (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[13.5px]">
                    <Icon name="ri-time-line" className={overdue ? 'text-[var(--bad)]' : 'text-[var(--ink-3)]'} />
                    <span>Balance</span>
                    {overdue ? <Badge tone="red">Overdue since {dateLabel(due.key)}</Badge> : <span className="text-[var(--ink-3)] num">Due {dateLabel(due.key)}</span>}
                    <span className="ml-auto num font-medium text-[var(--ink-2)]">{peso(due.amount)}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </Panel>
    </div>
  );
}

const FORM_FIELDS = [
  { id: 'diet', label: 'Dietary needs and allergies', required: true },
  { id: 'flight', label: 'Flight and arrival time', required: false },
  { id: 'health', label: 'Health notes (teachers only)', required: false },
  { id: 'emergency', label: 'Emergency contact', required: true },
  { id: 'waiver', label: 'Liability waiver', required: true },
];

function Settings({ r }: { r: Retreat }) {
  const { toast } = useDemo();
  const [published, setPublished] = useState(r.status === 'published');
  const [req, setReq] = useState<Record<string, boolean>>(Object.fromEntries(FORM_FIELDS.map((f) => [f.id, f.required])));
  return (
    <div className="grid lg:grid-cols-2 gap-3 items-start">
      <Panel className="space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="font-medium">Published</div>
            <div className="text-[13px] text-[var(--ink-2)]">{published ? 'Listed on the website and open for booking.' : 'Hidden from the website.'}</div>
          </div>
          <Toggle on={published} onChange={setPublished} label="Published" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Deposit" hint="Of the total, at booking">
            <div className="relative"><input className="input num" style={{ paddingRight: 32 }} type="number" defaultValue={DEPOSIT_PCT} /><span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--ink-3)]">%</span></div>
          </Field>
          <Field label="Balance due" hint="Days before arrival">
            <input className="input num" type="number" defaultValue={BALANCE_DAYS} />
          </Field>
        </div>
        <p className="text-[13px] text-[var(--ink-2)]">Guests get an automatic reminder 7 days before the balance is due, and a pay link by email and WhatsApp.</p>
      </Panel>
      <Panel>
        <div className="font-medium mb-1">Pre-arrival form</div>
        <p className="text-[13px] text-[var(--ink-2)] mb-3">Sent with the booking confirmation. Required fields block check-in until filled.</p>
        <div className="divide-y divide-[var(--line)]">
          {FORM_FIELDS.map((f) => (
            <div key={f.id} className="flex items-center justify-between gap-3 py-2.5">
              <span>{f.label}</span>
              <span className="flex items-center gap-2 text-[13px] text-[var(--ink-2)]">Required<Toggle on={req[f.id]} onChange={(v) => setReq({ ...req, [f.id]: v })} label={`${f.label} required`} /></span>
            </div>
          ))}
        </div>
      </Panel>
      <div className="lg:col-span-2 flex justify-end">
        <Button onClick={() => toast('Retreat settings saved')}>Save settings</Button>
      </div>
    </div>
  );
}

type Audience = 'all' | 'balance' | 'forms';
const TEMPLATES = {
  prearrival: { label: 'Pre-arrival details', subject: (r: Retreat) => `${r.title}: what to know before you arrive`,
    body: (r: Retreat) => `Hi {first_name},\n\nWe're looking forward to having you on ${r.title}, ${rangeLabel(r.startDate, r.endDate)}.\n\n${r.gettingThere}\n\nIf you haven't yet, please fill in your pre-arrival form so we can plan meals and pickups: {form_link}\n\nSee you soon,\nMara` },
  balance: { label: 'Balance reminder', subject: (r: Retreat) => `Your balance for ${r.title}`,
    body: (r: Retreat) => `Hi {first_name},\n\nA reminder that your balance of {balance} for ${r.title} is due ${dateLabel(balanceDueKey(r))}. You can pay by card, PayPal or GCash here: {pay_link}\n\nThank you,\nMara` },
  packing: { label: 'What to pack', subject: () => 'What to pack', body: () => `Hi {first_name},\n\nA short list: reef-safe sunscreen, a light layer for evenings, swimwear, a water bottle and sandals. Mats and props are provided.\n\nMara` },
};

function Compose({ open, onClose, r, list }: { open: boolean; onClose: () => void; r: Retreat; list: RetreatBooking[] }) {
  const { toast } = useDemo();
  const groups: Record<Audience, RetreatBooking[]> = {
    all: list,
    balance: list.filter((b) => b.paid < b.total),
    forms: list.filter((b) => !formsComplete(r, b)),
  };
  const [aud, setAud] = useState<Audience>('all');
  const [tpl, setTpl] = useState<keyof typeof TEMPLATES>('prearrival');
  const [subject, setSubject] = useState(TEMPLATES.prearrival.subject(r));
  const [body, setBody] = useState(TEMPLATES.prearrival.body(r));
  const pick = (k: keyof typeof TEMPLATES) => { setTpl(k); setSubject(TEMPLATES[k].subject(r)); setBody(TEMPLATES[k].body(r)); };
  const n = groups[aud].length;
  return (
    <Sheet open={open} onClose={onClose} title="Message guests" subtitle="Sends by email and WhatsApp"
      footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button icon="ri-send-plane-line" disabled={!n} onClick={() => { toast(`Sent to ${n} ${n === 1 ? 'guest' : 'guests'}`); onClose(); }}>Send to {n}</Button></div>}>
      <div className="space-y-4">
        <div>
          <span className="block text-[13px] font-medium text-[var(--ink-2)] mb-1.5">To</span>
          <div className="flex flex-wrap gap-1.5">
            <Chip active={aud === 'all'} onClick={() => setAud('all')} count={groups.all.length}>All guests</Chip>
            <Chip active={aud === 'balance'} onClick={() => setAud('balance')} count={groups.balance.length}>Balance due</Chip>
            <Chip active={aud === 'forms'} onClick={() => setAud('forms')} count={groups.forms.length}>Forms missing</Chip>
          </div>
        </div>
        <Field label="Template">
          <select className="input" value={tpl} onChange={(e) => pick(e.target.value as keyof typeof TEMPLATES)}>
            {Object.entries(TEMPLATES).map(([k, t]) => <option key={k} value={k}>{t.label}</option>)}
          </select>
        </Field>
        <Field label="Subject"><input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} /></Field>
        <Field label="Message" hint="{first_name}, {balance} and links fill in per guest.">
          <textarea className="input" rows={10} value={body} onChange={(e) => setBody(e.target.value)} />
        </Field>
      </div>
    </Sheet>
  );
}

