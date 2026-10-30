import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import JourneyStory from './JourneyStory';

// Bespoke proposal for AYA Studio — a movement studio opening in Makati in
// March–April 2027. Brand Foundation is the core; website, booking (with
// Sentro), ads setup and the monthly retainer are optional, and the client
// can untick them to see their own total. Like /p/dobo, the page binds to the
// hub_proposals row whose `custom_path` matches this URL and records approval
// + views through the shared accept-quotation flow. The chosen items travel
// in the approval note, so the team sees exactly what was approved.
//
// /p/aya-studio is the real link; /p/aya-studio-preview binds to a test row.
const PATH = window.location.pathname.replace(/\/+$/, '') || '/p/aya-studio';
const IS_PREVIEW = PATH !== '/p/aya-studio';
const ASK_HREF = 'mailto:contact@hunacreatives.com?subject=' +
  encodeURIComponent('Questions about the AYA Studio proposal');
const IMG = '/proposals/aya-studio';

const S = '#5E7464';        // sage, carried over from the discovery recap
const INK = '#1F2421';
const PAPER = '#FAF8F4';

const peso = (n: number) => `₱${n.toLocaleString('en-PH')}`;

const HEARD: [string, string][] = [
  ['The studio', 'Yoga, Pilates, barre and sculpt in a new space in Makati. Your lead instructor is a master trainer who teaches instructors abroad, and the team has more than eight years of teaching behind it.'],
  ['The feeling', 'Premium but personal, with Filipino hospitality and kapwa at the centre.'],
  ['The people', 'Busy professionals first. Over time, a wider community that could include kids and seniors.'],
  ['Later on', 'Community classes, space rentals for gatherings, maybe a café, and use of the courtyard.'],
];

const STEPS: [string, string, string][] = [
  ['01', 'Discovery and strategy', 'We work out who AYA is for, what sets it apart, and how kapwa shows up in practice: how a first-timer is greeted, what the classes are called, how the studio sounds online.'],
  ['02', 'Visual identity', 'Logo, colours, type and graphics, made to work on a studio wall, an Instagram grid, a booking screen and a tote bag.'],
  ['03', 'Guidelines and launch kit', 'A guide your team can follow, plus templates and a ready Instagram profile, so AYA can start posting by late January and look the same every time.'],
  ['04', 'Website and booking', 'Optional. A website whose main job is getting people to book a class, with payments, packages and member accounts built in.'],
  ['05', 'Monthly support', 'Optional. From launch, we run social media and ads and look after the website on one monthly retainer.'],
];

const VALUE: [string, string][] = [
  ['Strategy as well as design.', 'Brand Foundation works out what AYA says and how it sounds, so a class name, a caption and an ad read like the same studio.'],
  ['Booking on your own site.', 'You pay once for the website and booking (₱95,000 together), and it runs on AYA\'s own site with no commission taken from each booking. For comparison, Mindbody\'s US pricing starts at US$79 a month per location, before payment fees.'],
  ['No lock-in.', 'Anything you leave out can be added later at the same price, and the retainer is month to month.'],
];

interface Item {
  key: string;
  title: string;
  price: number;
  summary: string;
  includes: string[];
  requires?: string;
}

const CORE_PARTS: [string, number, string][] = [
  ['Brand discovery and strategy', 15_000, 'Audience, positioning, brand promise, personality, key messages and tone of voice'],
  ['Visual identity', 25_000, 'Main logo and its variations, colour palette, typography and graphic elements'],
  ['Brand guidelines', 10_000, 'A plain guide to using the brand, so your team can apply it without us'],
  ['Launch kit', 10_000, 'Editable social templates, Instagram profile and highlight covers, class and membership cards'],
];
const CORE_TOTAL = CORE_PARTS.reduce((sum, [, p]) => sum + p, 0);

const OPTIONAL: Item[] = [
  {
    key: 'website',
    title: 'Custom website',
    price: 50_000,
    summary: 'Your own site, designed in the new brand. Full list below.',
    includes: [
      'Classes, schedule, pricing, instructors, about, community and rentals, location, FAQ and contact pages',
      'Designed for phones first',
      'You update classes, schedule, instructors and prices yourself',
      'Basic SEO and analytics',
    ],
  },
  {
    key: 'booking',
    title: 'Booking and payments',
    price: 45_000,
    summary: 'Members book, pay and manage their classes on your site. Full list below.',
    requires: 'website',
    includes: [
      'Class packs, memberships and drop-ins, paid by GCash, Maya, bank QR or card through PayMongo',
      'Booking and cancelling under your rules, with waitlists',
      'Private sessions, one-time workshops and events',
      'Member accounts, a studio admin, and automated emails in AYA\'s design',
      'Sentro setup for your team: staff records, attendance and payroll',
    ],
  },
  {
    key: 'ads',
    title: 'Ads setup',
    price: 5_000,
    summary: 'Meta ads set up and tracking before your first pre-launch post.',
    includes: [
      'Meta Business account, ad account and pixel',
      'Booking tracking, so you can see which ads lead to booked classes',
      'Audiences around the studio and your first pre-launch campaigns',
    ],
  },
];
const COMPLETE = CORE_TOTAL + OPTIONAL.reduce((sum, i) => sum + i.price, 0);

