import { useEffect, useState } from 'react';

const tiles = [
  {
    badge: 'Portfolio',
    headline: 'Branding, social & web work for growing brands.',
    images: [
      '/images/portfolio-bcn-social-1.webp',
      '/images/portfolio-ebo-2.webp',
      '/images/portfolio-eq-2.webp',
      '/images/portfolio-tct-2.webp',
    ],
    href: '/portfolio',
    variant: 'light' as const,
  },
  {
    badge: 'Services',
    headline: 'Design, Branding & Digital Content for growing brands.',
    images: [
      '/images/686a4b13770b0b212e743808c854259d.png',
      '/images/203f7572a12f03a6a55d3a97977e399c.png',
      '/images/0786ff49839456d59f84f19d66a7f551.png',
      '/images/171bfd1b-938b-4646-820a-d40659dd77d6_Screenshot-2026-03-27-at-12.53.20AM.png',
    ],
    href: '/services',
    variant: 'accent' as const,
  },
  {
    badge: 'Case Study',
    headline: "How We Branded Peak Coffee Roasters — Cebu's Boldest Specialty Café Identity",
    images: ['/images/peak-coffee-pcr-1.webp'],
    href: '/blog/peak-coffee-roasters-branding-cebu-it-park',
    variant: 'light' as const,
  },
];

const SLIDE_INTERVAL_MS = 3200;

// Crossfades through a tile's image set on a timer — only tiles with more
// than one image (Portfolio, Services) actually animate; Case Study just
// renders its single photo.
function TileImage({ images, className }: { images: string[]; className: string }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % images.length);
    }, SLIDE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [images.length]);

  return (
    <div className={`relative ${className}`}>
      {images.map((src, i) => (
        <img
          key={src}
          src={src}
          alt=""
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-in-out group-hover:scale-105"
          style={{ opacity: i === index ? 1 : 0, transitionProperty: 'opacity, transform' }}
        />
      ))}
    </div>
  );
}

export default function HighlightTiles() {
  return (
    <section className="relative py-16 sm:py-20 px-4 sm:px-6 lg:px-8">
      <div className="relative max-w-6xl mx-auto grid sm:grid-cols-3 gap-4 sm:gap-5">
        {tiles.map((tile) => {
          const isAccent = tile.variant === 'accent';
          return (
            <a
              key={tile.badge}
              href={tile.href}
              className="group relative flex flex-col rounded-3xl p-5 sm:p-6 overflow-hidden transition-transform duration-300 hover:-translate-y-1"
              style={
                isAccent
                  ? {
                      // Same animated "Gradient Cloud" treatment as the CTA
                      // panel on the Services page.
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
                    }
                  : {
                      background: 'rgba(255,255,255,0.45)',
                      backdropFilter: 'blur(20px) saturate(160%)',
                      WebkitBackdropFilter: 'blur(20px) saturate(160%)',
                      border: '1px solid rgba(255,255,255,0.6)',
                      boxShadow: '0 8px 32px rgba(48,50,54,0.08), inset 0 1px 0 rgba(255,255,255,0.5)',
                    }
              }
            >
              {/* Badge + arrow row */}
              <div className="flex items-center justify-between mb-5">
                <span
                  className={`text-[10px] font-semibold tracking-widest uppercase px-3 py-1.5 rounded-full border ${
                    isAccent
                      ? 'text-white border-white/40 bg-white/10'
                      : 'text-[#303236]/70 border-[#303236]/10 bg-white/40'
                  }`}
                >
                  {tile.badge}
                </span>
                <span
                  className={`w-9 h-9 flex items-center justify-center rounded-full transition-transform duration-300 group-hover:rotate-45 ${
                    isAccent ? 'bg-white/90 text-[#E65416]' : 'bg-[#303236]/85 text-white'
                  }`}
                >
                  <i className="ri-arrow-right-up-line text-base" />
                </span>
              </div>

              {isAccent ? (
                <>
                  {/* Image sits above the caption for the accent tile */}
                  <TileImage images={tile.images} className="flex-1 min-h-[180px] mb-5 rounded-2xl overflow-hidden" />
                  <p className="text-white font-display font-bold text-sm sm:text-base leading-snug">
                    {tile.headline}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-[#303236] font-display font-bold text-sm sm:text-base leading-snug mb-5">
                    {tile.headline}
                  </p>
                  <TileImage images={tile.images} className="mt-auto rounded-2xl overflow-hidden aspect-[4/3]" />
                </>
              )}
            </a>
          );
        })}
      </div>
    </section>
  );
}
