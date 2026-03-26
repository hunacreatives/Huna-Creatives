import { useEffect, useRef, useState } from 'react';

const clients = [
  'The Cowart Team', 'Mile One', 'Cyberbacker', 'Arlington Abodes',
  'WJD Management', 'MMK Realty', 'The Real Estate Store',
  'Urbana Pediatric Dentistry', 'Traditions Dental', 'Everyone By One',
  'Once Upon a Tooth', 'Hello Kids Dentistry', 'Agape Pediatric Dentistry',
  'Tooth Patrol PD', 'Dirty Soul', 'Capital Energy Training',
  'Randy Huntley Home Selling Team', 'NEP', 'Kei Coffee House',
  'ROL', 'VOX', 'Kei Concepts', 'KIN', 'Blue Collar Nutrition',
  'INI', 'QUA', 'SUP', 'Nalu Boutique', 'Lakeview Enterprise Campus',
  'KEY Groups', 'Sperry Key Groups', 'Equestrian International',
  'The Second Haus', 'Uji-Matcha Cafe', 'Whisk Up Matcha',
  'FS Architects', 'Peak Coffee Roasters', 'Hulma Cebu',
];

function useCountUp(target: number, duration = 1400) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStarted(true); },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [started, target, duration]);

  return { count, ref };
}

export default function ClientsBanner() {
  const { count, ref } = useCountUp(38);

  return (
    <>
      <section
        ref={ref}
        className="relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #ea580c 0%, #f97316 55%, #fb923c 100%)' }}
      >
        {/* Noise overlay */}
        <div
          className="absolute inset-0 opacity-[0.035] pointer-events-none"
          style={{
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
          }}
        />

        <div className="flex items-center" style={{ minHeight: '52px' }}>

          {/* Left stat block */}
          <div
            className="hidden md:flex items-center gap-4 flex-shrink-0 px-6 lg:px-10 border-r"
            style={{ borderColor: 'rgba(0,0,0,0.18)' }}
          >
            <span
              className="font-black leading-none"
              style={{
                fontSize: 'clamp(1.8rem, 3vw, 2.4rem)',
                color: '#fff',
                fontFamily: '\'DM Sans\', sans-serif',
                letterSpacing: '-0.04em',
              }}
            >
              {count}+
            </span>
            <div className="flex flex-col gap-0.5">
              <span
                className="text-[9px] font-bold uppercase tracking-[0.14em] whitespace-nowrap"
                style={{ color: 'rgba(255,255,255,0.55)' }}
              >
                Brands Our Team
              </span>
              <span
                className="text-[9px] font-bold uppercase tracking-[0.14em] whitespace-nowrap"
                style={{ color: 'rgba(255,255,255,0.55)' }}
              >
                Has Worked With
              </span>
            </div>
          </div>

          {/* Single ticker row */}
          <div className="flex-1 overflow-hidden relative" style={{ height: '52px' }}>
            {/* Fade edges */}
            <div
              className="absolute left-0 top-0 bottom-0 w-16 z-10 pointer-events-none"
              style={{ background: 'linear-gradient(to right, #ea580c, transparent)' }}
            />
            <div
              className="absolute right-0 top-0 bottom-0 w-16 z-10 pointer-events-none"
              style={{ background: 'linear-gradient(to left, #fb923c, transparent)' }}
            />

            <div className="client-ticker-track h-full flex items-center">
              <div className="client-ticker flex items-center">
                {[...clients, ...clients].map((name, i) => (
                  <span key={i} className="inline-flex items-center flex-shrink-0">
                    <span
                      className="text-[12px] font-semibold whitespace-nowrap px-6 tracking-wide cursor-default transition-colors duration-200 hover:text-white"
                      style={{ color: 'rgba(255,255,255,0.82)', fontFamily: '\'DM Sans\', sans-serif' }}
                    >
                      {name}
                    </span>
                    <span
                      className="w-[3px] h-[3px] rounded-full flex-shrink-0"
                      style={{ background: 'rgba(255,255,255,0.35)' }}
                    />
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <style>{`
          .client-ticker {
            width: max-content;
            animation: ticker-scroll 55s linear infinite;
          }
          .client-ticker-track:hover .client-ticker {
            animation-play-state: paused;
          }
          @keyframes ticker-scroll {
            0%   { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
        `}</style>
      </section>

      {/* Disclaimer */}
      <div className="py-2 px-6 text-center bg-[#0a0a0a]">
        <p className="text-[9px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.2)' }}>
          Our team members have contributed to projects for the brands above through previous freelance, in-house, or independent client work prior to and outside of the agency.
        </p>
      </div>
    </>
  );
}