const RETAINER = {
  price: 20_000,
  summary: 'Social media, ads and website support from launch, run by the team that made the brand.',
  includes: [
    'Social media: content calendar, designed posts and reels, captions, scheduling and replies',
    'Ads: campaigns, budgets and a monthly results report',
    'Website and booking: updates, content changes and fixes',
  ],
};

const FEATURES: { title: string; price?: string; note?: string; groups: { head?: string; items: string[] }[] }[] = [
  {
    title: 'Custom website',
    price: peso(50_000),
    groups: [{
      items: [
        'Home page',
        'Classes page, plus a page for each class',
        'Live weekly schedule',
        'Pricing and packages',
        'Instructors',
        'About, community and rentals',
        'Location, FAQ and contact form',
        'Intro or trial offer page',
        'Terms and privacy pages',
        'Announcement bar for promos or holiday hours',
        'Edit classes, schedule, instructors, prices, FAQs and settings yourself',
        'Designed for phones first',
        'Basic SEO and analytics',
      ],
    }],
  },
  {
    title: 'Booking and payments',
    price: peso(45_000),
    groups: [
      {
        head: 'For members',
        items: [
          'Sign up, log in and reset a password',
          'Buy class packs, memberships and drop-ins online',
          'Pay by GCash, Maya, bank QR or card through PayMongo',
          'Book and cancel under your rules, including a late-cancel policy',
          'Credits returned automatically when the rules allow',
          'Waitlists that move the next person in when a spot opens',
          'Private, duo and trio sessions',
          'One-time workshops and events',
          'Promo codes and referral rewards',
          'Upcoming and past classes, packages and credits left',
          'Receipts, billing and profile',
          'Health form and waiver, filled in online',
        ],
      },
      {
        head: 'For the studio',
        items: [
          'A dashboard for the day',
          'Bookings by day, by week or by class, with class rosters',
          'Walk-in bookings, attendance and no-show marking',
          'Schedule editor with bulk edits',
          'Cancel a single date or assign a substitute instructor',
          'Editors for classes, instructors and pricing',
          'Member records with profile, credits and booking history',
          'Orders and revenue, with a six-month chart (owner only)',
          'Promo codes, plus referral and influencer rewards',
          'Reports',
          'Separate owner and staff access',
          'A log of every change made in the admin',
        ],
      },
      {
        head: 'Sentro, for your team',
        items: [
          'Staff and instructor records',
          'Attendance and time tracking',
          'Payroll calculation and documents',
        ],
      },
    ],
  },
  {
    title: 'Automated emails',
    note: 'Included with booking. Sent automatically, in AYA\'s design.',
    groups: [{
      items: [
        'Welcome and account setup',
        'Booking confirmed',
        'Package bought, with the payment receipt',
        'Booking cancelled, with late-cancel or credit details',
        'Moved in from the waitlist',
        'Class cancelled by the studio, with credit details',
        'Package expiring or credits running low',
        'Referral reward earned',
        'Trial or private-session request received, then confirmed',
        'New-request alerts to the studio',
      ],
    }],
  },
];

const TIMELINE: [string, string, string][] = [
  ['Discovery and strategy', 'November', 'Starts at kickoff'],
  ['Visual identity', 'December to mid-January', 'Two review rounds'],
  ['Guidelines and launch kit', 'By late January', 'AYA starts posting'],
  ['Website and booking', 'February to March', 'Live before opening'],
  ['Opening', 'March to April 2027', ''],
];

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-bold tracking-[0.2em] uppercase mb-3" style={{ color: S }}>
      {children}
    </p>
  );
}

