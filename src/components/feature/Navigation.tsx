import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

const WHITE_LOGO = '/images/fc04818c74ad69bdfb22b93a6a0c6a72.png';
const BLACK_LOGO = '/images/547b59870e776a20eb28e4f20931787c.png';

const LIGHT_BG_PAGES = ['/about', '/portfolio/email-marketing', '/privacy', '/terms'];

interface NavigationProps {
  theme?: 'light' | 'dark';
  showContent?: boolean;
  // Forces the scrolled-style solid background even at the very top of the
  // page — for pages whose content is light/white all the way up (no dark
  // hero behind the nav), where theme="dark" text would otherwise be
  // invisible against nothing until the user scrolls past 50px.
  alwaysSolid?: boolean;
  // Black text + no bar at the top, flipping to a solid bar once scrolled —
  // for light pages that still want the nav to read as a bar once it's
  // actually sitting over page content.
  invertOnScroll?: boolean;
  // Only used with invertOnScroll. 'dark' (default) flips to a black bar +
  // white text on scroll. 'light' keeps text dark throughout and reveals a
  // light bar instead — for light pages where a light footer-colored bar
  // reads better than the default dark one.
  barTheme?: 'dark' | 'light';
}

export default function Navigation({ theme, alwaysSolid, invertOnScroll, barTheme = 'dark' }: NavigationProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const rafRef = useRef<number | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // For the dark bar variant, opening the mobile menu forces the nav
  // background dark too (see `solid` below) — text color has to flip with it
  // or you get dark text on a now-dark bar until the page happens to be
  // scrolled. The light bar variant doesn't have this problem: its "solid"
  // background is still light, so dark text stays legible regardless.
  const isLightPage = invertOnScroll
    ? barTheme === 'light'
      ? true
      : !(scrolled || mobileOpen)
    : theme
    ? theme === 'light'
    : LIGHT_BG_PAGES.includes(location.pathname);
  const logoSrc = isLightPage ? BLACK_LOGO : WHITE_LOGO;

  useEffect(() => {
    const handleScroll = () => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        setScrolled(window.scrollY > 50);
        rafRef.current = null;
      });
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const handleNavClick = (href: string) => {
    setMobileOpen(false);
    if (location.pathname === href) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    navigate(href);
  };

  // invertOnScroll used to slide a separate bar layer down from off-screen.
  // That worked for the dark bar (strong contrast against light pages) but
  // read as a glitch for the light bar (nearly the same color as the page
  // behind it — a barely-visible rectangle "sliding" isn't legible motion).
  // Both variants now use the same plain background crossfade on the nav
  // itself, just with theme-appropriate colors.
  const barColors =
    barTheme === 'light'
      ? { bg: 'rgba(255,255,255,0.55)', shadow: '0 8px 32px rgba(36,48,55,0.1)', border: 'rgba(255,255,255,0.6)' }
      : { bg: 'rgba(10,10,10,0.92)', shadow: '0 4px 30px rgba(0,0,0,0.4)', border: 'rgba(234,88,12,0.12)' };

  // Text/logo color flips the instant `scrolled` becomes true (dark theme
  // only — light theme text stays dark throughout), so it's delayed slightly
  // to avoid a moment of white text on a still-mostly-transparent background.
  const textTransition = invertOnScroll
    ? scrolled && barTheme === 'dark'
      ? 'color 200ms ease 150ms'
      : 'color 150ms ease'
    : 'color 200ms ease';

  // Opening the mobile menu now forces the same "solid" background the bar
  // uses once scrolled. Previously the dropdown panel painted its own
  // separate solid/translucent surface *inside* the nav, so if you opened it
  // before scrolling (nav still transparent, or at a different opacity) you'd
  // see two visibly different shades stacked: the panel's flat color as an
  // inner box, sitting on the nav's own different-opacity background as an
  // outer one. Forcing solid-on-open makes it one continuous surface.
  const solid = scrolled || alwaysSolid || mobileOpen;

  const navStyle: React.CSSProperties = invertOnScroll
    ? solid
      ? {
          background: barColors.bg,
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          boxShadow: barColors.shadow,
          borderBottom: `1px solid ${barColors.border}`,
          transition: 'background 380ms ease, box-shadow 380ms ease, border-color 380ms ease',
        }
      : {
          background: 'transparent',
          boxShadow: '0 4px 24px rgba(0,0,0,0)',
          borderBottom: '1px solid rgba(0,0,0,0)',
          transition: 'background 380ms ease, box-shadow 380ms ease, border-color 380ms ease',
        }
    : solid
    ? isLightPage
      ? {
          background: 'rgba(255,255,255,0.97)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
          transition: 'background 250ms ease, box-shadow 250ms ease',
        }
      : {
          background: 'rgba(10,10,10,0.92)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: '0 4px 30px rgba(0,0,0,0.4)',
          borderBottom: '1px solid rgba(234,88,12,0.12)',
          transition: 'background 250ms ease, box-shadow 250ms ease',
        }
    : isLightPage
    ? {
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
        transition: 'background 250ms ease, box-shadow 250ms ease',
      }
    : {
        background: 'transparent',
        transition: 'background 250ms ease, box-shadow 250ms ease',
      };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 rounded-b-[2rem] sm:rounded-b-[4.5rem] overflow-hidden" style={navStyle}>
      <div className="relative z-10 px-6 lg:px-12 py-5">
        {/* Mobile is a simple two-item row (logo left, hamburger right). The
            three-column grid only kicks in at lg, where all three columns
            actually have content — on mobile it left the logo stranded in the
            middle third with two empty columns around it. */}
        <div className="flex items-center justify-between lg:grid lg:grid-cols-3">
          {/* Left links — Team Portal lives here (not with the right group)
              so both sides carry roughly equal visual weight and the logo
              reads as centered, not just mathematically centered */}
          <div className="hidden lg:flex items-center gap-8 justify-self-start">
            {[
              { label: 'Home', href: '/' },
              { label: 'About Us', href: '/about' },
              { label: 'Portfolio', href: '/portfolio' },
            ].map((link) => (
              <Link
                key={link.href}
                to={link.href}
                onClick={() => {
                  // Link to the current route is a no-op in React Router —
                  // it won't re-trigger the route-change scroll reset, so
                  // clicking "Home" while already on "/" would otherwise do
                  // nothing.
                  if (location.pathname === link.href) window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`text-xs font-medium tracking-wide whitespace-nowrap cursor-pointer relative group font-body ${
                  isLightPage ? 'text-gray-600 hover:text-gray-900' : 'text-gray-300 hover:text-white'
                }`}
                style={{ transition: textTransition }}
              >
                {link.label}
                <span
                  className="absolute -bottom-0.5 left-0 w-0 h-px bg-gradient-brand group-hover:w-full"
                  style={{ transition: 'width 250ms ease' }}
                />
              </Link>
            ))}

            <button
              onClick={() => navigate('/hub/login')}
              className={`text-xs font-medium tracking-wide whitespace-nowrap cursor-pointer relative group font-body flex items-center gap-1.5 ${
                isLightPage ? 'text-gray-600 hover:text-gray-900' : 'text-gray-300 hover:text-white'
              }`}
              style={{ transition: textTransition }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              Team Portal
              <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-gradient-brand group-hover:w-full" style={{ transition: 'width 250ms ease' }} />
            </button>
          </div>

          {/* Centered logo */}
          <Link
            to="/"
            onClick={() => {
              if (location.pathname === '/') window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex-shrink-0 relative z-10 lg:justify-self-center"
          >
            <img src={logoSrc} alt="Huna Creatives" className="h-9 sm:h-11 w-auto" />
          </Link>

          {/* Right links + CTA, and the mobile hamburger */}
          <div className="flex items-center justify-end gap-8 lg:justify-self-end">
            <div className="hidden lg:flex items-center gap-8">
              {[
                { label: 'Services', href: '/services' },
                { label: 'Blog', href: '/blog' },
                { label: 'Careers', href: '/careers' },
              ].map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className={`text-xs font-medium tracking-wide whitespace-nowrap cursor-pointer relative group font-body ${
                    isLightPage ? 'text-gray-600 hover:text-gray-900' : 'text-gray-300 hover:text-white'
                  }`}
                  style={{ transition: textTransition }}
                >
                  {link.label}
                  <span
                    className="absolute -bottom-0.5 left-0 w-0 h-px bg-gradient-brand group-hover:w-full"
                    style={{ transition: 'width 250ms ease' }}
                  />
                </Link>
              ))}

              <Link
                to="/contact"
                className="px-6 py-2.5 rounded-full text-xs font-semibold tracking-wide text-white whitespace-nowrap cursor-pointer font-body"
                style={{
                  background: 'linear-gradient(135deg, #FF5B05, #FF8A47)',
                  boxShadow: '0 8px 24px rgba(255,91,5,0.3)',
                  transition: 'box-shadow 200ms ease, transform 200ms ease',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.transform = 'scale(1.04)';
                  (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 12px 32px rgba(255,91,5,0.45)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.transform = 'scale(1)';
                  (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 8px 24px rgba(255,91,5,0.3)';
                }}
              >
                Contact Us
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="lg:hidden p-2 cursor-pointer flex flex-col gap-1.5 relative z-10"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              <span className={`block w-6 h-0.5 ${isLightPage ? 'bg-gray-900' : 'bg-white'} ${mobileOpen ? 'rotate-45 translate-y-2' : ''}`} style={{ transition: 'transform 250ms ease' }} />
              <span className={`block w-6 h-0.5 ${isLightPage ? 'bg-gray-900' : 'bg-white'} ${mobileOpen ? 'opacity-0' : ''}`} style={{ transition: 'opacity 250ms ease' }} />
              <span className={`block w-6 h-0.5 ${isLightPage ? 'bg-gray-900' : 'bg-white'} ${mobileOpen ? '-rotate-45 -translate-y-2' : ''}`} style={{ transition: 'transform 250ms ease' }} />
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <div
          className="lg:hidden overflow-hidden"
          style={{ maxHeight: mobileOpen ? '24rem' : '0', transition: 'max-height 280ms ease', paddingTop: mobileOpen ? '1rem' : '0', paddingBottom: mobileOpen ? '1rem' : '0' }}
        >
          {/* No background of its own anymore — `solid` above already forces
              the outer nav to its solid/blurred state whenever this is open,
              so the panel just sits directly on that one surface instead of
              painting a second, differently-shaded box on top of it. */}
          <div className="flex flex-col gap-5 p-6">
            {[
              { label: 'Home', href: '/' },
              { label: 'About Us', href: '/about' },
              { label: 'Portfolio', href: '/portfolio' },
              { label: 'Services', href: '/services' },
              { label: 'Blog', href: '/blog' },
              { label: 'Careers', href: '/careers' },
            ].map((link) => (
              <button
                key={link.href}
                onClick={() => handleNavClick(link.href)}
                className={`text-sm font-medium tracking-wide whitespace-nowrap cursor-pointer font-body text-left ${
                  isLightPage ? 'text-[#243037] hover:text-[#FF5B05]' : 'text-gray-200 hover:text-[#FF8A47]'
                }`}
                style={{ transition: 'color 180ms ease' }}
              >
                {link.label}
              </button>
            ))}
            <button
              onClick={() => { setMobileOpen(false); navigate('/hub/login'); }}
              className={`text-sm font-medium tracking-wide whitespace-nowrap cursor-pointer font-body text-left flex items-center gap-2 ${
                isLightPage ? 'text-[#243037] hover:text-[#FF5B05]' : 'text-gray-200 hover:text-[#FF8A47]'
              }`}
              style={{ transition: 'color 180ms ease' }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              Team Portal
            </button>
            <button
              onClick={() => handleNavClick('/contact')}
              className="px-7 py-3 rounded-full text-sm font-bold text-center text-white whitespace-nowrap cursor-pointer font-body mt-2"
              style={{
                background: 'linear-gradient(135deg, #FF5B05, #FF8A47)',
                boxShadow: '0 8px 24px rgba(255,91,5,0.35)',
              }}
            >
              Contact Us
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
