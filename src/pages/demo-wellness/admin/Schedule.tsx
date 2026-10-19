// Studio admin — Schedule. Week grid on desktop, day tabs on mobile. Class
// sheet handles substitutes, series edits and cancellations (all local state).

import { ReactNode, useCallback, useMemo, useState } from 'react';
import { CLASS, LOC, TEACHER, TODAY_KEY, bookedCount, classTypes, instructors, sessions as seedSessions, waitlistCount } from '../lib/data';
import { addDays, dayLabel, peso, rangeLabel, studioDateKey, studioInstant, studioTime } from '../lib/format';
import { to, useDemo } from '../lib/demo';
import type { Session } from '../lib/types';
import { Badge, Button, ButtonLink, Field, FillBar, Icon, OptionCard, PageTitle, Panel, Rows, Sheet, Toggle, cx } from '../ui/kit';
import { LocationSwitch } from '../ui/layouts';

const dowOf = (key: string) => { const [y, m, d] = key.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); };
const mondayOf = (key: string) => addDays(key, -((dowOf(key) + 6) % 7));
const placeOf = (s: Session) => (s.locationId ? `${LOC[s.locationId].name} · ${LOC[s.locationId].rooms.find((r) => r.id === s.roomId)?.name}` : 'Online · Zoom');
const endTime = (s: Session) => studioTime(new Date(new Date(s.start).getTime() + CLASS[s.classTypeId].duration * 60000).toISOString());

const ROOMS = [
  { id: 'beach:ocean', label: 'Seaside · Ocean room', cap: 18 },
  { id: 'beach:garden', label: 'Seaside · Garden deck', cap: 10 },
  { id: 'town:palm', label: 'Downtown · Main room', cap: 14 },
  { id: 'online:', label: 'Online · Zoom', cap: 60 },
];

