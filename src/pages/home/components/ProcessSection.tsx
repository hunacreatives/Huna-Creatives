import { useRef, useEffect, useState } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';

const steps = [
  {
    number: '01',
    title: 'Discovery',
    description: 'We dive deep into your brand, audience, and goals to understand what makes you unique',
    details: ['Brand Audit', 'Market Research', 'Competitor Analysis', 'Audience Insights'],
    icon: 'ri-compass-3-line',
    color: 'from-red-500 to-orange-500',
  },
  {
    number: '02',
    title: 'Strategy',
    description: 'We craft a creative direction that aligns with your vision and resonates with your audience',
    details: ['Brand Positioning', 'Creative Direction', 'Content Strategy', 'Visual Language'],
    icon: 'ri-lightbulb-line',
    color: 'from-orange-500 to-amber-500',
  },
  {
    number: '03',
    title: 'Design',
    description: 'We bring ideas to life with stunning visuals and interactive experiences',
    details: ['Visual Identity', 'UI/UX Design', 'Motion Graphics', 'Print & Digital'],
    icon: 'ri-palette-line',
    color: 'from-amber-500 to-yellow-500',
  },
  {
    number: '04',
    title: 'Delivery',
    description: 'We launch your project with precision and provide ongoing support',
    details: ['Quality Assurance', 'Launch Support', 'Brand Guidelines', 'Training & Handoff'],
    icon: 'ri-rocket-line',
    color: 'from-yellow-500 to-orange-400',
  },
];

