import { useEffect, useRef, useState } from 'react';
import Hero from './components/Hero';
import StickyNav from './components/StickyNav';
import HighlightTiles from './components/HighlightTiles';
import ClientMarquee from './components/ClientMarquee';
import AboutTeaser from './components/AboutTeaser';
import StatsRow from './components/StatsRow';
import Footer from './components/Footer';
import { useSEO } from '../../hooks/useSEO';

export default function HomePage() {
  useSEO({
    title: 'Huna Creatives — Premium Creative Agency in Cebu, Philippines',
    description:
      'Strategy-led branding, social media content creation, and visual design for growth-focused brands. Based in Cebu, Philippines — serving clients globally.',
    canonical: '/',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      '@id': 'https://www.hunacreatives.com/#webpage',
      url: 'https://www.hunacreatives.com',
      name: 'Huna Creatives — Premium Creative Agency in Cebu, Philippines',
      isPartOf: { '@id': 'https://www.hunacreatives.com/#website' },
      about: { '@id': 'https://www.hunacreatives.com/#organization' },
    },
  });

  const [pastHero, setPastHero] = useState(false);
  const heroSentinelRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  // The hero now carries its own embedded nav (it scrolls away with the
  // card), so the slim sticky nav only needs to fade in once that sentinel —
  // placed right after the hero — has scrolled above the viewport.
  useEffect(() => {
    const handleScroll = () => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        const el = heroSentinelRef.current;
        if (el) {
          setPastHero(el.getBoundingClientRect().top <= 0);
        }
        rafRef.current = null;
      });
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <StickyNav visible={pastHero} />

      {/* White-background zone — now includes the hero's own margin, so the
          decorative color field is one continuous flow from the very top of
          the page down through the Sentro OS tile, not a separate patch.
          A single overflow-hidden here (not split x/hidden y/auto) is what
          lets the orbs actually bleed into the hero's padding correctly. */}
      <div className="relative overflow-hidden bg-[#F5F5F5]">
        {/* Decorative blurred color fields — give the glass cards' backdrop-blur
            something visually busy to blur (blurring a flat bg is a no-op),
            gently animated so they read as ambient rather than static */}
        <div
          className="pointer-events-none absolute top-[-15%] -left-[15%] w-[900px] h-[900px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(230,84,22,0.16), transparent 72%)',
            filter: 'blur(70px)',
            animation: 'orb-float-a 22s ease-in-out infinite',
          }}
        />
        <div
          className="pointer-events-none absolute top-[6%] -right-[15%] w-[820px] h-[820px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(160,201,203,0.4), transparent 72%)',
            filter: 'blur(70px)',
            animation: 'orb-float-b 26s ease-in-out infinite',
          }}
        />
        <div
          className="pointer-events-none absolute top-[28%] left-[38%] w-[620px] h-[620px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(216,214,201,0.5), transparent 72%)',
            filter: 'blur(70px)',
            animation: 'orb-float-c 20s ease-in-out infinite',
          }}
        />
        <div
          className="pointer-events-none absolute top-[48%] -left-[10%] w-[760px] h-[760px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(45,90,93,0.4), transparent 72%)',
            filter: 'blur(70px)',
            animation: 'orb-float-c 24s ease-in-out infinite',
          }}
        />
        <div
          className="pointer-events-none absolute top-[68%] right-[5%] w-[900px] h-[900px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(240,107,51,0.18), transparent 72%)',
            filter: 'blur(70px)',
            animation: 'orb-float-d 28s ease-in-out infinite',
          }}
        />
        <div
          className="pointer-events-none absolute top-[80%] left-[8%] w-[560px] h-[560px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(45,90,93,0.32), transparent 72%)',
            filter: 'blur(70px)',
            animation: 'orb-float-b 23s ease-in-out infinite',
          }}
        />
        <div
          className="pointer-events-none absolute top-[92%] left-1/3 w-[850px] h-[850px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(160,201,203,0.34), transparent 72%)',
            filter: 'blur(70px)',
            animation: 'orb-float-a 25s ease-in-out infinite',
          }}
        />
        {/* Fixed-pixel (not %) orbs just for the hero's own margin band, since
            the hero is always ~900px regardless of how tall the rest of the
            page grows — a % position here would drift off target as content
            below changes. */}
        <div
          className="pointer-events-none absolute top-0 -left-[10%] w-[560px] h-[560px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(230,84,22,0.18), transparent 72%)',
            filter: 'blur(70px)',
            animation: 'orb-float-a 22s ease-in-out infinite',
          }}
        />
        <div
          className="pointer-events-none absolute top-[520px] -right-[10%] w-[560px] h-[560px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(160,201,203,0.4), transparent 72%)',
            filter: 'blur(70px)',
            animation: 'orb-float-b 26s ease-in-out infinite',
          }}
        />

        <Hero />
        <div ref={heroSentinelRef} />

        <ClientMarquee />
        <AboutTeaser />
        <StatsRow />
        <HighlightTiles />

        {/* ── Sentro OS mini section ── */}
        <section className="relative py-16 sm:py-20 px-4 sm:px-6 lg:px-8">
        <div
          className="relative max-w-6xl mx-auto rounded-3xl p-8 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left"
          style={{
            background: 'rgba(255,255,255,0.45)',
            backdropFilter: 'blur(20px) saturate(160%)',
            WebkitBackdropFilter: 'blur(20px) saturate(160%)',
            border: '1px solid rgba(255,255,255,0.6)',
            boxShadow: '0 8px 32px rgba(48,50,54,0.08), inset 0 1px 0 rgba(255,255,255,0.5)',
          }}
        >
          <div>
            <p className="text-[10px] font-semibold tracking-[0.3em] uppercase text-[#E65416] mb-3">
              Sentro OS
            </p>
            <h3 className="font-display text-lg sm:text-xl font-bold text-[#303236] mb-1.5">
              Need an internal ops hub for your team?
            </h3>
            <p className="text-[#303236]/60 text-sm">
              We built one — attendance, payroll, docs &amp; more.
            </p>
          </div>
          <a
            href="/sentro"
            className="shrink-0 inline-flex items-center gap-2 px-6 py-3 rounded-full text-xs font-semibold tracking-widest uppercase text-white whitespace-nowrap transition-transform duration-300 hover:scale-105"
            style={{ background: 'linear-gradient(135deg, #E65416, #F06B33)' }}
          >
            See Sentro OS <i className="ri-arrow-right-line" />
          </a>
        </div>
        </section>
      </div>

      {/* Footer */}
      <Footer isDark />
    </div>
  );
}
