import { Link } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

import Navigation from '../../components/feature/Navigation';
import Footer from '../home/components/Footer';
import ProcessTimeline from './components/ProcessTimeline';

const categories = [
  {
    id: 'branding',
    name: 'Branding & Identity',
    shortName: 'Branding',
    description: 'Complete brand systems that tell your story.',
    icon: 'ri-fingerprint-line',
    count: '25+',
    image:
      'https://images.squarespace-cdn.com/content/v1/688d8b734aa1173915369520/b7ef19cd-8059-4958-9ef6-29b1fe3f6e2c/EQ-Brand+Slides.png',
    accent: '#ef4444',
  },
  {
    id: 'graphic-design',
    name: 'Graphic Design',
    shortName: 'Design',
    description: 'Bold visuals that capture attention.',
    icon: 'ri-pen-nib-line',
    count: '18+',
    image:
      'https://images.squarespace-cdn.com/content/v1/688d8b734aa1173915369520/d8a9d944-4f06-46ce-ae78-22290ef04387/Flyer+mockup+2.png',
    accent: '#f97316',
  },
  {
    id: 'social-media',
    name: 'Social Media Marketing',
    shortName: 'Social',
    description: 'Strategic content that builds community.',
    icon: 'ri-bar-chart-grouped-line',
    count: '24+',
    image:
      'https://images.squarespace-cdn.com/content/v1/688d8b734aa1173915369520/6bbee6ae-b7ff-442a-ad56-37e7b932165f/3+%286%29.png',
    accent: '#fb7185',
  },
  {
    id: 'email-marketing',
    name: 'Email Marketing',
    shortName: 'Email',
    description: 'Campaigns that convert subscribers.',
    icon: 'ri-mail-send-line',
    count: '9+',
    image:
      'https://static.readdy.ai/image/08981d36cd0b73cf08022d4d82071d03/0786ff49839456d59f84f19d66a7f551.png',
    accent: '#fbbf24',
  },
];

const clients = [
  'Equestrian International',
  'The Second Haus',
  'Blue Collar Nutrition',
  'Everyone by One',
  'The Cowart Team',
  'Vox Kitchen',
];

