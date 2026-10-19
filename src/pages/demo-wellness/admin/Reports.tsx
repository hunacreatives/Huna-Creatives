// Studio admin — Reports. Location comparison, fill-rate heatmap, revenue by
// product and instructor fill. Class counts and fill rates come from the
// sample schedule (last 7 days, scaled to the range); money from revenueByMonth.

import { useMemo, useState } from 'react';
import { TEACHER, bookedCount, revenueByMonth, sessions } from '../lib/data';
import { peso, studioDateKey } from '../lib/format';
import { useDemo } from '../lib/demo';
import type { Session } from '../lib/types';
import { Button, Chip, PageTitle, Panel, SectionTitle, cx } from '../ui/kit';
import { LocationSwitch } from '../ui/layouts';

type Range = '30d' | 'quarter' | 'year';
type Group = 'beach' | 'town' | 'online';
const RANGES: { v: Range; l: string; file: string }[] = [
  { v: '30d', l: 'Last 30 days', file: 'last-30-days' },
  { v: 'quarter', l: 'This quarter', file: 'this-quarter' },
  { v: 'year', l: 'Year', file: 'year' },
];
const WEEKS: Record<Range, number> = { '30d': 30 / 7, quarter: 13, year: 52 };
const FILL_ADJ: Record<Range, number> = { '30d': 0, quarter: -0.02, year: -0.04 };
const NEW_PER_MONTH: Record<Group, number> = { beach: 48, town: 27, online: 14 };
const MONTHS: Record<Range, number> = { '30d': 1, quarter: 3, year: 11 };
const RETENTION: Record<Group, number> = { beach: 0.64, town: 0.57, online: 0.71 };
const RET_ADJ: Record<Range, number> = { '30d': 0, quarter: -0.02, year: -0.05 };
const GROUP_LABEL: Record<Group, string> = { beach: 'Seaside', town: 'Downtown', online: 'Online' };

const PRODUCTS = ['Drop-in', 'Class passes', 'Monthly', 'Retreats', 'Online'] as const;
const SHARES: Record<Group, number[]> = {
  beach: [0.15, 0.33, 0.22, 0.30, 0],
  town: [0.20, 0.34, 0.28, 0.18, 0],
  online: [0, 0, 0, 0, 1],
};

const SLOTS = ['06:30', '07:00', '09:30', '10:00', '17:00', '17:30', '19:00'];
const DAYS = [{ d: 1, l: 'Mon' }, { d: 2, l: 'Tue' }, { d: 3, l: 'Wed' }, { d: 4, l: 'Thu' }, { d: 5, l: 'Fri' }, { d: 6, l: 'Sat' }, { d: 0, l: 'Sun' }];

