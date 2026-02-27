import { useParams, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Navigation from '../../../components/feature/Navigation';
import Footer from '../../home/components/Footer';

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
    logo: 'https://images.squarespace-cdn.com/content/v1/688d8b734aa1173915369520/72a411f5-10da-432a-b81b-b82da598e3d0/EQ+logo.png',
    logoBg: '#1a1a1a',
    dark: true,
    description:
      'In the competitive world of sport horses, presentation is everything. For Equestrian International, we designed content that speaks directly to serious buyers and breeders—spotlighting world-class horses, showcasing seller credibility, and creating a premium feed aesthetic that reflects the prestige of the industry. Every post is tailored to attract the right audience and inspire meaningful inquiries.',
    images: [
      'https://images.squarespace-cdn.com/content/v1/688d8b734aa1173915369520/6bbee6ae-b7ff-442a-ad56-37e7b932165f/3+%286%29.png',
      'https://images.squarespace-cdn.com/content/v1/688d8b734aa1173915369520/c4061d0f-17ba-47db-8460-57b6cd81f75d/1+%286%29.png',
      'https://images.squarespace-cdn.com/content/v1/688d8b734aa1173915369520/b7ef19cd-8059-4958-9ef6-29b1fe3f6e2c/EQ-Brand+Slides.png',
      'https://images.squarespace-cdn.com/content/v1/688d8b734aa1173915369520/a606ca37-f47c-47c9-a02b-57183b789d0f/Jumper.png',
    ],
  },
  {
    id: 'ebo',
    number: '2',
    name: 'Everyone by One',
    logo: 'https://images.squarespace-cdn.com/content/v1/688d8b734aa1173915369520/859c9525-49cf-4a96-8a33-d38ee569fc83/everyone-by-one-rgb-descriptor-1.png',
    logoBg: '#f7f5f2',
    dark: false,
    description:
      "Parents want reassurance when it comes to their children's dental health. For Everyone By One, we create educational, parent‑friendly content that answers real‑life questions—from pacifier habits to first dental visits—while building a warm, trustworthy online presence that feels like a friendly guide, not a sales pitch.",
    images: [
      'https://images.squarespace-cdn.com/content/v1/688d8b734aa1173915369520/cd1db0a5-911d-41b7-ad33-c09c129949cf/Screenshot+2025-08-08+at+7.35.47%E2%80%AFPM.png',
      'https://images.squarespace-cdn.com/content/v1/688d8b734aa1173915369520/828e27e3-6386-488e-8e54-975189d15f73/Screenshot+2025-08-08+at+7.36.08%E2%80%AFPM.png',
      'https://images.squarespace-cdn.com/content/v1/688d8b734aa1173915369520/6e2dffa3-db84-41ad-855b-5ded2a2cbac1/Screenshot+2025-08-08+at+7.35.52%E2%80%AFPM.png',
      'https://images.squarespace-cdn.com/content/v1/688d8b734aa1173915369520/a95dec7a-de3b-4875-9a10-a3adf4964e5d/Screenshot+2025-08-08+at+7.36.31%E2%80%AFPM.png',
    ],
  },
  {
    id: 'tct',
    number: '3',
    name: 'The Cowart Team Mortgage',
    logo: 'https://images.squarespace-cdn.com/content/v1/688d8b734aa1173915369520/70602bd4-a5c7-4b53-97f4-7b8a6d515d9a/Website-Covers-1.png',
    logoBg: '#1a1a1a',
    dark: true,
    description:
      "Mortgages don't have to feel intimidating. With The Cowart Team, our goal was to turn complex financial concepts into approachable, trust‑building content. We create a balance of educational posts, client success stories, and timely market insights—making their feed both a resource hub and a brand people trust with their biggest financial decision.",
    images: [
      'https://images.squarespace-cdn.com/content/v1/688d8b734aa1173915369520/66e7537f-3ea0-4e63-ba59-d101e1b19375/TCT+-+1.PNG',
      'https://images.squarespace-cdn.com/content/v1/688d8b734aa1173915369520/ec8953cd-9a8c-43c7-a208-28c74cea8cf3/TCT+-+2.jpg',
      'https://images.squarespace-cdn.com/content/v1/688d8b734aa1173915369520/6225084b-a17d-4870-91aa-b69cc5202256/TCT+-+3.jpg',
      'https://images.squarespace-cdn.com/content/v1/688d8b734aa1173915369520/7ee6ce64-804a-4cc3-ba60-a281d386c43c/TCT+-+4.jpg',
    ],
  },
  {
    id: 'bcn',
    number: '4',
    name: 'Blue Collar Nutrition',
    logo: 'https://images.squarespace-cdn.com/content/v1/688d8b734aa1173915369520/6052933e-0cc7-4b0b-b577-ea433e7c5032/BCN+Logo+Black.png',
    logoBg: '#f7f5f2',
    dark: false,
    description:
      "For Blue Collar Nutrition, our focus is on creating bold, high‑impact content that matches the brand's energy and grit. We develop a mix of product‑centered promotions, seasonal campaigns, and lifestyle‑driven content designed to connect with their community of athletes and everyday grinders. From supplement spotlights to campaign launches, every piece of content reinforces their identity as a trusted, no‑nonsense brand built on performance, consistency, and strength.",
    images: [
      'https://images.squarespace-cdn.com/content/v1/688d8b734aa1173915369520/ccd16ed1-02ba-4ad6-be83-377096c7027f/1+BCN+-+Social+Media+Contents.png',
      'https://images.squarespace-cdn.com/content/v1/688d8b734aa1173915369520/1fbd6003-4130-42e4-8c92-8f4ebc3c8dff/2+Dad+Bundle.png',
      'https://images.squarespace-cdn.com/content/v1/688d8b734aa1173915369520/499ff7e8-6a34-4b79-a72c-aff1c1c2296c/5+BCN+-+Social+Media+Contents.png',
      'https://images.squarespace-cdn.com/content/v1/688d8b734aa1173915369520/4bf4753e-2a8c-4578-bb75-4dc82301cf89/23+BCN+-+Social+Media+Contents.png',
    ],
  },
];

