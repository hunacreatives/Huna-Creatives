// Booking sheet for one class on the guest Schedule (and deep links from Home).

import { ReactNode, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import type { Session } from '../lib/types';
import { CLASS, IMAGES, LOC, PRODUCT, TEACHER, wallets, waitlistCount } from '../lib/data';
import { addDays, dateLabel, dayLabel, peso, studioDateKey, studioTime, tzCity, usd, yourTime } from '../lib/format';
import { to, useDemo } from '../lib/demo';
import { Avatar, Button, Icon, OptionCard, Photo, Sheet, cx } from '../ui/kit';
import { spots, teacherName } from './ScheduleBits';

type Pay = 'pass' | 'dropin' | 'intro';

const PASS = wallets.find((w) => w.id === 'w1')!;

function longDay(key: string) {
  const today = studioDateKey();
  const prefix = key === today ? 'Today, ' : key === addDays(today, 1) ? 'Tomorrow, ' : '';
  return prefix + dayLabel(key, { weekday: 'long', month: 'long' });
}

function Block({ icon, children }: { icon: string; children: ReactNode }) {
  return (
    <div className="flex gap-3 py-4">
      <span className="w-9 h-9 rounded-full bg-[var(--teal-soft)] text-[var(--teal)] flex items-center justify-center flex-shrink-0">
        <Icon name={icon} className="text-[17px]" />
      </span>
      <div className="min-w-0 flex-1 text-[14px]">{children}</div>
    </div>
  );
}

export default function ScheduleBookingSheet({ session: s, onClose }: { session: Session | null; onClose: () => void }) {
  const { viewerTz, myBookings, book, cancelBooking, toast } = useDemo();
  const navigate = useNavigate();
  const [pay, setPay] = useState<Pay>('pass');

  if (!s) return null;

  const c = CLASS[s.classTypeId];
  const t = TEACHER[s.instructorId];
  const online = s.locationId === null;
  const loc = online ? null : LOC[s.locationId];
  const room = loc?.rooms.find((r) => r.id === s.roomId);
  const key = studioDateKey(s.start);
  const sp = spots(s);
  const mine = myBookings.find((b) => b.sessionId === s.id)?.status;
  const cancelled = s.status === 'cancelled';
  const past = new Date(s.start).getTime() < Date.now();
  const dropin = PRODUCT.dropin;
  const intro = PRODUCT.intro;
  const waitPos = waitlistCount(s) + 1;

  const studio = { label: 'Studio time', value: studioTime(s.start) };
  const viewer = { label: `Your time · ${tzCity(viewerTz)}`, value: yourTime(s.start, viewerTz) };
  const times = online ? [viewer, studio] : [studio, viewer];

  const bookWithPass = () => {
    book(s.id, 'booked');
    toast(`Booked · ${c.name}, ${studioTime(s.start)}`);
    navigate(to(`/confirmation?type=class&session=${s.id}`));
  };
  const joinWaitlist = () => {
    book(s.id, 'waitlist');
    toast(`You're #${waitPos} on the waitlist — not booked yet`, 'info');
    onClose();
  };

  let footer: ReactNode = null;
  if (cancelled || past) footer = null;
  else if (mine === 'booked') {
    footer = (
      <Button variant="danger" size="lg" block onClick={() => { cancelBooking(s.id); toast('Booking cancelled · 1 credit returned'); onClose(); }}>
        Cancel booking
      </Button>
    );
  } else if (mine === 'waitlist') {
    footer = (
      <Button variant="secondary" size="lg" block onClick={() => { cancelBooking(s.id); toast('Removed from the waitlist'); onClose(); }}>
        Leave waitlist
      </Button>
    );
  } else if (sp.full) {
    footer = <Button size="lg" block onClick={joinWaitlist}>Join waitlist</Button>;
  } else if (pay === 'pass') {
    footer = <Button size="lg" block onClick={bookWithPass}>Book with pass</Button>;
  } else if (pay === 'dropin') {
    footer = <Button size="lg" block onClick={() => navigate(to(`/checkout?session=${s.id}`))}>Continue to payment · {peso(dropin.price)}</Button>;
  } else {
    footer = <Button size="lg" block onClick={() => navigate(to('/checkout?product=intro'))}>Continue to payment · {peso(intro.price)}</Button>;
  }

  // Portal to the demo root: <main> is its own stacking context (z-10), so a sheet
  // rendered inside it would sit under the sticky site header.
  const root = document.querySelector('.ssw') ?? document.body;
  return createPortal((
    <Sheet open onClose={onClose} title={<span className={cx(cancelled && 'line-through text-[var(--ink-3)]')}>{c.name}</span>}
      subtitle={longDay(key)} footer={footer}>
      <div className="rounded-2xl overflow-hidden h-32 md:h-36 -mt-1">
        <Photo src={loc ? (loc.id === 'beach' && s.classTypeId === 'sunset' ? IMAGES.hero : loc.image) : IMAGES.yoga} />
      </div>

      {/* Times */}
      <div className="grid grid-cols-2 gap-2.5 mt-4">
        {times.map((x, i) => (
          <div key={x.label} className={cx('rounded-2xl px-4 py-3 border', i === 0 ? 'border-[var(--line-2)] bg-white' : 'border-[var(--line)] bg-[rgba(36,48,55,0.025)]')}>
            <div className={cx('num font-semibold', i === 0 ? 'text-[20px]' : 'text-[17px] text-[var(--ink-2)]', cancelled && 'line-through')}>{x.value}</div>
            <div className="text-[12.5px] text-[var(--ink-3)] mt-0.5 truncate">{x.label}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 text-[13.5px] text-[var(--ink-2)] num">
        {c.duration} min · {c.level}
        {!cancelled && <> · <span className={cx(sp.full ? 'text-[var(--ink)]' : sp.low && 'text-[var(--warn)] font-medium')}>{sp.text}</span></>}
      </div>

      {/* State banners */}
      {cancelled && (
        <div className="mt-4 rounded-2xl px-4 py-3 bg-[rgba(179,55,43,0.06)] text-[14px] text-[var(--bad)]">
          <div className="font-medium">This class is cancelled</div>
          <div className="mt-0.5">{s.cancelNote}</div>
        </div>
      )}
      {!cancelled && past && (
        <div className="mt-4 rounded-2xl px-4 py-3 bg-[rgba(36,48,55,0.05)] text-[14px] text-[var(--ink-2)]">This class has finished.</div>
      )}
      {!cancelled && !past && mine === 'booked' && (
        <div className="mt-4 rounded-2xl px-4 py-3 bg-[rgba(47,122,79,0.08)] flex items-start gap-2.5 text-[14px]">
          <Icon name="ri-checkbox-circle-fill" className="text-[18px] text-[var(--ok)] mt-0.5" />
          <div>
            <div className="font-medium text-[var(--ok)]">You're booked</div>
            <div className="text-[var(--ink-2)] mt-0.5">Paid with your {PRODUCT[PASS.productId].name.toLowerCase()}. Free cancellation until 12 hours before.</div>
          </div>
        </div>
      )}
      {!cancelled && !past && mine === 'waitlist' && (
        <div className="mt-4 rounded-2xl px-4 py-3 bg-[rgba(176,120,20,0.09)] flex items-start gap-2.5 text-[14px]">
          <Icon name="ri-time-line" className="text-[18px] text-[var(--warn)] mt-0.5" />
          <div>
            <div className="font-medium text-[var(--warn)]">You're on the waitlist — not booked yet</div>
            <div className="text-[var(--ink-2)] mt-0.5">If a spot opens we book you with your pass and email you.</div>
          </div>
        </div>
      )}

      {/* Teacher, place, description */}
      <div className="mt-2 divide-y divide-[var(--line)]">
        <div className="flex gap-3 py-4">
          <Avatar name={t.name} color={t.color} size={36} />
          <div className="min-w-0 text-[14px]">
            <div className="font-medium">{teacherName(s)}</div>
            <p className="text-[var(--ink-2)] mt-0.5 leading-relaxed">{t.bio}</p>
          </div>
        </div>
        {online ? (
          <Block icon="ri-vidicon-line">
            <div className="font-medium">Online · Zoom</div>
            <p className="text-[var(--ink-2)] mt-0.5">The Join button appears in your account 15 minutes before class.</p>
          </Block>
        ) : (
          <Block icon="ri-map-pin-line">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium">{loc.name}{room && ` · ${room.name}`}</div>
                <div className="text-[var(--ink-2)] mt-0.5">{loc.area}</div>
              </div>
              <a href={loc.mapUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 h-9 -mt-1.5 text-[var(--teal)] font-medium whitespace-nowrap">
                Directions<Icon name="ri-arrow-right-up-line" />
              </a>
            </div>
          </Block>
        )}
        <p className="py-4 text-[14.5px] text-[var(--ink-2)] leading-relaxed">{c.description}</p>
      </div>

      {/* Payment choice */}
      {!cancelled && !past && !mine && !sp.full && (
        <div className="mt-1">
          <h3 className="text-[15px] font-semibold mb-3">Pay with</h3>
          <div className="space-y-2.5">
            <OptionCard selected={pay === 'pass'} onSelect={() => setPay('pass')}
              title={`${PRODUCT[PASS.productId].name} · ${PASS.creditsLeft} left`} meta={`Expires ${dateLabel(PASS.expiresAt)}`} />
            <OptionCard selected={pay === 'dropin'} onSelect={() => setPay('dropin')}
              title="Drop-in" meta={`≈ ${usd(dropin.price)}`} right={peso(dropin.price)} />
            <OptionCard selected={pay === 'intro'} onSelect={() => setPay('intro')}
              title="Intro week" meta={`${intro.credits} classes in your first 7 days`} right={peso(intro.price)} />
          </div>
          <p className="mt-3 text-[13px] text-[var(--ink-3)] flex items-center gap-1.5">
            <Icon name="ri-information-line" />Free cancellation until 12 hours before.
          </p>
        </div>
      )}
      {!cancelled && !past && !mine && sp.full && (
        <p className="mt-1 text-[14px] text-[var(--ink-2)] leading-relaxed">
          This class is full. Join the waitlist and we'll book you with your pass if a spot opens — you'll get an email either way.
        </p>
      )}
    </Sheet>
  ), root);
}
