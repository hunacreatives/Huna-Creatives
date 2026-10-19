// Guest site: one retreat. Gallery, long-form details on the left, sticky
// glass booking card on the right (a bottom bar + sheet on mobile).

import { ReactNode, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { LOC, TEACHER, TODAY_KEY, retreats } from '../lib/data';
import { to, useDemo } from '../lib/demo';
import { addDays, dateLabel, peso, rangeLabel, usd } from '../lib/format';
import type { Retreat } from '../lib/types';
import { Avatar, Badge, Button, ButtonLink, Empty, Glass, Icon, OptionCard, Panel, Sheet, cx } from '../ui/kit';
import { Wrap } from '../ui/layouts';
import { PLACE, RETREAT_LEVEL, lengthLabel, placesLabel, placesLeft } from './RetreatsShared';

type Pay = 'full' | 'deposit';
const DEPOSIT = 0.3;
const BALANCE_DAYS = 45;

export default function RetreatDetail() {
  const { slug } = useParams();
  const retreat = retreats.find((r) => r.slug === slug && r.status === 'published');
  if (!retreat) return <NotFound />;
  return <RetreatView key={retreat.id} r={retreat} />;
}

function NotFound() {
  return (
    <Wrap className="pt-10 md:pt-16">
      <Panel className="max-w-[560px] mx-auto">
        <Empty icon="ri-compass-3-line" title="We couldn't find that retreat">
          It may have finished or moved to new dates.
          <div className="mt-5">
            <ButtonLink to={to('/retreats')} variant="secondary" icon="ri-arrow-left-line">See upcoming retreats</ButtonLink>
          </div>
        </Empty>
      </Panel>
    </Wrap>
  );
}

function RetreatView({ r }: { r: Retreat }) {
  const { toast } = useDemo();
  const left = placesLeft(r);
  const multi = r.kind === 'multi';
  const cheapestOpen = [...r.rooms].filter((x) => x.available > 0).sort((a, b) => a.pricePerPerson - b.pricePerPerson)[0];

  const [roomId, setRoomId] = useState<string | null>(cheapestOpen?.id ?? null);
  const [guests, setGuests] = useState(1);
  const [addOns, setAddOns] = useState<string[]>([]);
  const balanceDue = addDays(r.startDate, -BALANCE_DAYS);
  const depositOk = multi && balanceDue > addDays(TODAY_KEY, 7);
  const [pay, setPay] = useState<Pay>(depositOk ? 'deposit' : 'full');
  const [photos, setPhotos] = useState(false);
  const [mobileBook, setMobileBook] = useState(false);

  const room = r.rooms.find((x) => x.id === roomId) ?? null;
  const price = multi ? room?.pricePerPerson ?? 0 : r.ticketPrice ?? 0;
  const maxGuests = multi ? Math.max(1, Math.min(2, room?.sleeps ?? 2, left)) : Math.max(1, Math.min(4, left));
  const n = Math.min(guests, maxGuests);
  const chosen = r.addOns.filter((a) => addOns.includes(a.id));
  const total = price * n + chosen.reduce((s, a) => s + a.price * n, 0);
  const payMode: Pay = multi && depositOk ? pay : 'full';
  const deposit = Math.round(total * DEPOSIT);
  const soldOut = left <= 0 || (multi && !room);
  const href = to(`/checkout?retreat=${r.slug}&room=${room?.id ?? ''}&addons=${chosen.map((a) => a.id).join(',')}&guests=${n}&pay=${payMode}`);

  const toggleAddOn = (id: string) => setAddOns((xs) => (xs.includes(id) ? xs.filter((x) => x !== id) : [...xs, id]));
  const teachers = r.instructorIds.map((id) => TEACHER[id]).filter(Boolean);
  const facts = [rangeLabel(r.startDate, r.endDate), PLACE[r.locationId], lengthLabel(r), `Up to ${r.capacity} guests`, RETREAT_LEVEL[r.slug] ?? 'All levels'];

  /* ---------- booking card body (shared by the desktop card and the mobile sheet) ---------- */
  const bookingBody = (
    <div className="space-y-5">
      <div>
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="num text-[28px] font-semibold tracking-tight leading-none">{peso(price)}</span>
          <span className="text-[14.5px] text-[var(--ink-2)]">per person</span>
        </div>
        <div className="num text-[13px] text-[var(--ink-3)] mt-1.5">≈ {usd(price)} · {placesLabel(left)}</div>
      </div>

      {multi && (
        <label className="block">
          <span className="block text-[13px] font-medium text-[var(--ink-2)] mb-1.5">Room</span>
          <span className="relative block">
            <select className="input appearance-none pr-10 cursor-pointer" value={roomId ?? ''} onChange={(e) => setRoomId(e.target.value)}>
              {r.rooms.map((x) => (
                <option key={x.id} value={x.id} disabled={x.available <= 0}>{x.name}{x.available <= 0 ? ' (sold out)' : ''}</option>
              ))}
            </select>
            <Icon name="ri-arrow-down-s-line" className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[18px] text-[var(--ink-3)]" />
          </span>
        </label>
      )}

      <Stepper label={multi ? 'Guests' : 'Tickets'} value={n} min={1} max={maxGuests} onChange={setGuests}
        hint={multi && room && room.sleeps === 1 ? 'This room sleeps one' : undefined} />

      {(chosen.length > 0 || n > 1) && (
        <dl className="text-[14px] space-y-2">
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--ink-2)] min-w-0">{multi ? room?.name : 'Ticket'} × {n}</dt>
            <dd className="num">{peso(price * n)}</dd>
          </div>
          {chosen.map((a) => (
            <div key={a.id} className="flex justify-between gap-4">
              <dt className="text-[var(--ink-2)] min-w-0">{a.name}{n > 1 ? ` × ${n}` : ''}</dt>
              <dd className="num">{peso(a.price * n)}</dd>
            </div>
          ))}
        </dl>
      )}
      <div className="flex items-baseline justify-between gap-4 pt-4 border-t border-[var(--line)]">
        <span className="font-semibold">Total</span>
        <span className="num text-[18px] font-semibold">{peso(total)}</span>
      </div>

      {multi && (
        <div className="space-y-2.5">
          <OptionCard selected={payMode === 'full'} onSelect={() => setPay('full')} title="Pay in full" meta="One payment, nothing left to pay" />
          <OptionCard selected={payMode === 'deposit'} onSelect={() => setPay('deposit')} disabled={!depositOk}
            title="Pay 30% deposit"
            meta={depositOk
              ? <span className="num">{peso(deposit)} today, {peso(total - deposit)} due {dateLabel(balanceDue)}</span>
              : `Not available within ${BALANCE_DAYS} days of arrival`} />
        </div>
      )}
    </div>
  );

  const reserveAction = (
    <div>
      {soldOut
        ? <Button size="lg" block variant="secondary" onClick={() => toast('You are on the waitlist. We will email you if a place opens.')}>Join the waitlist</Button>
        : <ButtonLink to={href} size="lg" block>Reserve</ButtonLink>}
      <p className="text-center text-[13px] text-[var(--ink-3)] mt-2.5">You won't be charged until the next step</p>
    </div>
  );

  return (
    <Wrap className="pt-5 md:pt-10">
      <Link to={to('/retreats')} className="inline-flex items-center gap-1.5 h-10 text-[14px] text-[var(--ink-2)] hover:text-[var(--ink)]">
        <Icon name="ri-arrow-left-line" />All retreats
      </Link>

      <h1 className="serif text-[32px] md:text-[46px] leading-[1.08] mt-2">{r.title}</h1>
      <p className="mt-3 text-[14.5px] text-[var(--ink-2)] flex flex-wrap gap-x-2 gap-y-1">
        {facts.map((f, i) => (
          <span key={i} className="inline-flex items-center gap-2 num">{i > 0 && <span aria-hidden="true" className="text-[var(--ink-3)]">·</span>}{f}</span>
        ))}
      </p>

      <Gallery images={r.images} title={r.title} onShowAll={() => setPhotos(true)} />

      <div className="mt-8 md:mt-10 lg:grid lg:grid-cols-12 lg:gap-10 items-start">
        {/* ---------- Left: details ---------- */}
        <div className="lg:col-span-7">
          <Panel className="md:!p-8">
            <Section title="Overview" first>
              <p className="text-[15.5px] leading-[1.65] text-[var(--ink-2)]">{r.description}</p>
            </Section>

            <Section title={r.itinerary.length > 1 ? 'Day by day' : 'The day'}>
              {r.itinerary.length > 1 ? <Itinerary days={r.itinerary} /> : <Timeline items={r.itinerary[0]?.items ?? []} />}
            </Section>

            <Section title="What's included">
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <h3 className="text-[14.5px] font-semibold mb-3">Included</h3>
                  <ListBlock items={r.included} icon="ri-check-line" iconClass="text-[var(--teal)]" />
                </div>
                <div>
                  <h3 className="text-[14.5px] font-semibold mb-3">Not included</h3>
                  <ListBlock items={r.notIncluded} icon="ri-subtract-line" iconClass="text-[var(--ink-3)]" />
                </div>
              </div>
            </Section>

            {multi && (
              <Section title="Rooms">
                <div className="space-y-3">
                  {r.rooms.map((x) => {
                    const sold = x.available <= 0;
                    const selected = x.id === roomId;
                    return (
                      <button key={x.id} type="button" disabled={sold} aria-pressed={selected} onClick={() => setRoomId(x.id)}
                        className={cx('w-full text-left flex gap-3.5 p-4 rounded-2xl border bg-white transition-all',
                          selected ? 'border-[var(--teal)] shadow-[0_0_0_3px_rgba(7,80,86,0.10)]' : 'border-[var(--line-2)] hover:border-[var(--ink-3)]',
                          sold && 'opacity-55 cursor-not-allowed hover:border-[var(--line-2)]')}>
                        <span className={cx('mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0', selected ? 'border-[var(--teal)]' : 'border-[var(--line-2)]')}>
                          {selected && <span className="w-2.5 h-2.5 rounded-full bg-[var(--teal)]" />}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-[15px]">{x.name}</span>
                            {sold ? <Badge tone="gray">Sold out</Badge> : <Badge tone={x.available <= 2 ? 'amber' : 'gray'}><span className="num">{x.available} left</span></Badge>}
                          </span>
                          <span className="block text-[13px] text-[var(--ink-2)] mt-1">{x.type === 'private' ? 'Private' : 'Shared'} · sleeps {x.sleeps}</span>
                          <span className="block text-[13.5px] text-[var(--ink-2)] mt-1.5">{x.description}</span>
                        </span>
                        <span className="text-right flex-shrink-0">
                          <span className="block num font-semibold text-[15px]">{peso(x.pricePerPerson)}</span>
                          <span className="block text-[12px] text-[var(--ink-3)]">per person</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </Section>
            )}

            {r.addOns.length > 0 && (
              <Section title="Add-ons">
                <div className="rounded-2xl border border-[var(--line)] divide-y divide-[var(--line)] overflow-hidden bg-white">
                  {r.addOns.map((a) => {
                    const on = addOns.includes(a.id);
                    return (
                      <button key={a.id} type="button" role="checkbox" aria-checked={on} onClick={() => toggleAddOn(a.id)}
                        className="w-full flex items-center gap-3.5 px-4 min-h-[56px] py-3 text-left hover:bg-[rgba(7,80,86,0.03)] transition-colors">
                        <span className={cx('w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                          on ? 'bg-[var(--teal)] border-[var(--teal)] text-white' : 'border-[var(--line-2)] bg-white')}>
                          {on && <Icon name="ri-check-line" className="text-[14px]" />}
                        </span>
                        <span className="flex-1 min-w-0 text-[14.5px]">{a.name}</span>
                        <span className="text-right flex-shrink-0">
                          <span className="block num text-[14.5px] font-medium">{peso(a.price)}</span>
                          <span className="block text-[12px] text-[var(--ink-3)]">per person</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </Section>
            )}

            <Section title={teachers.length > 1 ? 'Your teachers' : 'Your teacher'}>
              <div className="space-y-5">
                {teachers.map((t) => (
                  <div key={t.id} className="flex gap-4">
                    <Avatar name={t.name} color={t.color} size={52} />
                    <div className="min-w-0">
                      <div className="font-medium">{t.name}</div>
                      <div className="text-[13px] text-[var(--ink-3)]">{t.styles.join(' · ')}</div>
                      <p className="text-[14.5px] text-[var(--ink-2)] mt-1.5 leading-relaxed">{t.bio}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Getting there">
              <div className="flex gap-3">
                <Icon name="ri-plane-line" className="text-[18px] text-[var(--ink-3)] mt-0.5" />
                <div className="text-[15px] text-[var(--ink-2)] leading-relaxed">
                  {r.gettingThere}
                  <a href={LOC[r.locationId].mapUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 mt-2 text-[var(--teal)] font-medium w-fit">
                    Open in Maps <Icon name="ri-arrow-right-up-line" />
                  </a>
                </div>
              </div>
            </Section>

            <Section title="Cancellation policy">
              <div className="flex gap-3">
                <Icon name="ri-shield-check-line" className="text-[18px] text-[var(--ink-3)] mt-0.5" />
                <p className="text-[15px] text-[var(--ink-2)] leading-relaxed">{r.cancellation}</p>
              </div>
            </Section>

            {r.faqs.length > 0 && (
              <Section title="Questions">
                <Faqs faqs={r.faqs} />
              </Section>
            )}
          </Panel>
        </div>

        {/* ---------- Right: sticky booking card (desktop) ---------- */}
        <aside className="hidden lg:block lg:col-span-5 self-stretch">
          <div className="sticky top-[92px]">
            <Glass strong className="p-6">
              {bookingBody}
              <div className="mt-5">{reserveAction}</div>
            </Glass>
          </div>
        </aside>
      </div>

      {/* ---------- Mobile: floating bar + sheet ---------- */}
      <div className="h-24 lg:hidden" aria-hidden="true" />
      <div className="lg:hidden fixed z-[55] left-3 right-3 bottom-[68px]">
        <div className="glass-strong rounded-2xl pl-4 pr-2 py-2 flex items-center gap-3 shadow-[var(--shadow-lg)]">
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-1.5">
              <span className="num text-[17px] font-semibold">{peso(price)}</span>
              <span className="text-[13px] text-[var(--ink-2)]">per person</span>
            </div>
            <div className="num text-[12.5px] text-[var(--ink-3)] truncate">{multi && room ? room.name : rangeLabel(r.startDate, r.endDate)}</div>
          </div>
          <Button size="md" onClick={() => setMobileBook(true)}>{soldOut ? 'Waitlist' : 'Reserve'}</Button>
        </div>
      </div>
      <Sheet open={mobileBook} onClose={() => setMobileBook(false)} title="Reserve your place"
        subtitle={<span className="num">{rangeLabel(r.startDate, r.endDate)} · {LOC[r.locationId].name}</span>} footer={reserveAction}>
        {bookingBody}
      </Sheet>

      <Sheet open={photos} onClose={() => setPhotos(false)} wide title="Photos" subtitle={r.title}>
        <div className="grid gap-2 sm:grid-cols-2">
          {r.images.map((src, i) => (
            <div key={i} className={cx('overflow-hidden rounded-2xl bg-[var(--sand-2)]', i % 3 === 0 ? 'sm:col-span-2 aspect-[16/10]' : 'aspect-[4/3]')}>
              <img src={src} alt={`${r.title}, photo ${i + 1}`} loading="lazy" className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      </Sheet>
    </Wrap>
  );
}

/* ---------- pieces ---------- */

function Gallery({ images, title, onShowAll }: { images: string[]; title: string; onShowAll: () => void }) {
  const five = Array.from({ length: 5 }, (_, i) => images[i % images.length]);
  const [idx, setIdx] = useState(0);
  const rail = useRef<HTMLDivElement>(null);
  const onScroll = () => {
    const el = rail.current;
    if (el) setIdx(Math.round(el.scrollLeft / el.clientWidth));
  };
  return (
    <>
      {/* Mobile: swipe */}
      <div className="md:hidden relative -mx-4 mt-5">
        <div ref={rail} onScroll={onScroll} className="flex overflow-x-auto snap-x snap-mandatory no-bar">
          {images.map((src, i) => (
            <button key={i} type="button" onClick={onShowAll} className="w-full flex-shrink-0 snap-center aspect-[4/3] bg-[var(--sand-2)]" aria-label={`Photo ${i + 1} of ${images.length}`}>
              <img src={src} alt={i === 0 ? title : ''} loading={i === 0 ? 'eager' : 'lazy'} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
        <button type="button" onClick={onShowAll}
          className="absolute right-3 bottom-3 h-7 px-2.5 rounded-full bg-black/55 text-white text-[12.5px] font-medium num backdrop-blur-sm">
          {Math.min(idx + 1, images.length)}/{images.length}
        </button>
      </div>

      {/* Desktop: 1 large + 4 small */}
      <div className="hidden md:grid grid-cols-4 grid-rows-2 gap-2 h-[420px] lg:h-[470px] mt-7 rounded-[24px] overflow-hidden relative">
        {five.map((src, i) => (
          <button key={i} type="button" onClick={onShowAll} className={cx('relative overflow-hidden group bg-[var(--sand-2)]', i === 0 && 'col-span-2 row-span-2')}
            aria-label={`Open photo ${i + 1}`}>
            <img src={src} alt={i === 0 ? title : ''} loading={i === 0 ? 'eager' : 'lazy'}
              className="absolute inset-0 w-full h-full object-cover transition-all duration-500 group-hover:scale-[1.03] group-hover:brightness-95" />
          </button>
        ))}
        <button type="button" onClick={onShowAll}
          className="absolute right-4 bottom-4 glass-strong rounded-full h-10 px-4 inline-flex items-center gap-2 text-[14px] font-medium hover:bg-white/90 transition-colors">
          <Icon name="ri-grid-line" />Show all photos
        </button>
      </div>
    </>
  );
}

function Section({ title, children, first }: { title: string; children: ReactNode; first?: boolean }) {
  return (
    <section className={cx(first ? '' : 'mt-8 pt-8 border-t border-[var(--line)]')}>
      <h2 className="serif text-[22px] md:text-[24px] leading-tight mb-4">{title}</h2>
      {children}
    </section>
  );
}

function ListBlock({ items, icon, iconClass }: { items: string[]; icon: string; iconClass: string }) {
  return (
    <ul className="space-y-2.5">
      {items.map((x) => (
        <li key={x} className="flex gap-2.5 text-[14.5px]">
          <Icon name={icon} className={cx('text-[17px] mt-[2px]', iconClass)} />{x}
        </li>
      ))}
    </ul>
  );
}

function Timeline({ items }: { items: { time: string; label: string }[] }) {
  return (
    <ol className="space-y-2.5">
      {items.map((it, i) => (
        <li key={i} className="grid grid-cols-[76px_1fr] gap-3 text-[14.5px]">
          <span className="num text-[var(--ink-3)]">{it.time}</span><span>{it.label}</span>
        </li>
      ))}
    </ol>
  );
}

function Itinerary({ days }: { days: Retreat['itinerary'] }) {
  const [open, setOpen] = useState<number[]>([days[0]?.day]);
  const toggle = (d: number) => setOpen((xs) => (xs.includes(d) ? xs.filter((x) => x !== d) : [...xs, d]));
  return (
    <div className="rounded-2xl border border-[var(--line)] divide-y divide-[var(--line)] overflow-hidden bg-white">
      {days.map((d) => {
        const isOpen = open.includes(d.day);
        return (
          <div key={d.day}>
            <button type="button" aria-expanded={isOpen} onClick={() => toggle(d.day)}
              className="w-full flex items-center gap-3 px-4 min-h-[56px] text-left hover:bg-[rgba(7,80,86,0.03)] transition-colors">
              <span className="num text-[13px] text-[var(--ink-3)] w-12 flex-shrink-0">Day {d.day}</span>
              <span className="flex-1 font-medium text-[15px]">{d.title}</span>
              <Icon name="ri-arrow-down-s-line" className={cx('text-[20px] text-[var(--ink-3)] transition-transform', isOpen && 'rotate-180')} />
            </button>
            {isOpen && <div className="px-4 pb-4 sm:pl-[76px] rise"><Timeline items={d.items} /></div>}
          </div>
        );
      })}
    </div>
  );
}

function Faqs({ faqs }: { faqs: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
      {faqs.map((f, i) => (
        <div key={i}>
          <button type="button" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)}
            className="w-full flex items-center gap-3 min-h-[56px] py-3 text-left">
            <span className="flex-1 font-medium text-[15px]">{f.q}</span>
            <Icon name={open === i ? 'ri-subtract-line' : 'ri-add-line'} className="text-[19px] text-[var(--ink-3)]" />
          </button>
          {open === i && <p className="pb-4 -mt-1 text-[14.5px] text-[var(--ink-2)] leading-relaxed rise">{f.a}</p>}
        </div>
      ))}
    </div>
  );
}

function Stepper({ label, hint, value, min, max, onChange }: { label: string; hint?: string; value: number; min: number; max: number; onChange: (n: number) => void }) {
  const btn = 'w-11 h-11 rounded-full border border-[var(--line-2)] bg-white inline-flex items-center justify-center transition-colors hover:border-[var(--ink-3)] disabled:opacity-35 disabled:pointer-events-none';
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <div className="text-[14.5px] font-medium">{label}</div>
        {hint && <div className="text-[12.5px] text-[var(--ink-3)]">{hint}</div>}
      </div>
      <div className="flex items-center gap-3">
        <button type="button" className={btn} onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label={`Fewer ${label.toLowerCase()}`}>
          <Icon name="ri-subtract-line" className="text-[18px]" />
        </button>
        <span className="num w-5 text-center text-[16px] font-medium" aria-live="polite">{value}</span>
        <button type="button" className={btn} onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label={`More ${label.toLowerCase()}`}>
          <Icon name="ri-add-line" className="text-[18px]" />
        </button>
      </div>
    </div>
  );
}
