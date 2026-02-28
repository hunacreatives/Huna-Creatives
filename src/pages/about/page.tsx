import { useEffect, useRef } from 'react';
import Navigation from '../../components/feature/Navigation';
import Footer from '../home/components/Footer';

const teamMembers = [
  {
    name: 'Francis Fiel Roble',
    role: 'Founder/Creative Director',
    bio: 'The visionary behind Huna. Francis leads with bold ideas and a deep belief that design should always serve a purpose.',
    image: 'https://images.squarespace-cdn.com/content/v1/688d8b734aa1173915369520/4ea0f3e2-5d0d-4fbd-b1e8-e899bd2b7ea4/Francis+Fiel+Roble',
    hasPhoto: true,
  },
  {
    name: 'Ma. Reeva Jumawan',
    role: 'Partner & Senior Visual Director',
    bio: 'Reeva brings visual worlds to life. Her eye for detail and aesthetic direction keeps every project looking sharp and intentional.',
    image: 'https://images.squarespace-cdn.com/content/v1/688d8b734aa1173915369520/92579145-71f3-43d0-9b81-41c9a60f82d8/Reeva+Jumawan',
    hasPhoto: true,
  },
  {
    name: 'Katleen Nellas',
    role: 'Senior Graphic Designer',
    bio: 'Katleen crafts visuals that speak before words do. She blends creativity with precision to deliver designs that truly stand out.',
    image: 'https://images.squarespace-cdn.com/content/v1/688d8b734aa1173915369520/faec8908-b5d8-4696-9701-826dce495457/Katleen+Nellas',
    hasPhoto: true,
  },
  {
    name: 'Abigail Duterte',
    role: 'HR Specialist/Admin',
    bio: 'Abigail is the backbone of the team. She keeps everything running smoothly so the creatives can focus on what they do best.',
    image: 'https://images.squarespace-cdn.com/content/v1/688d8b734aa1173915369520/399d867a-4c64-4366-ae66-ee8752bc4a7f/Abigail+Duterte',
    hasPhoto: true,
  },
  {
    name: 'Angela Louise Ando',
    role: 'Admin/Account Specialist',
    bio: 'Angela is the bridge between clients and the team. She ensures every project runs on time and every client feels heard.',
    image: 'https://images.squarespace-cdn.com/content/v1/688d8b734aa1173915369520/567bc5cd-ef1c-4efa-9fca-25c37e13ff02/Angela+Ando',
    hasPhoto: true,
  },
  {
    name: 'Claudette Tahil',
    role: 'Admin/Account Specialist',
    bio: 'Claudette keeps client relationships strong and operations seamless, ensuring every account is handled with care and precision.',
    image: 'https://static.readdy.ai/image/08981d36cd0b73cf08022d4d82071d03/6785570f89c09728ca73acf4660742b6.png',
    hasPhoto: true,
    objectPosition: 'center 15%',
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
  const heroRef = useScrollReveal();
  const storyRef = useScrollReveal();
  const valuesRef = useScrollReveal();
  const teamRef = useScrollReveal();

  return (
    <div className="min-h-screen bg-white text-gray-900 font-body">
      <Navigation />

      {/* Subtle ambient blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-100/60 rounded-full blur-[140px]" />
        <div className="absolute top-1/3 right-0 w-80 h-80 bg-orange-100/60 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-0 w-72 h-72 bg-rose-100/50 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 right-1/3 w-64 h-64 bg-orange-50/60 rounded-full blur-[80px]" />
      </div>

      {/* ── HERO ── */}
      <section ref={heroRef} className="relative pt-24 sm:pt-28 pb-0 overflow-hidden z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Label */}
          <div className="reveal-item scroll-reveal mb-4 sm:mb-5">
            <span className="inline-flex items-center gap-2 sm:gap-3 text-[10px] sm:text-[11px] font-medium tracking-widest uppercase gradient-text">
              <span className="w-5 sm:w-6 md:w-8 h-px bg-gradient-to-r from-red-500 to-orange-400 block" />
              About Us
              <span className="w-5 sm:w-6 md:w-8 h-px bg-gradient-to-r from-orange-400 to-rose-400 block" />
            </span>
          </div>

          {/* Headline */}
          <div className="reveal-item scroll-reveal mb-6 sm:mb-8 max-w-5xl">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold font-display leading-[1.08] tracking-tight text-gray-900">
              We design with{' '}
              <span className="gradient-text-animated">purpose</span>
              <br />
              and move brands
              <br />
              <span className="gradient-text-animated">to action.</span>
            </h1>
          </div>

          {/* Stats row */}
          <div className="reveal-item scroll-reveal grid grid-cols-2 sm:flex sm:flex-wrap gap-4 sm:gap-6 md:gap-10 mb-8 sm:mb-10">
            {[
              { value: '100+', label: 'Projects Delivered' },
              { value: '5.0★', label: 'Client Rating' },
              { value: '100%', label: 'Satisfaction Rate' },
              { value: '3+', label: 'Years of Excellence' },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-lg sm:text-xl md:text-2xl font-bold font-display gradient-text">{stat.value}</p>
                <p className="text-[10px] sm:text-[11px] md:text-xs text-gray-500 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Full-width team photo */}
        <div className="reveal-item scroll-reveal max-w-7xl mx-auto px-4 sm:px-6 mt-2">
          <div className="relative rounded-xl sm:rounded-2xl md:rounded-3xl overflow-hidden shadow-xl">
            <div className="w-full h-[220px] sm:h-[340px] md:h-[440px] lg:h-[520px]">
              <img
                src="https://images.squarespace-cdn.com/content/v1/688d8b734aa1173915369520/f4405f8d-bb2d-4158-8112-4d2c495073e8/Screenshot+2025-08-05+at+12.46.35%E2%80%AFPM.png"
                alt="Huna Creatives Team Photo"
                className="w-full h-full object-cover object-top"
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-white/30 via-transparent to-transparent" />
            <div className="absolute inset-0 rounded-xl sm:rounded-2xl md:rounded-3xl ring-1 ring-gray-200" />
          </div>
        </div>
      </section>

      {/* ── STORY ── */}
      <section ref={storyRef} className="py-12 sm:py-16 md:py-20 lg:py-28 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-20 items-start">
            {/* Left heading */}
            <div className="lg:col-span-4 lg:sticky lg:top-32">
              <div className="reveal-item scroll-reveal">
                <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold font-display leading-tight mb-3 sm:mb-4 text-gray-900">
                  Who We <span className="gradient-text">Are</span>
                </h2>
                <div className="h-1 w-12 sm:w-16 bg-gradient-brand rounded-full" />
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

                {/* Decorative quote block */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 border-l-4 border-l-orange-400 mt-5 sm:mt-6">
                  <p className="text-gray-600 italic text-xs sm:text-sm leading-relaxed">
                    &ldquo;Design is not just what it looks like and feels like. Design is how it works — and how it moves people.&rdquo;
                  </p>
                  <p className="text-brand-orange text-xs font-semibold mt-2 sm:mt-3">— Huna Creatives</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── VALUES ── */}
      <section ref={valuesRef} className="py-12 sm:py-14 md:py-20 relative z-10 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="reveal-item scroll-reveal text-center mb-10 sm:mb-12">
            <span className="inline-flex items-center gap-2 sm:gap-3 text-[10px] sm:text-[11px] font-medium tracking-widest uppercase gradient-text mb-3 sm:mb-4">
              <span className="w-5 sm:w-6 md:w-8 h-px bg-gradient-to-r from-red-500 to-orange-400 block" />
              Our Approach
              <span className="w-5 sm:w-6 md:w-8 h-px bg-gradient-to-r from-orange-400 to-rose-400 block" />
            </span>
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold font-display mt-2 sm:mt-3 text-gray-900">
              What <span className="gradient-text-animated">Drives Us</span>
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {values.map((item, i) => (
              <div
                key={item.title}
                className="reveal-item scroll-reveal group"
                style={{ transitionDelay: `${i * 120}ms` }}
              >
                <div className="h-full bg-white rounded-xl sm:rounded-2xl p-5 sm:p-7 md:p-9 hover:shadow-xl transition-all duration-500 hover:-translate-y-1 border border-gray-100 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-red-50/0 to-orange-50/0 group-hover:from-red-50 group-hover:to-orange-50/60 transition-all duration-500 rounded-xl sm:rounded-2xl" />
                  <div className="w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 flex items-center justify-center rounded-lg bg-gradient-brand mb-4 sm:mb-5 group-hover:scale-110 transition-transform duration-300 relative z-10">
                    <i className={`${item.icon} text-base sm:text-lg md:text-xl text-white`} />
                  </div>
                  <h3 className="text-sm sm:text-base md:text-[17px] font-semibold text-gray-900 mb-2 font-display relative z-10">{item.title}</h3>
                  <p className="text-gray-500 leading-relaxed text-xs sm:text-[13px] relative z-10">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TEAM ── */}
      <section ref={teamRef} id="team" className="py-12 sm:py-16 md:py-24 relative z-10 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="reveal-item scroll-reveal text-center mb-10 sm:mb-12">
            <span className="inline-flex items-center gap-2 sm:gap-3 text-[10px] sm:text-[11px] font-medium tracking-widest uppercase gradient-text mb-3 sm:mb-4">
              <span className="w-5 sm:w-6 md:w-8 h-px bg-gradient-to-r from-red-500 to-orange-400 block" />
              The People
              <span className="w-5 sm:w-6 md:w-8 h-px bg-gradient-to-r from-orange-400 to-rose-400 block" />
            </span>
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold font-display mt-2 sm:mt-3 mb-3 sm:mb-4 text-gray-900">
              Meet The <span className="gradient-text-animated">Team</span>
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 max-w-xl mx-auto px-4">
              The creative minds behind every Huna project.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-5 lg:gap-7">
            {teamMembers.map((member, i) => (
              <div
                key={member.name}
                className="reveal-item scroll-reveal group cursor-pointer"
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                <div className="relative overflow-hidden rounded-lg sm:rounded-xl md:rounded-2xl mb-2 sm:mb-3 border border-gray-100 group-hover:border-brand-orange/50 group-hover:shadow-lg transition-all duration-500">
                  <div className="w-full h-40 sm:h-48 md:h-64 lg:h-72 xl:h-80 bg-gray-100 flex items-center justify-center">
                    {member.hasPhoto ? (
                      <img
                        src={member.image}
                        alt={member.name}
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
                  {/* Hover overlay — shows personal bio */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/50 to-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end p-3 sm:p-4">
                    <div className="translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                      <p className="text-white/90 text-[9px] sm:text-[11px] leading-relaxed">
                        {member.bio}
                      </p>
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

      {/* ── CAREERS TEASER ── */}
      <section className="py-12 sm:py-16 md:py-20 relative z-10 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden border border-gray-100 shadow-xl">
            {/* Background gradient blobs */}
            <div className="absolute inset-0 bg-gradient-to-br from-red-50 via-orange-50/60 to-rose-50" />
            <div className="absolute -top-20 -right-20 w-72 h-72 bg-orange-200/40 rounded-full blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-red-200/30 rounded-full blur-3xl" />

            <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 md:gap-12 p-8 sm:p-10 md:p-14">
              {/* Left icon */}
              <div className="shrink-0 w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center rounded-2xl bg-gradient-brand shadow-lg shadow-orange-200/50">
                <i className="ri-team-line text-2xl sm:text-3xl text-white" />
              </div>

              {/* Text */}
              <div className="flex-1 text-center md:text-left">
                <span className="inline-flex items-center gap-2 text-[10px] font-semibold tracking-widest uppercase gradient-text mb-2 sm:mb-3">
                  <span className="w-5 h-px bg-gradient-to-r from-red-500 to-orange-400 block" />
                  We're Growing
                </span>
                <h2 className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2 sm:mb-3 leading-tight">
                  Want to join the{' '}
                  <span className="gradient-text-animated">Huna team?</span>
                </h2>
                <p className="text-gray-500 text-xs sm:text-sm leading-relaxed max-w-xl">
                  Huna is built by passionate creatives who love what they do. If that sounds like you, we'd love to have you in our corner — drop your details and be part of something worth building.
                </p>
              </div>

              {/* CTA */}
              <div className="shrink-0">
                <a
                  href="/careers"
                  className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-3.5 bg-gradient-brand text-white font-semibold rounded-full text-xs sm:text-sm transition-all duration-300 hover:shadow-lg hover:shadow-orange-400/30 hover:scale-105 whitespace-nowrap cursor-pointer font-display"
                >
                  Join Our Talent Pool
                  <i className="ri-arrow-right-line text-sm" />
                </a>
              </div>
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
