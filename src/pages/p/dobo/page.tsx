import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

// Bespoke proposal for Matthew Oyos / DOBO (growdobo.com) — an ongoing
// arrangement where Huna builds the Shopify stores for DOBO's clients while
// DOBO runs strategy, creative, paid media and retention. The page binds
// itself to whichever hub_proposals row carries `custom_path = '/p/dobo'`
// (set in the Sentro proposal builder), and records approval + views
// against that row via the shared accept-quotation flow.
const PATH = '/p/dobo';
const ASK_HREF = 'mailto:contact@hunacreatives.com?subject=' +
  encodeURIComponent('Questions about the DOBO partnership proposal');

const V = '#5B3DF5';        // DOBO-flavoured violet
const INK = '#0E0E12';

const STEPS: [string, string, string][] = [
  ['01', 'Discovery', 'We start with the brand, the customer and the business behind the store. We will also look at sales, AOV, current performance and what DOBO needs the website to support.'],
  ['02', 'Structure', 'Before we design anything, we map the sitemap, customer journey and key pages. We will also recommend the content and messaging each page needs before moving into design.'],
  ['03', 'Design', 'We design the key pages and reusable sections around the brand, with mobile considered from the start. Feedback and revisions are built into this stage.'],
  ['04', 'Build', 'Once the design is approved, we build everything in Shopify: products, collections, checkout, payments, shipping, tax settings and any required app integrations.'],
  ['05', 'QA', 'Before launch, we test the site across devices and browsers, run test purchases, check redirects and basic SEO, and make sure analytics and tracking are working properly.'],
  ['06', 'Launch and handover', 'We handle launch with your team, walk the client through the Shopify backend, and provide 30 days of support for any post-launch bugs or fixes.'],
];

const INCLUDED = [
  'Discovery and planning, including customer journey, goals and site structure',
  'UX wireframes and custom interface design based on the brand, not a pre-made template',
  'Shopify development for agreed pages, reusable sections and responsive layouts',
  'Product, collection and navigation setup based on the agreed catalog',
  'Placing the product photography and copy you provide across the catalog and pages',
  'Checkout, payments, shipping and tax configuration',
  'Setup and integration of the apps the store actually needs',
  'Basic SEO setup, redirects and analytics / tracking implementation',
  'Performance optimisation to keep the site fast and reduce friction from paid traffic',
  'Launch support, Shopify training and 30 days of post-launch bug support',
];

const PARTNERSHIP = [
  ['You own the client relationship', 'DOBO remains the lead partner and primary client contact. Huna works behind the scenes as your Shopify design and development team.'],
  ['White-label by default', 'We can work fully white-label, including NDAs and delivery under the DOBO name. When needed, we can also join client meetings as part of your wider team.'],
  ['Start with one project', 'We agree the scope and pricing for the first site. Once we have run a full project together, we can settle on a repeatable process, partner rates for future builds, and a single retainer to support everything we have built for you.'],
  ['Clear scope, no duplicated work', 'DOBO continues to own strategy, creative, paid media and retention. Huna takes responsibility for the Shopify website. Clear roles, no duplicated work.'],
];

const INVEST: [string, string, string][] = [
  ['Shopify custom ecommerce website', 'Discovery, design, build, launch and handover, per site', 'PHP 70,000–80,000'],
  ['Future Shopify builds', 'Partner pricing can be agreed after the first project, once we have a clear sense of the typical scope and workflow', 'Partner rate'],
  ['Support retainer', "Once we're supporting multiple live sites, we can move to a shared monthly retainer instead of quoting every update separately. This can cover ongoing maintenance, bug fixes, monitoring, and small site changes across the portfolio.\n\nRetainer pricing depends on the number of sites and how much ongoing support they need. As a guide, support for two to three low-maintenance sites may start around PHP 15,000/month, while a larger or more active portfolio may fall around PHP 40,000–60,000/month.\n\nMonth to month.", 'From PHP 15,000 / mo'],
];

