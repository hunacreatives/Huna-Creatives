import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

import Navigation from '../../components/feature/Navigation';
import Footer from '../home/components/Footer';
import { useSEO } from '../../hooks/useSEO';

type HeroCard = { image: string; title: string; description: string; category: string };

// The two-row marquee from the pre-redesign Services page — mostly real
// project thumbnails (services-work-01..31) plus the couple of actual client
// logos mixed in, all force-silhouetted white via CSS filter. Revived as-is
// on the portfolio page, same 38-image list and split.
const marqueeImages = [
  '/images/services-work-06.webp', '/images/services-work-05.webp', '/images/services-work-13.webp',
  '/images/services-work-11.webp', '/images/services-work-18.webp', '/images/services-work-17.webp',
  '/images/services-work-03.webp', '/images/portfolio-bcn-logo.webp', '/images/services-work-07.webp',
  '/images/services-work-02.webp', '/images/services-work-15.webp', '/images/services-work-26.webp',
  '/images/services-work-19.webp', '/images/services-work-04.webp', '/images/services-work-16.webp',
  '/images/services-work-12.webp', '/images/services-work-25.webp', '/images/services-work-22.webp',
  '/images/services-work-21.webp',
  '/images/services-work-10.webp', '/images/services-eq-client-logos.webp', '/images/services-work-09.webp',
  '/images/services-work-24.webp', '/images/services-work-08.webp', '/images/services-work-20.webp',
  '/images/services-work-30.webp', '/images/services-work-28.webp', '/images/services-work-29.webp',
  '/images/services-work-23.webp', '/images/services-work-01.webp', '/images/services-work-31.webp',
  '/images/services-work-14.webp', '/images/services-work-27.webp',
  '/images/7cc3752b-d99d-44c5-b528-340062dfaddc_33.png', '/images/bc0af254-98a5-47c0-8504-369f3554baf0_34.png',
  '/images/19064e88-64f6-4f3d-9ecb-9677e272b2e5_35.png', '/images/94eee4df-d1ec-49f3-b994-88b8523ef8f5_36.png',
  '/images/2259484d-46f9-4ca6-9da7-2fb0fffd26ca_37.png',
]
  // these 3 silhouette as plain black circles (round mockup/sticker artwork,
  // not a distinguishable logo shape) — strip them rather than show noise
  .filter((src) => !['/images/services-work-06.webp', '/images/services-work-16.webp', '/images/services-work-27.webp'].includes(src));
const half = Math.ceil(marqueeImages.length / 2);
const marqueeRow1 = marqueeImages.slice(0, half);
const marqueeRow2 = marqueeImages.slice(half);

