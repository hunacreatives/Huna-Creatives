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
    tag: 'Most Popular',
    serviceKey: 'Brand Identity & Logo Design',
    startingFrom: '$1,500',
    startingFromPH: '₱35,000',
  },
  {
    icon: 'ri-layout-line',
    title: 'Web Design & Development',
    description: 'Beautiful, responsive websites built to convert visitors into customers and reflect the quality of your brand.',
    tag: null,
    serviceKey: 'Website Design',
    startingFrom: '$4,500',
    startingFromPH: '₱60,000',
  },
  {
    icon: 'ri-bar-chart-grouped-line',
    title: 'Social Media Marketing',
    description: 'Strategic content and campaigns that grow your audience, build community, and keep your brand top of mind.',
    tag: null,
    serviceKey: 'Digital Design (Social Media, Ads)',
    startingFrom: '$800/mo',
    startingFromPH: '₱10,000/mo',
  },
  {
    icon: 'ri-camera-line',
    title: 'Content Creation',
    description: 'Photos, videos, and copy crafted to tell your brand story in a way that resonates and drives action.',
    tag: null,
    serviceKey: 'Content Creation & Photography',
    startingFrom: '$1,200/mo',
    startingFromPH: '₱20,000/mo',
  },
  {
    icon: 'ri-printer-line',
    title: 'Print & Packaging Design',
    description: 'Business cards, brochures, and packaging that make a tangible impression and reinforce your brand identity.',
    tag: null,
    serviceKey: 'Print & Packaging Design',
    startingFrom: '$900',
    startingFromPH: '₱15,000',
  },
  {
    icon: 'ri-lightbulb-flash-line',
    title: 'Brand Strategy',
    description: 'Research-driven positioning, messaging, and direction that gives your brand clarity, purpose, and competitive edge.',
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
    service: 'Branding & Logo Design',
    links: ['https://www.instagram.com/thesecondhaus/'],
  },
  {
    quote: "I've worked with a lot of agencies and no one has come close to what Huna Creatives delivered. They understood the prestige of the equestrian world immediately and created content that truly speaks to our buyers. Absolutely blown away.",
    author: 'Beata W.',
    role: 'Equestrian International',
    service: 'Social Media Management',
    links: ['https://www.instagram.com/equestrianinternational/'],
  },
  {
    quote: "Our social media presence completely transformed. Engagement went up and our feed finally looks as premium as our product. The team is responsive, creative, and genuinely invested.",
    author: 'Victor R.',
    role: 'Blue Collar Nutrition',
    service: 'Digital Marketing',
    links: ['https://www.instagram.com/bluecollarnutrition_/', 'https://blue-collarnutrition.com/'],
  },
  {
    quote: "What stood out most was how they brought together all the ideas and details I was thinking of, even the ones that were difficult to put into words. They were responsive, creative, and genuinely invested in making sure the final website reflected what we wanted.",
    author: 'Fretz S.',
    role: 'FS Architects',
    service: 'Website Design',
    links: ['https://www.instagram.com/fsarchitects.ph/', 'https://fsarchitects.ph/'],
  },
  {
    quote: "What really surprised me was how closely they captured what I had envisioned. They didn't just build what we asked for — they understood the idea behind it and brought it to life in a way that exceeded my expectations. As an architect, I'm very particular about design and execution, and I can confidently say they delivered.",
    author: 'Jonathan C.',
    role: 'Owner, Obra Majoralia',
    service: 'Website Design',
    links: ['https://www.instagram.com/obramajoralia/', 'https://obramajoralia.com/'],
  },
  {
    quote: "Huna helped us with our coffee shop's branding expansion — merchandise, table napkins, bean bags, and all the small details in between. They really understood the vision we had for the brand, and I was impressed by how they brought everything together and made the whole experience feel cohesive.",
    author: 'Dan H.',
    role: 'Owner, Peak Coffee Roasters',
    service: 'Brand Expansion & Merch',
    links: ['https://www.instagram.com/peakcoffeeroastersph/'],
  },
];

