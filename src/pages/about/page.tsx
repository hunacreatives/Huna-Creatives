import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import Navigation from '../../components/feature/Navigation';
import Footer from '../home/components/Footer';
import { useSEO } from '../../hooks/useSEO';

const teamMembers = [
  {
    name: 'Francis Fiel Roble',
    role: 'Founder/Creative Director',
    bio: 'The visionary behind Huna. Francis leads with bold ideas and a deep belief that design should always serve a purpose.',
    image: '/images/team-francis-fiel-roble.webp',
    hasPhoto: true,
  },
  {
    name: 'Thamara Ong',
    role: 'Partner & Senior Brand Strategist',
    bio: 'Thamara is the strategic force behind every brand story. She turns insights into direction and ideas into impact.',
    image: '/images/team-thamara-ong.webp',
    hasPhoto: true,
  },
  {
    name: 'Ma. Reeva Jumawan',
    role: 'Partner & Senior Visual Director',
    bio: 'Reeva brings visual worlds to life. Her eye for detail and aesthetic direction keeps every project looking sharp and intentional.',
    image: '/images/team-reeva-jumawan.webp',
    hasPhoto: true,
  },
  {
    name: 'Katleen Nellas',
    role: 'Senior Graphic Designer',
    bio: 'Katleen crafts visuals that speak before words do. She blends creativity with precision to deliver designs that truly stand out.',
    image: '/images/team-katleen-nellas.webp',
    hasPhoto: true,
  },
  {
    name: 'Abigail Duterte',
    role: 'HR Specialist/Admin',
    bio: 'Abigail is the backbone of the team. She keeps everything running smoothly so the creatives can focus on what they do best.',
    image: '/images/team-abigail-duterte.webp',
    hasPhoto: true,
  },
  {
    name: 'Angela Louise Ando',
    role: 'Admin/Account Specialist',
    bio: 'Angela is the bridge between partners and the team. She ensures every project runs on time and every brand feels heard.',
    image: '/images/team-angela-ando.webp',
    hasPhoto: true,
  },
  {
    name: 'Claudette Tahil',
    role: 'Admin/Account Specialist',
    bio: 'Claudette keeps brand relationships strong and operations seamless, ensuring every account is handled with care and precision.',
    image: '/images/6785570f89c09728ca73acf4660742b6.png',
    hasPhoto: true,
    objectPosition: 'center 15%',
  },
  {
    name: 'Reese Jumawan',
    role: 'Junior Graphic Designer',
    bio: 'Reese is a passionate creative who thrives on turning concepts into compelling visuals that resonate with audiences.',
    image: '/images/team-reese-jumawan.webp',
    hasPhoto: true,
  },
  {
    name: 'Jesse Keane Catedral',
    role: 'Junior Graphic Designer',
    bio: 'Jesse is a passionate graphic designer who moves between ideas and mediums with clarity and intention. He builds digital products, shapes brand identities, and designs experiences that draw people in.',
    image: '/images/team-jesse-catedral.png',
    hasPhoto: true,
  },
  {
    name: 'Dan',
    role: 'Web Designer',
    bio: 'Dan brings digital experiences to life through thoughtful web design that balances aesthetics with functionality.',
    image: '',
    hasPhoto: false,
  },
];

const values = [
  {
    icon: 'ri-lightbulb-flash-line',
    title: 'Strategy First',
    desc: 'Every creative decision is rooted in strategy. We dig deep into your brand, audience, and goals before a single pixel is placed.',
  },
  {
    icon: 'ri-team-line',
    title: 'Collaborative Spirit',
    desc: 'We work alongside you — not in a silo. Your insights shape the direction, and our expertise brings it to life.',
  },
  {
    icon: 'ri-rocket-2-line',
    title: 'Purposeful Design',
    desc: 'Beautiful design that does nothing is just decoration. We create visuals that communicate, convert, and connect.',
  },
];

function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
          }
        });
      },
      { threshold: 0.12 }
    );
    const children = el.querySelectorAll('.reveal-item');
    children.forEach((child) => observer.observe(child));
    return () => observer.disconnect();
  }, []);
  return ref;
}

