// Admin · Clients. Searchable list with a profile drawer (?member=<id>).

import { useCallback, useMemo, useState, KeyboardEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LOC, PRODUCT, RETREAT, TODAY_KEY, members, retreatBookings } from '../lib/data';
import { addDays, dateLabel, studioTime, peso } from '../lib/format';
import { useDemo } from '../lib/demo';
import type { Member, Wallet } from '../lib/types';
import { Avatar, Badge, Button, Chip, Empty, Field, Icon, PageTitle, Panel, Sheet, Tabs, cx } from '../ui/kit';
import { LocationSwitch } from '../ui/layouts';
import { classHistory, className, isMemberPlan, purchasesFor, statsFor } from './ClientsData';

type Filter = 'all' | 'members' | 'pass' | 'first' | 'retreat' | 'waiver';
const FILTERS: { v: Filter; l: string; test: (m: Member) => boolean }[] = [
  { v: 'all', l: 'All', test: () => true },
  { v: 'members', l: 'Members', test: (m) => statsFor(m.id).activeWallets.some(isMemberPlan) },
  { v: 'pass', l: 'Pass holders', test: (m) => statsFor(m.id).activeWallets.some((w) => !isMemberPlan(w)) },
  { v: 'first', l: 'First-timers', test: (m) => m.tags.includes('First-timer') },
  { v: 'retreat', l: 'Retreat guests', test: (m) => statsFor(m.id).retreatGuest },
  { v: 'waiver', l: 'Waiver missing', test: (m) => !m.waiverSigned },
];

const shortDate = (iso: string) => dateLabel(iso).replace(/ \d{4}$/, '');

type Frozen = Record<string, string | null>;
const frozenUntilOf = (w: Wallet, frozen: Frozen) => (w.id in frozen ? frozen[w.id] : w.status === 'frozen' ? w.frozenUntil ?? null : null);

function walletLabel(w: Wallet, frozen: Frozen) {
  const p = PRODUCT[w.productId];
  if (frozenUntilOf(w, frozen)) return { tone: 'blue' as const, text: `${p.name} · frozen` };
  if (w.creditsLeft === null) return { tone: 'teal' as const, text: p.name };
  return { tone: 'green' as const, text: `${p.name} · ${w.creditsLeft} left` };
}

