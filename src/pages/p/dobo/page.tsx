import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

// Bespoke proposal for Matthew Oyos / DOBO (growdobo.com) — an ongoing
// arrangement where Huna builds the Shopify stores for DOBO's clients while
// DOBO runs growth, paid and retention. The page binds itself to whichever
// hub_proposals row carries `custom_path = '/p/dobo'` (set in the Sentro
// proposal builder), and records approval + views against that row via the
// shared accept-quotation flow. Falls back to a fixed slug if none is wired.
const PATH = '/p/dobo';
const FALLBACK_SLUG = 'matthew-oyos-kh2y';
const ASK_HREF = 'mailto:contact@hunacreatives.com?subject=' +
  encodeURIComponent('Questions about the DOBO partnership proposal');

const V = '#5B3DF5';        // DOBO-flavoured violet
const INK = '#0E0E12';

const STEPS: [string, string, string][] = [
  ['01', 'Discovery', 'We learn the brand, its customer, and the numbers that matter — sales, AOV, what the paid side needs from the site.'],
  ['02', 'Structure', 'Sitemap and shopping journey first. We bring proposed positioning, page structure and content direction for the brand to react to.'],
  ['03', 'Design', "Custom layouts and sections designed in Shopify's grain — mobile-first, on-brand, with real revision rounds."],
  ['04', 'Build', 'Developed on Shopify: catalog and collections, checkout configured and styled, payments, shipping and tax, apps only where they earn their place.'],
  ['05', 'QA', 'Tested across devices and browsers, test transactions end to end, SEO basics, redirects, and analytics wired for the paid team.'],
  ['06', 'Launch & handover', 'We go live with you, hand over a backend your team can run, train them, and stay on for a 30-day bug window.'],
];

const INCLUDED = [
  'Discovery and strategy — customer, goals, and site architecture',
  'UX wireframes and custom UI design, not a template',
  'Fully responsive build, tested across devices',
  'Shopify admin set up so the brand can manage products and content',
  'Ecommerce setup — catalog, cart and checkout, payments, shipping and tax rules',
  'Key app integrations, kept to the ones that earn their place',
  'SEO fundamentals, analytics, and event tracking wired for the paid side',
  'Performance optimization for fast load and better ad efficiency',
  'Launch support, a 30-day bug window, and full handover with training',
];

const PARTNERSHIP = [
  ['You own the client relationship', 'DOBO stays the growth partner and the face to the client. We are the build engine behind you.'],
  ['White-label by default', 'NDAs, delivery under the DOBO name, and we can join client calls as your team when that helps.'],
  ['First build, then a rhythm', 'We price and run the first store, then agree rates for succeeding builds once we have one under our belt together.'],
  ['No scope overlap', 'You run creative, paid and retention. We run the store it all points at. Nothing to negotiate over.'],
];

const INVEST: [string, string, string][] = [
  ['Shopify custom ecommerce website', 'Discovery, design, build, launch and handover — per site', 'PHP 60,000–80,000'],
  ['Product photography & content production', 'Optional. Quoted per shoot day once the product list is final', 'On request'],
  ['Post-launch care & support retainer', 'Optional. Scoped after the 30-day bug window if you want us on standby', 'On request'],
  ['Succeeding Shopify builds', 'Rates for additional sites agreed once we have run the first build', 'On request'],
];

const TIMELINE: [string, string][] = [
  ['Discovery', '~1 week'],
  ['Structure & design', '2–3 weeks'],
  ['Build', '2–3 weeks'],
  ['QA & launch', '~1 week'],
];

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-bold tracking-[0.2em] uppercase mb-3" style={{ color: V }}>
      {children}
    </p>
  );
}

