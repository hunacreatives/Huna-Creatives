import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, animate, motion, useReducedMotion } from 'framer-motion';

// The proposal's one signature moment: a member's whole journey with AYA,
// told as a scroll story. The phone and the studio dashboard stay pinned
// while the captions scroll past; each caption moves both to the next scene.
// Code-drawn, sample data only. Every feature shown is live in the Asana
// Studio build, so nothing here is a promise we haven't already shipped.

const S = '#5E7464';
const INK = '#1F2421';
const CLAY = '#B4693B';
const EASE = [0.22, 1, 0.36, 1] as const;

const SCENES: [string, string][] = [
  ['Ana finds AYA', 'An Instagram post with a booking link. With ads set up, you can see which posts bring in bookings.'],
  ['She picks a class', "AYA's live schedule shows what's on, who's teaching and how many spots are left."],
  ['She signs up', 'One short form. The health form and waiver are done online, before she walks in.'],
  ['She picks a pack', 'Drop-in or a class pack. You set the packs, prices and expiry in the admin.'],
  ['She pays by QR', 'GCash, Maya, any bank app or card, through PayMongo. Your dashboard updates the moment it clears.'],
  ["She's booked", 'The confirmation and receipt land in her inbox in AYA\'s design. Her spot fills on your side.'],
  ['A spot opens', 'Ana is on the waitlist for Saturday. Someone cancels, gets their credit back, and Ana is moved in and told.'],
  ['Plans change', 'Cancel a class from the admin and everyone booked gets an email and their credit back. Nobody has to text forty people.'],
  ['Class day', 'Your team checks people in from the roster. Ana sees her class done and her credits left.'],
  ['She comes back', 'When her pack runs low, AYA reminds her. Your reports show the month adding up.'],
];

const LAST = SCENES.length - 1;

// ---------------------------------------------------------------- helpers

function Peso({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(value);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const controls = animate(prev.current, value, {
      duration: 1.1, ease: EASE,
      onUpdate: v => { node.textContent = `₱${Math.round(v).toLocaleString('en-PH')}`; },
    });
    prev.current = value;
    return () => controls.stop();
  }, [value]);
  return <span ref={ref}>₱{value.toLocaleString('en-PH')}</span>;
}

function Qr() {
  // Deterministic pseudo-QR: finder squares in three corners, noise elsewhere.
  const n = 21;
  const cells: React.ReactElement[] = [];
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const fx = x >= n - 7 ? x - (n - 7) : x;
      const fy = y >= n - 7 ? y - (n - 7) : y;
      const finder = (x < 7 || x >= n - 7) && (y < 7 || y >= n - 7) && !(x >= n - 7 && y >= n - 7);
      const on = finder
        ? fx === 0 || fx === 6 || fy === 0 || fy === 6 || (fx >= 2 && fx <= 4 && fy >= 2 && fy <= 4)
        : ((x * 7 + y * 13 + x * y) % 5) < 2;
      if (on) cells.push(<rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" />);
    }
  }
  return <svg viewBox={`0 0 ${n} ${n}`} className="w-full h-full" fill={INK} shapeRendering="crispEdges">{cells}</svg>;
}

