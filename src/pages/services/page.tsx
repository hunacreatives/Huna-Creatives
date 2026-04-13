import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../../components/feature/Navigation';
import Footer from '../home/components/Footer';

const services = [
  {
    icon: 'ri-palette-line',
    title: 'Brand Identity Design',
    description: 'Logos, color systems, and brand guidelines that make your business instantly recognizable and impossible to forget.',
    number: '01',
    accent: '#f97316',
    accentTo: '#ef4444',
    tag: 'Most Popular',
    serviceKey: 'Brand Identity & Logo Design',
  },
  {
    icon: 'ri-layout-line',
    title: 'Web Design & Development',
    description: 'Beautiful, responsive websites built to convert visitors into customers and reflect the quality of your brand.',
    number: '02',
    accent: '#ef4444',
    accentTo: '#fb7185',
    tag: null,
    serviceKey: 'Website Design',
  },
  {
    icon: 'ri-bar-chart-grouped-line',
    title: 'Social Media Marketing',
    description: 'Strategic content and campaigns that grow your audience, build community, and keep your brand top of mind.',
    number: '03',
    accent: '#fb7185',
    accentTo: '#f97316',
    tag: null,
    serviceKey: 'Digital Design (Social Media, Ads)',
  },
  {
    icon: 'ri-camera-line',
    title: 'Content Creation',
    description: 'Photos, videos, and copy crafted to tell your brand story in a way that resonates and drives action.',
    number: '04',
    accent: '#fbbf24',
    accentTo: '#f97316',
    tag: null,
    serviceKey: 'Content Creation & Photography',
  },
  {
    icon: 'ri-printer-line',
    title: 'Print & Packaging Design',
    description: 'Business cards, brochures, and packaging that make a tangible impression and reinforce your brand identity.',
    number: '05',
    accent: '#f97316',
    accentTo: '#fbbf24',
    tag: null,
    serviceKey: 'Print & Packaging Design',
  },
  {
    icon: 'ri-lightbulb-flash-line',
    title: 'Brand Strategy',
    description: 'Research-driven positioning, messaging, and direction that gives your brand clarity, purpose, and competitive edge.',
    number: '06',
    accent: '#ef4444',
    accentTo: '#f97316',
    tag: 'Foundation',
    serviceKey: 'Creative Strategy & Consulting',
  },
];

