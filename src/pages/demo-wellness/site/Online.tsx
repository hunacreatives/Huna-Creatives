// Guest site: online classes. Live sessions (guest's time first) and the
// on-demand library with filters, favourites and a player sheet mock.

import { useMemo, useState } from 'react';
import { CLASS, LOC, ME, PRODUCT, TEACHER, sessions, videos, wallets } from '../lib/data';
import { to, useDemo } from '../lib/demo';
import { STUDIO_TZ, addDays, dateLabel, dayLabel, peso, studioTime, tzCity } from '../lib/format';
import type { Session, Video } from '../lib/types';
import { Avatar, Badge, Button, ButtonLink, Chip, Empty, Icon, PageTitle, Panel, Sheet, Tabs, cx } from '../ui/kit';
import { Wrap } from '../ui/layouts';

type Tab = 'live' | 'library';

/* ---------- time helpers (guest's zone first for online classes) ---------- */
const keyIn = (iso: string, tz: string) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));
const timeIn = (iso: string, tz: string) =>
  new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' }).format(new Date(iso)).toLowerCase();
const weekdayIn = (iso: string, tz: string) =>
  new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' }).format(new Date(iso));

/* ---------- library helpers ---------- */
const DURATIONS = [
  { v: '15', l: '15 min', test: (d: number) => d <= 15 },
  { v: '30', l: '30 min', test: (d: number) => d > 15 && d <= 30 },
  { v: '45', l: '45 min', test: (d: number) => d > 30 && d <= 45 },
  { v: '60', l: '60+ min', test: (d: number) => d > 45 },
];
const uniq = (xs: string[]) => [...new Set(xs)];
const STYLES = uniq(videos.map((v) => v.style));
const LEVELS = uniq(videos.map((v) => v.level));
const FOCUSES = uniq(videos.map((v) => v.focus)).sort();
const TEACHERS = uniq(videos.map((v) => v.instructorId));

const STYLE_LINE: Record<string, string> = {
  Vinyasa: 'A flowing class that links breath and movement.',
  Yin: 'Long, quiet holds on the floor.',
  'Pilates': 'Core, glutes and posture work on the mat.',
  Restorative: 'Supported shapes with bolsters and blankets, very little effort.',
  Breathwork: 'Guided breathing, seated or lying down.',
  Hatha: 'Slower poses with clear alignment cues.',
};

// The demo guest's watching history.
const PROGRESS: Record<string, number> = { v4: 0.62, v7: 0.28 };
const CONTINUE = ['v4', 'v7'];

/** Does the demo guest have the on-demand library through an active pass? */
const libraryWallet = wallets.find((w) => w.memberId === ME.id && w.status === 'active' && PRODUCT[w.productId]?.includesOnDemand);
const ONLINE = PRODUCT.online;

