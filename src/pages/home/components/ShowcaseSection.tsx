import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';

const services = [
  {
    title: 'Brand Identity',
    description: 'Logos, color systems, typography, and visual guidelines that define who you are',
    icon: 'ri-palette-line',
    tags: ['Logo Design', 'Brand Guidelines', 'Visual Systems'],
  },
  {
    title: 'Digital Design',
    description: 'Websites, apps, and digital experiences that engage and convert',
    icon: 'ri-layout-line',
    tags: ['Web Design', 'UI/UX', 'Prototyping'],
  },
  {
    title: 'Content Creation',
    description: 'Photography, video, graphics, and social content that tells your story',
    icon: 'ri-image-line',
    tags: ['Photography', 'Video', 'Social Media'],
  },
  {
    title: 'Creative Strategy',
    description: 'Research, positioning, and campaigns that connect with your audience',
    icon: 'ri-lightbulb-line',
    tags: ['Brand Strategy', 'Campaigns', 'Messaging'],
  },
  {
    title: 'Print & Packaging',
    description: 'Business cards, brochures, packaging, and collateral that leave an impression',
    icon: 'ri-printer-line',
    tags: ['Print Design', 'Packaging', 'Collateral'],
  },
  {
    title: 'Motion & Animation',
    description: 'Animated logos, explainer videos, and motion graphics that bring brands to life',
    icon: 'ri-movie-line',
    tags: ['Motion Design', 'Animation', 'Video Editing'],
  },
];

export default function ShowcaseSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });

  const y = useTransform(scrollYProgress, [0, 1], ['60px', '-60px']);

  return (
    <section ref={sectionRef} className="relative py-32 px-6 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[#0a0a0a]" />

      {/* Subtle grid */}
      <div className="absolute inset-0 opacity-[0.02]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(249,115,22,0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(249,115,22,0.3) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* Glow orb */}
      <motion.div
        style={{ y }}
        className="absolute top-1/3 right-1/4 w-96 h-96 rounded-full pointer-events-none"
      >
        <div
          style={{
            background: 'radial-gradient(circle, rgba(239,68,68,0.1) 0%, transparent 70%)',
            filter: 'blur(80px)',
            width: '100%',
            height: '100%',
          }}
        />
      </motion.div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >
          <span className="inline-flex items-center gap-2 text-[11px] font-medium tracking-widest text-orange-400 uppercase mb-6">
            <span className="w-6 h-px bg-orange-400 inline-block" />
            What We Do
            <span className="w-6 h-px bg-orange-400 inline-block" />
          </span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-5 leading-tight">
            Services that make{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, #ef4444, #f97316, #fb7185)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              brands unforgettable
            </span>
          </h2>
          <p className="text-white/45 text-sm max-w-2xl mx-auto leading-relaxed">
            From strategy to execution, we craft every touchpoint of your brand experience
          </p>
        </motion.div>

        {/* Service Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, idx) => (
            <motion.div
              key={service.title}
              initial={{ opacity: 0, y: 60 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.6, delay: idx * 0.1 }}
              className="group relative rounded-2xl p-8 cursor-pointer transition-all duration-500"
              style={{
                background: 'linear-gradient(145deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.borderColor = 'rgba(249,115,22,0.3)';
                el.style.background = 'linear-gradient(145deg, rgba(249,115,22,0.08), rgba(249,115,22,0.02))';
                el.style.transform = 'translateY(-8px)';
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.borderColor = 'rgba(255,255,255,0.06)';
                el.style.background = 'linear-gradient(145deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))';
                el.style.transform = 'translateY(0)';
              }}
            >
              {/* Hover glow */}
              <div
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{
                  background: 'radial-gradient(circle at center, rgba(249,115,22,0.08), transparent 70%)',
                }}
              />

              <div className="relative z-10">
                {/* Icon */}
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-6 bg-gradient-to-br from-orange-500 to-pink-500 group-hover:scale-110 transition-transform duration-300">
                  <i className={`${service.icon} text-white text-xl`} />
                </div>

                {/* Content */}
                <h3 className="font-display text-lg font-semibold text-white mb-3">
                  {service.title}
                </h3>
                <p className="text-white/45 text-xs leading-relaxed mb-5">
                  {service.description}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-2">
                  {service.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-1 rounded-full text-[10px] font-medium tracking-wide text-orange-300/70 bg-orange-500/10 border border-orange-500/20"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Decorative line */}
                <div className="mt-6 h-px bg-gradient-to-r from-orange-500/30 to-transparent group-hover:from-orange-500/60 transition-all duration-500" />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-16 text-center"
        >
          <a
            href="/services"
            className="inline-flex items-center gap-3 px-8 py-3.5 rounded-full text-xs font-semibold tracking-widest uppercase text-white/70 hover:text-white transition-all duration-300 hover:scale-105 whitespace-nowrap cursor-pointer group"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1.5px solid rgba(255,255,255,0.2)',
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLAnchorElement;
              el.style.borderColor = 'rgba(234,88,12,0.5)';
              el.style.background = 'rgba(234,88,12,0.08)';
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLAnchorElement;
              el.style.borderColor = 'rgba(255,255,255,0.2)';
              el.style.background = 'rgba(255,255,255,0.05)';
            }}
          >
            <span>Explore All Services</span>
            <i className="ri-arrow-right-line text-lg group-hover:translate-x-1 transition-transform" />
          </a>
        </motion.div>
      </div>
    </section>
  );
}