export default function AdminClients() {
  const { adminLoc } = useDemo();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [tags, setTags] = useState<Record<string, string[]>>({});
  const [frozen, setFrozen] = useState<Frozen>({});

  const inLoc = useMemo(() => members.filter((m) => adminLoc === 'all' || m.homeLocation === adminLoc), [adminLoc]);
  const searched = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? inLoc.filter((m) => `${m.name} ${m.email} ${m.country} ${m.phone}`.toLowerCase().includes(s)) : inLoc;
  }, [inLoc, q]);
  const rows = searched.filter(FILTERS.find((f) => f.v === filter)!.test);

  const openId = params.get('member');
  const open = openId ? members.find((m) => m.id === openId) : undefined;
  const close = useCallback(() => setParams((p) => { p.delete('member'); return p; }, { replace: true }), [setParams]);

  return (
    <div className="text-[14px]">
      <PageTitle admin title="Clients" subtitle={`${inLoc.length} people${adminLoc === 'all' ? '' : ` with ${LOC[adminLoc].name} as home studio`}`} actions={<LocationSwitch />} />

      <div className="flex flex-col gap-3 mb-4">
        <div className="relative max-w-[420px]">
          <Icon name="ri-search-line" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ink-3)]" />
          <input className="input" style={{ paddingLeft: 38 }} placeholder="Search name, email, country or phone" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="flex gap-1.5 overflow-x-auto no-bar -mx-3 px-3 md:mx-0 md:px-0 pb-1">
          {FILTERS.map((f) => <Chip key={f.v} active={filter === f.v} onClick={() => setFilter(f.v)} count={searched.filter(f.test).length}>{f.l}</Chip>)}
        </div>
      </div>

      <Panel pad={false} className="overflow-hidden">
        {rows.length === 0 ? <Empty icon="ri-user-search-line" title="No clients match">Try another name or filter.</Empty> : (
          <div className="overflow-x-auto">
            <table className="tbl min-w-[860px]">
              <thead><tr><th>Name</th><th>Country</th><th>Home studio</th><th>Pass or membership</th><th className="r">Visits</th><th>Last visit</th><th className="r">Lifetime spend</th></tr></thead>
              <tbody>
                {rows.map((m) => {
                  const st = statsFor(m.id);
                  const w = st.activeWallets[0];
                  return (
                    <tr key={m.id} className="clickable" onClick={() => setParams({ member: m.id })}>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <Avatar name={m.name} size={30} />
                          <span className="font-medium whitespace-nowrap">{m.name}</span>
                          {!m.waiverSigned && <Icon name="ri-file-warning-line" className="text-[var(--warn)]" />}
                        </div>
                      </td>
                      <td className="text-[var(--ink-2)] whitespace-nowrap">{m.country}</td>
                      <td className="whitespace-nowrap">{LOC[m.homeLocation].name}</td>
                      <td>{w ? <Badge tone={walletLabel(w, frozen).tone}>{walletLabel(w, frozen).text}</Badge> : <span className="text-[var(--ink-3)]">—</span>}</td>
                      <td className="r num">{st.visits}</td>
                      <td className="num text-[var(--ink-2)] whitespace-nowrap">{st.lastVisit ? shortDate(st.lastVisit) : '—'}</td>
                      <td className="r num font-medium">{peso(st.spend)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      <p className="text-[12.5px] text-[var(--ink-3)] mt-3 flex items-center gap-1.5"><Icon name="ri-file-warning-line" className="text-[var(--warn)]" />Waiver not signed yet</p>

      {open && (
        <ClientSheet key={open.id} member={open} onClose={close}
          tags={tags[open.id] ?? open.tags} setTags={(t) => setTags((x) => ({ ...x, [open.id]: t }))}
          frozen={frozen} setFrozen={(id, until) => setFrozen((f) => ({ ...f, [id]: until }))} />
      )}
    </div>
  );
}

type ProfileTab = 'overview' | 'bookings' | 'purchases' | 'timeline';

type FreezeProps = { frozen: Frozen; setFrozen: (walletId: string, until: string | null) => void };

function ClientSheet({ member: m, onClose, tags, setTags, frozen, setFrozen }: { member: Member; onClose: () => void; tags: string[]; setTags: (t: string[]) => void } & FreezeProps) {
  const { toast } = useDemo();
  const [tab, setTab] = useState<ProfileTab>('overview');
  const [newTag, setNewTag] = useState('');
  const first = m.name.split(' ')[0];

  const addTag = () => {
    const t = newTag.trim();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setNewTag('');
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } };

  return (
    <Sheet open wide onClose={onClose}
      title={<div className="flex items-center gap-3"><Avatar name={m.name} size={44} /><div className="min-w-0"><div className="truncate">{m.name}</div><div className="text-[13px] font-normal text-[var(--ink-2)]">{m.country} · {LOC[m.homeLocation].name}</div></div></div>}>
      <div className="space-y-5">
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-[14px]">
          <a href={`mailto:${m.email}`} className="flex items-center gap-2 text-[var(--ink-2)] hover:text-[var(--ink)] min-w-0"><Icon name="ri-mail-line" /><span className="truncate">{m.email}</span></a>
          <span className="flex items-center gap-2 text-[var(--ink-2)] num"><Icon name="ri-phone-line" />{m.phone}</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {tags.map((t) => (
            <span key={t} className="inline-flex items-center gap-1 h-7 pl-2.5 pr-1 rounded-full bg-[var(--teal-soft)] text-[var(--teal)] text-[12.5px] font-medium">
              {t}
              <button type="button" aria-label={`Remove ${t}`} onClick={() => setTags(tags.filter((x) => x !== t))} className="w-5 h-5 rounded-full hover:bg-[rgba(7,80,86,0.12)] inline-flex items-center justify-center"><Icon name="ri-close-line" /></button>
            </span>
          ))}
          <input value={newTag} onChange={(e) => setNewTag(e.target.value)} onKeyDown={onKey} onBlur={addTag} placeholder="Add tag"
            className="h-7 w-[96px] px-2.5 rounded-full border border-dashed border-[var(--line-2)] bg-transparent text-[12.5px] outline-none focus:border-[var(--teal)]" />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" icon="ri-calendar-check-line" onClick={() => toast(`${first} booked into tomorrow's Sunset Flow`)}>Book into class</Button>
          <Button size="sm" variant="secondary" icon="ri-coupon-3-line" onClick={() => toast(`Payment link for a 10-class pass sent to ${first}`)}>Sell pass</Button>
          <Button size="sm" variant="secondary" icon="ri-whatsapp-line" onClick={() => toast(`WhatsApp chat with ${first} opened`, 'info')}>Message</Button>
        </div>

        <Tabs<ProfileTab> value={tab} onChange={setTab} options={[
          { value: 'overview', label: 'Overview' }, { value: 'bookings', label: 'Bookings' },
          { value: 'purchases', label: 'Purchases' }, { value: 'timeline', label: 'Timeline' },
        ]} />

        {tab === 'overview' && <Overview m={m} frozen={frozen} setFrozen={setFrozen} />}
        {tab === 'bookings' && <Bookings m={m} />}
        {tab === 'purchases' && <Purchases m={m} />}
        {tab === 'timeline' && <Timeline m={m} />}
      </div>
    </Sheet>
  );
}

function Overview({ m, frozen, setFrozen }: { m: Member } & FreezeProps) {
  const st = statsFor(m.id);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-2">
        {[['Visits', String(st.visits)], ['Lifetime spend', peso(st.spend)], ['Client since', dateLabel(st.since).replace(/^\d+ /, '')]].map(([k, v]) => (
          <div key={k} className="rounded-2xl border border-[var(--line)] bg-white p-3">
            <div className="text-[12.5px] text-[var(--ink-2)]">{k}</div>
            <div className="num text-[17px] font-semibold mt-0.5 truncate">{v}</div>
          </div>
        ))}
      </div>

      <div>
        <div className="text-[13px] font-medium text-[var(--ink-2)] mb-2">Passes and memberships</div>
        {st.activeWallets.length === 0
          ? <div className="rounded-2xl border border-dashed border-[var(--line-2)] p-4 text-[var(--ink-2)]">Nothing active. Last pass ran out or this is a drop-in guest.</div>
          : <div className="space-y-2">{st.activeWallets.map((w) => <WalletRow key={w.id} w={w} frozenUntil={frozenUntilOf(w, frozen)} setFrozenUntil={(u) => setFrozen(w.id, u)} />)}</div>}
      </div>

      <Field label="Notes" hint="Only staff see notes.">
        <textarea className="input" rows={3} defaultValue={m.notes} placeholder="Injuries, preferences, anything the next teacher should know" />
      </Field>
    </div>
  );
}

function WalletRow({ w, frozenUntil, setFrozenUntil }: { w: Wallet; frozenUntil: string | null; setFrozenUntil: (u: string | null) => void }) {
  const { toast } = useDemo();
  const p = PRODUCT[w.productId];
  const [freezing, setFreezing] = useState(false);
  const [until, setUntil] = useState(addDays(TODAY_KEY, 14));
  const plan = isMemberPlan(w);
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-medium">{p.name}</div>
          <div className="text-[13px] text-[var(--ink-2)] mt-0.5 num">
            {w.creditsTotal === null ? (plan ? 'Renews' : 'Expires') : `${w.creditsLeft} of ${w.creditsTotal} classes left · expires`} {dateLabel(w.expiresAt)}
          </div>
          {w.creditsTotal !== null && (
            <div className="mt-2 h-1.5 w-40 max-w-full rounded-full bg-[rgba(36,48,55,0.08)] overflow-hidden">
              <div className="h-full bg-[#5e9aa3] rounded-full" style={{ width: `${(w.creditsLeft / w.creditsTotal) * 100}%` }} />
            </div>
          )}
        </div>
        {plan && (frozenUntil
          ? <div className="flex flex-col items-end gap-1.5"><Badge tone="blue">Frozen until {dateLabel(frozenUntil)}</Badge>
              <button type="button" className="text-[13px] text-[var(--teal)] font-medium" onClick={() => { setFrozenUntil(null); toast(`${p.name} unfrozen`); }}>Unfreeze</button></div>
          : !freezing && <Button size="sm" variant="secondary" icon="ri-snowflake-line" onClick={() => setFreezing(true)}>Freeze</Button>)}
      </div>
      {freezing && (
        <div className="mt-3 pt-3 border-t border-[var(--line)] flex flex-wrap items-end gap-2">
          <label className="flex-1 min-w-[160px]">
            <span className="block text-[13px] text-[var(--ink-2)] mb-1">Freeze until</span>
            <input type="date" className="input" value={until} min={TODAY_KEY} onChange={(e) => setUntil(e.target.value)} />
          </label>
          <Button variant="ghost" onClick={() => setFreezing(false)}>Cancel</Button>
          <Button onClick={() => { setFrozenUntil(until); setFreezing(false); toast(`Frozen until ${dateLabel(until)}. Renewal moves back to match.`); }}>Freeze</Button>
        </div>
      )}
    </div>
  );
}

const VISIT_BADGE = {
  booked: ['teal', 'Booked'], checked_in: ['green', 'Checked in'], no_show: ['red', 'No-show'], late_cancel: ['amber', 'Late cancel'],
} as const;

function Bookings({ m }: { m: Member }) {
  const list = classHistory(m).slice(0, 12);
  if (!list.length) return <Empty icon="ri-calendar-line" title="No classes in the last week">Bookings show here as they come in.</Empty>;
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white divide-y divide-[var(--line)]">
      {list.map(({ session: s, status }) => {
        const [tone, label] = VISIT_BADGE[status];
        return (
          <div key={s.id} className="flex items-center gap-3 px-4 py-3">
            <div className="w-[76px] flex-shrink-0 num text-[13px]">
              <div className="font-medium">{shortDate(s.start)}</div>
              <div className="text-[var(--ink-3)]">{studioTime(s.start)}</div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{className(s)}</div>
              <div className="text-[13px] text-[var(--ink-2)]">{LOC[s.locationId!].name}</div>
            </div>
            <Badge tone={tone}>{label}</Badge>
          </div>
        );
      })}
    </div>
  );
}

const ORDER_BADGE = { paid: ['green', 'Paid'], refunded: ['gray', 'Refunded'], failed: ['red', 'Failed'], pending: ['amber', 'Pending'] } as const;

function Purchases({ m }: { m: Member }) {
  const list = purchasesFor(m);
  if (!list.length) return <Empty icon="ri-shopping-bag-3-line" title="No purchases yet" />;
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white divide-y divide-[var(--line)]">
      {list.map((o) => {
        const [tone, label] = ORDER_BADGE[o.status];
        return (
          <div key={o.id} className="flex items-center gap-3 px-4 py-3">
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{o.items[0].label}</div>
              <div className="text-[13px] text-[var(--ink-2)] num">{o.number} · {dateLabel(o.createdAt)}</div>
            </div>
            {o.status !== 'paid' && <Badge tone={tone}>{label}</Badge>}
            <div className={cx('num font-medium', o.status === 'refunded' && 'line-through text-[var(--ink-3)]')}>{peso(o.total)}</div>
          </div>
        );
      })}
    </div>
  );
}

