import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import Navigation from '../../components/feature/Navigation';
import Footer from '../home/components/Footer';
import { useSEO } from '../../hooks/useSEO';
import { supabase } from '@/lib/supabase';

interface TeamMember {
  name: string;
  role: string;
  bio: string;
  image: string;
  hasPhoto: boolean;
}

const values = [
  {
    icon: 'ri-lightbulb-flash-line',
    title: 'Huna, Not Templates',
    desc: '"Huna" is Bisaya for to think, to imagine, to create — which is why every project starts from scratch, not a template library.',
  },
  {
    icon: 'ri-map-pin-line',
    title: 'Built in Cebu',
    desc: "We're a Cebuano creative firm working with brands globally, bringing a distinct Filipino creative perspective to every project.",
  },
  {
    icon: 'ri-rocket-2-line',
    title: 'Design That Works',
    desc: "A logo that looks great and doesn't survive being embroidered on a cap has failed. We design for where the work actually has to live.",
  },
];

// `deps` lets callers re-run observation when content renders asynchronously
// after mount (e.g. the team section, which populates from a fetch) — the
// observer otherwise only ever sees whatever `.reveal-item` elements exist
// at the initial mount and silently never reveals anything added later.
function useScrollReveal(deps: unknown[] = []) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}

// Same frosted-glass recipe as the homepage's HighlightTiles "light" tiles —
// translucent white + backdrop blur/saturate so the orb field behind it
// reads through, not an opaque card.
const glassCardStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.45)',
  backdropFilter: 'blur(20px) saturate(160%)',
  WebkitBackdropFilter: 'blur(20px) saturate(160%)',
  border: '1px solid rgba(255,255,255,0.6)',
  boxShadow: '0 8px 32px rgba(48,50,54,0.08), inset 0 1px 0 rgba(255,255,255,0.5)',
};

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

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  // Re-observe once the team list actually has cards in it — see the
  // comment on useScrollReveal for why this can't just be [].
  const teamRef = useScrollReveal([teamMembers.length]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.functions.invoke('public-team');
      const mapped: TeamMember[] = (data?.team ?? [])
        .filter((m: any) => !String(m.full_name || '').toLowerCase().includes('reeva'))
        .map((m: any) => ({
          name: m.full_name,
          role: m.job_title || m.department || '',
          bio: m.about_bio || '',
          image: m.avatar_url || '',
          hasPhoto: !!m.avatar_url,
        }));
      setTeamMembers(mapped);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-[#303236] font-body">
      <Navigation invertOnScroll barTheme="light" />

      {/* Same continuous orb field as the homepage's white zone, copied 1:1 —
          a normal (not `absolute inset-0`) wrapper that grows with the full
          page content, not just the first viewport, with every section
          nested inside it so the color shows through the glass cards. */}
      <div className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute top-[-15%] -left-[15%] w-[900px] h-[900px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(230,84,22,0.16), transparent 72%)',
            filter: 'blur(70px)',
            animation: 'orb-float-a 22s ease-in-out infinite',
          }}
        />
        <div
          className="pointer-events-none absolute top-[6%] -right-[15%] w-[820px] h-[820px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(160,201,203,0.4), transparent 72%)',
            filter: 'blur(70px)',
            animation: 'orb-float-b 26s ease-in-out infinite',
          }}
        />
        <div
          className="pointer-events-none absolute top-[28%] left-[38%] w-[620px] h-[620px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(216,214,201,0.5), transparent 72%)',
            filter: 'blur(70px)',
            animation: 'orb-float-c 20s ease-in-out infinite',
          }}
        />
        <div
          className="pointer-events-none absolute top-[48%] -left-[10%] w-[760px] h-[760px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(45,90,93,0.4), transparent 72%)',
            filter: 'blur(70px)',
            animation: 'orb-float-c 24s ease-in-out infinite',
          }}
        />
        <div
          className="pointer-events-none absolute top-[68%] right-[5%] w-[900px] h-[900px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(240,107,51,0.18), transparent 72%)',
            filter: 'blur(70px)',
            animation: 'orb-float-d 28s ease-in-out infinite',
          }}
        />
        <div
          className="pointer-events-none absolute top-[80%] left-[8%] w-[560px] h-[560px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(45,90,93,0.32), transparent 72%)',
            filter: 'blur(70px)',
            animation: 'orb-float-b 23s ease-in-out infinite',
          }}
        />
        <div
          className="pointer-events-none absolute top-[92%] left-1/3 w-[850px] h-[850px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(160,201,203,0.34), transparent 72%)',
            filter: 'blur(70px)',
            animation: 'orb-float-a 25s ease-in-out infinite',
          }}
        />

      {/* ── HERO ── */}
      <section ref={heroRef} className="relative pt-24 sm:pt-28 pb-0 overflow-hidden z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="reveal-item scroll-reveal flex items-center gap-3 mb-5">
            <span className="text-[11px] font-medium tracking-[0.3em] uppercase text-[#2D5A5D]">About Us</span>
          </div>

          <div className="reveal-item scroll-reveal mb-8 sm:mb-10 max-w-4xl">
            <h1 className="text-2xl sm:text-2xl md:text-3xl lg:text-4xl font-bold font-display leading-tight text-[#303236]">
              We design with purpose<span className="hidden sm:inline"><br /></span>{' '}
              and move brands to action.
            </h1>
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
            <div className="absolute inset-0 rounded-2xl md:rounded-3xl ring-1 ring-[#303236]/10" />
          </div>
        </div>
      </section>

      {/* ── STORY ── */}
      <section ref={storyRef} className="py-16 sm:py-20 md:py-24 relative z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-12 gap-8 sm:gap-10 lg:gap-20 items-start">
            {/* Left heading */}
            <div className="lg:col-span-4">
              <div className="reveal-item scroll-reveal">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-[11px] font-medium tracking-[0.3em] uppercase text-[#2D5A5D]">Our Story</span>
                </div>
                <h2 className="text-2xl sm:text-2xl md:text-3xl lg:text-4xl font-bold font-display leading-tight text-[#303236]">
                  Who We Are
                </h2>
              </div>
            </div>

            {/* Right body text */}
            <div className="lg:col-span-7 lg:col-start-6">
              <div className="reveal-item scroll-reveal space-y-4 sm:space-y-5">
                <p className="text-[15px] sm:text-base text-[#303236]/85 leading-relaxed text-justify hyphens-auto">
                  Huna Creatives is a small studio in Cebu — ten designers, writers, and strategists. In three years we&apos;ve made work for 38 brands: a sport-horse dealership, a pediatric dental practice, a mortgage team, a supplement line, an architecture firm.
                </p>
                <p className="text-sm sm:text-[15px] text-[#303236]/70 leading-relaxed text-justify hyphens-auto">
                  That spread is deliberate. A dental practice and a supplement brand need close to opposite things, so each project starts with learning the business rather than reaching for a layout that worked last time. It&apos;s slower at the front end. It&apos;s also the reason the work fits.
                </p>
                <p className="text-sm sm:text-[15px] text-[#303236]/70 leading-relaxed text-justify hyphens-auto">
                  We keep only a few projects running at once — enough room to think properly about each one, and to still be reachable after it ships.
                </p>

                {/* Concrete proof, in place of the pull-quote that used to sit here */}
                <div className="grid grid-cols-3 gap-3 sm:flex sm:flex-wrap sm:items-center sm:gap-x-10 sm:gap-y-4 pt-4">
                  {[
                    { value: '38', label: 'Brands built' },
                    { value: '100+', label: 'Projects delivered' },
                    { value: '4.8★', label: 'Average client rating' },
                  ].map((stat) => (
                    <div key={stat.label}>
                      <div className="font-display text-xl sm:text-2xl font-bold text-[#E65416] leading-none">
                        {stat.value}
                      </div>
                      <div className="text-[10px] tracking-wide uppercase text-[#303236]/45 mt-1.5">
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

      {/* ── VALUES ── */}
      <section ref={valuesRef} className="py-16 sm:py-20 md:py-24 relative z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="reveal-item scroll-reveal flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 sm:gap-3 mb-8 sm:mb-12">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-[11px] font-medium tracking-[0.3em] uppercase text-[#2D5A5D]">Our Approach</span>
              </div>
              <h2 className="text-2xl sm:text-2xl md:text-3xl lg:text-4xl font-bold font-display text-[#303236]">
                What Drives Us
              </h2>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {values.map((item, i) => (
              <div key={item.title} className="reveal-item scroll-reveal group" style={{ transitionDelay: `${i * 120}ms` }}>
                <div
                  className="h-full rounded-2xl p-6 sm:p-7 md:p-8 hover:-translate-y-1 transition-all duration-500 relative overflow-hidden"
                  style={glassCardStyle}
                >
                  <div
                    className="w-10 h-10 flex items-center justify-center rounded-xl mb-5 group-hover:scale-110 transition-transform duration-300 relative z-10"
                    style={{ background: 'linear-gradient(135deg, #E65416, #F06B33)' }}
                  >
                    <i className={`${item.icon} text-lg text-white`} />
                  </div>
                  <h3 className="text-sm sm:text-base font-semibold text-[#303236] mb-2 font-display relative z-10">{item.title}</h3>
                  <p className="text-[#303236]/60 leading-relaxed text-[13px] sm:text-[13px] relative z-10 text-justify hyphens-auto">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TEAM ── */}
      <section ref={teamRef} id="team" className="py-16 sm:py-20 md:py-24 relative z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="reveal-item scroll-reveal flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 sm:gap-3 mb-8 sm:mb-12">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-[11px] font-medium tracking-[0.3em] uppercase text-[#2D5A5D]">The People</span>
              </div>
              <h2 className="text-2xl sm:text-2xl md:text-3xl lg:text-4xl font-bold font-display text-[#303236]">
                Meet The Team
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-[#303236]/45 sm:max-w-[200px] leading-relaxed">
              The creative minds behind every Huna project.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
            {teamMembers.map((member, i) => (
              <div key={member.name} className="reveal-item scroll-reveal group cursor-pointer" style={{ transitionDelay: `${i * 80}ms` }}>
                <div
                  className="relative overflow-hidden rounded-xl md:rounded-2xl mb-2 sm:mb-3 transition-all duration-500"
                  style={glassCardStyle}
                >
                  <div className="w-full h-40 sm:h-48 md:h-64 lg:h-72 xl:h-80 bg-[#D8D6C9]/40 flex items-center justify-center">
                    {member.hasPhoto ? (
                      <img
                        src={member.image}
                        alt={member.name}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        style={{ objectPosition: (member as any).objectPosition || 'top center' }}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/70 border-2 border-dashed border-[#303236]/20 flex items-center justify-center mb-3">
                          <i className="ri-user-line text-2xl sm:text-3xl text-[#303236]/30" />
                        </div>
                        <p className="text-[10px] sm:text-xs text-[#303236]/40 font-medium tracking-wide">Photo coming soon</p>
                      </div>
                    )}
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/50 to-black/10 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-500 hidden sm:flex items-end p-3 sm:p-4">
                    <div className="translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                      <p className="text-white/90 text-[9px] sm:text-[11px] leading-relaxed">{member.bio}</p>
                    </div>
                  </div>
                </div>
                <div className="px-1">
                  <h3 className="text-xs sm:text-xs md:text-sm font-semibold text-[#303236] leading-snug font-display">{member.name}</h3>
                  <p className="text-[#303236]/50 text-[10px] sm:text-[11px] md:text-xs font-medium mt-0.5">{member.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CAREERS TEASER ── */}
      <section className="py-16 sm:py-20 md:py-24 relative z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div
            className="rounded-3xl p-6 sm:p-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6 md:gap-16 text-center md:text-left"
            style={glassCardStyle}
          >
            <div>
              <div className="flex items-center justify-center md:justify-start gap-3 mb-4">
                <span className="text-[11px] font-medium tracking-[0.3em] uppercase text-[#2D5A5D]">We&apos;re Growing</span>
              </div>
              <h2 className="font-display text-2xl sm:text-2xl md:text-3xl font-bold text-[#303236] mb-3 leading-tight">
                Want to join the Huna team?
              </h2>
              <p className="text-[#303236]/60 text-[13px] sm:text-sm leading-relaxed max-w-md mx-auto md:mx-0 text-justify md:text-left hyphens-auto">
                Huna is built by passionate creatives who love what they do. If that sounds like you, we&apos;d love to have you — drop your details and be part of something worth building.
              </p>
            </div>
            <div className="shrink-0 w-full md:w-auto">
              <a
                href="/careers"
                className="inline-flex items-center justify-center gap-2 w-full md:w-auto px-8 py-3.5 text-white font-semibold rounded-full text-sm transition-all duration-300 hover:scale-105 whitespace-nowrap cursor-pointer font-display"
                style={{ background: 'linear-gradient(135deg, #E65416, #F06B33)', boxShadow: '0 6px 30px rgba(230,84,22,0.35)' }}
              >
                Join Our Talent Pool
                <i className="ri-arrow-right-line text-sm" />
              </a>
            </div>
          </div>
        </div>
      </section>
      </div>

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
