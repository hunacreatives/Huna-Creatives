import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const WHITE_LOGO = '/images/fc04818c74ad69bdfb22b93a6a0c6a72.png';
const BLACK_LOGO = '/images/547b59870e776a20eb28e4f20931787c.png';

const LIGHT_BG_PAGES = ['/about', '/portfolio/email-marketing'];

export default function Navigation() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const rafRef = useRef<number>();
  const navigate = useNavigate();
  const location = useLocation();

  const isLightPage = LIGHT_BG_PAGES.includes(location.pathname);
  const isContactPage = location.pathname === '/contact';
  const logoSrc = isLightPage ? BLACK_LOGO : WHITE_LOGO;

  useEffect(() => {
    const handleScroll = () => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        setScrolled(window.scrollY > 50);
        rafRef.current = undefined;
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
    navigate(href);
  };

  const navStyle: React.CSSProperties = isContactPage
    ? { background: '#000', transition: 'background 250ms ease, box-shadow 250ms ease' }
    : scrolled
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
    <nav className="fixed top-0 left-0 right-0 z-50" style={navStyle}>
      <div className="px-6 lg:px-12 py-5">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <a href="/" className="flex-shrink-0 relative z-10">
            <img src={logoSrc} alt="Huna Creatives" className="h-11 w-auto" />
          </a>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-8">
            {[
              { label: 'Home', href: '/' },
              { label: 'About Us', href: '/about' },
              { label: 'Services', href: '/services' },
              { label: 'Blog', href: '/blog' },
              { label: 'Careers', href: '/careers' },
            ].map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={`text-xs font-medium tracking-wide whitespace-nowrap cursor-pointer relative group font-body ${
                  isLightPage ? 'text-gray-600 hover:text-gray-900' : 'text-gray-300 hover:text-white'
                }`}
                style={{ transition: 'color 200ms ease' }}
              >
                {link.label}
                <span
                  className="absolute -bottom-0.5 left-0 w-0 h-px bg-gradient-brand group-hover:w-full"
                  style={{ transition: 'width 250ms ease' }}
                />
              </a>
            ))}

            <a
              href="/contact"
              className="px-6 py-2.5 rounded-full text-xs font-semibold tracking-wide text-white whitespace-nowrap cursor-pointer font-body"
              style={{
                background: 'linear-gradient(135deg, #ef4444, #f97316, #fb7185)',
                boxShadow: '0 8px 24px rgba(239,68,68,0.35)',
                transition: 'box-shadow 200ms ease, transform 200ms ease',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.transform = 'scale(1.04)';
                (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 12px 32px rgba(239,68,68,0.5)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.transform = 'scale(1)';
                (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 8px 24px rgba(239,68,68,0.35)';
              }}
            >
              Contact Us
            </a>
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

        {/* Mobile Menu */}
        <div
          className="lg:hidden overflow-hidden"
          style={{ maxHeight: mobileOpen ? '24rem' : '0', transition: 'max-height 280ms ease', paddingTop: mobileOpen ? '1rem' : '0', paddingBottom: mobileOpen ? '1rem' : '0' }}
        >
          <div className="flex flex-col gap-5 rounded-2xl p-6" style={{ background: '#111111' }}>
            {[
              { label: 'Home', href: '/' },
              { label: 'About Us', href: '/about' },
              { label: 'Services', href: '/services' },
              { label: 'Blog', href: '/blog' },
              { label: 'Careers', href: '/careers' },
            ].map((link) => (
              <button
                key={link.href}
                onClick={() => handleNavClick(link.href)}
                className="text-sm font-medium tracking-wide text-gray-200 hover:text-orange-400 whitespace-nowrap cursor-pointer font-body text-left"
                style={{ transition: 'color 180ms ease' }}
              >
                {link.label}
              </button>
            ))}
            <button
              onClick={() => handleNavClick('/contact')}
              className="px-7 py-3 rounded-full text-sm font-bold text-center text-white whitespace-nowrap cursor-pointer font-body mt-2"
              style={{
                background: 'linear-gradient(135deg, #ef4444, #f97316, #fb7185)',
                boxShadow: '0 8px 24px rgba(239,68,68,0.4)',
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