const groupOf = (s: Session): Group => s.locationId ?? 'online';
const hhmm = (iso: string) => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso));
const dow = (iso: string) => { const [y, m, d] = studioDateKey(iso).split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); };
const fill = (s: Session) => bookedCount(s) / s.capacity;
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const pctLabel = (n: number) => `${Math.round(n * 100)}%`;
const slotLabel = (t: string) => { const [h, m] = t.split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2, '0')}${h < 12 ? 'a' : 'p'}`; };
/** Small stable wobble so ranges don't look copy-pasted. */
const wobble = (key: string) => (([...key].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7) % 7) - 3) / 100;

export default function AdminReports() {
  const { adminLoc, toast } = useDemo();
  const [range, setRange] = useState<Range>('30d');
  const groups: Group[] = adminLoc === 'all' ? ['beach', 'town', 'online'] : [adminLoc];

  // Sample: last 7 days of classes that ran.
  const sample = useMemo(() => {
    const now = Date.now();
    return sessions.filter((s) => s.status === 'scheduled' && new Date(s.start).getTime() < now && new Date(s.start).getTime() >= now - 7 * 86400000);
  }, []);

  const revenueFor = (g: Group) => {
    const rows = range === '30d' ? revenueByMonth.slice(-1) : range === 'quarter' ? revenueByMonth.slice(-3) : revenueByMonth;
    const sum = rows.reduce((n, r) => n + r[g], 0);
    return range === 'year' ? Math.round((sum * 1.85) / 1000) * 1000 : sum;
  };

  // Instructor × group counts, so location totals equal the sum of instructor rows.
  const instructorRows = useMemo(() => {
    const map = new Map<string, Session[]>();
    sample.filter((s) => groups.includes(groupOf(s))).forEach((s) => map.set(s.instructorId, [...(map.get(s.instructorId) ?? []), s]));
    return [...map.entries()].map(([id, list]) => {
      const f = clamp(mean(list.map(fill)) + FILL_ADJ[range] + wobble(id + range));
      const where = [...new Set(list.map(groupOf))].map((g) => GROUP_LABEL[g]).join(', ');
      const classes = Math.round(list.length * WEEKS[range]);
      const size = mean(list.map(bookedCount)) * (1 + FILL_ADJ[range]);
      return { id, where, classes, fill: f, size };
    }).sort((a, b) => b.fill - a.fill);
  }, [sample, range, adminLoc]); // eslint-disable-line react-hooks/exhaustive-deps

  const locRows = groups.map((g) => {
    const list = sample.filter((s) => groupOf(s) === g);
    return {
      g,
      classes: Math.round(list.length * WEEKS[range]),
      fill: clamp(mean(list.map(fill)) + FILL_ADJ[range]),
      revenue: revenueFor(g),
      newClients: Math.round(NEW_PER_MONTH[g] * MONTHS[range] * (1 + wobble(g + range))),
      retention: RETENTION[g] + RET_ADJ[range],
    };
  });

  const productRev = PRODUCTS.map((label, i) => ({ label, value: locRows.reduce((n, r) => n + r.revenue * SHARES[r.g][i], 0) }))
    .filter((p) => p.value > 0);
  const productMax = Math.max(...productRev.map((p) => p.value));
  const productTotal = productRev.reduce((n, p) => n + p.value, 0);

  // Heatmap cells (studio classes only).
  const heat = SLOTS.map((slot) => DAYS.map(({ d }) => {
    const list = sample.filter((s) => s.locationId && groups.includes(s.locationId) && hhmm(s.start) === slot && dow(s.start) === d);
    if (!list.length) return null;
    return clamp(mean(list.map(fill)) + FILL_ADJ[range] + wobble(slot + d + range));
  }));
  const rangeLabel = RANGES.find((r) => r.v === range)!;

  return (
    <div className="text-[14px]">
      <PageTitle admin title="Reports"
        actions={<>
          <LocationSwitch />
          <Button size="sm" variant="secondary" icon="ri-download-2-line"
            onClick={() => toast(`Exported salt-and-stillness-${rangeLabel.file}.csv`)}>Export CSV</Button>
        </>} />

      <div className="flex gap-2 overflow-x-auto no-bar -mx-3 px-3 mb-5">
        {RANGES.map((r) => <Chip key={r.v} active={range === r.v} onClick={() => setRange(r.v)}>{r.l}</Chip>)}
      </div>

      <SectionTitle>Location comparison</SectionTitle>
      <Panel pad={false} className="mb-6">
        <div className="overflow-x-auto">
          <table className="tbl min-w-[620px]">
            <thead><tr><th>Location</th><th className="r">Classes run</th><th className="r">Avg fill</th><th className="r">Revenue</th><th className="r">New clients</th><th className="r">Retention</th></tr></thead>
            <tbody>
              {locRows.map((r) => (
                <tr key={r.g}>
                  <td className="font-medium">{GROUP_LABEL[r.g]}</td>
                  <td className="r num">{r.classes.toLocaleString()}</td>
                  <td className="r num">{pctLabel(r.fill)}</td>
                  <td className="r num">{peso(r.revenue)}</td>
                  <td className="r num">{r.newClients}</td>
                  <td className="r num">{pctLabel(r.retention)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr] mb-6">
        <Panel>
          <SectionTitle action={<HeatLegend />}>Fill rate by time slot</SectionTitle>
          {heat.every((row) => row.every((c) => c === null))
            ? <div className="text-[var(--ink-2)] py-6">No studio classes for this location.</div>
            : (
              <div className="overflow-x-auto -mx-1 px-1">
                <div className="grid gap-[2px] min-w-[380px]" style={{ gridTemplateColumns: '52px repeat(7, minmax(0, 1fr))' }}>
                  <div />
                  {DAYS.map((d) => <div key={d.l} className="text-center text-[12px] text-[var(--ink-3)] pb-1">{d.l}</div>)}
                  {SLOTS.map((slot, ri) => (
                    <HeatRow key={slot} slot={slot} cells={heat[ri]} />
                  ))}
                </div>
              </div>
            )}
        </Panel>

        <Panel>
          <SectionTitle>Revenue by product</SectionTitle>
          <ul className="space-y-3.5">
            {productRev.map((p) => (
              <li key={p.label} title={`${p.label}: ${peso(p.value)} (${pctLabel(p.value / productTotal)} of revenue)`}>
                <div className="flex items-baseline justify-between gap-3 mb-1.5">
                  <span>{p.label}</span>
                  <span className="num text-[13px]"><span className="font-medium">{peso(p.value)}</span> <span className="text-[var(--ink-3)]">{pctLabel(p.value / productTotal)}</span></span>
                </div>
                <div className="h-2.5 rounded-r-[4px] bg-transparent">
                  <div className="h-full rounded-r-[4px] bg-[var(--teal)]" style={{ width: `${(p.value / productMax) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <SectionTitle>Instructor fill rate</SectionTitle>
      <Panel pad={false}>
        <div className="overflow-x-auto">
          <table className="tbl min-w-[600px]">
            <thead><tr><th>Instructor</th><th>Teaches at</th><th className="r">Classes</th><th className="r">Avg class size</th><th>Fill rate</th></tr></thead>
            <tbody>
              {instructorRows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <span className="inline-flex items-center gap-2 font-medium whitespace-nowrap">
                      <span className="w-2 h-2 rounded-full" style={{ background: TEACHER[r.id].color }} />{TEACHER[r.id].name}
                    </span>
                  </td>
                  <td className="text-[var(--ink-2)] whitespace-nowrap">{r.where}</td>
                  <td className="r num">{r.classes}</td>
                  <td className="r num">{r.size.toFixed(1)}</td>
                  <td className="w-[220px]">
                    <div className="flex items-center gap-2.5">
                      <div className="h-1.5 flex-1 rounded-full bg-[rgba(36,48,55,0.08)] overflow-hidden">
                        <div className="h-full rounded-full bg-[var(--teal)]" style={{ width: `${r.fill * 100}%` }} />
                      </div>
                      <span className="num text-[13px] w-10 text-right">{pctLabel(r.fill)}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

/** Single-hue teal ramp: light at low fill, dark at full. */
const heatColor = (p: number) => `color-mix(in oklab, #075056 ${Math.round(12 + clamp((p - 0.3) / 0.7) * 88)}%, #eef3f3)`;

function HeatRow({ slot, cells }: { slot: string; cells: (number | null)[] }) {
  if (cells.every((c) => c === null)) return null;
  return (
    <>
      <div className="num text-[12px] text-[var(--ink-3)] flex items-center">{slotLabel(slot)}</div>
      {cells.map((p, i) => p === null
        ? <div key={i} className="h-10 rounded-[6px] bg-[rgba(36,48,55,0.035)]" title={`${DAYS[i].l} ${slotLabel(slot)}: no class`} />
        : (
          <div key={i} title={`${DAYS[i].l} ${slotLabel(slot)}: ${pctLabel(p)} full`}
            className={cx('h-10 rounded-[6px] flex items-center justify-center num text-[11.5px] font-medium cursor-default transition-transform hover:scale-[1.06]',
              p >= 0.62 ? 'text-white' : 'text-[var(--ink)]')}
            style={{ background: heatColor(p) }}>
            {pctLabel(p)}
          </div>
        ))}
    </>
  );
}

function HeatLegend() {
  return (
    <span className="hidden sm:inline-flex items-center gap-2 text-[12px] text-[var(--ink-3)]">
      30%
      <span className="w-20 h-2 rounded-full" style={{ background: `linear-gradient(90deg, ${heatColor(0.3)}, ${heatColor(0.65)}, ${heatColor(1)})` }} />
      100%
    </span>
  );
}
