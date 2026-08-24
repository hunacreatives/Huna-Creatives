import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import {
  computeQuoteTotals, formatQuoteCurrency, formatQuoteDate, lineTotal, isQuoteExpired,
  type QuoteCurrency, type QuoteLineItem, type QuotePaymentMilestone,
  type ProposalDocType, type ProposalStatus,
} from '@/lib/quotation';

interface ProposalSection {
  heading: string;
  body: string;
}

interface Proposal {
  id: number;
  slug: string;
  doc_type: ProposalDocType;
  client_name: string;
  project_title: string | null;
  tagline: string | null;
  accent_color: string;
  sections: ProposalSection[];
  line_items: QuoteLineItem[];
  currency: QuoteCurrency;
  discount: number | string;
  tax_rate: number | string;
  valid_until: string | null;
  terms: string | null;
  payment_schedule: QuotePaymentMilestone[];
  status: ProposalStatus;
  sent_at: string | null;
  accepted_at: string | null;
  accepted_by_name: string | null;
  created_at: string;
}

const CALENDLY = 'https://calendly.com/hunacreatives/30min';

export default function ProposalPage() {
  const { slug } = useParams<{ slug: string }>();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Acceptance
  const [signerName, setSignerName] = useState('');
  const [acceptNote, setAcceptNote] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState('');
  const [decided, setDecided] = useState<'accepted' | 'declined' | null>(null);
  const [showDecline, setShowDecline] = useState(false);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data, error } = await supabase
        .from('hub_proposals')
        // Explicit column list, not '*': anon has to_email and submission_id
        // revoked, and a column-level REVOKE makes select('*') fail outright
        // rather than quietly omitting the column.
        // One literal, not a concatenation: supabase-js infers the row type from
        // the string literal, and `a + b` widens it to `string` and loses that.
        .select('id, slug, doc_type, client_name, project_title, tagline, accent_color, sections, line_items, currency, discount, tax_rate, valid_until, terms, payment_schedule, status, sent_at, accepted_at, accepted_by_name, created_at')
        .eq('slug', slug)
        .in('status', ['published', 'sent', 'viewed', 'accepted', 'declined'])
        .single();
      if (error || !data) {
        setNotFound(true);
      } else {
        setProposal(data as Proposal);
      }
      setLoading(false);
    })();
  }, [slug]);

  // Mark as viewed once, the first time the client opens the link. Best-effort
  // signal for the inbox -- a failure here must never surface to the client.
  const viewMarked = useRef(false);
  useEffect(() => {
    if (!proposal || viewMarked.current) return;
    if (proposal.status !== 'sent') return;
    viewMarked.current = true;
    supabase
      .from('hub_proposals')
      .update({ status: 'viewed', viewed_at: new Date().toISOString() })
      .eq('id', proposal.id)
      .eq('status', 'sent')
      .then(() => {}, () => {});
  }, [proposal]);

  // Deep link from the email's Accept button.
  useEffect(() => {
    if (proposal && window.location.hash === '#accept') {
      document.getElementById('accept')?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [proposal]);

  const submitDecision = async (decision: 'accepted' | 'declined') => {
    if (!proposal || !signerName.trim()) return;
    setAccepting(true);
    setAcceptError('');
    try {
      const { data, error } = await supabase.functions.invoke('accept-quotation', {
        body: {
          slug: proposal.slug,
          accepted_by_name: signerName.trim(),
          note: acceptNote.trim() || null,
          decision,
        },
      });
      if (error || data?.error) throw new Error(data?.error ?? error?.message ?? 'Something went wrong.');
      setDecided(decision);
    } catch (e) {
      setAcceptError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !proposal) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-white/20 text-xs tracking-[0.2em] uppercase mb-4">Huna Creatives</p>
          <p className="text-white/50 text-sm">This proposal is not available.</p>
        </div>
      </div>
    );
  }

  const accent = proposal.accent_color;
  const date = new Date(proposal.created_at).toLocaleDateString('en-US', {
    month: 'long', year: 'numeric',
  });

  const isQuote = proposal.doc_type === 'quotation';
  const currency: QuoteCurrency = proposal.currency === 'USD' ? 'USD' : 'PHP';
  const money = (n: number) => formatQuoteCurrency(n, currency);
  const totals = computeQuoteTotals(proposal.line_items ?? [], proposal.discount ?? 0, proposal.tax_rate ?? 0);
  const expired = isQuoteExpired(proposal.valid_until);
  // Server state wins on reload; `decided` covers the same session pre-refetch.
  const settled = decided ?? (proposal.status === 'accepted' ? 'accepted'
    : proposal.status === 'declined' ? 'declined' : null);
  const canDecide = isQuote && !settled && !expired;

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* ── Hero ── */}
      <section className="relative bg-[#0d0d0d] overflow-hidden">
        {/* Subtle texture */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />

        {/* Top bar */}
        <div className="relative z-10 flex items-center justify-between px-8 pt-8 pb-0 max-w-5xl mx-auto">
          <img
            src="https://hunacreatives.com/images/fc04818c74ad69bdfb22b93a6a0c6a72.png"
            alt="Huna Creatives"
            className="h-6 opacity-90"
          />
          <span className="text-[10px] font-bold tracking-[0.22em] uppercase px-3 py-1.5 rounded-sm border"
            style={{ color: accent, borderColor: `${accent}40`, background: `${accent}12` }}>
            Proposal
          </span>
        </div>

        {/* Hero content */}
        <div className="relative z-10 max-w-5xl mx-auto px-8 pt-16 pb-20">
          <p className="text-white/40 text-xs tracking-[0.16em] uppercase mb-4">
            Prepared for {proposal.client_name}
          </p>
          <h1 className="text-white font-serif text-5xl sm:text-6xl leading-[1.1] mb-4 max-w-2xl"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
            {proposal.project_title || `A Proposal for ${proposal.client_name}`}
          </h1>
          {proposal.tagline && (
            <p className="text-white/50 text-lg mt-4 max-w-xl leading-relaxed">
              {proposal.tagline}
            </p>
          )}
          <div className="flex items-center gap-6 mt-10">
            <span className="text-white/30 text-xs tracking-wider">{date}</span>
            <span className="text-white/10">·</span>
            <span className="text-white/30 text-xs tracking-wider">Huna Creatives</span>
          </div>
        </div>

        {/* Accent bottom border */}
        <div className="h-[3px]" style={{ background: accent }} />
      </section>

      {/* ── Sections ── */}
      {proposal.sections.map((section, i) => (
        <section
          key={i}
          className={`${i % 2 === 0 ? 'bg-white' : 'bg-[#f7f6f4]'}`}
        >
          <div className="max-w-5xl mx-auto px-8 py-16 sm:py-20">
            <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-8 sm:gap-16 items-start">
              {/* Number + heading */}
              <div className="flex-shrink-0">
                <span className="block text-[11px] font-bold tracking-[0.2em] uppercase mb-2"
                  style={{ color: accent }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h2 className="font-serif text-2xl text-gray-900 leading-tight"
                  style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
                  {section.heading}
                </h2>
              </div>

              {/* Body */}
              <div className="prose prose-gray max-w-none">
                {section.body.split('\n\n').map((block, j) => {
                  const trimmed = block.trim();
                  if (!trimmed) return null;

                  // A block whose every line opens with "- " or "• " is a list.
                  // Without this the lines collapse into one run-on paragraph and
                  // the markers print as literal text.
                  const lines = trimmed.split('\n').map(l => l.trim()).filter(Boolean);
                  const isList = lines.length > 0 && lines.every(l => /^[-•]\s+/.test(l));

                  if (isList) {
                    return (
                      <ul key={j} className="list-disc pl-5 mb-4 last:mb-0 space-y-2">
                        {lines.map((line, k) => (
                          <li key={k} className="text-gray-600 text-[15px] leading-[1.85] pl-1">
                            {line.replace(/^[-•]\s+/, '')}
                          </li>
                        ))}
                      </ul>
                    );
                  }

                  return (
                    <p key={j} className="text-gray-600 text-[15px] leading-[1.85] mb-4 last:mb-0">
                      {trimmed}
                    </p>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      ))}

      {/* ── Investment (quotations only) ── */}
      {isQuote && (proposal.line_items ?? []).length > 0 && (
        <section className="bg-white border-t border-gray-100">
          <div className="max-w-5xl mx-auto px-8 py-16 sm:py-20">
            <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-8 sm:gap-16 items-start">
              <div className="flex-shrink-0">
                <span className="block text-[11px] font-bold tracking-[0.2em] uppercase mb-2" style={{ color: accent }}>
                  Investment
                </span>
                <h2 className="font-serif text-2xl text-gray-900 leading-tight"
                  style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
                  The numbers
                </h2>
              </div>

              <div>
                {/* Line items */}
                <div className="border-b-2 border-gray-900 pb-2 mb-1 flex items-end gap-4">
                  <span className="flex-1 text-[10px] font-bold tracking-[0.16em] uppercase text-gray-400">Item</span>
                  <span className="w-12 text-center text-[10px] font-bold tracking-[0.16em] uppercase text-gray-400">Qty</span>
                  <span className="w-32 text-right text-[10px] font-bold tracking-[0.16em] uppercase text-gray-400">Amount</span>
                </div>

                {(proposal.line_items ?? []).map((item, i) => (
                  <div key={i} className="flex items-start gap-4 py-4 border-b border-gray-100">
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] text-gray-900 leading-snug">{item.description}</p>
                      {item.notes && <p className="text-[13px] text-gray-400 mt-1 leading-relaxed">{item.notes}</p>}
                    </div>
                    <span className="w-12 text-center text-[14px] text-gray-500 tabular-nums">{Number(item.qty ?? 1)}</span>
                    <span className="w-32 text-right text-[15px] text-gray-900 tabular-nums">{money(lineTotal(item))}</span>
                  </div>
                ))}

                {/* Totals */}
                <div className="mt-5 space-y-2">
                  {totals.discount > 0 && (
                    <>
                      <div className="flex justify-end gap-4 text-[14px] text-gray-500">
                        <span>Subtotal</span><span className="w-32 text-right tabular-nums">{money(totals.subtotal)}</span>
                      </div>
                      <div className="flex justify-end gap-4 text-[14px] text-gray-500">
                        <span>Discount</span><span className="w-32 text-right tabular-nums">− {money(totals.discount)}</span>
                      </div>
                    </>
                  )}
                  {Number(proposal.tax_rate) > 0 && (
                    <div className="flex justify-end gap-4 text-[14px] text-gray-500">
                      <span>Tax ({Number(proposal.tax_rate)}%)</span>
                      <span className="w-32 text-right tabular-nums">{money(totals.tax)}</span>
                    </div>
                  )}
                  <div className="flex justify-end items-baseline gap-4 pt-4 border-t-2 border-gray-900">
                    <span className="text-[15px] font-bold text-gray-900">Total</span>
                    <span className="w-32 text-right text-2xl font-bold tabular-nums" style={{ color: accent }}>
                      {money(totals.total)}
                    </span>
                  </div>
                </div>

                {/* Payment schedule */}
                {(proposal.payment_schedule ?? []).length > 0 && (
                  <div className="mt-10">
                    <p className="text-[11px] font-bold tracking-[0.16em] uppercase text-gray-400 mb-3">Payment Schedule</p>
                    {(proposal.payment_schedule ?? []).map((m, i) => (
                      <div key={i} className="flex items-baseline gap-4 py-3 border-b border-gray-100">
                        <span className="flex-1 text-[14px] text-gray-700">
                          {m.label}
                          {m.due && <span className="text-gray-400"> · {m.due}</span>}
                        </span>
                        <span className="w-32 text-right text-[14px] font-medium text-gray-900 tabular-nums">
                          {money(Number(m.amount) || 0)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {(proposal.valid_until || proposal.terms) && (
                  <div className="mt-8 text-[13px] text-gray-400 leading-relaxed space-y-2">
                    {proposal.valid_until && (
                      <p className={expired ? 'text-amber-700' : ''}>
                        {expired ? 'This quotation expired on ' : 'Valid until '}
                        <span className="font-medium text-gray-700">{formatQuoteDate(proposal.valid_until)}</span>
                        {expired && ' — get in touch and we\'ll refresh it for you.'}
                      </p>
                    )}
                    {proposal.terms && <p className="whitespace-pre-wrap">{proposal.terms}</p>}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── CTA ── */}
      <section id="accept" className="bg-[#0d0d0d] scroll-mt-8">
        <div className="h-[3px]" style={{ background: accent }} />
        <div className="max-w-5xl mx-auto px-8 py-20 sm:py-24">
          <div className="max-w-xl">

            {settled === 'accepted' ? (
              <>
                <p className="text-white/30 text-xs tracking-[0.16em] uppercase mb-4">Accepted</p>
                <h2 className="font-serif text-4xl sm:text-5xl text-white leading-tight mb-6"
                  style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
                  Thank you{proposal.accepted_by_name ? `, ${proposal.accepted_by_name.split(' ')[0]}` : ''}.
                </h2>
                <p className="text-white/50 text-[15px] leading-relaxed">
                  We've recorded your acceptance and emailed you a PDF copy for your records.
                  Next, we'll send over the agreement to sign, followed by the first invoice.
                </p>
              </>
            ) : settled === 'declined' ? (
              <>
                <p className="text-white/30 text-xs tracking-[0.16em] uppercase mb-4">Response recorded</p>
                <h2 className="font-serif text-4xl sm:text-5xl text-white leading-tight mb-6"
                  style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
                  Thanks for letting us know.
                </h2>
                <p className="text-white/50 text-[15px] leading-relaxed mb-8">
                  If the scope or budget wasn't quite right, we'd genuinely like to hear why —
                  we can usually find a version that works.
                </p>
                <a href={CALENDLY} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-7 py-3.5 text-white/60 text-sm font-medium border border-white/10 rounded-sm hover:border-white/25 transition-colors">
                  Book a call anyway
                </a>
              </>
            ) : (
              <>
                <p className="text-white/30 text-xs tracking-[0.16em] uppercase mb-4">Next Step</p>
                <h2 className="font-serif text-4xl sm:text-5xl text-white leading-tight mb-6"
                  style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
                  Ready to begin?
                </h2>
                <p className="text-white/50 text-[15px] leading-relaxed mb-10">
                  {canDecide
                    ? "Accept below and we'll send the agreement straight over. Or if you'd rather talk it through first, grab a time that suits you."
                    : "Let's set up a short call to walk through this together and make sure everything is right before we start."}
                </p>

                {canDecide ? (
                  <div className="space-y-5">
                    <div className="bg-white/[0.04] border border-white/10 rounded-sm p-6 space-y-4">
                      <div className="space-y-1.5">
                        <label className="block text-white/40 text-[11px] tracking-[0.14em] uppercase">Your full name</label>
                        <input type="text" value={signerName} onChange={e => setSignerName(e.target.value)}
                          placeholder="Juan dela Cruz"
                          className="w-full bg-transparent border border-white/15 rounded-sm px-4 py-3 text-white text-[15px] placeholder:text-white/20 focus:outline-none focus:border-white/40 transition-colors" />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-white/40 text-[11px] tracking-[0.14em] uppercase">
                          Anything to add? <span className="normal-case tracking-normal text-white/20">(optional)</span>
                        </label>
                        <textarea value={acceptNote} onChange={e => setAcceptNote(e.target.value)} rows={2}
                          placeholder="Questions, timing notes, anything we should know…"
                          className="w-full bg-transparent border border-white/15 rounded-sm px-4 py-3 text-white text-[15px] placeholder:text-white/20 focus:outline-none focus:border-white/40 transition-colors resize-none" />
                      </div>

                      <label className="flex items-start gap-3 cursor-pointer group">
                        <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)}
                          className="mt-1 w-4 h-4 accent-current cursor-pointer flex-shrink-0" style={{ accentColor: accent }} />
                        <span className="text-white/50 text-[13px] leading-relaxed group-hover:text-white/70 transition-colors">
                          I accept this quotation at <span className="text-white font-medium">{money(totals.total)}</span> and
                          understand a formal agreement will follow for signature.
                        </span>
                      </label>

                      {acceptError && (
                        <p className="text-red-300 text-[13px] bg-red-500/10 border border-red-500/20 rounded-sm px-4 py-2.5">
                          {acceptError}
                        </p>
                      )}
                    </div>

                    {/* Two CTAs, equal weight */}
                    <div className="flex flex-wrap gap-4">
                      <button onClick={() => submitDecision('accepted')}
                        disabled={accepting || !signerName.trim() || !agreed}
                        className="inline-flex items-center gap-2 px-7 py-3.5 text-white text-sm font-semibold rounded-sm transition-opacity hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        style={{ background: accent }}>
                        {accepting ? 'Recording…' : 'Accept this quotation'}
                        {!accepting && (
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M2 7h10M7 2l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </button>

                      <a href={CALENDLY} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-7 py-3.5 text-white text-sm font-semibold border border-white/20 rounded-sm hover:border-white/45 hover:bg-white/[0.04] transition-colors">
                        Schedule a meeting
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M2 7h10M7 2l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </a>
                    </div>

                    <button onClick={() => setShowDecline(v => !v)}
                      className="text-white/25 text-[13px] hover:text-white/50 transition-colors cursor-pointer">
                      This isn't right for us
                    </button>

                    {showDecline && (
                      <div className="border-l-2 border-white/10 pl-5 space-y-3">
                        <p className="text-white/40 text-[13px] leading-relaxed">
                          No hard feelings — a quick note on why helps us do better next time.
                        </p>
                        <button onClick={() => submitDecision('declined')}
                          disabled={accepting || !signerName.trim()}
                          className="text-[13px] text-white/50 border border-white/15 rounded-sm px-5 py-2.5 hover:border-white/35 hover:text-white/70 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed">
                          {accepting ? 'Sending…' : 'Decline this quotation'}
                        </button>
                        {!signerName.trim() && (
                          <p className="text-white/20 text-[12px]">Add your name above first.</p>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-4">
                    <a href={CALENDLY} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-7 py-3.5 text-white text-sm font-semibold rounded-sm transition-opacity hover:opacity-80"
                      style={{ background: accent }}>
                      Book a Discovery Call
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M2 7h10M7 2l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </a>
                    <a href="mailto:contact@hunacreatives.com"
                      className="inline-flex items-center gap-2 px-7 py-3.5 text-white/60 text-sm font-medium border border-white/10 rounded-sm hover:border-white/25 transition-colors">
                      Reply by email
                    </a>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-[#0d0d0d] border-t border-white/[0.06] px-8 py-8">
        <div className="max-w-5xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <img
            src="https://hunacreatives.com/images/fc04818c74ad69bdfb22b93a6a0c6a72.png"
            alt="Huna Creatives"
            className="h-5 opacity-40"
          />
          <div className="flex items-center gap-6">
            <span className="text-white/25 text-xs">Cebu City, Philippines</span>
            <a href="mailto:contact@hunacreatives.com"
              className="text-white/25 text-xs hover:text-white/50 transition-colors">
              contact@hunacreatives.com
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