function Tick({ size = 12, color = 'white' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M3 8.5l3.2 3.2L13 4.5" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const fade = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.4, ease: EASE },
};

// ---------------------------------------------------------------- phone screens

function AppHeader() {
  return (
    <div className="px-4 pt-2 pb-2 flex items-center justify-between">
      <span className="text-[15px] font-semibold tracking-[0.18em]" style={{ color: INK }}>AYA</span>
      <span className="w-6 h-6 rounded-full text-[9px] font-semibold flex items-center justify-center text-white" style={{ background: S }}>AR</span>
    </div>
  );
}

function Notification({ title, body, delay = 0.6 }: { title: string; body: string; delay?: number }) {
  return (
    <motion.div
      initial={{ y: -80, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
      transition={{ delay, duration: 0.5, ease: EASE }}
      className="absolute left-2.5 right-2.5 top-9 z-20 rounded-2xl px-3 py-2.5 flex gap-2.5 items-start backdrop-blur-md"
      style={{ background: 'rgba(255,255,255,0.94)', boxShadow: '0 10px 30px rgba(0,0,0,0.14)' }}>
      <span className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center text-white text-[8px] font-bold tracking-[0.1em]" style={{ background: INK }}>AYA</span>
      <span className="min-w-0 text-[10px] leading-snug" style={{ color: INK }}>
        <b>{title}</b><br /><span className="text-gray-500">{body}</span>
      </span>
    </motion.div>
  );
}

function Instagram() {
  return (
    <motion.div {...fade} className="h-full flex flex-col bg-white">
      <div className="px-3 pt-2 pb-2 flex items-center gap-2 border-b border-black/[0.05]">
        <span className="text-[13px] font-semibold" style={{ color: INK }}>Instagram</span>
      </div>
      <div className="px-3 py-2 flex items-center gap-2">
        <span className="w-7 h-7 rounded-full p-[1.5px]" style={{ background: `linear-gradient(45deg, ${CLAY}, ${S})` }}>
          <span className="w-full h-full rounded-full bg-white flex items-center justify-center text-[7px] font-bold tracking-[0.1em]" style={{ color: INK }}>AYA</span>
        </span>
        <span className="text-[10.5px] leading-tight" style={{ color: INK }}><b>aya.studio</b><br /><span className="text-gray-400">Makati</span></span>
      </div>
      <div className="relative aspect-square overflow-hidden">
        <motion.img src="/proposals/aya-studio/band.webp" alt="" className="w-full h-full object-cover"
          initial={{ scale: 1.08 }} animate={{ scale: 1 }} transition={{ duration: 3, ease: EASE }} />
      </div>
      <motion.div className="mx-3 mt-2 rounded-md px-3 py-2 flex items-center justify-between text-white text-[11px] font-semibold"
        style={{ background: S }}
        animate={{ scale: [1, 1, 0.96, 1] }} transition={{ delay: 1.2, duration: 1.4, times: [0, 0.6, 0.8, 1] }}>
        Book a class <span>›</span>
      </motion.div>
      <p className="px-3 pt-2 text-[10px] leading-snug" style={{ color: INK }}>
        <b>aya.studio</b> <span className="text-gray-600">Mornings that start slow. Reformer, barre and yoga, opening soon.</span>
      </p>
    </motion.div>
  );
}

const CLASSES = [
  { time: '7:00 AM', name: 'Reformer Flow', coach: 'Mika', left: '1 spot left', hot: true },
  { time: '9:00 AM', name: 'Barre Sculpt', coach: 'Jo', left: 'Waitlist', hot: false },
  { time: '12:15 PM', name: 'Express Mat', coach: 'Lia', left: '6 spots', hot: false },
  { time: '6:30 PM', name: 'Slow Flow Yoga', coach: 'Ren', left: '4 spots', hot: false },
];

function Schedule() {
  return (
    <motion.div {...fade} className="h-full">
      <AppHeader />
      <div className="px-4">
        <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400 mb-2">Schedule</p>
        <div className="flex gap-1.5 mb-2.5">
          {[['Wed', 29], ['Thu', 30], ['Fri', 31], ['Sat', 1], ['Sun', 2]].map(([d, n], i) => (
            <span key={d} className="flex-1 text-center rounded-lg py-1.5 text-[10px] font-medium"
              style={i === 2 ? { background: INK, color: 'white' } : { background: '#F0EEE8', color: '#6b6b6b' }}>
              {d}<br /><span className="text-[12px] font-semibold">{n}</span>
            </span>
          ))}
        </div>
        <div className="flex gap-1.5 mb-2.5 text-[9px]">
          {['All', 'Reformer', 'Barre', 'Yoga'].map((f, i) => (
            <span key={f} className="px-2 py-1 rounded-full border" style={i === 0 ? { borderColor: INK, color: INK } : { borderColor: 'rgba(0,0,0,0.1)', color: '#888' }}>{f}</span>
          ))}
        </div>
        <div className="space-y-1.5">
          {CLASSES.map((c, i) => (
            <motion.div key={c.name}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0, scale: i === 0 ? [1, 1, 0.97, 1] : 1 }}
              transition={{ delay: 0.1 + i * 0.07, duration: i === 0 ? 2.2 : 0.4, times: i === 0 ? [0, 0.7, 0.85, 1] : undefined }}
              className="rounded-xl bg-white px-3 py-2.5 flex items-center gap-3 border"
              style={{ borderColor: i === 0 ? `${S}80` : 'rgba(0,0,0,0.05)' }}>
              <span className="text-[10px] text-gray-500 w-11 tabular-nums">{c.time}</span>
              <span className="flex-1 min-w-0">
                <span className="block text-[11.5px] font-semibold truncate" style={{ color: INK }}>{c.name}</span>
                <span className="block text-[9.5px] text-gray-400">with {c.coach}</span>
              </span>
              <span className="text-[9px] font-medium" style={{ color: c.hot ? CLAY : '#8a8a8a' }}>{c.left}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function Typed({ text, delay }: { text: string; delay: number }) {
  return (
    <span>
      {text.split('').map((ch, i) => (
        <motion.span key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: delay + i * 0.045, duration: 0.01 }}>{ch}</motion.span>
      ))}
    </span>
  );
}

function Signup() {
  const field = 'rounded-lg border border-black/[0.08] bg-white px-3 py-2 text-[11px] min-h-[32px]';
  return (
    <motion.div {...fade} className="h-full">
      <AppHeader />
      <div className="px-4">
        <p className="text-[17px] font-semibold mt-1" style={{ color: INK }}>Create your account</p>
        <p className="text-[10.5px] text-gray-500 mt-0.5 mb-4">So we know who's coming to class.</p>
        <p className="text-[9.5px] text-gray-400 mb-1">Full name</p>
        <div className={field} style={{ color: INK }}><Typed text="Ana Reyes" delay={0.4} /></div>
        <p className="text-[9.5px] text-gray-400 mb-1 mt-2.5">Email</p>
        <div className={field} style={{ color: INK }}><Typed text="ana.reyes@gmail.com" delay={0.9} /></div>
        <div className="mt-4 space-y-2">
          {['Health form completed', 'Waiver signed'].map((l, i) => (
            <div key={l} className="flex items-center gap-2.5 text-[11px]" style={{ color: INK }}>
              <motion.span className="w-4 h-4 rounded flex items-center justify-center border"
                initial={{ background: 'rgba(0,0,0,0)', borderColor: 'rgba(0,0,0,0.2)' }}
                animate={{ background: S, borderColor: S }} transition={{ delay: 2.1 + i * 0.4, duration: 0.2 }}>
                <Tick size={10} />
              </motion.span>
              {l}
            </div>
          ))}
        </div>
        <motion.div className="mt-5 rounded-xl py-3 text-center text-white text-[12px] font-semibold" style={{ background: INK }}
          animate={{ scale: [1, 1, 0.96, 1] }} transition={{ duration: 3.4, times: [0, 0.85, 0.92, 1] }}>
          Create account
        </motion.div>
      </div>
    </motion.div>
  );
}

function Choose() {
  const options = [
    { name: 'Drop-in', note: 'One class', price: '₱950', pick: false },
    { name: '5-class pack', note: 'Valid 30 days · save ₱500', price: '₱4,250', pick: true },
    { name: '10-class pack', note: 'Valid 60 days · save ₱1,500', price: '₱8,000', pick: false },
  ];
  return (
    <motion.div {...fade} className="h-full">
      <AppHeader />
      <div className="px-4">
        <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">Reformer Flow · Fri 7:00 AM</p>
        <p className="text-[17px] font-semibold mt-1 mb-4" style={{ color: INK }}>How would you like to pay?</p>
        <div className="space-y-2">
          {options.map((o, i) => (
            <motion.div key={o.name} className="rounded-xl px-3 py-3 flex items-center gap-3 border bg-white"
              initial={{ borderColor: 'rgba(0,0,0,0.07)' }}
              animate={{ borderColor: o.pick ? S : 'rgba(0,0,0,0.07)', backgroundColor: o.pick ? `${S}0F` : '#FFFFFF' }}
              transition={{ delay: o.pick ? 1.1 : 0, duration: 0.3 }}>
              <motion.span className="w-4 h-4 rounded-full border-2 flex-shrink-0"
                initial={{ borderColor: 'rgba(0,0,0,0.2)' }}
                animate={{ borderColor: o.pick ? S : 'rgba(0,0,0,0.2)', boxShadow: o.pick ? `inset 0 0 0 3px white, inset 0 0 0 8px ${S}` : 'none' }}
                transition={{ delay: o.pick ? 1.1 : 0, duration: 0.3 }} />
              <span className="flex-1 min-w-0">
                <span className="block text-[11.5px] font-semibold" style={{ color: INK }}>{o.name}</span>
                <span className="block text-[9.5px] text-gray-400">{o.note}</span>
              </span>
              <span className="text-[11.5px] font-semibold tabular-nums" style={{ color: INK }}>{o.price}</span>
              {i === 1 && <span className="sr-only">selected</span>}
            </motion.div>
          ))}
        </div>
        <div className="mt-5 rounded-xl py-3 text-center text-white text-[12px] font-semibold" style={{ background: INK }}>
          Continue to payment
        </div>
      </div>
    </motion.div>
  );
}

function Pay() {
  return (
    <motion.div {...fade} className="h-full">
      <AppHeader />
      <div className="px-4 text-center">
        <p className="text-[13px] font-semibold mt-3" style={{ color: INK }}>Scan to pay ₱4,250</p>
        <p className="text-[10px] text-gray-400 mt-0.5">GCash, Maya or any bank app</p>
        <div className="relative mx-auto mt-5 w-[160px] h-[160px] p-3 rounded-2xl border border-black/[0.06] bg-white overflow-hidden">
          <Qr />
          <motion.span className="absolute inset-x-0 h-[2px]" style={{ background: S, boxShadow: `0 0 12px ${S}` }}
            initial={{ top: '8%' }} animate={{ top: ['8%', '92%', '8%'] }} transition={{ duration: 1.8, ease: 'easeInOut' }} />
        </div>
        <motion.div className="mt-5 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold text-white"
          style={{ background: S }}
          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 2, duration: 0.35 }}>
          <Tick size={11} /> Payment received
        </motion.div>
        <p className="mt-6 text-[9.5px] text-gray-400">Secured by PayMongo</p>
      </div>
    </motion.div>
  );
}

function Booked() {
  return (
    <motion.div {...fade} className="h-full relative">
      <AppHeader />
      <div className="px-4 text-center pt-6">
        <motion.span className="mx-auto w-14 h-14 rounded-full flex items-center justify-center" style={{ background: S }}
          initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}>
          <svg width="26" height="26" viewBox="0 0 16 16" fill="none">
            <motion.path d="M3 8.5l3.2 3.2L13 4.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.35, duration: 0.4 }} />
          </svg>
        </motion.span>
        <p className="text-[17px] font-semibold mt-4" style={{ color: INK }}>You're booked</p>
        <p className="text-[11px] text-gray-500 mt-1">Reformer Flow · Fri 7:00 AM with Mika</p>
        <p className="text-[10px] text-gray-400 mt-1">4 classes left in your pack</p>
      </div>

      {/* the confirmation email opens over the screen */}
      <motion.div className="absolute inset-0 z-10 bg-white px-4 pt-10"
        initial={{ y: '100%' }} animate={{ y: 0 }} transition={{ delay: 2.4, duration: 0.6, ease: EASE }}>
        <p className="text-[9.5px] text-gray-400">From AYA Studio · just now</p>
        <p className="text-[13px] font-semibold mt-1 mb-3" style={{ color: INK }}>You're booked: Reformer Flow</p>
        <div className="rounded-xl overflow-hidden border border-black/[0.06]">
          <div className="px-4 py-3 text-white" style={{ background: INK }}>
            <p className="text-[12px] font-semibold tracking-[0.2em]">AYA</p>
          </div>
          <div className="px-4 py-3" style={{ background: '#FBFAF7' }}>
            <p className="text-[9px] uppercase tracking-[0.14em]" style={{ color: S }}>Booking confirmed</p>
            <p className="text-[14px] font-semibold mt-1" style={{ color: INK }}>See you Friday, Ana.</p>
            <div className="mt-3 space-y-1.5 text-[10px]">
              {[['Class', 'Reformer Flow'], ['When', 'Fri 31 Oct · 7:00 AM'], ['Instructor', 'Mika'], ['Paid', '₱4,250 · 5-class pack'], ['Credits left', '4 of 5']].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 border-b border-black/[0.05] pb-1.5">
                  <span className="text-gray-400">{k}</span><span style={{ color: INK }}>{v}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-lg py-2 text-center text-white text-[10.5px] font-semibold" style={{ background: S }}>Add to calendar</div>
          </div>
        </div>
      </motion.div>

      <Notification title="You're booked: Reformer Flow" body="Fri 7:00 AM with Mika. Your receipt is attached." delay={1.1} />
    </motion.div>
  );
}

function LockScreen({ children, time = '9:41', date = 'Thursday, 30 October' }: { children: React.ReactNode; time?: string; date?: string }) {
  return (
    <motion.div {...fade} className="h-full relative overflow-hidden">
      <img src="/proposals/aya-studio/hero.webp" alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(31,36,33,0.35), rgba(31,36,33,0.55))' }} />
      <div className="relative text-center text-white pt-10">
        <p className="text-[11px] opacity-80">{date}</p>
        <p className="text-[54px] font-light leading-none mt-1 tracking-[-0.02em]">{time}</p>
      </div>
      <div className="relative px-2.5 mt-8 space-y-2">{children}</div>
    </motion.div>
  );
}

function LockNote({ title, body, delay, when = 'now' }: { title: string; body: string; delay: number; when?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: -14, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.5, ease: EASE }}
      className="rounded-2xl px-3 py-2.5 flex gap-2.5 items-start backdrop-blur-md"
      style={{ background: 'rgba(255,255,255,0.88)' }}>
      <span className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center text-white text-[8px] font-bold tracking-[0.1em]" style={{ background: INK }}>AYA</span>
      <span className="flex-1 min-w-0 text-[10px] leading-snug" style={{ color: INK }}>
        <span className="flex justify-between gap-2"><b>{title}</b><span className="text-gray-400 flex-shrink-0">{when}</span></span>
        <span className="text-gray-600">{body}</span>
      </span>
    </motion.div>
  );
}