function Check({ className = '' }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={`flex-shrink-0 ${className}`} style={{ color: S }}>
      <path d="M3 8.5l3.2 3.2L13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Phones get a gentle nudge to open the proposal on a bigger screen: the
// walkthrough and the pricing read best side by side. Dismissible, and the
// choice is remembered on this device only.
function BiggerScreenNotice() {
  const KEY = 'aya-proposal-phone-notice';
  const [hidden, setHidden] = useState(() => {
    try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
  });
  const [copied, setCopied] = useState(false);
  if (hidden) return null;
  const dismiss = () => {
    setHidden(true);
    try { localStorage.setItem(KEY, '1'); } catch { /* private mode */ }
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
    } catch { /* clipboard blocked; the link is in their email anyway */ }
  };
  return (
    <div className="md:hidden mx-4 mt-4 rounded-xl border px-4 py-3.5" style={{ borderColor: `${S}40`, background: `${S}0F` }}>
      <p className="text-[13.5px] font-semibold" style={{ color: INK }}>Best viewed on a laptop or computer</p>
      <p className="text-[12.5px] leading-[1.6] text-gray-600 mt-1">
        This proposal includes a walkthrough of the booking system that's easier to follow on a bigger screen.
      </p>
      <div className="flex gap-2 mt-3">
        <button type="button" onClick={copy}
          className="px-3.5 py-2 rounded-lg text-white text-[12.5px] font-semibold cursor-pointer" style={{ background: S }}>
          {copied ? 'Link copied' : 'Copy link'}
        </button>
        <button type="button" onClick={dismiss}
          className="px-3.5 py-2 rounded-lg text-[12.5px] font-semibold border border-black/10 text-gray-700 bg-white cursor-pointer">
          Continue on phone
        </button>
      </div>
    </div>
  );
}

function Box({ on }: { on: boolean }) {
  return (
    <span className="mt-0.5 w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border transition-colors"
      style={{ background: on ? S : 'transparent', borderColor: on ? S : 'rgba(0,0,0,0.2)' }}>
      {on && (
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
          <path d="M3 8.5l3.2 3.2L13 4.5" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  );
}

const rise = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.8 },
};

// Full-width photo band with the homepage's scroll-linked drift.
function PhotoBand({ src }: { src: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], ['-8%', '8%']);
  return (
    <div ref={ref} className="relative h-[46vh] sm:h-[62vh] overflow-hidden">
      <motion.img src={src} alt="" style={{ y }} className="absolute inset-0 w-full h-[116%] -top-[8%] object-cover" />
    </div>
  );
}

