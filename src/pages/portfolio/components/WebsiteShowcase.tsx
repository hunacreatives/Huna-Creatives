import { motion } from 'framer-motion';

const websites = [
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
    image: 'https://image.thum.io/get/width/1200/crop/800/https://hulmacebu.com',
  },
  {
    id: 'bzmywq',
    name: 'Client Website',
    url: 'https://bzmywq.readdy.co',
    displayUrl: 'bzmywq.readdy.co',
    category: 'Web Design & Branding',
    description:
      'A sleek, modern business website built with a dark, refined aesthetic. Clean layout, purposeful hierarchy, and a bold digital identity that commands attention.',
    tags: ['Web Design', 'Dark Theme', 'Branding', 'Digital Identity'],
    year: '2024',
    accentColor: '#7a8fa0',
    accentBg: 'rgba(122,143,160,0.1)',
    image: 'https://image.thum.io/get/width/1200/crop/800/https://bzmywq.readdy.co',
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
    image: 'https://image.thum.io/get/width/1200/crop/800/https://palmbarge.com.au',
  },
];

export default function WebsiteShowcase() {
  return (
    <section className="relative py-20 md:py-28 px-4 md:px-6 bg-[#0a0a0a]">
      {/* Ambient glow */}
      <div
        className="absolute top-1/3 right-1/4 w-[600px] h-[500px] rounded-full pointer-events-none opacity-20"
        style={{
          background: 'radial-gradient(circle, rgba(196,168,130,0.12) 0%, transparent 70%)',
          filter: 'blur(100px)',
        }}
      />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7 }}
          className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 md:gap-6 mb-12 md:mb-16"
        >
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="w-8 h-px bg-orange-500/50" />
              <span className="text-[10px] font-medium tracking-[0.3em] uppercase text-orange-400/80">
                Web Design
              </span>
            </div>
            <h2 className="font-display text-xl md:text-2xl lg:text-3xl font-bold text-white leading-tight">
              Sites we&apos;ve{' '}
              <span
                style={{
                  background: 'linear-gradient(135deg, #ef4444, #f97316, #fb7185)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                designed & built.
              </span>
            </h2>
          </div>
          <p className="text-white/30 text-xs md:text-sm max-w-xs leading-relaxed">
            Full-stack web projects — from strategy and UI/UX to development and launch.
          </p>
        </motion.div>

        {/* Website cards */}
        <div className="space-y-5 md:space-y-6">
          {websites.map((site, index) => (
            <motion.div
              key={site.id}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <a
                href={site.url}
                target="_blank"
                rel="nofollow noreferrer"
                className="group relative flex flex-col lg:flex-row overflow-hidden rounded-2xl cursor-pointer block"
                style={{
                  background: '#111111',
                  border: '1px solid rgba(255,255,255,0.07)',
                  transition: 'border-color 400ms ease',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = `${site.accentColor}50`;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.07)';
                }}
              >
                {/* Browser mockup */}
                <div className="relative w-full lg:w-[58%] flex-shrink-0 overflow-hidden">
                  {/* Browser chrome bar */}
                  <div
                    className="flex items-center gap-2 px-4 py-2.5 border-b"
                    style={{
                      background: '#1a1a1a',
                      borderColor: 'rgba(255,255,255,0.07)',
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                      <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                      <span className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                    </div>
                    <div
                      className="flex-1 mx-3 px-3 py-1 rounded-md flex items-center gap-2"
                      style={{ background: 'rgba(255,255,255,0.05)' }}
                    >
                      <i className="ri-lock-line text-[9px] text-white/25" />
                      <span className="text-[10px] text-white/30 tracking-wide truncate">
                        {site.displayUrl}
                      </span>
                    </div>
                    <i className="ri-external-link-line text-[11px] text-white/20 group-hover:text-white/50 transition-colors duration-300" />
                  </div>

                  {/* Screenshot */}
                  <div className="relative overflow-hidden" style={{ height: '220px', background: '#1a1a1a' }}>
                    <img
                      src={site.image}
                      alt={site.name}
                      className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
                    />
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-400 pointer-events-none"
                      style={{
                        background: `linear-gradient(135deg, ${site.accentColor}18 0%, transparent 60%)`,
                      }}
                    />
                    {/* Visit overlay */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div
                        className="flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-semibold text-white backdrop-blur-sm"
                        style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.15)' }}
                      >
                        <i className="ri-external-link-line" />
                        Visit Site
                      </div>
                    </div>
                  </div>
                </div>

                {/* Info panel */}
                <div className="flex flex-col justify-between p-6 md:p-8 flex-1">
                  {/* Top */}
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <span
                          className="inline-block text-[9px] font-semibold tracking-[0.2em] uppercase px-2.5 py-1 rounded-full mb-3"
                          style={{
                            background: site.accentBg,
                            color: site.accentColor,
                            border: `1px solid ${site.accentColor}30`,
                          }}
                        >
                          {site.category}
                        </span>
                        <h3 className="font-display text-base md:text-lg lg:text-xl font-bold text-white leading-tight group-hover:text-orange-50 transition-colors duration-300">
                          {site.name}
                        </h3>
                      </div>
                      <div
                        className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300"
                        style={{ background: `${site.accentColor}20` }}
                      >
                        <i className="ri-arrow-right-up-line text-sm" style={{ color: site.accentColor }} />
                      </div>
                    </div>
                    <p className="text-white/35 text-xs leading-relaxed mb-5 group-hover:text-white/50 transition-colors duration-300">
                      {site.description}
                    </p>
                  </div>

                  {/* Tags + Year */}
                  <div className="flex flex-wrap items-center gap-2">
                    {site.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] font-medium px-2.5 py-1 rounded-full whitespace-nowrap"
                        style={{
                          background: 'rgba(255,255,255,0.05)',
                          color: 'rgba(255,255,255,0.4)',
                          border: '1px solid rgba(255,255,255,0.08)',
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                    <span className="ml-auto text-[10px] text-white/20 font-medium">
                      {site.year}
                    </span>
                  </div>
                </div>
              </a>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