function LogoMarquee() {
  return (
    <section className="relative py-10 sm:py-12 overflow-hidden">
      <div className="flex flex-col gap-4">
        <div className="overflow-hidden">
          <div className="flex w-max marquee-left">
            {[...marqueeRow1, ...marqueeRow1].map((src, i) => (
              <div key={i} className="flex items-center justify-center mx-5 shrink-0 w-24 h-16 cursor-pointer">
                <img
                  src={src}
                  alt="Client brand logo"
                  loading="lazy"
                  className="w-full h-full object-contain opacity-50 hover:opacity-90 transition-opacity duration-300"
                  style={{ filter: 'brightness(0)' }}
                />
              </div>
            ))}
          </div>
        </div>
        <div className="overflow-hidden">
          <div className="flex w-max marquee-right">
            {[...marqueeRow2, ...marqueeRow2].map((src, i) => (
              <div key={i} className="flex items-center justify-center mx-5 shrink-0 w-24 h-16 cursor-pointer">
                <img
                  src={src}
                  alt={`Brand logo ${i + 20}`}
                  loading="lazy"
                  className="w-full h-full object-contain opacity-50 hover:opacity-90 transition-opacity duration-300"
                  style={{ filter: 'brightness(0)' }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes marquee-left {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes marquee-right {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
        .marquee-left { animation: marquee-left 30s linear infinite; will-change: transform; }
        .marquee-right { animation: marquee-right 30s linear infinite; will-change: transform; }
      `}</style>
    </section>
  );
}

const heroCards: HeroCard[] = [
  { image: '/images/686a4b13770b0b212e743808c854259d.png', title: 'Brand Design', description: 'Crafting identities that resonate with your audience.', category: 'branding' },
  { image: '/images/portfolio-bcn-social-1.webp', title: 'Social Media', description: 'Scroll-stopping content that builds community and drives engagement.', category: 'social-media' },
  { image: '/images/203f7572a12f03a6a55d3a97977e399c.png', title: 'Graphic Design', description: 'Photos, videos, and copy crafted to tell your brand story.', category: 'graphic-design' },
  { image: '/images/0786ff49839456d59f84f19d66a7f551.png', title: 'Email Marketing', description: 'Campaigns crafted to convert, from subject line to send.', category: 'email-marketing' },
  { image: '/images/171bfd1b-938b-4646-820a-d40659dd77d6_Screenshot-2026-03-27-at-12.53.20AM.png', title: 'Web Development', description: 'High-performance websites built with cutting-edge frameworks.', category: 'web-design' },
];

// Coverflow-style carousel: the active card sits centered and upright, side
// cards recede in a 3D perspective. Cards are absolutely stacked and offset
// by index distance from `active`, so clicking a side card or the arrows
// just moves `active` and every card's transform re-derives from that.
// Clicking the already-active card navigates to its portfolio category.
function HeroCardCarousel({ cards }: { cards: HeroCard[] }) {
  const navigate = useNavigate();
  const [active, setActive] = useState(Math.min(2, cards.length - 1));
  const len = cards.length;
  const go = (dir: number) => setActive((a) => (a + dir + len) % len);

  return (
    <div className="relative px-4 pt-10 pb-4 sm:pt-14">
      {/* Desktop / tablet — 3D coverflow */}
      <div className="hidden sm:block relative max-w-5xl mx-auto">
        <button
          onClick={() => go(-1)}
          aria-label="Previous"
          className="absolute left-0 sm:-left-4 top-1/2 -translate-y-1/2 z-20 shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-[#243037]/60 hover:text-[#243037] bg-white/80 hover:bg-white border border-[#243037]/10 backdrop-blur-sm shadow-md transition-colors cursor-pointer"
        >
          <i className="ri-arrow-left-s-line text-xl" />
        </button>

        <div className="relative w-full" style={{ height: 'clamp(300px, 46vh, 520px)', perspective: '1800px' }}>
          {cards.map((card, i) => {
            let offset = i - active;
            if (offset > len / 2) offset -= len;
            if (offset < -len / 2) offset += len;
            const abs = Math.abs(offset);
            const visible = abs <= 2;
            const isActive = offset === 0;
            return (
              <button
                key={card.title}
                onClick={() => (isActive ? navigate(`/portfolio/${card.category}`) : setActive(i))}
                className="absolute top-1/2 left-1/2 rounded-2xl overflow-hidden text-left cursor-pointer"
                style={{
                  width: 'clamp(190px, 24vw, 320px)',
                  height: isActive ? 'clamp(300px, 46vh, 520px)' : 'clamp(266px, 41vh, 460px)',
                  transform: `translate(-50%, -50%) translateX(${offset * 15}vw) rotateY(${offset * -20}deg) scale(${isActive ? 1 : abs === 1 ? 0.88 : 0.76})`,
                  opacity: visible ? (isActive ? 1 : abs === 1 ? 0.55 : 0.25) : 0,
                  zIndex: 10 - abs,
                  pointerEvents: visible ? 'auto' : 'none',
                  transition: 'transform 0.5s cubic-bezier(0.22,1,0.36,1), opacity 0.5s ease, height 0.5s ease, width 0.5s ease',
                  boxShadow: isActive ? '0 24px 50px rgba(0,0,0,0.55)' : '0 12px 28px rgba(0,0,0,0.4)',
                }}
              >
                <img src={card.image} alt={card.title} className="absolute inset-0 w-full h-full object-cover" draggable={false} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h3 className="font-display text-white font-bold text-xl mb-1">{card.title}</h3>
                  {isActive && (
                    <>
                      <p className="text-white/60 text-sm leading-relaxed mb-2">{card.description}</p>
                      <span className="inline-flex items-center gap-1 text-sm font-semibold" style={{ color: '#FF8A47' }}>
                        Learn More <i className="ri-arrow-right-line" />
                      </span>
                    </>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => go(1)}
          aria-label="Next"
          className="absolute right-0 sm:-right-4 top-1/2 -translate-y-1/2 z-20 shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-[#243037]/60 hover:text-[#243037] bg-white/80 hover:bg-white border border-[#243037]/10 backdrop-blur-sm shadow-md transition-colors cursor-pointer"
        >
          <i className="ri-arrow-right-s-line text-xl" />
        </button>
      </div>

      {/* Mobile — horizontal snap scroll */}
      <div className="sm:hidden flex gap-3 overflow-x-auto snap-x snap-mandatory pb-1 -mx-4 px-4">
        {cards.map((card) => (
          <button
            key={card.title}
            onClick={() => navigate(`/portfolio/${card.category}`)}
            className="relative shrink-0 w-[78vw] h-[340px] rounded-2xl overflow-hidden snap-center text-left cursor-pointer"
          >
            <img src={card.image} alt={card.title} className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <h3 className="font-display text-white font-bold text-base mb-1">{card.title}</h3>
              <p className="text-white/70 text-xs leading-relaxed">{card.description}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Dots */}
      <div className="flex items-center justify-center gap-1.5 mt-6">
        {cards.map((_, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            aria-label={`Go to slide ${i + 1}`}
            className="h-1.5 rounded-full transition-all cursor-pointer"
            style={{ width: i === active ? 18 : 6, background: i === active ? '#FF5B05' : 'rgba(36,48,55,0.18)' }}
          />
        ))}
      </div>
    </div>
  );
}

export default function PortfolioPage() {
  useSEO({
    title: 'Portfolio — Brand Identity, Social Media & Design Work',
    description:
      'Explore Huna Creatives\' portfolio across branding, graphic design, social media content, email marketing, and web design. 38+ brands built across Cebu and beyond.',
    canonical: '/portfolio',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      '@id': 'https://www.hunacreatives.com/portfolio/#webpage',
      url: 'https://www.hunacreatives.com/portfolio',
      name: 'Huna Creatives Portfolio',
      description: 'Brand identity, social media, email marketing, and web design work by Huna Creatives.',
      isPartOf: { '@id': 'https://www.hunacreatives.com/#website' },
    },
  });

  const cursorGlowRef = useRef<HTMLDivElement>(null); // kept ref to avoid JSX error on hidden div

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div
      className="min-h-screen bg-[#F5F5F5] font-body overflow-x-hidden"
    >
      {/* Cursor glow removed */}
      <div
        ref={cursorGlowRef}
        className="hidden"
        style={{
          width: '500px',
          height: '500px',
          opacity: 0,
          background: 'radial-gradient(circle, rgba(249,115,22,0.07) 0%, transparent 70%)',
          filter: 'blur(50px)',
          transition: 'opacity 0.2s ease',
          willChange: 'left, top',
        }}
      />

      <Navigation invertOnScroll />

      {/* ═══════════════════ HERO — COVERFLOW CARD CAROUSEL ═══════════════════ */}
      <section className="relative pt-24 sm:pt-28 pb-6 md:pb-10 px-4 md:px-6 overflow-hidden">
        <div className="max-w-6xl mx-auto mb-10">
          <HeroCardCarousel cards={heroCards} />
        </div>

        {/* Center content — a normal block below the carousel, never overlapping it */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7 }}
          className="max-w-lg mx-auto text-center"
        >
          <h1 className="font-display text-2xl md:text-3xl lg:text-4xl font-bold text-[#243037] leading-tight mb-3 text-balance">
            Let&apos;s create something<span className="hidden sm:inline"><br /></span> exceptional.
          </h1>
          <p className="text-[#243037]/60 text-[15px] sm:text-sm leading-relaxed mb-7 max-w-sm mx-auto text-pretty">
            Let&apos;s collaborate to build a bold brand or a seamless digital experience. Get in touch!
          </p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
            <Link
              to="/contact"
              className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-7 py-3.5 rounded-full text-[13px] sm:text-xs font-semibold tracking-wide text-white whitespace-nowrap cursor-pointer transition-transform duration-300 hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #FF5B05, #FF8A47)', boxShadow: '0 8px 24px rgba(255,91,5,0.3)' }}
            >
              Start a Project
              <i className="ri-arrow-right-line" />
            </Link>
            <Link
              to="/services"
              className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-7 py-3.5 rounded-full text-[13px] sm:text-xs font-semibold tracking-wide text-[#243037]/70 whitespace-nowrap cursor-pointer border border-[#243037]/15 hover:bg-[#243037]/5 hover:text-[#243037] transition-colors duration-300"
            >
              View Services
            </Link>
          </div>
        </motion.div>
      </section>

      <LogoMarquee />

      {/* ═══════════════════ TESTIMONIALS ═══════════════════ */}
      <section className="relative py-16 md:py-24 px-4 md:px-6 bg-white/50">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.7 }} className="max-w-lg mx-auto md:mx-0 mb-10 md:mb-14 text-center md:text-left">
            <h2 className="font-display text-2xl md:text-3xl lg:text-4xl font-bold text-[#243037] leading-tight mb-3 text-balance">
              Trusted by brands,<span className="hidden sm:inline"><br /></span> loved by clients.
            </h2>
            <p className="text-[#243037]/60 text-[15px] sm:text-sm leading-relaxed text-pretty">
              Great design goes beyond aesthetics — it creates impact. Hear from clients who&apos;ve experienced it firsthand.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              { quote: "Huna Creatives didn't just design a logo — they gave The Second Haus a soul. Every detail, from the color palette to the hang tags, feels like it was made with so much care. I couldn't be happier.", author: 'Angelica L.', role: 'Founder, The Second Haus', accent: '#FF5B05' },
              { quote: "I've worked with a lot of agencies and no one has come close to what Huna Creatives delivered. They understood the prestige of the equestrian world immediately and created content that truly speaks to our buyers.", author: 'Beata W.', role: 'Equestrian International', accent: '#075056' },
              { quote: 'Our social media presence completely transformed. Engagement went up and our feed finally looks as premium as our product. The team is responsive, creative, and genuinely invested.', author: 'Victor R.', role: 'Blue Collar Nutrition', accent: '#243037' },
            ].map((t) => (
              <div
                key={t.author}
                className="rounded-2xl p-6"
                style={{ background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(20px) saturate(160%)', WebkitBackdropFilter: 'blur(20px) saturate(160%)', border: '1px solid rgba(255,255,255,0.6)', boxShadow: '0 8px 32px rgba(36,48,55,0.08)' }}
              >
                <div className="flex gap-0.5 mb-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <i key={i} className="ri-star-fill text-xs" style={{ color: t.accent }} />
                  ))}
                </div>
                <p className="text-[#243037]/70 text-[13px] sm:text-xs leading-relaxed mb-5">&ldquo;{t.quote}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: t.accent }}>
                    {t.author.charAt(0)}
                  </div>
                  <div>
                    <div className="text-[13px] sm:text-xs font-bold text-[#243037]">{t.author}</div>
                    <div className="text-[11px] sm:text-[10px] text-[#243037]/50">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ FEATURED PROJECTS ═══════════════════ */}
      {[
        {
          image: '/images/99c59eb0-4815-4d7a-866a-f56d3e927d63_FS-Homepage.png',
          eyebrow: 'Web Design & Branding',
          client: 'FS Architects',
          headline: 'A digital front door as considered as the buildings behind it.',
          body: 'FS Architects needed a website that could win commercial bids before the first phone call. We built the identity and site from the ground up — clean, confident, and structured the way an architect structures a floor plan.',
          tags: ['Web Design', 'Branding', 'Architecture'],
          cta: 'Explore Web Design',
          to: '/portfolio/web-design',
          reverse: false,
        },
        {
          image: '/images/peak-coffee-pcr-1.webp',
          eyebrow: 'Branding & Identity',
          client: 'Peak Coffee Roasters',
          headline: 'Bold enough to command attention, disciplined enough to earn it.',
          body: "Every detail needed to feel intentional — from the PCR mark to bean bags, cups, menus, and laser-cut signage. We built a complete identity system that reads as bold and minimal at every scale, for a brand that treats coffee like a craft.",
          tags: ['Logo Design', 'Packaging Design', 'Signage'],
          cta: 'View Case Study',
          to: '/portfolio/project/peak-coffee-roasters',
          reverse: true,
        },
      ].map((project) => (
        <section key={project.client} className="relative py-16 md:py-24 px-4 md:px-6">
          <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 md:gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.7 }}
              className={`relative h-72 md:h-[420px] rounded-3xl overflow-hidden ${project.reverse ? 'md:order-2' : ''}`}
              style={{ boxShadow: '0 20px 60px rgba(36,48,55,0.15)' }}
            >
              <img src={project.image} alt={project.client} className="absolute inset-0 w-full h-full object-cover object-top" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="text-center md:text-left"
            >
              <span className="inline-block text-[10px] font-semibold tracking-[0.25em] uppercase text-[#075056] mb-3">
                {project.eyebrow} — {project.client}
              </span>
              <h2 className="font-display text-2xl md:text-3xl lg:text-4xl font-bold text-[#243037] leading-tight mb-4 text-balance">
                {project.headline}
              </h2>
              <p className="text-[#243037]/60 text-[15px] sm:text-sm leading-relaxed mb-6 max-w-md mx-auto md:mx-0 text-pretty">{project.body}</p>
              <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-8">
                {project.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] font-semibold tracking-wide uppercase px-3 py-1.5 rounded-full"
                    style={{ color: '#075056', background: 'rgba(7,80,86,0.1)' }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <Link
                to={project.to}
                className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-7 py-3.5 rounded-full text-[13px] sm:text-xs font-semibold tracking-wide text-white whitespace-nowrap cursor-pointer transition-transform duration-300 hover:scale-105"
                style={{ background: 'linear-gradient(135deg, #FF5B05, #FF8A47)', boxShadow: '0 8px 24px rgba(255,91,5,0.3)' }}
              >
                {project.cta}
                <i className="ri-arrow-right-line" />
              </Link>
            </motion.div>
          </div>
        </section>
      ))}

      {/* ═══════════════════ OUR PROCESS — full-bleed winding road ═══════════════════ */}
      <section className="relative py-16 md:py-24 bg-white/50 overflow-hidden">
        {/* Heading stays inside the normal content gutter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7 }}
          className="max-w-6xl mx-auto px-4 md:px-6 mb-10 md:mb-4 text-center md:text-left"
        >
          <span className="inline-block text-[10px] font-semibold tracking-[0.25em] uppercase text-[#075056] mb-3">
            Our Process
          </span>
          <h2 className="font-display text-2xl md:text-3xl lg:text-4xl font-bold text-[#243037] leading-tight mb-3 text-balance">
            How a brief becomes a brand.
          </h2>
          <p className="text-[#243037]/60 text-[15px] sm:text-sm leading-relaxed max-w-lg mx-auto md:mx-0 text-pretty">
            Every project moves through the same four stages — kept simple on purpose, so nothing gets lost between idea and delivery.
          </p>
        </motion.div>

        {(() => {
          // Pins sit on the road's cubic-segment endpoints, so their coordinates are
          // exact points on the path rather than eyeballed guesses. viewBox is 100x60
          // and the wrapper is the full viewport width, so `left: x%` / `top: (y/60)%`
          // land a pin precisely on the curve at any screen size.
          const accent = '#FF5B05';
          const steps = [
            { num: '01', title: 'Discover', desc: 'We dig into your brand, your audience, and what you are actually trying to achieve — so everything that follows is built on something real.', icon: 'ri-search-eye-line', x: 8, y: 44, place: 'below' as const, tx: '-10%' },
            { num: '02', title: 'Strategize', desc: 'We map the creative direction: the visual language, the messaging, the channels, and exactly what gets delivered and when.', icon: 'ri-route-line', x: 36, y: 18, place: 'above' as const, tx: '-50%' },
            { num: '03', title: 'Create', desc: 'We design, iterate, and refine — through real revision rounds, not guesswork — until every piece feels unmistakably yours.', icon: 'ri-pencil-ruler-2-line', x: 64, y: 44, place: 'below' as const, tx: '-50%' },
            // Deliver is anchored to the right gutter instead of to its pin, so its
            // copy can never run off the edge of the screen no matter the viewport.
            { num: '04', title: 'Deliver', desc: 'We hand off every final asset, organised and ready to use, then stay close through launch and whatever comes after it.', icon: 'ri-rocket-2-line', x: 88, y: 18, place: 'above' as const, tx: '-50%', anchorRight: true },
          ];
          const road = 'M-4,44 L8,44 C22,44 22,18 36,18 C50,18 50,44 64,44 C76,44 76,18 88,18 L104,18';

          return (
            <>
              {/* Desktop — road runs edge to edge, exiting both sides of the screen */}
              <div className="hidden md:block relative w-full h-[480px] lg:h-[540px]">
                <svg viewBox="0 0 100 60" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
                  {/* drop shadow under the road */}
                  <path d={road} fill="none" stroke="rgba(36,48,55,0.13)" strokeWidth="46" strokeLinecap="butt" vectorEffect="non-scaling-stroke" transform="translate(0,1.2)" />
                  {/* road surface */}
                  <path d={road} fill="none" stroke="#ffffff" strokeWidth="42" strokeLinecap="butt" vectorEffect="non-scaling-stroke" />
                  {/* dashed centre line */}
                  <path d={road} fill="none" stroke="#243037" strokeWidth="2" strokeDasharray="10 14" strokeLinecap="round" vectorEffect="non-scaling-stroke" opacity="0.16" />
                </svg>

                {steps.map((step, i) => (
                  <div key={step.num}>
                    {/* pin — dark head with a coloured core, dropped onto the road */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.4 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true, margin: '-80px' }}
                      transition={{ duration: 0.45, delay: i * 0.12, type: 'spring', stiffness: 220 }}
                      className="absolute rounded-full flex items-center justify-center"
                      style={{
                        left: `${step.x}%`,
                        top: `${(step.y / 60) * 100}%`,
                        transform: 'translate(-50%, -50%)',
                        width: 34,
                        height: 34,
                        background: '#243037',
                        boxShadow: '0 10px 22px rgba(36,48,55,0.35)',
                        zIndex: 10,
                      }}
                    >
                      <span className="rounded-full" style={{ width: 12, height: 12, background: accent }} />
                    </motion.div>

                    {/* label — icon inline with the title to keep the block short, copy beneath */}
                    <motion.div
                      initial={{ opacity: 0, y: step.place === 'below' ? 14 : -14 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: '-80px' }}
                      transition={{ duration: 0.55, delay: i * 0.12 + 0.1 }}
                      className="absolute z-20"
                      style={{
                        left: step.anchorRight ? undefined : `${step.x}%`,
                        right: step.anchorRight ? 24 : undefined,
                        top: step.place === 'below' ? `calc(${(step.y / 60) * 100}% + 40px)` : undefined,
                        bottom: step.place === 'above' ? `calc(${100 - (step.y / 60) * 100}% + 40px)` : undefined,
                        transform: step.anchorRight ? undefined : `translateX(${step.tx})`,
                        width: 260,
                      }}
                    >
                      <div className="flex items-center gap-2.5 mb-2">
                        <i className={`${step.icon} text-xl`} style={{ color: accent }} />
                        <span className="font-display text-base font-bold text-[#243037]">{step.title}</span>
                        <span className="font-display text-base font-bold" style={{ color: accent }}>{step.num}</span>
                      </div>
                      <p className="text-[#243037]/55 text-[13px] sm:text-xs leading-relaxed">{step.desc}</p>
                    </motion.div>
                  </div>
                ))}
              </div>

              {/* Mobile — vertical road with the same pins */}
              <div className="md:hidden relative px-4 mt-2">
                <div className="absolute left-[26px] top-0 bottom-0 w-[34px] rounded-full bg-white" style={{ boxShadow: '0 6px 18px rgba(36,48,55,0.13)' }} />
                <div className="absolute left-[42px] top-2 bottom-2 w-[2px]" style={{ background: 'repeating-linear-gradient(180deg, #243037 0 8px, transparent 8px 20px)', opacity: 0.16 }} />
                <div className="relative flex flex-col gap-9 pl-[76px] py-4">
                  {steps.map((step, i) => (
                    <motion.div
                      key={step.num}
                      initial={{ opacity: 0, x: 12 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true, margin: '-60px' }}
                      transition={{ duration: 0.5, delay: i * 0.08 }}
                      className="relative"
                    >
                      <div
                        className="absolute -left-[60px] top-1 w-[30px] h-[30px] rounded-full flex items-center justify-center"
                        style={{ background: '#243037', boxShadow: '0 8px 18px rgba(36,48,55,0.3)' }}
                      >
                        <span className="rounded-full" style={{ width: 11, height: 11, background: accent }} />
                      </div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <i className={`${step.icon} text-lg`} style={{ color: accent }} />
                        <span className="font-display text-sm font-bold text-[#243037]">{step.title}</span>
                        <span className="font-display text-sm font-bold" style={{ color: accent }}>{step.num}</span>
                      </div>
                      <p className="text-[#243037]/55 text-[13px] sm:text-xs leading-relaxed">{step.desc}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </>
          );
        })()}
      </section>

      <Footer />
    </div>
  );
}