function Waitlist() {
  return (
    <LockScreen time="8:12" date="Thursday, 30 October">
      <LockNote title="You're in: Barre Sculpt" body="A spot opened in Saturday's 9:00 AM class, so we've booked you in. 3 classes left in your pack." delay={0.9} />
    </LockScreen>
  );
}

function Inbox() {
  const mails = [
    { s: 'Class cancelled: Slow Flow Yoga', p: 'Sorry, Ren is unwell. Your credit is back in your pack.', fresh: true },
    { s: "You're in: Barre Sculpt", p: 'A spot opened in Saturday\'s 9:00 AM class.' },
    { s: "You're booked: Reformer Flow", p: 'Fri 7:00 AM with Mika. Your receipt is attached.' },
    { s: 'Your 5-class pack is ready', p: '₱4,250 paid by QR. Valid until 30 Nov.' },
    { s: 'Welcome to AYA', p: 'Your account is set up. Here\'s what to bring to your first class.' },
  ];
  return (
    <motion.div {...fade} className="h-full bg-white">
      <div className="px-4 pt-3 pb-2">
        <p className="text-[17px] font-semibold" style={{ color: INK }}>Inbox</p>
      </div>
      <div className="divide-y divide-black/[0.05]">
        {mails.map((m, i) => (
          <motion.div key={m.s} className="px-4 py-2.5 flex gap-2.5"
            initial={m.fresh ? { opacity: 0, height: 0 } : { opacity: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ delay: m.fresh ? 1 : 0.1 + i * 0.05, duration: 0.45, ease: EASE }}
            style={m.fresh ? { background: `${S}0F` } : undefined}>
            <span className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[7px] font-bold tracking-[0.08em]" style={{ background: INK }}>AYA</span>
            <span className="min-w-0 flex-1">
              <span className="flex justify-between gap-2 text-[10px]">
                <b className="truncate" style={{ color: INK }}>AYA Studio</b>
                <span className="text-gray-400 flex-shrink-0">{m.fresh ? 'now' : ['', '1h', '9h', '9h', '9h'][i]}</span>
              </span>
              <span className="block text-[10.5px] font-medium truncate" style={{ color: INK }}>{m.s}</span>
              <span className="block text-[9.5px] text-gray-400 truncate">{m.p}</span>
            </span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function ClassDay() {
  return (
    <motion.div {...fade} className="h-full">
      <AppHeader />
      <div className="px-4">
        <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400 mb-2">My classes</p>
        <div className="rounded-xl bg-white border border-black/[0.06] px-3 py-3 flex items-center gap-3">
          <span className="text-[10px] text-gray-500 w-11 tabular-nums">Today<br />7:00</span>
          <span className="flex-1">
            <span className="block text-[11.5px] font-semibold" style={{ color: INK }}>Reformer Flow</span>
            <span className="block text-[9.5px] text-gray-400">with Mika</span>
          </span>
          <motion.span className="text-[9.5px] font-semibold px-2 py-1 rounded-full text-white flex items-center gap-1" style={{ background: S }}
            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.6, duration: 0.3 }}>
            <Tick size={9} /> Checked in
          </motion.span>
        </div>
        <div className="rounded-xl bg-white border border-black/[0.06] px-3 py-3 mt-1.5 flex items-center gap-3">
          <span className="text-[10px] text-gray-500 w-11 tabular-nums">Sat<br />9:00</span>
          <span className="flex-1">
            <span className="block text-[11.5px] font-semibold" style={{ color: INK }}>Barre Sculpt</span>
            <span className="block text-[9.5px] text-gray-400">with Jo</span>
          </span>
          <span className="text-[9.5px] text-gray-400">Booked</span>
        </div>

        <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400 mt-5 mb-2">My pack</p>
        <div className="rounded-xl px-4 py-4 flex items-center gap-4" style={{ background: '#F4F2EC' }}>
          <svg width="54" height="54" viewBox="0 0 54 54">
            <circle cx="27" cy="27" r="22" fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="5" />
            <motion.circle cx="27" cy="27" r="22" fill="none" stroke={S} strokeWidth="5" strokeLinecap="round"
              transform="rotate(-90 27 27)" strokeDasharray={2 * Math.PI * 22}
              initial={{ strokeDashoffset: 2 * Math.PI * 22 * (1 - 4 / 5) }}
              animate={{ strokeDashoffset: 2 * Math.PI * 22 * (1 - 3 / 5) }}
              transition={{ delay: 1.8, duration: 0.8, ease: EASE }} />
          </svg>
          <span>
            <span className="block text-[12px] font-semibold" style={{ color: INK }}>3 of 5 classes left</span>
            <span className="block text-[10px] text-gray-500">5-class pack · valid until 30 Nov</span>
          </span>
        </div>
      </div>
    </motion.div>
  );
}

function ComesBack() {
  return (
    <LockScreen time="7:30" date="Saturday, 22 November">
      <LockNote title="1 class left in your pack" body="Your 5-class pack expires 30 Nov. Book your next class or pick up a new pack." delay={0.8} />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.6 }}
        className="mx-auto w-fit rounded-full px-4 py-2 text-[10.5px] font-semibold" style={{ background: 'rgba(255,255,255,0.9)', color: INK }}>
        Book again
      </motion.div>
    </LockScreen>
  );
}

const PHONE = [Instagram, Schedule, Signup, Choose, Pay, Booked, Waitlist, Inbox, ClassDay, ComesBack];

function Phone({ scene }: { scene: number }) {
  const Screen = PHONE[scene];
  const dark = scene === 6 || scene === 9;
  return (
    <div className="w-[262px] h-[540px] rounded-[44px] p-[9px] shadow-[0_40px_80px_-20px_rgba(31,36,33,0.45)]" style={{ background: INK }}>
      <div className="relative w-full h-full rounded-[36px] overflow-hidden" style={{ background: '#FBFAF7' }}>
        <div className={`absolute inset-x-0 top-0 z-30 flex items-center justify-between px-6 pt-3 text-[10px] font-semibold ${dark ? 'text-white' : ''}`}
          style={dark ? undefined : { color: INK }}>
          <span>{dark ? '' : '6:42'}</span>
          <span className="w-16 h-[18px] rounded-full bg-black absolute left-1/2 -translate-x-1/2 top-2" />
          <span className="w-3.5 h-2 rounded-[2px] border border-current" />
        </div>
        <div className="absolute inset-0 pt-7">
          <AnimatePresence mode="wait">
            <Screen key={scene} />
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- studio dashboard

const BASE_FEED = [
  { who: 'Paolo D.', what: 'bought a 10-class pack', when: '12 min' },
  { who: 'Bea S.', what: 'booked Barre Sculpt, Sat 9:00', when: '26 min' },
  { who: 'Carla M.', what: 'joined the Barre Sculpt waitlist', when: '41 min' },
];

// Studio-side events, keyed by the scene that triggers them (newest last).
const EVENTS: { at: number; who: string; what: string }[] = [
  { at: 2, who: 'Ana R.', what: 'signed up · health form and waiver done' },
  { at: 4, who: 'Ana R.', what: 'bought a 5-class pack · ₱4,250 by QR' },
  { at: 5, who: 'Ana R.', what: 'booked Reformer Flow, Fri 7:00' },
  { at: 6, who: 'Bea S.', what: 'cancelled Barre Sculpt · credit returned' },
  { at: 6, who: 'Ana R.', what: 'moved in from the Barre Sculpt waitlist' },
  { at: 7, who: 'You', what: 'cancelled Slow Flow Yoga · 8 members emailed, credits returned' },
];

const ROSTER_NAMES = ['Ana R.', 'Bianca T.', 'Miguel S.', 'Jen L.', 'Kat V.', 'Rio P.', 'Dana C.', 'Sam U.'];

function TodayView({ scene }: { scene: number }) {
  const revenue = 12_400 + (scene >= 4 ? 4_250 : 0);
  const bookings = 31 + (scene >= 5 ? 1 : 0);
  const members = 214 + (scene >= 2 ? 1 : 0);
  const roster = [
    { time: '7:00', name: 'Reformer Flow', booked: scene >= 5 ? 8 : 7, cap: 8 },
    { time: '9:00', name: 'Barre Sculpt (Sat)', booked: 10, cap: 10 },
    { time: '12:15', name: 'Express Mat', booked: 6, cap: 12 },
    { time: '18:30', name: 'Slow Flow Yoga', booked: 8, cap: 12, off: scene >= 7 },
  ];
  const events = EVENTS.filter(e => e.at <= scene).reverse();
  const feed = [
    ...events.map((e, k) => ({ ...e, when: k === 0 ? 'now' : `${k * 4} min`, fresh: k === 0 })),
    ...BASE_FEED.map(f => ({ ...f, fresh: false })),
  ].slice(0, 5);
  const lit = (from: number) => scene >= from;
  return (
    <motion.div key="today" {...fade}>
      <div className="flex items-baseline justify-between mb-4">
        <p className="text-[14px] font-semibold" style={{ color: INK }}>Today</p>
        <p className="text-[10.5px] text-gray-400">Thu 30 October</p>
      </div>
      <div className="grid grid-cols-3 gap-2.5 mb-4">
        {([['Revenue', <Peso key="r" value={revenue} />, lit(4)], ['Bookings', bookings, lit(5)], ['Members', members, lit(2)]] as const).map(([label, value, on]) => (
          <motion.div key={label} className="rounded-xl px-3 py-2.5 border"
            animate={{ borderColor: on ? `${S}66` : 'rgba(0,0,0,0.05)', backgroundColor: on ? `${S}0D` : 'rgba(255,255,255,0)' }}
            transition={{ duration: 0.6 }}>
            <p className="text-[9.5px] uppercase tracking-[0.12em] text-gray-400">{label}</p>
            <p className="text-[15px] sm:text-[17px] font-semibold tabular-nums mt-0.5" style={{ color: INK }}>{value}</p>
          </motion.div>
        ))}
      </div>
      <p className="text-[9.5px] uppercase tracking-[0.12em] text-gray-400 mb-2">Tomorrow · Fri 31</p>
      <div className="space-y-1.5 mb-4">
        {roster.map(r => {
          const full = r.booked >= r.cap;
          return (
            <div key={r.name} className="flex items-center gap-3 text-[11px]">
              <span className="w-9 text-gray-400 tabular-nums">{r.time}</span>
              <span className={`w-28 truncate ${r.off ? 'line-through text-gray-400' : ''}`} style={r.off ? undefined : { color: INK }}>{r.name}</span>
              <span className="flex-1 h-1.5 rounded-full bg-black/[0.05] overflow-hidden">
                <motion.span className="block h-full rounded-full" style={{ background: full ? S : `${S}99` }}
                  animate={{ width: r.off ? '0%' : `${(r.booked / r.cap) * 100}%` }} transition={{ duration: 0.8, ease: EASE }} />
              </span>
              <span className="w-16 text-right tabular-nums" style={{ color: r.off ? CLAY : full ? S : '#8a8a8a', fontWeight: full || r.off ? 600 : 400 }}>
                {r.off ? 'Cancelled' : full ? 'Full' : `${r.booked}/${r.cap}`}
              </span>
            </div>
          );
        })}
      </div>
      <p className="text-[9.5px] uppercase tracking-[0.12em] text-gray-400 mb-2">Activity</p>
      <div className="space-y-1">
        <AnimatePresence initial={false}>
          {feed.map(f => (
            <motion.div key={`${f.who}-${f.what}`} layout
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.5, ease: EASE }} className="overflow-hidden">
              <div className="flex items-center gap-2.5 text-[11px] rounded-lg px-2 py-1.5" style={f.fresh ? { background: `${S}12` } : undefined}>
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: f.fresh ? S : 'rgba(0,0,0,0.15)' }} />
                <span className="flex-1 min-w-0 truncate text-gray-600"><b className="font-medium" style={{ color: INK }}>{f.who}</b> {f.what}</span>
                <span className="text-gray-400 text-[10px]">{f.when}</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function RosterView() {
  return (
    <motion.div key="roster" {...fade}>
      <div className="flex items-baseline justify-between mb-1">
        <p className="text-[14px] font-semibold" style={{ color: INK }}>Reformer Flow</p>
        <p className="text-[10.5px] text-gray-400">Fri 31 · 7:00 AM · Mika</p>
      </div>
      <p className="text-[11px] text-gray-500 mb-4">8 of 8 booked · tap a name to check in</p>
      <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
        {ROSTER_NAMES.map((n, i) => {
          const checked = i < 7;
          return (
            <div key={n} className="flex items-center gap-2.5 text-[11.5px] py-1.5 border-b border-black/[0.05]">
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-[8.5px] font-semibold" style={{ background: '#F0EEE8', color: INK }}>
                {n.split(' ').map(p => p[0]).join('')}
              </span>
              <span className="flex-1" style={{ color: INK }}>{n}</span>
              {checked ? (
                <motion.span className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: S }}
                  initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5 + i * 0.18, type: 'spring', stiffness: 300, damping: 20 }}>
                  <Tick size={10} />
                </motion.span>
              ) : (
                <span className="text-[10px] text-gray-400">On the way</span>
              )}
            </div>
          );
        })}
      </div>
      <motion.p className="mt-4 text-[11px] text-gray-500" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }}>
        7 checked in · credits used automatically
      </motion.p>
    </motion.div>
  );
}

