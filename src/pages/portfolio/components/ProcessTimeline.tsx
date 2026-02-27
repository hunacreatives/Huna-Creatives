import { useRef, useState } from 'react';
import { motion, useScroll, useTransform, useInView, useMotionValueEvent } from 'framer-motion';

const steps = [
  {
    num: '01',
    title: 'Discover',
    desc: 'We immerse ourselves in your world — your brand, your audience, your goals. Through deep research and collaborative sessions, we uncover the insights that fuel everything.',
    icon: 'ri-search-eye-line',
    accent: '#ef4444',
    details: ['Brand Audit', 'Market Research', 'Competitor Analysis', 'Goal Setting'],
  },
  {
    num: '02',
    title: 'Strategize',
    desc: 'With clarity comes direction. We map out the creative blueprint — defining the visual language, messaging, channels, and deliverables that will bring your vision to life.',
    icon: 'ri-route-line',
    accent: '#f97316',
    details: ['Creative Direction', 'Content Strategy', 'Channel Planning', 'Timeline & Milestones'],
  },
  {
    num: '03',
    title: 'Create',
    desc: 'This is where the magic happens. We design, iterate, and refine every pixel and word until it\u2019s not just good — it\u2019s undeniable. Expect bold ideas executed with precision.',
    icon: 'ri-magic-line',
    accent: '#fb7185',
    details: ['Visual Design', 'Content Creation', 'Prototyping', 'Revision Rounds'],
  },
  {
    num: '04',
    title: 'Deliver',
    desc: 'We launch with confidence and stay by your side. From final assets to ongoing support, we make sure your brand doesn\u2019t just launch — it thrives.',
    icon: 'ri-rocket-2-line',
    accent: '#fbbf24',
    details: ['Asset Delivery', 'Launch Support', 'Performance Review', 'Ongoing Partnership'],
  },
];

