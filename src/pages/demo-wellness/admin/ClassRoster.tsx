// Studio admin — class roster (/admin/classes/:sessionId). Check-in, walk-ins,
// no-show / late-cancel with fee, and the waitlist. Local state only.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CLASS, LOC, PRODUCT, TEACHER, members, rosterFor, sessions, waitlistCount, wallets } from '../lib/data';
import { dayLabel, peso, studioDateKey, studioTime } from '../lib/format';
import { to, useDemo } from '../lib/demo';
import type { Member, Session } from '../lib/types';
import { Avatar, Badge, Button, Empty, FillBar, Icon, OptionCard, PageTitle, Panel, SectionTitle, Sheet, Toggle, cx } from '../ui/kit';

// Same defaults as Staff & settings → Policies.
const FEES = { late_cancel: 350, no_show: 500 } as const;

type RowStatus = 'booked' | 'no_show' | 'late_cancel';
interface Row { id: string; member: Member | null; name: string; country: string; pass: string; waiver: boolean; notes: string; firstVisit: boolean; checkedIn: boolean; status: RowStatus; walkIn?: boolean }

function passFor(m: Member) {
  const w = wallets.find((x) => x.memberId === m.id && (x.status === 'active' || x.status === 'frozen'));
  if (!w) return 'Drop-in';
  const p = PRODUCT[w.productId];
  return w.creditsLeft === null ? p.name : `${p.name} · ${w.creditsLeft} left`;
}

function toRow(m: Member, checkedIn: boolean): Row {
  return { id: m.id, member: m, name: m.name, country: m.country, pass: passFor(m), waiver: m.waiverSigned, notes: m.notes,
    firstVisit: m.tags.includes('First-timer'), checkedIn, status: 'booked' };
}

export default function AdminClassRoster() {
  const { sessionId } = useParams();
  const s = sessions.find((x) => x.id === sessionId);
  if (!s) {
    return (
      <Panel>
        <Empty icon="ri-calendar-close-line" title="Class not found">
          <Link to={to('/admin/schedule')} className="text-[var(--teal)] font-medium">Back to schedule</Link>
        </Empty>
      </Panel>
    );
  }
  return <Roster key={s.id} s={s} />;
}