export default function AyaStudioProposal() {
  useEffect(() => {
    document.title = `AYA Studio proposal · Huna Creatives${IS_PREVIEW ? ' (Preview)' : ''}`;
  }, []);

  // Everything starts selected: the page leads with the complete package.
  const [picked, setPicked] = useState<Record<string, boolean>>(
    () => Object.fromEntries([...OPTIONAL.map(i => [i.key, true]), ['retainer', true]]),
  );

  const toggle = (key: string) => setPicked(prev => {
    const next = { ...prev, [key]: !prev[key] };
    // Booking lives on the website: adding it adds the site, dropping the site drops it.
    for (const item of OPTIONAL) {
      if (item.requires && next[item.key] && !next[item.requires]) {
        if (key === item.key) next[item.requires] = true;
        else next[item.key] = false;
      }
    }
    return next;
  });

  const oneTime = useMemo(
    () => CORE_TOTAL + OPTIONAL.reduce((sum, i) => sum + (picked[i.key] ? i.price : 0), 0),
    [picked],
  );
  const isComplete = OPTIONAL.every(i => picked[i.key]);

  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);
  const [slug, setSlug] = useState('');
  const [settled, setSettled] = useState(false);

  // Bind to the proposal row wired to this page (custom_path = '/p/aya-studio') and
  // log the view (server-side, for the IP). No slug bound → approve stays off.
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('hub_proposals')
        .select('slug, status')
        .eq('custom_path', PATH)
        .maybeSingle();
      if (!data?.slug) return;
      setSlug(data.slug);
      if (data.status === 'accepted' || data.status === 'declined') { setSettled(true); return; }
      // Don't count builder previews (iframed, or ?preview=1).
      const isPreview = window.self !== window.top || new URLSearchParams(window.location.search).has('preview');
      if (!isPreview) {
        supabase.functions.invoke('log-proposal-view', { body: { slug: data.slug } }).then(() => {}, () => {});
      }
    })();
  }, []);

  const approve = async () => {
    if (!name.trim() || !agreed || !slug) return;
    setBusy(true); setErr('');
    const selection = [
      `Brand Foundation (${peso(CORE_TOTAL)})`,
      ...OPTIONAL.filter(i => picked[i.key]).map(i => `${i.title} (${peso(i.price)})`),
    ].join(', ');
    const summary = `Selected: ${selection}. One-time total ${peso(oneTime)}.` +
      (picked.retainer ? ` Monthly retainer ${peso(RETAINER.price)}/mo.` : ' No monthly retainer.');
    try {
      const { data, error } = await supabase.functions.invoke('accept-quotation', {
        body: {
          slug,
          accepted_by_name: name.trim(),
          note: note.trim() ? `${summary}\n\n${note.trim()}` : summary,
          decision: 'accepted',
        },
      });
      if (error || data?.error) throw new Error(data?.error ?? error?.message ?? 'Something went wrong.');
      setDone(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: PAPER, color: INK, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif" }}>

      {IS_PREVIEW && (
        <div className="w-full text-center text-white text-[11px] font-bold tracking-[0.14em] uppercase py-2 px-4"
          style={{ background: S }}>
          Preview. Approvals here go to the Huna team, not the client.
        </div>
      )}

      <BiggerScreenNotice />

      {/* Top bar */}
      <div className="max-w-6xl mx-auto px-6 sm:px-8 pt-8 flex items-center justify-between">
        <img src="https://hunacreatives.com/images/fc04818c74ad69bdfb22b93a6a0c6a72.png" alt="Huna Creatives"
          className="h-9 sm:h-10" style={{ filter: 'brightness(0)' }} />
        <span className="text-[10px] font-bold tracking-[0.22em] uppercase px-3 py-1.5 rounded"
          style={{ color: S, border: `1px solid ${S}33`, background: `${S}0F` }}>
          Proposal
        </span>
      </div>

      {/* Hero */}
      <header className="max-w-6xl mx-auto px-6 sm:px-8 pt-14 sm:pt-20 pb-16 grid lg:grid-cols-[1.05fr_0.95fr] gap-12 lg:gap-16 items-center">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
          <h1 className="font-semibold leading-[1.08] tracking-[-0.02em] text-[40px] sm:text-[54px] [text-wrap:balance]">
            Your brand, website and booking, ready before AYA opens.
          </h1>
          <p className="mt-6 text-[17px] sm:text-[18px] leading-[1.75] text-gray-600 max-w-xl">
            The brand comes first, because the studio, Instagram, the ads and the booking screen all use it. The
            website, booking, ads and monthly support are optional and priced separately below.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <a href="#pricing" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-white text-sm font-semibold"
              style={{ background: S }}>
              See pricing →
            </a>
            <a href={ASK_HREF} className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold border border-black/10 text-gray-700 hover:border-black/20 transition-colors">
              Ask a question
            </a>
          </div>
          <p className="mt-6 text-[12px] text-gray-400">For AYA Studio, Makati · October 2026</p>
        </motion.div>
        <motion.div className="relative" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.15 }}>
          <div className="rounded-[28px] overflow-hidden aspect-[4/5] sm:aspect-[5/5] lg:aspect-[4/5]">
            <img src={`${IMG}/hero.webp`} alt="A calm Pilates studio with wooden reformers in soft daylight" className="w-full h-full object-cover" />
          </div>
          <div className="hidden sm:block absolute -left-8 -bottom-8 w-[38%] rounded-[20px] overflow-hidden border-[6px] shadow-[0_24px_60px_-20px_rgba(0,0,0,0.35)]"
            style={{ borderColor: PAPER }}>
            <img src={`${IMG}/instructor.webp`} alt="An instructor guiding a client on a Pilates chair" className="w-full aspect-[3/4] object-cover" />
          </div>
        </motion.div>
      </header>

      {/* What we heard */}
      <section className="max-w-6xl mx-auto px-6 sm:px-8 py-20 grid lg:grid-cols-[1fr_0.8fr] gap-12 items-start">
        <motion.div {...rise}>
          <Eyebrow>What we heard</Eyebrow>
          <h2 className="text-[26px] sm:text-[32px] font-semibold tracking-[-0.01em] mb-8 [text-wrap:balance]">
            You want AYA to feel premium and personal at once.
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {HEARD.map(([t, d]) => (
              <div key={t} className="rounded-xl border border-black/[0.06] p-5 bg-white">
                <p className="font-semibold text-[15px] mb-1.5">{t}</p>
                <p className="text-[13.5px] leading-[1.7] text-gray-600">{d}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-[15px] leading-[1.75] text-gray-700 max-w-2xl">
            You said success means one identity that feels the same in the studio, on Instagram, in the ads and on
            the booking screen. That's what we've priced below.
          </p>
        </motion.div>
        <motion.div className="rounded-[24px] overflow-hidden lg:mt-12" {...rise} transition={{ duration: 0.8, delay: 0.15 }}>
          <img src={`${IMG}/community.webp`} alt="Three women chatting with their mats before class" className="w-full aspect-[4/5] object-cover" />
        </motion.div>
      </section>

      {/* How we'd work */}
      <section className="max-w-6xl mx-auto px-6 sm:px-8 py-20">
        <motion.div {...rise}>
          <Eyebrow>How we'd work</Eyebrow>
          <h2 className="text-[26px] sm:text-[32px] font-semibold tracking-[-0.01em] mb-12 [text-wrap:balance] max-w-2xl">
            We start with the brand and build out from there.
          </h2>
        </motion.div>
        <ol className="grid md:grid-cols-2 lg:grid-cols-5 gap-x-6 gap-y-10">
          {STEPS.map(([n, title, desc], idx) => (
            <motion.li key={n} {...rise} transition={{ duration: 0.6, delay: idx * 0.1 }}
              className={`border-t-2 pt-5 ${idx > 2 ? 'border-dashed' : ''}`}
              style={{ borderColor: idx > 2 ? `${S}66` : INK }}>
              <span className="text-[13px] font-bold tabular-nums" style={{ color: S }}>{n}</span>
              <p className="font-semibold text-[16px] mt-2 mb-2">{title}</p>
              <p className="text-[14px] leading-[1.7] text-gray-600">{desc}</p>
            </motion.li>
          ))}
        </ol>
      </section>

      <PhotoBand src={`${IMG}/band.webp`} />

      {/* Journey */}
      <section className="pt-24">
        <motion.div className="max-w-6xl mx-auto px-6 sm:px-8 mb-6 lg:mb-0" {...rise}>
          <Eyebrow>See it work</Eyebrow>
          <h2 className="text-[26px] sm:text-[32px] font-semibold tracking-[-0.01em] [text-wrap:balance] max-w-2xl">
            One member, from an Instagram post to her next pack.
          </h2>
          <p className="mt-4 text-[15px] leading-[1.75] text-gray-600 max-w-2xl">
            Scroll through what Ana sees on her phone and what your team sees at the same moment. Sample data, real
            features: everything here is live at a studio we already run it for.
          </p>
        </motion.div>
        <div className="max-w-6xl mx-auto lg:px-8">
          <JourneyStory />
        </div>
        <div className="max-w-6xl mx-auto px-6 sm:px-8 pb-20 pt-4">
          <a href="/demo/wellness" target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold border border-black/10 text-gray-700 hover:border-black/20 bg-white transition-colors">
            Click through a full sample studio site and admin →
          </a>
        </div>
      </section>

      {/* Why Huna */}
      <section className="py-24" style={{ background: INK }}>
        <div className="max-w-6xl mx-auto px-6 sm:px-8 grid lg:grid-cols-[1fr_1fr] gap-14 items-start">
          <motion.div {...rise}>
            <p className="text-[11px] font-bold tracking-[0.2em] uppercase mb-3 text-white/40">Why Huna</p>
            <h2 className="text-white text-[26px] sm:text-[34px] font-semibold tracking-[-0.01em] [text-wrap:balance]">
              One team builds the brand, the website and the booking system.
            </h2>
            <p className="mt-6 text-[15.5px] leading-[1.8] text-white/65">
              We're ten designers, writers and strategists in Cebu. The people who design AYA's logo also build the
              website and booking, and can run your social and ads after launch. Nothing gets passed between
              agencies, so the brand on the studio wall is the same one on the booking screen. That's the
              consistency you asked for.
            </p>
            <div className="mt-10 grid grid-cols-3 gap-4 max-w-md">
              {[['38', 'brands built'], ['100+', 'projects delivered'], ['4.8★', 'average client rating']].map(([v, l]) => (
                <div key={l}>
                  <p className="text-white text-[26px] font-semibold tabular-nums">{v}</p>
                  <p className="text-white/45 text-[12.5px] leading-snug mt-0.5">{l}</p>
                </div>
              ))}
            </div>
          </motion.div>
          <motion.div className="space-y-5" {...rise} transition={{ duration: 0.8, delay: 0.15 }}>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
              <p className="text-white font-semibold text-[16px]">The booking system already runs a studio</p>
              <p className="mt-2 text-[14px] leading-[1.75] text-white/60">
                We built it for Asana Studio, a Pilates studio in Ormoc with paying members. They buy class packs, pay
                by QR, and book or cancel under the studio's own rules. They can join a waitlist and get reminders when
                their pack runs low. The owner sees bookings, attendance and revenue on one dashboard. AYA gets the
                same system, designed in the new brand and set up with your classes, prices and policies.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
              <p className="text-white font-semibold text-[16px]">Your back office comes with it</p>
              <p className="mt-2 text-[14px] leading-[1.75] text-white/60">
                We also build and run Sentro, our own operations hub for staff records, attendance, payroll and
                documents. It's set up for your team as part of booking, so the front desk and the back office sit
                with the same people as everything else.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-4xl mx-auto px-6 sm:px-8 py-24 scroll-mt-8">
        <Eyebrow>Pricing</Eyebrow>
        <h2 className="text-[26px] sm:text-[32px] font-semibold tracking-[-0.01em] mb-3 [text-wrap:balance]">
          The complete package is {peso(COMPLETE)}.
        </h2>
        <p className="text-[15px] leading-[1.75] text-gray-600 max-w-2xl">
          Brand Foundation is required. Everything else is optional: untick what you don't need and the total updates.
        </p>

        <h3 className="mt-10 mb-4 text-[15px] font-semibold">What you're paying for</h3>
        <div className="grid sm:grid-cols-3 gap-5 mb-12">
          {VALUE.map(([lead, text]) => (
            <p key={lead} className="text-[13.5px] leading-[1.7] text-gray-600">
              <b className="font-semibold" style={{ color: INK }}>{lead}</b> {text}
            </p>
          ))}
        </div>

        {/* Core */}
        <div className="rounded-xl border-2 bg-white p-5 sm:p-6" style={{ borderColor: INK }}>
          <div className="flex items-start gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold tracking-[0.16em] uppercase text-gray-400 mb-1">Always included</p>
              <p className="font-semibold text-[17px]">Brand Foundation</p>
            </div>
            <span className="text-[17px] font-semibold tabular-nums whitespace-nowrap" style={{ color: S }}>{peso(CORE_TOTAL)}</span>
          </div>
          <div className="mt-4 divide-y divide-black/[0.06]">
            {CORE_PARTS.map(([t, p, d]) => (
              <div key={t} className="flex items-start gap-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[14.5px]">{t}</p>
                  <p className="text-[13px] text-gray-500 mt-0.5 leading-relaxed">{d}</p>
                </div>
                <span className="text-[14px] text-gray-500 tabular-nums whitespace-nowrap">{peso(p)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Optional one-time */}
        <p className="text-[10px] font-bold tracking-[0.16em] uppercase text-gray-400 mt-10 mb-3">Optional, one-time</p>
        <div className="space-y-3">
          {OPTIONAL.map(item => {
            const on = !!picked[item.key];
            return (
              <button key={item.key} type="button" onClick={() => toggle(item.key)} disabled={done || settled}
                aria-pressed={on}
                className="w-full text-left rounded-xl border bg-white p-5 sm:p-6 transition-colors cursor-pointer disabled:cursor-default"
                style={{ borderColor: on ? S : 'rgba(0,0,0,0.08)' }}>
                <div className="flex items-start gap-4">
                  <Box on={on} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[16px]">{item.title}</p>
                    <p className="text-[13.5px] text-gray-500 mt-0.5">
                      {item.summary}
                      {item.requires && <span className="text-gray-400"> Needs the website.</span>}
                    </p>
                    <ul className={`mt-3 space-y-1.5 ${on ? '' : 'opacity-50'}`}>
                      {item.includes.map(line => (
                        <li key={line} className="flex gap-2.5 text-[13.5px] leading-[1.6] text-gray-700">
                          <Check className="mt-[3px]" />
                          {line}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <span className={`text-[16px] font-semibold tabular-nums whitespace-nowrap ${on ? '' : 'text-gray-300 line-through'}`}
                    style={on ? { color: S } : undefined}>
                    {peso(item.price)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Total */}
        <div className="mt-6 flex items-end gap-4 border-t-2 pt-4" style={{ borderColor: INK }}>
          <div className="flex-1">
            <p className="text-[10px] font-bold tracking-[0.16em] uppercase text-gray-400">One-time total</p>
            <p className="text-[13px] text-gray-500 mt-0.5">{isComplete ? 'Complete package' : 'Your selection'}</p>
          </div>
          <span className="text-[28px] sm:text-[32px] font-semibold tabular-nums tracking-[-0.01em]">{peso(oneTime)}</span>
        </div>

        {/* Retainer */}
        <p className="text-[10px] font-bold tracking-[0.16em] uppercase text-gray-400 mt-12 mb-3">Optional, monthly</p>
        <button type="button" onClick={() => toggle('retainer')} disabled={done || settled}
          aria-pressed={!!picked.retainer}
          className="w-full text-left rounded-xl border bg-white p-5 sm:p-6 transition-colors cursor-pointer disabled:cursor-default"
          style={{ borderColor: picked.retainer ? S : 'rgba(0,0,0,0.08)' }}>
          <div className="flex items-start gap-4">
            <Box on={!!picked.retainer} />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[16px]">Monthly retainer</p>
              <p className="text-[13.5px] text-gray-500 mt-0.5">{RETAINER.summary}</p>
              <ul className={`mt-3 space-y-1.5 ${picked.retainer ? '' : 'opacity-50'}`}>
                {RETAINER.includes.map(line => (
                  <li key={line} className="flex gap-2.5 text-[13.5px] leading-[1.6] text-gray-700">
                    <Check className="mt-[3px]" />
                    {line}
                  </li>
                ))}
              </ul>
            </div>
            <span className={`text-[16px] font-semibold tabular-nums whitespace-nowrap ${picked.retainer ? '' : 'text-gray-300 line-through'}`}
              style={picked.retainer ? { color: S } : undefined}>
              {peso(RETAINER.price)}<span className="text-[12px] font-normal text-gray-400">/mo</span>
            </span>
          </div>
        </button>

        <div className="mt-8 text-[13px] leading-relaxed text-gray-500 max-w-2xl space-y-2">
          <p>Each phase is billed 50% to start and 50% on delivery. The retainer is billed at the start of each month.</p>
          <p>Ad spend goes straight to Meta and isn't part of the retainer. PayMongo fees and the domain are paid to those providers directly.</p>
          <p>Each stage includes two rounds of revisions. Please send each round's feedback together. If you want a new direction after approving one, we'll quote it before we start.</p>
        </div>
      </section>

      {/* Everything included */}
      <section className="py-24 bg-white border-y border-black/[0.05]">
        <div className="max-w-6xl mx-auto px-6 sm:px-8">
          <motion.div {...rise}>
            <Eyebrow>Everything included</Eyebrow>
            <h2 className="text-[26px] sm:text-[32px] font-semibold tracking-[-0.01em] [text-wrap:balance] max-w-2xl">
              Here's everything in the website and booking system.
            </h2>
            <p className="mt-4 text-[15px] leading-[1.75] text-gray-600 max-w-2xl">
              All of it is live today at Asana Studio. AYA gets its own version in the new brand.
            </p>
          </motion.div>
          <div className="mt-12 grid lg:grid-cols-3 gap-10">
            {FEATURES.map((col, ci) => (
              <motion.div key={col.title} {...rise} transition={{ duration: 0.6, delay: ci * 0.1 }}>
                <div className="flex items-baseline justify-between gap-3 border-b-2 pb-3 mb-4" style={{ borderColor: INK }}>
                  <p className="font-semibold text-[16px]">{col.title}</p>
                  {col.price && <span className="text-[13px] tabular-nums text-gray-500">{col.price}</span>}
                </div>
                {col.note && <p className="text-[13px] text-gray-500 mb-4">{col.note}</p>}
                {col.groups.map(g => (
                  <div key={g.head ?? col.title} className="mb-6 last:mb-0">
                    {g.head && <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-gray-400 mb-2.5">{g.head}</p>}
                    <ul className="space-y-2">
                      {g.items.map(line => (
                        <li key={line} className="flex gap-2.5 text-[13.5px] leading-[1.6] text-gray-700">
                          <Check className="mt-[3px]" />
                          {line}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="max-w-4xl mx-auto px-6 sm:px-8 py-24">
        <Eyebrow>Timeline</Eyebrow>
        <h2 className="text-[26px] sm:text-[32px] font-semibold tracking-[-0.01em] mb-8 [text-wrap:balance]">
          AYA can go public in late January and take bookings before opening.
        </h2>
        <div className="space-y-1">
          {TIMELINE.map(([phase, when, detail]) => (
            <div key={phase} className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_200px_160px] gap-x-4 py-3 border-b border-black/[0.06] items-baseline">
              <span className="text-[14.5px] text-gray-800">{phase}</span>
              <span className="text-[14px] font-medium text-right sm:text-left">{when}</span>
              <span className="hidden sm:block text-[13px] text-gray-400 text-right">{detail}</span>
            </div>
          ))}
        </div>
        <p className="mt-5 text-[13px] leading-relaxed text-gray-500 max-w-xl">
          To hit these dates we need to start by mid-November. The identity stage runs through the holidays, so
          quick feedback in December keeps late January on track.
        </p>
      </section>

      {/* CTA / approve */}
      <section id="approve" className="scroll-mt-8" style={{ background: INK }}>
        <div className="max-w-4xl mx-auto px-6 sm:px-8 py-20">
          <div className="max-w-xl">
            {done || settled ? (
              <>
                <p className="text-white/30 text-xs tracking-[0.16em] uppercase mb-4">Approved</p>
                <h2 className="text-white text-[34px] sm:text-[42px] font-semibold leading-tight mb-5">
                  {done ? `Salamat${name ? `, ${name.trim().split(' ')[0]}` : ''}.` : "You're all set."}
                </h2>
                <p className="text-white/55 text-[15px] leading-relaxed">
                  {done
                    ? "We've emailed you the next steps: a short kickoff form, then the agreement and the deposit invoice. Once those are done, we start on discovery."
                    : "This proposal has already been approved. Check your email for the next steps, or reply and we'll send them again."}
                </p>
              </>
            ) : (
              <>
                <p className="text-white/30 text-xs tracking-[0.16em] uppercase mb-4">Next step</p>
                <h2 className="text-white text-[34px] sm:text-[42px] font-semibold leading-tight mb-5">
                  Ready to start?
                </h2>
                <p className="text-white/55 text-[15px] leading-relaxed mb-9">
                  Approving confirms the items you've ticked above. Next we send a short kickoff form, then the
                  agreement and the deposit invoice. If you'd like to talk anything through first, email us.
                </p>

                <div className="bg-white/[0.04] border border-white/10 rounded-lg p-6 space-y-4">
                  <div className="flex items-baseline justify-between gap-4 pb-4 border-b border-white/10">
                    <span className="text-white/40 text-[11px] tracking-[0.14em] uppercase">Your selection</span>
                    <span className="text-white text-[15px] font-semibold tabular-nums text-right">
                      {peso(oneTime)}
                      {picked.retainer && <span className="text-white/50 font-normal"> + {peso(RETAINER.price)}/mo</span>}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-white/40 text-[11px] tracking-[0.14em] uppercase">Your full name</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)}
                      className="w-full bg-transparent border border-white/15 rounded px-4 py-3 text-white text-[15px] placeholder:text-white/20 focus:outline-none focus:border-white/40 transition-colors" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-white/40 text-[11px] tracking-[0.14em] uppercase">
                      Anything to add? <span className="normal-case tracking-normal text-white/20">(optional)</span>
                    </label>
                    <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
                      placeholder="Opening date, who we'll be working with, anything else we should know"
                      className="w-full bg-transparent border border-white/15 rounded px-4 py-3 text-white text-[15px] placeholder:text-white/20 focus:outline-none focus:border-white/40 transition-colors resize-none" />
                  </div>
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)}
                      className="mt-1 w-4 h-4 cursor-pointer flex-shrink-0" style={{ accentColor: S }} />
                    <span className="text-white/50 text-[13px] leading-relaxed group-hover:text-white/70 transition-colors">
                      I approve the items selected above and understand an agreement and deposit invoice will follow.
                    </span>
                  </label>
                  {err && (
                    <p className="text-red-300 text-[13px] bg-red-500/10 border border-red-500/20 rounded px-4 py-2.5">{err}</p>
                  )}
                  {!slug && !err && (
                    <p className="text-white/40 text-[12px]">This link isn't active yet. To approve now, reply to the email we sent you.</p>
                  )}
                </div>

                <div className="flex flex-wrap gap-4 mt-5">
                  <button onClick={approve} disabled={busy || !name.trim() || !agreed || !slug}
                    className="inline-flex items-center gap-2 px-7 py-3.5 text-white text-sm font-semibold rounded transition-opacity hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    style={{ background: S }}>
                    {busy ? 'Saving…' : 'Approve proposal →'}
                  </button>
                  <a href={ASK_HREF}
                    className="inline-flex items-center gap-2 px-7 py-3.5 text-white text-sm font-semibold border border-white/20 rounded hover:border-white/45 hover:bg-white/[0.04] transition-colors">
                    Ask a question
                  </a>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      <footer className="px-6 sm:px-8 py-8" style={{ background: INK }}>
        <div className="max-w-4xl mx-auto flex items-center justify-between flex-wrap gap-4 border-t border-white/[0.06] pt-8">
          <img src="https://hunacreatives.com/images/fc04818c74ad69bdfb22b93a6a0c6a72.png" alt="Huna Creatives" className="h-5 opacity-40" />
          <div className="flex items-center gap-6 flex-wrap">
            <span className="text-white/25 text-xs">Cebu City, Philippines</span>
            <a href="mailto:contact@hunacreatives.com" className="text-white/25 text-xs hover:text-white/50 transition-colors">
              contact@hunacreatives.com
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