function StepNode({ step, index }: { step: typeof steps[0]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  const isEven = index % 2 === 0;

  return (
    <div ref={ref}>
      {/* ── MOBILE layout: single column ── */}
      <div className="flex md:hidden items-start gap-4 py-4">
        {/* Left: node */}
        <div className="flex flex-col items-center flex-shrink-0 pt-1">
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={isInView ? { scale: 1, opacity: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.1, type: 'spring', stiffness: 200 }}
            className="relative"
          >
            <div
              className="relative w-10 h-10 rounded-full flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${step.accent}25, ${step.accent}10)`,
                border: `2px solid ${step.accent}60`,
                boxShadow: `0 0 16px ${step.accent}30`,
              }}
            >
              <i className={`${step.icon} text-base`} style={{ color: step.accent }} />
            </div>
          </motion.div>
        </div>

        {/* Right: content */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={isInView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="flex-1 min-w-0 pb-2"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[9px] font-bold tracking-[0.3em] uppercase font-display" style={{ color: `${step.accent}80` }}>
              Step {step.num}
            </span>
          </div>
          <h3 className="font-display text-lg font-bold mb-2 leading-tight" style={{ color: step.accent }}>
            {step.title}
          </h3>
          <p className="text-white/40 text-xs leading-relaxed mb-3">{step.desc}</p>
          <div className="flex flex-wrap gap-1.5">
            {step.details.map((detail) => (
              <span
                key={detail}
                className="px-2.5 py-0.5 rounded-full text-[9px] font-semibold tracking-wider uppercase"
                style={{
                  background: `${step.accent}10`,
                  color: `${step.accent}90`,
                  border: `1px solid ${step.accent}20`,
                }}
              >
                {detail}
              </span>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── DESKTOP layout: alternating ── */}
      <div className="hidden md:grid relative grid-cols-[1fr_auto_1fr] gap-0 items-center min-h-[280px]">
        {/* Left content (even steps) or empty */}
        <div className={`${isEven ? 'pr-10 lg:pr-16' : ''}`}>
          {isEven && (
            <motion.div
              initial={{ opacity: 0, x: -60 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="text-right"
            >
              <StepContent step={step} align="right" />
            </motion.div>
          )}
        </div>

        {/* Center node */}
        <div className="relative flex flex-col items-center z-10">
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={isInView ? { scale: 1, opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.1, type: 'spring', stiffness: 200 }}
            className="relative"
          >
            <div
              className="absolute -inset-4 rounded-full"
              style={{
                background: `radial-gradient(circle, ${step.accent}30 0%, transparent 70%)`,
                animation: isInView ? `pulseGlow 3s ease-in-out infinite ${index * 0.5}s` : 'none',
              }}
            />
            <div
              className="absolute -inset-2 rounded-full"
              style={{
                background: `radial-gradient(circle, ${step.accent}20 0%, transparent 70%)`,
                filter: 'blur(6px)',
              }}
            />
            <div
              className="relative w-14 h-14 rounded-full flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${step.accent}25, ${step.accent}10)`,
                border: `2px solid ${step.accent}60`,
                boxShadow: `0 0 20px ${step.accent}30, 0 0 40px ${step.accent}15, inset 0 0 15px ${step.accent}10`,
              }}
            >
              <i className={`${step.icon} text-xl`} style={{ color: step.accent }} />
            </div>
          </motion.div>
        </div>

        {/* Right content (odd steps) or empty */}
        <div className={`${!isEven ? 'pl-10 lg:pl-16' : ''}`}>
          {!isEven && (
            <motion.div
              initial={{ opacity: 0, x: 60 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="text-left"
            >
              <StepContent step={step} align="left" />
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

function StepContent({ step, align }: { step: typeof steps[0]; align: 'left' | 'right' }) {
  return (
    <div className={`max-w-md ${align === 'right' ? 'ml-auto' : 'mr-auto'}`}>
      {/* Step number */}
      <div className={`flex items-center gap-3 mb-4 ${align === 'right' ? 'justify-end' : 'justify-start'}`}>
        <span
          className="text-[10px] font-bold tracking-[0.4em] uppercase font-display"
          style={{ color: `${step.accent}80` }}
        >
          Step {step.num}
        </span>
        <span className="w-8 h-px" style={{ background: `${step.accent}40` }} />
      </div>

      {/* Title */}
      <h3
        className="font-display text-2xl lg:text-3xl font-bold mb-3 leading-tight"
        style={{ color: step.accent }}
      >
        {step.title}
      </h3>

      {/* Description */}
      <p className="text-white/40 text-sm leading-relaxed mb-5">{step.desc}</p>

      {/* Detail tags */}
      <div className={`flex flex-wrap gap-2 ${align === 'right' ? 'justify-end' : 'justify-start'}`}>
        {step.details.map((detail) => (
          <span
            key={detail}
            className="px-3 py-1 rounded-full text-[10px] font-semibold tracking-wider uppercase"
            style={{
              background: `${step.accent}10`,
              color: `${step.accent}90`,
              border: `1px solid ${step.accent}20`,
            }}
          >
            {detail}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function ProcessTimeline() {
  const sectionRef = useRef<HTMLElement>(null);
  const finaleRef = useRef<HTMLDivElement>(null);
  const [finaleGlow, setFinaleGlow] = useState(0);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start 80%', 'end 90%'],
  });

  const lineScaleY = useTransform(scrollYProgress, [0, 1], [0, 1]);

  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    const glow = Math.max(0, Math.min(1, (v - 0.82) / 0.18));
    setFinaleGlow(glow);
  });

  return (
    <section ref={sectionRef} className="relative py-28 md:py-36 px-6 bg-[#0a0a0a] overflow-hidden">
      {/* Ambient background glow */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(249,115,22,0.04) 0%, transparent 70%)',
          filter: 'blur(80px)',
        }}
      />

      <div className="max-w-6xl mx-auto relative">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7 }}
          className="text-center mb-20 md:mb-28"
        >
          <span className="flex items-center justify-center gap-3 text-[10px] font-semibold tracking-[0.3em] uppercase text-orange-500 mb-4 font-display">
            <span className="w-8 h-px bg-orange-500" />
            Our Process
            <span className="w-8 h-px bg-orange-500" />
          </span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight mb-4">
            From idea to{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, #ef4444, #f97316, #fb7185)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              impact.
            </span>
          </h2>
          <p className="text-white/30 text-sm max-w-lg mx-auto leading-relaxed">
            Every great brand follows a journey. Here&apos;s how we guide yours — step by step, with intention and craft.
          </p>
        </motion.div>

        {/* Timeline container */}
        <div className="relative">
          {/* Static background line — desktop only */}
          <div
            className="hidden md:block absolute left-1/2 -translate-x-1/2 top-0 w-px bg-white/[0.06]"
            style={{ bottom: '-96px' }}
          />

          {/* Animated glowing line — desktop only, grows from top */}
          <div
            className="hidden md:block absolute left-1/2 -translate-x-1/2 top-0 w-px overflow-hidden"
            style={{ bottom: '-96px' }}
          >
            <motion.div
              className="w-full h-full origin-top"
              style={{
                scaleY: lineScaleY,
                background: 'linear-gradient(to bottom, #ef4444, #f97316, #fb7185, #fbbf24)',
                boxShadow: '0 0 8px rgba(249,115,22,0.6), 0 0 20px rgba(249,115,22,0.3)',
              }}
            />
          </div>

          {/* Animated glow dot — desktop only, travels with line tip */}
          <div
            className="hidden md:block absolute left-1/2 -translate-x-1/2 top-0 pointer-events-none"
            style={{ bottom: '-96px' }}
          >
            <motion.div
              className="absolute left-1/2 -translate-x-1/2 w-3 h-3 rounded-full"
              style={{
                top: useTransform(scrollYProgress, [0, 1], ['0%', '100%']),
                background: 'radial-gradient(circle, #f97316 0%, transparent 70%)',
                boxShadow: '0 0 12px #f97316, 0 0 30px rgba(249,115,22,0.5)',
                filter: 'blur(1px)',
                marginTop: '-6px',
              }}
            />
          </div>

          {/* Mobile: vertical connector line */}
          <div className="md:hidden absolute left-[19px] top-0 bottom-0 w-px bg-white/[0.06]" />

          {/* Steps */}
          <div className="relative z-10 flex flex-col gap-0 md:gap-4">
            {steps.map((step, i) => (
              <StepNode key={step.num} step={step} index={i} />
            ))}
          </div>

          {/* End flourish */}
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="relative flex justify-center mt-12 mb-0"
          >
            <div className="relative flex items-center justify-center">
              <div
                className="absolute w-24 h-24 rounded-full animate-ping"
                style={{
                  background: 'radial-gradient(circle, rgba(249,115,22,0.08) 0%, transparent 70%)',
                  animationDuration: '2.5s',
                }}
              />
              <div
                className="absolute w-16 h-16 rounded-full animate-ping"
                style={{
                  background: 'radial-gradient(circle, rgba(249,115,22,0.12) 0%, transparent 70%)',
                  animationDuration: '2s',
                  animationDelay: '0.3s',
                }}
              />
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center relative z-10"
                style={{
                  background: 'linear-gradient(135deg, rgba(239,68,68,0.2), rgba(249,115,22,0.15))',
                  border: '2px solid rgba(249,115,22,0.5)',
                  boxShadow: '0 0 30px rgba(249,115,22,0.35), 0 0 60px rgba(249,115,22,0.15)',
                }}
              >
                <i className="ri-sparkling-2-fill text-orange-400 text-lg" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* ── GRAND FINALE ── */}
        <motion.div
          ref={finaleRef}
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="mt-24 md:mt-32 relative"
        >
          {/* Glow backdrop */}
          <div
            className="absolute inset-0 rounded-3xl pointer-events-none transition-all duration-300"
            style={{
              background: `radial-gradient(ellipse at 50% 0%, rgba(249,115,22,${0.08 + finaleGlow * 0.22}) 0%, transparent 70%)`,
              filter: 'blur(30px)',
            }}
          />

          <div
            className="relative rounded-3xl overflow-hidden px-8 md:px-16 py-14 md:py-20 text-center transition-all duration-300"
            style={{
              background: 'linear-gradient(135deg, #141414 0%, #0f0f0f 100%)',
              border: `1px solid rgba(249,115,22,${0.15 + finaleGlow * 0.55})`,
              boxShadow: `0 0 ${60 + finaleGlow * 80}px rgba(249,115,22,${0.06 + finaleGlow * 0.18}), inset 0 1px 0 rgba(255,255,255,0.04)`,
            }}
          >
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 h-px transition-all duration-300"
              style={{
                width: `${32 + finaleGlow * 68}%`,
                background: `linear-gradient(to right, transparent, rgba(249,115,22,${0.6 + finaleGlow * 0.4}), transparent)`,
              }}
            />

            <div className="absolute top-6 left-8 text-orange-500/20 text-xs font-display tracking-widest uppercase">✦</div>
            <div className="absolute top-6 right-8 text-orange-500/20 text-xs font-display tracking-widest uppercase">✦</div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.2 }}
            >
              <span className="inline-flex items-center gap-2 text-[10px] font-semibold tracking-[0.35em] uppercase text-orange-400 mb-6 font-display">
                <span className="w-6 h-px bg-orange-400/60" />
                The Result
                <span className="w-6 h-px bg-orange-400/60" />
              </span>

              <h3 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight mb-4">
                Your brand,{' '}
                <span
                  style={{
                    background: 'linear-gradient(135deg, #ef4444, #f97316, #fbbf24)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  unforgettable.
                </span>
              </h3>

              <p className="text-white/30 text-sm max-w-xl mx-auto leading-relaxed mb-14">
                When the process ends, the impact begins. Every brand we build is designed to outlast trends,
                outperform expectations, and leave a mark that lasts.
              </p>
            </motion.div>

            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 mb-14">
              {[
                { value: '33+', label: 'Brands Built', icon: 'ri-building-line' },
                { value: '100+', label: 'Projects Delivered', icon: 'ri-checkbox-circle-line' },
                { value: '5.0★', label: 'Average Rating', icon: 'ri-star-line' },
                { value: '3×', label: 'Avg. Engagement Lift', icon: 'ri-line-chart-line' },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.3 + i * 0.1 }}
                  className="flex flex-col items-center gap-2"
                >
                  <div
                    className="w-10 h-10 flex items-center justify-center rounded-full mb-1"
                    style={{
                      background: 'rgba(249,115,22,0.08)',
                      border: '1px solid rgba(249,115,22,0.2)',
                    }}
                  >
                    <i className={`${stat.icon} text-orange-400 text-base`} />
                  </div>
                  <div
                    className="font-display text-2xl md:text-3xl font-bold"
                    style={{
                      background: 'linear-gradient(135deg, #ffffff, #f97316)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    {stat.value}
                  </div>
                  <div className="text-[10px] text-white/25 tracking-widest uppercase font-display">{stat.label}</div>
                </motion.div>
              ))}
            </div>

            <div
              className="w-full h-px mb-10"
              style={{ background: 'linear-gradient(to right, transparent, rgba(249,115,22,0.15), transparent)' }}
            />

            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3"
            >
              <span className="text-[9px] tracking-[0.3em] uppercase text-white/15 font-display mr-2">Trusted by</span>
              {['Equestrian International', 'The Second Haus', 'Blue Collar Nutrition', 'Everyone by One', 'The Cowart Team', 'Vox Kitchen'].map((name) => (
                <span key={name} className="text-[11px] font-semibold text-white/20 font-display tracking-wide whitespace-nowrap">
                  {name}
                </span>
              ))}
            </motion.div>

            <div
              className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-px"
              style={{ background: 'linear-gradient(to right, transparent, #f97316, transparent)' }}
            />
          </div>
        </motion.div>
      </div>

      <style>{`
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.3); }
        }
      `}</style>
    </section>
  );
}
