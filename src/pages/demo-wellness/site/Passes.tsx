// Pricing: intro offer, four in-studio passes, the online membership, how passes
// work, and a short FAQ.

import { ReactNode, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Product } from '../lib/types';
import { IMAGES, PRODUCT } from '../lib/data';
import { peso, usd } from '../lib/format';
import { to } from '../lib/demo';
import { Badge, ButtonLink, Icon, Panel, PageTitle, Photo, cx } from '../ui/kit';
import { Wrap } from '../ui/layouts';

const CARDS: { id: string; forWho: string }[] = [
  { id: 'dropin', forWho: 'For one class, any day.' },
  { id: 'pack5', forWho: 'For a few weeks of regular practice.' },
  { id: 'pack10', forWho: 'For a longer stay, or regulars.' },
  { id: 'monthly', forWho: 'For living here, or a month of daily practice.' },
];

const HOW = [
  { icon: 'ri-map-pin-2-line', title: 'Credits work at both studios',
    text: 'Book Seaside and Downtown from the same pass. One credit is one class at either studio.' },
  { icon: 'ri-group-line', title: 'Share a pass with a friend',
    text: 'Bring someone along and they use a credit from your pass. Add their name when you book.' },
  { icon: 'ri-pause-circle-line', title: 'Freeze monthly anytime',
    text: 'Away for a while? Pause your unlimited monthly from your account and the days wait for you.' },
];

const FAQS = [
  { q: 'When do passes expire?',
    a: 'Drop-ins last 30 days, the 5-class pass 60 days and the 10-class pass 90 days from purchase. You can see the date in your account, and we email you a week before. Need more time? Message us and we will extend once, free.' },
  { q: 'Can I get a refund?',
    a: 'Unused passes can be refunded in full within 14 days of purchase. After that, we can move the remaining credits to a friend instead. Monthly memberships can be cancelled anytime and stop at the end of the month.' },
  { q: 'How do I cancel a class?',
    a: 'Cancel from your account up to 12 hours before class and the credit goes straight back to your pass. Later than that, the credit is used, since someone on the waitlist could have had your spot.' },
  { q: 'Can I pay from abroad?',
    a: 'Yes. Cards are charged in US$ or pesos, your choice at checkout, and PayPal is accepted. Most guests book from overseas before they arrive.' },
];

function Check({ on, children }: { on: boolean; children: ReactNode }) {
  return (
    <li className={cx('flex items-start gap-2.5 text-[14px]', !on && 'text-[var(--ink-3)]')}>
      <Icon name={on ? 'ri-check-line' : 'ri-subtract-line'} className={cx('text-[16px] mt-[2px]', on ? 'text-[var(--teal)]' : 'text-[var(--ink-3)]')} />
      <span>{children}</span>
    </li>
  );
}

function PassCard({ p, forWho }: { p: Product; forWho: string }) {
  const perClass = p.kind === 'pack' && p.credits ? p.price / p.credits : null;
  return (
    <Panel className={cx('relative flex flex-col', p.popular && '!border-[var(--teal)] !border-[1.5px]')}>
      <div className="flex items-center justify-between gap-2 min-h-[24px]">
        <h2 className="text-[16px] font-semibold">{p.name}</h2>
        {p.popular && <Badge tone="teal" dot={false}>Most popular</Badge>}
      </div>
      <p className="text-[13.5px] text-[var(--ink-2)] mt-1">{forWho}</p>

      <div className="mt-5">
        <div className="flex items-baseline gap-1.5">
          <span className="num text-[32px] font-semibold tracking-tight leading-none">{peso(p.price)}</span>
          {p.kind === 'monthly' && <span className="text-[14px] text-[var(--ink-2)]">/ month</span>}
        </div>
        <div className="num text-[13px] text-[var(--ink-3)] mt-1.5">≈ {usd(p.price)}</div>
      </div>

      <ul className="mt-5 space-y-2.5 flex-1">
        {perClass && <Check on><span className="num">{peso(perClass)}</span> a class</Check>}
        <Check on>{p.kind === 'monthly' ? 'Renews monthly, freeze anytime' : `Valid ${p.validityDays} days`}</Check>
        <Check on>Both studios</Check>
        <Check on={p.includesOnDemand}>{p.includesOnDemand ? 'Online library included' : 'Online library not included'}</Check>
      </ul>

      <ButtonLink to={to(`/checkout?product=${p.id}`)} variant={p.popular ? 'primary' : 'secondary'} size="lg" block className="mt-6">
        Buy
      </ButtonLink>
    </Panel>
  );
}

