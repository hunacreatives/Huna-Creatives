import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const WHITE_LOGO = 'https://static.readdy.ai/image/08981d36cd0b73cf08022d4d82071d03/fc04818c74ad69bdfb22b93a6a0c6a72.png';
const BLACK_LOGO = 'https://static.readdy.ai/image/08981d36cd0b73cf08022d4d82071d03/547b59870e776a20eb28e4f20931787c.png';

// Pages with light/white backgrounds — use black logo
const LIGHT_BG_PAGES = ['/about', '/portfolio/email-marketing'];

export default function Navigation() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const isLightPage = LIGHT_BG_PAGES.includes(location.pathname);
  const isContactPage = location.pathname === '/contact';
  const logoSrc = isLightPage ? BLACK_LOGO : WHITE_LOGO;

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (href: string) => {
    setMobileOpen(false);
    navigate(href);
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isContactPage
          ? 'bg-black shadow-lg'
          : scrolled
          ? isLightPage
            ? 'bg-white/95 backdrop-blur-md shadow-lg'
            : 'glass-dark-strong shadow-2xl'
          : isLightPage
          ? 'bg-white/95 backdrop-blur-sm shadow-sm'
          : 'bg-black/80 backdrop-blur-sm lg:bg-transparent lg:backdrop-blur-none'
      }`}
    >
      <div className="px-6 lg:px-12 py-5">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <a href="/" className="flex-shrink-0 relative z-10">
            <img
              src={logoSrc}
              alt="Huna Creatives"
              className="h-11 w-auto"
            />
          </a>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-8">
            {[
              { label: 'Home', href: '/' },
              { label: 'About Us', href: '/about' },
              { label: 'Portfolio', href: '/portfolio' },
              { label: 'Services', href: '/services' },
              { label: 'Blog', href: '/blog' },
              { label: 'Careers', href: '/careers' },
            ].map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={`text-xs font-medium tracking-wide transition-all duration-300 whitespace-nowrap cursor-pointer relative group font-body ${
                  isLightPage
                    ? 'text-gray-600 hover:text-transparent hover:bg-gradient-brand hover:bg-clip-text'
                    : 'text-gray-300 hover:text-transparent hover:bg-gradient-brand hover:bg-clip-text'
                }`}
              >
                {link.label}
                <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-gradient-brand group-hover:w-full transition-all duration-300" />
              </a>
            ))}

            <a
              href="/contact"
              className="px-6 py-2.5 rounded-full text-xs font-semibold tracking-wide text-white transition-all duration-300 whitespace-nowrap cursor-pointer hover:scale-105 hover:shadow-2xl font-body"
              style={{
                background: 'linear-gradient(135deg, #ef4444, #f97316, #fb7185)',
                boxShadow: '0 8px 24px rgba(239, 68, 68, 0.4)',
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
            <span
              className={`block w-6 h-0.5 transition-all duration-300 ${
                isLightPage ? 'bg-gray-900' : 'bg-white'
              } ${mobileOpen ? 'rotate-45 translate-y-2' : ''}`}
            />
            <span
              className={`block w-6 h-0.5 transition-all duration-300 ${
                isLightPage ? 'bg-gray-900' : 'bg-white'
              } ${mobileOpen ? 'opacity-0' : ''}`}
            />
            <span
              className={`block w-6 h-0.5 transition-all duration-300 ${
                isLightPage ? 'bg-gray-900' : 'bg-white'
              } ${mobileOpen ? '-rotate-45 -translate-y-2' : ''}`}
            />
          </button>
        </div>

        {/* Mobile Menu */}
        <div
          className={`lg:hidden overflow-hidden transition-all duration-300 ${
            mobileOpen ? 'max-h-96 pt-4 pb-4' : 'max-h-0'
          }`}
        >
          <div className="flex flex-col gap-5 rounded-2xl p-6" style={{ background: '#111111' }}>
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
                className="text-sm font-medium tracking-wide text-gray-200 hover:text-orange-400 transition-all whitespace-nowrap cursor-pointer font-body text-left"
              >
                {link.label}
              </button>
            ))}
            <button
              onClick={() => handleNavClick('/contact')}
              className="px-7 py-3 rounded-full text-sm font-bold text-center text-white whitespace-nowrap cursor-pointer font-body mt-2"
              style={{
                background: 'linear-gradient(135deg, #ef4444, #f97316, #fb7185)',
                boxShadow: '0 8px 24px rgba(239, 68, 68, 0.4)',
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