export default function ProcessSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [activeStep, setActiveStep] = useState(0);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start center', 'end center'],
  });

  const lineProgress = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);

  useEffect(() => {
    const unsubscribe = scrollYProgress.on('change', (latest) => {
      const stepIndex = Math.min(Math.floor(latest * steps.length * 1.2), steps.length - 1);
      setActiveStep(stepIndex);
    });
    return () => unsubscribe();
  }, [scrollYProgress]);

  return (
    <section ref={sectionRef} className="relative py-32 px-6 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[#0a0a0a]" />

      {/* Top border */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-500/30 to-transparent" />

      <div className="max-w-5xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8 }}
          className="text-center mb-24"
        >
          <span className="inline-flex items-center gap-2 text-[11px] font-medium tracking-widest text-orange-400 uppercase mb-6">
            <span className="w-6 h-px bg-orange-400 inline-block" />
            Our Process
            <span className="w-6 h-px bg-orange-400 inline-block" />
          </span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-5 leading-tight">
            How we{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, #ef4444, #f97316, #fb7185)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              bring ideas to life
            </span>
          </h2>
          <p className="text-white/45 text-sm max-w-2xl mx-auto leading-relaxed">
            A proven approach that transforms vision into reality, step by step
          </p>
        </motion.div>

        {/* Timeline */}
        <div className="relative" ref={timelineRef}>
          {/* Vertical line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 bg-white/10">
            <motion.div
              style={{ height: lineProgress }}
              className="w-full bg-gradient-to-b from-red-500 via-orange-500 to-yellow-500 relative"
            >
              {/* Traveling glow dot */}
              <motion.div
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-orange-400"
                style={{
                  boxShadow: '0 0 20px rgba(249,115,22,0.8), 0 0 40px rgba(249,115,22,0.4)',
                }}
              />
            </motion.div>
          </div>

          {/* Steps */}
          <div className="space-y-32">
            {steps.map((step, idx) => {
              const isLeft = idx % 2 === 0;
              const isActive = idx <= activeStep;

              return (
                <motion.div
                  key={step.number}
                  initial={{ opacity: 0, x: isLeft ? -60 : 60 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-100px' }}
                  transition={{ duration: 0.8, delay: idx * 0.2 }}
                  className={`relative flex items-center ${isLeft ? 'justify-start' : 'justify-end'}`}
                >
                  {/* Content card */}
                  <div
                    className={`w-[calc(50%-3rem)] ${isLeft ? 'pr-8 text-right' : 'pl-8 text-left'}`}
                  >
                    <motion.div
                      initial={{ opacity: 0.5, scale: 0.95 }}
                      animate={isActive ? { opacity: 1, scale: 1 } : { opacity: 0.5, scale: 0.95 }}
                      transition={{ duration: 0.5 }}
                      className="p-8 rounded-2xl transition-all duration-500"
                      style={{
                        background: isActive
                          ? 'linear-gradient(145deg, rgba(249,115,22,0.08), rgba(249,115,22,0.02))'
                          : 'linear-gradient(145deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
                        border: isActive
                          ? '1px solid rgba(249,115,22,0.3)'
                          : '1px solid rgba(255,255,255,0.06)',
                      }}
                    >
                      <div className={`flex items-center gap-3 mb-4 ${isLeft ? 'justify-end' : 'justify-start'}`}>
                        <span className="font-display text-2xl font-bold text-white/20">
                          {step.number}
                        </span>
                        <h3 className="font-display text-xl font-semibold text-white">
                          {step.title}
                        </h3>
                      </div>

                      <p className="text-white/50 text-sm leading-relaxed mb-5">
                        {step.description}
                      </p>

                      {/* Detail tags */}
                      <div className={`flex flex-wrap gap-2 ${isLeft ? 'justify-end' : 'justify-start'}`}>
                        {step.details.map((detail) => (
                          <span
                            key={detail}
                            className="px-3 py-1 rounded-full text-[10px] font-medium tracking-wide text-orange-300/70 bg-orange-500/10 border border-orange-500/20"
                          >
                            {detail}
                          </span>
                        ))}
                      </div>
                    </motion.div>
                  </div>

                  {/* Center node */}
                  <div className="absolute left-1/2 -translate-x-1/2 z-10">
                    <motion.div
                      initial={{ scale: 0 }}
                      whileInView={{ scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: idx * 0.2 + 0.3 }}
                      className={`w-16 h-16 rounded-full flex items-center justify-center bg-gradient-to-br ${step.color} relative`}
                      style={{
                        boxShadow: isActive
                          ? '0 0 30px rgba(249,115,22,0.6), 0 0 60px rgba(249,115,22,0.3)'
                          : '0 10px 40px rgba(249,115,22,0.2)',
                      }}
                    >
                      <i className={`${step.icon} text-white text-2xl`} />

                      {/* Pulse rings */}
                      {isActive && (
                        <>
                          <motion.div
                            animate={{
                              scale: [1, 1.8, 1],
                              opacity: [0.6, 0, 0.6],
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              ease: 'easeInOut',
                            }}
                            className="absolute inset-0 rounded-full border-2 border-orange-400"
                          />
                          <motion.div
                            animate={{
                              scale: [1, 2.2, 1],
                              opacity: [0.4, 0, 0.4],
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              ease: 'easeInOut',
                              delay: 0.5,
                            }}
                            className="absolute inset-0 rounded-full border-2 border-orange-400"
                          />
                        </>
                      )}
                    </motion.div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Grand finale */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mt-32 text-center relative"
          >
            {/* Burst effect */}
            <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-12">
              <motion.div
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.3, 0, 0.3],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="w-32 h-32 rounded-full bg-gradient-to-br from-orange-500/30 to-pink-500/30"
                style={{ filter: 'blur(40px)' }}
              />
            </div>

            <div className="relative z-10">
              <motion.div
                animate={{
                  rotate: [0, 360],
                }}
                transition={{
                  duration: 20,
                  repeat: Infinity,
                  ease: 'linear',
                }}
                className="inline-block mb-6"
              >
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center bg-gradient-to-br from-orange-500 to-pink-500"
                  style={{
                    boxShadow: '0 0 40px rgba(249,115,22,0.6), 0 0 80px rgba(249,115,22,0.3)',
                  }}
                >
                  <i className="ri-sparkling-line text-white text-3xl" />
                </div>
              </motion.div>

              <h3 className="font-display text-2xl md:text-3xl font-bold text-white mb-3">
                Your brand,{' '}
                <span
                  style={{
                    background: 'linear-gradient(135deg, #ef4444, #f97316, #fb7185)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  unforgettable
                </span>
              </h3>
              <p className="text-white/45 text-sm max-w-md mx-auto">
                Ready to start your journey? Let&apos;s create something extraordinary together.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
