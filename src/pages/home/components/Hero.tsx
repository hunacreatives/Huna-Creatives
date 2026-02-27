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

  // Track mouse position via ref (no re-render)
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mousePosRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Initialize bubbles & animation — runs once only
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

        const gradient = ctx.createRadialGradient(
          bubble.x, bubble.y, 0,
          bubble.x, bubble.y, bubble.size
        );
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
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #0a0a0a 0%, #111111 50%, #0d0d0d 100%)' }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }} />

      <div className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 pb-16 sm:pb-28 text-center">

        <div
          className="hero-animate inline-flex items-center gap-2 sm:gap-2.5 mb-6 sm:mb-8 px-3 sm:px-4 md:px-5 py-1.5 rounded-full"
          style={{ background: 'rgba(234,88,12,0.1)', border: '1px solid rgba(234,88,12,0.3)' }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-orange-400 inline-block animate-pulse" />
          <span className="text-[9px] sm:text-[10px] md:text-[11px] font-medium tracking-[0.2em] sm:tracking-[0.25em] uppercase text-orange-300 font-display">
            Cebuano Creative Firm
          </span>
        </div>

        <h1 className="hero-animate font-display leading-none tracking-tight mb-4 sm:mb-5">
          <span className="block text-white text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl mb-1 font-semibold">
            HELLO, WE&apos;RE
          </span>
          <span
            className="block text-4xl sm:text-5xl md:text-5xl lg:text-6xl xl:text-7xl font-black"
            style={{
              background: 'linear-gradient(135deg, #ef4444 0%, #f97316 40%, #fb7185 80%, #fbbf24 100%)',
              backgroundSize: '200% 200%',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              animation: 'gradient-shift 6s ease infinite',
            }}
          >
            HUNA CREATIVES
          </span>
        </h1>

        <p
          className="hero-animate text-[9px] sm:text-[10px] font-medium tracking-[0.2em] sm:tracking-[0.25em] uppercase mb-7 sm:mb-8"
          style={{ color: 'rgba(255,255,255,0.25)' }}
        >
          Design &nbsp;·&nbsp; Branding &nbsp;·&nbsp; Digital Content
        </p>

        <div
          className="hero-animate max-w-sm mx-auto mb-8 sm:mb-10 px-4 sm:px-5 py-5 sm:py-6 rounded-xl sm:rounded-2xl"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <p className="text-xs sm:text-sm text-white/70 leading-relaxed font-body">
            &ldquo;Huna&rdquo; is a Bisaya word that means{' '}
            <strong
              style={{
                background: 'linear-gradient(135deg, #f97316, #fb7185)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              to think, to imagine, to create an idea.
            </strong>{' '}
            We&apos;re a Cebuano creative firm that helps brands turn ideas into impactful design,
            branding, and digital content that moves people to action.
          </p>
          <p className="text-[10px] sm:text-[11px] text-white/40 mt-3 sm:mt-4 italic font-body">
            Let&apos;s bring your &ldquo;hunahuna&rdquo; to life.
          </p>
        </div>

        <div className="hero-animate flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 max-w-md sm:max-w-none mx-auto px-4 sm:px-0 mb-10 sm:mb-12">
          <a
            href="/portfolio"
            className="w-full sm:w-auto px-6 sm:px-7 md:px-9 py-2.5 sm:py-3 rounded-full text-[10px] sm:text-[11px] md:text-xs font-semibold tracking-widest uppercase text-white transition-all duration-300 hover:scale-105 whitespace-nowrap cursor-pointer text-center"
            style={{
              background: 'linear-gradient(135deg, #ef4444, #f97316, #fb7185)',
              backgroundSize: '200% 200%',
              boxShadow: '0 6px 30px rgba(234,88,12,0.45)',
              animation: 'gradient-shift 6s ease infinite',
            }}
          >
            Browse Our Works
          </a>
          <a
            href="/contact"
            className="w-full sm:w-auto px-6 sm:px-7 md:px-9 py-2.5 sm:py-3 rounded-full text-[10px] sm:text-[11px] md:text-xs font-semibold tracking-widest uppercase text-white/70 transition-all duration-300 hover:text-white hover:scale-105 whitespace-nowrap cursor-pointer text-center"
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

        {/* Stats row — inline below buttons */}
        <div className="hero-animate flex items-center justify-center gap-3 sm:gap-10 md:gap-14 w-full px-2">
          {[
            { value: '100+', label: 'Projects Delivered' },
            { value: '5.0★', label: 'Client Rating' },
            { value: '100%', label: 'Satisfaction Rate' },
          ].map((stat, i, arr) => (
            <>
              <div key={stat.label} className="text-center flex-1 min-w-0">
                <div
                  className="text-sm sm:text-xl md:text-2xl font-bold font-display"
                  style={{
                    background: 'linear-gradient(135deg, #f97316, #fb7185)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  {stat.value}
                </div>
                <div className="text-[7px] sm:text-[9px] md:text-[10px] tracking-wide sm:tracking-widest uppercase text-white/35 mt-0.5 font-body leading-tight">
                  {stat.label}
                </div>
              </div>
              {i < arr.length - 1 && (
                <div key={`divider-${i}`} className="w-px h-5 sm:h-6 bg-white/10 flex-shrink-0" />
              )}
            </>
          ))}
        </div>

      </div>
    </section>
  );
}