const TIMELINE: [string, string][] = [
  ['Discovery', 'around 1 week'],
  ['Structure and design', '2 to 3 weeks'],
  ['Build', '2 to 3 weeks'],
  ['QA and launch', 'around 1 week'],
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
  const [slug, setSlug] = useState('');
  const [settled, setSettled] = useState(false);

  // Bind to the proposal row wired to this page (custom_path = '/p/dobo') and,
  // best-effort, mark it viewed. No slug bound → the approve button stays off.
  useEffect(() => {
    (async () => {
      // Take the newest if more than one row is (mistakenly) tagged with this path.
      const { data: rows } = await supabase
        .from('hub_proposals')
        .select('slug, status')
        .eq('custom_path', PATH)
        .order('created_at', { ascending: false })
        .limit(1);
      const data = rows?.[0];
      if (!data?.slug) return;
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
    if (!name.trim() || !agreed || !slug) return;
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
          className="h-9 sm:h-10" style={{ filter: 'brightness(0)' }} />
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
          You grow the brand.<br />We build the store behind it.
        </h1>
        <p className="mt-6 text-[17px] sm:text-[19px] leading-[1.75] text-gray-600 max-w-2xl">
          DOBO stays focused on strategy, creative, paid media and retention. Huna handles the Shopify build
          from planning and design through development, launch and handover, working behind the scenes and
          delivering under your name.
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
          You keep the client. We take care of the build.
        </h2>
        <div className="grid sm:grid-cols-3 gap-5">
          {[
            ['Clear responsibilities', 'DOBO continues to lead strategy, creative, paid media and retention. Huna handles the Shopify build, so responsibilities stay clear from the start.'],
            ['Built around the customer journey', 'We design each store around how customers arrive, browse and buy, with paid traffic and conversion considered from the start.'],
            ['Easy to hand over', 'Once the site is live, the client gets a Shopify setup they can confidently manage, along with training and 30 days of post-launch support.'],
          ].map(([t, d]) => (
            <div key={t} className="rounded-xl border border-gray-100 p-5 bg-[#FAFAFC]">
              <p className="font-semibold text-[15px] mb-1.5">{t}</p>
              <p className="text-[13.5px] leading-[1.7] text-gray-600">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="h-px w-full bg-gray-100" />

      {/* How we build */}
      <section className="max-w-4xl mx-auto px-6 sm:px-8 py-16">
        <Eyebrow>Part II · How we build</Eyebrow>
        <h2 className="text-[26px] sm:text-[30px] font-semibold tracking-[-0.01em] mb-10">
          A clear process from kickoff to launch.
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
          What is included in each build.
        </h2>
        <ul className="grid sm:grid-cols-2 gap-x-10 gap-y-3.5">
          {INCLUDED.map((item) => (
            <li key={item} className="flex gap-2.5 text-[14.5px] leading-[1.7] text-gray-700">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mt-[4px] flex-shrink-0" style={{ color: V }}>
                <path d="M3 8.5l3.2 3.2L13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
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
          How we would work together.
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
          Project investment
        </h2>
        <div className="border-b-2 pb-2 mb-1 flex items-end gap-4" style={{ borderColor: INK }}>
          <span className="flex-1 text-[10px] font-bold tracking-[0.16em] uppercase text-gray-400">Item</span>
          <span className="w-40 text-right text-[10px] font-bold tracking-[0.16em] uppercase text-gray-400">Amount</span>
        </div>
        {INVEST.map(([item, sub, amt]) => (
          <div key={item} className="flex items-start gap-4 py-4 border-b border-gray-100">
            <div className="flex-1 min-w-0">
              <p className="text-[15px] leading-snug">{item}</p>
              <div className="text-[13px] text-gray-400 mt-1 leading-relaxed space-y-2">
                {sub.split('\n\n').map((para, k) => <p key={k}>{para}</p>)}
              </div>
            </div>
            <span className="w-40 text-right text-[15px] tabular-nums whitespace-nowrap">
              {/\d/.test(amt)
                ? <span className="font-semibold" style={{ color: V }}>{amt}</span>
                : <span className="text-gray-400">{amt}</span>}
            </span>
          </div>
        ))}
        <p className="mt-5 text-[13px] leading-relaxed text-gray-500 max-w-xl">
          The range above is an estimate for a typical build. We will confirm the final price once the page count,
          product catalog and any custom functionality are agreed. A detailed quotation will be provided before
          work begins.
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
          Final timing depends mainly on the size of the product catalog and how ready the content is at
          kickoff. We will lock the schedule with you once the catalog and content are confirmed.
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
                    ? "We've recorded your approval and emailed you the next steps. First is a short project brief; once we have that we'll send the final quotation and the partnership agreement, then we start Discovery."
                    : "This proposal has already been approved. Check your email for the next steps, or reply to us and we'll resend them."}
                </p>
              </>
            ) : (
              <>
                <p className="text-white/30 text-xs tracking-[0.16em] uppercase mb-4">Next step</p>
                <h2 className="text-white text-[34px] sm:text-[42px] font-semibold leading-tight mb-5">
                  Let's start with the first one.
                </h2>
                <p className="text-white/55 text-[15px] leading-relaxed mb-9">
                  If everything looks good, approve the proposal below and we will send over the detailed quotation
                  and partnership agreement. If you would like to talk through anything first, just send us your questions.
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
                  {!slug && !err && (
                    <p className="text-white/40 text-[12px]">This proposal link isn't active yet. If you need to approve now, just reply to your email.</p>
                  )}
                </div>

                <div className="flex flex-wrap gap-4 mt-5">
                  <button onClick={approve} disabled={busy || !name.trim() || !agreed || !slug}
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
