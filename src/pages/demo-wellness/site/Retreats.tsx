// Guest site: list of published retreats with type/location filters and a
// private-group enquiry form.

import { FormEvent, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BRAND, locations, retreats } from '../lib/data';
import { to, useDemo } from '../lib/demo';
import { peso, rangeLabel, usd } from '../lib/format';
import type { LocationId, Retreat } from '../lib/types';
import { Button, Chip, Empty, Field, Icon, PageTitle, Panel } from '../ui/kit';
import { Wrap } from '../ui/layouts';
import { PLACE, fromPrice, lengthLabel, placesLabel, placesLeft } from './RetreatsShared';

type Kind = 'all' | 'day' | 'multi';

const KINDS: { v: Kind; l: string }[] = [
  { v: 'all', l: 'All' },
  { v: 'day', l: 'Day retreats' },
  { v: 'multi', l: 'Multi-day' },
];

export default function Retreats() {
  const [kind, setKind] = useState<Kind>('all');
  const [loc, setLoc] = useState<'all' | LocationId>('all');

  const published = useMemo(() => retreats.filter((r) => r.status === 'published')
    .sort((a, b) => a.startDate.localeCompare(b.startDate)), []);
  const list = published.filter((r) => (kind === 'all' || r.kind === kind) && (loc === 'all' || r.locationId === loc));

  return (
    <Wrap className="pt-8 md:pt-14">
      <PageTitle title="Retreats"
        subtitle="A day, a weekend or a week away. Small groups, all levels, everything organised." />

      <div className="flex items-center gap-2 overflow-x-auto no-bar -mx-4 px-4 md:mx-0 md:px-0 pb-1 mb-6" role="group" aria-label="Filter retreats">
        {KINDS.map((k) => (
          <Chip key={k.v} active={kind === k.v} onClick={() => setKind(k.v)}>{k.l}</Chip>
        ))}
        <span className="w-px h-6 bg-[var(--line-2)] mx-1.5 flex-shrink-0" aria-hidden="true" />
        <Chip active={loc === 'all'} onClick={() => setLoc('all')}>Any location</Chip>
        {locations.map((l) => (
          <Chip key={l.id} active={loc === l.id} onClick={() => setLoc(l.id)} icon="ri-map-pin-line">{l.name}</Chip>
        ))}
      </div>

      {list.length === 0 ? (
        <Panel>
          <Empty icon="ri-sun-line" title="No retreats match those filters">
            <button type="button" className="text-[var(--teal)] font-medium mt-1" onClick={() => { setKind('all'); setLoc('all'); }}>
              Show all retreats
            </button>
          </Empty>
        </Panel>
      ) : (
        <div className="space-y-6 md:space-y-8">
          {list.map((r, i) => <RetreatCard key={r.id} r={r} eager={i === 0} />)}
        </div>
      )}

      <Enquiry />
    </Wrap>
  );
}

function RetreatCard({ r, eager }: { r: Retreat; eager?: boolean }) {
  const left = placesLeft(r);
  const price = fromPrice(r);
  return (
    <Link to={to(`/retreats/${r.slug}`)} className="group block rise" aria-label={r.title}>
      <Panel pad={false} className="overflow-hidden grid md:grid-cols-[1.2fr_1fr] transition-shadow duration-300 group-hover:shadow-[var(--shadow-lg)]">
        <div className="relative aspect-[4/3] md:aspect-auto md:min-h-[380px] overflow-hidden bg-[var(--sand-2)]">
          <img src={r.images[0]} alt="" loading={eager ? 'eager' : 'lazy'}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
          <span className="absolute top-3 left-3 glass-strong rounded-full h-8 px-3 inline-flex items-center gap-1.5 text-[13px] font-medium">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: left <= 4 ? '#c48a1c' : 'var(--ok)' }} />
            <span className="num">{placesLabel(left)}</span>
          </span>
        </div>

        <div className="p-5 md:p-8 flex flex-col">
          <div className="flex items-center gap-1.5 text-[13.5px] text-[var(--ink-2)]">
            <Icon name="ri-map-pin-line" />{PLACE[r.locationId]}
          </div>
          <h2 className="serif text-[26px] md:text-[32px] leading-[1.12] mt-2">{r.title}</h2>
          <p className="text-[15px] text-[var(--ink-2)] mt-2.5 max-w-[46ch]">{r.summary}</p>

          <div className="flex flex-wrap gap-x-5 gap-y-2 mt-5 text-[14px]">
            <span className="inline-flex items-center gap-2 num"><Icon name="ri-calendar-line" className="text-[var(--ink-3)]" />{rangeLabel(r.startDate, r.endDate)}</span>
            <span className="inline-flex items-center gap-2"><Icon name="ri-moon-line" className="text-[var(--ink-3)]" />{lengthLabel(r)}</span>
          </div>

          <div className="mt-auto pt-6">
            <div className="flex items-end justify-between gap-4 pt-5 border-t border-[var(--line)]">
              <div>
                <div className="text-[13px] text-[var(--ink-3)]">From</div>
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  <span className="num text-[22px] font-semibold tracking-tight">{peso(price)}</span>
                  <span className="text-[13.5px] text-[var(--ink-2)]">per person</span>
                </div>
                <div className="num text-[12.5px] text-[var(--ink-3)]">≈ {usd(price)}</div>
              </div>
              <span className="w-11 h-11 rounded-full bg-[var(--teal-soft)] text-[var(--teal)] inline-flex items-center justify-center flex-shrink-0 transition-transform group-hover:translate-x-0.5">
                <Icon name="ri-arrow-right-line" className="text-[19px]" />
              </span>
            </div>
          </div>
        </div>
      </Panel>
    </Link>
  );
}

function Enquiry() {
  const { toast } = useDemo();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const send = (e: FormEvent) => {
    e.preventDefault();
    const first = name.trim().split(/\s+/)[0];
    toast(`Thanks${first ? ', ' + first : ''}. ${BRAND.owner} will reply within a day.`);
    setName(''); setEmail(''); setMessage('');
  };

  return (
    <Panel className="mt-12 md:mt-16 md:!p-10">
      <div className="grid gap-8 md:grid-cols-[1fr_1.25fr] md:gap-12">
        <div>
          <h2 className="serif text-[26px] md:text-[30px] leading-[1.15]">Private and group retreats</h2>
          <p className="text-[15px] text-[var(--ink-2)] mt-3 max-w-[40ch]">
            Bringing six or more people, or planning a week for your team or wedding party? We plan custom retreats at either studio, on your dates.
          </p>
          <div className="mt-5 space-y-2 text-[14px] text-[var(--ink-2)]">
            <div className="flex items-center gap-2"><Icon name="ri-whatsapp-line" className="text-[var(--ink-3)]" />{BRAND.whatsapp}</div>
            <div className="flex items-center gap-2"><Icon name="ri-mail-line" className="text-[var(--ink-3)]" />{BRAND.email}</div>
          </div>
        </div>
        <form onSubmit={send} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name"><input className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></Field>
            <Field label="Email"><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></Field>
          </div>
          <Field label="Message">
            <textarea className="input" rows={4} value={message} onChange={(e) => setMessage(e.target.value)}
              placeholder="Group size, rough dates, and anything you have in mind" />
          </Field>
          <Button type="submit" size="lg" className="w-full sm:w-auto">Send enquiry</Button>
        </form>
      </div>
    </Panel>
  );
}