export default function PortfolioPage() {
  const heroRef = useRef<HTMLElement>(null);
  const marqueeRef = useRef<HTMLElement>(null);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [isHoveringPage, setIsHoveringPage] = useState(false);
  const [marqueeBottom, setMarqueeBottom] = useState(0);

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });

  const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const updateMarqueeBottom = () => {
      if (marqueeRef.current) {
        const rect = marqueeRef.current.getBoundingClientRect();
        setMarqueeBottom(rect.bottom + window.scrollY);
      }
    };
    updateMarqueeBottom();
    window.addEventListener('resize', updateMarqueeBottom);
    window.addEventListener('scroll', updateMarqueeBottom);
    return () => {
      window.removeEventListener('resize', updateMarqueeBottom);
      window.removeEventListener('scroll', updateMarqueeBottom);
    };
  }, []);

  const handlePageMouseMove = (e: React.MouseEvent) => {
    setCursorPos({ x: e.clientX, y: e.clientY });
  };

  const isBelowMarquee = cursorPos.y + window.scrollY > marqueeBottom;

  return (
    <div
      className="min-h-screen bg-[#0a0a0a] font-body"
      onMouseMove={handlePageMouseMove}
      onMouseEnter={() => setIsHoveringPage(true)}
      onMouseLeave={() => setIsHoveringPage(false)}
    >
      {/* Cursor glow — only visible below the marquee banner */}
      {isHoveringPage && isBelowMarquee && (
        <div
          className="fixed rounded-full pointer-events-none z-[999]"
          style={{
            width: '500px',
            height: '500px',
            left: cursorPos.x - 250,
            top: cursorPos.y - 250,
            background: 'radial-gradient(circle, rgba(249,115,22,0.07) 0%, transparent 70%)',
            filter: 'blur(50px)',
            transition: 'left 0.08s ease-out, top 0.08s ease-out',
          }}
        />
      )}

      <Navigation />

      {/* ═══════════════════ HERO ═══════════════════ */}
      <section ref={heroRef} className="relative h-screen overflow-hidden bg-[#0a0a0a]">
        <motion.div style={{ y: heroY }} className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/55 to-[#0a0a0a] z-10" />
          <img
            src="https://static.readdy.ai/image/08981d36cd0b73cf08022d4d82071d03/cba766423a8ca16256c39bdfe900b4d7.png"
            alt="Creative workspace"
            className="w-full h-full object-cover object-top opacity-40"
          />
        </motion.div>

        <div
          className="absolute inset-0 z-20 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' opacity=\'1\'/%3E%3C/svg%3E")',
          }}
        />

        <motion.div style={{ opacity: heroOpacity }} className="relative z-30 h-full flex flex-col justify-end pb-12 md:pb-20 px-4 md:px-6 lg:px-16">
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

              <div className="flex items-center gap-4 md:gap-8 lg:gap-10 border border-white/8 rounded-xl px-5 py-3 bg-white/[0.03] backdrop-blur-sm">
                {[
                  { value: '33+', label: 'Brands Built' },
                  { value: '100+', label: 'Projects' },
                  { value: '5.0★', label: 'Avg. Rating' },
                  { value: '3×', label: 'Engagement Lift' },
                ].map((stat, i, arr) => (
                  <div key={stat.label} className="flex items-center gap-4 md:gap-8 lg:gap-10">
                    <div className="text-center">
                      <div className="text-sm md:text-base lg:text-lg font-bold text-white font-display">{stat.value}</div>
                      <div className="text-[9px] md:text-[10px] text-white/30 tracking-widest uppercase mt-0.5 whitespace-nowrap">{stat.label}</div>
                    </div>
                    {i < arr.length - 1 && <div className="w-px h-6 bg-white/10" />}
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="absolute bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          >
            <span className="text-[9px] tracking-[0.3em] uppercase text-white/20 font-display">Scroll</span>
            <div className="w-px h-6 md:h-8 bg-gradient-to-b from-white/30 to-transparent animate-pulse" />
          </motion.div>
        </motion.div>
      </section>

      {/* ═══════════════════ CLIENT MARQUEE ═══════════════════ */}
      <section ref={marqueeRef} className="relative py-8 overflow-hidden bg-[#0a0a0a] border-y border-white/5">
        <div className="flex whitespace-nowrap animate-marquee">
          {[...clients, ...clients, ...clients].map((client, i) => (
            <span key={i} className="inline-flex items-center gap-4 mx-6 md:mx-10">
              <span className="text-[11px] font-semibold tracking-widest uppercase text-white/50 font-display">
                {client}
              </span>
              <span className="w-1 h-1 rounded-full bg-orange-400/50" />
            </span>
          ))}
        </div>
      </section>

      {/* ═══════════════════ CATEGORIES ═══════════════════ */}
      <section className="relative py-20 md:py-32 lg:py-40 px-4 md:px-6 bg-[#0a0a0a]">
        {/* Ambient glow */}
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full pointer-events-none opacity-30"
          style={{
            background: 'radial-gradient(circle, rgba(249,115,22,0.08) 0%, transparent 70%)',
            filter: 'blur(100px)',
          }}
        />

        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7 }}
            className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 md:gap-6 mb-12 md:mb-16"
          >
            <div>
              <span className="flex items-center gap-2 text-[10px] font-semibold tracking-[0.3em] uppercase text-orange-500 mb-3 font-display">
                <span className="w-6 h-px bg-orange-500" />
                Expertise
              </span>
              <h2 className="font-display text-xl md:text-2xl lg:text-3xl font-bold text-white leading-tight">
                What we <span className="gradient-text-animated">specialize</span> in.
              </h2>
            </div>
            <p className="text-white/30 text-xs md:text-sm max-w-sm leading-relaxed">
              Four core disciplines, one unified creative vision. Click any category to explore.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {categories.map((cat, index) => (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.5, delay: index * 0.08 }}
              >
                <Link
                  to={`/portfolio/${cat.id}`}
                  className="group relative block overflow-hidden rounded-xl transition-all duration-500 hover:-translate-y-1 cursor-pointer"
                  style={{
                    background: '#141414',
                    border: '1px solid rgba(255,255,255,0.06)',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
                  }}
                >
                  <div className="relative h-32 md:h-40 lg:h-48 overflow-hidden">
                    <img
                      src={cat.image}
                      alt={cat.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent transition-all duration-500 group-hover:from-orange-900/70 group-hover:via-orange-900/20" />

                    <div
                      className="absolute top-2 md:top-3 right-2 md:right-3 px-2 md:px-2.5 py-0.5 md:py-1 rounded-full text-[9px] md:text-[10px] font-bold text-white"
                      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}
                    >
                      {cat.count}
                    </div>

                    <div className="absolute bottom-2 md:bottom-3 right-2 md:right-3 w-6 md:w-7 h-6 md:h-7 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-sm opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                      <i className="ri-arrow-right-up-line text-xs md:text-sm text-white" />
                    </div>
                  </div>

                  <div className="p-3 md:p-4 lg:p-5 transition-all duration-500 group-hover:bg-orange-950/20">
                    <div className="flex items-center gap-2 mb-1.5 md:mb-2">
                      <div className="w-5 md:w-6 h-5 md:h-6 flex items-center justify-center rounded-md transition-all duration-300 group-hover:bg-orange-500/20" style={{ background: `${cat.accent}18` }}>
                        <i className={`${cat.icon} text-[10px] md:text-xs transition-colors duration-300 group-hover:text-orange-400`} style={{ color: cat.accent }} />
                      </div>
                      <h3 className="font-display text-[11px] md:text-xs lg:text-sm font-bold text-white leading-tight transition-colors duration-300 group-hover:text-orange-100">{cat.name}</h3>
                    </div>
                    <p className="text-[10px] md:text-[11px] text-white/30 leading-relaxed transition-colors duration-300 group-hover:text-orange-200/40">{cat.description}</p>
                  </div>

                  <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" style={{ boxShadow: 'inset 0 0 0 1px rgba(249,115,22,0.35), 0 8px 30px rgba(249,115,22,0.12)' }} />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ HOW WE WORK — GRAND TIMELINE ═══════════════════ */}
      <ProcessTimeline />

      {/* ═══════════════════ CTA ═══════════════════ */}
      <section className="relative py-20 md:py-28 px-4 md:px-6 bg-[#0a0a0a]">
        {/* Ambient glow */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] rounded-full pointer-events-none opacity-20"
          style={{
            background: 'radial-gradient(circle, rgba(239,68,68,0.15) 0%, transparent 70%)',
            filter: 'blur(100px)',
          }}
        />

        <div className="max-w-5xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7 }}
            className="relative rounded-2xl overflow-hidden"
            style={{
              background: '#141414',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div className="absolute inset-0">
              <img
                src="https://readdy.ai/api/search-image?query=abstract%20dark%20moody%20creative%20studio%20environment%20with%20warm%20amber%20lighting%20dramatic%20shadows%20and%20scattered%20design%20tools%20on%20dark%20surface%20cinematic%20editorial%20photography%20artistic%20atmosphere&width=1200&height=500&seq=portfolio-cta-bg-001&orientation=landscape"
                alt="Creative studio"
                className="w-full h-full object-cover object-top opacity-25"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#141414] via-[#141414]/80 to-[#141414]/60" />
            </div>

            {/* Top accent line */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-500/60 to-transparent" />

            <div className="relative z-10 p-8 md:p-12 lg:p-16 flex flex-col md:flex-row md:items-center md:justify-between gap-8 md:gap-12">
              <div className="max-w-lg">
                <span className="flex items-center gap-2 text-[10px] font-semibold tracking-[0.3em] uppercase text-orange-400 mb-4 font-display">
                  <span className="w-5 h-px bg-orange-400" />
                  Let&apos;s Create
                </span>
                <h2 className="font-display text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-4 leading-tight">
                  Ready to bring your
                  <br />
                  <span className="gradient-text-animated">vision to life?</span>
                </h2>
                <p className="text-white/35 text-sm leading-relaxed">
                  Let&apos;s create something amazing together. Get in touch to discuss your project.
                </p>
              </div>

              <div className="flex flex-col gap-3 shrink-0">
                <Link
                  to="/contact"
                  className="inline-flex items-center justify-center gap-2 px-8 py-3.5 font-semibold rounded-full shadow-lg hover:scale-105 transition-all duration-300 whitespace-nowrap text-white text-sm cursor-pointer"
                  style={{
                    background: 'linear-gradient(135deg, #ef4444, #f97316, #fb7185)',
                    backgroundSize: '200% 200%',
                    boxShadow: '0 8px 30px rgba(239,68,68,0.35)',
                  }}
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
            </div>
          </motion.div>
        </div>
      </section>

      <Footer isDark />

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
        .animate-marquee {
          animation: marquee 15s linear infinite;
        }
      `}</style>
    </div>
  );
}