export default function AboutPage() {
  useSEO({
    title: 'About Huna Creatives — Our Team & Story',
    description:
      'Meet the team behind Huna Creatives. A Cebuano creative firm built on strategy, storytelling, and purposeful design — delivering premium creative work for brands globally.',
    canonical: '/about',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'AboutPage',
      '@id': 'https://www.hunacreatives.com/about/#webpage',
      url: 'https://www.hunacreatives.com/about',
      name: 'About Huna Creatives',
      description: 'Huna Creatives is a Cebuano creative firm that believes thoughtful design leads to meaningful impact.',
      isPartOf: { '@id': 'https://www.hunacreatives.com/#website' },
      about: { '@id': 'https://www.hunacreatives.com/#organization' },
    },
  });

  const heroRef = useScrollReveal();
  const storyRef = useScrollReveal();
  const valuesRef = useScrollReveal();
  const teamRef = useScrollReveal();

  return (
    <div className="min-h-screen bg-white text-gray-900 font-body">
      <Navigation />

      {/* Subtle ambient blobs — absolute, not fixed, so GPU doesn't composite on every scroll frame */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-100/50 rounded-full blur-[80px]" />
        <div className="absolute top-1/3 right-0 w-80 h-80 bg-orange-100/50 rounded-full blur-[60px]" />
        <div className="absolute bottom-1/4 left-0 w-72 h-72 bg-rose-100/40 rounded-full blur-[60px]" />
        <div className="absolute bottom-0 right-1/3 w-64 h-64 bg-orange-50/50 rounded-full blur-[50px]" />
      </div>

      {/* ── HERO ── */}
      <section ref={heroRef} className="relative pt-24 sm:pt-28 pb-0 overflow-hidden z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="reveal-item scroll-reveal flex items-center gap-3 mb-5">
            <span className="text-[10px] font-medium tracking-[0.3em] uppercase gradient-text">About Us</span>
          </div>

          <div className="reveal-item scroll-reveal mb-7 max-w-4xl">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold font-display leading-[1.08] tracking-tight text-gray-900">
              We design with{' '}
              <span className="gradient-text-animated">purpose</span>
              <br />and move brands{' '}
              <span className="gradient-text-animated">to action.</span>
            </h1>
          </div>

          <div className="reveal-item scroll-reveal flex flex-wrap gap-8 sm:gap-12 mb-10">
            {[
              { value: '100+', label: 'Projects Delivered' },
              { value: '5.0★', label: 'Partner Rating' },
              { value: '100%', label: 'Satisfaction Rate' },
              { value: '3+', label: 'Years of Excellence' },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-lg sm:text-xl md:text-2xl font-bold font-display gradient-text">{stat.value}</p>
                <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Full-width team photo */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="relative rounded-2xl md:rounded-3xl overflow-hidden">
            <div className="w-full h-[220px] sm:h-[340px] md:h-[440px] lg:h-[520px]">
              <motion.img
                src="/images/team-photo.webp"
                alt="Huna Creatives Team Photo"
                className="w-full h-full object-cover object-top"
                initial={{ filter: 'blur(16px)', scale: 1.04, opacity: 0.8 }}
                whileInView={{ filter: 'blur(0px)', scale: 1, opacity: 1 }}
                viewport={{ once: true, amount: 0.1 }}
                transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-white/20 via-transparent to-transparent" />
            <div className="absolute inset-0 rounded-2xl md:rounded-3xl ring-1 ring-gray-200" />
          </div>
        </div>
      </section>

      {/* ── separator ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-16 sm:mt-20">
        <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
      </div>

      {/* ── STORY ── */}
      <section ref={storyRef} className="py-16 sm:py-20 md:py-24 relative z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-20 items-start">
            {/* Left heading */}
            <div className="lg:col-span-4 lg:sticky lg:top-32">
              <div className="reveal-item scroll-reveal">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-[10px] font-medium tracking-[0.3em] uppercase gradient-text">Our Story</span>
                </div>
                <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold font-display leading-tight text-gray-900">
                  Who We <span className="gradient-text">Are</span>
                </h2>
              </div>
            </div>

            {/* Right body text */}
            <div className="lg:col-span-7 lg:col-start-6">
              <div className="reveal-item scroll-reveal space-y-4 sm:space-y-5">
                <p className="text-sm sm:text-[15px] text-gray-600 leading-relaxed">
                  We are a Cebuano creative firm that believes thoughtful design leads to meaningful impact. At Huna Creatives, we combine strategy, storytelling, and visuals to help brands stand out with clarity and purpose.
                </p>
                <p className="text-sm sm:text-[15px] text-gray-600 leading-relaxed">
                  Our approach is collaborative and intentional — no templates, no cookie-cutter campaigns. Every project we take on is crafted to reflect your brand&apos;s unique voice and connect with the audience that matters.
                </p>
                <p className="text-sm sm:text-[15px] text-gray-700 leading-relaxed">
                  At Huna, it&apos;s not just about looking good.{' '}
                  <strong className="gradient-text font-semibold">
                    It&apos;s about designing with purpose, thinking forward, and moving brands to action.
                  </strong>
                </p>
                <div className="bg-gray-50 border border-gray-100 border-l-4 border-l-orange-400 rounded-xl p-5 sm:p-6 mt-2">
                  <p className="text-gray-500 italic text-xs sm:text-sm leading-relaxed">
                    &ldquo;Design is not just what it looks like and feels like. Design is how it works — and how it moves people.&rdquo;
                  </p>
                  <p className="text-brand-orange text-xs font-semibold mt-2 sm:mt-3">— Huna Creatives</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── separator ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
      </div>

      {/* ── VALUES ── */}
      <section ref={valuesRef} className="py-16 sm:py-20 md:py-24 relative z-10 bg-gray-50/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="reveal-item scroll-reveal flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-12">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-[10px] font-medium tracking-[0.3em] uppercase gradient-text">Our Approach</span>
              </div>
              <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold font-display text-gray-900">
                What <span className="gradient-text-animated">Drives Us</span>
              </h2>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {values.map((item, i) => (
              <div key={item.title} className="reveal-item scroll-reveal group" style={{ transitionDelay: `${i * 120}ms` }}>
                <div className="h-full bg-white rounded-2xl p-6 sm:p-7 md:p-8 hover:-translate-y-1 transition-all duration-500 border border-gray-100 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-red-50/0 to-orange-50/0 group-hover:from-red-50 group-hover:to-orange-50/60 transition-all duration-500 rounded-2xl" />
                  <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-brand mb-5 group-hover:scale-110 transition-transform duration-300 relative z-10">
                    <i className={`${item.icon} text-lg text-white`} />
                  </div>
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-2 font-display relative z-10">{item.title}</h3>
                  <p className="text-gray-500 leading-relaxed text-xs sm:text-[13px] relative z-10">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── separator ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
      </div>

      {/* ── TEAM ── */}
      <section ref={teamRef} id="team" className="py-16 sm:py-20 md:py-24 relative z-10 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="reveal-item scroll-reveal flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-12">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-[10px] font-medium tracking-[0.3em] uppercase gradient-text">The People</span>
              </div>
              <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold font-display text-gray-900">
                Meet The <span className="gradient-text-animated">Team</span>
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-gray-400 max-w-[200px] leading-relaxed">
              The creative minds behind every Huna project.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
            {teamMembers.map((member, i) => (
              <div key={member.name} className="reveal-item scroll-reveal group cursor-pointer" style={{ transitionDelay: `${i * 80}ms` }}>
                <div className="relative overflow-hidden rounded-xl md:rounded-2xl mb-2 sm:mb-3 border border-gray-100 group-hover:border-brand-orange/40 group-hover:shadow-lg transition-all duration-500">
                  <div className="w-full h-40 sm:h-48 md:h-64 lg:h-72 xl:h-80 bg-gray-100 flex items-center justify-center">
                    {member.hasPhoto ? (
                      <img
                        src={member.image}
                        alt={member.name}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        style={{ objectPosition: (member as any).objectPosition || 'top center' }}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/70 border-2 border-dashed border-gray-300 flex items-center justify-center mb-3">
                          <i className="ri-user-line text-2xl sm:text-3xl text-gray-400" />
                        </div>
                        <p className="text-[10px] sm:text-xs text-gray-400 font-medium tracking-wide">Photo coming soon</p>
                      </div>
                    )}
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/50 to-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end p-3 sm:p-4">
                    <div className="translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                      <p className="text-white/90 text-[9px] sm:text-[11px] leading-relaxed">{member.bio}</p>
                    </div>
                  </div>
                </div>
                <div className="px-1">
                  <h3 className="text-[10px] sm:text-xs md:text-sm font-semibold text-gray-900 leading-snug font-display">{member.name}</h3>
                  <p className="gradient-text text-[9px] sm:text-[11px] md:text-xs font-medium mt-0.5">{member.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── separator ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
      </div>

      {/* ── CAREERS TEASER ── */}
      <section className="py-16 sm:py-20 md:py-24 relative z-10 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8 md:gap-16">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-[10px] font-medium tracking-[0.3em] uppercase gradient-text">We&apos;re Growing</span>
              </div>
              <h2 className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-3 leading-tight">
                Want to join the{' '}
                <span className="gradient-text-animated">Huna team?</span>
              </h2>
              <p className="text-gray-500 text-xs sm:text-sm leading-relaxed max-w-md">
                Huna is built by passionate creatives who love what they do. If that sounds like you, we&apos;d love to have you — drop your details and be part of something worth building.
              </p>
            </div>
            <div className="shrink-0">
              <a
                href="/careers"
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-brand text-white font-semibold rounded-full text-sm transition-all duration-300 hover:shadow-lg hover:shadow-orange-400/30 hover:scale-105 whitespace-nowrap cursor-pointer font-display"
              >
                Join Our Talent Pool
                <i className="ri-arrow-right-line text-sm" />
              </a>
            </div>
          </div>
        </div>
      </section>

      <Footer isDark={false} />

      <style>{`
        .scroll-reveal {
          opacity: 0;
          transform: translateY(32px);
          transition: opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1), transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .scroll-reveal.revealed {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>
    </div>
  );
}
