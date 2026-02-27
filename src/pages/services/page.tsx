
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../../components/feature/Navigation';
import Footer from '../home/components/Footer';

const services = [
  {
    icon: 'ri-palette-line',
    title: 'Brand Identity Design',
    description:
      'Create a memorable brand identity that resonates with your audience. From logo design to complete brand guidelines, we craft visual identities that tell your story.',
    features: ['Logo Design', 'Brand Guidelines', 'Color Palette', 'Typography System'],
  },
  {
    icon: 'ri-layout-line',
    title: 'Web Design & Development',
    description:
      'Build stunning, responsive websites that convert visitors into customers. We combine beautiful design with seamless functionality.',
    features: ['Responsive Design', 'UI/UX Design', 'Custom Development', 'SEO Optimization'],
  },
  {
    icon: 'ri-megaphone-line',
    title: 'Digital Marketing',
    description:
      'Amplify your brand presence across digital channels. Strategic campaigns that drive engagement and deliver measurable results.',
    features: ['Social Media Strategy', 'Content Marketing', 'Campaign Management', 'Analytics & Reporting'],
  },
  {
    icon: 'ri-camera-line',
    title: 'Content Creation',
    description:
      'Compelling visual and written content that captures attention. Professional photography, videography, and copywriting services.',
    features: ['Photography', 'Video Production', 'Copywriting', 'Content Strategy'],
  },
  {
    icon: 'ri-printer-line',
    title: 'Print Design',
    description:
      'Eye-catching print materials that leave a lasting impression. From business cards to large-format displays.',
    features: ['Business Cards', 'Brochures', 'Packaging Design', 'Marketing Collateral'],
  },
  {
    icon: 'ri-line-chart-line',
    title: 'Brand Strategy',
    description:
      'Develop a comprehensive brand strategy that positions you for success. Research-driven insights and actionable roadmaps.',
    features: ['Market Research', 'Positioning Strategy', 'Brand Architecture', 'Messaging Framework'],
  },
];

const processSteps = [
  { number: '01', title: 'Discovery', desc: 'We learn everything about your brand, goals, and audience through deep-dive sessions.' },
  { number: '02', title: 'Strategy', desc: 'We map out a creative direction and strategic plan tailored to your objectives.' },
  { number: '03', title: 'Design', desc: 'Our team crafts bold, purposeful visuals that bring your brand story to life.' },
  { number: '04', title: 'Deliver', desc: 'We hand off polished, production-ready assets with full support and guidance.' },
];

function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add('revealed');
        });
      },
      { threshold: 0.1 }
    );

    const children = el.querySelectorAll('.reveal-item');
    children.forEach((child) => observer.observe(child));

    return () => observer.disconnect();
  }, []);

  return ref;
}

const pageStyles = `
  /* Scroll reveal */
  .scroll-reveal {
    opacity: 0;
    transform: translateY(36px);
    transition: opacity 0.75s cubic-bezier(0.16, 1, 0.3, 1), transform 0.75s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .scroll-reveal.revealed {
    opacity: 1;
    transform: translateY(0);
  }

  /* Ambient orb pulse */
  @keyframes orb-pulse {
    0%, 100% { opacity: 0.6; transform: scale(1); }
    50% { opacity: 1; transform: scale(1.08); }
  }
  .orb-pulse { animation: orb-pulse 6s ease-in-out infinite; }
  .orb-pulse-slow { animation: orb-pulse 9s ease-in-out infinite; }

  /* Floating bubble drift */
  @keyframes bubble-drift {
    0%, 100% { transform: translateY(0) translateX(0) rotate(0deg); }
    33% { transform: translateY(-18px) translateX(8px) rotate(3deg); }
    66% { transform: translateY(-8px) translateX(-6px) rotate(-2deg); }
  }
  .bubble-drift { animation: bubble-drift 8s ease-in-out infinite; }

  /* Divider line draw */
  @keyframes line-draw {
    from { width: 0; opacity: 0; }
    to { width: 3rem; opacity: 1; }
  }
  .line-draw { animation: line-draw 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.3s both; }

  /* Number count-up shimmer */
  @keyframes number-glow {
    0%, 100% { text-shadow: 0 0 20px rgba(249,115,22,0.3); }
    50% { text-shadow: 0 0 40px rgba(249,115,22,0.7), 0 0 80px rgba(239,68,68,0.3); }
  }
  .number-glow { animation: number-glow 3s ease-in-out infinite; }

  /* Card border shimmer on hover */
  .service-card::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    padding: 1px;
    background: linear-gradient(135deg, transparent 40%, rgba(249,115,22,0.4) 60%, transparent 80%);
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    opacity: 0;
    transition: opacity 0.4s ease;
    pointer-events: none;
  }
  .service-card:hover::before { opacity: 1; }

  /* Hero label pulse dot */
  @keyframes dot-ping {
    0% { transform: scale(1); opacity: 1; }
    75%, 100% { transform: scale(2.2); opacity: 0; }
  }
  .dot-ping { animation: dot-ping 1.8s cubic-bezier(0,0,0.2,1) infinite; }
`;

