import { useEffect, useRef } from 'react';

interface Bubble {
  id: number;
  x: number;
  y: number;
  size: number;
  vx: number;
  vy: number;
  color: string;
}

export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mousePosRef = useRef({ x: -9999, y: -9999 });
  const bubblesRef = useRef<Bubble[]>([]);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    const els = sectionRef.current?.querySelectorAll<HTMLElement>('.hero-animate');
    if (!els) return;
    els.forEach((el) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(30px)';
    });
    els.forEach((el, i) => {
      setTimeout(() => {
        el.style.transition = 'opacity 0.7s ease, transform 0.7s ease';
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      }, i * 120);
    });
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mousePosRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const section = sectionRef.current;
      canvas.width = window.innerWidth;
      canvas.height = section ? section.offsetHeight : window.innerHeight;
    };
    resizeCanvas();

    const resizeObserver = new ResizeObserver(resizeCanvas);
    if (sectionRef.current) resizeObserver.observe(sectionRef.current);
    window.addEventListener('resize', resizeCanvas);

    const colors = [
      'rgba(234,88,12,0.15)',
      'rgba(239,68,68,0.12)',
      'rgba(251,113,133,0.1)',
      'rgba(249,115,22,0.18)',
      'rgba(251,191,36,0.08)',
    ];

    bubblesRef.current = Array.from({ length: 25 }, (_, i) => ({
      id: i,
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 120 + 60,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const mouse = mousePosRef.current;
      bubblesRef.current.forEach((bubble) => {
        bubble.x += bubble.vx;
        bubble.y += bubble.vy;
        if (bubble.x < 0 || bubble.x > canvas.width) bubble.vx *= -1;
        if (bubble.y < 0 || bubble.y > canvas.height) bubble.vy *= -1;
        const dx = bubble.x - mouse.x;
        const dy = bubble.y - mouse.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDistance = 200;
        if (distance < minDistance && distance > 0) {
          const force = (minDistance - distance) / minDistance;
          bubble.x += (dx / distance) * force * 3;
          bubble.y += (dy / distance) * force * 3;
        }
        const gradient = ctx.createRadialGradient(bubble.x, bubble.y, 0, bubble.x, bubble.y, bubble.size);
        gradient.addColorStop(0, bubble.color);
        gradient.addColorStop(0.5, bubble.color.replace(/[\d.]+\)$/, '0.05)'));
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.filter = 'blur(40px)';
        ctx.beginPath();
        ctx.arc(bubble.x, bubble.y, bubble.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.filter = 'none';
      });
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      resizeObserver.disconnect();
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      data-hero-section
      className="relative flex items-center justify-center overflow-hidden"
      style={{
        height: 'calc(100vh - 52px)',
        minHeight: '560px',
        paddingTop: '84px',
        background: 'linear-gradient(160deg, #0a0a0a 0%, #111111 50%, #0d0d0d 100%)',
      }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }} />

      <div className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 text-center flex flex-col items-center">

        {/* Badge */}
        <div
          className="hero-animate inline-flex items-center gap-2 sm:gap-2.5 mb-8 px-4 py-1.5 rounded-full"
          style={{ background: 'rgba(234,88,12,0.1)', border: '1px solid rgba(234,88,12,0.3)' }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-orange-400 inline-block animate-pulse" />
          <span className="text-[10px] font-medium tracking-[0.25em] uppercase text-orange-300 font-display">
            Cebuano Creative Firm
          </span>
        </div>

        {/* Main headline — the actual hero */}
        <h1 className="hero-animate font-display leading-none tracking-tighter mb-5 w-full">
          <span
            className="block font-black text-white mb-1"
            style={{ fontSize: 'clamp(1.25rem, 4.35vw, 3.15rem)', letterSpacing: '0.12em' }}
          >
            HELLO, WE&apos;RE
          </span>
          <span
            className="block font-black"
            style={{
              fontSize: 'clamp(3.5rem, 12vw, 8.5rem)',
              letterSpacing: '0.04em',
              lineHeight: 0.88,
              background: 'linear-gradient(135deg, #ef4444 0%, #f97316 40%, #fb7185 80%, #fbbf24 100%)',
              backgroundSize: '200% 200%',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              animation: 'gradient-shift 6s ease infinite',
            }}
          >
            HUNA
          </span>
          <span
            className="block font-black"
            style={{ fontSize: 'clamp(1.5rem, 5.25vw, 3.8rem)', letterSpacing: '0.18em',
              background: 'linear-gradient(135deg, #ef4444 0%, #f97316 40%, #fb7185 80%, #fbbf24 100%)',
              backgroundSize: '200% 200%',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              animation: 'gradient-shift 6s ease infinite',
            }}
          >
            CREATIVES
          </span>
        </h1>

        {/* Subtle discipline strip */}
        <p
          className="hero-animate text-[10px] font-medium tracking-[0.3em] uppercase mb-2"
          style={{ color: 'rgba(255,255,255,0.2)' }}
        >
          Design &nbsp;·&nbsp; Branding &nbsp;·&nbsp; Digital Content
        </p>

        {/* De-emphasized description — just a single muted italic line */}
        <p
          className="hero-animate text-[11px] sm:text-xs italic mb-10 sm:mb-12"
          style={{ color: 'rgba(255,255,255,0.28)', fontFamily: 'inherit' }}
        >
          &ldquo;Huna&rdquo; — Bisaya for{' '}
          <em style={{ color: 'rgba(249,115,22,0.55)', fontStyle: 'normal' }}>
            to think, to imagine, to create.
          </em>
        </p>

        {/* CTAs — right after the name, prominent */}
        <div className="hero-animate flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 w-full max-w-sm sm:max-w-none mx-auto mb-16 sm:mb-20">
          <a
            href="/services"
            className="sm:w-auto px-8 sm:px-10 py-3 sm:py-3.5 rounded-full text-[10px] sm:text-xs font-semibold tracking-widest uppercase text-white transition-all duration-300 hover:scale-105 whitespace-nowrap cursor-pointer text-center"
            style={{
              background: 'linear-gradient(135deg, #ef4444, #f97316, #fb7185)',
              backgroundSize: '200% 200%',
              boxShadow: '0 6px 30px rgba(234,88,12,0.45)',
              animation: 'gradient-shift 6s ease infinite',
            }}
          >
            Our Services
          </a>
          <a
            href="/contact"
            className="sm:w-auto px-8 sm:px-10 py-3 sm:py-3.5 rounded-full text-[10px] sm:text-xs font-semibold tracking-widest uppercase text-white/70 transition-all duration-300 hover:text-white hover:scale-105 whitespace-nowrap cursor-pointer text-center"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,255,255,0.2)' }}
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
            Get In Touch
          </a>
        </div>

        {/* Stats — proof at the bottom, low key */}
        <div className="hero-animate w-full flex items-center justify-center gap-0">
          {[
            { value: '100+', label: 'Projects Delivered' },
            { value: '5.0★', label: 'Partner Rating' },
            { value: '100%', label: 'Satisfaction Rate' },
          ].map((stat, i, arr) => (
            <>
              <div key={stat.label} className="text-center flex-1 min-w-0 py-4 sm:py-5">
                <div
                  className="text-base sm:text-xl md:text-2xl font-bold font-display"
                  style={{
                    background: 'linear-gradient(135deg, #f97316, #fb7185)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  {stat.value}
                </div>
                <div className="text-[8px] sm:text-[9px] tracking-widest uppercase text-white/30 mt-0.5 font-body">
                  {stat.label}
                </div>
              </div>
              {i < arr.length - 1 && (
                <div
                  key={`div-${i}`}
                  className="w-px h-10 flex-shrink-0"
                  style={{ background: 'rgba(255,255,255,0.06)', marginTop: '1px' }}
                />
              )}
            </>
          ))}
        </div>

      </div>
    </section>
  );
}
