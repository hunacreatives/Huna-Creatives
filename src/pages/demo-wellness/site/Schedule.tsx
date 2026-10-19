// Guest schedule: pick a day, filter, open a class, book it.

import { MouseEvent as ReactMouseEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Session } from '../lib/types';
import { CLASS, LOC, TEACHER, TODAY_KEY, classTypes, instructors, sessions } from '../lib/data';
import { addDays, dayLabel, studioDateKey, studioTime, tzCity } from '../lib/format';
import { useDemo } from '../lib/demo';
import { Wrap } from '../ui/layouts';
import { Badge, Button, Chip, Empty, Glass, Icon, Panel, Tabs, btnClass, cx } from '../ui/kit';
import ScheduleBookingSheet from './ScheduleBookingSheet';
import { TZ_OPTIONS, spots, teacherName, yourTimeParts } from './ScheduleBits';

type LocFilter = 'all' | 'beach' | 'town' | 'online';
type MyStatus = 'booked' | 'waitlist' | undefined;

const LOC_OPTS: { v: LocFilter; l: string }[] = [
  { v: 'all', l: 'All' }, { v: 'beach', l: 'Seaside' }, { v: 'town', l: 'Downtown' }, { v: 'online', l: 'Online' },
];
const DAYS = Array.from({ length: 14 }, (_, i) => addDays(TODAY_KEY, i));
const KEY_OF = new Map(sessions.map((s) => [s.id, studioDateKey(s.start)]));
const STYLES = [...new Set(classTypes.map((c) => c.style))];
const PARTS = [
  { id: 'morning', label: 'Morning', test: (h: number) => h < 12 },
  { id: 'afternoon', label: 'Afternoon', test: (h: number) => h >= 12 && h < 17 },
  { id: 'evening', label: 'Evening', test: (h: number) => h >= 17 },
];
// Session starts are stored as studio-local ISO strings ("…T17:00:00+08:00").
const hourOf = (s: Session) => Number(s.start.slice(11, 13));
const weekday = (key: string) => dayLabel(key).split(' ')[0];
const dayNum = (key: string) => Number(key.slice(8));