function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <Panel pad={false} className="divide-y divide-[var(--line)]">
      {FAQS.map((f, i) => {
        const isOpen = open === i;
        return (
          <div key={f.q}>
            <button type="button" onClick={() => setOpen(isOpen ? null : i)} aria-expanded={isOpen}
              className="w-full flex items-center justify-between gap-4 text-left px-5 md:px-6 min-h-[56px] py-3 text-[15px] font-medium">
              {f.q}
              <Icon name="ri-arrow-down-s-line" className={cx('text-[20px] text-[var(--ink-3)] transition-transform', isOpen && 'rotate-180')} />
            </button>
            {isOpen && <p className="px-5 md:px-6 pb-5 -mt-1 text-[14.5px] leading-relaxed text-[var(--ink-2)] max-w-[68ch]">{f.a}</p>}
          </div>
        );
      })}
    </Panel>
  );
}

export default function Passes() {
  const intro = PRODUCT.intro;
  const online = PRODUCT.online;
  return (
    <Wrap className="pt-10 md:pt-14 pb-6">
      <PageTitle title="Passes and memberships" subtitle="One pass for both studios. Prices in pesos; pay by card in US$ if you prefer." />

      <Link to={to(`/checkout?product=${intro.id}`)}
        className="group flex items-center gap-3 rounded-2xl px-4 md:px-5 min-h-[52px] py-3 mb-6 bg-white/70 border border-[rgba(7,80,86,0.18)] hover:border-[var(--teal)] transition-colors">
        <span className="w-2 h-2 rounded-full bg-[var(--orange)] flex-shrink-0" aria-hidden="true" />
        <span className="text-[14.5px] flex-1 min-w-0">
          <span className="font-medium">New here?</span> {intro.credits} classes in your first week for <span className="num font-medium">{peso(intro.price)}</span>
        </span>
        <span className="hidden sm:inline text-[14px] font-medium text-[var(--teal)]">Start intro week</span>
        <Icon name="ri-arrow-right-line" className="text-[var(--teal)] transition-transform group-hover:translate-x-0.5" />
      </Link>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CARDS.map((c) => <PassCard key={c.id} p={PRODUCT[c.id]} forWho={c.forWho} />)}
      </div>

      <Panel pad={false} className="mt-4 overflow-hidden flex flex-col md:flex-row">
        <div className="md:w-[280px] h-40 md:h-auto flex-shrink-0"><Photo src={IMAGES.yoga} /></div>
        <div className="flex-1 p-5 md:p-6 flex flex-col md:flex-row md:items-center gap-5 md:gap-8">
          <div className="flex-1 min-w-0">
            <h2 className="text-[16px] font-semibold">{online.name}</h2>
            <p className="text-[14px] text-[var(--ink-2)] mt-1 max-w-[52ch]">
              Every live online class, streamed from the studio, plus the full on-demand library. For the days you can't make it in.
            </p>
            <Link to={to('/online')} className="inline-flex items-center gap-1 mt-2 text-[14px] font-medium text-[var(--teal)] min-h-[44px] md:min-h-0">
              See what's online <Icon name="ri-arrow-right-s-line" />
            </Link>
          </div>
          <div className="flex items-center justify-between md:block md:text-right gap-4">
            <div>
              <div className="flex items-baseline gap-1.5 md:justify-end">
                <span className="num text-[26px] font-semibold tracking-tight leading-none">{peso(online.price)}</span>
                <span className="text-[14px] text-[var(--ink-2)]">/ month</span>
              </div>
              <div className="num text-[13px] text-[var(--ink-3)] mt-1">≈ {usd(online.price)} · cancel anytime</div>
            </div>
            <ButtonLink to={to(`/checkout?product=${online.id}`)} variant="secondary" className="md:mt-3">Join</ButtonLink>
          </div>
        </div>
      </Panel>

      <section className="mt-16">
        <h2 className="serif text-[26px] md:text-[30px] mb-5">How passes work</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {HOW.map((h) => (
            <div key={h.title} className="flex md:block gap-4">
              <div className="w-10 h-10 rounded-full bg-[var(--teal-soft)] text-[var(--teal)] flex items-center justify-center flex-shrink-0 md:mb-3">
                <Icon name={h.icon} className="text-[19px]" />
              </div>
              <div>
                <div className="font-medium text-[15px]">{h.title}</div>
                <p className="text-[14px] text-[var(--ink-2)] mt-1 leading-relaxed">{h.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-16 max-w-[820px]">
        <h2 className="serif text-[26px] md:text-[30px] mb-5">Questions</h2>
        <Faq />
      </section>
    </Wrap>
  );
}