function ReportsView() {
  const months: [string, number][] = [['Jun', 0], ['Jul', 0], ['Aug', 0], ['Sep', 0], ['Oct', 0], ['Nov', 0]];
  // Sample opening curve: quiet pre-launch, then the studio opens and fills.
  const values = [0.18, 0.26, 0.38, 0.55, 0.74, 0.92];
  return (
    <motion.div key="reports" {...fade}>
      <div className="flex items-baseline justify-between mb-1">
        <p className="text-[14px] font-semibold" style={{ color: INK }}>Revenue</p>
        <p className="text-[10.5px] text-gray-400">Last 6 months</p>
      </div>
      <p className="text-[11px] text-gray-500 mb-5">Packs, drop-ins and private sessions, paid online</p>
      <div className="flex items-end gap-3 h-[170px] border-b border-black/[0.06]">
        {months.map(([m], i) => (
          <div key={m} className="flex-1 flex flex-col items-center justify-end h-full">
            <motion.span className="w-full rounded-t-md" style={{ background: i === months.length - 1 ? S : `${S}80` }}
              initial={{ height: 0 }} animate={{ height: `${values[i] * 100}%` }}
              transition={{ delay: 0.3 + i * 0.12, duration: 0.7, ease: EASE }} />
          </div>
        ))}
      </div>
      <div className="flex gap-3 mt-2">
        {months.map(([m]) => <span key={m} className="flex-1 text-center text-[10px] text-gray-400">{m}</span>)}
      </div>
      <div className="grid grid-cols-3 gap-2.5 mt-5">
        {[['Packs sold', '86'], ['Classes run', '212'], ['Repeat members', '64%']].map(([l, v]) => (
          <div key={l} className="rounded-xl px-3 py-2.5 border border-black/[0.05]">
            <p className="text-[9.5px] uppercase tracking-[0.12em] text-gray-400">{l}</p>
            <p className="text-[15px] font-semibold tabular-nums mt-0.5" style={{ color: INK }}>{v}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function Dashboard({ scene }: { scene: number }) {
  const view = scene === 8 ? 'Bookings' : scene === LAST ? 'Reports' : 'Today';
  return (
    <div className="rounded-2xl bg-white border border-black/[0.06] shadow-[0_30px_80px_-30px_rgba(31,36,33,0.35)] overflow-hidden">
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-black/[0.05]" style={{ background: '#F7F6F2' }}>
        <span className="w-2.5 h-2.5 rounded-full bg-black/10" />
        <span className="w-2.5 h-2.5 rounded-full bg-black/10" />
        <span className="w-2.5 h-2.5 rounded-full bg-black/10" />
        <span className="ml-3 text-[10.5px] text-gray-400">AYA Studio · admin · sample data</span>
      </div>
      <div className="flex min-h-[420px]">
        <div className="hidden xl:block w-[118px] border-r border-black/[0.05] px-3 py-4 space-y-0.5 flex-shrink-0">
          <p className="text-[12px] font-semibold tracking-[0.18em] px-2 mb-3" style={{ color: INK }}>AYA</p>
          {['Today', 'Bookings', 'Schedule', 'Members', 'Orders', 'Pricing', 'Reports'].map(l => (
            <p key={l} className="text-[11px] px-2 py-1.5 rounded-md transition-colors duration-300"
              style={l === view ? { background: `${S}18`, color: S, fontWeight: 600 } : { color: '#7a7a7a' }}>{l}</p>
          ))}
        </div>
        <div className="flex-1 min-w-0 p-4 sm:p-5 lg:pr-12">
          <AnimatePresence mode="wait">
            {view === 'Today' && <TodayView key="t" scene={scene} />}
            {view === 'Bookings' && <RosterView key="b" />}
            {view === 'Reports' && <ReportsView key="r" />}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// Phones get a one-line studio ticker under the device instead of the full dashboard.
function Ticker({ scene }: { scene: number }) {
  const latest = [...EVENTS].reverse().find(e => e.at === scene);
  const line = latest
    ? `${latest.who} ${latest.what}`
    : scene === 8 ? '7 of 8 checked in for Reformer Flow'
    : scene === LAST ? 'Revenue report: six months, packs and drop-ins'
    : 'Studio dashboard: waiting for bookings';
  return (
    <AnimatePresence mode="wait">
      <motion.div key={line} {...fade}
        className="mt-3 mx-auto max-w-[300px] rounded-xl bg-white border border-black/[0.06] px-3 py-2 flex items-center gap-2 text-[10.5px] shadow-sm">
        <span className="text-[8.5px] font-bold uppercase tracking-[0.12em] px-1.5 py-0.5 rounded" style={{ background: `${S}18`, color: S }}>Studio</span>
        <span className="truncate text-gray-600">{line}</span>
      </motion.div>
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------- the story

export default function JourneyStory() {
  const still = !!useReducedMotion();
  const [scene, setScene] = useState(still ? 5 : 0);
  const steps = useRef<(HTMLDivElement | null)[]>([]);

  // The caption crossing the middle of the viewport sets the scene.
  useEffect(() => {
    const io = new IntersectionObserver(entries => {
      for (const e of entries) {
        if (e.isIntersecting) setScene(Number((e.target as HTMLElement).dataset.i));
      }
    }, { rootMargin: '-45% 0px -45% 0px' });
    steps.current.forEach(el => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="relative flex flex-col lg:grid lg:grid-cols-[minmax(0,290px)_minmax(0,1fr)] lg:gap-10">
      {/* pinned devices */}
      <div className="order-1 lg:order-2 sticky top-0 h-[100svh] flex flex-col items-center justify-start lg:justify-center pt-10 lg:pt-0 z-0">
        <div className="relative w-full flex justify-center lg:items-center">
          <div className="hidden lg:block flex-1 min-w-0 -mr-8">
            <Dashboard scene={scene} />
          </div>
          <div className="origin-top scale-[0.82] sm:scale-90 lg:scale-100 flex-shrink-0 relative z-10">
            <Phone scene={scene} />
          </div>
        </div>
        <div className="lg:hidden -mt-[96px] sm:-mt-[54px] w-full px-4">
          <Ticker scene={scene} />
        </div>
      </div>

      {/* captions */}
      <div className="order-2 lg:order-1 relative z-10 -mt-[100svh] lg:mt-0">
        {SCENES.map(([title, body], i) => (
          <div key={title} data-i={i} ref={el => { steps.current[i] = el; }}
            className="min-h-[100svh] lg:min-h-[78vh] flex items-end lg:items-center pb-6 lg:pb-0 px-4 lg:px-0">
            <div className={`w-full rounded-2xl lg:rounded-none p-5 lg:p-0 bg-white/95 lg:bg-transparent shadow-[0_10px_40px_-12px_rgba(0,0,0,0.25)] lg:shadow-none backdrop-blur lg:backdrop-blur-none transition-opacity duration-500 ${scene === i ? 'lg:opacity-100' : 'lg:opacity-30'}`}>
              <p className="text-[12px] font-semibold tabular-nums mb-2" style={{ color: S }}>
                {String(i + 1).padStart(2, '0')} <span className="text-gray-300">/ {SCENES.length}</span>
              </p>
              <p className="text-[20px] lg:text-[24px] font-semibold tracking-[-0.01em] leading-snug" style={{ color: INK }}>{title}</p>
              <p className="text-[14px] lg:text-[15px] leading-[1.7] text-gray-600 mt-2 max-w-sm">{body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
