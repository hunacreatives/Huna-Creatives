import { useState } from 'react';
import { motion } from 'framer-motion';

// The two add-ons AYA asked about after the first proposal: mat selection and
// client progress tracking. Unlike JourneyStory, these aren't live at Asana
// yet, so the section says they're built for AYA. Code-drawn, sample data.

const S = '#5E7464';
const INK = '#1F2421';
const CLAY = '#B4693B';
const EASE = [0.22, 1, 0.36, 1] as const;

const rise = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.8, ease: EASE },
};

// ---------------------------------------------------------------- mat selection

const ROWS = ['A', 'B', 'C'];
const COLS = [1, 2, 3, 4];
const TAKEN = new Set(['A1', 'A2', 'A4', 'B1', 'C3']);

function MatPicker() {
  const [mine, setMine] = useState('B3');
  return (
    <div className="w-[262px] h-[540px] rounded-[44px] p-[9px] shadow-[0_40px_80px_-20px_rgba(31,36,33,0.45)] mx-auto" style={{ background: INK }}>
      <div className="relative w-full h-full rounded-[36px] overflow-hidden flex flex-col" style={{ background: '#FBFAF7' }}>
        <div className="flex items-center justify-between px-6 pt-3 text-[10px] font-semibold" style={{ color: INK }}>
          <span>6:42</span>
          <span className="w-16 h-[18px] rounded-full bg-black absolute left-1/2 -translate-x-1/2 top-2" />
          <span className="w-3.5 h-2 rounded-[2px] border border-current" />
        </div>
        <div className="px-4 pt-4 flex items-center justify-between">
          <span className="text-[15px] font-semibold tracking-[0.18em]" style={{ color: INK }}>AYA</span>
          <span className="w-6 h-6 rounded-full text-[9px] font-semibold flex items-center justify-center text-white" style={{ background: S }}>AR</span>
        </div>
        <div className="px-4 pt-3">
          <p className="text-[15px] font-semibold" style={{ color: INK }}>Pick your spot</p>
          <p className="text-[10.5px] text-gray-500 mt-0.5">Reformer Flow · Fri 7:00 AM · Mika</p>
        </div>

        <div className="mx-4 mt-4 rounded-2xl border border-black/[0.06] bg-white p-3">
          <div className="rounded-md py-1.5 text-center text-[8.5px] font-semibold tracking-[0.16em] uppercase text-gray-400" style={{ background: '#F0EEE8' }}>
            Front · Instructor
          </div>
          <div className="mt-3 space-y-2">
            {ROWS.map(r => (
              <div key={r} className="grid grid-cols-4 gap-2">
                {COLS.map(c => {
                  const id = `${r}${c}`;
                  const taken = TAKEN.has(id);
                  const on = id === mine;
                  return (
                    <motion.button key={id} type="button" disabled={taken} onClick={() => setMine(id)}
                      whileTap={taken ? undefined : { scale: 0.92 }}
                      aria-pressed={on} aria-label={`Spot ${id}${taken ? ', taken' : ''}`}
                      className="h-[46px] rounded-md flex items-end justify-center pb-1 text-[8.5px] font-semibold transition-colors cursor-pointer disabled:cursor-default"
                      style={on
                        ? { background: S, color: 'white' }
                        : taken
                          ? { background: '#E7E4DD', color: '#B5B1A8' }
                          : { background: 'white', color: INK, border: `1.5px solid ${S}55` }}>
                      {id}
                    </motion.button>
                  );
                })}
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-center gap-3 text-[8.5px] text-gray-500">
            <span className="flex items-center gap-1"><i className="w-2.5 h-2.5 rounded-sm" style={{ border: `1.5px solid ${S}55` }} />Open</span>
            <span className="flex items-center gap-1"><i className="w-2.5 h-2.5 rounded-sm" style={{ background: '#E7E4DD' }} />Taken</span>
            <span className="flex items-center gap-1"><i className="w-2.5 h-2.5 rounded-sm" style={{ background: S }} />Yours</span>
          </div>
        </div>

        <div className="mt-auto px-4 pb-6">
          <p className="text-[10px] text-gray-500 text-center mb-2">7 of 12 spots open · tap a spot to switch</p>
          <div className="rounded-xl py-3 text-center text-white text-[12px] font-semibold" style={{ background: INK }}>
            Book spot {mine} · 1 credit
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- progress tracking

const WEIGHTS: [string, number][] = [['Mar 8', 64.0], ['Apr 12', 63.1], ['May 10', 62.5], ['Jun 7', 61.4]];

const ASSESSMENTS: [string, number, number][] = [
  // [area, first score, latest score] on a 1–5 scale
  ['Flexibility', 2, 4],
  ['Mobility', 3, 4],
  ['Strength', 2, 3],
  ['Posture', 3, 4],
];

function WeightChart() {
  const w = 300, h = 86, pad = 10, padX = 20;
  const vals = WEIGHTS.map(([, v]) => v);
  const min = Math.min(...vals) - 0.6, max = Math.max(...vals) + 0.6;
  const pts = WEIGHTS.map(([, v], i) => [
    padX + (i * (w - padX * 2)) / (WEIGHTS.length - 1),
    pad + ((max - v) * (h - pad * 2)) / (max - min),
  ]);
  return (
    <svg viewBox={`0 0 ${w} ${h + 16}`} className="w-full h-auto" aria-label="Weight from 64.0 kg in March to 61.4 kg in June">
      <motion.polyline points={pts.map(p => p.join(',')).join(' ')} fill="none" stroke={S} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"
        initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.4, ease: EASE, delay: 0.3 }} />
      {pts.map(([x, y], i) => (
        <g key={WEIGHTS[i][0]}>
          <circle cx={x} cy={y} r="3.5" fill="white" stroke={S} strokeWidth="2" />
          <text x={x} y={y - 8} textAnchor="middle" fontSize="9" fill={INK} fontWeight="600">{WEIGHTS[i][1].toFixed(1)}</text>
          <text x={x} y={h + 12} textAnchor="middle" fontSize="8.5" fill="#9CA3AF">{WEIGHTS[i][0]}</text>
        </g>
      ))}
    </svg>
  );
}

function ProgressProfile() {
  return (
    <div className="rounded-2xl border border-black/[0.06] bg-white shadow-[0_30px_70px_-30px_rgba(31,36,33,0.35)] overflow-hidden">
      <div className="px-5 sm:px-6 pt-5 pb-4 flex items-center gap-3 border-b border-black/[0.06]">
        <span className="w-10 h-10 rounded-full flex items-center justify-center text-[12px] font-semibold text-white" style={{ background: S }}>AR</span>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold" style={{ color: INK }}>Ana Reyes</p>
          <p className="text-[11px] text-gray-500">18 classes since March</p>
        </div>
        <span className="text-[9.5px] font-semibold px-2 py-1 rounded-full whitespace-nowrap" style={{ background: '#F0EEE8', color: INK }}>Staff only</span>
      </div>

      <div className="px-5 sm:px-6 flex gap-5 text-[11.5px] border-b border-black/[0.06]">
        {['Profile', 'Progress', 'Notes'].map(t => (
          <span key={t} className="py-2.5 -mb-px border-b-2"
            style={t === 'Progress' ? { borderColor: INK, color: INK, fontWeight: 600 } : { borderColor: 'transparent', color: '#9CA3AF' }}>
            {t}
          </span>
        ))}
      </div>

      <div className="p-5 sm:p-6 grid sm:grid-cols-2 gap-6">
        <div>
          <div className="grid grid-cols-2 gap-2.5 mb-4">
            <div className="rounded-xl p-3" style={{ background: '#F7F5F0' }}>
              <p className="text-[10px] text-gray-500">Weight</p>
              <p className="text-[17px] font-semibold tabular-nums" style={{ color: INK }}>61.4 kg</p>
              <p className="text-[10px] font-medium" style={{ color: S }}>−2.6 since March</p>
            </div>
            <div className="rounded-xl p-3" style={{ background: '#F7F5F0' }}>
              <p className="text-[10px] text-gray-500">BMI</p>
              <p className="text-[17px] font-semibold tabular-nums" style={{ color: INK }}>22.6</p>
              <p className="text-[10px] font-medium" style={{ color: S }}>−1.0 since March</p>
            </div>
          </div>
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-gray-400 mb-1">Weight, kg</p>
          <WeightChart />
        </div>

        <div>
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-gray-400 mb-3">Assessment · Jun 7 vs Mar 8</p>
          <div className="space-y-3">
            {ASSESSMENTS.map(([area, first, latest], i) => (
              <div key={area}>
                <div className="flex justify-between text-[11.5px] mb-1">
                  <span style={{ color: INK }}>{area}</span>
                  <span className="tabular-nums text-gray-500">{first} → <b style={{ color: INK }}>{latest}</b> / 5</span>
                </div>
                <div className="relative h-1.5 rounded-full" style={{ background: '#EEECE6' }}>
                  <motion.div className="absolute inset-y-0 left-0 rounded-full" style={{ background: S }}
                    initial={{ width: `${first * 20}%` }} whileInView={{ width: `${latest * 20}%` }}
                    viewport={{ once: true }} transition={{ duration: 1, ease: EASE, delay: 0.4 + i * 0.12 }} />
                  <span className="absolute top-1/2 -translate-y-1/2 w-0.5 h-3 rounded-full" style={{ left: `${first * 20}%`, background: CLAY }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-xl border border-black/[0.06] p-3.5">
            <p className="text-[11.5px] leading-[1.6]" style={{ color: INK }}>
              Shoulders rounding less in plank. Ready for single-leg work on the reformer next block.
            </p>
            <p className="text-[10px] text-gray-400 mt-1.5">Mika, instructor · Jun 7</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- section

export default function AddOns() {
  return (
    <section className="max-w-6xl mx-auto px-6 sm:px-8 py-24">
      <motion.div {...rise}>
        <p className="text-[11px] font-bold tracking-[0.2em] uppercase mb-3" style={{ color: S }}>Added for AYA</p>
        <h2 className="text-[26px] sm:text-[32px] font-semibold tracking-[-0.01em] [text-wrap:balance] max-w-2xl">
          Mat selection and client progress, built into the same system.
        </h2>
        <p className="mt-4 text-[15px] leading-[1.75] text-gray-600 max-w-2xl">
          You asked about these two. Both are optional, priced in the list below, and built for AYA on top of the
          booking system. Sample data shown.
        </p>
      </motion.div>

      <div className="mt-14 grid lg:grid-cols-[300px_1fr] gap-14 lg:gap-16 items-start">
        <motion.div {...rise}>
          <MatPicker />
          <p className="mt-6 font-semibold text-[16px]">Mat selection</p>
          <p className="mt-1.5 text-[14px] leading-[1.7] text-gray-600 [text-wrap:pretty]">
            Members pick their spot when they book, and taken spots are greyed out. You set up each room's layout
            once, and the roster shows who is on which mat. Try tapping a spot.
          </p>
        </motion.div>
        <motion.div {...rise} transition={{ ...rise.transition, delay: 0.15 }}>
          <ProgressProfile />
          <p className="mt-6 font-semibold text-[16px]">Client profiles and progress tracking</p>
          <p className="mt-1.5 text-[14px] leading-[1.7] text-gray-600 [text-wrap:pretty]">
            Your team logs BMI, weight and assessments for flexibility, mobility, strength and posture. Every entry
            is dated, so you can see how each client changes, and instructors leave notes and recommendations. Only
            staff can see it, and clients agree to it at sign-up.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