export default function DoboProposal() {
  useEffect(() => { document.title = 'Partnership Proposal — DOBO × Huna Creatives'; }, []);

  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);
  const [slug, setSlug] = useState(FALLBACK_SLUG);
  const [settled, setSettled] = useState(false);

  // Bind to the proposal row wired to this page and, best-effort, mark it viewed.
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('hub_proposals')
        .select('slug, status')
        .eq('custom_path', PATH)
        .maybeSingle();
      if (!data) return;
      setSlug(data.slug);
      if (data.status === 'accepted' || data.status === 'declined') { setSettled(true); return; }
      if (data.status === 'sent') {
        supabase.from('hub_proposals')
          .update({ status: 'viewed', viewed_at: new Date().toISOString() })
          .eq('slug', data.slug).eq('status', 'sent').then(() => {}, () => {});
      }
    })();
  }, []);

  const approve = async () => {
    if (!name.trim() || !agreed) return;
    setBusy(true); setErr('');
    try {
      const { data, error } = await supabase.functions.invoke('accept-quotation', {
        body: { slug, accepted_by_name: name.trim(), note: note.trim() || null, decision: 'accepted' },
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
    <div className="min-h-screen bg-white" style={{ color: INK, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif" }}>

      {/* Top bar */}
      <div className="max-w-4xl mx-auto px-6 sm:px-8 pt-8 flex items-center justify-between">
        <img src="https://hunacreatives.com/images/fc04818c74ad69bdfb22b93a6a0c6a72.png" alt="Huna Creatives"
          className="h-6" style={{ filter: 'brightness(0)' }} />
        <span className="text-[10px] font-bold tracking-[0.22em] uppercase px-3 py-1.5 rounded"
          style={{ color: V, border: `1px solid ${V}33`, background: `${V}0F` }}>
          Partnership Proposal
        </span>
      </div>

      {/* Hero */}
      <header className="max-w-4xl mx-auto px-6 sm:px-8 pt-16 pb-14">
        <p className="text-[12px] tracking-[0.18em] uppercase text-gray-400 mb-5">
          Prepared for Matthew Oyos · DOBO
        </p>
        <h1 className="font-semibold leading-[1.08] tracking-[-0.02em] text-[40px] sm:text-[56px]">
          The build partner<br />behind your growth work.
        </h1>
        <p className="mt-6 text-[17px] sm:text-[19px] leading-[1.75] text-gray-600 max-w-2xl">
          DOBO runs creative, paid and retention for DTC brands. This is a proposal for the piece next to that:
          the Shopify stores those campaigns point at — designed to convert, built to hand over, delivered under your name.
        </p>
        <div className="mt-9 flex flex-wrap items-center gap-4">
          <a href="#approve" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-white text-sm font-semibold"
            style={{ background: V }}>
            Approve &amp; get started →
          </a>
          <a href={ASK_HREF} className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold border border-gray-200 text-gray-700 hover:border-gray-300 transition-colors">
            Ask questions
          </a>
          <span className="text-[11px] text-gray-400">September 2026 · Huna Creatives</span>
        </div>
      </header>

      <div className="h-px w-full bg-gray-100" />

      {/* Why this works */}
      <section className="max-w-4xl mx-auto px-6 sm:px-8 py-16">
        <Eyebrow>Part I · Why this works</Eyebrow>
        <h2 className="text-[26px] sm:text-[30px] font-semibold tracking-[-0.01em] mb-8">
          One team for the build, so you stay on the growth.
        </h2>
        <div className="grid sm:grid-cols-3 gap-5">
          {[
            ['No scope overlap', 'You own creative, paid and retention. We own the store. Nothing to carve up or compete over.'],
            ['Built to convert', 'Custom layouts and a checkout tuned to the platform — not a theme your paid traffic bounces off.'],
            ['Made to hand over', 'A Shopify backend the brand can actually run, plus training and a 30-day bug window.'],
          ].map(([t, d]) => (
            <div key={t} className="rounded-xl border border-gray-100 p-5 bg-[#FAFAFC]">
              <p className="font-semibold text-[15px] mb-1.5">{t}</p>
              <p className="text-[13.5px] leading-[1.7] text-gray-600">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="h-px w-full bg-gray-100" />

      {/* How we build — numbered */}
      <section className="max-w-4xl mx-auto px-6 sm:px-8 py-16">
        <Eyebrow>Part II · How we build</Eyebrow>
        <h2 className="text-[26px] sm:text-[30px] font-semibold tracking-[-0.01em] mb-10">
          Six stages, a checkpoint at each.
        </h2>
        <ol className="space-y-7">
          {STEPS.map(([n, title, desc]) => (
            <li key={n} className="grid grid-cols-[44px_1fr] sm:grid-cols-[64px_1fr] gap-4 sm:gap-6">
              <span className="text-[15px] font-bold tabular-nums pt-0.5" style={{ color: V }}>{n}</span>
              <div>
                <p className="font-semibold text-[16px] mb-1">{title}</p>
                <p className="text-[14.5px] leading-[1.75] text-gray-600 max-w-xl">{desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <div className="h-px w-full bg-gray-100" />

      {/* What's included */}
      <section className="max-w-4xl mx-auto px-6 sm:px-8 py-16">
        <Eyebrow>Part III · What every build includes</Eyebrow>
        <h2 className="text-[26px] sm:text-[30px] font-semibold tracking-[-0.01em] mb-8">
          The standard scope, per site.
        </h2>
        <ul className="grid sm:grid-cols-2 gap-x-10 gap-y-3.5">
          {INCLUDED.map((item) => (
            <li key={item} className="flex gap-3 text-[14.5px] leading-[1.7] text-gray-700">
              <span className="mt-[7px] h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: V }} />
              {item}
            </li>
          ))}
        </ul>
      </section>

      <div className="h-px w-full bg-gray-100" />

      {/* Partnership model */}
      <section className="max-w-4xl mx-auto px-6 sm:px-8 py-16">
        <Eyebrow>Part IV · The partnership model</Eyebrow>
        <h2 className="text-[26px] sm:text-[30px] font-semibold tracking-[-0.01em] mb-8">
          How we'd work together.
        </h2>
        <div className="grid sm:grid-cols-2 gap-5">
          {PARTNERSHIP.map(([t, d]) => (
            <div key={t} className="rounded-xl border border-gray-100 p-5">
              <p className="font-semibold text-[15px] mb-1.5">{t}</p>
              <p className="text-[13.5px] leading-[1.7] text-gray-600">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="h-px w-full bg-gray-100" />

      {/* Investment */}
      <section className="max-w-4xl mx-auto px-6 sm:px-8 py-16">
        <Eyebrow>Part V · Investment</Eyebrow>
        <h2 className="text-[26px] sm:text-[30px] font-semibold tracking-[-0.01em] mb-8">
          The numbers.
        </h2>
        <div className="border-b-2 pb-2 mb-1 flex items-end gap-4" style={{ borderColor: INK }}>
          <span className="flex-1 text-[10px] font-bold tracking-[0.16em] uppercase text-gray-400">Item</span>
          <span className="w-40 text-right text-[10px] font-bold tracking-[0.16em] uppercase text-gray-400">Amount</span>
        </div>
        {INVEST.map(([item, sub, amt]) => (
          <div key={item} className="flex items-start gap-4 py-4 border-b border-gray-100">
            <div className="flex-1 min-w-0">
              <p className="text-[15px] leading-snug">{item}</p>
              <p className="text-[13px] text-gray-400 mt-1 leading-relaxed">{sub}</p>
            </div>
            <span className="w-40 text-right text-[15px] tabular-nums whitespace-nowrap">
              {amt === 'On request'
                ? <span className="text-gray-400">On request</span>
                : <span className="font-semibold" style={{ color: V }}>{amt}</span>}
            </span>
          </div>
        ))}
        <p className="mt-5 text-[13px] leading-relaxed text-gray-500 max-w-xl">
          The figure is an indicative range, not a fixed price. It firms up once the page count, the product count,
          and any custom checkout or app work are locked — that's the detailed quotation that follows approval.
        </p>
      </section>

      <div className="h-px w-full bg-gray-100" />

      {/* Timeline */}
      <section className="max-w-4xl mx-auto px-6 sm:px-8 py-16">
        <Eyebrow>Part VI · Indicative timeline</Eyebrow>
        <h2 className="text-[26px] sm:text-[30px] font-semibold tracking-[-0.01em] mb-8">
          Roughly six to eight weeks per site.
        </h2>
        <div className="space-y-3">
          {TIMELINE.map(([phase, dur]) => (
            <div key={phase} className="flex items-baseline gap-4 py-3 border-b border-gray-100">
              <span className="flex-1 text-[14.5px] text-gray-700">{phase}</span>
              <span className="text-[14px] font-medium tabular-nums">{dur}</span>
            </div>
          ))}
        </div>
        <p className="mt-5 text-[13px] leading-relaxed text-gray-500 max-w-xl">
          Catalog size and content readiness move this the most. We confirm real dates in Discovery.
        </p>
      </section>

      {/* CTA / approve */}
      <section id="approve" className="scroll-mt-8" style={{ background: INK }}>
        <div className="h-[3px]" style={{ background: V }} />
        <div className="max-w-4xl mx-auto px-6 sm:px-8 py-20">
          <div className="max-w-xl">
            {done || settled ? (
              <>
                <p className="text-white/30 text-xs tracking-[0.16em] uppercase mb-4">Approved</p>
                <h2 className="text-white text-[34px] sm:text-[42px] font-semibold leading-tight mb-5">
                  {done ? `Thank you${name ? `, ${name.trim().split(' ')[0]}` : ''}.` : "You're all set."}
                </h2>
                <p className="text-white/55 text-[15px] leading-relaxed">
                  {done
                    ? "We've recorded your approval. Next, we'll send the detailed quotation for the first build along with the partnership agreement. Then we start Discovery."
                    : "This proposal has already been approved. We'll be in touch with the detailed quotation and the partnership agreement."}
                </p>
              </>
            ) : (
              <>
                <p className="text-white/30 text-xs tracking-[0.16em] uppercase mb-4">Next step</p>
                <h2 className="text-white text-[34px] sm:text-[42px] font-semibold leading-tight mb-5">
                  Ready to run the first one?
                </h2>
                <p className="text-white/55 text-[15px] leading-relaxed mb-9">
                  Approve below and we'll send the detailed quotation and the partnership agreement straight over.
                  If anything needs clarifying first, send your questions our way.
                </p>

                <div className="bg-white/[0.04] border border-white/10 rounded-lg p-6 space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-white/40 text-[11px] tracking-[0.14em] uppercase">Your full name</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Matthew Oyos"
                      className="w-full bg-transparent border border-white/15 rounded px-4 py-3 text-white text-[15px] placeholder:text-white/20 focus:outline-none focus:border-white/40 transition-colors" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-white/40 text-[11px] tracking-[0.14em] uppercase">
                      Anything to add? <span className="normal-case tracking-normal text-white/20">(optional)</span>
                    </label>
                    <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
                      placeholder="A first client in mind, timing, anything we should know…"
                      className="w-full bg-transparent border border-white/15 rounded px-4 py-3 text-white text-[15px] placeholder:text-white/20 focus:outline-none focus:border-white/40 transition-colors resize-none" />
                  </div>
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)}
                      className="mt-1 w-4 h-4 cursor-pointer flex-shrink-0" style={{ accentColor: V }} />
                    <span className="text-white/50 text-[13px] leading-relaxed group-hover:text-white/70 transition-colors">
                      I approve this proposal and understand a detailed quotation and a partnership agreement will follow for signature.
                    </span>
                  </label>
                  {err && (
                    <p className="text-red-300 text-[13px] bg-red-500/10 border border-red-500/20 rounded px-4 py-2.5">{err}</p>
                  )}
                </div>

                <div className="flex flex-wrap gap-4 mt-5">
                  <button onClick={approve} disabled={busy || !name.trim() || !agreed}
                    className="inline-flex items-center gap-2 px-7 py-3.5 text-white text-sm font-semibold rounded transition-opacity hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    style={{ background: V }}>
                    {busy ? 'Recording…' : 'Approve proposal →'}
                  </button>
                  <a href={ASK_HREF}
                    className="inline-flex items-center gap-2 px-7 py-3.5 text-white text-sm font-semibold border border-white/20 rounded hover:border-white/45 hover:bg-white/[0.04] transition-colors">
                    Ask questions
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
          <div className="flex items-center gap-6">
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
