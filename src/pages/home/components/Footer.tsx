import { useEffect, useState } from 'react';

interface FooterProps {
  isDark?: boolean;
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

export default function Footer({ isDark = false, compact = false }: FooterProps) {
  const [currentPath, setCurrentPath] = useState('');

  useEffect(() => {
    setCurrentPath(window.location.pathname);
  }, []);

  const isPortfolioPage = currentPath.startsWith('/portfolio');
  const shouldBeDark = isDark || isPortfolioPage;

  const borderColor = shouldBeDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const mutedColor = shouldBeDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.45)';
  const dimColor = shouldBeDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.3)';
  const bg = shouldBeDark ? '#0a0a0a' : '#f8f8f8';
  const logoSrc = shouldBeDark
    ? 'https://static.readdy.ai/image/08981d36cd0b73cf08022d4d82071d03/fc04818c74ad69bdfb22b93a6a0c6a72.png'
    : 'https://static.readdy.ai/image/08981d36cd0b73cf08022d4d82071d03/547b59870e776a20eb28e4f20931787c.png';

  if (compact) {
    return (
      <footer className="relative px-6 py-3 border-t flex-shrink-0" style={{ background: bg, borderColor }}>
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-x-8 gap-y-2">
          <a href="/"><img src={logoSrc} alt="Huna Creatives" className="h-6 w-auto" /></a>
          <div className="hidden md:flex items-center gap-5">
            {navLinks.slice(1).map((link) => (
              <a key={link.href} href={link.href}
                className="text-[10px] transition-colors cursor-pointer hover:text-orange-500 whitespace-nowrap"
                style={{ color: mutedColor }}>{link.label}</a>
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
    <footer className="relative border-t" style={{ background: bg, borderColor }}>

      {/* ─── MOBILE layout (hidden on lg+) ─── */}
      <div className="lg:hidden px-6 pt-8 pb-5">
        {/* Logo */}
        <a href="/" className="inline-block mb-5">
          <img src={logoSrc} alt="Huna Creatives" className="h-7 w-auto" />
        </a>

        {/* Nav grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 mb-6">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={`text-xs font-medium transition-colors cursor-pointer hover:text-orange-500 ${shouldBeDark ? 'text-white/50' : 'text-black/50'}`}
            >
              {link.label}
            </a>
          ))}
        </div>

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
        <div className="mt-5 pt-4 border-t" style={{ borderColor }}>
          <p className="text-[10px]" style={{ color: dimColor }}>
            &copy; {new Date().getFullYear()} Huna Creatives. All rights reserved.
          </p>
        </div>
      </div>

      {/* ─── DESKTOP layout (hidden below lg) ─── */}
      <div className="hidden lg:block px-10">
        {/* Main row */}
        <div className="max-w-7xl mx-auto py-5 flex items-center justify-between gap-6">
          {/* Logo + tagline */}
          <div className="flex items-center gap-4 flex-shrink-0">
            <a href="/"><img src={logoSrc} alt="Huna Creatives" className="h-7 w-auto" /></a>
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

          {/* Nav links */}
          <nav className="flex items-center gap-5">
            {navLinks.map((link, i) => (
              <span key={link.href} className="flex items-center gap-5">
                <a
                  href={link.href}
                  className={`text-[11px] font-medium whitespace-nowrap transition-colors cursor-pointer hover:text-orange-500 ${shouldBeDark ? 'text-white/45' : 'text-black/45'}`}
                >
                  {link.label}
                </a>
                {i < navLinks.length - 1 && (
                  <span className="w-px h-3 flex-shrink-0" style={{ background: borderColor }} />
                )}
              </span>
            ))}
          </nav>

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
            {services.map((s, i) => (
              <span key={s} className="flex items-center gap-3">
                <span className="text-[10px]" style={{ color: dimColor }}>{s}</span>
                {i < services.length - 1 && (
                  <span className="w-0.5 h-0.5 rounded-full" style={{ background: dimColor }} />
                )}
              </span>
            ))}
          </div>
        </div>
      </div>

    </footer>
  );
}