export default function Schedule() {
  const [params, setParams] = useSearchParams();
  const { viewerTz, setViewerTz, myBookings } = useDemo();

  const locParam = params.get('location');
  const loc: LocFilter = locParam === 'beach' || locParam === 'town' || locParam === 'online' ? locParam : 'all';
  const deepLink = params.get('session');

  const [day, setDay] = useState(() => (deepLink && KEY_OF.get(deepLink)) || TODAY_KEY);
  const [sheetId, setSheetId] = useState<string | null>(() => (deepLink && KEY_OF.has(deepLink) ? deepLink : null));
  const [style, setStyle] = useState<string | null>(null);
  const [teacher, setTeacher] = useState<string | null>(null);
  const [showEarlier, setShowEarlier] = useState(false);
  const [view, setView] = useState<'list' | 'week'>('list');
  const [pop, setPop] = useState<null | { kind: 'style' | 'teacher'; left: number }>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const now = Date.now();

  const myStatus = (id: string): MyStatus => myBookings.find((b) => b.sessionId === id)?.status;

  const setLoc = (v: LocFilter) => {
    const p = new URLSearchParams(params);
    if (v === 'all') p.delete('location'); else p.set('location', v);
    p.delete('session');
    setParams(p, { replace: true });
  };
  const closeSheet = () => {
    setSheetId(null);
    if (params.has('session')) { const p = new URLSearchParams(params); p.delete('session'); setParams(p, { replace: true }); }
  };

  const filtered = useMemo(() => sessions.filter((s) =>
    (loc === 'all' || (loc === 'online' ? s.locationId === null : s.locationId === loc))
    && (!style || CLASS[s.classTypeId].style === style)
    && (!teacher || s.instructorId === teacher)), [loc, style, teacher]);
  const daysWithClasses = useMemo(() => new Set(filtered.map((s) => KEY_OF.get(s.id))), [filtered]);
  const myDays = useMemo(() => new Set(myBookings.map((b) => KEY_OF.get(b.sessionId))), [myBookings]);

  const daySessions = filtered.filter((s) => KEY_OF.get(s.id) === day).sort((a, b) => a.start.localeCompare(b.start));
  const isPast = (s: Session) => new Date(s.start).getTime() < now;
  const earlier = daySessions.filter(isPast);
  const visible = showEarlier ? daySessions : daySessions.filter((s) => !isPast(s));
  const nextDay = DAYS.find((d) => d > day && daysWithClasses.has(d));
  const showLoc = loc === 'all';

  // Close the filter popover on outside tap or Escape.
  useEffect(() => {
    if (!pop) return;
    const onDown = (e: PointerEvent) => {
      const el = e.target as HTMLElement;
      if (popRef.current?.contains(el) || el.closest('[data-pop-trigger]')) return;
      setPop(null);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPop(null); };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('pointerdown', onDown); document.removeEventListener('keydown', onKey); };
  }, [pop]);

  const openPop = (kind: 'style' | 'teacher', e: ReactMouseEvent<HTMLButtonElement>) => {
    if (pop?.kind === kind) { setPop(null); return; }
    const b = e.currentTarget.getBoundingClientRect();
    const bar = barRef.current!.getBoundingClientRect();
    setPop({ kind, left: Math.max(8, Math.min(b.left - bar.left, bar.width - 248)) });
  };

  const pickDay = (d: string) => { setDay(d); setShowEarlier(false); };
  const sheetSession = sheetId ? sessions.find((s) => s.id === sheetId) ?? null : null;
  const tzOptions = TZ_OPTIONS.includes(viewerTz) ? TZ_OPTIONS : [viewerTz, ...TZ_OPTIONS];

  const tzNote = (
    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] text-[var(--ink-2)]">
      <Icon name="ri-time-line" className="text-[15px] text-[var(--ink-3)]" />
      <span>Studio time · your time in</span>
      <span className="relative inline-flex items-center">
        <select value={viewerTz} onChange={(e) => setViewerTz(e.target.value)} aria-label="Your timezone"
          className="appearance-none bg-transparent pr-5 py-2 -my-2 cursor-pointer font-medium text-[var(--teal)] text-[16px] sm:text-[13px] focus:outline-none focus-visible:underline">
          {tzOptions.map((z) => <option key={z} value={z}>{tzCity(z)}</option>)}
        </select>
        <Icon name="ri-arrow-down-s-line" className="absolute right-0 pointer-events-none text-[var(--teal)]" />
      </span>
    </div>
  );

  return (
    <>
      <Wrap className="pt-8 md:pt-12">
        <h1 className="serif text-[34px] md:text-[44px] leading-[1.08]">Schedule</h1>
        <p className="text-[16px] text-[var(--ink-2)] mt-1.5 max-w-[60ch]">Daily classes at Seaside and Downtown, plus live online sessions. Book up to two weeks ahead.</p>
      </Wrap>

      {/* Sticky day + filter bar */}
      <div className="sticky top-[76px] z-40 mt-6">
        <Wrap>
          <div ref={barRef} className="relative">
            <Glass strong className="p-2 md:p-2.5">
              <div className="flex gap-1 overflow-x-auto no-bar" role="tablist" aria-label="Day">
                {DAYS.map((d, i) => {
                  const has = daysWithClasses.has(d);
                  const sel = d === day;
                  return (
                    <button key={d} type="button" role="tab" aria-selected={sel} disabled={!has && !sel} onClick={() => pickDay(d)}
                      aria-label={dayLabel(d, { weekday: 'long', month: 'long' })}
                      className={cx('relative flex-shrink-0 w-[50px] md:flex-1 md:min-w-[50px] h-[58px] rounded-2xl flex flex-col items-center justify-center transition-colors',
                        sel ? 'bg-[var(--teal)] text-white shadow-[0_6px_16px_rgba(7,80,86,0.22)]'
                          : has ? 'text-[var(--ink)] hover:bg-white/80' : 'text-[var(--ink-3)] opacity-40 cursor-not-allowed')}>
                      <span className={cx('text-[11.5px]', sel ? 'text-white/80' : 'text-[var(--ink-3)]')}>{i === 0 ? 'Today' : weekday(d)}</span>
                      <span className="num text-[17px] font-semibold leading-tight">{dayNum(d)}</span>
                      {myDays.has(d) && <span className={cx('absolute bottom-1.5 w-1 h-1 rounded-full', sel ? 'bg-white' : 'bg-[var(--teal)]')} aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>
              <div className="mt-2 pt-2 border-t border-[var(--line)] flex items-center gap-3">
                <div className="flex items-center gap-1.5 overflow-x-auto no-bar min-w-0 flex-1 lg:flex-none">
                  {LOC_OPTS.map((o) => <Chip key={o.v} active={loc === o.v} onClick={() => setLoc(o.v)}>{o.l}</Chip>)}
                  <span className="w-px h-5 bg-[var(--line-2)] mx-1 flex-shrink-0" aria-hidden="true" />
                  <DropChip label="Style" value={style} open={pop?.kind === 'style'} onClick={(e) => openPop('style', e)} />
                  <DropChip label="Teacher" value={teacher && TEACHER[teacher].name.split(' ')[0]} open={pop?.kind === 'teacher'} onClick={(e) => openPop('teacher', e)} />
                </div>
                <div className="hidden lg:block ml-auto">{tzNote}</div>
              </div>
            </Glass>

            {pop && (
              <div ref={popRef} role="listbox" className="rise absolute top-full mt-2 w-[240px] paper rounded-2xl p-1.5 z-10 max-h-[60vh] overflow-y-auto shadow-[var(--shadow-lg)]"
                style={{ left: pop.left }}>
                {pop.kind === 'style'
                  ? [null, ...STYLES].map((v) => (
                    <PopOption key={v ?? 'any'} selected={style === v} onClick={() => { setStyle(v); setPop(null); }}>{v ?? 'Any style'}</PopOption>
                  ))
                  : [null, ...instructors].map((v) => (
                    <PopOption key={v?.id ?? 'any'} selected={teacher === (v?.id ?? null)} onClick={() => { setTeacher(v?.id ?? null); setPop(null); }}>
                      {v ? v.name : 'Any teacher'}
                    </PopOption>
                  ))}
              </div>
            )}
          </div>
        </Wrap>
      </div>

      <Wrap className="mt-5">
        <div className="flex items-end justify-between gap-4 mb-3">
          <div className="min-w-0">
            <h2 className="serif text-[24px] md:text-[28px] leading-tight">
              {day === TODAY_KEY ? 'Today' : day === addDays(TODAY_KEY, 1) ? 'Tomorrow' : dayLabel(day, { weekday: 'long', month: 'long' })}
            </h2>
            <div className="lg:hidden mt-1.5">{tzNote}</div>
          </div>
          <Tabs className="hidden lg:inline-flex flex-shrink-0" value={view} onChange={(v) => setView(v as 'list' | 'week')}
            options={[{ value: 'list', label: 'List' }, { value: 'week', label: 'Week' }]} />
        </div>

        <div className={cx(view === 'week' && 'lg:hidden')}>
          <Panel pad={false} className="overflow-hidden">
            {daySessions.length === 0 ? (
              <Empty icon="ri-calendar-line" title="No classes on this day">
                {nextDay
                  ? <Button variant="quiet" size="sm" className="mt-3" onClick={() => pickDay(nextDay)}>Next class: {dayLabel(nextDay)}</Button>
                  : 'Try another location or clear a filter.'}
              </Empty>
            ) : visible.length === 0 ? (
              <Empty icon="ri-moon-line" title="That's everything for today">
                <span className="flex flex-wrap items-center justify-center gap-2 mt-3">
                  {nextDay && <Button variant="quiet" size="sm" onClick={() => pickDay(nextDay)}>See {nextDay === addDays(TODAY_KEY, 1) ? 'tomorrow' : dayLabel(nextDay)}</Button>}
                  <Button variant="ghost" size="sm" onClick={() => setShowEarlier(true)}>Show earlier classes</Button>
                </span>
              </Empty>
            ) : (
              <>
                {earlier.length > 0 && (
                  <button type="button" onClick={() => setShowEarlier((v) => !v)}
                    className="w-full flex items-center justify-between gap-3 px-4 md:px-6 h-11 text-[13px] text-[var(--ink-3)] border-b border-[var(--line)] hover:text-[var(--ink-2)]">
                    <span>{earlier.length} earlier {earlier.length === 1 ? 'class has' : 'classes have'} finished</span>
                    <span className="font-medium text-[var(--teal)]">{showEarlier ? 'Hide' : 'Show'}</span>
                  </button>
                )}
                {PARTS.map((part) => {
                  const rows = visible.filter((s) => part.test(hourOf(s)));
                  if (!rows.length) return null;
                  return (
                    <section key={part.id} className="border-b border-[var(--line)] last:border-b-0">
                      <div className="px-4 md:px-6 pt-4 pb-1 flex items-baseline justify-between">
                        <h3 className="text-[13px] font-semibold text-[var(--ink-2)]">{part.label}</h3>
                      </div>
                      <div className="divide-y divide-[var(--line)]">
                        {rows.map((s) => (
                          <ClassRow key={s.id} s={s} tz={viewerTz} status={myStatus(s.id)} past={isPast(s)} showLoc={showLoc} onOpen={() => setSheetId(s.id)} />
                        ))}
                      </div>
                    </section>
                  );
                })}
              </>
            )}
          </Panel>
        </div>

        {view === 'week' && (
          <div className="hidden lg:block">
            <WeekGrid start={day} filtered={filtered} now={now} myStatus={myStatus} onPickDay={pickDay} onOpen={(id) => setSheetId(id)} />
          </div>
        )}
      </Wrap>

      <ScheduleBookingSheet key={sheetId ?? 'none'} session={sheetSession} onClose={closeSheet} />
    </>
  );
}

function DropChip({ label, value, open, onClick }: { label: string; value: string | null; open: boolean; onClick: (e: ReactMouseEvent<HTMLButtonElement>) => void }) {
  return (
    <button type="button" data-pop-trigger onClick={onClick} aria-expanded={open} aria-haspopup="listbox"
      className={cx('inline-flex items-center gap-1 h-9 pl-3.5 pr-2.5 rounded-full text-[13.5px] font-medium border transition-colors whitespace-nowrap flex-shrink-0',
        value ? 'bg-[var(--teal)] text-white border-[var(--teal)]' : 'bg-white/80 text-[var(--ink-2)] border-[var(--line-2)] hover:border-[var(--ink-3)]')}>
      {value ?? label}
      <Icon name="ri-arrow-down-s-line" className={cx('text-[16px] transition-transform', open && 'rotate-180')} />
    </button>
  );
}

function PopOption({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: string }) {
  return (
    <button type="button" role="option" aria-selected={selected} onClick={onClick}
      className={cx('w-full flex items-center justify-between h-11 px-3 rounded-xl text-[14px] text-left transition-colors',
        selected ? 'bg-[var(--teal-soft)] text-[var(--teal)] font-medium' : 'hover:bg-[rgba(36,48,55,0.05)]')}>
      {children}{selected && <Icon name="ri-check-line" className="text-[16px]" />}
    </button>
  );
}

function ClassRow({ s, tz, status, past, showLoc, onOpen }: { s: Session; tz: string; status: MyStatus; past: boolean; showLoc: boolean; onOpen: () => void }) {
  const c = CLASS[s.classTypeId];
  const online = s.locationId === null;
  const cancelled = s.status === 'cancelled';
  const sp = spots(s);
  const yt = yourTimeParts(s.start, tz);
  const room = online ? null : LOC[s.locationId].rooms.find((r) => r.id === s.roomId)?.name;
  const where = online ? 'Online · Zoom' : showLoc ? `${LOC[s.locationId].name} · ${room}` : room;

  let action;
  if (past) action = <span className="text-[12.5px] text-[var(--ink-3)]">Finished</span>;
  else if (cancelled) action = <Badge tone="red">Cancelled</Badge>;
  else if (status === 'booked') action = <span className={btnClass('quiet', 'sm')}><Icon name="ri-check-line" className="text-[1.1em]" />Booked</span>;
  else if (status === 'waitlist') action = <span className={btnClass('quiet', 'sm')}><Icon name="ri-time-line" className="text-[1.1em]" />Waitlisted</span>;
  else if (sp.full) action = <span className={btnClass('secondary', 'sm')}><span className="sm:hidden">Waitlist</span><span className="hidden sm:inline">Join waitlist</span></span>;
  else action = <span className={cx(btnClass('primary', 'sm'), 'min-w-[72px]')}>Book</span>;

  return (
    <button type="button" onClick={onOpen}
      className={cx('w-full text-left flex items-center gap-3 md:gap-5 px-4 md:px-6 py-4 min-h-[76px] transition-colors hover:bg-[rgba(7,80,86,0.03)] focus-visible:bg-[rgba(7,80,86,0.04)]',
        past && 'opacity-50')}>
      <div className="w-[70px] md:w-[92px] flex-shrink-0">
        <div className={cx('num text-[15px] font-semibold leading-snug', cancelled && 'line-through text-[var(--ink-3)]')}>
          {online ? yt.time : studioTime(s.start)}
        </div>
        <div className="num text-[12px] text-[var(--ink-3)] mt-0.5 leading-tight">
          {online ? (yt.day ? `your time, ${yt.day}` : 'your time') : yt.full}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className={cx('text-[15px] font-medium leading-snug', cancelled && 'line-through text-[var(--ink-3)]')}>{c.name}</div>
        <div className="text-[13px] text-[var(--ink-2)] mt-0.5 leading-snug">{teacherName(s)} · {where}</div>
        <div className="text-[12.5px] text-[var(--ink-3)] mt-1 num leading-snug">
          {cancelled
            ? <span className="text-[var(--bad)]">{s.cancelNote}</span>
            : <>{c.duration} min<span className="hidden sm:inline"> · {c.level}</span> · <span className={cx(sp.low && 'text-[var(--warn)] font-medium', sp.full && 'text-[var(--ink-2)]')}>{sp.text}</span></>}
        </div>
      </div>
      <div className="flex-shrink-0">{action}</div>
    </button>
  );
}

function WeekGrid({ start, filtered, now, myStatus, onPickDay, onOpen }:
  { start: string; filtered: Session[]; now: number; myStatus: (id: string) => MyStatus; onPickDay: (d: string) => void; onOpen: (id: string) => void }) {
  const from = Math.min(Math.max(0, DAYS.indexOf(start)), DAYS.length - 7);
  const week = DAYS.slice(from, from + 7);
  return (
    <Panel pad={false} className="p-3">
      <div className="grid grid-cols-7 gap-2">
        {week.map((d) => {
          const list = filtered.filter((s) => KEY_OF.get(s.id) === d).sort((a, b) => a.start.localeCompare(b.start));
          return (
            <div key={d} className="min-w-0">
              <button type="button" onClick={() => onPickDay(d)}
                className={cx('w-full rounded-xl py-2 mb-2 text-center transition-colors', d === start ? 'bg-[var(--teal-soft)] text-[var(--teal)]' : 'hover:bg-[rgba(36,48,55,0.04)]')}>
                <div className="text-[12px] text-[var(--ink-3)]">{d === TODAY_KEY ? 'Today' : weekday(d)}</div>
                <div className="num text-[16px] font-semibold">{dayNum(d)}</div>
              </button>
              <div className="space-y-1.5">
                {list.length === 0 && <div className="text-center text-[12px] text-[var(--ink-3)] py-4">No classes</div>}
                {list.map((s) => {
                  const st = myStatus(s.id);
                  const cancelled = s.status === 'cancelled';
                  const sp = spots(s);
                  const past = new Date(s.start).getTime() < now;
                  return (
                    <button key={s.id} type="button" onClick={() => onOpen(s.id)}
                      className={cx('w-full text-left rounded-xl px-2.5 py-2 border transition-colors',
                        st === 'booked' ? 'bg-[var(--teal-soft)] border-[rgba(7,80,86,0.35)]' : 'bg-white border-[var(--line)] hover:border-[var(--line-2)]',
                        (past || cancelled) && 'opacity-50')}>
                      <div className="num text-[12px] text-[var(--ink-2)]">{studioTime(s.start)}</div>
                      <div className={cx('text-[13px] font-medium leading-snug mt-0.5', cancelled && 'line-through')}>{CLASS[s.classTypeId].name}</div>
                      <div className={cx('text-[11.5px] mt-0.5', st === 'booked' ? 'text-[var(--teal)] font-medium' : sp.low ? 'text-[var(--warn)]' : 'text-[var(--ink-3)]')}>
                        {cancelled ? 'Cancelled' : st === 'booked' ? 'Booked' : st === 'waitlist' ? 'Waitlisted' : sp.full ? 'Full' : sp.text}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
