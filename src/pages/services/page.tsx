import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../../components/feature/Navigation';
import Footer from '../home/components/Footer';
import { useSEO } from '../../hooks/useSEO';

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
    startingFrom: '$1,500',
    startingFromPH: '₱25,000',
  },
  {
    icon: 'ri-layout-line',
    title: 'Web Design & Development',
    description: 'Beautiful, responsive websites built to convert visitors into customers and reflect the quality of your brand.',
    number: '02',
    accent: '#ef4444',
    accentTo: '#fb7185',
    tag: null,
    serviceKey: 'Website Design & Development',
    startingFrom: '$4,500',
    startingFromPH: '₱60,000',
  },
  {
    icon: 'ri-bar-chart-grouped-line',
    title: 'Social Media Marketing',
    description: 'Strategic content and campaigns that grow your audience, build community, and keep your brand top of mind.',
    number: '03',
    accent: '#fb7185',
    accentTo: '#f97316',
    tag: null,
    serviceKey: 'Social Media Management',
    startingFrom: '$800/mo',
    startingFromPH: '₱18,000/mo',
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
    startingFrom: '$1,200/mo',
    startingFromPH: '₱20,000/mo',
  },
  {
    icon: 'ri-printer-line',
    title: 'Print & Packaging Design',
    description: 'Business cards, brochures, and packaging that make a tangible impression and reinforce your brand identity.',
    number: '05',
    accent: '#f97316',
    accentTo: '#fbbf24',
    tag: null,
    serviceKey: 'Print & Collateral Design',
    startingFrom: '$900',
    startingFromPH: '₱15,000',
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
    startingFrom: '$3,000',
    startingFromPH: '₱45,000',
  },
];


const testimonials = [
  {
    quote: "Huna Creatives didn't just design a logo — they gave The Second Haus a soul. Every detail, from the color palette to the hang tags, feels like it was made with so much care. I couldn't be happier.",
    author: 'Angelica L.',
    role: 'Founder, The Second Haus',
    accent: '#f97316',
  },
  {
    quote: "I've worked with a lot of agencies and no one has come close to what Huna Creatives delivered. They understood the prestige of the equestrian world immediately and created content that truly speaks to our buyers. Absolutely blown away.",
    author: 'Beata W.',
    role: 'Equestrian International',
    accent: '#ef4444',
  },
  {
    quote: "Our social media presence completely transformed. Engagement went up and our feed finally looks as premium as our product. The team is responsive, creative, and genuinely invested.",
    author: 'Blue Collar Nutrition',
    role: 'Social Media Client',
    accent: '#fbbf24',
  },
];

const brandLogos = [
  '/images/services-work-06.webp',
  '/images/services-work-05.webp',
  '/images/services-work-13.webp',
  '/images/services-work-11.webp',
  '/images/services-work-18.webp',
  '/images/services-work-17.webp',
  '/images/services-work-03.webp',
  '/images/portfolio-bcn-logo.webp',
  '/images/services-work-07.webp',
  '/images/services-work-02.webp',
  '/images/services-work-15.webp',
  '/images/services-work-26.webp',
  '/images/services-work-19.webp',
  '/images/services-work-04.webp',
  '/images/services-work-16.webp',
  '/images/services-work-12.webp',
  '/images/services-work-25.webp',
  '/images/services-work-22.webp',
  '/images/services-work-21.webp',
  '/images/services-work-10.webp',
  '/images/services-eq-client-logos.webp',
  '/images/services-work-09.webp',
  '/images/services-work-24.webp',
  '/images/services-work-08.webp',
  '/images/services-work-20.webp',
  '/images/services-work-30.webp',
  '/images/services-work-28.webp',
  '/images/services-work-29.webp',
  '/images/services-work-23.webp',
  '/images/services-work-01.webp',
  '/images/services-work-31.webp',
  '/images/services-work-14.webp',
  '/images/services-work-27.webp',
  '/images/7cc3752b-d99d-44c5-b528-340062dfaddc_33.png',
  '/images/bc0af254-98a5-47c0-8504-369f3554baf0_34.png',
  '/images/19064e88-64f6-4f3d-9ecb-9677e272b2e5_35.png',
  '/images/94eee4df-d1ec-49f3-b994-88b8523ef8f5_36.png',
  '/images/2259484d-46f9-4ca6-9da7-2fb0fffd26ca_37.png',
];