/* ── Graphic Design dedicated layout ──────────────────────────────────────── */
const GraphicDesignLayout = ({ category }) => {
  const sections = [
    {
      id: 'mockups',
      number: '01',
      title: 'Mockups That Make It Real.',
      dark: true,
      bg: '#111111',
      description: 'Transform your designs into realistic, polished visuals that feel tangible and ready for the world.',
      subtext: 'From pitch decks to social showcases, we make your brand look professional and unforgettable at every stage.',
      image: 'https://images.squarespace-cdn.com/content/v1/688d8b734aa1173915369520/fb91b7af-98a4-414d-81b7-6b5ea5881a8f/3+Bottles+BCN.png',
      imageLeft: false,
    },
    {
      id: 'menus',
      number: '02',
      title: 'Menus With Meaning.',
      dark: true,
      bg: '#0d0d0d',
      description: 'Menus are an extension of your brand. Every choice of font, color, and layout sets the stage for what your guests are about to enjoy.',
      subtext: 'We design menus that grab attention, spark curiosity, and leave a lasting impression.',
      image: 'https://images.squarespace-cdn.com/content/v1/688d8b734aa1173915369520/93302523-9646-498f-b02a-81bbfdec163a/Vox+Menu+-+Website.png',
      imageLeft: true,
    },
    {
      id: 'flyers',
      number: '03',
      title: 'Flyers That Fly Further.',
      dark: true,
      bg: '#111111',
      description: 'Compact, eye-catching, and built to travel far. Flyers carry your message directly into people\'s hands.',
      subtext: 'Every flyer is crafted to grab attention, spark curiosity, and leave a clear memory of your brand.',
      image: 'https://images.squarespace-cdn.com/content/v1/688d8b734aa1173915369520/d8a9d944-4f06-46ce-ae78-22290ef04387/Flyer+mockup+2.png',
      imageLeft: false,
    },
  ];

  return (
    <>
      {sections.map((sec) => (
        <section
          key={sec.id}
          className="relative py-16 md:py-20 px-4 md:px-6"
          style={{ background: sec.bg }}
        >
          <div
            className="absolute top-0 left-0 right-0 h-px"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(249,115,22,0.2), transparent)',
            }}
          />
          <div className="max-w-7xl mx-auto">
            <div className={`flex flex-col ${sec.imageLeft ? 'lg:flex-row-reverse' : 'lg:flex-row'} gap-8 md:gap-12 lg:gap-20 items-center`}>
              {/* Text */}
              <div className="flex-1 max-w-xl">
                <span
                  className="text-[11px] font-semibold tracking-widest uppercase mb-3 block"
                  style={{ color: 'rgba(249,115,22,0.85)' }}
                >
                  {sec.number} — Graphic Design
                </span>
                <h2
                  className="font-display text-xl md:text-2xl lg:text-3xl font-bold mb-4 md:mb-5 leading-tight"
                  style={{ color: '#ffffff' }}
                >
                  {sec.title}
                </h2>
                <p
                  className="text-sm leading-relaxed mb-3 md:mb-4"
                  style={{ color: 'rgba(255,255,255,0.5)' }}
                >
                  {sec.description}
                </p>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: 'rgba(255,255,255,0.3)' }}
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

      {/* Flyers Gallery */}
      <section className="relative py-16 md:py-20 px-4 md:px-6" style={{ background: '#0d0d0d' }}>
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(249,115,22,0.2), transparent)' }}
        />
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10 md:mb-12 lg:mb-16">
            <span className="text-[11px] font-semibold tracking-widest uppercase mb-3 block" style={{ color: 'rgba(249,115,22,0.85)' }}>
              04 — Our Work
            </span>
            <h2 className="font-display text-xl md:text-2xl lg:text-3xl font-bold text-white mb-3 md:mb-4">Past Flyers &amp; Designs</h2>
            <p className="text-white/35 text-sm max-w-lg mx-auto">Bold, intentional designs built to make an impression.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {[
              'https://static.readdy.ai/image/08981d36cd0b73cf08022d4d82071d03/203f7572a12f03a6a55d3a97977e399c.png',
              'https://static.readdy.ai/image/08981d36cd0b73cf08022d4d82071d03/4a760c0b68accebf5448cc8bb9f956de.png',
              'https://static.readdy.ai/image/08981d36cd0b73cf08022d4d82071d03/0e684af0f12d20b4bf8a449578cbf1b0.png',
              'https://static.readdy.ai/image/08981d36cd0b73cf08022d4d82071d03/9229997a693668f1ea9573317309e1f1.png',
              'https://static.readdy.ai/image/08981d36cd0b73cf08022d4d82071d03/129b76b17e2c06cca769b642a63ed500.png',
              'https://static.readdy.ai/image/08981d36cd0b73cf08022d4d82071d03/e47d531d58febd435a7fb4e96c85fde7.png',
              'https://static.readdy.ai/image/08981d36cd0b73cf08022d4d82071d03/55e240e348314c84ba40f27d212d20a5.png',
              'https://static.readdy.ai/image/08981d36cd0b73cf08022d4d82071d03/2f115e6259210ddf16ac62cf5dfc7142.png',
            ].map((img, i) => (
              <div
                key={i}
                className="group relative overflow-hidden rounded-lg md:rounded-xl aspect-[4/5]"
                style={{ border: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 2px 12px rgba(0,0,0,0.3)' }}
              >
                <img
                  src={img}
                  alt={`Flyer design ${i + 1}`}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(249,115,22,0.08) 50%, transparent 100%)' }}
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
const emailShowcaseImage = 'https://static.readdy.ai/image/08981d36cd0b73cf08022d4d82071d03/0786ff49839456d59f84f19d66a7f551.png';

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
      <section className="relative py-16 md:py-20 px-4 md:px-6" style={{ background: '#dad9d9' }}>
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(0,0,0,0.08), transparent)' }}
        />
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-8 md:gap-12 lg:gap-16 items-start">

            {/* Left: Text */}
            <div className="flex-shrink-0 w-full lg:w-80 xl:w-[420px]">
              <h2 className="font-display text-xl md:text-2xl lg:text-3xl font-bold text-[#1a1a1a] mb-4 md:mb-6 leading-tight">
                Email Marketing That Works Smarter for Your Brand
              </h2>
              <p className="text-sm leading-relaxed mb-4 md:mb-5 text-[#1a1a1a]/60">
                At Huna Creatives, we believe email isn't just a channel — it's one of the most powerful tools for building genuine connections with your audience. Our email marketing solutions are designed to do more than just land in inboxes. We create campaigns that tell your story, showcase your brand, and inspire action.
              </p>
              <p className="text-sm leading-relaxed mb-4 md:mb-5 text-[#1a1a1a]/60">
                From nurturing leads to turning one-time buyers into loyal customers, we focus on strategy, design, and performance. Each email is crafted to look beautiful, read effortlessly, and drive measurable results. Whether it's promoting seasonal offers, sharing updates, or building long-term brand trust, our approach ensures that every send moves you closer to your goals.
              </p>
              <p className="text-sm font-semibold text-[#1a1a1a]/80 mb-6 md:mb-8">
                Think of us as your partner in turning clicks into customers — and emails into lasting relationships.
              </p>
              <a
                href="/contact"
                className="inline-flex items-center justify-center gap-2 px-6 md:px-7 py-2 md:py-2.5 font-semibold rounded-full border-2 text-[#1a1a1a] text-sm whitespace-nowrap cursor-pointer hover:bg-[#1a1a1a] hover:text-white transition-all duration-300 w-full md:w-auto justify-center"
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
      <section className="relative py-16 md:py-20 px-4 md:px-6" style={{ background: '#f0ece8' }}>
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(0,0,0,0.06), transparent)' }}
        />
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-xl md:text-2xl lg:text-3xl font-bold mb-4 md:mb-6 leading-tight" style={{ color: '#c4572a' }}>
            Not seeing the ROI you deserve from email marketing?
          </h2>
          <p className="text-sm leading-relaxed text-[#3a3330]/65">
            At <strong className="text-[#3a3330]">Huna Creatives</strong>, we don't just send emails — we craft experiences that build trust, spark action, and drive measurable results. By combining smart strategy, creative storytelling, and proven tactics, we transform your inbox presence into a powerful engine for growth. Let's turn every send into a step toward stronger connections and higher revenue.
          </p>
        </div>
      </section>

      {/* Advantages section */}
      <section className="relative py-16 md:py-20 px-4 md:px-6" style={{ background: '#2a2220' }}>
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(196,135,80,0.3), transparent)' }}
        />
        <div className="max-w-7xl mx-auto">
          {/* Background image banner */}
          <div className="relative rounded-2xl md:rounded-3xl overflow-hidden mb-12 md:mb-16">
            <div className="w-full h-[240px] md:h-[320px] lg:h-[420px]">
              <img
                src="https://readdy.ai/api/search-image?query=modern%20workspace%20flat%20lay%20with%20laptop%20keyboard%20coffee%20cup%20succulent%20plant%20and%20airpods%20on%20dark%20matte%20desk%20surface%20dramatic%20moody%20lighting%20cinematic%20dark%20photography%20professional%20creative%20workspace&width=1400&height=500&seq=email-workspace-001&orientation=landscape"
                alt="Email marketing workspace"
                className="w-full h-full object-cover object-top"
              />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(42,34,32,0.85) 0%, rgba(42,34,32,0.4) 60%, transparent 100%)' }} />
            </div>
            <div className="absolute inset-0 flex items-center px-6 md:px-10 lg:px-16">
              <div className="max-w-lg">
                <span className="text-[11px] font-semibold tracking-widest uppercase mb-3 block" style={{ color: 'rgba(210,150,90,0.9)' }}>
                  02 — Why Email
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
                  background: 'linear-gradient(145deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
                  border: '1px solid rgba(255,255,255,0.07)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.border = '1px solid rgba(210,150,90,0.3)';
                  e.currentTarget.style.boxShadow = '0 10px 40px rgba(210,150,90,0.08)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.border = '1px solid rgba(255,255,255,0.07)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div
                  className="w-9 md:w-10 h-9 md:h-10 flex items-center justify-center rounded-lg md:rounded-xl mb-4 md:mb-5"
                  style={{ background: 'linear-gradient(135deg, rgba(210,150,90,0.25), rgba(196,87,42,0.15))' }}
                >
                  <i className={`${adv.icon} text-[#d2965a] text-sm md:text-base`} />
                </div>
                <h3 className="font-display text-sm font-bold text-white mb-2 md:mb-3">{adv.title}</h3>
                <p className="text-xs leading-relaxed text-white/40">{adv.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
};

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
        id: 'b1',
        title: 'The Second Haus',
        description:
          'Complete brand identity for a modern consignment boutique — logo, typography, color palette, brand guidelines, packaging, and every touchpoint.',
        image:
          'https://readdy.ai/api/search-image?query=modern%20minimalist%20brand%20identity%20design%20system%20with%20logo%20variations%20color%20palette%20and%20typography%20guidelines%20displayed%20on%20deep%20black%20elegant%20surface%20with%20glass%20reflections%20and%20warm%20amber%20accent%20lighting%20professional%20dark%20studio%20photography%20cinematic%20mood&width=600&height=750&seq=cat-brand1-dark&orientation=portrait',
        slug: 'the-second-haus',
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
};