export default function AdminSchedule() {
  const { adminLoc, toast } = useDemo();
  const thisMonday = mondayOf(TODAY_KEY);
  const [week, setWeek] = useState(0);
  const monday = addDays(thisMonday, week * 7);
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const [day, setDay] = useState(() => TODAY_KEY);
  const activeDay = days.includes(day) ? day : days[0];

  const [added, setAdded] = useState<Session[]>([]);
  const [overrides, setOverrides] = useState<Record<string, Partial<Session>>>({});
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const all = useMemo(() => [...seedSessions, ...added].map((s) => (overrides[s.id] ? { ...s, ...overrides[s.id] } : s)), [added, overrides]);
  const visible = all.filter((s) => adminLoc === 'all' || s.locationId === adminLoc);
  const byDay = (key: string) => visible.filter((s) => studioDateKey(s.start) === key).sort((a, b) => a.start.localeCompare(b.start));
  const open = all.find((s) => s.id === openId) ?? null;
  const patch = (id: string, p: Partial<Session>) => setOverrides((o) => ({ ...o, [id]: { ...o[id], ...p } }));

  return (
    <div className="text-[14px]">
      <PageTitle admin title="Schedule" subtitle={rangeLabel(days[0], days[6])}
        actions={<>
          <div className="inline-flex items-center gap-1 p-1 rounded-full bg-[rgba(36,48,55,0.06)]">
            <button type="button" aria-label="Previous week" disabled={week <= -1} onClick={() => setWeek((w) => w - 1)}
              className="w-8 h-8 rounded-full inline-flex items-center justify-center hover:bg-white disabled:opacity-35"><Icon name="ri-arrow-left-s-line" className="text-[18px]" /></button>
            <button type="button" onClick={() => { setWeek(0); setDay(TODAY_KEY); }}
              className={cx('h-8 px-3 rounded-full text-[13px] font-medium', week === 0 ? 'bg-white shadow-[0_1px_3px_rgba(36,48,55,0.12)]' : 'text-[var(--ink-2)] hover:text-[var(--ink)]')}>This week</button>
            <button type="button" aria-label="Next week" disabled={week >= 2} onClick={() => setWeek((w) => w + 1)}
              className="w-8 h-8 rounded-full inline-flex items-center justify-center hover:bg-white disabled:opacity-35"><Icon name="ri-arrow-right-s-line" className="text-[18px]" /></button>
          </div>
          <LocationSwitch />
          <Button size="sm" icon="ri-add-line" onClick={() => setAdding(true)}>Add class</Button>
        </>} />

      {/* Desktop week grid */}
      <Panel pad={false} className="hidden lg:block overflow-hidden">
        <div className="grid grid-cols-7 divide-x divide-[var(--line)]">
          {days.map((k) => {
            const isToday = k === TODAY_KEY;
            const [wd, dn] = dayLabel(k).split(' ');
            return (
              <div key={k} className="min-w-0">
                <div className={cx('px-3 py-3 border-b border-[var(--line)] flex items-baseline gap-1.5', isToday && 'bg-[var(--teal-soft)]')}>
                  <span className={cx('text-[13px]', isToday ? 'text-[var(--teal)] font-semibold' : 'text-[var(--ink-2)]')}>{wd}</span>
                  <span className={cx('num text-[15px] font-semibold', isToday && 'text-[var(--teal)]')}>{dn}</span>
                </div>
                <div className="p-2 space-y-2 min-h-[420px]">
                  {byDay(k).map((s) => <ClassCard key={s.id} s={s} onOpen={() => setOpenId(s.id)} />)}
                  {byDay(k).length === 0 && <div className="text-[12.5px] text-[var(--ink-3)] px-1 py-2">No classes</div>}
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      {/* Mobile: day tabs + list */}
      <div className="lg:hidden">
        <div className="flex gap-1.5 overflow-x-auto no-bar -mx-3 px-3 pb-3">
          {days.map((k) => {
            const [wd, dn] = dayLabel(k).split(' ');
            const on = k === activeDay;
            return (
              <button key={k} type="button" onClick={() => setDay(k)} aria-pressed={on}
                className={cx('flex-shrink-0 w-[52px] h-[58px] rounded-2xl border flex flex-col items-center justify-center',
                  on ? 'bg-[var(--teal)] border-[var(--teal)] text-white' : 'bg-white/80 border-[var(--line-2)] text-[var(--ink-2)]')}>
                <span className="text-[12px]">{wd}</span>
                <span className={cx('num text-[16px] font-semibold', !on && k === TODAY_KEY && 'text-[var(--teal)]')}>{dn}</span>
              </button>
            );
          })}
        </div>
        <Panel pad={false}>
          {byDay(activeDay).length === 0 && <div className="p-6 text-[var(--ink-2)]">No classes on this day.</div>}
          <ul className="divide-y divide-[var(--line)]">
            {byDay(activeDay).map((s) => {
              const c = CLASS[s.classTypeId];
              const cancelled = s.status === 'cancelled';
              return (
                <li key={s.id}>
                  <button type="button" onClick={() => setOpenId(s.id)} className={cx('w-full text-left flex items-center gap-3 px-4 py-3', cancelled && 'opacity-55')}>
                    <span className="num w-[60px] flex-shrink-0 font-medium">{studioTime(s.start)}</span>
                    <div className="min-w-0 flex-1">
                      <div className={cx('font-medium truncate', cancelled && 'line-through')}>{c.name}</div>
                      <div className="text-[13px] text-[var(--ink-2)] truncate flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: TEACHER[s.instructorId].color }} />
                        {TEACHER[s.instructorId].name} · {placeOf(s)}
                      </div>
                      {cancelled ? <div className="text-[12.5px] text-[var(--bad)] mt-1">Cancelled</div>
                        : <FillBar booked={bookedCount(s)} capacity={s.capacity} className="mt-1.5" />}
                    </div>
                    <Icon name="ri-arrow-right-s-line" className="text-[18px] text-[var(--ink-3)]" />
                  </button>
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>

      <ClassSheet s={open} onClose={() => setOpenId(null)} patch={patch} toast={toast} />
      <AddClassSheet open={adding} onClose={() => setAdding(false)} defaultDate={week === 0 ? TODAY_KEY : monday}
        onSave={(s, repeat) => {
          const extra: Session[] = [s];
          if (repeat) for (let i = 1; i < 4; i++) extra.push({ ...s, id: `${s.id}-${i}`, start: s.start.replace(studioDateKey(s.start), addDays(studioDateKey(s.start), i * 7)) });
          setAdded((a) => [...a, ...extra]);
          setAdding(false);
          const dk = studioDateKey(s.start);
          toast(repeat ? `${CLASS[s.classTypeId].name} added · repeats every ${dayLabel(dk, { weekday: 'long' }).split(' ')[0]}` : `${CLASS[s.classTypeId].name} added for ${dayLabel(dk)}`);
        }} />
    </div>
  );
}

function ClassCard({ s, onOpen }: { s: Session; onOpen: () => void }) {
  const c = CLASS[s.classTypeId];
  const t = TEACHER[s.instructorId];
  const cancelled = s.status === 'cancelled';
  return (
    <button type="button" onClick={onOpen}
      className={cx('w-full text-left rounded-xl border border-[var(--line)] bg-white px-2.5 py-2 hover:border-[var(--ink-3)] transition-colors', cancelled && 'opacity-55 bg-transparent')}>
      <div className="num text-[12px] text-[var(--ink-2)]">{studioTime(s.start)}{!s.locationId && ' · Online'}</div>
      <div className={cx('text-[13px] font-medium leading-tight mt-0.5', cancelled && 'line-through')}>{c.name}</div>
      <div className="flex items-center gap-1.5 text-[12px] text-[var(--ink-2)] mt-1 min-w-0">
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: t.color }} />
        <span className="truncate">{t.name.split(' ')[0]}{s.substituteFor && ' (sub)'}</span>
      </div>
      {cancelled ? <div className="text-[11.5px] text-[var(--bad)] mt-1.5">Cancelled</div>
        : <FillBar booked={bookedCount(s)} capacity={s.capacity} className="mt-1.5 !gap-1.5" />}
    </button>
  );
}

/* ---------- Class sheet ---------- */

type Mode = 'view' | 'sub' | 'edit' | 'cancel';
type Scope = 'one' | 'following' | 'all';
const SCOPE_LABEL: Record<Scope, string> = { one: 'This class only', following: 'This and following', all: 'All in series' };

function ClassSheet({ s, onClose, patch, toast }: { s: Session | null; onClose: () => void; patch: (id: string, p: Partial<Session>) => void; toast: (t: string) => void }) {
  const [mode, setMode] = useState<Mode>('view');
  const [sub, setSub] = useState('');
  const [scope, setScope] = useState<Scope>('one');
  const [editTime, setEditTime] = useState('');
  const [editCap, setEditCap] = useState(0);
  const [note, setNote] = useState('');
  const [refund, setRefund] = useState<'credits' | 'card'>('credits');
  const [email, setEmail] = useState(true);
  const [wa, setWa] = useState(true);

  const close = useCallback(() => { setMode('view'); setSub(''); setScope('one'); setNote(''); setRefund('credits'); onClose(); }, [onClose]);
  if (!s) return null;

  const c = CLASS[s.classTypeId];
  const t = TEACHER[s.instructorId];
  const booked = bookedCount(s);
  const wl = waitlistCount(s);
  const cancelled = s.status === 'cancelled';
  const past = s.start < new Date().toISOString();
  const others = instructors.filter((i) => i.id !== s.instructorId && (s.locationId === null || i.locations.includes(s.locationId)));

  let body: ReactNode;
  let footer: ReactNode = null;

  if (mode === 'sub') {
    body = (
      <div className="space-y-4">
        <p className="text-[var(--ink-2)]">Pick who covers. Booked students get an email and WhatsApp message with the change.</p>
        <div className="space-y-2">
          {others.map((i) => (
            <OptionCard key={i.id} selected={sub === i.id} onSelect={() => setSub(i.id)} title={i.name} meta={i.styles.join(', ')} />
          ))}
        </div>
      </div>
    );
    footer = (
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" onClick={() => setMode('view')}>Back</Button>
        <Button disabled={!sub} onClick={() => {
          patch(s.id, { instructorId: sub, substituteFor: s.substituteFor ?? s.instructorId });
          toast(`${TEACHER[sub].name} is now teaching · students notified`);
          setSub(''); setMode('view');
        }}>Confirm substitute</Button>
      </div>
    );
  } else if (mode === 'edit') {
    body = (
      <div className="space-y-5">
        <div>
          <div className="text-[13px] font-medium text-[var(--ink-2)] mb-2">Apply changes to</div>
          <div className="space-y-2">
            {(Object.keys(SCOPE_LABEL) as Scope[]).map((k) => (
              <OptionCard key={k} selected={scope === k} onSelect={() => setScope(k)} title={SCOPE_LABEL[k]}
                meta={k === 'one' ? dayLabel(studioDateKey(s.start), { weekday: 'long' }) : k === 'following' ? `From ${dayLabel(studioDateKey(s.start))} onward` : `Every ${c.name} in this slot`} />
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start time"><input type="time" className="input num" value={editTime} onChange={(e) => setEditTime(e.target.value)} /></Field>
          <Field label="Capacity"><input type="number" min={1} className="input num" value={editCap} onChange={(e) => setEditCap(Number(e.target.value))} /></Field>
        </div>
      </div>
    );
    footer = (
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" onClick={() => setMode('view')}>Back</Button>
        <Button onClick={() => {
          patch(s.id, { start: studioInstant(studioDateKey(s.start), editTime), capacity: editCap });
          toast(`Saved · ${SCOPE_LABEL[scope].toLowerCase()}`);
          setMode('view');
        }}>Save changes</Button>
      </div>
    );
  } else if (mode === 'cancel') {
    body = (
      <div className="space-y-5">
        <Field label="Note to students" hint="Shown on the schedule and in the message.">
          <textarea className="input" rows={3} value={note} placeholder="e.g. Strong winds on the bay — we'll see you tomorrow." onChange={(e) => setNote(e.target.value)} />
        </Field>
        <div>
          <div className="text-[13px] font-medium text-[var(--ink-2)] mb-2">Refund to</div>
          <div className="space-y-2">
            <OptionCard selected={refund === 'credits'} onSelect={() => setRefund('credits')} title="Return credits" meta="Pass holders get the class back on their pass" />
            <OptionCard selected={refund === 'card'} onSelect={() => setRefund('card')} title="Refund to card" meta={`Drop-ins refunded ${peso(750)} each`} />
          </div>
        </div>
        <div>
          <div className="text-[13px] font-medium text-[var(--ink-2)] mb-1">Notify {booked} booked{wl ? ` and ${wl} waitlisted` : ''}</div>
          <div className="divide-y divide-[var(--line)]">
            <label className="flex items-center justify-between py-3"><span className="flex items-center gap-2"><Icon name="ri-mail-line" className="text-[var(--ink-2)]" />Email</span><Toggle on={email} onChange={setEmail} label="Email" /></label>
            <label className="flex items-center justify-between py-3"><span className="flex items-center gap-2"><Icon name="ri-whatsapp-line" className="text-[var(--ink-2)]" />WhatsApp</span><Toggle on={wa} onChange={setWa} label="WhatsApp" /></label>
          </div>
        </div>
      </div>
    );
    footer = (
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" onClick={() => setMode('view')}>Keep class</Button>
        <Button variant="danger" onClick={() => {
          patch(s.id, { status: 'cancelled', cancelNote: note || 'Cancelled by the studio.' });
          const via = [email && 'email', wa && 'WhatsApp'].filter(Boolean).join(' + ');
          toast(`Class cancelled · ${booked} ${refund === 'credits' ? 'credited back' : 'refunded'}${via ? ` · notified by ${via}` : ''}`);
          setMode('view');
        }}>Cancel class</Button>
      </div>
    );
  } else {
    body = (
      <div className="space-y-5">
        {cancelled && (
          <div className="rounded-2xl bg-[rgba(179,55,43,0.06)] px-4 py-3 text-[13.5px]">
            <div className="font-medium text-[var(--bad)]">Cancelled</div>
            <div className="text-[var(--ink-2)] mt-0.5">{s.cancelNote}</div>
          </div>
        )}
        <Rows rows={[
          ['Teacher', <span key="t" className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: t.color }} />{t.name}{s.substituteFor && <span className="text-[var(--ink-3)] font-normal">covering {TEACHER[s.substituteFor].name.split(' ')[0]}</span>}</span>],
          ['Where', placeOf(s)],
          ['Level', `${c.level} · ${c.duration} min`],
          ['Repeats', s.seriesId ? `Weekly on ${dayLabel(studioDateKey(s.start), { weekday: 'long' }).split(' ')[0]}s` : 'One-off'],
        ]} />
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-[13px] font-medium text-[var(--ink-2)]">Booked</span>
            {wl > 0 && <Badge tone="amber" dot={false}>{wl} on waitlist</Badge>}
          </div>
          <FillBar booked={booked} capacity={s.capacity} />
        </div>
        <ButtonLink to={to(`/admin/classes/${s.id}`)} variant="quiet" block icon="ri-list-check-2">Open roster</ButtonLink>
      </div>
    );
    if (!cancelled && !past) {
      footer = (
        <div className="flex flex-wrap gap-2 [&>button]:flex-1">
          <Button variant="secondary" size="sm" icon="ri-user-shared-line" onClick={() => setMode('sub')}>Substitute</Button>
          <Button variant="secondary" size="sm" icon="ri-edit-line" onClick={() => { setEditTime(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit' }).format(new Date(s.start))); setEditCap(s.capacity); setMode('edit'); }}>Edit</Button>
          <Button variant="danger" size="sm" icon="ri-close-circle-line" onClick={() => setMode('cancel')}>Cancel</Button>
        </div>
      );
    }
  }

  const titles: Record<Mode, string> = { view: c.name, sub: 'Substitute teacher', edit: 'Edit class', cancel: 'Cancel class' };
  return (
    <Sheet open onClose={close} title={titles[mode]}
      subtitle={<span className="num">{mode !== 'view' && `${c.name} · `}{dayLabel(studioDateKey(s.start), { weekday: 'long' })} · {studioTime(s.start)}–{endTime(s)}</span>}
      footer={footer}>
      {body}
    </Sheet>
  );
}

/* ---------- Add class ---------- */

function AddClassSheet({ open, onClose, defaultDate, onSave }: { open: boolean; onClose: () => void; defaultDate: string; onSave: (s: Session, repeat: boolean) => void }) {
  const [classId, setClassId] = useState('sunrise');
  const [teacher, setTeacher] = useState('maya');
  const [room, setRoom] = useState(ROOMS[0].id);
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState('08:00');
  const [repeat, setRepeat] = useState(true);
  const [cap, setCap] = useState(ROOMS[0].cap);

  return (
    <Sheet open={open} onClose={onClose} title="Add class" subtitle="Times are studio time"
      footer={<div className="flex gap-2 justify-end">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={() => {
          const [loc, roomId] = room.split(':');
          onSave({
            id: `new-${Date.now()}`, classTypeId: classId, locationId: loc === 'online' ? null : (loc as Session['locationId']), roomId: roomId || null,
            instructorId: teacher, start: studioInstant(date, time), capacity: cap, seriesId: repeat ? `series-new-${Date.now()}` : null, status: 'scheduled',
          }, repeat);
        }}>Save class</Button>
      </div>}>
      <div className="space-y-4">
        <Field label="Class type">
          <select className="input" value={classId} onChange={(e) => {
            setClassId(e.target.value);
            if (CLASS[e.target.value].format === 'online') { setRoom('online:'); setCap(60); }
          }}>
            {classTypes.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.duration} min</option>)}
          </select>
        </Field>
        <Field label="Teacher">
          <select className="input" value={teacher} onChange={(e) => setTeacher(e.target.value)}>
            {instructors.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
        </Field>
        <Field label="Location and room">
          <select className="input" value={room} onChange={(e) => { setRoom(e.target.value); setCap(ROOMS.find((r) => r.id === e.target.value)!.cap); }}>
            {ROOMS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date"><input type="date" className="input num" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Start time"><input type="time" className="input num" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
        </div>
        <Field label="Capacity" hint="Defaults to the room size.">
          <input type="number" min={1} className="input num" value={cap} onChange={(e) => setCap(Number(e.target.value))} />
        </Field>
        <label className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--line-2)] bg-white px-4 py-3">
          <span>
            <span className="block font-medium">Repeat weekly</span>
            <span className="block text-[13px] text-[var(--ink-2)]">Same day and time each week</span>
          </span>
          <Toggle on={repeat} onChange={setRepeat} label="Repeat weekly" />
        </label>
      </div>
    </Sheet>
  );
}
