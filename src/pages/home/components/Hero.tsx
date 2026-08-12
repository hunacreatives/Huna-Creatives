import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ShaderBackground from '../webgl/ShaderBackground';

const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'About Us', href: '/about' },
  { label: 'Portfolio', href: '/portfolio' },
  { label: 'Services', href: '/services' },
  { label: 'Blog', href: '/blog' },
  { label: 'Careers', href: '/careers' },
];

// Intro sequence timing: the hero loads full-bleed across the entire
// viewport (square corners, full height) — edge to edge on the top and
// sides always, never just during the intro — so the dark shader is the
// very first thing the page shows, held for a beat, then the bottom corners
// round out and the nav fades in. Once that settles, "HELLO," appears on
// its own, then "WE'RE" + the HUNA CREATIVES lockup, then the two CTAs.
const REVEAL_DELAY_MS = 800;
const REVEAL_DURATION_MS = 500;
const HELLO_START_MS = REVEAL_DELAY_MS + REVEAL_DURATION_MS;
const REST_START_MS = HELLO_START_MS + 250;
const BUTTONS_START_MS = REST_START_MS + 250;
// How long the hero takes to close back down to nothing when leaving for
// About — the intro's reveal, played in reverse and all the way to zero.
const LEAVE_DURATION_MS = 900;

