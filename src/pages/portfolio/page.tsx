import { Link } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

import Navigation from '../../components/feature/Navigation';
import Footer from '../home/components/Footer';
import ProcessTimeline from './components/ProcessTimeline';
import { useSEO } from '../../hooks/useSEO';

const categories = [
  {
    id: 'branding',
    name: 'Branding & Identity',
    shortName: 'Branding',
    description: 'Complete brand systems that tell your story.',
    icon: 'ri-fingerprint-line',
    count: '25+',
    image: '/images/686a4b13770b0b212e743808c854259d.png',
    accent: '#ef4444',
  },
  {
    id: 'graphic-design',
    name: 'Graphic Design',
    shortName: 'Design',
    description: 'Bold visuals that capture attention.',
    icon: 'ri-pen-nib-line',
    count: '18+',
    image: '/images/203f7572a12f03a6a55d3a97977e399c.png',
    accent: '#f97316',
  },
  {
    id: 'social-media',
    name: 'Social Media Marketing',
    shortName: 'Social',
    description: 'Strategic content that builds community.',
    icon: 'ri-bar-chart-grouped-line',
    count: '24+',
    image: '/images/portfolio-bcn-social-1.webp',
    accent: '#fb7185',
  },
  {
    id: 'email-marketing',
    name: 'Email Marketing',
    shortName: 'Email',
    description: 'Campaigns that convert subscribers.',
    icon: 'ri-mail-send-line',
    count: '9+',
    image: '/images/0786ff49839456d59f84f19d66a7f551.png',
    accent: '#fbbf24',
  },
  {
    id: 'web-design',
    name: 'Web Design',
    shortName: 'Web',
    description: 'Sites we designed & built.',
    icon: 'ri-global-line',
    count: '8+',
    image: '/images/171bfd1b-938b-4646-820a-d40659dd77d6_Screenshot-2026-03-27-at-12.53.20AM.png',
    accent: '#c4a882',
  },
];

const clients = [
  'The Cowart Team', 'Mile One', 'Cyberbacker', 'Arlington Abodes',
  'WJD Management', 'MMK Realty', 'The Real Estate Store',
  'Urbana Pediatric Dentistry', 'Traditions Dental', 'Everyone By One',
  'Once Upon a Tooth', 'Hello Kids Dentistry', 'Agape Pediatric Dentistry',
  'Tooth Patrol PD', 'Dirty Soul', 'Capital Energy Training',
  'Randy Huntley Home Selling Team', 'NEP', 'Kei Coffee House',
  'ROL', 'VOX', 'Kei Concepts', 'KIN', 'Blue Collar Nutrition',
  'INI', 'QUA', 'SUP', 'Nalu Boutique', 'Lakeview Enterprise Campus',
  'KEY Groups', 'Sperry Key Groups', 'Equestrian International',
  'The Second Haus', 'Uji-Matcha Cafe', 'Whisk Up Matcha',
  'FS Architects', 'Peak Coffee Roasters', 'Hulma Cebu',
];

