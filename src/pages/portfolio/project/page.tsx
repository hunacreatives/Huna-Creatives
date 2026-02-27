
import { useParams, Link } from 'react-router-dom';
import { useEffect } from 'react';
import Navigation from '../../../components/feature/Navigation';
import Footer from '../../home/components/Footer';
import { projectDataMap } from './data';

const ProjectPage = () => {
  const { projectSlug } = useParams<{ projectSlug: string }>();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [projectSlug]);

  const project = projectDataMap[projectSlug ?? ''];

  if (!project) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <Navigation />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center px-4">
            <h2 className="text-xl md:text-2xl font-bold text-white mb-4 font-display">
              Project not found
            </h2>
            <Link
              to="/portfolio"
              className="text-orange-500 hover:text-orange-400 font-medium text-sm"
            >
              &larr; Back to Portfolio
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] font-body">
      <Navigation />

      <main>
        {/* Hero */}
        <section className="relative pt-24 pb-12 md:pt-28 md:pb-16 lg:pt-36 lg:pb-24 px-4 md:px-6 bg-[#0a0a0a]">
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[1px]"
            style={{
              background:
                'linear-gradient(90deg, transparent, rgba(249,115,22,0.4), transparent)',
            }}
          />
          <div className="max-w-6xl mx-auto">
            <Link
              to={`/portfolio/${project.category}`}
              className="inline-flex items-center gap-2 text-white/40 hover:text-orange-500 transition-colors mb-8 md:mb-10 group text-sm"
            >
              <i className="ri-arrow-left-line text-base group-hover:-translate-x-1 transition-transform" />
              <span className="font-medium whitespace-nowrap tracking-wide">
                Back to {project.categoryLabel}
              </span>
            </Link>

            <div className="grid lg:grid-cols-2 gap-8 md:gap-12 lg:gap-20 items-center">
              <div>
                <span className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-widest text-orange-500 uppercase mb-4 md:mb-5">
                  <span className="w-5 h-px bg-orange-400 inline-block" />
                  Case Study
                </span>
                <h1 className="font-display text-3xl md:text-4xl lg:text-5xl xl:text-[3.25rem] font-bold text-white leading-[1.1] mb-4 md:mb-6">
                  {project.title}
                </h1>
                <p className="text-white/45 text-sm leading-relaxed max-w-lg mb-6 md:mb-8">
                  {project.subtitle}
                </p>
                <div className="flex flex-wrap gap-2 md:gap-3">
                  {project.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 md:px-4 py-1 md:py-1.5 rounded-full text-[10px] md:text-[11px] font-medium text-white/60"
                      style={{
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.1)',
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 md:gap-4">
                {[
                  { label: 'Client', value: project.client, icon: 'ri-user-line' },
                  { label: 'Timeline', value: project.timeline, icon: 'ri-time-line' },
                  { label: 'Industry', value: project.industry, icon: 'ri-building-line' },
                  { label: 'Scope', value: project.scope, icon: 'ri-stack-line' },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-lg md:rounded-xl p-4 md:p-5 hover:-translate-y-0.5 transition-all duration-300"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <div
                      className="w-7 h-7 md:w-8 md:h-8 flex items-center justify-center rounded-md md:rounded-lg mb-2 md:mb-3"
                      style={{
                        background:
                          'linear-gradient(135deg, rgba(239,68,68,0.2), rgba(249,115,22,0.12))',
                      }}
                    >
                      <i className={`${item.icon} text-orange-500 text-xs md:text-sm`} />
                    </div>
                    <div className="text-[10px] md:text-[11px] text-white/30 mb-1">
                      {item.label}
                    </div>
                    <div className="text-sm font-semibold text-white font-display">
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Hero Image */}
        <section className="px-4 md:px-6 -mt-2">
          <div className="max-w-6xl mx-auto">
            <div
              className="w-full h-[240px] md:h-[320px] lg:h-[480px] rounded-xl md:rounded-2xl overflow-hidden shadow-2xl"
              style={{ border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <img
                src={project.heroImage}
                alt={project.title}
                className="w-full h-full object-cover object-center"
              />
            </div>
          </div>
        </section>

        {/* The Challenge & Approach */}
        <section className="py-12 md:py-16 lg:py-24 px-4 md:px-6 bg-[#0a0a0a]">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-8 md:gap-12 lg:gap-20">
              <div>
                <span className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-widest text-orange-500 uppercase mb-3 md:mb-4">
                  <span className="w-5 h-px bg-orange-400 inline-block" />
                  The Challenge
                </span>
                <h2 className="font-display text-xl md:text-2xl lg:text-3xl font-bold text-white mb-4 md:mb-5">
                  {project.challenge.heading}
                </h2>
                <p className="text-white/45 text-sm leading-relaxed">
                  {project.challenge.body}
                </p>
              </div>
              <div>
                <span className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-widest text-orange-500 uppercase mb-3 md:mb-4">
                  <span className="w-5 h-px bg-orange-400 inline-block" />
                  Our Approach
                </span>
                <h2 className="font-display text-xl md:text-2xl lg:text-3xl font-bold text-white mb-4 md:mb-5">
                  {project.approach.heading}
                </h2>
                <p className="text-white/45 text-sm leading-relaxed">
                  {project.approach.body}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Logo Showcase */}
        <section className="py-12 md:py-16 lg:py-24 px-4 md:px-6" style={{ background: '#111111' }}>
          <div
            className="absolute left-1/2 -translate-x-1/2 w-[900px] h-[1px]"
            style={{
              background:
                'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)',
            }}
          />
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10 md:mb-12">
              <span className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-widest text-orange-500 uppercase mb-3 md:mb-4">
                <span className="w-5 h-px bg-orange-400 inline-block" />
                Brand Identity
                <span className="w-5 h-px bg-orange-400 inline-block" />
              </span>
              <h2 className="font-display text-xl md:text-2xl lg:text-3xl font-bold text-white">
                Logo &amp; Mark
              </h2>
            </div>
            <div className="grid md:grid-cols-3 gap-4 md:gap-5">
              {project.logos.map((logo, i) => (
                <div
                  key={i}
                  className={`rounded-xl md:rounded-2xl overflow-hidden h-[200px] md:h-[240px] lg:h-[280px] flex items-center justify-center p-6 md:p-8 ${logo.bg}`}
                  style={{ border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  <img
                    src={logo.image}
                    alt={logo.label}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-center gap-4 md:gap-6 mt-5 md:mt-6">
              {project.logos.map((logo, i) => (
                <span key={i} className="text-xs text-white/30 font-medium">
                  {logo.label}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Typography */}
        <section className="py-12 md:py-16 lg:py-24 px-4 md:px-6 bg-[#0a0a0a]">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-8 md:gap-12 lg:gap-20 items-start">
              <div>
                <span className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-widest text-orange-500 uppercase mb-3 md:mb-4">
                  <span className="w-5 h-px bg-orange-400 inline-block" />
                  Typography
                </span>
                <h2 className="font-display text-xl md:text-2xl lg:text-3xl font-bold text-white mb-4 md:mb-5">
                  Type System
                </h2>
                <p className="text-white/45 text-sm leading-relaxed mb-6 md:mb-8">
                  {project.typography.description}
                </p>
              </div>
              <div className="space-y-5 md:space-y-6">
                {project.typography.fonts.map((font, i) => (
                  <div
                    key={i}
                    className="rounded-lg md:rounded-xl p-5 md:p-6"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <div className="text-[11px] text-white/30 uppercase tracking-widest mb-2">
                      {font.role}
                    </div>
                    <div
                      className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-1"
                      style={{ fontFamily: font.family }}
                    >
                      {font.family}
                    </div>
                    <div className="text-xs text-white/30">{font.weights}</div>
                    <div
                      className="mt-3 md:mt-4 text-sm text-white/50 leading-relaxed"
                      style={{ fontFamily: font.family }}
                    >
                      {font.sample}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Color Palette */}
        <section className="py-12 md:py-16 lg:py-24 px-4 md:px-6" style={{ background: '#111111' }}>
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10 md:mb-12">
              <span className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-widest text-orange-500 uppercase mb-3 md:mb-4">
                <span className="w-5 h-px bg-orange-400 inline-block" />
                Color Palette
                <span className="w-5 h-px bg-orange-400 inline-block" />
              </span>
              <h2 className="font-display text-xl md:text-2xl lg:text-3xl font-bold text-white">
                Brand Colors
              </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
              {project.colors.map((color, i) => (
                <div
                  key={i}
                  className="rounded-lg md:rounded-xl overflow-hidden hover:-translate-y-1 transition-all duration-300 cursor-pointer"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <div
                    className="h-24 md:h-32 lg:h-40"
                    style={{ backgroundColor: color.hex }}
                  />
                  <div className="p-3 md:p-4">
                    <div className="text-sm font-semibold text-white mb-0.5">
                      {color.name}
                    </div>
                    <div className="text-[11px] text-white/35 font-mono">
                      {color.hex}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Applications */}
        <section className="py-12 md:py-16 lg:py-24 px-4 md:px-6 bg-[#0a0a0a]">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10 md:mb-12">
              <span className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-widest text-orange-500 uppercase mb-3 md:mb-4">
                <span className="w-5 h-px bg-orange-400 inline-block" />
                Applications
                <span className="w-5 h-px bg-orange-400 inline-block" />
              </span>
              <h2 className="font-display text-xl md:text-2xl lg:text-3xl font-bold text-white">
                Brand in Action
              </h2>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
              {project.applications.map((app, i) => (
                <div
                  key={i}
                  className="group rounded-xl md:rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer"
                  style={{ border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  <div className="w-full h-[180px] md:h-[200px] lg:h-[240px] overflow-hidden">
                    <img
                      src={app.image}
                      alt={app.label}
                      className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div
                    className="p-3 md:p-4"
                    style={{ background: 'rgba(255,255,255,0.03)' }}
                  >
                    <span className="text-xs font-medium text-white/60">
                      {app.label}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Results */}
        <section className="py-12 md:py-16 lg:py-24 px-4 md:px-6" style={{ background: '#111111' }}>
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10 md:mb-12">
              <span className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-widest text-orange-500 uppercase mb-3 md:mb-4">
                <span className="w-5 h-px bg-orange-400 inline-block" />
                Results
                <span className="w-5 h-px bg-orange-400 inline-block" />
              </span>
              <h2 className="font-display text-xl md:text-2xl lg:text-3xl font-bold text-white mb-3 md:mb-4">
                The Impact
              </h2>
              <p className="text-white/40 text-sm max-w-xl mx-auto leading-relaxed">
                {project.results.summary}
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-4 md:gap-5">
              {project.results.metrics.map((metric, i) => (
                <div
                  key={i}
                  className="rounded-lg md:rounded-xl p-6 md:p-8 text-center hover:-translate-y-1 transition-all duration-300"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <div className="text-2xl md:text-3xl lg:text-4xl font-bold gradient-text font-display mb-2">
                    {metric.value}
                  </div>
                  <div className="text-sm font-medium text-white/70 mb-1">
                    {metric.label}
                  </div>
                  <div className="text-xs text-white/35">{metric.detail}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonial */}
        {project.testimonial && (
          <section className="py-12 md:py-16 lg:py-24 px-4 md:px-6 bg-[#0a0a0a]">
            <div className="max-w-4xl mx-auto text-center">
              <i className="ri-double-quotes-l text-3xl md:text-4xl text-orange-500/30 mb-5 md:mb-6 block" />
              <blockquote className="text-base md:text-lg lg:text-xl font-medium text-white/80 leading-relaxed mb-5 md:mb-6 font-display italic">
                &ldquo;{project.testimonial.quote}&rdquo;
              </blockquote>
              <div className="text-sm font-semibold text-white">
                {project.testimonial.author}
              </div>
              <div className="text-xs text-white/35 mt-1">
                {project.testimonial.role}
              </div>
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="py-12 md:py-16 lg:py-24 px-4 md:px-6" style={{ background: '#111111' }}>
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="font-display text-xl md:text-2xl lg:text-3xl font-bold text-white mb-3 md:mb-4">
              Want something like this?
            </h2>
            <p className="text-white/40 text-sm mb-6 md:mb-8 max-w-md mx-auto">
              Let&apos;s build a brand that tells your story. Get in touch and
              let&apos;s start creating.
            </p>
            <Link
              to="/contact"
              className="inline-flex items-center justify-center gap-2 px-6 md:px-8 py-2.5 md:py-3 font-semibold rounded-full text-white text-sm whitespace-nowrap cursor-pointer hover:scale-105 transition-all duration-300 w-full md:w-auto"
              style={{
                background:
                  'linear-gradient(135deg, #ef4444, #f97316, #fb7185)',
                boxShadow: '0 8px 24px rgba(239, 68, 68, 0.3)',
              }}
            >
              Start a Project
              <i className="ri-arrow-right-line text-base" />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default ProjectPage;