export default function Hero() {
  const navigate = useNavigate();
  const sectionRef = useRef<HTMLDivElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [showHello, setShowHello] = useState(false);
  const [showRest, setShowRest] = useState(false);
  const [showButtons, setShowButtons] = useState(false);
  // True once "About Us" is clicked — the hero shrinks itself to nothing
  // (the same curved-bottom card, just continuing to close) instead of a
  // separate overlay taking over; navigation fires only once it's fully closed.
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const revealTimer = setTimeout(() => setRevealed(true), REVEAL_DELAY_MS);
    const helloTimer = setTimeout(() => setShowHello(true), HELLO_START_MS);
    const restTimer = setTimeout(() => setShowRest(true), REST_START_MS);
    const buttonsTimer = setTimeout(() => setShowButtons(true), BUTTONS_START_MS);
    return () => {
      clearTimeout(revealTimer);
      clearTimeout(helloTimer);
      clearTimeout(restTimer);
      clearTimeout(buttonsTimer);
    };
  }, []);

  // Instead of navigating immediately, cover the hero in white from the
  // bottom up — within its own fixed bounds, so the card's box never
  // resizes and nothing below it shifts into view — and only then swap the
  // route. The rising cover's leading edge uses the same curve as the
  // hero's own bottom corners, so it reads as that curve continuing to
  // travel upward rather than a new shape appearing.
  const handleAboutClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (leaving) return;
    setLeaving(true);
    setTimeout(() => navigate('/about'), LEAVE_DURATION_MS);
  };

  // clamp() instead of a fixed rem value — 4.5rem is proportionate on
  // desktop but reads as an oversized dome on a narrow mobile viewport.
  const bottomRadius = revealed ? 'clamp(2rem, 8vw, 4.5rem)' : '0px';

  return (
      <div
        ref={sectionRef}
        data-hero-section
        className="relative flex flex-col overflow-hidden"
        style={{
          // Full viewport height at first (the intro's "all black" moment),
          // then shrinks once revealed so the client marquee right after the
          // hero (a fixed ~90px) is visible in the first viewport too. This
          // stays fixed even while leaving — the white cover animates inside
          // it instead, so the box itself never resizes.
          minHeight: revealed ? 'calc(100svh - 90px)' : '100svh',
          borderRadius: `0 0 ${bottomRadius} ${bottomRadius}`,
          // overflow-hidden + border-radius alone doesn't reliably clip a
          // WebGL canvas layer in every browser — clip-path forces the
          // compositor to respect it, and unlike the border-radius it stays
          // in lockstep with the animated value. Corner order is
          // top-left/top-right/bottom-right/bottom-left.
          clipPath: `inset(0 round 0 0 ${bottomRadius} ${bottomRadius})`,
          WebkitClipPath: `inset(0 round 0 0 ${bottomRadius} ${bottomRadius})`,
          transition: `min-height ${REVEAL_DURATION_MS}ms cubic-bezier(0.16, 1, 0.3, 1), border-radius ${REVEAL_DURATION_MS}ms cubic-bezier(0.16, 1, 0.3, 1), clip-path ${REVEAL_DURATION_MS}ms cubic-bezier(0.16, 1, 0.3, 1)`,
        }}
      >
        {/* WebGL background — clipped to this rounded card instead of the whole page */}
        <ShaderBackground />

        {/* Rises from the bottom, within the hero's own bounds, to cover it
            in plain white when leaving for About — never resizes the card
            itself, so the marquee/light zone below stays put. */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 z-30 pointer-events-none bg-white"
          style={{
            height: leaving ? '100%' : '0%',
            borderTopLeftRadius: bottomRadius,
            borderTopRightRadius: bottomRadius,
            // border-radius + overflow alone doesn't reliably clip over a
            // WebGL canvas in every browser (same issue the hero card itself
            // hit) — clip-path forces the compositor to respect the curve.
            clipPath: `inset(0 round ${bottomRadius} ${bottomRadius} 0 0)`,
            WebkitClipPath: `inset(0 round ${bottomRadius} ${bottomRadius} 0 0)`,
            transition: `height ${LEAVE_DURATION_MS}ms cubic-bezier(0.16, 1, 0.3, 1)`,
          }}
        />

        {/* Scrim so headline/CTA text stays legible against a moving, equally-
            saturated background — a plain gradient text fill (as this headline
            used against the old static dark bg) has no contrast guarantee
            against a live shader of similar hues. */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 60% 55% at 50% 55%, rgba(5,5,8,0.55) 0%, rgba(5,5,8,0.15) 60%, transparent 100%)' }}
        />

        {/* Nav — embedded in the hero card, scrolls away with it. Hidden
            during the full-bleed black moment, fades in with the reveal. */}
        <nav
          className="relative z-20"
          style={{
            opacity: revealed ? 1 : 0,
            transition: `opacity ${REVEAL_DURATION_MS}ms ease`,
          }}
        >
          <div className="px-6 lg:px-12 py-4">
            <div className="flex items-center justify-between lg:grid lg:grid-cols-3">
              {/* Left links — Team Portal lives here (not with the right
                  group) so both sides carry roughly equal visual weight and
                  the logo reads as centered, not just mathematically centered */}
              <div className="hidden lg:flex items-center gap-8 justify-self-start">
                {navLinks.slice(0, 3).map((link) => (
                  <Link
                    key={link.href}
                    to={link.href}
                    onClick={link.href === '/about' ? handleAboutClick : undefined}
                    className="text-xs font-medium tracking-wide transition-all duration-300 whitespace-nowrap cursor-pointer relative group text-white/70 hover:text-white"
                  >
                    {link.label}
                    <span className="absolute -bottom-0.5 left-0 w-0 h-px group-hover:w-full transition-all duration-300 bg-[#A0C9CB]" />
                  </Link>
                ))}

                <button
                  onClick={() => navigate('/hub/login')}
                  className="text-xs font-medium tracking-wide transition-all duration-300 whitespace-nowrap cursor-pointer relative group text-white/70 hover:text-white flex items-center gap-1.5"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  Team Portal
                  <span className="absolute -bottom-0.5 left-0 w-0 h-px group-hover:w-full transition-all duration-300 bg-[#A0C9CB]" />
                </button>
              </div>

              {/* Centered logo */}
              <Link to="/" className="flex-shrink-0 lg:justify-self-center">
                <img src="/images/fc04818c74ad69bdfb22b93a6a0c6a72.png" alt="Huna Creatives" className="h-9 sm:h-11 w-auto" />
              </Link>

              {/* Right links + Team Portal + CTA, and the mobile hamburger */}
              <div className="flex items-center justify-end gap-8 lg:justify-self-end">
                <div className="hidden lg:flex items-center gap-8">
                  {navLinks.slice(3).map((link) => (
                    <Link
                      key={link.href}
                      to={link.href}
                      className="text-xs font-medium tracking-wide transition-all duration-300 whitespace-nowrap cursor-pointer relative group text-white/70 hover:text-white"
                    >
                      {link.label}
                      <span className="absolute -bottom-0.5 left-0 w-0 h-px group-hover:w-full transition-all duration-300 bg-[#A0C9CB]" />
                    </Link>
                  ))}

                  <Link
                    to="/contact"
                    className="px-6 py-2.5 rounded-full text-xs font-semibold tracking-wide transition-all duration-300 whitespace-nowrap cursor-pointer hover:scale-105 text-white"
                    style={{ background: 'linear-gradient(135deg, #E65416, #F06B33)', boxShadow: '0 4px 20px rgba(230,84,22,0.35)' }}
                  >
                    Contact Us
                  </Link>
                </div>

                <button
                  className="lg:hidden p-2 cursor-pointer flex flex-col gap-1.5"
                  onClick={() => setMobileOpen(!mobileOpen)}
                  aria-label="Toggle menu"
                >
                  <span className={`block w-6 h-0.5 bg-white transition-all duration-300 ${mobileOpen ? 'rotate-45 translate-y-2' : ''}`} />
                  <span className={`block w-6 h-0.5 bg-white transition-all duration-300 ${mobileOpen ? 'opacity-0' : ''}`} />
                  <span className={`block w-6 h-0.5 bg-white transition-all duration-300 ${mobileOpen ? '-rotate-45 -translate-y-2' : ''}`} />
                </button>
              </div>
            </div>

            <div
              className={`lg:hidden overflow-hidden transition-all duration-400 ${
                mobileOpen ? 'max-h-96 pt-4 pb-4' : 'max-h-0'
              }`}
            >
              <div className="flex flex-col gap-4">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    to={link.href}
                    onClick={(e) => {
                      setMobileOpen(false);
                      if (link.href === '/about') handleAboutClick(e);
                    }}
                    className="text-sm font-medium tracking-wide text-white/70 hover:text-white transition-colors whitespace-nowrap cursor-pointer"
                  >
                    {link.label}
                  </Link>
                ))}
                <button
                  onClick={() => navigate('/hub/login')}
                  className="text-sm font-medium tracking-wide text-white/70 hover:text-white transition-colors whitespace-nowrap cursor-pointer text-left flex items-center gap-2"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  Team Portal
                </button>
                <Link
                  to="/contact"
                  onClick={() => setMobileOpen(false)}
                  className="px-6 py-2.5 rounded-full text-xs font-semibold text-center whitespace-nowrap cursor-pointer text-white transition-all"
                  style={{ background: 'linear-gradient(135deg, #E65416, #F06B33)', boxShadow: '0 4px 16px rgba(230,84,22,0.3)' }}
                >
                  Contact Us
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {/* Hero content */}
        <div className="relative z-10 flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 text-center flex flex-col items-center justify-center">

          <h1 className="font-display leading-none tracking-tighter mb-10 sm:mb-12 w-full">
            <span
              className="block font-normal text-white mb-1"
              style={{ fontSize: 'clamp(1.2rem, 4.5vw, 2.1rem)', letterSpacing: '0.12em' }}
            >
              <span
                style={{
                  opacity: showHello ? 1 : 0,
                  transform: showHello ? 'translateY(0)' : 'translateY(20px)',
                  transition: 'opacity 0.4s ease, transform 0.4s ease',
                  display: 'inline-block',
                }}
              >
                HELLO,
              </span>{' '}
              <span
                style={{
                  opacity: showRest ? 1 : 0,
                  transform: showRest ? 'translateY(0)' : 'translateY(20px)',
                  transition: 'opacity 0.4s ease, transform 0.4s ease',
                  display: 'inline-block',
                }}
              >
                WE&apos;RE
              </span>
            </span>
            <span
              className="block font-black text-white"
              style={{
                fontSize: 'clamp(3.2rem, 13vw, 5.75rem)',
                letterSpacing: '0.04em',
                lineHeight: 0.88,
                textShadow: '0 4px 40px rgba(0,0,0,0.5)',
                opacity: showRest ? 1 : 0,
                transform: showRest ? 'translateY(0)' : 'translateY(20px)',
                transition: 'opacity 0.4s ease, transform 0.4s ease',
              }}
            >
              HUNA
            </span>
            <span
              className="block font-black text-white"
              style={{
                fontSize: 'clamp(1.4rem, 5.5vw, 2.6rem)',
                letterSpacing: '0.18em',
                textShadow: '0 4px 40px rgba(0,0,0,0.5)',
                opacity: showRest ? 1 : 0,
                transform: showRest ? 'translateY(0)' : 'translateY(20px)',
                transition: 'opacity 0.4s ease, transform 0.4s ease',
              }}
            >
              CREATIVES
            </span>
          </h1>

          <div
            className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 w-full max-w-sm sm:max-w-none mx-auto"
            style={{
              opacity: showButtons ? 1 : 0,
              transform: showButtons ? 'translateY(0)' : 'translateY(20px)',
              transition: 'opacity 0.4s ease, transform 0.4s ease',
            }}
          >
            <a
              href="/portfolio"
              className="sm:w-auto px-8 sm:px-10 py-3 sm:py-3.5 rounded-full text-[10px] sm:text-xs font-semibold tracking-widest uppercase text-white transition-all duration-300 hover:scale-105 whitespace-nowrap cursor-pointer text-center"
              style={{
                background: 'linear-gradient(135deg, #E65416, #F06B33)',
                backgroundSize: '200% 200%',
                boxShadow: '0 6px 30px rgba(230,84,22,0.45)',
                animation: 'gradient-shift 6s ease infinite',
              }}
            >
              Our Portfolio
            </a>
            <a
              href="/contact"
              className="sm:w-auto px-8 sm:px-10 py-3 sm:py-3.5 rounded-full text-[10px] sm:text-xs font-semibold tracking-widest uppercase text-white/70 transition-all duration-300 hover:text-white hover:scale-105 whitespace-nowrap cursor-pointer text-center"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,255,255,0.2)' }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLAnchorElement;
                el.style.borderColor = 'rgba(230,84,22,0.5)';
                el.style.background = 'rgba(230,84,22,0.08)';
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

        </div>
      </div>
  );
}
