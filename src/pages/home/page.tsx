import { useState, useEffect } from 'react';
import Hero from './components/Hero';
import Footer from './components/Footer';

export default function HomePage() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 60);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Home', href: '/' },
    { label: 'About Us', href: '/about' },
    { label: 'Portfolio', href: '/portfolio' },
    { label: 'Services', href: '/services' },
    { label: 'Blog', href: '/blog' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Navigation */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
        style={
          isScrolled
            ? {
                background: 'rgba(10,10,10,0.92)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                borderBottom: '1px solid rgba(234,88,12,0.15)',
                boxShadow: '0 4px 30px rgba(0,0,0,0.4)',
              }
            : {
                background: 'rgba(0,0,0,0.15)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }
        }
      >
        <div className="px-6 lg:px-12 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <a href="/" className="flex-shrink-0">
              <img
                src="https://static.readdy.ai/image/08981d36cd0b73cf08022d4d82071d03/fc04818c74ad69bdfb22b93a6a0c6a72.png"
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

      {/* Footer */}
      <Footer isDark />
    </div>
  );
}