function Timeline({ m }: { m: Member }) {
  const events: { at: string; icon: string; text: string }[] = [
    { at: statsFor(m.id).since, icon: 'ri-user-add-line', text: 'Created an account' },
    ...(m.waiverSigned ? [{ at: statsFor(m.id).since, icon: 'ri-quill-pen-line', text: 'Signed the waiver' }] : []),
    ...purchasesFor(m).map((o) => ({ at: o.createdAt, icon: o.status === 'refunded' ? 'ri-refund-2-line' : o.status === 'failed' ? 'ri-error-warning-line' : 'ri-shopping-bag-3-line',
      text: `${o.status === 'failed' ? 'Payment failed for' : o.status === 'refunded' ? 'Refunded' : 'Bought'} ${o.items[0].label}` })),
    ...classHistory(m).filter((v) => v.status !== 'booked').slice(0, 5).map((v) => ({ at: v.session.start, icon: v.status === 'checked_in' ? 'ri-checkbox-circle-line' : 'ri-close-circle-line',
      text: `${VISIT_BADGE[v.status][1]} · ${className(v.session)}` })),
    ...retreatBookings.filter((b) => b.memberId === m.id).map((b) => ({ at: b.createdAt, icon: 'ri-sun-line',
      text: `Booked ${RETREAT[b.retreatId].title}${b.paid < b.total ? ' (deposit)' : ''}` })),
  ].sort((a, b) => b.at.localeCompare(a.at));
  return (
    <ol className="relative pl-6">
      <span className="absolute left-[11px] top-2 bottom-2 w-px bg-[var(--line-2)]" aria-hidden="true" />
      {events.slice(0, 14).map((e, i) => (
        <li key={i} className="relative pb-4 last:pb-0">
          <span className="absolute -left-6 top-0 w-[23px] h-[23px] rounded-full bg-white border border-[var(--line-2)] flex items-center justify-center text-[12px] text-[var(--teal)]"><Icon name={e.icon} /></span>
          <div className="text-[14px]">{e.text}</div>
          <div className="text-[12.5px] text-[var(--ink-3)] num">{dateLabel(e.at)} · {studioTime(e.at)}</div>
        </li>
      ))}
    </ol>
  );
}