function CategoriesHoverReveal() {
  const [activeIndex, setActiveIndex] = useState(0);
  const prevRef = useRef(0);

  const handleEnter = (index: number) => {
    if (index === activeIndex) return;
    prevRef.current = activeIndex;
    setActiveIndex(index);
  };

  return (
    <section className="relative py-20 md:py-28 px-4 md:px-6 bg-[#0a0a0a]">
      <div className="max-w-6xl mx-auto relative z-10">
        {/* Section header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 md:gap-6 mb-12 md:mb-16">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="w-8 h-px bg-orange-500/50" />
              <span className="text-[10px] font-medium tracking-[0.3em] uppercase text-orange-400/80">Expertise</span>
            </div>
            <h2 className="font-display text-xl md:text-2xl lg:text-3xl font-bold text-white leading-tight">
              What we <span className="gradient-text-animated">specialize</span> in.
            </h2>
          </div>
          <p className="text-white/30 text-xs md:text-sm max-w-sm leading-relaxed text-right">
            Five core disciplines, one unified creative vision. Click any category to explore.
          </p>
        </div>

        {/* Desktop: split layout */}
        <div className="hidden md:flex gap-8 lg:gap-12 items-stretch">

          {/* LEFT — image panel: all images pre-rendered, slide via CSS transform */}
          <div className="w-[45%] shrink-0 relative rounded-2xl overflow-hidden" style={{ minHeight: '480px' }}>
            {categories.map((cat, index) => {
              const isActive = index === activeIndex;
              return (
                <div
                  key={cat.id}
                  className="absolute inset-0 w-full h-full"
                  style={{
                    transform: `translateY(${isActive ? '0%' : index < activeIndex ? '-100%' : '100%'})`,
                    transition: 'transform 0.55s cubic-bezier(0.76, 0, 0.24, 1)',
                    willChange: 'transform',
                    zIndex: isActive ? 2 : 1,
                  }}
                >
                  <img
                    src={cat.image}
                    alt={cat.name}
                    className="w-full h-full object-cover object-top"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <p className="text-white/80 text-sm leading-relaxed">{cat.description}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* RIGHT — list */}
          <div className="flex-1 flex flex-col justify-center">
            {categories.map((cat, index) => (
              <Link
                key={cat.id}
                to={`/portfolio/${cat.id}`}
                className="flex items-center justify-between py-5 xl:py-6 border-b border-white/8"
                onMouseEnter={() => handleEnter(index)}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-8 h-8 flex items-center justify-center rounded-lg shrink-0"
                    style={{
                      background: activeIndex === index ? `${cat.accent}22` : 'rgba(255,255,255,0.04)',
                      transition: 'background 0.25s',
                    }}
                  >
                    <i
                      className={`${cat.icon} text-sm`}
                      style={{
                        color: activeIndex === index ? cat.accent : 'rgba(255,255,255,0.25)',
                        transition: 'color 0.25s',
                      }}
                    />
                  </div>
                  <h3
                    className="font-display text-2xl xl:text-3xl font-bold leading-none"
                    style={{
                      color: activeIndex === index ? '#fff' : 'rgba(255,255,255,0.3)',
                      transition: 'color 0.25s',
                    }}
                  >
                    {cat.name}
                  </h3>
                  <span
                    className="font-display text-base xl:text-lg font-bold"
                    style={{
                      color: activeIndex === index ? cat.accent : 'rgba(255,255,255,0.15)',
                      transition: 'color 0.25s',
                    }}
                  >
                    {`{${String(index + 1).padStart(2, '0')}}`}
                  </span>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className="text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full"
                    style={{
                      color: activeIndex === index ? cat.accent : 'rgba(255,255,255,0.2)',
                      background: activeIndex === index ? `${cat.accent}15` : 'transparent',
                      border: `1px solid ${activeIndex === index ? `${cat.accent}40` : 'rgba(255,255,255,0.08)'}`,
                      transition: 'all 0.25s',
                    }}
                  >
                    {cat.count}
                  </span>
                  <div
                    className="w-8 h-8 flex items-center justify-center rounded-full"
                    style={{
                      background: activeIndex === index ? cat.accent : 'rgba(255,255,255,0.05)',
                      transform: activeIndex === index ? 'rotate(-45deg)' : 'rotate(0deg)',
                      transition: 'all 0.25s',
                    }}
                  >
                    <i className="ri-arrow-right-line text-sm text-white" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Mobile fallback */}
        <div className="md:hidden grid grid-cols-1 gap-3">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to={`/portfolio/${cat.id}`}
              className="flex items-center gap-4 p-4 rounded-xl"
              style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="relative w-20 h-16 rounded-lg overflow-hidden shrink-0">
                <img src={cat.image} alt={cat.name} className="w-full h-full object-cover object-top" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <i className={`${cat.icon} text-xs`} style={{ color: cat.accent }} />
                  <h3 className="font-display text-sm font-bold text-white truncate">{cat.name}</h3>
                </div>
                <p className="text-[10px] text-white/30 leading-relaxed line-clamp-2">{cat.description}</p>
              </div>
              <span className="text-[10px] font-bold text-white/30 shrink-0">{cat.count}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
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

  const marqueeRef = useRef<HTMLElement>(null);
  const cursorGlowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Direct DOM cursor glow — no setState, zero re-renders
  const handlePageMouseMove = (e: React.MouseEvent) => {
    const glow = cursorGlowRef.current;
    const marquee = marqueeRef.current;
    if (!glow) return;
    glow.style.left = `${e.clientX - 250}px`;
    glow.style.top = `${e.clientY - 250}px`;
    if (marquee) {
      const rect = marquee.getBoundingClientRect();
      glow.style.opacity = e.clientY > rect.bottom ? '1' : '0';
    }
  };

  return (
    <div
      className="min-h-screen bg-[#0a0a0a] font-body overflow-x-hidden"
      onMouseMove={handlePageMouseMove}
      onMouseLeave={() => {
        if (cursorGlowRef.current) cursorGlowRef.current.style.opacity = '0';
      }}
    >
      {/* Cursor glow — controlled via ref, never triggers re-render */}
      <div
        ref={cursorGlowRef}
        className="fixed rounded-full pointer-events-none z-[999]"
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

      <Navigation />

      {/* ═══════════════════ HERO ═══════════════════ */}
      <section className="relative h-screen overflow-hidden bg-[#0a0a0a]">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/55 to-[#0a0a0a] z-10" />
          <img
            src="/images/cba766423a8ca16256c39bdfe900b4d7.png"
            alt="Creative workspace"
            className="w-full h-full object-cover object-top opacity-40"
            loading="eager"
            decoding="sync"
          />
        </div>

        <div className="relative z-30 h-full flex flex-col justify-end pb-12 md:pb-20 px-4 md:px-6 lg:px-16">
          <div className="max-w-7xl mx-auto w-full">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="flex items-center gap-3 mb-4 md:mb-5"
            >
              <span className="w-8 md:w-10 h-px bg-orange-500" />
              <span className="text-[10px] font-semibold tracking-[0.3em] uppercase text-orange-400 font-display">
                Selected Works
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.4 }}
              className="font-display font-bold leading-[0.95] tracking-tight mb-4 md:mb-6"
            >
              <span className="block text-white text-[clamp(1.75rem,5.5vw,4.5rem)]">We craft brands</span>
              <span
                className="block text-[clamp(1.75rem,5.5vw,4.5rem)]"
                style={{
                  background: 'linear-gradient(135deg, #ef4444, #f97316, #fb7185)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                that move people.
              </span>
            </motion.h1>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.7 }}
              className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 md:gap-8"
            >
              <p className="text-white/40 text-xs md:text-sm leading-relaxed max-w-md">
                Every project is a story of strategy, creativity, and real results.
                Explore the brands we&apos;ve helped grow across Cebu and beyond.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-0 sm:flex sm:items-center sm:gap-8 lg:gap-10 border border-white/8 rounded-xl px-4 py-3 bg-white/[0.03] backdrop-blur-sm">
                {[
                  { value: '38+', label: 'Brands Built' },
                  { value: '100+', label: 'Projects' },
                  { value: '5.0★', label: 'Avg. Rating' },
                  { value: '3×', label: 'Engagement Lift' },
                ].map((stat, i, arr) => (
                  <div key={stat.label} className="flex items-center gap-3 sm:gap-8 lg:gap-10">
                    <div className="text-center w-full">
                      <div className="text-sm md:text-base lg:text-lg font-bold text-white font-display">{stat.value}</div>
                      <div className="text-[9px] md:text-[10px] text-white/30 tracking-wide uppercase mt-0.5 whitespace-nowrap">{stat.label}</div>
                    </div>
                    {i < arr.length - 1 && <div className="hidden sm:block w-px h-6 bg-white/10 flex-shrink-0" />}
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          <div className="absolute bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
            <span className="text-[9px] tracking-[0.3em] uppercase text-white/20 font-display">Scroll</span>
            <div className="w-px h-6 md:h-8 bg-gradient-to-b from-white/30 to-transparent animate-pulse" />
          </div>
        </div>
      </section>

      {/* ═══════════════════ CLIENT MARQUEE ═══════════════════ */}
      <section ref={marqueeRef} className="relative py-8 overflow-hidden bg-[#0a0a0a] border-y border-white/5">
        <div className="flex whitespace-nowrap animate-marquee">
          {[...clients, ...clients].map((client, i) => (
            <span key={i} className="inline-flex items-center gap-4 mx-6 md:mx-10">
              <span className="text-[11px] font-semibold tracking-widest uppercase text-white/50 font-display">
                {client}
              </span>
              <span className="w-1 h-1 rounded-full bg-orange-400/50" />
            </span>
          ))}
        </div>
      </section>

      {/* ═══════════════════ CATEGORIES — HOVER REVEAL ═══════════════════ */}
      <CategoriesHoverReveal />

      {/* ── thin separator ── */}
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
      </div>

      {/* ═══════════════════ HOW WE WORK — GRAND TIMELINE ═══════════════════ */}
      <ProcessTimeline />

      {/* ── thin separator ── */}
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
      </div>

      {/* ═══════════════════ CTA ═══════════════════ */}
      <section className="relative py-16 md:py-24 px-4 md:px-6 bg-[#0a0a0a]">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] rounded-full pointer-events-none opacity-25" style={{ background: 'radial-gradient(circle, rgba(239,68,68,0.18) 0%, transparent 70%)', filter: 'blur(100px)' }} />

        <div className="max-w-6xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.8 }}
            className="flex flex-col md:flex-row md:items-center md:justify-between gap-8 md:gap-16"
          >
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="w-8 h-px bg-orange-500/50" />
                <span className="text-[10px] font-medium tracking-[0.3em] uppercase text-orange-400/80">Let&apos;s Create</span>
              </div>
              <h2 className="font-display text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-3 leading-tight">
                Ready to bring your<br />
                <span className="gradient-text-animated">vision to life?</span>
              </h2>
              <p className="text-white/35 text-sm leading-relaxed max-w-sm">
                Let&apos;s create something amazing together. Get in touch to discuss your project.
              </p>
            </div>

            <div className="flex flex-col gap-3 shrink-0">
              <Link
                to="/contact"
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 font-semibold rounded-full hover:scale-105 transition-all duration-300 whitespace-nowrap text-white text-sm cursor-pointer"
                style={{ background: 'linear-gradient(135deg, #ef4444, #f97316, #fb7185)', boxShadow: '0 8px 30px rgba(239,68,68,0.35)' }}
              >
                <span>Get Started</span>
                <i className="ri-arrow-right-line text-base" />
              </Link>
              <a
                href="https://calendly.com/hunacreatives/30min"
                target="_blank"
                rel="nofollow noreferrer"
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full text-sm font-semibold border border-orange-400/50 text-orange-400 hover:bg-orange-500/10 transition-all duration-300 hover:scale-105 whitespace-nowrap cursor-pointer"
              >
                <i className="ri-calendar-line text-base" />
                Book a Free Call
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer isDark />

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 28s linear infinite;
        }
      `}</style>
    </div>
  );
}