export default function Online() {
  const [tab, setTab] = useState<Tab>('live');
  const [favs, setFavs] = useState<string[]>(['v2', 'v5', 'v12']);
  const [rented, setRented] = useState<string[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const toggleFav = (id: string) => setFavs((xs) => (xs.includes(id) ? xs.filter((x) => x !== id) : [...xs, id]));

  const live = useMemo(() => {
    const now = Date.now();
    return sessions
      .filter((s) => s.locationId === null && s.status === 'scheduled')
      .filter((s) => { const t = new Date(s.start).getTime(); return t > now && t < now + 14 * 86400000; })
      .sort((a, b) => a.start.localeCompare(b.start));
  }, []);

  const open = videos.find((v) => v.id === openId) ?? null;

  return (
    <Wrap className="pt-6 md:pt-10">
      <Panel pad={false} className="px-4 py-3 md:px-5 flex items-center gap-3 mb-8 md:mb-10">
        <span className="w-9 h-9 rounded-full bg-[var(--teal-soft)] text-[var(--teal)] inline-flex items-center justify-center flex-shrink-0">
          <Icon name="ri-play-circle-line" className="text-[18px]" />
        </span>
        <p className="flex-1 min-w-0 text-[14px] text-[var(--ink-2)]">
          <span className="text-[var(--ink)] font-medium">Online membership</span> · every live class and the full library for <span className="num">{peso(ONLINE.price)}</span> a month. Cancel anytime.
        </p>
        <ButtonLink to={to('/checkout?product=online')} variant="quiet" size="sm" className="flex-shrink-0">Join</ButtonLink>
      </Panel>

      <PageTitle title="Practise from anywhere"
        subtitle="Live classes streamed from the studio, and a library of recorded classes from all five teachers." />

      <Tabs<Tab> value={tab} onChange={setTab} className="mb-6"
        options={[{ value: 'live', label: 'Live', count: live.length }, { value: 'library', label: 'On demand', count: videos.length }]} />

      {tab === 'live'
        ? <LiveList list={live} />
        : <Library favs={favs} toggleFav={toggleFav} rented={rented} onOpen={setOpenId} />}

      {open && (
        <Player v={open} fav={favs.includes(open.id)} toggleFav={() => toggleFav(open.id)}
          rented={rented.includes(open.id)} onRent={() => setRented((xs) => [...xs, open.id])} onClose={() => setOpenId(null)} />
      )}
    </Wrap>
  );
}

/* ================================ Live ================================ */

function LiveList({ list }: { list: Session[] }) {
  const { viewerTz, myBookings, book, toast } = useDemo();
  const todayKey = keyIn(new Date().toISOString(), viewerTz);
  const heading = (key: string) =>
    key === todayKey ? 'Today' : key === addDays(todayKey, 1) ? 'Tomorrow' : dayLabel(key, { weekday: 'long' });

  const groups = useMemo(() => {
    const out: { key: string; items: Session[] }[] = [];
    list.forEach((s) => {
      const k = keyIn(s.start, viewerTz);
      const g = out.find((x) => x.key === k);
      if (g) g.items.push(s); else out.push({ key: k, items: [s] });
    });
    return out;
  }, [list, viewerTz]);

  if (!list.length) return <Panel><Empty icon="ri-live-line" title="No live classes in the next two weeks">New dates go up every Sunday.</Empty></Panel>;

  return (
    <div className="rise">
      <p className="text-[13.5px] text-[var(--ink-2)] mb-3 flex items-center gap-1.5">
        <Icon name="ri-time-line" className="text-[var(--ink-3)]" />Times in your time zone ({tzCity(viewerTz)}), studio time underneath.
      </p>
      <Panel pad={false} className="overflow-hidden">
        {groups.map((g, gi) => (
          <div key={g.key} className={cx(gi > 0 && 'border-t border-[var(--line)]')}>
            <div className="px-4 md:px-6 pt-4 pb-1 text-[13px] font-medium text-[var(--ink-3)]">{heading(g.key)}</div>
            <ul className="divide-y divide-[var(--line)]">
              {g.items.map((s) => {
                const c = CLASS[s.classTypeId];
                const t = TEACHER[s.instructorId];
                const mine = myBookings.find((b) => b.sessionId === s.id);
                const elNidoDay = weekdayIn(s.start, STUDIO_TZ) !== weekdayIn(s.start, viewerTz) ? ` ${weekdayIn(s.start, STUDIO_TZ)}` : '';
                return (
                  <li key={s.id} className="px-4 md:px-6 py-4 grid grid-cols-[76px_1fr] sm:grid-cols-[100px_1fr_auto] gap-x-4 gap-y-3 items-center">
                    <div>
                      <div className="num text-[16px] font-semibold leading-tight">{timeIn(s.start, viewerTz)}</div>
                      <div className="num text-[12px] text-[var(--ink-3)] mt-0.5">{studioTime(s.start)}{elNidoDay} studio time</div>
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-[15px]">{c.name.replace(' (live)', '')}</div>
                      <div className="flex items-center gap-2 mt-1 text-[13.5px] text-[var(--ink-2)]">
                        <Avatar name={t.name} color={t.color} size={20} />
                        <span className="truncate">{t.name} · <span className="num">{c.duration} min</span></span>
                      </div>
                    </div>
                    <div className="col-start-2 sm:col-start-auto">
                      {mine ? (
                        <span className="inline-flex items-center gap-1.5 text-[13.5px]">
                          <span className="inline-flex items-center gap-1 font-medium text-[var(--teal)]"><Icon name="ri-check-line" />Booked</span>
                          <span className="text-[var(--ink-3)]">· Join opens 15 min before</span>
                        </span>
                      ) : (
                        <Button size="sm" variant="secondary" className="h-10 px-5"
                          onClick={() => { book(s.id, 'booked'); toast(`Booked ${c.name.replace(' (live)', '')}. The join link opens 15 minutes before.`); }}>
                          Book
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </Panel>
      <p className="text-[13.5px] text-[var(--ink-2)] mt-3 flex items-center gap-1.5">
        <Icon name="ri-record-circle-line" className="text-[var(--ink-3)]" />Live classes are recorded; replays stay up for 7 days.
      </p>
    </div>
  );
}

/* ============================== On demand ============================== */

function Library({ favs, toggleFav, rented, onOpen }: { favs: string[]; toggleFav: (id: string) => void; rented: string[]; onOpen: (id: string) => void }) {
  const [style, setStyle] = useState('');
  const [dur, setDur] = useState('');
  const [level, setLevel] = useState('');
  const [teacher, setTeacher] = useState('');
  const [focus, setFocus] = useState('');
  const [favOnly, setFavOnly] = useState(false);
  const anyFilter = !!(style || dur || level || teacher || focus || favOnly);
  const clear = () => { setStyle(''); setDur(''); setLevel(''); setTeacher(''); setFocus(''); setFavOnly(false); };

  const durTest = DURATIONS.find((d) => d.v === dur)?.test;
  const list = videos.filter((v) =>
    (!style || v.style === style) && (!durTest || durTest(v.duration)) && (!level || v.level === level)
    && (!teacher || v.instructorId === teacher) && (!focus || v.focus === focus) && (!favOnly || favs.includes(v.id)));

  return (
    <div className="rise">
      {/* Continue watching */}
      <h2 className="serif text-[22px] md:text-[24px] mb-3">Continue watching</h2>
      <div className="flex gap-4 overflow-x-auto no-bar snap-x -mx-4 px-4 md:mx-0 md:px-0 pb-1 mb-10">
        {CONTINUE.map((id) => videos.find((v) => v.id === id)).filter(Boolean).map((v) => {
          const p = PROGRESS[v.id] ?? 0;
          return (
            <button key={v.id} type="button" onClick={() => onOpen(v.id)} className="group text-left w-[78%] sm:w-[340px] flex-shrink-0 snap-start">
              <div className="relative aspect-video rounded-2xl overflow-hidden bg-[#0e1418]">
                <img src={v.image} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
                <span className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-white/85 text-[var(--ink)] inline-flex items-center justify-center shadow-lg">
                  <Icon name="ri-play-fill" className="text-[22px] translate-x-[1px]" />
                </span>
                <div className="absolute left-3 right-3 bottom-3 h-1 rounded-full bg-white/35 overflow-hidden">
                  <div className="h-full rounded-full bg-white" style={{ width: `${p * 100}%` }} />
                </div>
              </div>
              <div className="mt-2.5 font-medium text-[15px] leading-snug">{v.title}</div>
              <div className="text-[13px] text-[var(--ink-2)] mt-0.5"><span className="num">{Math.max(1, Math.round(v.duration * (1 - p)))} min left</span> · {TEACHER[v.instructorId].name}</div>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <h2 className="serif text-[22px] md:text-[24px] mb-3">Library</h2>
      <div className="flex gap-2 overflow-x-auto no-bar -mx-4 px-4 md:mx-0 md:px-0 pb-1" role="group" aria-label="Style">
        <Chip active={!style} onClick={() => setStyle('')}>All styles</Chip>
        {STYLES.map((s) => <Chip key={s} active={style === s} onClick={() => setStyle(style === s ? '' : s)}>{s}</Chip>)}
      </div>
      <div className="flex gap-2 overflow-x-auto no-bar -mx-4 px-4 md:mx-0 md:px-0 pb-1 mt-2.5 mb-6" role="group" aria-label="More filters">
        <SelectPill label="Duration" value={dur} onChange={setDur} options={DURATIONS.map((d) => ({ v: d.v, l: d.l }))} />
        <SelectPill label="Level" value={level} onChange={setLevel} options={LEVELS.map((l) => ({ v: l, l }))} />
        <SelectPill label="Teacher" value={teacher} onChange={setTeacher} options={TEACHERS.map((id) => ({ v: id, l: TEACHER[id].name }))} />
        <SelectPill label="Focus" value={focus} onChange={setFocus} options={FOCUSES.map((f) => ({ v: f, l: f }))} />
        <Chip active={favOnly} onClick={() => setFavOnly(!favOnly)} icon={favOnly ? 'ri-heart-fill' : 'ri-heart-line'} count={favs.length}>Your favourites</Chip>
        {anyFilter && (
          <button type="button" onClick={clear} className="h-9 px-3 rounded-full text-[13.5px] font-medium text-[var(--teal)] whitespace-nowrap flex-shrink-0 hover:bg-[var(--teal-soft)]">
            Clear
          </button>
        )}
      </div>

      {list.length === 0 ? (
        <Panel>
          <Empty icon="ri-film-line" title={favOnly && !favs.length ? 'No favourites yet' : 'No classes match those filters'}>
            {favOnly && !favs.length ? 'Tap the heart on any class to save it here.' : (
              <button type="button" onClick={clear} className="text-[var(--teal)] font-medium">Clear filters</button>
            )}
          </Empty>
        </Panel>
      ) : (
        <div className="grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((v) => (
            <VideoCard key={v.id} v={v} fav={favs.includes(v.id)} rented={rented.includes(v.id)}
              onFav={() => toggleFav(v.id)} onOpen={() => onOpen(v.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function SelectPill({ label, value, options, onChange }: { label: string; value: string; options: { v: string; l: string }[]; onChange: (v: string) => void }) {
  const active = value !== '';
  return (
    <label className={cx('relative inline-flex items-center h-9 rounded-full border text-[13.5px] font-medium flex-shrink-0 transition-colors',
      active ? 'bg-[var(--teal)] text-white border-[var(--teal)]' : 'bg-white/80 text-[var(--ink-2)] border-[var(--line-2)] hover:border-[var(--ink-3)]')}>
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-transparent h-full pl-3.5 pr-8 rounded-full cursor-pointer focus:outline-none">
        <option value="" style={{ color: '#243037' }}>{active ? `Any ${label.toLowerCase()}` : label}</option>
        {options.map((o) => <option key={o.v} value={o.v} style={{ color: '#243037' }}>{o.l}</option>)}
      </select>
      <Icon name="ri-arrow-down-s-line" className="absolute right-2.5 pointer-events-none text-[16px]" />
    </label>
  );
}

function AccessBadge({ v, rented }: { v: Video; rented: boolean }) {
  if (v.access === 'free') return <Badge tone="green">Free</Badge>;
  if (v.access === 'rental') return rented
    ? <Badge tone="teal">Rented · 48h</Badge>
    : <Badge tone="gray"><span className="num">Rent 48h · {peso(v.rentalPrice ?? 0)}</span></Badge>;
  return <Badge tone="teal">Included with membership</Badge>;
}

function HeartButton({ on, onClick, className = '' }: { on: boolean; onClick: () => void; className?: string }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} aria-label={on ? 'Remove from favourites' : 'Save to favourites'}
      className={cx('w-10 h-10 rounded-full glass-strong inline-flex items-center justify-center transition-transform active:scale-90', className)}>
      <Icon name={on ? 'ri-heart-fill' : 'ri-heart-line'} className={cx('text-[18px]', on ? 'text-[var(--teal)]' : 'text-[var(--ink)]')} />
    </button>
  );
}

function VideoCard({ v, fav, rented, onFav, onOpen }: { v: Video; fav: boolean; rented: boolean; onFav: () => void; onOpen: () => void }) {
  const t = TEACHER[v.instructorId];
  return (
    <div className="group relative">
      <button type="button" onClick={onOpen} className="block w-full text-left">
        <div className="relative aspect-video rounded-2xl overflow-hidden bg-[#0e1418]">
          <img src={v.image} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
          <span className="absolute left-2.5 bottom-2.5 h-6 px-2 rounded-full bg-black/55 backdrop-blur-sm text-white text-[12px] font-medium num inline-flex items-center">
            {v.duration} min
          </span>
          {PROGRESS[v.id] && (
            <div className="absolute left-0 right-0 bottom-0 h-1 bg-white/30"><div className="h-full bg-white" style={{ width: `${PROGRESS[v.id] * 100}%` }} /></div>
          )}
        </div>
        <div className="mt-3 pr-2">
          <div className="font-medium text-[15.5px] leading-snug">{v.title}</div>
          <div className="text-[13.5px] text-[var(--ink-2)] mt-0.5">{t.name} · {v.level}</div>
          <div className="mt-2"><AccessBadge v={v} rented={rented} /></div>
        </div>
      </button>
      <HeartButton on={fav} onClick={onFav} className="absolute top-2.5 right-2.5" />
    </div>
  );
}

/* ============================== Player ============================== */

function Player({ v, fav, toggleFav, rented, onRent, onClose }: { v: Video; fav: boolean; toggleFav: () => void; rented: boolean; onRent: () => void; onClose: () => void }) {
  const { toast } = useDemo();
  const t = TEACHER[v.instructorId];
  const needsRent = v.access === 'rental' && !rented;
  const needsMembership = v.access === 'members' && !libraryWallet;
  const locked = needsRent || needsMembership;
  const p = PROGRESS[v.id];
  const filmedAt = LOC[t.locations[0]]?.name ?? 'Seaside';

  const access =
    v.access === 'free' ? 'Free for everyone.'
    : v.access === 'rental' ? (rented ? 'Rented. Watch as often as you like for the next 48 hours.' : 'Rent once and watch as often as you like for 48 hours.')
    : libraryWallet ? `Included with your ${PRODUCT[libraryWallet.productId].name.toLowerCase()} until ${dateLabel(libraryWallet.expiresAt)}.`
    : 'Included with the online membership.';

  const play = () => {
    if (locked) toast(needsRent ? 'Rent this class to start watching' : 'Join the online membership to watch', 'info');
    else toast('Playback is part of the full build', 'info');
  };

  const footer = (
    <div className="flex items-center gap-3">
      <HeartButton on={fav} onClick={toggleFav} className="!bg-white border border-[var(--line-2)] flex-shrink-0" />
      <div className="flex-1 min-w-0">
        {needsRent ? (
          <Button block size="lg" onClick={() => { onRent(); toast('Rented. Yours to watch for the next 48 hours.'); }}>
            Rent for 48 hours · <span className="num">{peso(v.rentalPrice ?? 0)}</span>
          </Button>
        ) : needsMembership ? (
          <ButtonLink block size="lg" to={to('/checkout?product=online')}>
            Get online membership · <span className="num">{peso(ONLINE.price)}/mo</span>
          </ButtonLink>
        ) : (
          <Button block size="lg" icon="ri-play-fill" onClick={play}>{p ? 'Resume' : 'Play'}</Button>
        )}
      </div>
    </div>
  );

  return (
    <Sheet open onClose={onClose} wide title={v.title} footer={footer}>
      <div className="relative aspect-video rounded-2xl overflow-hidden bg-[#0e1418]">
        <img src={v.image} alt="" className="absolute inset-0 w-full h-full object-cover opacity-75" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
        <button type="button" onClick={play} aria-label={locked ? 'Locked' : 'Play'}
          className="absolute inset-0 m-auto w-[72px] h-[72px] rounded-full bg-white/90 text-[var(--ink)] inline-flex items-center justify-center shadow-[0_10px_30px_rgba(0,0,0,0.35)] transition-transform hover:scale-105 active:scale-95">
          <Icon name={locked ? 'ri-lock-line' : 'ri-play-fill'} className={cx('text-[30px]', !locked && 'translate-x-[2px]')} />
        </button>
        {p && (
          <span className="absolute left-3 bottom-3 text-white/90 text-[12.5px] num">{Math.round(v.duration * p)} of {v.duration} min watched</span>
        )}
        {p && (
          <div className="absolute left-0 right-0 bottom-0 h-1 bg-white/25"><div className="h-full bg-white" style={{ width: `${p * 100}%` }} /></div>
        )}
      </div>

      <p className="mt-5 text-[15px] leading-relaxed text-[var(--ink-2)]">
        {STYLE_LINE[v.style] ?? ''} Filmed at the {filmedAt} studio.
      </p>

      <dl className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-px rounded-2xl overflow-hidden border border-[var(--line)] bg-[var(--line)]">
        {[['Style', v.style], ['Level', v.level], ['Focus', v.focus], ['Length', `${v.duration} min`]].map(([k, val]) => (
          <div key={k} className="bg-white px-4 py-3">
            <dt className="text-[12.5px] text-[var(--ink-3)]">{k}</dt>
            <dd className="text-[14.5px] font-medium num mt-0.5">{val}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-5 flex gap-3 items-start text-[14px] text-[var(--ink-2)]">
        <Icon name={locked ? 'ri-lock-line' : 'ri-checkbox-circle-line'} className={cx('text-[18px] mt-px', locked ? 'text-[var(--ink-3)]' : 'text-[var(--teal)]')} />
        <span>{access}</span>
      </div>

      <div className="mt-6 pt-5 border-t border-[var(--line)] flex gap-3.5">
        <Avatar name={t.name} color={t.color} size={44} />
        <div className="min-w-0">
          <div className="font-medium">{t.name}</div>
          <p className="text-[14px] text-[var(--ink-2)] mt-0.5 leading-relaxed">{t.bio}</p>
        </div>
      </div>
    </Sheet>
  );
}