// Derives the right icon + readable label from a testimonial's link, so an
// Instagram profile shows an Instagram glyph and @handle while a company site
// shows a globe and its domain — rather than one generic external-link icon.
function linkMeta(url: string) {
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    const path = u.pathname.replace(/\//g, '');
    if (host.endsWith('instagram.com')) {
      return { icon: 'ri-instagram-line', label: path ? `@${path}` : 'Instagram' };
    }
    if (host.endsWith('facebook.com')) {
      return { icon: 'ri-facebook-circle-line', label: path || 'Facebook' };
    }
    if (host.endsWith('linkedin.com')) {
      return { icon: 'ri-linkedin-box-line', label: 'LinkedIn' };
    }
    if (host.endsWith('tiktok.com')) {
      return { icon: 'ri-tiktok-line', label: path || 'TikTok' };
    }
    return { icon: 'ri-global-line', label: host };
  } catch {
    return null;
  }
}

// Same frosted-glass recipe as the homepage's HighlightTiles "light" tiles.
const glassCardStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.45)',
  backdropFilter: 'blur(20px) saturate(160%)',
  WebkitBackdropFilter: 'blur(20px) saturate(160%)',
  border: '1px solid rgba(255,255,255,0.6)',
  boxShadow: '0 8px 32px rgba(36,48,55,0.08), inset 0 1px 0 rgba(255,255,255,0.5)',
};

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
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  useEffect(() => {
    fetch('https://ipapi.co/json/')
      .then(r => r.json())
      .then(d => setMarket(d.country_code === 'PH' ? 'ph' : 'intl'))
      .catch(() => setMarket('intl'));
  }, []);

  // Depending on `activeTestimonial` restarts the timer whenever the quote
  // changes — including when the reader picks one via the dots. Without that,
  // the interval kept its original schedule and could fire moments after a
  // click, skipping straight past the testimonial that was just selected.
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial((i) => (i + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [activeTestimonial]);

  // Typewriter cycling through each service title, for the "what can we do
  // for you" billboard copy in the hero glass panel.
  const [typedText, setTypedText] = useState('');
  const [typeWordIdx, setTypeWordIdx] = useState(0);
  const [typeDeleting, setTypeDeleting] = useState(false);

  useEffect(() => {
    const word = services[typeWordIdx].title;

    if (!typeDeleting && typedText === word) {
      const t = setTimeout(() => setTypeDeleting(true), 1400);
      return () => clearTimeout(t);
    }
    if (typeDeleting && typedText === '') {
      setTypeDeleting(false);
      setTypeWordIdx((i) => (i + 1) % services.length);
      return;
    }
    const t = setTimeout(() => {
      setTypedText((prev) => (typeDeleting ? word.slice(0, prev.length - 1) : word.slice(0, prev.length + 1)));
    }, typeDeleting ? 30 : 60);
    return () => clearTimeout(t);
  }, [typedText, typeDeleting, typeWordIdx]);

  const isPH = market === 'ph';
  const priceFor = (s: typeof services[0]) => isPH ? s.startingFromPH : s.startingFrom;
  const featured = services[0];

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-[#243037] font-body">
      <Navigation invertOnScroll />

      {/* Same continuous orb field used on Home/About — one wrapper spanning
          the whole page, sections nested inside so the glass cards pick up
          the color behind them. */}
      <div className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute top-[-15%] -left-[15%] w-[900px] h-[900px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(255,91,5,0.16), transparent 72%)', filter: 'blur(70px)', animation: 'orb-float-a 22s ease-in-out infinite' }}
        />
        <div
          className="pointer-events-none absolute top-[6%] -right-[15%] w-[820px] h-[820px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(7,80,86,0.4), transparent 72%)', filter: 'blur(70px)', animation: 'orb-float-b 26s ease-in-out infinite' }}
        />
        <div
          className="pointer-events-none absolute top-[28%] left-[38%] w-[620px] h-[620px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(211,221,222,0.5), transparent 72%)', filter: 'blur(70px)', animation: 'orb-float-c 20s ease-in-out infinite' }}
        />
        <div
          className="pointer-events-none absolute top-[48%] -left-[10%] w-[760px] h-[760px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(7,80,86,0.4), transparent 72%)', filter: 'blur(70px)', animation: 'orb-float-c 24s ease-in-out infinite' }}
        />
        <div
          className="pointer-events-none absolute top-[68%] right-[5%] w-[900px] h-[900px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(255,138,71,0.18), transparent 72%)', filter: 'blur(70px)', animation: 'orb-float-d 28s ease-in-out infinite' }}
        />
        <div
          className="pointer-events-none absolute top-[80%] left-[8%] w-[560px] h-[560px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(7,80,86,0.32), transparent 72%)', filter: 'blur(70px)', animation: 'orb-float-b 23s ease-in-out infinite' }}
        />
        <div
          className="pointer-events-none absolute top-[92%] left-1/3 w-[850px] h-[850px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(7,80,86,0.34), transparent 72%)', filter: 'blur(70px)', animation: 'orb-float-a 25s ease-in-out infinite' }}
        />

        {/* ═══ HERO — big headline left, trust-checks below ═══ */}
        <section className="relative pt-24 sm:pt-28 pb-10">
          {/* Centred on mobile — left-aligned copy left a wide dead zone on the
              right of a phone screen. Reverts to left alignment from sm up. */}
          <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center sm:text-left">
            <h1 className="text-3xl sm:text-2xl md:text-3xl lg:text-4xl font-bold font-display leading-tight text-[#243037]">
              Brands that<br />turn <span className="text-[#FF5B05]">heads.</span>
            </h1>
            <div className="flex flex-col items-center sm:flex-row sm:flex-wrap gap-3 sm:gap-6 text-[13px] sm:text-xs text-[#243037]/50 mt-7 sm:mt-8">
              <span className="flex items-center gap-2"><i className="ri-check-line text-[#FF5B05]" />Custom quote in 24 hrs</span>
              <span className="flex items-center gap-2"><i className="ri-check-line text-[#FF5B05]" />No hidden fees</span>
              <span className="flex items-center gap-2"><i className="ri-check-line text-[#FF5B05]" />Satisfaction guaranteed</span>
            </div>
          </div>
        </section>

        {/* ═══ Glass panel with team photo + overlapping featured-service card ═══ */}
        <section className="relative px-4 sm:px-6 lg:px-8 pb-16 sm:pb-20">
          <div className="max-w-6xl mx-auto">
            <div className="relative h-[340px] sm:h-[380px]">
              {/* Glass blob panel */}
              <div
                className="absolute inset-0 rounded-3xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(160,180,205,0.55), rgba(205,215,225,0.3))',
                  backdropFilter: 'blur(30px) saturate(160%)',
                  WebkitBackdropFilter: 'blur(30px) saturate(160%)',
                  border: '1px solid rgba(255,255,255,0.5)',
                  boxShadow: '0 20px 60px rgba(36,48,55,0.12), inset 0 1px 0 rgba(255,255,255,0.5)',
                }}
              />
              {/* "What can we do for you" copy — typewriter cycling through
                  each service title, filling the empty left side of the panel */}
              <div className="absolute left-0 top-0 bottom-0 w-[58%] sm:w-[50%] flex flex-col justify-center pl-5 sm:pl-10 pr-2 sm:pr-6 z-10">
                <p className="text-[11px] font-medium tracking-[0.3em] uppercase text-[#075056] mb-3">What we do</p>
                <h3 className="font-display font-bold text-xl sm:text-2xl lg:text-3xl leading-tight text-[#243037] min-h-[2.6em] sm:min-h-[2.4em]">
                  {typedText}
                  <span className="inline-block w-[3px] h-[0.85em] bg-[#FF5B05] ml-0.5 align-middle animate-pulse" />
                </h3>
                <p className="hidden sm:block text-sm text-[#243037]/60 leading-relaxed max-w-xs mt-4">
                  Whatever your brand needs, we build it with care — strategy-led, obsessively crafted, made to last.
                </p>
              </div>
              {/* Team photo — cut out, no background, overlapping above the glass panel */}
              <img
                src="/images/services-team-photo.png"
                alt="The Huna Creatives team"
                className="absolute -right-4 sm:right-4 bottom-0 h-[95%] sm:h-[128%] w-auto object-contain object-bottom pointer-events-none select-none"
              />
            </div>

            <div
              className="relative -mt-20 sm:-mt-24 mx-auto max-w-2xl sm:max-w-3xl rounded-3xl p-6 sm:p-8"
              style={{ ...glassCardStyle, background: 'rgba(255,255,255,0.72)' }}
            >
              <h3 className="font-display text-xl sm:text-2xl font-bold text-[#243037] mb-2">{featured.title}</h3>
              <p className="text-[15px] sm:text-sm text-[#243037]/60 leading-relaxed max-w-xl mb-6">{featured.description}</p>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p className="text-2xl sm:text-3xl font-display font-bold text-[#243037]">
                    {market === null ? (
                      <span className="inline-block w-24 h-6 rounded bg-[#243037]/10 animate-pulse" />
                    ) : priceFor(featured)}
                  </p>
                  <p className="text-[11px] text-[#243037]/40">Starting price</p>
                </div>
                <button
                  onClick={() => navigate(`/contact?service=${encodeURIComponent(featured.serviceKey)}`)}
                  className="w-full sm:w-auto px-7 py-3.5 sm:py-3 rounded-full text-[13px] sm:text-xs font-semibold tracking-widest uppercase text-white whitespace-nowrap cursor-pointer transition-transform duration-300 hover:scale-105"
                  style={{ background: 'linear-gradient(135deg, #FF5B05, #FF8A47)', boxShadow: '0 6px 24px rgba(255,91,5,0.35)' }}
                >
                  Get a Quote
                </button>
              </div>

              {/* Slim stat strip, standing in for the reference's wave-chart panel */}
              <div className="mt-6 pt-6 border-t border-[#243037]/8 grid grid-cols-3 sm:flex sm:items-center sm:gap-8">
                <div>
                  <p className="font-display text-lg font-bold text-[#243037]">100+</p>
                  <p className="text-[11px] sm:text-[10px] text-[#243037]/40 uppercase tracking-wide">Projects</p>
                </div>
                <div>
                  <p className="font-display text-lg font-bold text-[#243037]">38+</p>
                  <p className="text-[11px] sm:text-[10px] text-[#243037]/40 uppercase tracking-wide">Brands Built</p>
                </div>
                <div>
                  <p className="font-display text-lg font-bold text-[#243037]">3+</p>
                  <p className="text-[11px] sm:text-[10px] text-[#243037]/40 uppercase tracking-wide">Years</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ SERVICES GRID — 6 items, 2×3 ═══ */}
        <section id="services" className="relative px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <div className="max-w-6xl mx-auto">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#243037] mb-2">Our Services.</h2>
            <p className="text-[15px] sm:text-sm text-[#243037]/50 mb-8 sm:mb-10">Pick a service below to see pricing and get a quote.</p>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {services.map((service) => (
                <button
                  key={service.title}
                  onClick={() => navigate(`/contact?service=${encodeURIComponent(service.serviceKey)}`)}
                  className="group relative rounded-2xl p-6 sm:p-7 text-left cursor-pointer transition-all duration-500 hover:-translate-y-1.5 flex flex-col"
                  style={glassCardStyle}
                >
                  {service.tag && (
                    <span className="absolute top-5 right-5 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[9px] font-bold tracking-wider uppercase text-[#FF5B05] bg-[#FF5B05]/10 border border-[#FF5B05]/20">
                      {service.tag}
                    </span>
                  )}
                  <div
                    className="w-12 h-12 flex items-center justify-center rounded-xl mb-6 transition-transform duration-300 group-hover:scale-110"
                    style={{
                      background: 'linear-gradient(135deg, rgba(7,80,86,0.72), rgba(15,106,112,0.55))',
                      backdropFilter: 'blur(12px) saturate(180%)',
                      WebkitBackdropFilter: 'blur(12px) saturate(180%)',
                      border: '1px solid rgba(255,255,255,0.35)',
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.45), 0 4px 14px rgba(7,80,86,0.2)',
                    }}
                  >
                    <i className={`${service.icon} text-xl text-white`} />
                  </div>
                  <h3 className="font-display text-base sm:text-lg font-bold text-[#243037] mb-2 leading-tight">{service.title}</h3>
                  <p className="text-[13px] text-[#243037]/55 leading-relaxed flex-1">{service.description}</p>
                  <div className="mt-6 flex items-center justify-between">
                    <span className="text-xs sm:text-[11px] font-semibold text-[#243037]/50">
                      {market === null ? (
                        <span className="inline-block w-16 h-3 rounded bg-[#243037]/10 animate-pulse" />
                      ) : (
                        <>From <span className="text-[#075056]">{priceFor(service)}</span></>
                      )}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-[#075056] opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:translate-x-1 sm:group-hover:translate-x-0 transition-all duration-300">
                      Get a quote <i className="ri-arrow-right-line text-sm" />
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ CTA — bold color panel, not another white glass card, to
              break up the page's otherwise-white rhythm ═══ */}
        <section className="relative px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <div
            className="max-w-4xl mx-auto rounded-3xl p-8 sm:p-14 text-center relative overflow-hidden"
            style={{
              // "Gradient Cloud" from the palette — soft, shifting orange→yellow
              // blend, dialed back to translucent + a white sheen layer on
              // top so it still reads as frosted glass, not a flat color fill.
              background: [
                'linear-gradient(180deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 40%)',
                'linear-gradient(120deg, rgba(255,217,138,0.7), rgba(255,138,71,0.7), rgba(255,91,5,0.7), rgba(255,198,112,0.7))',
              ].join(', '),
              backgroundSize: '100% 100%, 300% 300%',
              animation: 'gradient-shift 8s ease infinite',
              backdropFilter: 'blur(24px) saturate(160%)',
              WebkitBackdropFilter: 'blur(24px) saturate(160%)',
              border: '1px solid rgba(255,255,255,0.5)',
              boxShadow: '0 20px 60px rgba(255,91,5,0.25), inset 0 1px 0 rgba(255,255,255,0.4)',
            }}
          >
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white mb-6 leading-tight">
              Ready when you are.
            </h2>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
              <button
                onClick={() => navigate('/contact')}
                className="w-full sm:w-auto px-8 py-3.5 rounded-full text-[13px] sm:text-xs font-semibold tracking-widest uppercase text-[#243037] bg-white whitespace-nowrap cursor-pointer transition-transform duration-300 hover:scale-105"
              >
                Start a Project
              </button>
              <span className="text-white/70 text-xs">Free consultation · No commitment</span>
            </div>
          </div>
        </section>

        {/* ═══ TESTIMONIALS — single rotating quote, no cards ═══ */}
        <section className="relative px-4 sm:px-6 lg:px-8 pt-14 sm:pt-20 pb-4 sm:pb-6">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#243037] mb-8 sm:mb-12">What clients say.</h2>
            <i
              className="ri-double-quotes-l text-3xl mb-6 inline-block transition-colors duration-500"
              style={{ color: '#FF5B05', opacity: 0.7 }}
            />
            {/* Every quote is rendered into the same grid cell, with the
                inactive ones held at opacity 0. The container therefore always
                reserves the height of the LONGEST quote, so the section stops
                resizing as it rotates — and it stays correct at any breakpoint,
                unlike a hardcoded min-height. */}
            <div className="grid mb-8">
              {testimonials.map((t, i) => (
                <p
                  key={t.author}
                  aria-hidden={i !== activeTestimonial}
                  className={`col-start-1 row-start-1 text-base sm:text-xl text-[#243037]/75 leading-relaxed transition-opacity duration-500 ${
                    i === activeTestimonial ? 'opacity-100' : 'opacity-0 pointer-events-none'
                  }`}
                >
                  &ldquo;{t.quote}&rdquo;
                </p>
              ))}
            </div>
            <div
              key={`${activeTestimonial}-service`}
              className="inline-block text-[11px] sm:text-[10px] font-semibold tracking-wide uppercase px-2.5 py-1 rounded-full mb-4"
              style={{
                background: 'rgba(255,91,5,0.1)',
                color: '#FF5B05',
                animation: 'fade-in-up 0.5s ease',
              }}
            >
              {testimonials[activeTestimonial].service}
            </div>
            <div key={`${activeTestimonial}-author`} style={{ animation: 'fade-in-up 0.5s ease' }}>
              <div className="text-sm font-bold text-[#243037]">{testimonials[activeTestimonial].author}</div>
              <div className="text-xs sm:text-[11px] text-[#243037]/40 mt-0.5">{testimonials[activeTestimonial].role}</div>

              {/* Link is its own tappable chip rather than a hover-only icon on
                  the name — hover never fires on touch, so that was invisible
                  to every phone visitor. */}
              {/* min-h keeps the block from collapsing if a testimonial has no
                  links, which would otherwise shift the section height too */}
              <div className="flex items-center justify-center gap-1 mt-2 min-h-8">
                {testimonials[activeTestimonial].links.map((url) => {
                  const meta = linkMeta(url);
                  if (!meta) return null;
                  return (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${testimonials[activeTestimonial].role} — ${meta.label}`}
                      title={meta.label}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-full text-[#243037]/45 hover:text-[#FF5B05] transition-colors cursor-pointer"
                    >
                      <i className={`${meta.icon} text-base`} />
                    </a>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 mt-10">
              {testimonials.map((t, i) => (
                <button
                  key={t.author}
                  onClick={() => setActiveTestimonial(i)}
                  aria-label={`Show testimonial from ${t.author}`}
                  className="p-1.5 cursor-pointer"
                >
                  <span
                    className="block rounded-full transition-all duration-300"
                    style={{
                      width: i === activeTestimonial ? '20px' : '6px',
                      height: '6px',
                      background: i === activeTestimonial ? '#FF5B05' : 'rgba(36,48,55,0.2)',
                    }}
                  />
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ Sentro OS spotlight — no card, floats directly on the page ═══ */}
        <section className="relative px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-10 sm:pb-16">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-8 md:gap-16">
            <div className="flex-1 min-w-0">
              <h2 className="font-display text-xl sm:text-2xl font-bold text-[#243037] mb-3 leading-tight">
                Need an internal ops hub for your team?
              </h2>
              <p className="text-[#243037]/60 text-[15px] sm:text-sm leading-relaxed mb-6 max-w-lg">
                <span className="text-[#243037] font-semibold">Sentro OS</span> is a custom-built internal operations platform — attendance, payroll, documents, credentials, and more. Built around your exact workflow and branded as your own.
              </p>
              <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3">
                <a href="/sentro"
                  className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3.5 sm:py-3 rounded-full text-[13px] sm:text-xs font-semibold tracking-widest uppercase text-white transition-transform duration-300 hover:scale-105"
                  style={{ background: 'linear-gradient(135deg, #FF5B05, #FF8A47)', boxShadow: '0 6px 24px rgba(255,91,5,0.35)' }}>
                  See Sentro OS
                </a>
                <a href="/sentro#pricing"
                  className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3.5 sm:py-3 rounded-full text-[13px] sm:text-xs font-semibold tracking-widest uppercase text-[#243037]/60 border border-[#243037]/15 hover:text-[#243037] hover:bg-white/40 transition-all">
                  View Pricing
                </a>
              </div>
            </div>
            <div className="flex-shrink-0 grid grid-cols-2 gap-3 w-full md:w-auto md:max-w-lg">
              {[
                { icon: 'ri-time-line', label: 'Attendance tracking' },
                { icon: 'ri-money-dollar-circle-line', label: 'Payroll & payouts' },
                { icon: 'ri-file-list-3-line', label: 'Document signing' },
                { icon: 'ri-building-line', label: 'Client & projects' },
                { icon: 'ri-shield-keyhole-line', label: 'Credentials vault' },
                { icon: 'ri-calendar-check-line', label: 'Time-off & overtime' },
              ].map(f => (
                <div key={f.label} className="flex items-center gap-2.5 bg-white/40 border border-[#243037]/8 rounded-xl px-3 py-2.5">
                  <i className={`${f.icon} text-[#FF5B05] text-sm flex-shrink-0`}></i>
                  <span className="text-[13px] sm:text-xs text-[#243037]/70 font-medium leading-snug">{f.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <Footer isDark />
    </div>
  );
}