const pageStyles = `
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
  useSEO({
    title: 'Creative Services — Branding, Social Media & Web Design',
    description:
      'Brand identity design, social media content creation, email marketing design, and website visuals for premium brands. Strategy-led creative from Huna Creatives.',
    canonical: '/services',
    schema: [
      {
        '@context': 'https://schema.org',
        '@type': 'Service',
        '@id': 'https://www.hunacreatives.com/services/#service',
        name: 'Creative Design Services',
        provider: { '@id': 'https://www.hunacreatives.com/#organization' },
        serviceType: 'Creative Agency Services',
        areaServed: [
          { '@type': 'Country', name: 'Philippines' },
          { '@type': 'Country', name: 'United States' },
        ],
        hasOfferCatalog: {
          '@type': 'OfferCatalog',
          name: 'Huna Creatives Services',
          itemListElement: [
            { '@type': 'Offer', name: 'Brand Identity & Logo Design' },
            { '@type': 'Offer', name: 'Social Media Content Creation' },
            { '@type': 'Offer', name: 'Email Marketing Design' },
            { '@type': 'Offer', name: 'Website Visual Design' },
            { '@type': 'Offer', name: 'Content Creation & Photography' },
            { '@type': 'Offer', name: 'Brand Strategy' },
          ],
        },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'What services does Huna Creatives offer?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Huna Creatives offers brand identity design, social media content creation, email marketing design, website visual design, print and packaging design, and brand strategy consulting.',
            },
          },
          {
            '@type': 'Question',
            name: 'Do you work with clients outside the Philippines?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Yes. Huna Creatives works with businesses across the US and globally. Our team operates Monday through Friday, 10 AM to 8 PM EST.',
            },
          },
          {
            '@type': 'Question',
            name: 'What industries does Huna Creatives specialize in?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'We have proven work in equestrian, mortgage, pediatric dentistry, and sports nutrition. We take on select clients in other industries where we can produce genuine creative impact.',
            },
          },
        ],
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.hunacreatives.com' },
          { '@type': 'ListItem', position: 2, name: 'Services', item: 'https://www.hunacreatives.com/services' },
        ],
      },
    ],
  });

  const navigate = useNavigate();
  const [market, setMarket] = useState<'ph' | 'intl' | null>(null);

  useEffect(() => {
    fetch('https://ipapi.co/json/')
      .then(r => r.json())
      .then(d => setMarket(d.country_code === 'PH' ? 'ph' : 'intl'))
      .catch(() => setMarket('intl'));
  }, []);

  const isPH = market === 'ph';
  const priceFor = (s: typeof services[0]) => isPH ? s.startingFromPH : s.startingFrom;

  return (
    <div className="relative min-h-screen text-white font-body" style={{ background: '#080c14' }}>
      <Navigation />

      {/* ── Static ambient background ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-0 right-1/4 w-[28rem] h-[28rem] bg-orange-600/8 rounded-full blur-[130px]" />
        <div className="absolute bottom-1/4 right-0 w-72 h-72 bg-rose-600/6 rounded-full blur-[100px]" />
      </div>

      <main className="relative z-10">

        {/* ══ HEADER ══ */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-32 sm:pt-36 md:pt-40 pb-16 sm:pb-20 text-center">
          <div className="inline-flex items-center gap-3 mb-5">
            <span className="text-[10px] font-medium tracking-[0.3em] uppercase text-orange-400/80">
              Creative Services
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem] font-bold font-display tracking-tight mb-5 text-white leading-[1.1]">
            Brands that turn{' '}
            <span className="gradient-text-animated">heads.</span>
          </h1>

          <p className="text-sm md:text-[15px] text-gray-400 max-w-lg mx-auto leading-relaxed mb-8">
            We build brands people remember — from the first logo to a full creative system. Strategy-led, obsessively crafted, built to last.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-gray-500">
            <span className="flex items-center gap-1.5"><i className="ri-check-line text-orange-500" />Custom quote in 24 hrs</span>
            <span className="flex items-center gap-1.5"><i className="ri-check-line text-orange-500" />No hidden fees</span>
            <span className="flex items-center gap-1.5"><i className="ri-check-line text-orange-500" />Satisfaction guaranteed</span>
          </div>
        </div>

        {/* ── thin separator ── */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
        </div>

        {/* ══ SERVICES GRID ══ */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20 md:py-24">
          <div className="flex items-center gap-3 mb-12">
            <span className="text-[10px] font-medium tracking-[0.3em] uppercase text-orange-400/80">
              Our Services
            </span>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
            {services.map((service, index) => (
              <div
                key={index}
                className="group relative rounded-2xl p-7 md:p-8 overflow-hidden cursor-pointer transition-all duration-500 hover:-translate-y-2 flex flex-col"
                style={{
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

                <p className="relative z-10 text-xs sm:text-[13px] text-gray-500 leading-relaxed group-hover:text-gray-400 transition-colors duration-400 flex-1">
                  {service.description}
                </p>

                <div className="relative z-10 mt-6 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-gray-600">
                    {market === null ? (
                      <span className="inline-block w-16 h-3 rounded bg-white/10 animate-pulse" />
                    ) : (
                      <>Starting from <span style={{ color: service.accent }}>{priceFor(service)}</span></>
                    )}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs font-semibold opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0 transition-all duration-300" style={{ color: service.accent }}>
                    Get a quote <i className="ri-arrow-right-line text-sm" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ══ TESTIMONIALS ══ */}
        <div className="w-full border-t border-white/5" style={{ background: '#0d1829' }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20 md:py-24">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-[10px] font-medium tracking-[0.3em] uppercase text-[#FF6B35]">
                Client Words
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold font-display text-white leading-tight mb-14">
              What clients say.
            </h2>

            <div className="grid sm:grid-cols-3 gap-5 md:gap-6">
              {testimonials.map((t, i) => (
                <div
                  key={i}
                  className="rounded-xl p-6 md:p-7 flex flex-col bg-white/3 border border-white/8"
                >
                  <i className="ri-double-quotes-l text-2xl mb-4" style={{ color: `${t.accent}80` }} />
                  <p className="text-sm text-gray-400 leading-relaxed flex-1 mb-6">"{t.quote}"</p>
                  <div>
                    <div className="text-sm font-bold text-white">{t.author}</div>
                    <div className="text-[11px] text-gray-500 mt-0.5">{t.role}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ══ ORANGE BREAK + COLLECTIVE ══ */}
        <div className="relative overflow-hidden" style={{ background: '#FF6B35' }}>
          {/* CTA text */}
          <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-12 pb-8 text-center relative">
            <p className="text-xs font-semibold text-white/60 uppercase tracking-widest mb-2">Let's get to work</p>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-3 leading-tight">
              Your brand deserves to turn heads.
            </h2>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-5">
              <button
                onClick={() => navigate('/contact')}
                className="inline-flex items-center gap-2 px-7 py-3 rounded-lg font-semibold text-sm text-[#FF6B35] bg-white hover:bg-white/90 transition-all duration-200 cursor-pointer"
                style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}
              >
                Start a Project
                <i className="ri-arrow-right-line text-base" />
              </button>
              <span className="text-white/60 text-xs">Free consultation · No commitment</span>
            </div>
          </div>

          {/* Marquee */}
          <div className="overflow-hidden space-y-3 pb-10">
            <div className="overflow-hidden">
              <div className="marquee-left">
                {[...brandLogos.slice(0, 19), ...brandLogos.slice(0, 19)].map((src, i) => (
                  <div key={i} className="flex items-center justify-center mx-5 flex-shrink-0 w-24 h-16 cursor-pointer">
                    <img src={src} alt="Client brand logo" className="w-full h-full object-contain opacity-40 hover:opacity-80 transition-opacity duration-300" loading="lazy" style={{ filter: 'brightness(0) invert(1)' }} />
                  </div>
                ))}
              </div>
            </div>
            <div className="overflow-hidden">
              <div className="marquee-right">
                {[...brandLogos.slice(19), ...brandLogos.slice(19)].map((src, i) => (
                  <div key={i} className="flex items-center justify-center mx-5 flex-shrink-0 w-24 h-16 cursor-pointer">
                    <img src={src} alt={`Brand logo ${i + 20}`} className="w-full h-full object-contain opacity-40 hover:opacity-80 transition-opacity duration-300" loading="lazy" style={{ filter: 'brightness(0) invert(1)' }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </main>

      {/* ── Sentro OS Spotlight ── */}
      <section className="relative px-6 py-20 border-t border-white/5 overflow-hidden" style={{ background: '#080c14' }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 80% at 80% 50%, rgba(255,107,53,0.07) 0%, transparent 70%)' }} />
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center gap-10 lg:gap-16 relative">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-[#FF6B35] uppercase tracking-widest mb-3">Also from Huna Creatives</p>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-4 leading-tight">
              Need an internal ops hub<br className="hidden sm:block" /> for your team?
            </h2>
            <p className="text-gray-400 text-base leading-relaxed mb-6 max-w-lg">
              <span className="text-white font-semibold">Sentro OS</span> is a custom-built internal operations platform — attendance, payroll, documents, credentials, and more. Built around your exact workflow and branded as your own.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href="/sentro"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm text-white transition-all"
                style={{ background: 'linear-gradient(135deg, #FF6B35, #e55a27)', boxShadow: '0 0 24px rgba(255,107,53,0.35)' }}>
                See Sentro OS →
              </a>
              <a href="/sentro#pricing"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm text-gray-400 border border-white/10 hover:bg-white/5 transition-all">
                View pricing
              </a>
            </div>
          </div>
          <div className="flex-shrink-0 grid grid-cols-2 gap-3 w-full lg:w-auto lg:max-w-xs">
            {[
              { icon: 'ri-time-line', label: 'Attendance tracking' },
              { icon: 'ri-money-dollar-circle-line', label: 'Payroll & payouts' },
              { icon: 'ri-file-list-3-line', label: 'Document signing' },
              { icon: 'ri-building-line', label: 'Client & projects' },
              { icon: 'ri-shield-keyhole-line', label: 'Credentials vault' },
              { icon: 'ri-calendar-check-line', label: 'Time-off & overtime' },
            ].map(f => (
              <div key={f.label} className="flex items-center gap-2.5 bg-white/3 border border-white/8 rounded-xl px-3 py-2.5">
                <i className={`${f.icon} text-[#FF6B35] text-sm flex-shrink-0`}></i>
                <span className="text-xs text-gray-300 font-medium">{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer isDark />
      <style>{pageStyles}</style>
    </div>
  );
}