function Roster({ s }: { s: Session }) {
  const { toast } = useDemo();
  const c = CLASS[s.classTypeId];
  const t = TEACHER[s.instructorId];
  const started = s.start <= new Date().toISOString();
  const ended = new Date(s.start).getTime() + c.duration * 60000 < Date.now();

  const seed = useMemo(() => rosterFor(s), [s]);
  const [rows, setRows] = useState<Row[]>(() =>
    seed.map((m, i) => toRow(m, ended ? i !== seed.length - 1 : started ? i % 3 !== 2 : false)));
  const [waitlist, setWaitlist] = useState<Member[]>(() => {
    const inClass = new Set(seed.map((m) => m.id));
    return members.filter((m) => !inClass.has(m.id) && (s.locationId === null || m.homeLocation === s.locationId)).slice(0, waitlistCount(s));
  });
  const [walkIn, setWalkIn] = useState(false);
  const [feeFor, setFeeFor] = useState<{ id: string; kind: Exclude<RowStatus, 'booked'> } | null>(null);
  const [menu, setMenu] = useState<string | null>(null);

  const present = rows.filter((r) => r.status === 'booked');
  const checked = present.filter((r) => r.checkedIn).length;
  const place = s.locationId ? `${LOC[s.locationId].name} · ${LOC[s.locationId].rooms.find((r) => r.id === s.roomId)?.name}` : 'Online · Zoom';
  const update = (id: string, p: Partial<Row>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...p } : r)));

  return (
    <div className="text-[14px]">
      <Link to={to('/admin/schedule')} className="inline-flex items-center gap-1 text-[13.5px] text-[var(--ink-2)] hover:text-[var(--ink)] mb-3">
        <Icon name="ri-arrow-left-s-line" className="text-[17px]" />Schedule
      </Link>
      <PageTitle admin title={<span className={cx(s.status === 'cancelled' && 'line-through')}>{c.name}</span>}
        subtitle={<span className="num">{dayLabel(studioDateKey(s.start), { weekday: 'long' })} · {studioTime(s.start)} · {t.name} · {place}</span>}
        actions={<>
          <Button size="sm" icon="ri-user-add-line" onClick={() => setWalkIn(true)}>Add walk-in</Button>
          <Button size="sm" variant="secondary" icon="ri-message-3-line" onClick={() => toast(`Message sent to ${present.length} students by email + WhatsApp`)}>Message class</Button>
          <Button size="sm" variant="secondary" icon="ri-printer-line" onClick={() => toast('Roster sent to the front-desk printer')}>Print</Button>
        </>} />

      {s.status === 'cancelled' && (
        <div className="rounded-2xl bg-[rgba(179,55,43,0.06)] px-4 py-3 mb-4 text-[13.5px]"><span className="font-medium text-[var(--bad)]">Cancelled.</span> <span className="text-[var(--ink-2)]">{s.cancelNote}</span></div>
      )}

      <Panel className="mb-4">
        <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-8">
          <div>
            <div className="num text-[28px] font-semibold tracking-tight leading-none">{checked} <span className="text-[var(--ink-3)] font-normal text-[18px]">of {present.length} checked in</span></div>
            <div className="text-[13px] text-[var(--ink-2)] mt-2 num">{present.length} booked · {s.capacity} spots{waitlist.length ? ` · ${waitlist.length} waiting` : ''}</div>
          </div>
          <FillBar booked={checked} capacity={Math.max(1, present.length)} showLabel={false} className="flex-1 sm:pb-1" />
        </div>
      </Panel>

      <Panel pad={false}>
        <div className="overflow-x-auto">
          <table className="tbl min-w-[760px]">
            <thead>
              <tr><th>Client</th><th>Country</th><th>Pass used</th><th>Waiver</th><th aria-label="Notes" /><th>Checked in</th><th aria-label="Actions" /></tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => {
                const out = r.status !== 'booked';
                return (
                  <tr key={r.id} className={cx(out && 'opacity-60')}>
                    <td>
                      <div className="flex items-center gap-2.5 py-2">
                        <Avatar name={r.name} size={30} />
                        {r.member
                          ? <Link to={to(`/admin/clients?member=${r.id}`)} className="font-medium hover:text-[var(--teal)] whitespace-nowrap">{r.name}</Link>
                          : <span className="font-medium whitespace-nowrap">{r.name}</span>}
                        {r.firstVisit && <Badge tone="blue" dot={false}>First visit</Badge>}
                        {r.walkIn && <Badge tone="gray" dot={false}>Walk-in</Badge>}
                      </div>
                    </td>
                    <td className="text-[var(--ink-2)] whitespace-nowrap">{r.country}</td>
                    <td className="whitespace-nowrap num">{r.pass}</td>
                    <td>{r.waiver ? <Badge tone="green">Signed</Badge> : <Badge tone="amber">Missing</Badge>}</td>
                    <td className="w-10">{r.notes && <NoteTip text={r.notes} />}</td>
                    <td>
                      {out ? <Badge tone="red">{r.status === 'no_show' ? 'No-show' : 'Late cancel'}</Badge>
                        : <Toggle on={r.checkedIn} label={`Check in ${r.name}`} onChange={(v) => update(r.id, { checkedIn: v })} />}
                    </td>
                    <td className="r w-12">
                      {!out && (
                        <RowMenu up={rows.length > 3 && idx >= rows.length - 2} open={menu === r.id} onToggle={(o) => setMenu(o ? r.id : null)}
                          onPick={(kind) => { setMenu(null); setFeeFor({ id: r.id, kind }); }} />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      {waitlist.length > 0 && (
        <div className="mt-6">
          <SectionTitle>Waitlist</SectionTitle>
          <Panel pad={false}>
            <ul className="divide-y divide-[var(--line)]">
              {waitlist.map((m, i) => (
                <li key={m.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="num w-5 text-[var(--ink-3)]">{i + 1}</span>
                  <Avatar name={m.name} size={30} />
                  <Link to={to(`/admin/clients?member=${m.id}`)} className="font-medium flex-1 min-w-0 truncate hover:text-[var(--teal)]">{m.name}</Link>
                  <Button size="sm" variant="quiet" onClick={() => {
                    setWaitlist((w) => w.filter((x) => x.id !== m.id));
                    setRows((rs) => [...rs, toRow(m, false)]);
                    toast(`${m.name} moved into the class · email sent`);
                  }}>Move into class</Button>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      )}

      <WalkInSheet open={walkIn} onClose={() => setWalkIn(false)} exclude={rows.map((r) => r.id)}
        onAdd={(row) => { setRows((rs) => [...rs, row]); setWalkIn(false); toast(`${row.name} added and checked in`); }} />

      <FeeSheet target={feeFor ? { ...feeFor, name: rows.find((r) => r.id === feeFor.id)?.name ?? '' } : null} onClose={() => setFeeFor(null)}
        onConfirm={(waived) => {
          const r = rows.find((x) => x.id === feeFor!.id)!;
          update(r.id, { status: feeFor!.kind, checkedIn: false });
          toast(`${r.name} marked as ${feeFor!.kind === 'no_show' ? 'no-show' : 'late cancel'} · ${waived ? 'fee waived' : `${peso(FEES[feeFor!.kind])} charged`}`);
          setFeeFor(null);
        }} />
    </div>
  );
}

function NoteTip({ text }: { text: string }) {
  return (
    <span className="relative group inline-flex">
      <button type="button" aria-label={`Note: ${text}`} title={text}
        className="w-8 h-8 rounded-full inline-flex items-center justify-center text-[var(--ink-2)] hover:bg-[rgba(36,48,55,0.06)]">
        <Icon name="ri-sticky-note-line" className="text-[16px]" />
      </button>
      <span role="tooltip" className="pointer-events-none absolute z-20 right-full mr-1.5 top-1/2 -translate-y-1/2 w-[220px] rounded-xl bg-[#1f2b31] text-white text-[12.5px] leading-snug px-3 py-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
        {text}
      </span>
    </span>
  );
}

function RowMenu({ open, up, onToggle, onPick }: { open: boolean; up?: boolean; onToggle: (o: boolean) => void; onPick: (k: 'no_show' | 'late_cancel') => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const off = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) onToggle(false); };
    document.addEventListener('mousedown', off);
    return () => document.removeEventListener('mousedown', off);
  }, [open, onToggle]);
  return (
    <div ref={ref} className="relative inline-block">
      <button type="button" aria-label="More actions" aria-expanded={open} onClick={() => onToggle(!open)}
        className="w-8 h-8 rounded-full inline-flex items-center justify-center hover:bg-[rgba(36,48,55,0.07)]">
        <Icon name="ri-more-2-fill" className="text-[17px]" />
      </button>
      {open && (
        <div className={cx('absolute right-0 z-30 w-[170px] paper rounded-xl py-1 text-left', up ? 'bottom-full mb-1' : 'top-full mt-1')}>
          <button type="button" className="w-full text-left px-3.5 py-2 hover:bg-[rgba(7,80,86,0.05)]" onClick={() => onPick('no_show')}>Mark no-show</button>
          <button type="button" className="w-full text-left px-3.5 py-2 hover:bg-[rgba(7,80,86,0.05)]" onClick={() => onPick('late_cancel')}>Late cancel</button>
        </div>
      )}
    </div>
  );
}

function FeeSheet({ target, onClose, onConfirm }: { target: { id: string; kind: 'no_show' | 'late_cancel'; name: string } | null; onClose: () => void; onConfirm: (waived: boolean) => void }) {
  const [waive, setWaive] = useState(false);
  useEffect(() => setWaive(false), [target?.id, target?.kind]);
  if (!target) return null;
  const label = target.kind === 'no_show' ? 'no-show' : 'late-cancel';
  return (
    <Sheet open onClose={onClose} title={target.kind === 'no_show' ? 'Mark no-show' : 'Late cancel'} subtitle={target.name}
      footer={<div className="flex gap-2 justify-end">
        <Button variant="ghost" onClick={onClose}>Back</Button>
        <Button onClick={() => onConfirm(waive)}>Confirm</Button>
      </div>}>
      <div className="space-y-4">
        <p className="text-[var(--ink-2)]">
          {target.kind === 'no_show' ? 'They booked and did not come. The credit is used.' : 'Cancelled inside the 12-hour window. The credit is used.'}
        </p>
        <div className="rounded-2xl border border-[var(--line-2)] bg-white px-4 py-3 flex items-center justify-between">
          <span>{label.charAt(0).toUpperCase() + label.slice(1)} fee</span>
          <span className={cx('num font-medium', waive && 'line-through text-[var(--ink-3)]')}>{peso(FEES[target.kind])}</span>
        </div>
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input type="checkbox" checked={waive} onChange={(e) => setWaive(e.target.checked)} className="w-[18px] h-[18px] accent-[var(--teal)]" />
          Waive fee
        </label>
      </div>
    </Sheet>
  );
}

type Pay = 'cash' | 'card' | 'pass';

function WalkInSheet({ open, onClose, exclude, onAdd }: { open: boolean; onClose: () => void; exclude: string[]; onAdd: (r: Row) => void }) {
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<Member | null>(null);
  const [newName, setNewName] = useState('');
  const [pay, setPay] = useState<Pay>('cash');
  useEffect(() => { if (open) { setQ(''); setPicked(null); setNewName(''); setPay('cash'); } }, [open]);

  const matches = q.trim() ? members.filter((m) => !exclude.includes(m.id) && m.name.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 5) : [];
  const hasPass = picked ? passFor(picked) !== 'Drop-in' : false;
  const name = picked?.name ?? newName.trim();

  return (
    <Sheet open={open} onClose={onClose} title="Add walk-in"
      footer={<div className="flex gap-2 justify-end">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button disabled={!name} onClick={() => {
          const base: Row = picked ? toRow(picked, true)
            : { id: `walk-${Date.now()}`, member: null, name, country: '—', pass: '', waiver: false, notes: '', firstVisit: true, checkedIn: true, status: 'booked' };
          onAdd({ ...base, walkIn: true, checkedIn: true, pass: pay === 'pass' && picked ? passFor(picked) : `Drop-in · ${pay}` });
        }}>Add to class</Button>
      </div>}>
      <div className="space-y-5">
        {picked ? (
          <div className="flex items-center gap-3 rounded-2xl border border-[var(--teal)] bg-white px-4 py-3">
            <Avatar name={picked.name} size={32} />
            <div className="flex-1 min-w-0"><div className="font-medium">{picked.name}</div><div className="text-[13px] text-[var(--ink-2)]">{passFor(picked)}</div></div>
            <Button size="sm" variant="ghost" onClick={() => { setPicked(null); setPay('cash'); }}>Change</Button>
          </div>
        ) : (
          <>
            <label className="block">
              <span className="block text-[13px] font-medium text-[var(--ink-2)] mb-1.5">Find a client</span>
              <div className="relative">
                <Icon name="ri-search-line" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ink-3)]" />
                <input className="input !pl-10" value={q} placeholder="Name" onChange={(e) => setQ(e.target.value)} />
              </div>
            </label>
            {matches.length > 0 && (
              <ul className="rounded-2xl border border-[var(--line-2)] bg-white divide-y divide-[var(--line)] overflow-hidden -mt-2">
                {matches.map((m) => (
                  <li key={m.id}>
                    <button type="button" className="w-full text-left flex items-center gap-3 px-4 py-2.5 hover:bg-[rgba(7,80,86,0.04)]"
                      onClick={() => { setPicked(m); if (passFor(m) !== 'Drop-in') setPay('pass'); }}>
                      <Avatar name={m.name} size={28} /><span className="flex-1">{m.name}</span><span className="text-[12.5px] text-[var(--ink-3)]">{m.country}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <label className="block">
              <span className="block text-[13px] font-medium text-[var(--ink-2)] mb-1.5">Or a new guest</span>
              <input className="input" value={newName} placeholder="Full name" onChange={(e) => setNewName(e.target.value)} />
            </label>
          </>
        )}
        <div>
          <div className="text-[13px] font-medium text-[var(--ink-2)] mb-2">Payment</div>
          <div className="space-y-2">
            <OptionCard selected={pay === 'cash'} onSelect={() => setPay('cash')} title="Drop-in, cash" right={peso(750)} />
            <OptionCard selected={pay === 'card'} onSelect={() => setPay('card')} title="Drop-in, card" meta="Tap on the front-desk reader" right={peso(750)} />
            <OptionCard selected={pay === 'pass'} onSelect={() => setPay('pass')} disabled={!hasPass} title="Use their pass"
              meta={hasPass ? passFor(picked!) : 'Pick a client with an active pass'} />
          </div>
        </div>
      </div>
    </Sheet>
  );
}