const brandLogos = [
  'https://images.squarespace-cdn.com/content/v1/688d8b734aa1173915369520/a29bed02-0b74-403f-938c-9b3029194bd3/6.png',
  'https://images.squarespace-cdn.com/content/v1/688d8b734aa1173915369520/eb98b17e-55c3-452d-ac2e-a38640a9e0b5/5.png',
  'https://images.squarespace-cdn.com/content/v1/688d8b734aa1173915369520/5452c9cf-1d70-44b0-a818-05352d028bb1/13.png',
  'https://images.squarespace-cdn.com/content/v1/688d8b734aa1173915369520/959caa38-2413-4aae-858f-c441fbdb89c4/11.png',
  'https://images.squarespace-cdn.com/content/v1/688d8b734aa1173915369520/6268f91d-c402-4246-9e73-3f3730b963d8/18.png',
  'https://images.squarespace-cdn.com/content/v1/688d8b734aa1173915369520/ae8a4071-3c3d-422c-afc2-4b01cf92dfbe/17.png',
  'https://images.squarespace-cdn.com/content/v1/688d8b734aa1173915369520/a3bd23af-c2e3-424b-a343-c0b7bc954939/3.png',
  'https://images.squarespace-cdn.com/content/v1/688d8b734aa1173915369520/6052933e-0cc7-4b0b-b577-ea433e7c5032/BCN+Logo+Black.png',
  'https://images.squarespace-cdn.com/content/v1/688d8b734aa1173915369520/d442f3b5-ca91-4aa3-9f97-27e7eb08fd19/7.png',
  'https://images.squarespace-cdn.com/content/v1/688d8b734aa1173915369520/3e36beb1-37db-4279-bb88-61895b196ba5/2.png',
  'https://images.squarespace-cdn.com/content/v1/688d8b734aa1173915369520/ccda659b-fc19-412d-90f5-0e1b995c86f9/15.png',
  'https://images.squarespace-cdn.com/content/v1/688d8b734aa1173915369520/3f3c9682-e827-4f7f-8461-1f6b56f86c8a/26.png',
  'https://images.squarespace-cdn.com/content/v1/688d8b734aa1173915369520/cdbbdf3d-09b6-429f-818e-896a8038eaf9/19.png',
  'https://images.squarespace-cdn.com/content/v1/688d8b734aa1173915369520/6db9f49c-c7dd-49c9-a096-1146f4889f41/4.png',
  'https://images.squarespace-cdn.com/content/v1/688d8b734aa1173915369520/7a540044-7558-44d6-8a0e-f0b17b59c45a/16.png',
  'https://images.squarespace-cdn.com/content/v1/688d8b734aa1173915369520/0d9838b9-16b2-4c1e-b0c9-d6b836de4e19/12.png',
  'https://images.squarespace-cdn.com/content/v1/688d8b734aa1173915369520/9740dc97-ad2c-4d3d-a7c8-ade72cd1cf33/25.png',
  'https://images.squarespace-cdn.com/content/v1/688d8b734aa1173915369520/d72d2f24-5e9f-4b1d-9868-7770fb0143f1/22.png',
  'https://images.squarespace-cdn.com/content/v1/688d8b734aa1173915369520/62cb00d1-a4cf-46bf-b937-378d16ad4e4d/21.png',
  'https://images.squarespace-cdn.com/content/v1/688d8b734aa1173915369520/4e0b95a8-aa59-4b6e-bc2b-2eac701c03f1/10.png',
  'https://images.squarespace-cdn.com/content/v1/688d8b734aa1173915369520/2287630e-bbb8-4ffc-ae74-a684ff602756/eq+Client+Logos.png',
  'https://images.squarespace-cdn.com/content/v1/688d8b734aa1173915369520/fe584380-162c-495f-a7a8-e8948bb7e08f/9.png',
  'https://images.squarespace-cdn.com/content/v1/688d8b734aa1173915369520/4fa75ec5-92d8-4598-bf13-9b8ee2fa645e/24.png',
  'https://images.squarespace-cdn.com/content/v1/688d8b734aa1173915369520/29e31f50-a121-439b-a590-6de8e2e2459a/8.png',
  'https://images.squarespace-cdn.com/content/v1/688d8b734aa1173915369520/4c9af8da-0510-40c3-80fb-f38aa71509d0/20.png',
  'https://images.squarespace-cdn.com/content/v1/688d8b734aa1173915369520/402d7612-562e-4213-9475-12b35349884b/30.png',
  'https://images.squarespace-cdn.com/content/v1/688d8b734aa1173915369520/3d43b132-f2a1-490e-b17d-0ef03e1b61da/28.png',
  'https://images.squarespace-cdn.com/content/v1/688d8b734aa1173915369520/bf22171f-3e6f-4f1a-bb66-61d8c6bd0d89/29.png',
  'https://images.squarespace-cdn.com/content/v1/688d8b734aa1173915369520/b9b21554-6dd1-4d32-bbf4-9f5c2809bb84/23.png',
  'https://images.squarespace-cdn.com/content/v1/688d8b734aa1173915369520/71ba502e-7e0f-4a67-a2a3-726b2ef39eb4/1.png',
  'https://images.squarespace-cdn.com/content/v1/688d8b734aa1173915369520/ca36c015-dad0-4b1b-837f-4e6f4e133485/31.png',
  'https://images.squarespace-cdn.com/content/v1/688d8b734aa1173915369520/a9410217-703d-4a84-bc3a-c2ba41fe24f2/14.png',
  'https://images.squarespace-cdn.com/content/v1/688d8b734aa1173915369520/750f5b04-6825-4f27-84d6-fbc315a91779/27.png',
  '/images/7cc3752b-d99d-44c5-b528-340062dfaddc_33.png',
  '/images/bc0af254-98a5-47c0-8504-369f3554baf0_34.png',
  '/images/19064e88-64f6-4f3d-9ecb-9677e272b2e5_35.png',
  '/images/94eee4df-d1ec-49f3-b994-88b8523ef8f5_36.png',
  '/images/2259484d-46f9-4ca6-9da7-2fb0fffd26ca_37.png',
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

  /* Hero label pulse dot */
  @keyframes dot-ping {
    0% { transform: scale(1); opacity: 1; }
    75%, 100% { transform: scale(2.2); opacity: 0; }
  }
  .dot-ping { animation: dot-ping 1.8s cubic-bezier(0,0,0.2,1) infinite; }

  /* Logo marquee */
  @keyframes marquee-left {
    0% { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  @keyframes marquee-right {
    0% { transform: translateX(-50%); }
    100% { transform: translateX(0); }
  }
  .marquee-left {
    display: flex;
    width: max-content;
    animation: marquee-left 30s linear infinite;
    will-change: transform;
  }
  .marquee-right {
    display: flex;
    width: max-content;
    animation: marquee-right 30s linear infinite;
    will-change: transform;
  }
`;

export default function ServicesPage() {
  const navigate = useNavigate();
  const headerRef = useScrollReveal();
  const gridRef = useScrollReveal();
  const collectiveRef = useScrollReveal();

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

      <main className="relative z-10">

        {/* ══ HEADER ══ */}
        <div ref={headerRef} className="max-w-6xl mx-auto px-4 sm:px-6 pt-32 sm:pt-36 md:pt-40 pb-16 sm:pb-20 text-center">
          <div className="reveal-item scroll-reveal inline-flex items-center gap-3 mb-5">
            <span className="w-8 h-px bg-orange-500/50" />
            <span className="text-[10px] font-medium tracking-[0.3em] uppercase text-orange-400/80">
              Creative Services
            </span>
            <span className="w-8 h-px bg-orange-500/50" />
          </div>

          <h1 className="reveal-item scroll-reveal text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem] font-bold font-display tracking-tight mb-5 text-white leading-[1.1]">
            What We Do{' '}
            <span className="gradient-text-animated">Best</span>
          </h1>

          <p className="reveal-item scroll-reveal text-sm md:text-[15px] text-white/40 max-w-lg mx-auto leading-relaxed">
            From brand identity to digital strategy — everything your brand needs to stand out and move people.
          </p>
        </div>

        {/* ── thin separator ── */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
        </div>

        {/* ══ SERVICES GRID ══ */}
        <div ref={gridRef} className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20 md:py-24">
          <div className="reveal-item scroll-reveal flex items-center gap-3 mb-12">
            <span className="w-8 h-px bg-orange-500/50" />
            <span className="text-[10px] font-medium tracking-[0.3em] uppercase text-orange-400/80">
              Our Services
            </span>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
            {services.map((service, index) => (
              <div
                key={index}
                className="reveal-item scroll-reveal group relative rounded-2xl p-7 md:p-8 overflow-hidden cursor-pointer transition-all duration-500 hover:-translate-y-2"
                style={{
                  transitionDelay: `${index * 70}ms`,
                  background: 'linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))',
                  border: '1px solid rgba(255,255,255,0.07)',
                }}
                onClick={() => navigate(`/contact?service=${encodeURIComponent(service.serviceKey)}`)}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.borderColor = `${service.accent}55`;
                  el.style.background = `linear-gradient(145deg, ${service.accent}0d, ${service.accentTo}06)`;
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.borderColor = 'rgba(255,255,255,0.07)';
                  el.style.background = 'linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))';
                }}
              >
                <span
                  className="absolute -right-3 -bottom-5 text-[7rem] font-black leading-none select-none pointer-events-none font-display"
                  style={{
                    color: 'transparent',
                    WebkitTextStroke: `1px ${service.accent}22`,
                    opacity: 0.6,
                  }}
                >
                  {service.number}
                </span>

                <div
                  className="absolute top-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-t-2xl"
                  style={{ background: `linear-gradient(to right, ${service.accent}, ${service.accentTo})` }}
                />

                {service.tag && (
                  <div
                    className="absolute top-4 right-4 px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase"
                    style={{ background: `${service.accent}22`, border: `1px solid ${service.accent}44`, color: service.accent }}
                  >
                    {service.tag}
                  </div>
                )}

                <div
                  className="relative z-10 w-12 h-12 flex items-center justify-center rounded-xl mb-6 transition-all duration-400 group-hover:scale-110"
                  style={{ background: `${service.accent}18`, border: `1px solid ${service.accent}30` }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.background = `linear-gradient(135deg, ${service.accent}, ${service.accentTo})`;
                    el.style.border = 'none';
                    el.style.boxShadow = `0 8px 24px ${service.accent}44`;
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.background = `${service.accent}18`;
                    el.style.border = `1px solid ${service.accent}30`;
                    el.style.boxShadow = 'none';
                  }}
                >
                  <i className={`${service.icon} text-xl`} style={{ color: service.accent }} />
                </div>

                <h3 className="relative z-10 text-base md:text-lg font-bold font-display text-white mb-3 leading-tight">
                  {service.title}
                </h3>

                <p className="relative z-10 text-xs sm:text-[13px] text-white/40 leading-relaxed group-hover:text-white/60 transition-colors duration-400">
                  {service.description}
                </p>

                <div className="relative z-10 mt-7 flex items-center gap-2 opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-300">
                  <span className="text-xs font-semibold" style={{ color: service.accent }}>Get started</span>
                  <i className="ri-arrow-right-line text-sm" style={{ color: service.accent }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── thin separator ── */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
        </div>

        {/* ══ HUNA COLLECTIVE ══ */}
        <div ref={collectiveRef} className="py-16 sm:py-20 md:py-24">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="reveal-item scroll-reveal flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-12">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <span className="w-8 h-px bg-orange-500/50" />
                  <span className="text-[10px] font-medium tracking-[0.3em] uppercase text-orange-400/80">
                    Past Experience
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold font-display text-white leading-tight">
                  The Huna <span className="gradient-text-animated">Collective.</span>
                </h2>
              </div>
              <p className="text-white/30 text-xs max-w-[420px] leading-relaxed sm:text-right" style={{ textWrap: 'balance' } as React.CSSProperties}>
                A curated collection of brands our team members have contributed to through freelance, in-house, and independent work.
              </p>
            </div>
          </div>

          {/* 2-row marquee — full bleed */}
          <div className="relative overflow-hidden space-y-4">
            <div className="absolute inset-y-0 left-0 w-32 z-10 pointer-events-none" style={{ background: 'linear-gradient(to right, #0a0a0a 40%, transparent)' }} />
            <div className="absolute inset-y-0 right-0 w-32 z-10 pointer-events-none" style={{ background: 'linear-gradient(to left, #0a0a0a 40%, transparent)' }} />

            <div className="overflow-hidden">
              <div className="marquee-left">
                {[...brandLogos.slice(0, 19), ...brandLogos.slice(0, 19)].map((src, i) => (
                  <div key={i} className="flex items-center justify-center mx-6 flex-shrink-0 w-28 h-20 cursor-pointer">
                    <img src={src} alt={`Brand logo ${i + 1}`} className="w-full h-full object-contain opacity-30 hover:opacity-70 transition-opacity duration-300" style={{ filter: 'invert(1)' }} />
                  </div>
                ))}
              </div>
            </div>

            <div className="overflow-hidden">
              <div className="marquee-right">
                {[...brandLogos.slice(19), ...brandLogos.slice(19)].map((src, i) => (
                  <div key={i} className="flex items-center justify-center mx-6 flex-shrink-0 w-28 h-20 cursor-pointer">
                    <img src={src} alt={`Brand logo ${i + 20}`} className="w-full h-full object-contain opacity-30 hover:opacity-70 transition-opacity duration-300" style={{ filter: 'invert(1)' }} />
                  </div>
                ))}
              </div>
            </div>
          </div>


        </div>

        {/* ── thin separator ── */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
        </div>

        {/* ══ CTA ══ */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20 md:py-28">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8 md:gap-16">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="w-8 h-px bg-orange-500/50" />
                <span className="text-[10px] font-medium tracking-[0.3em] uppercase text-orange-400/80">
                  Let&apos;s Create
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold font-display text-white leading-tight mb-3">
                Have a project in mind?<br />
                <span className="gradient-text-animated">Let&apos;s talk.</span>
              </h2>
              <p className="text-sm text-white/40 max-w-sm leading-relaxed">
                Not sure where to start? Reach out anyway — we&apos;ll figure out the right fit together.
              </p>
            </div>

            <div className="flex flex-col gap-3 shrink-0">
              <button
                onClick={() => navigate('/contact')}
                className="px-10 py-3.5 bg-gradient-brand text-white font-semibold font-display rounded-full transition-all duration-300 hover:shadow-2xl hover:shadow-orange-500/40 hover:scale-105 whitespace-nowrap cursor-pointer text-sm"
              >
                Get Started
              </button>
              <a
                href="https://calendly.com/hunacreatives/30min"
                target="_blank"
                rel="nofollow noreferrer"
                className="px-10 py-3.5 rounded-full text-sm font-semibold font-display border border-orange-400/40 text-orange-400 hover:bg-orange-500/10 transition-all duration-300 hover:scale-105 whitespace-nowrap cursor-pointer flex items-center justify-center gap-2"
              >
                <i className="ri-calendar-line text-base" />
                Book a Free Call
              </a>
            </div>
          </div>
        </div>

      </main>

      <Footer isDark />
      <style>{pageStyles}</style>
    </div>
  );
}
