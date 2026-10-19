// Admin · Retreats. All retreats incl. drafts; row opens the manifest.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LOC, TODAY_KEY, locations, retreats } from '../lib/data';
import { addDays, peso, rangeLabel } from '../lib/format';
import { to, useDemo } from '../lib/demo';
import type { LocationId } from '../lib/types';
import { Badge, Button, Empty, Field, FillBar, Icon, OptionCard, PageTitle, Panel, Sheet } from '../ui/kit';
import { LocationSwitch } from '../ui/layouts';
import { retreatStats } from './RetreatsData';

export default function AdminRetreats() {
  const { adminLoc, toast } = useDemo();
  const nav = useNavigate();
  const [creating, setCreating] = useState(false);
  const list = retreats
    .filter((r) => adminLoc === 'all' || r.locationId === adminLoc)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  return (
    <div className="text-[14px]">
      <PageTitle admin title="Retreats" subtitle="Day and multi-day retreats. Open one for the guest manifest."
        actions={<><LocationSwitch /><Button size="sm" icon="ri-add-line" onClick={() => setCreating(true)}>New retreat</Button></>} />

      <Panel pad={false} className="overflow-hidden">
        {list.length === 0 ? <Empty icon="ri-sun-line" title="No retreats at this studio yet" /> : (
          <div className="overflow-x-auto">
            <table className="tbl min-w-[920px]">
              <thead><tr><th>Retreat</th><th>Dates</th><th>Location</th><th>Status</th><th>Booked</th><th className="r">Collected</th><th className="r">Outstanding</th><th /></tr></thead>
              <tbody>
                {list.map((r) => {
                  const st = retreatStats(r);
                  return (
                    <tr key={r.id} className="clickable" onClick={() => nav(to(`/admin/retreats/${r.id}`))}>
                      <td style={{ height: 64 }}>
                        <div className="flex items-center gap-3">
                          <img src={r.images[0]} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                          <div className="min-w-0">
                            <div className="font-medium whitespace-nowrap">{r.title.replace(' (draft)', '')}</div>
                            <div className="text-[12.5px] text-[var(--ink-3)]">{r.kind === 'day' ? 'Day retreat' : `${dayCount(r.startDate, r.endDate)} days`}</div>
                          </div>
                        </div>
                      </td>
                      <td className="num whitespace-nowrap">{rangeLabel(r.startDate, r.endDate)}</td>
                      <td className="whitespace-nowrap">{LOC[r.locationId].name}</td>
                      <td>{r.status === 'published' ? <Badge tone="green">Published</Badge> : <Badge tone="gray">Draft</Badge>}</td>
                      <td className="min-w-[130px]"><FillBar booked={st.guests} capacity={r.capacity} /></td>
                      <td className="r num whitespace-nowrap">
                        {st.total ? <><span className="font-medium">{peso(st.collected)}</span><span className="text-[var(--ink-3)]"> of {peso(st.total)}</span></> : <span className="text-[var(--ink-3)]">—</span>}
                      </td>
                      <td className="r num whitespace-nowrap">{st.outstanding ? peso(st.outstanding) : <span className="text-[var(--ink-3)]">—</span>}</td>
                      <td className="r">
                        <button type="button" onClick={(e) => { e.stopPropagation(); toast(`Copied as "${r.title.replace(' (draft)', '')} (copy)" — saved as a draft`); }}
                          className="h-8 px-2.5 rounded-full text-[13px] text-[var(--ink-2)] hover:bg-[rgba(36,48,55,0.06)] inline-flex items-center gap-1.5 whitespace-nowrap">
                          <Icon name="ri-file-copy-line" />Duplicate
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <NewRetreat open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}

const dayCount = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000) + 1;

function NewRetreat({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast, adminLoc } = useDemo();
  const [kind, setKind] = useState<'day' | 'multi'>('multi');
  const [title, setTitle] = useState('');
  const [start, setStart] = useState(addDays(TODAY_KEY, 60));
  const [end, setEnd] = useState(addDays(TODAY_KEY, 64));
  const [loc, setLoc] = useState<LocationId>(adminLoc === 'all' ? 'beach' : adminLoc);
  const [cap, setCap] = useState(14);

  const create = () => {
    toast(`${title.trim() || 'Untitled retreat'} saved as a draft. Add rooms and itinerary next.`);
    onClose();
    setTitle('');
  };

  return (
    <Sheet open={open} onClose={onClose} title="New retreat" subtitle="Starts as a draft. Guests can't see it until you publish."
      footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={create}>Create draft</Button></div>}>
      <div className="space-y-4">
        <Field label="Title"><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Full Moon Weekend" /></Field>
        <div className="space-y-2">
          <span className="block text-[13px] font-medium text-[var(--ink-2)]">Type</span>
          <OptionCard selected={kind === 'day'} onSelect={() => setKind('day')} title="Day retreat" meta="One day, ticket price per person" />
          <OptionCard selected={kind === 'multi'} onSelect={() => setKind('multi')} title="Multi-day" meta="Rooms, deposits and a pre-arrival form" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={kind === 'day' ? 'Date' : 'Starts'}><input type="date" className="input" value={start} onChange={(e) => setStart(e.target.value)} /></Field>
          {kind === 'multi' && <Field label="Ends"><input type="date" className="input" value={end} min={start} onChange={(e) => setEnd(e.target.value)} /></Field>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Location">
            <select className="input" value={loc} onChange={(e) => setLoc(e.target.value as LocationId)}>
              {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </Field>
          <Field label="Capacity"><input type="number" min={1} className="input num" value={cap} onChange={(e) => setCap(Number(e.target.value))} /></Field>
        </div>
      </div>
    </Sheet>
  );
}
