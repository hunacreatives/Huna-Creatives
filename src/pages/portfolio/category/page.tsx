import { useParams, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Navigation from '../../../components/feature/Navigation';
import Footer from '../../home/components/Footer';
import { useSEO } from '../../../hooks/useSEO';

/* -------------------------------------------------------------------------- */
/*  Removed TypeScript‑only interfaces – they cause a syntax error in a plain  */
/*  JavaScript/JSX file.  The component now works as regular JSX/React code.   */
/* -------------------------------------------------------------------------- */

/* ----------  Sample data – unchanged (kept the same shape)  ----------------- */
const socialClients = [
  {
    id: 'eq',
    number: '1',
    name: 'Equestrian International',
    logo: '/images/portfolio-eq-logo.webp',
    logoBg: '#243037',
    dark: false,
    sectionBg: 'transparent',
    description:
      'In the competitive world of sport horses, presentation is everything. For Equestrian International, we designed content that speaks directly to serious buyers and breeders—spotlighting world-class horses, showcasing seller credibility, and creating a premium feed aesthetic that reflects the prestige of the industry. Every post is tailored to attract the right audience and inspire meaningful inquiries.',
    images: [
      '/images/portfolio-eq-1.webp',
      '/images/portfolio-eq-2.webp',
      '/images/portfolio-eq-3.webp',
      '/images/portfolio-eq-4.webp',
    ],
  },
  {
    id: 'ebo',
    number: '2',
    name: 'Everyone by One',
    logo: '/images/portfolio-ebo-logo.webp',
    logoBg: '#f7f5f2',
    dark: false,
    sectionBg: 'transparent',
    description:
      "Parents want reassurance when it comes to their children's dental health. For Everyone By One, we create educational, parent‑friendly content that answers real‑life questions—from pacifier habits to first dental visits—while building a warm, trustworthy online presence that feels like a friendly guide, not a sales pitch.",
    images: [
      '/images/portfolio-ebo-1.webp',
      '/images/portfolio-ebo-2.webp',
      '/images/portfolio-ebo-3.webp',
      '/images/portfolio-ebo-4.webp',
    ],
  },
  {
    id: 'tct',
    number: '3',
    name: 'The Cowart Team Mortgage',
    logo: '/images/portfolio-tct-logo.webp',
    logoBg: '#243037',
    dark: false,
    sectionBg: 'transparent',
    description:
      "Mortgages don't have to feel intimidating. With The Cowart Team, our goal was to turn complex financial concepts into approachable, trust‑building content. We create a balance of educational posts, client success stories, and timely market insights—making their feed both a resource hub and a brand people trust with their biggest financial decision.",
    images: [
      '/images/portfolio-tct-1.webp',
      '/images/portfolio-tct-2.webp',
      '/images/portfolio-tct-3.webp',
      '/images/portfolio-tct-4.webp',
    ],
  },
  {
    id: 'bcn',
    number: '4',
    name: 'Blue Collar Nutrition',
    logo: '/images/portfolio-bcn-logo.webp',
    logoBg: '#f7f5f2',
    dark: false,
    sectionBg: 'transparent',
    description:
      "For Blue Collar Nutrition, our focus is on creating bold, high‑impact content that matches the brand's energy and grit. We develop a mix of product‑centered promotions, seasonal campaigns, and lifestyle‑driven content designed to connect with their community of athletes and everyday grinders. From supplement spotlights to campaign launches, every piece of content reinforces their identity as a trusted, no‑nonsense brand built on performance, consistency, and strength.",
    images: [
      '/images/portfolio-bcn-social-1.webp',
      '/images/portfolio-bcn-2.webp',
      '/images/portfolio-bcn-3.webp',
      '/images/portfolio-bcn-4.webp',
    ],
  },
];

/* ── Graphic Design dedicated layout ──────────────────────────────────────── */
const GraphicDesignLayout = ({ category }) => {
  const sections = [
    {
      id: 'mockups',
      number: '1',
      label: 'Mockups',
      title: 'Mockups That Make It Real.',
      dark: false,
      bg: 'transparent',
      description: 'Transform your designs into realistic, polished visuals that feel tangible and ready for the world.',
      subtext: 'From pitch decks to social showcases, we make your brand look professional and unforgettable at every stage.',
      image: '/images/portfolio-bcn-bottles.webp',
      imageLeft: false,
    },
    {
      id: 'menus',
      number: '2',
      label: 'Menus',
      title: 'Menus With Meaning.',
      dark: false,
      bg: 'transparent',
      description: 'Menus are an extension of your brand. Every choice of font, color, and layout sets the stage for what your guests are about to enjoy.',
      subtext: 'We design menus that grab attention, spark curiosity, and leave a lasting impression.',
      image: '/images/drive-fv-menu.png',
      imageLeft: true,
    },
    {
      id: 'flyers',
      number: '3',
      label: 'Flyers',
      title: 'Flyers That Fly Further.',
      dark: false,
      bg: 'transparent',
      description: 'Compact, eye-catching, and built to travel far. Flyers carry your message directly into people\'s hands.',
      subtext: 'Every flyer is crafted to grab attention, spark curiosity, and leave a clear memory of your brand.',
      image: '/images/drive-vox-chifa-bowl.png',
      imageLeft: false,
    },
  ];

  return (
    <>
      {sections.map((sec) => (
        <section
          key={sec.id}
          className="relative py-16 sm:py-20 px-4 sm:px-6"
          style={{ background: sec.bg }}
        >
          <div className="max-w-6xl mx-auto">
            <div className={`flex flex-col ${sec.imageLeft ? 'lg:flex-row-reverse' : 'lg:flex-row'} gap-8 md:gap-12 lg:gap-20 items-center`}>
              {/* Text */}
              <div className="flex-1 max-w-xl">
                <span
                  className="text-[11px] font-semibold tracking-widest uppercase mb-3 block"
                  style={{ color: '#FF5B05' }}
                >
                  {sec.number} {sec.label}
                </span>
                <h2
                  className="font-display text-xl md:text-2xl lg:text-3xl font-bold mb-4 md:mb-5 leading-tight"
                  style={{ color: '#243037' }}
                >
                  {sec.title}
                </h2>
                <p
                  className="text-sm leading-relaxed mb-3 md:mb-4"
                  style={{ color: 'rgba(36,48,55,0.65)' }}
                >
                  {sec.description}
                </p>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: 'rgba(36,48,55,0.45)' }}
                >
                  {sec.subtext}
                </p>
              </div>
              {/* Image */}
              <div className="flex-1 w-full flex items-center justify-center">
                <img
                  src={sec.image}
                  alt={sec.title}
                  className={`w-full object-contain ${sec.id === 'menus' ? 'max-w-lg' : 'max-w-2xl'}`}
                  style={{ maxHeight: sec.id === 'menus' ? '520px' : '680px' }}
                />
              </div>
            </div>
          </div>
        </section>
      ))}

      {/* Menus Gallery */}
      <section className="relative py-16 sm:py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10 md:mb-12">
            <span className="text-[11px] font-semibold tracking-widest uppercase mb-3 block" style={{ color: '#FF5B05' }}>
              4 More Menus
            </span>
            <h2 className="font-display text-xl md:text-2xl lg:text-3xl font-bold text-[#243037] mb-3 md:mb-4">More Menu Designs</h2>
            <p className="text-[#243037]/55 text-sm max-w-lg mx-auto">From ramen shops to cocktail bars — menus designed to sell the experience.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-5">
            {[
              '/images/drive-kin-menu-front.png',
              '/images/drive-kin-special-menu.png',
              '/images/drive-kin-menu-flyer.png',
            ].map((img, i) => (
              <div
                key={i}
                className="group relative overflow-hidden rounded-xl transition-all duration-300 hover:-translate-y-1.5"
                style={{ border: '1px solid rgba(255,255,255,0.7)', boxShadow: '0 10px 28px rgba(36,48,55,0.18)' }}
              >
                <img src={img} alt={`Menu design ${i + 1}`} className="w-full h-auto object-cover object-top transition-transform duration-500 group-hover:scale-105" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Flyers Gallery */}
      <section className="relative py-16 sm:py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10 md:mb-12 lg:mb-16">
            <span className="text-[11px] font-semibold tracking-widest uppercase mb-3 block" style={{ color: '#FF5B05' }}>
              5 More Flyers
            </span>
            <h2 className="font-display text-xl md:text-2xl lg:text-3xl font-bold text-[#243037] mb-3 md:mb-4">Past Flyers &amp; Designs</h2>
            <p className="text-[#243037]/55 text-sm max-w-lg mx-auto">Bold, intentional designs built to make an impression.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {[
              '/images/203f7572a12f03a6a55d3a97977e399c.png',
              '/images/4a760c0b68accebf5448cc8bb9f956de.png',
              '/images/0e684af0f12d20b4bf8a449578cbf1b0.png',
              '/images/9229997a693668f1ea9573317309e1f1.png',
              '/images/129b76b17e2c06cca769b642a63ed500.png',
              '/images/e47d531d58febd435a7fb4e96c85fde7.png',
              '/images/55e240e348314c84ba40f27d212d20a5.png',
              '/images/2f115e6259210ddf16ac62cf5dfc7142.png',
              '/images/drive-vox-bar-program.png',
              '/images/drive-vox-hh-program.png',
              '/images/drive-kin-menu-flyer.png',
              '/images/drive-kch-lny-poster.png',
              '/images/drive-kei-cards.png',
              '/images/drive-ad-torch.png',
              '/images/drive-ad-1.png',
              '/images/drive-ad-2.png',
            ].map((img, i) => (
              <div
                key={i}
                className="group relative overflow-hidden rounded-lg md:rounded-xl aspect-[4/5] transition-all duration-300 hover:-translate-y-1.5"
                style={{ border: '1px solid rgba(255,255,255,0.7)', boxShadow: '0 10px 28px rgba(36,48,55,0.18)' }}
              >
                <img
                  src={img}
                  alt={`Flyer design ${i + 1}`}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(255,91,5,0.10) 50%, transparent 100%)' }}
                />
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
};

/* ── Email Marketing dedicated layout ─────────────────────────────────────── */
const emailShowcaseImage = '/images/0786ff49839456d59f84f19d66a7f551.png';

const emailAdvantages = [
  {
    icon: 'ri-bar-chart-2-line',
    title: 'Higher ROI Than Any Channel',
    body: 'Email marketing consistently delivers the highest return on investment of any digital marketing channel — averaging $42 for every $1 spent. We make sure every campaign is optimized to maximize that return.',
  },
  {
    icon: 'ri-user-heart-line',
    title: 'Direct Access to Your Audience',
    body: 'Unlike social media algorithms, email puts your message directly in front of your subscribers. No fighting for visibility — just a direct line to the people who already want to hear from you.',
  },
  {
    icon: 'ri-palette-line',
    title: 'Beautiful, On-Brand Design',
    body: 'Every email we craft is visually stunning and perfectly aligned with your brand identity. From layout to typography to imagery, your emails will look as good as your best marketing materials.',
  },
  {
    icon: 'ri-line-chart-line',
    title: 'Data-Driven Performance',
    body: 'We track opens, clicks, conversions, and revenue — then use that data to continuously improve. Every send is smarter than the last, building a compounding advantage for your brand.',
  },
  {
    icon: 'ri-refresh-line',
    title: 'Automated Sequences That Work 24/7',
    body: 'From welcome flows to abandoned cart recovery, we build automated sequences that nurture leads and drive sales while you sleep. Set it up once, benefit forever.',
  },
  {
    icon: 'ri-shield-check-line',
    title: 'Deliverability You Can Count On',
    body: 'Getting to the inbox is half the battle. We follow best practices for list hygiene, authentication, and content to ensure your emails land where they belong — not in spam.',
  },
];

const EmailMarketingLayout = ({ category }) => {
  return (
    <>
      {/* Intro + Showcase */}
      <section className="relative py-16 sm:py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-8 md:gap-12 lg:gap-16 items-start">

            {/* Left: Text */}
            <div className="flex-shrink-0 w-full lg:w-80 xl:w-[420px]">
              <h2 className="font-display text-xl md:text-2xl lg:text-3xl font-bold text-[#243037] mb-4 md:mb-6 leading-tight">
                Email Marketing That Works Smarter for Your Brand
              </h2>
              <p className="text-sm leading-relaxed mb-4 md:mb-5 text-[#243037]/60">
                At Huna Creatives, we believe email isn't just a channel — it's one of the most powerful tools for building genuine connections with your audience. Our email marketing solutions are designed to do more than just land in inboxes. We create campaigns that tell your story, showcase your brand, and inspire action.
              </p>
              <p className="text-sm leading-relaxed mb-4 md:mb-5 text-[#243037]/60">
                From nurturing leads to turning one-time buyers into loyal customers, we focus on strategy, design, and performance. Each email is crafted to look beautiful, read effortlessly, and drive measurable results. Whether it's promoting seasonal offers, sharing updates, or building long-term brand trust, our approach ensures that every send moves you closer to your goals.
              </p>
              <p className="text-sm font-semibold text-[#243037]/80 mb-6 md:mb-8">
                Think of us as your partner in turning clicks into customers — and emails into lasting relationships.
              </p>
              <a
                href="/contact"
                className="inline-flex items-center justify-center gap-2 px-6 md:px-7 py-2 md:py-2.5 font-semibold rounded-full border-2 border-[#243037]/20 text-[#243037] text-sm whitespace-nowrap cursor-pointer hover:bg-[#243037] hover:text-white transition-all duration-300 w-full md:w-auto justify-center"
                style={{ borderColor: 'rgba(0,0,0,0.4)' }}
              >
                Get a Quote
              </a>
            </div>

            {/* Right: Single showcase image */}
            <div className="flex-1 w-full flex items-start justify-center lg:justify-start">
              <img
                src={emailShowcaseImage}
                alt="Email campaign showcase"
                className="w-full h-auto object-contain object-top"
                style={{ maxHeight: '600px' }}
              />
            </div>

          </div>
        </div>
      </section>

      {/* Not seeing ROI section */}
      <section className="relative py-16 sm:py-20 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-xl md:text-2xl lg:text-3xl font-bold mb-4 md:mb-6 leading-tight" style={{ color: '#FF5B05' }}>
            Not seeing the ROI you deserve from email marketing?
          </h2>
          <p className="text-sm leading-relaxed text-[#3a3330]/65">
            At <strong className="text-[#3a3330]">Huna Creatives</strong>, we don't just send emails — we craft experiences that build trust, spark action, and drive measurable results. By combining smart strategy, creative storytelling, and proven tactics, we transform your inbox presence into a powerful engine for growth. Let's turn every send into a step toward stronger connections and higher revenue.
          </p>
        </div>
      </section>

      {/* Advantages section */}
      <section className="relative py-16 sm:py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          {/* Background image banner */}
          <div className="relative rounded-2xl md:rounded-3xl overflow-hidden mb-12 md:mb-16">
            <div className="w-full h-[240px] md:h-[320px] lg:h-[420px]">
              <img
                src="/images/email-workspace-001.jpg"
                alt="Email marketing workspace"
                className="w-full h-full object-cover object-top"
              />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(42,34,32,0.85) 0%, rgba(42,34,32,0.4) 60%, transparent 100%)' }} />
            </div>
            <div className="absolute inset-0 flex items-center px-6 md:px-10 lg:px-16">
              <div className="max-w-lg">
                <span className="text-[11px] font-semibold tracking-widest uppercase mb-3 block" style={{ color: '#FF5B05' }}>
                  2 Why Email
                </span>
                <h2 className="font-display text-xl md:text-2xl lg:text-3xl font-bold text-white leading-tight">
                  The Distinct Advantages of Email Marketing Services
                </h2>
              </div>
            </div>
          </div>

          {/* Advantages grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {emailAdvantages.map((adv, i) => (
              <div
                key={i}
                className="rounded-xl md:rounded-2xl p-5 md:p-7 transition-all duration-300 hover:-translate-y-1 group"
                style={{
                  background: 'rgba(255,255,255,0.65)',
                  backdropFilter: 'blur(20px) saturate(160%)',
                  WebkitBackdropFilter: 'blur(20px) saturate(160%)',
                  border: '1px solid rgba(255,255,255,0.6)',
                  boxShadow: '0 8px 32px rgba(36,48,55,0.08)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.border = '1px solid rgba(255,91,5,0.35)';
                  e.currentTarget.style.boxShadow = '0 10px 32px rgba(255,91,5,0.12)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.border = '1px solid rgba(36,48,55,0.08)';
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(36,48,55,0.05)';
                }}
              >
                <div
                  className="w-9 md:w-10 h-9 md:h-10 flex items-center justify-center rounded-lg md:rounded-xl mb-4 md:mb-5"
                  style={{ background: 'linear-gradient(135deg, rgba(255,91,5,0.16), rgba(255,138,71,0.1))' }}
                >
                  <i className={`${adv.icon} text-[#FF5B05] text-sm md:text-base`} />
                </div>
                <h3 className="font-display text-sm font-bold text-[#243037] mb-2 md:mb-3">{adv.title}</h3>
                <p className="text-xs leading-relaxed text-[#243037]/55">{adv.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter Samples */}
      <section className="relative py-16 sm:py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10 md:mb-12">
            <span className="text-[11px] font-semibold tracking-widest uppercase mb-3 block" style={{ color: '#FF5B05' }}>
              3 Newsletter Samples
            </span>
            <h2 className="font-display text-xl md:text-2xl lg:text-3xl font-bold mb-3 md:mb-4 leading-tight" style={{ color: '#243037' }}>
              Campaigns That Convert
            </h2>
            <p className="text-sm max-w-lg mx-auto" style={{ color: 'rgba(26,26,26,0.5)' }}>
              Real email campaigns we built for Blue Collar Nutrition — designed to drive urgency, tell the brand story, and get clicks.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-5 md:gap-6 max-w-4xl mx-auto">
            {[
              { img: '/images/drive-bcn-liquid-newsletter.png', label: 'BCN — Liquid Burn Campaign' },
              { img: '/images/drive-bcn-ny-newsletter.png', label: 'BCN — New Year Promo' },
            ].map((item, i) => (
              <div
                key={i}
                className="group overflow-hidden rounded-2xl"
                style={{ border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}
              >
                <img
                  src={item.img}
                  alt={item.label}
                  className="w-full h-auto object-cover object-top transition-transform duration-500 group-hover:scale-[1.02]"
                />
                <div className="px-4 py-3" style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
                  <span className="text-xs font-semibold" style={{ color: '#3a3330' }}>{item.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
};

/* ── Web Design dedicated layout ──────────────────────────────────────────── */
const webDesignSites = [
  {
    id: 'hulma-cebu',
    name: 'Hulma Cebu',
    url: 'https://hulmacebu.com',
    displayUrl: 'hulmacebu.com',
    category: 'Web Design & UI/UX',
    description:
      'A premium fiberglass materials brand built from the ground up — product catalog, project galleries, material look-books, and a lead capture flow tuned for B2B hospitality and architecture clients.',
    tags: ['Web Design', 'UI/UX', 'Product Catalog', 'Lead Generation'],
    year: '2024',
    accentColor: '#c4a882',
    accentBg: 'rgba(196,168,130,0.1)',
    image: '/images/171bfd1b-938b-4646-820a-d40659dd77d6_Screenshot-2026-03-27-at-12.53.20AM.png',
    comingSoon: false,
  },
  {
    id: 'palm-barge',
    name: 'Palm Island Barge Co.',
    url: 'https://palmbarge.com.au',
    displayUrl: 'palmbarge.com.au',
    category: 'Web Design & Development',
    description:
      'Maritime services website for an Australian barge operator connecting Lucinda to Palm Island. Timetables, service listings, and an online enquiry system built for reliability.',
    tags: ['Web Design', 'Services', 'Australia', 'Transport'],
    year: '2024',
    accentColor: '#f9a825',
    accentBg: 'rgba(249,168,37,0.1)',
    image: '/images/968636a3-15e7-48ef-8452-b827dbfc706a_Screenshot-2026-03-27-at-12.53.00AM.png',
    comingSoon: false,
  },
  {
    id: 'wjd-management',
    name: 'WJD Management',
    url: 'https://wjdpm.com',
    displayUrl: 'wjdpm.com',
    category: 'Web Design & Development',
    description:
      'A professional property management company serving Northern Virginia since 1983. Full-service site with rental listings, owner resources, tenant portals, and local market insights.',
    tags: ['Web Design', 'Property Management', 'Real Estate', 'Virginia'],
    year: '2024',
    accentColor: '#6b9fb8',
    accentBg: 'rgba(107,159,184,0.1)',
    image: '/images/d755c44c-3c91-4bc2-b4a0-52e262066e1c_Screenshot-2026-03-27-at-12.53.13AM.png',
    comingSoon: false,
  },
  {
    id: 'fs-architects',
    name: 'FS Architects',
    url: 'https://bzmywq.readdy.co',
    displayUrl: 'fsarchitects.com',
    category: 'Web Design & Branding',
    description:
      'A new project currently in progress. Full case study and live preview dropping soon.',
    tags: ['Web Design', 'Architecture', 'Branding'],
    year: '2025',
    accentColor: '#7a8fa0',
    accentBg: 'rgba(122,143,160,0.1)',
    image: '/images/99c59eb0-4815-4d7a-866a-f56d3e927d63_FS-Homepage.png',
    comingSoon: true,
  },
  {
    id: 'obra-majoralia',
    name: 'Obra Majoralia',
    url: '#',
    displayUrl: 'obramajoralia.com',
    category: 'Web Design & Branding',
    description:
      'A new project currently in progress. Full case study and live preview dropping soon.',
    tags: ['Web Design', 'Architecture', 'Branding'],
    year: '2025',
    accentColor: '#8a7a6a',
    accentBg: 'rgba(138,122,106,0.1)',
    image: '/images/obra-majoralia-home.jpg',
    comingSoon: true,
  },
];

const WebDesignLayout = () => (
  <section className="relative py-16 sm:py-20 px-4 sm:px-6">
    <div className="max-w-6xl mx-auto space-y-5 md:space-y-6">
      {webDesignSites.map((site) => {
        const cardInner = (
          <>
            {/* Browser mockup */}
            <div className="relative w-full lg:w-[58%] flex-shrink-0 overflow-hidden">
              <div
                className="flex items-center gap-2 px-4 py-2.5 border-b"
                style={{ background: 'rgba(255,255,255,0.5)', borderColor: 'rgba(36,48,55,0.08)' }}
              >
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                </div>
                <div
                  className="flex-1 mx-3 px-3 py-1 rounded-md flex items-center gap-2"
                  style={{ background: 'rgba(36,48,55,0.06)' }}
                >
                  <i className="ri-lock-line text-[9px] text-[#243037]/40" />
                  <span className="text-[10px] text-[#243037]/50 tracking-wide truncate">{site.displayUrl}</span>
                </div>
                {!site.comingSoon && (
                  <i className="ri-external-link-line text-[11px] text-[#243037]/35 group-hover:text-[#243037]/70 transition-colors duration-300" />
                )}
              </div>
              <div className="relative overflow-hidden" style={{ height: '240px', background: 'rgba(36,48,55,0.05)' }}>
                <img
                  src={site.image}
                  alt={site.name}
                  className={`w-full h-full object-cover object-top transition-transform duration-700 ${site.comingSoon ? 'opacity-20 blur-sm' : 'group-hover:scale-105'}`}
                />
                {site.comingSoon ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                    <div
                      className="w-10 h-10 flex items-center justify-center rounded-full"
                      style={{ background: 'rgba(36,48,55,0.08)', border: '1px solid rgba(36,48,55,0.12)' }}
                    >
                      <i className="ri-time-line text-[#243037]/50 text-base" />
                    </div>
                    <span className="text-[11px] font-semibold tracking-widest uppercase text-[#243037]/45">
                      Coming Soon
                    </span>
                  </div>
                ) : (
                  <>
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                      style={{ background: `linear-gradient(135deg, ${site.accentColor}18 0%, transparent 60%)` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div
                        className="flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-semibold text-white backdrop-blur-sm"
                        style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.15)' }}
                      >
                        <i className="ri-external-link-line" />
                        Visit Site
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Info panel */}
            <div className="flex flex-col justify-between p-6 md:p-8 flex-1">
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span
                        className="inline-block text-[9px] font-semibold tracking-[0.2em] uppercase px-2.5 py-1 rounded-full"
                        style={{
                          background: site.accentBg,
                          color: site.accentColor,
                          border: `1px solid ${site.accentColor}30`,
                        }}
                      >
                        {site.category}
                      </span>
                      {site.comingSoon && (
                        <span
                          className="inline-block text-[9px] font-semibold tracking-[0.15em] uppercase px-2.5 py-1 rounded-full"
                          style={{
                            background: 'rgba(36,48,55,0.05)',
                            color: 'rgba(36,48,55,0.45)',
                            border: '1px solid rgba(36,48,55,0.1)',
                          }}
                        >
                          Coming Soon
                        </span>
                      )}
                    </div>
                    <h3
                      className={`font-display text-base md:text-lg lg:text-xl font-bold leading-tight transition-colors duration-300 ${site.comingSoon ? 'text-[#243037]/45' : 'text-[#243037] group-hover:text-[#FF5B05]'}`}
                    >
                      {site.name}
                    </h3>
                  </div>
                  {!site.comingSoon && (
                    <div
                      className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300"
                      style={{ background: `${site.accentColor}20` }}
                    >
                      <i className="ri-arrow-right-up-line text-sm" style={{ color: site.accentColor }} />
                    </div>
                  )}
                </div>
                <p
                  className={`text-xs leading-relaxed mb-5 transition-colors duration-300 ${site.comingSoon ? 'text-[#243037]/35' : 'text-[#243037]/55 group-hover:text-[#243037]/70'}`}
                >
                  {site.description}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {site.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] font-medium px-2.5 py-1 rounded-full whitespace-nowrap"
                    style={{
                      background: 'rgba(36,48,55,0.05)',
                      color: site.comingSoon ? 'rgba(36,48,55,0.35)' : 'rgba(36,48,55,0.55)',
                      border: '1px solid rgba(36,48,55,0.08)',
                    }}
                  >
                    {tag}
                  </span>
                ))}
                <span className="ml-auto text-[10px] text-[#243037]/40 font-medium">{site.year}</span>
              </div>
            </div>
          </>
        );

        return site.comingSoon ? (
          <div
            key={site.id}
            className="relative flex flex-col lg:flex-row overflow-hidden rounded-2xl"
            style={{
              background: 'rgba(255,255,255,0.5)',
              backdropFilter: 'blur(20px) saturate(160%)',
              WebkitBackdropFilter: 'blur(20px) saturate(160%)',
              border: '1px solid rgba(255,255,255,0.5)',
              boxShadow: '0 8px 32px rgba(36,48,55,0.06)',
              opacity: 0.75,
            }}
          >
            {cardInner}
          </div>
        ) : (
          <a
            key={site.id}
            href={site.url}
            target="_blank"
            rel="nofollow noreferrer"
            className="group relative flex flex-col lg:flex-row overflow-hidden rounded-2xl cursor-pointer block"
            style={{
              background: 'rgba(255,255,255,0.65)',
              backdropFilter: 'blur(20px) saturate(160%)',
              WebkitBackdropFilter: 'blur(20px) saturate(160%)',
              border: '1px solid rgba(255,255,255,0.6)',
              boxShadow: '0 8px 32px rgba(36,48,55,0.08)',
              transition: 'border-color 400ms ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.borderColor = `${site.accentColor}60`;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.6)';
            }}
          >
            {cardInner}
          </a>
        );
      })}
    </div>
  </section>
);

const categoryDataMap = {
  branding: {
    id: 'branding',
    name: 'Branding & Identity',
    description:
      "Your brand is more than just a logo — it's the story you tell, the emotions you spark, and the impression you leave behind. We build identities from the ground up with clarity, purpose, and strategy.",
    iconClass: 'ri-fingerprint-line',
    stats: { projects: '25+', satisfaction: '100%', rating: '5.0★' },
    projects: [
      {
        id: 'b5',
        title: 'Cooperative Plumbing & Drain',
        description:
          'Brand strategy and identity for the first employee-owned plumbing and drain company in its market — monogram, logo suite, color system, typography, and a full written brand platform.',
        image: '/images/coop-app-polo-front.webp',
        slug: 'cooperative-plumbing-drain',
      },
      {
        id: 'b2',
        title: 'Peak Coffee Roasters',
        description:
          'Full brand identity and packaging system for a specialty coffee roaster — logo suite, bean bags, cups, menus, tasting cards, stickers, and laser-cut signage.',
        image: '/images/peak-coffee-pcr-1.webp',
        slug: 'peak-coffee-roasters',
      },
      {
        id: 'b1',
        title: 'The Second Haus',
        description:
          'Complete brand identity for a modern consignment boutique — logo, typography, color palette, brand guidelines, packaging, and every touchpoint.',
        image: '/images/tsh-insta-unboxing.webp',
        slug: 'the-second-haus',
      },
      {
        id: 'b3',
        title: 'Whisk Up Matcha',
        description:
          'Full brand identity for a matcha café — leaf mark, logotype, color palette, and a complete logo suite across all colorways.',
        image: '/images/wum-hero.webp',
        slug: 'whisk-up-matcha',
      },
      {
        id: 'b4',
        title: 'Uji-Matcha Café',
        description:
          'Logo refinement and brand evolution study — three directions, full logo suite, color system, and typography for a Japanese matcha café.',
        image: '/images/uji-hero.webp',
        slug: 'uji-matcha-cafe',
      },
    ],
  },
  'graphic-design': {
    id: 'graphic-design',
    name: 'Graphic Design',
    description:
      'Every great design starts with a spark — an idea, a story, a vision that deserves to be seen. At Huna Creatives, we transform those ideas into bold, intentional visuals that not only look polished but also work hard for your brand. From product mockups and packaging to flyers, posters, and promotional materials, our designs bring your vision to life in a way that captures attention, communicates clearly, and leaves a lasting impression.',
    iconClass: 'ri-pen-nib-line',
    stats: { projects: '18+', satisfaction: '100%', rating: '5.0★' },
    projects: [],
  },
  'social-media': {
    id: 'social-media',
    name: 'Social Media Marketing',
    description:
      "Whether you're selling luxury sport horses, guiding families through mortgage decisions, caring for little smiles, or fueling athletes with top-tier nutrition—your brand's voice matters. Social media is more than just posting; it's about creating a presence that connects, engages, and converts. At Huna Creatives, we turn your vision into a cohesive, scroll‑stopping narrative that works across platforms and speaks directly to your audience.",
    iconClass: 'ri-bar-chart-grouped-line',
    stats: { projects: '24+', satisfaction: '100%', rating: '5.0★' },
    projects: [],
    socialClients,
  },
  'email-marketing': {
    id: 'email-marketing',
    name: 'Email Marketing',
    description:
      'Beautifully designed email campaigns that convert. From newsletters to automated sequences, we craft emails that get opened, read, and clicked — every single time.',
    iconClass: 'ri-mail-send-line',
    stats: { projects: '9+', satisfaction: '100%', rating: '5.0★' },
    projects: [],
  },
  'web-design': {
    id: 'web-design',
    name: 'Web Design',
    description:
      'Full websites designed and built from scratch — strategy, UI/UX, development, and launch. Every site is crafted to look great, load fast, and convert.',
    iconClass: 'ri-global-line',
    stats: { projects: '8+', satisfaction: '100%', rating: '5.0★' },
    projects: [],
  },
};

/* ── Social Media dedicated layout ────────────────────────────────────────── */
const SocialMediaLayout = ({ category }) => {
  const clients = category.socialClients ?? [];

  return (
    <>
      {/* Client sections — the intro paragraph now lives in the page hero */}
      {clients.map((client, idx) => (
        <section
          key={client.id}
          className="relative py-16 sm:py-20 px-4 sm:px-6 border-t border-[#243037]/8"
          style={{ background: client.sectionBg ?? '#F5F5F5' }}
        >
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 md:gap-8 mb-10 md:mb-12">
              <div className="flex-1 max-w-xl">
                <span className="text-[11px] font-semibold tracking-widest uppercase mb-3 block text-[#FF6B35]">
                  {idx + 1} Brand
                </span>
                <h2 className="font-display text-xl md:text-2xl lg:text-3xl font-bold mb-4 md:mb-5 leading-tight text-[#243037]">
                  {client.name}
                </h2>
                <p className="text-sm leading-relaxed text-[#243037]/60">
                  {client.description}
                </p>
              </div>

              <div
                className="flex-shrink-0 flex items-center justify-center rounded-xl md:rounded-2xl p-5 md:p-6 w-40 h-24 md:w-48 md:h-28 lg:w-56 lg:h-32"
                style={{ background: client.logoBg, border: '1px solid rgba(255,255,255,0.6)', boxShadow: '0 8px 32px rgba(36,48,55,0.08)' }}
              >
                <img src={client.logo} alt={`${client.name} logo`} className="max-w-full max-h-full object-contain" />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {client.images.map((img, i) => (
                <div
                  key={i}
                  className="group relative overflow-hidden rounded-lg md:rounded-xl aspect-square"
                  style={{ border: '1px solid rgba(255,255,255,0.7)', boxShadow: '0 10px 28px rgba(36,48,55,0.18)' }}
                >
                  <img src={img} alt={`${client.name} post ${i + 1}`} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)' }} />
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}
    </>
  );
};

const SEO_MAP: Record<string, { title: string; description: string }> = {
  branding: {
    title: 'Branding & Identity Portfolio',
    description:
      'Brand identity systems, logos, and visual guidelines designed by Huna Creatives for premium brands across equestrian, dental, nutrition, and more.',
  },
  'graphic-design': {
    title: 'Graphic Design Portfolio',
    description:
      'Bold, strategic graphic design work across campaigns, print collateral, and digital assets — by Huna Creatives.',
  },
  'social-media': {
    title: 'Social Media Content Portfolio',
    description:
      'Social media content systems built for brands in equestrian, dental, mortgage, and sports nutrition by Huna Creatives.',
  },
  'email-marketing': {
    title: 'Email Marketing Design Portfolio',
    description:
      'Email newsletter and campaign designs that build trust and drive click-through — by Huna Creatives.',
  },
  'web-design': {
    title: 'Web Design Portfolio',
    description:
      'Websites designed and built for brands that needed a premium digital presence — by Huna Creatives.',
  },
};

const PortfolioCategoryPage = () => {
  const { categoryId } = useParams();
  const [category, setCategory] = useState(null);

  const seoData = SEO_MAP[categoryId ?? ''] ?? {
    title: 'Portfolio',
    description: 'Explore work by Huna Creatives across branding, social media, email marketing, and web design.',
  };

  useSEO({
    title: seoData.title,
    description: seoData.description,
    canonical: `/portfolio/${categoryId}`,
    schema: {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.hunacreatives.com' },
        { '@type': 'ListItem', position: 2, name: 'Portfolio', item: 'https://www.hunacreatives.com/portfolio' },
        {
          '@type': 'ListItem',
          position: 3,
          name: seoData.title,
          item: `https://www.hunacreatives.com/portfolio/${categoryId}`,
        },
      ],
    },
  });

  /* ── Scroll to top when category changes ── */
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [categoryId]);

  /* ── Load category safely with error handling ── */
  useEffect(() => {
    try {
      const found = categoryDataMap[categoryId ?? ''];
      setCategory(found || null);
    } catch (err) {
      console.error('Error loading category:', err);
      setCategory(null);
    }
  }, [categoryId]);

  if (!category) {
    return (
      <div className="min-h-screen bg-[#F5F5F5]">
        <Navigation invertOnScroll barTheme="light" />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <h2 className="font-display text-2xl font-bold text-[#243037] mb-4">Category not found</h2>
            <Link to="/portfolio" className="text-[#FF5B05] hover:text-[#FF8A47] font-medium">
              ← Back to Portfolio
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const isSocialMedia = category.id === 'social-media';
  const isGraphicDesign = category.id === 'graphic-design';
  const isEmailMarketing = category.id === 'email-marketing';
  const isWebDesign = category.id === 'web-design';
  // All category pages render light, matching the rest of the site.
  const isDarkTheme = false;

  return (
    <div
      className="min-h-screen font-body"
      style={{ background: '#F5F5F5' }}
    >
      <Navigation invertOnScroll barTheme="light" />

      {/* Same continuous orb field as Home / About / Services — a normal
          (not `fixed`) wrapper that grows with the full page content, with
          every section nested inside it and left transparent, so the color
          shows through the glass cards instead of being covered by them. */}
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

      <main className="relative z-10">
        {/* ── HERO ── */}
        {/* Header lives in its own blue frosted panel — the same glass recipe as
            the Services "what we do" blob — so it reads as a distinct masthead
            with real separation from the work below it. */}
        <section className="relative pt-24 sm:pt-28 pb-10 sm:pb-14 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
            <div
              className="relative rounded-3xl p-8 sm:p-10 lg:p-14 overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(160,180,205,0.55), rgba(205,215,225,0.3))',
                backdropFilter: 'blur(30px) saturate(160%)',
                WebkitBackdropFilter: 'blur(30px) saturate(160%)',
                border: '1px solid rgba(255,255,255,0.5)',
                boxShadow: '0 20px 60px rgba(36,48,55,0.12), inset 0 1px 0 rgba(255,255,255,0.5)',
              }}
            >
              {/* warm bloom in the corner so the panel picks up the brand orange */}
              <div
                className="pointer-events-none absolute -top-24 -right-20 w-[420px] h-[420px] rounded-full"
                style={{ background: 'radial-gradient(circle, rgba(255,91,5,0.22), transparent 70%)', filter: 'blur(60px)' }}
              />

              <div className="relative z-10">
                <Link
                  to="/portfolio"
                  className="inline-flex items-center gap-2 text-[10px] font-semibold tracking-[0.25em] uppercase text-[#075056] hover:text-[#FF5B05] transition-colors mb-6 group"
                >
                  <i className="ri-arrow-left-line text-xs group-hover:-translate-x-1 transition-transform" />
                  <span>Back to Portfolio</span>
                </Link>

                <div className="grid lg:grid-cols-[1.2fr_1fr] gap-8 lg:gap-14 items-end">
                  <div className="animate-fade-in-up opacity-0-init">
                    <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold font-display leading-tight text-[#243037] mb-4">
                      {category.name}
                    </h1>
                    <p className="text-sm leading-relaxed text-[#243037]/65">
                      {category.description}
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-3 animate-fade-in-up opacity-0-init delay-300">
                    {[
                      { label: 'Projects', value: category.stats.projects, icon: 'ri-stack-line' },
                      { label: 'Satisfaction', value: category.stats.satisfaction, icon: 'ri-heart-line' },
                      { label: 'Rating', value: category.stats.rating, icon: 'ri-star-line' },
                    ].map((stat) => (
                      <div
                        key={stat.label}
                        className="rounded-2xl px-2 py-4 text-center transition-transform duration-300 hover:-translate-y-1"
                        style={{
                          background: 'rgba(255,255,255,0.5)',
                          backdropFilter: 'blur(20px) saturate(160%)',
                          WebkitBackdropFilter: 'blur(20px) saturate(160%)',
                          border: '1px solid rgba(255,255,255,0.6)',
                          boxShadow: '0 8px 32px rgba(36,48,55,0.08), inset 0 1px 0 rgba(255,255,255,0.5)',
                        }}
                      >
                        <i className={`${stat.icon} text-[#FF5B05] text-sm mb-2 block`} />
                        <div className="text-lg md:text-xl font-bold font-display mb-0.5 text-[#243037]">
                          {stat.value}
                        </div>
                        <div className="text-[9px] tracking-wide uppercase whitespace-nowrap text-[#243037]/45">
                          {stat.label}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── SOCIAL MEDIA SPECIAL LAYOUT ── */}
        {isSocialMedia ? (
          <SocialMediaLayout category={category} />
        ) : isGraphicDesign ? (
          <GraphicDesignLayout category={category} />
        ) : isEmailMarketing ? (
          <EmailMarketingLayout category={category} />
        ) : isWebDesign ? (
          <WebDesignLayout />
        ) : (
          /* ── GENERIC PROJECTS GALLERY (Branding) ── */
          <section className="py-16 sm:py-20 px-4 sm:px-6 relative">

            <div className="max-w-6xl mx-auto relative z-10">
              <div className="text-center mb-12 md:mb-16 animate-fade-in-up opacity-0-init">
                <h2 className="font-display text-xl md:text-2xl font-bold text-[#243037] mb-4">
                  Featured Projects
                </h2>
                <p className="text-[#243037]/55 text-sm max-w-xl mx-auto">
                  Complete identity systems — logo suites, color and type systems,
                  brand guidelines, and the strategy underneath them. Each project
                  below is a brand built from the ground up.
                </p>
              </div>

              {category.projects.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
                  {category.projects.map((project, index) => {
                    const cardContent = (
                      <>
                        <div
                          className="relative overflow-hidden rounded-xl sm:rounded-2xl mb-2 sm:mb-4 aspect-[3/4]"
                          style={{ background: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.7)', boxShadow: '0 10px 28px rgba(36,48,55,0.18)' }}
                        >
                          <img
                            src={project.image}
                            alt={project.title}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                          <div
                            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(255,91,5,0.18) 50%, transparent 100%)' }}
                          />
                          <div className="absolute bottom-0 left-0 right-0 p-5 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-400">
                            <span
                              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full text-white"
                              style={{ background: 'linear-gradient(135deg, #FF5B05, #FF8A47)' }}
                            >
                              <i className="ri-eye-line" />
                              View Project
                            </span>
                          </div>
                        </div>

                        <h3
                          className="text-xs sm:text-sm font-semibold text-[#243037] mb-1 sm:mb-1.5 leading-snug transition-all duration-300"
                          style={{ fontFamily: 'Montserrat, sans-serif' }}
                        >
                          {project.title}
                        </h3>
                        <p className="text-[#243037]/55 text-[11px] sm:text-xs leading-relaxed hidden sm:block">{project.description}</p>
                      </>
                    );

                    return project.slug ? (
                      <Link
                        to={`/portfolio/project/${project.slug}`}
                        key={project.id}
                        className="group cursor-pointer block"
                        style={{ animation: `catFadeUp 0.6s ease-out ${index * 0.08}s both` }}
                      >
                        {cardContent}
                      </Link>
                    ) : (
                      <div
                        key={project.id}
                        className="group cursor-pointer"
                        style={{ animation: `catFadeUp 0.6s ease-out ${index * 0.08}s both` }}
                      >
                        {cardContent}
                      </div>
                    );
                  })}

                  {/* Coming Soon card */}
                  <div
                    className="flex flex-col"
                    style={{ animation: `catFadeUp 0.6s ease-out ${category.projects.length * 0.08}s both` }}
                  >
                    <div
                      className="relative overflow-hidden rounded-xl sm:rounded-2xl mb-2 sm:mb-4 aspect-[3/4] flex flex-col items-center justify-center text-center p-4 sm:p-8"
                      style={{
                        background: 'rgba(255,255,255,0.4)',
                        backdropFilter: 'blur(20px) saturate(160%)',
                        WebkitBackdropFilter: 'blur(20px) saturate(160%)',
                        border: '1px dashed rgba(255,91,5,0.3)',
                      }}
                    >
                      <div
                        className="w-14 h-14 flex items-center justify-center rounded-2xl mb-5"
                        style={{
                          background: 'linear-gradient(135deg, rgba(255,91,5,0.16), rgba(255,138,71,0.1))',
                          border: '1px solid rgba(255,91,5,0.25)',
                        }}
                      >
                        <i className="ri-time-line text-2xl text-[#FF5B05]" />
                      </div>
                      <h3 className="font-display text-sm font-bold text-[#243037] mb-3">
                        More Coming Soon
                      </h3>
                      <p className="text-[#243037]/55 text-xs leading-relaxed max-w-[180px]">
                        We&apos;re adding more projects to our portfolio. Check back soon!
                      </p>
                      <div className="absolute bottom-5 left-0 right-0 flex justify-center gap-1.5">
                        {[0, 1, 2].map((i) => (
                          <span
                            key={i}
                            className="w-1.5 h-1.5 rounded-full bg-[#FF5B05]/40"
                            style={{ animationDelay: `${i * 0.3}s`, animation: 'pulse 1.5s ease-in-out infinite' }}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-[#243037]/40 text-xs">In progress</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-16">
                  <div
                    className="w-16 h-16 flex items-center justify-center rounded-2xl mx-auto mb-6"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255,91,5,0.16), rgba(255,138,71,0.1))',
                      border: '1px solid rgba(255,91,5,0.25)',
                    }}
                  >
                    <i className="ri-tools-line text-2xl text-[#FF5B05]" />
                  </div>
                  <h3 className="font-display text-xl font-bold text-[#243037] mb-3">
                    More Projects Coming Soon
                  </h3>
                  <p className="text-[#243037]/55 text-sm max-w-md mx-auto leading-relaxed">
                    We&apos;re currently working on adding more of our projects to showcase. Check back soon to see more of our work!
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── CTA ── */}
        <section
          className="py-16 sm:py-20 px-4 sm:px-6 relative"
        >
          {isDarkTheme ? (
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] rounded-full pointer-events-none opacity-25"
              style={{ background: 'radial-gradient(circle, rgba(239,68,68,0.18) 0%, transparent 70%)', filter: 'blur(100px)' }}
            />
          ) : (
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[1px]"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(0,0,0,0.08), transparent)' }}
            />
          )}

          <div className="max-w-6xl mx-auto relative z-10">
            {isDarkTheme ? (
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8 md:gap-16">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-[10px] font-medium tracking-[0.3em] uppercase text-[#FF5B05]/80">Let&apos;s Create</span>
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
                    className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full text-sm font-semibold border border-orange-400/50 text-[#FF5B05] hover:bg-orange-500/10 transition-all duration-300 hover:scale-105 whitespace-nowrap cursor-pointer"
                  >
                    <i className="ri-calendar-line text-base" />
                    Book a Free Call
                  </a>
                </div>
              </div>
            ) : (
              /* Same frosted "Gradient Cloud" CTA panel used on the Services page */
              <div
                className="max-w-4xl mx-auto rounded-3xl p-10 sm:p-14 text-center relative overflow-hidden"
                style={{
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
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Link
                    to="/contact"
                    className="px-8 py-3.5 rounded-full text-xs font-semibold tracking-widest uppercase text-[#243037] bg-white whitespace-nowrap cursor-pointer transition-transform duration-300 hover:scale-105"
                  >
                    Start a Project
                  </Link>
                  <span className="text-white/60 text-xs">Free consultation · No commitment</span>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
      </div>

      <Footer isDark={isDarkTheme} />

      <style>{`
        @keyframes catFadeUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default PortfolioCategoryPage;
