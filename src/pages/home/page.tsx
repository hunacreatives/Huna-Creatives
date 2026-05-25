import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Hero from './components/Hero';
import Footer from './components/Footer';
import { useSEO } from '../../hooks/useSEO';

export default function HomePage() {
  const navigate = useNavigate();

  useSEO({
    title: 'Huna Creatives — Premium Creative Agency in Cebu, Philippines',
    description:
      'Strategy-led branding, social media content creation, and visual design for growth-focused brands. Based in Cebu, Philippines — serving clients globally.',
    canonical: '/',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      '@id': 'https://www.hunacreatives.com/#webpage',
      url: 'https://www.hunacreatives.com',
      name: 'Huna Creatives — Premium Creative Agency in Cebu, Philippines',
      isPartOf: { '@id': 'https://www.hunacreatives.com/#website' },
      about: { '@id': 'https://www.hunacreatives.com/#organization' },
    },
  });

  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const rafRef = useRef<number>();

  useEffect(() => {
    const handleScroll = () => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        setIsScrolled(window.scrollY > 60);
        rafRef.current = undefined;
      });
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);


  const navLinks = [
    { label: 'Home', href: '/' },
    { label: 'About Us', href: '/about' },
    { label: 'Portfolio', href: '/portfolio' },
    { label: 'Services', href: '/services' },
    { label: 'Blog', href: '/blog' },
    { label: 'Careers', href: '/careers' },
  ];

  const navScrolledStyle: React.CSSProperties = {
    background: 'rgba(10,10,10,0.92)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    borderBottom: '1px solid rgba(234,88,12,0.15)',
    boxShadow: '0 4px 30px rgba(0,0,0,0.4)',
  };

  const navTopStyle: React.CSSProperties = {
    background: 'rgba(0,0,0,0.15)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Navigation */}
      <nav
        className="fixed top-0 left-0 right-0 z-50"
        style={{
          ...(isScrolled ? navScrolledStyle : navTopStyle),
          transition: 'background 250ms ease, box-shadow 250ms ease, border-color 250ms ease',
        }}
      >
        <div className="px-6 lg:px-12 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <a href="/" className="flex-shrink-0">
              <img
                src="/images/fc04818c74ad69bdfb22b93a6a0c6a72.png"
                alt="Huna Creatives"
                className="h-11 w-auto transition-all duration-300"
              />
            </a>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-8">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-xs font-medium tracking-wide transition-all duration-300 whitespace-nowrap cursor-pointer relative group text-white/70 hover:text-white"
                >
                  {link.label}
                  <span className="absolute -bottom-0.5 left-0 w-0 h-px group-hover:w-full transition-all duration-300 bg-gradient-to-r from-orange-500 to-pink-400" />
                </a>
              ))}

              {/* Team Portal */}
              <button
                onClick={() => navigate('/hub/login')}
                className="text-xs font-medium tracking-wide whitespace-nowrap cursor-pointer relative group text-white/70 hover:text-white flex items-center gap-1.5"
                style={{ transition: 'color 200ms ease' }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                Team Portal
                <span className="absolute -bottom-0.5 left-0 w-0 h-px group-hover:w-full transition-all duration-300 bg-gradient-to-r from-orange-500 to-pink-400" />
              </button>

              {/* Contact CTA */}
              <a
                href="/contact"
                className="px-6 py-2.5 rounded-full text-xs font-semibold tracking-wide transition-all duration-300 whitespace-nowrap cursor-pointer hover:scale-105 text-white"
                style={{
                  background: 'linear-gradient(135deg, #ef4444, #f97316)',
                  boxShadow: '0 4px 20px rgba(234,88,12,0.35)',
                }}
              >
                Contact Us
              </a>
            </div>

            {/* Mobile Menu Button */}
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

          {/* Mobile Menu */}
          <div
            className={`lg:hidden overflow-hidden transition-all duration-400 ${
              mobileOpen ? 'max-h-96 pt-4 pb-4' : 'max-h-0'
            }`}
          >
            <div className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium tracking-wide text-white/70 hover:text-white transition-colors whitespace-nowrap cursor-pointer"
                >
                  {link.label}
                </a>
              ))}
              <button
                onClick={() => navigate('/hub/login')}
                className="text-sm font-medium tracking-wide text-white/70 hover:text-white transition-colors whitespace-nowrap cursor-pointer text-left flex items-center gap-2"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                Team Portal
              </button>
              <a
                href="/contact"
                className="px-6 py-2.5 rounded-full text-xs font-semibold text-center whitespace-nowrap cursor-pointer text-white transition-all"
                style={{
                  background: 'linear-gradient(135deg, #ef4444, #f97316)',
                  boxShadow: '0 4px 16px rgba(234,88,12,0.3)',
                }}
              >
                Contact Us
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <Hero />

      {/* ── Sentro OS subtle nudge ── */}
      <div className="relative z-10 px-6 py-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500 text-center sm:text-left">
            Need an internal ops hub for your team?{' '}
            <span className="text-gray-400">We built one — attendance, payroll, docs & more.</span>
          </p>
          <a href="/sentro"
            className="flex-shrink-0 text-sm font-semibold text-[#FF6B35] hover:text-white transition-colors whitespace-nowrap">
            See Sentro OS →
          </a>
        </div>
      </div>

      {/* Footer */}
      <Footer isDark />

    </div>
  );
}
