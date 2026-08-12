import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

interface FooterProps {
  isDark?: boolean;
  forceLight?: boolean;
  compact?: boolean;
}

const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'About Us', href: '/about' },

  { label: 'Services', href: '/services' },
  { label: 'Blog', href: '/blog' },
  { label: 'Careers', href: '/careers' },
  { label: 'Contact', href: '/contact' },
];

const socials = [
  { icon: 'ri-facebook-fill', href: 'http://facebook.com/hunacreatives/', label: 'Facebook' },
  { icon: 'ri-instagram-line', href: 'http://instagram.com/hunacreatives/', label: 'Instagram' },
  { icon: 'ri-linkedin-fill', href: 'https://www.linkedin.com/company/huna-creatives/', label: 'LinkedIn' },
];

const services = ['Brand Identity', 'Digital Design', 'Content Creation', 'Creative Strategy'];

export default function Footer({ isDark = false, forceLight = false, compact = false }: FooterProps) {
  const [currentPath, setCurrentPath] = useState('');

  useEffect(() => {
    setCurrentPath(window.location.pathname);
  }, []);

  const isPortfolioPage = currentPath.startsWith('/portfolio');
  const shouldBeDark = !forceLight && (isDark || isPortfolioPage);

  const borderColor = shouldBeDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const mutedColor = shouldBeDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.45)';
  const dimColor = shouldBeDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.3)';
  const bg = shouldBeDark ? '#0a0a0a' : '#f8f8f8';
  const logoSrc = shouldBeDark
    ? '/images/fc04818c74ad69bdfb22b93a6a0c6a72.png'
    : '/images/547b59870e776a20eb28e4f20931787c.png';

  if (compact) {
    return (
      <footer className="relative px-6 py-3 border-t flex-shrink-0" style={{ background: bg, borderColor }}>
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-x-8 gap-y-2">
          <Link to="/"><img src={logoSrc} alt="Huna Creatives" className="h-6 w-auto" /></Link>
          <div className="hidden md:flex items-center gap-5">
            {navLinks.slice(1).map((link) => (
              <Link key={link.href} to={link.href}
                className="text-[10px] transition-colors cursor-pointer hover:text-orange-500 whitespace-nowrap"
                style={{ color: mutedColor }}>{link.label}</Link>
            ))}
          </div>
          <div className="flex items-center gap-3">
            {socials.map((s) => (
              <a key={s.icon} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label}
                className="w-6 h-6 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300"
                style={{ color: mutedColor, background: shouldBeDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = '#f97316'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = mutedColor; }}>
                <i className={`${s.icon} text-[10px]`} />
              </a>
            ))}
            <p className="text-[10px] hidden sm:block ml-1" style={{ color: dimColor }}>
              &copy; {new Date().getFullYear()} Huna Creatives
            </p>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer
      className="relative border-t overflow-hidden rounded-t-[2rem] sm:rounded-t-[4.5rem]"
      style={{ background: bg, borderColor }}
    >

      {/* ─── MOBILE layout (hidden on lg+) ─── */}
      <div className="lg:hidden px-6 pt-8 pb-5">
        {/* Logo */}
        <Link to="/" className="inline-block mb-5">
          <img src={logoSrc} alt="Huna Creatives" className="h-7 w-auto" />
        </Link>


        {/* Divider */}
        <div className="h-px mb-5" style={{ background: borderColor }} />

        {/* Contact + socials row */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <a
              href="mailto:contact@hunacreatives.com"
              className={`text-[11px] transition-colors cursor-pointer hover:text-orange-500 ${shouldBeDark ? 'text-white/45' : 'text-black/45'}`}
            >
              contact@hunacreatives.com
            </a>
            <a
              href="tel:+6325056921"
              className={`text-[11px] transition-colors cursor-pointer hover:text-orange-500 ${shouldBeDark ? 'text-white/45' : 'text-black/45'}`}
            >
              (032) 505 6921
            </a>
          </div>
          <div className="flex items-center gap-2">
            {socials.map((s) => (
              <a
                key={s.icon}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                className="w-7 h-7 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300"
                style={{ background: shouldBeDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', color: mutedColor }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.background = 'rgba(249,115,22,0.15)';
                  el.style.color = '#f97316';
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.background = shouldBeDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
                  el.style.color = mutedColor;
                }}
              >
                <i className={`${s.icon} text-xs`} />
              </a>
            ))}
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-5 pt-4 border-t flex flex-col gap-2" style={{ borderColor }}>
          <p className="text-[10px]" style={{ color: dimColor }}>
            &copy; {new Date().getFullYear()} Huna Creatives. All rights reserved.
          </p>
          <div className="flex items-center gap-3">
            <Link to="/privacy" className="text-[10px] hover:text-orange-500 transition-colors" style={{ color: dimColor }}>Privacy Policy</Link>
            <span className="w-0.5 h-0.5 rounded-full" style={{ background: dimColor }} />
            <Link to="/terms" className="text-[10px] hover:text-orange-500 transition-colors" style={{ color: dimColor }}>Terms of Service</Link>
          </div>
        </div>
      </div>

      {/* ─── DESKTOP layout (hidden below lg) ─── */}
      <div className="hidden lg:block px-10">
        {/* Main row */}
        <div className="max-w-7xl mx-auto py-5 flex items-center justify-between gap-6">
          {/* Logo + tagline */}
          <div className="flex items-center gap-4 flex-shrink-0">
            <Link to="/"><img src={logoSrc} alt="Huna Creatives" className="h-7 w-auto" /></Link>
            <span className="hidden xl:block text-[11px] leading-snug" style={{ color: dimColor }}>
              Let&apos;s bring your{' '}
              <em className="not-italic font-semibold" style={{
                background: 'linear-gradient(135deg, #f97316, #fb7185)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>hunahuna</em>{' '}to life.
            </span>
          </div>


          {/* Contact + socials */}
          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="flex flex-col gap-0.5">
              <a href="mailto:contact@hunacreatives.com"
                className={`text-[11px] transition-colors cursor-pointer hover:text-orange-500 whitespace-nowrap ${shouldBeDark ? 'text-white/45' : 'text-black/45'}`}>
                contact@hunacreatives.com
              </a>
              <a href="tel:+6325056921"
                className={`text-[11px] transition-colors cursor-pointer hover:text-orange-500 ${shouldBeDark ? 'text-white/45' : 'text-black/45'}`}>
                (032) 505 6921
              </a>
            </div>
            <div className="w-px h-8 flex-shrink-0" style={{ background: borderColor }} />
            <div className="flex items-center gap-2">
              {socials.map((s) => (
                <a key={s.icon} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label}
                  className="w-7 h-7 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 hover:scale-110"
                  style={{ background: shouldBeDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', color: mutedColor }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLAnchorElement;
                    el.style.background = 'rgba(249,115,22,0.15)';
                    el.style.color = '#f97316';
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLAnchorElement;
                    el.style.background = shouldBeDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
                    el.style.color = mutedColor;
                  }}>
                  <i className={`${s.icon} text-[10px]`} />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="max-w-7xl mx-auto py-3 border-t flex items-center justify-between gap-2" style={{ borderColor }}>
          <p className="text-[10px]" style={{ color: dimColor }}>
            &copy; {new Date().getFullYear()} Huna Creatives. All rights reserved.
          </p>
          <div className="flex items-center gap-3">
            {services.map((s) => (
              <span key={s} className="flex items-center gap-3">
                <span className="text-[10px]" style={{ color: dimColor }}>{s}</span>
                <span className="w-0.5 h-0.5 rounded-full" style={{ background: dimColor }} />
              </span>
            ))}
            <Link to="/privacy" className="text-[10px] hover:text-orange-500 transition-colors" style={{ color: dimColor }}>Privacy Policy</Link>
            <span className="w-0.5 h-0.5 rounded-full" style={{ background: dimColor }} />
            <Link to="/terms" className="text-[10px] hover:text-orange-500 transition-colors" style={{ color: dimColor }}>Terms of Service</Link>
          </div>
        </div>
      </div>

    </footer>
  );
}