/* ── Social Media dedicated layout ────────────────────────────────────────── */
const SocialMediaLayout = ({ category }) => {
  const clients = category.socialClients ?? [];

  return (
    <>
      {/* Intro text */}
      <section className="py-12 md:py-16 px-4 md:px-6 relative">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-white/50 text-sm leading-relaxed">{category.description}</p>
        </div>
      </section>

      {/* Client sections */}
      {clients.map((client, idx) => {
        const isDark = client.dark;
        return (
          <section
            key={client.id}
            className="relative py-16 md:py-20 px-4 md:px-6"
            style={{ background: isDark ? '#111111' : '#f7f5f2' }}
          >
            {/* top divider */}
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[1px]"
              style={{
                background: isDark
                  ? 'linear-gradient(90deg, transparent, rgba(249,115,22,0.25), transparent)'
                  : 'linear-gradient(90deg, transparent, rgba(0,0,0,0.1), transparent)',
              }}
            />

            <div className="max-w-7xl mx-auto">
              {/* Header row */}
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 md:gap-8 mb-10 md:mb-12">
                {/* Left: number + title + description */}
                <div className="flex-1 max-w-xl">
                  <span
                    className="text-[11px] font-semibold tracking-widest uppercase mb-3 block"
                    style={{ color: isDark ? 'rgba(249,115,22,0.8)' : 'rgba(180,100,40,0.9)' }}
                  >
                    {idx + 1 < 10 ? `0${idx + 1}` : idx + 1} — Client
                  </span>
                  <h2
                    className="font-display text-xl md:text-2xl lg:text-3xl font-bold mb-4 md:mb-5 leading-tight"
                    style={{ color: isDark ? '#ffffff' : '#1a1a1a' }}
                  >
                    {client.name}
                  </h2>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.55)' }}
                  >
                    {client.description}
                  </p>
                </div>

                {/* Right: logo */}
                <div
                  className="flex-shrink-0 flex items-center justify-center rounded-xl md:rounded-2xl p-5 md:p-6 w-40 h-24 md:w-48 md:h-28 lg:w-56 lg:h-32"
                  style={{
                    background: client.logoBg,
                    border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
                  }}
                >
                  <img
                    src={client.logo}
                    alt={`${client.name} logo`}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              </div>

              {/* Image grid — 4 columns on desktop, 2 on mobile */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                {client.images.map((img, i) => (
                  <div
                    key={i}
                    className="group relative overflow-hidden rounded-lg md:rounded-xl aspect-square"
                    style={{
                      border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)',
                    }}
                  >
                    <img
                      src={img}
                      alt={`${client.name} post ${i + 1}`}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      style={{
                        background: isDark
                          ? 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)'
                          : 'linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 60%)',
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </section>
        );
      })}
    </>
  );
};

const PortfolioCategoryPage = () => {
  const { categoryId } = useParams();
  const [category, setCategory] = useState(null);

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
      <div className="min-h-screen bg-[#080808]">
        <Navigation />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Category not found</h2>
            <Link to="/portfolio" className="text-orange-400 hover:text-orange-300 font-medium">
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
  // Dark theme for branding, graphic design, social media
  const isDarkTheme = !isEmailMarketing;

  return (
    <div
      className="min-h-screen font-body"
      style={{ background: isDarkTheme ? '#0a0a0a' : '#fafafa' }}
    >
      <Navigation />

      {/* Ambient background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[700px] rounded-full opacity-20"
          style={{ background: isEmailMarketing ? 'radial-gradient(circle, rgba(196,135,80,0.3) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(239,68,68,0.4) 0%, transparent 70%)' }}
        />
        <div
          className="absolute bottom-1/3 right-0 w-[500px] h-[500px] rounded-full opacity-15"
          style={{ background: isEmailMarketing ? 'radial-gradient(circle, rgba(210,150,90,0.25) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(249,115,22,0.35) 0%, transparent 70%)' }}
        />
        <div
          className="absolute top-2/3 left-0 w-[400px] h-[400px] rounded-full opacity-10"
          style={{ background: isEmailMarketing ? 'radial-gradient(circle, rgba(180,120,70,0.25) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(251,113,133,0.3) 0%, transparent 70%)' }}
        />
      </div>

      {/* Floating Bubbles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="bubble w-20 h-20 animate-bubble-float" style={{ top: '12%', left: '4%', animationDelay: '0s' }} />
        <div className="bubble w-12 h-12 animate-bubble-float-slow" style={{ top: '35%', right: '6%', animationDelay: '2s' }} />
        <div className="bubble w-8 h-8 animate-bubble-float-fast" style={{ top: '65%', left: '10%', animationDelay: '1s' }} />
        <div className="bubble w-16 h-16 animate-bubble-float" style={{ top: '20%', right: '18%', animationDelay: '3s' }} />
        <div className="bubble w-6 h-6 animate-bubble-float-fast" style={{ top: '55%', right: '30%', animationDelay: '0.5s' }} />
        <div className="bubble w-10 h-10 animate-bubble-float-slow" style={{ top: '80%', left: '45%', animationDelay: '4s' }} />
      </div>

      <main className="relative z-10">
        {/* ── HERO ── */}
        <section className="relative pt-24 md:pt-32 pb-12 md:pb-16 lg:pb-24 px-4 md:px-6 overflow-hidden">
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[1px]"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(249,115,22,0.5), transparent)' }}
          />

          <div className="max-w-7xl mx-auto">
            <Link
              to="/portfolio"
              className="inline-flex items-center gap-2 text-orange-500 hover:text-orange-400 transition-colors mb-8 md:mb-10 group"
            >
              <i className="ri-arrow-left-line text-lg group-hover:-translate-x-1 transition-transform" />
              <span className="font-medium whitespace-nowrap text-sm tracking-wide">Back to Portfolio</span>
            </Link>

            <div className="grid lg:grid-cols-2 gap-8 md:gap-10 lg:gap-16 items-center">
              <div className="animate-fade-in-up opacity-0-init">
                <div
                  className="w-11 h-11 md:w-12 md:h-12 lg:w-14 lg:h-14 flex items-center justify-center rounded-lg md:rounded-xl mb-5 md:mb-6"
                  style={{
                    background: 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(249,115,22,0.1))',
                    border: '1px solid rgba(249,115,22,0.25)',
                  }}
                >
                  <i className={`${category.iconClass} text-base md:text-lg lg:text-xl text-orange-500`} />
                </div>

                <span className="inline-flex items-center gap-2 text-[11px] font-medium tracking-widest text-orange-500 uppercase mb-3 md:mb-4">
                  <span className="w-6 h-px bg-orange-500 inline-block" />
                  Portfolio
                </span>

                <h1 className="font-display text-2xl md:text-3xl lg:text-4xl xl:text-[2.75rem] font-bold leading-tight mb-4 md:mb-6">
                  {isDarkTheme ? (
                    <span className="text-white">{category.name}</span>
                  ) : (
                    <span className="gradient-text-animated">{category.name}</span>
                  )}
                </h1>

                {!isSocialMedia && (
                  <p
                    className="text-sm leading-relaxed max-w-lg"
                    style={{ color: isDarkTheme ? 'rgba(255,255,255,0.45)' : 'rgba(26,26,26,0.5)' }}
                  >
                    {category.description}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3 md:gap-4 animate-fade-in-up opacity-0-init delay-300">
                {[
                  { label: 'Projects', value: category.stats.projects, icon: 'ri-stack-line' },
                  { label: 'Satisfaction', value: category.stats.satisfaction, icon: 'ri-heart-line' },
                  { label: 'Rating', value: category.stats.rating, icon: 'ri-star-line' },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-lg md:rounded-xl lg:rounded-2xl p-4 md:p-5 text-center transition-all duration-300 hover:-translate-y-1"
                    style={isDarkTheme ? {
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      boxShadow: '0 2px 16px rgba(0,0,0,0.3)',
                    } : {
                      background: '#ffffff',
                      border: '1px solid rgba(0,0,0,0.08)',
                      boxShadow: '0 2px 16px rgba(0,0,0,0.05)',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.border = '1px solid rgba(249,115,22,0.3)';
                      e.currentTarget.style.boxShadow = '0 10px 40px rgba(249,115,22,0.1)';
                    }}
                    onMouseLeave={e => {
                      if (isDarkTheme) {
                        e.currentTarget.style.border = '1px solid rgba(255,255,255,0.08)';
                        e.currentTarget.style.boxShadow = '0 2px 16px rgba(0,0,0,0.3)';
                      } else {
                        e.currentTarget.style.border = '1px solid rgba(0,0,0,0.08)';
                        e.currentTarget.style.boxShadow = '0 2px 16px rgba(0,0,0,0.05)';
                      }
                    }}
                  >
                    <div
                      className="w-7 h-7 md:w-8 md:h-8 lg:w-9 lg:h-9 flex items-center justify-center rounded-md md:rounded-lg mx-auto mb-2 md:mb-3"
                      style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(249,115,22,0.1))' }}
                    >
                      <i className={`${stat.icon} text-orange-500 text-xs md:text-sm`} />
                    </div>
                    <div
                      className="text-lg md:text-xl lg:text-2xl font-bold font-display mb-1"
                      style={{ color: isDarkTheme ? '#ffffff' : '#1a1a1a' }}
                    >
                      {stat.value}
                    </div>
                    <div
                      className="text-[10px] md:text-[11px] whitespace-nowrap"
                      style={{ color: isDarkTheme ? 'rgba(255,255,255,0.35)' : 'rgba(26,26,26,0.4)' }}
                    >
                      {stat.label}
                    </div>
                  </div>
                ))}
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
        ) : (
          /* ── GENERIC PROJECTS GALLERY (Branding — dark) ── */
          <section className="py-12 md:py-16 lg:py-24 px-4 md:px-6 relative">
            <div className="absolute inset-0 bg-[#0d0d0d]" />
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[1px]"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)' }}
            />

            <div className="max-w-7xl mx-auto relative z-10">
              <div className="text-center mb-12 md:mb-16 animate-fade-in-up opacity-0-init">
                <span className="inline-flex items-center gap-2 text-[11px] font-medium tracking-widest text-orange-400 uppercase mb-4">
                  <span className="w-6 h-px bg-orange-400 inline-block" />
                  Featured Work
                  <span className="w-6 h-px bg-orange-400 inline-block" />
                </span>
                <h2 className="font-display text-xl md:text-2xl font-bold text-white mb-4">
                  Featured <span className="gradient-text-animated">Projects</span>
                </h2>
                <p className="text-white/35 text-sm max-w-xl mx-auto">
                  Explore our portfolio of work that showcases creativity, strategy, and real results.
                </p>
              </div>

              {category.projects.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {category.projects.map((project, index) => {
                    const cardContent = (
                      <>
                        <div
                          className="relative overflow-hidden rounded-2xl mb-4 aspect-[3/4] border border-white/8"
                          style={{ background: 'rgba(255,255,255,0.03)' }}
                        >
                          <img
                            src={project.image}
                            alt={project.title}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                          <div
                            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(249,115,22,0.15) 50%, transparent 100%)' }}
                          />
                          <div className="absolute bottom-0 left-0 right-0 p-5 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-400">
                            <span
                              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full text-white"
                              style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.8), rgba(249,115,22,0.8))' }}
                            >
                              <i className="ri-eye-line" />
                              View Project
                            </span>
                          </div>
                        </div>

                        <h3
                          className="text-sm font-semibold text-white mb-1.5 leading-snug transition-all duration-300"
                          style={{ fontFamily: 'Montserrat, sans-serif' }}
                        >
                          {project.title}
                        </h3>
                        <p className="text-white/35 text-xs leading-relaxed">{project.description}</p>
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
                      className="relative overflow-hidden rounded-2xl mb-4 aspect-[3/4] flex flex-col items-center justify-center text-center p-8"
                      style={{
                        background: 'linear-gradient(145deg, rgba(239,68,68,0.06), rgba(249,115,22,0.03))',
                        border: '1px dashed rgba(249,115,22,0.25)',
                      }}
                    >
                      <div
                        className="w-14 h-14 flex items-center justify-center rounded-2xl mb-5"
                        style={{
                          background: 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(249,115,22,0.1))',
                          border: '1px solid rgba(249,115,22,0.2)',
                        }}
                      >
                        <i className="ri-time-line text-2xl text-orange-400" />
                      </div>
                      <h3 className="font-display text-sm font-bold text-white mb-3">
                        More Coming Soon
                      </h3>
                      <p className="text-white/35 text-xs leading-relaxed max-w-[180px]">
                        We&apos;re adding more projects to our portfolio. Check back soon!
                      </p>
                      <div className="absolute bottom-5 left-0 right-0 flex justify-center gap-1.5">
                        {[0, 1, 2].map((i) => (
                          <span
                            key={i}
                            className="w-1.5 h-1.5 rounded-full bg-orange-500/40"
                            style={{ animationDelay: `${i * 0.3}s`, animation: 'pulse 1.5s ease-in-out infinite' }}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-white/20 text-xs">In progress</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-16">
                  <div
                    className="w-16 h-16 flex items-center justify-center rounded-2xl mx-auto mb-6"
                    style={{
                      background: 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(249,115,22,0.1))',
                      border: '1px solid rgba(249,115,22,0.25)',
                    }}
                  >
                    <i className="ri-tools-line text-2xl text-orange-400" />
                  </div>
                  <h3 className="font-display text-xl font-bold text-white mb-3">
                    More Projects Coming Soon
                  </h3>
                  <p className="text-white/40 text-sm max-w-md mx-auto leading-relaxed">
                    We&apos;re currently working on adding more of our projects to showcase. Check back soon to see more of our work!
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── CTA ── */}
        <section
          className="py-12 md:py-16 lg:py-24 px-4 md:px-6 relative"
          style={{ background: isDarkTheme ? '#0a0a0a' : (isEmailMarketing ? '#dad9d9' : '#f0efed') }}
        >
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[1px]"
            style={{ background: isDarkTheme ? 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)' : 'linear-gradient(90deg, transparent, rgba(0,0,0,0.08), transparent)' }}
          />

          <div className="max-w-4xl mx-auto relative z-10">
            <div
              className="relative rounded-2xl md:rounded-3xl p-6 md:p-8 lg:p-16 text-center overflow-hidden"
              style={isDarkTheme ? {
                background: '#141414',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 4px 40px rgba(0,0,0,0.4)',
              } : {
                background: isEmailMarketing ? '#f0ece8' : '#ffffff',
                border: '1px solid rgba(0,0,0,0.07)',
                boxShadow: isEmailMarketing ? '0 8px 24px rgba(210,87,42,0.3)' : '0 4px 40px rgba(0,0,0,0.06)',
              }}
            >
              <div
                className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10 pointer-events-none"
                style={{ background: isEmailMarketing ? 'radial-gradient(circle, rgba(196,87,42,0.5) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(239,68,68,0.6) 0%, transparent 70%)' }}
              />
              <div
                className="absolute bottom-0 left-0 w-80 h-80 rounded-full opacity-10 pointer-events-none"
                style={{ background: isEmailMarketing ? 'radial-gradient(circle, rgba(196,87,42,0.4) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(249,115,22,0.5) 0%, transparent 70%)' }}
              />

              <div className="relative z-10">
                <span
                  className="inline-flex items-center gap-2 text-[11px] font-medium tracking-widest uppercase mb-4 md:mb-5"
                  style={{ color: isEmailMarketing ? '#c4572a' : '#f97316' }}
                >
                  <span className="w-5 h-px inline-block" style={{ background: isEmailMarketing ? '#c4572a' : '#f97316' }} />
                  Let&apos;s Work Together
                  <span className="w-5 h-px inline-block" style={{ background: isEmailMarketing ? '#c4572a' : '#f97316' }} />
                </span>
                <h2 className="font-display text-xl md:text-2xl lg:text-3xl font-bold mb-3 md:mb-4 leading-tight" style={{ color: isDarkTheme ? '#ffffff' : '#1a1a1a' }}>
                  Ready to start your
                  <br />
                  {isEmailMarketing ? (
                    <span style={{ color: '#c4572a' }}>next project?</span>
                  ) : (
                    <span className="gradient-text-animated">next project?</span>
                  )}
                </h2>
                <p className="text-xs md:text-sm mb-6 md:mb-8 lg:mb-10 max-w-md mx-auto" style={{ color: isDarkTheme ? 'rgba(255,255,255,0.35)' : 'rgba(26,26,26,0.45)' }}>
                  Let&apos;s create something amazing together. Get in touch to discuss your vision and bring it to life.
                </p>
                <Link
                  to="/contact"
                  className="inline-flex items-center justify-center gap-2 px-6 md:px-8 lg:px-10 py-2.5 md:py-3 lg:py-3.5 font-semibold rounded-full shadow-lg hover:scale-105 transition-all duration-300 whitespace-nowrap text-white text-xs md:text-sm"
                  style={{
                    background: isEmailMarketing
                      ? 'linear-gradient(135deg, #c4572a, #d2965a)'
                      : 'linear-gradient(135deg, #ef4444, #f97316, #fb7185)',
                    backgroundSize: '200% 200%',
                    boxShadow: isEmailMarketing ? '0 8px 24px rgba(210,87,42,0.3)' : '0 8px 24px rgba(239,68,68,0.3)',
                  }}
                >
                  <span>Get Started</span>
                  <i className="ri-arrow-right-line text-lg" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

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