export default function ServicesPage() {
  const navigate = useNavigate();
  const headerRef = useScrollReveal();
  const gridRef = useScrollReveal();
  const processRef = useScrollReveal();

  return (
    <div className="min-h-screen text-white font-body" style={{ background: '#0a0a0a' }}>
      <Navigation />

      {/* ── Ambient background ── */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="orb-pulse absolute top-0 right-1/4 w-[28rem] h-[28rem] bg-orange-600/10 rounded-full blur-[130px]" />
        <div className="orb-pulse-slow absolute top-1/2 left-0 w-80 h-80 bg-red-600/8 rounded-full blur-[110px]" />
        <div className="orb-pulse absolute bottom-1/4 right-0 w-72 h-72 bg-rose-600/8 rounded-full blur-[100px]" />
        <div className="orb-pulse-slow absolute bottom-0 left-1/3 w-64 h-64 bg-orange-500/6 rounded-full blur-[80px]" />
      </div>

      {/* ── Floating bubbles ── */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        {[
          { size: 'w-20 h-20', top: '10rem', left: '6%', delay: '0s' },
          { size: 'w-12 h-12', top: '18rem', right: '10%', delay: '1.2s' },
          { size: 'w-16 h-16', top: '50%', left: '4%', delay: '2.4s' },
          { size: 'w-24 h-24', bottom: '33%', right: '6%', delay: '0.8s' },
          { size: 'w-10 h-10', bottom: '25%', left: '33%', delay: '3.2s' },
          { size: 'w-14 h-14', top: '75%', right: '33%', delay: '1.6s' },
        ].map((b, i) => (
          <div
            key={i}
            className={`${b.size} bubble-drift absolute rounded-full`}
            style={{
              top: b.top,
              left: b.left,
              right: b.right,
              bottom: b.bottom,
              animationDelay: b.delay,
              background: 'radial-gradient(circle, rgba(249,115,22,0.15) 0%, rgba(239,68,68,0.08) 100%)',
              border: '1px solid rgba(249,115,22,0.2)',
            }}
          />
        ))}
      </div>

      <main className="pt-28 sm:pt-32 md:pt-36 pb-12 sm:pb-16 md:pb-20 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">

          {/* ── HEADER ── */}
          <div ref={headerRef} className="text-center mb-16 sm:mb-20 md:mb-28">

            {/* Label */}
            <div className="reveal-item scroll-reveal mb-5 sm:mb-6 flex items-center justify-center gap-3">
              <span className="line-draw h-px bg-gradient-to-r from-transparent to-orange-500 block" />
              <span className="relative inline-flex items-center gap-2 text-[10px] sm:text-[11px] font-semibold tracking-[0.2em] uppercase gradient-text">
                <span className="relative flex h-2 w-2">
                  <span className="dot-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500" />
                </span>
                Our Services
              </span>
              <span className="line-draw h-px bg-gradient-to-l from-transparent to-orange-500 block" />
            </div>

            {/* Headline */}
            <h1 className="reveal-item scroll-reveal text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem] font-bold font-display tracking-tight mb-5 sm:mb-6 text-white leading-[1.1]">
              Elevate Your{' '}
              <span className="gradient-text-animated">Brand</span>
            </h1>

            {/* Subtext */}
            <p className="reveal-item scroll-reveal text-xs sm:text-sm md:text-[15px] text-white/45 max-w-xl mx-auto leading-relaxed px-4">
              Discover our range of creative services designed to transform your vision into reality
              and drive meaningful results.
            </p>

            {/* Decorative divider */}
            <div className="reveal-item scroll-reveal mt-8 flex items-center justify-center gap-3">
              <span className="w-12 h-px bg-gradient-to-r from-transparent via-orange-500/60 to-transparent" />
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500/60" />
              <span className="w-12 h-px bg-gradient-to-r from-transparent via-orange-500/60 to-transparent" />
            </div>
          </div>

          {/* ── SERVICES GRID ── */}
          <div ref={gridRef} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
            {services.map((service, index) => (
              <div
                key={index}
                className="reveal-item scroll-reveal service-card group rounded-2xl p-6 sm:p-7 border border-white/8 hover:border-orange-400/30 transition-all duration-500 hover:-translate-y-2 cursor-pointer relative overflow-hidden"
                style={{
                  transitionDelay: `${index * 70}ms`,
                  background: 'linear-gradient(145deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)',
                  boxShadow: '0 1px 0 rgba(255,255,255,0.05) inset',
                }}
              >
                {/* Hover glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/0 via-transparent to-red-500/0 group-hover:from-orange-500/8 group-hover:to-red-500/5 transition-all duration-600 rounded-2xl" />

                {/* Top accent line */}
                <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-orange-500/0 to-transparent group-hover:via-orange-500/50 transition-all duration-500" />

                {/* Icon */}
                <div className="w-11 h-11 flex items-center justify-center bg-gradient-brand rounded-xl mb-5 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-orange-500/30 transition-all duration-400 relative z-10">
                  <i className={`${service.icon} text-lg text-white`} />
                </div>

                {/* Title */}
                <h3 className="text-sm sm:text-[15px] font-semibold font-display text-white mb-2.5 relative z-10 group-hover:text-orange-50 transition-colors duration-300">
                  {service.title}
                </h3>

                {/* Description */}
                <p className="text-white/45 leading-relaxed mb-5 text-xs relative z-10">
                  {service.description}
                </p>

                {/* Features */}
                <ul className="space-y-2 relative z-10">
                  {service.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center text-white/45 group-hover:text-white/60 transition-colors duration-300">
                      <span className="w-4 h-4 flex items-center justify-center mr-2 flex-shrink-0">
                        <i className="ri-check-line text-orange-500 text-xs" />
                      </span>
                      <span className="text-xs">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Arrow CTA */}
                <div
                  className="mt-5 flex items-center gap-2 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 relative z-10 cursor-pointer"
                  onClick={() => navigate('/contact')}
                >
                  <span className="text-xs gradient-text font-semibold">Get Started</span>
                  <i className="ri-arrow-right-line text-orange-500 text-xs group-hover:translate-x-1 transition-transform duration-300" />
                </div>
              </div>
            ))}
          </div>

          {/* ── PROCESS ── */}
          <div ref={processRef} className="mt-24 sm:mt-28 md:mt-36">
            <div className="reveal-item scroll-reveal text-center mb-14 sm:mb-16">
              <span className="inline-flex items-center gap-3 text-[10px] sm:text-[11px] font-semibold tracking-[0.2em] uppercase gradient-text mb-4">
                <span className="w-8 h-px bg-gradient-to-r from-red-500 to-orange-400 block" />
                How We Work
                <span className="w-8 h-px bg-gradient-to-r from-orange-400 to-rose-400 block" />
              </span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-[2.75rem] font-bold font-display mt-3 text-white leading-tight">
                Our <span className="gradient-text-animated">Process</span>
              </h2>
            </div>

            <div className="relative">
              {/* Connector line */}
              <div
                className="hidden lg:block absolute top-[2.75rem] left-[12.5%] right-[12.5%] h-px z-0"
                style={{ background: 'linear-gradient(to right, transparent, rgba(249,115,22,0.35) 20%, rgba(249,115,22,0.35) 80%, transparent)' }}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 md:gap-6">
                {processSteps.map((step, i) => (
                  <div
                    key={step.number}
                    className="reveal-item scroll-reveal group relative z-10"
                    style={{ transitionDelay: `${i * 110}ms` }}
                  >
                    <div
                      className="rounded-2xl p-6 sm:p-7 border border-white/8 hover:border-orange-400/30 transition-all duration-500 text-center hover:-translate-y-1 hover:shadow-xl hover:shadow-orange-500/10"
                      style={{ background: 'rgba(16,16,16,0.95)' }}
                    >
                      <div className="flex flex-col items-center mb-4">
                        <div className="relative mb-3">
                          <div className="w-3 h-3 rounded-full bg-orange-500 ring-4 ring-orange-500/20" />
                          <div className="absolute inset-0 w-3 h-3 rounded-full bg-orange-400 animate-ping opacity-30" />
                        </div>
                        <div className="text-3xl sm:text-4xl font-bold font-display gradient-text leading-none number-glow">
                          {step.number}
                        </div>
                      </div>
                      <h3 className="text-sm sm:text-[15px] font-semibold font-display text-white mb-2">{step.title}</h3>
                      <p className="text-white/45 text-xs leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── CTA ── */}
          <div className="mt-24 sm:mt-28 md:mt-32 text-center">
            <div
              className="rounded-3xl p-8 sm:p-12 md:p-16 lg:p-20 border border-white/8 relative overflow-hidden"
              style={{
                background: 'linear-gradient(145deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)',
                boxShadow: '0 1px 0 rgba(255,255,255,0.06) inset, 0 40px 80px rgba(0,0,0,0.4)',
              }}
            >
              {/* Glow orbs */}
              <div className="orb-pulse absolute -top-24 -right-24 w-72 h-72 bg-red-600/15 rounded-full blur-3xl" />
              <div className="orb-pulse-slow absolute -bottom-24 -left-24 w-64 h-64 bg-orange-600/15 rounded-full blur-3xl" />

              {/* Top border accent */}
              <div className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-orange-500/50 to-transparent" />

              {/* Decorative bubbles */}
              <div className="absolute w-16 h-16 top-6 left-12 rounded-full hidden sm:block bubble-drift"
                style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.15) 0%, rgba(239,68,68,0.08) 100%)', border: '1px solid rgba(249,115,22,0.2)' }} />
              <div className="absolute w-10 h-10 bottom-8 right-20 rounded-full hidden sm:block bubble-drift"
                style={{ animationDelay: '2s', background: 'radial-gradient(circle, rgba(249,115,22,0.15) 0%, rgba(239,68,68,0.08) 100%)', border: '1px solid rgba(249,115,22,0.2)' }} />

              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-[2.75rem] font-bold font-display text-white mb-4 relative z-10 leading-tight">
                Ready to Start Your{' '}
                <span className="gradient-text-animated">Project?</span>
              </h2>
              <p className="text-xs sm:text-sm text-white/45 mb-10 max-w-xl mx-auto relative z-10 px-4 leading-relaxed">
                Let&apos;s collaborate to bring your creative vision to life. Get in touch with us today.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 relative z-10">
                <button
                  onClick={() => navigate('/contact')}
                  className="w-full sm:w-auto px-8 sm:px-10 py-3.5 bg-gradient-brand text-white font-semibold font-display rounded-full transition-all duration-300 hover:shadow-2xl hover:shadow-orange-500/40 hover:scale-105 whitespace-nowrap cursor-pointer text-xs sm:text-sm"
                >
                  Get Started
                </button>
                <a
                  href="https://calendly.com/hunacreatives/30min"
                  target="_blank"
                  rel="nofollow noreferrer"
                  className="w-full sm:w-auto px-8 sm:px-10 py-3.5 rounded-full text-xs sm:text-sm font-semibold font-display border border-orange-400/40 text-orange-400 hover:bg-orange-500/10 transition-all duration-300 hover:scale-105 whitespace-nowrap cursor-pointer flex items-center justify-center gap-2"
                >
                  <i className="ri-calendar-line text-base" />
                  Book a Free Call
                </a>
              </div>
            </div>
          </div>

        </div>
      </main>

      <Footer isDark />
      <style>{pageStyles}</style>
    </div>
  );
}
