import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

interface ProposalSection {
  heading: string;
  body: string;
}

interface Proposal {
  id: number;
  slug: string;
  client_name: string;
  project_title: string | null;
  tagline: string | null;
  accent_color: string;
  sections: ProposalSection[];
  status: 'draft' | 'published' | 'sent';
  sent_at: string | null;
  created_at: string;
}

const CALENDLY = 'https://calendly.com/hunacreatives/30min';

export default function ProposalPage() {
  const { slug } = useParams<{ slug: string }>();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data, error } = await supabase
        .from('hub_proposals')
        // Explicit column list, not '*': anon has to_email and submission_id
        // revoked, and a column-level REVOKE makes select('*') fail outright
        // rather than quietly omitting the column.
        .select('id, slug, client_name, project_title, tagline, accent_color, sections, status, sent_at, created_at')
        .eq('slug', slug)
        .in('status', ['published', 'sent'])
        .single();
      if (error || !data) {
        setNotFound(true);
      } else {
        setProposal(data as Proposal);
      }
      setLoading(false);
    })();
  }, [slug]);

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
                {section.body.split('\n\n').map((para, j) => (
                  para.trim() ? (
                    <p key={j} className="text-gray-600 text-[15px] leading-[1.85] mb-4 last:mb-0">
                      {para.trim()}
                    </p>
                  ) : null
                ))}
              </div>
            </div>
          </div>
        </section>
      ))}

      {/* ── CTA ── */}
      <section className="bg-[#0d0d0d]">
        <div className="h-[3px]" style={{ background: accent }} />
        <div className="max-w-5xl mx-auto px-8 py-20 sm:py-24">
          <div className="max-w-xl">
            <p className="text-white/30 text-xs tracking-[0.16em] uppercase mb-4">Next Step</p>
            <h2 className="font-serif text-4xl sm:text-5xl text-white leading-tight mb-6"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
              Ready to begin?
            </h2>
            <p className="text-white/50 text-[15px] leading-relaxed mb-10">
              Let's set up a short call to walk through this together and make sure everything is right before we start.
            </p>
            <div className="flex flex-wrap gap-4">
              <a
                href={CALENDLY}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-7 py-3.5 text-white text-sm font-semibold rounded-sm transition-opacity hover:opacity-80"
                style={{ background: accent }}
              >
                Book a Discovery Call
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 7h10M7 2l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </a>
              <a
                href="mailto:contact@hunacreatives.com"
                className="inline-flex items-center gap-2 px-7 py-3.5 text-white/60 text-sm font-medium border border-white/10 rounded-sm hover:border-white/25 transition-colors"
              >
                Reply by email
              </a>
            </div>
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
