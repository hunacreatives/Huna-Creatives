import { useEffect, useState } from 'react';

interface FooterProps {
  isDark?: boolean;
}

export default function Footer({ isDark = false }: FooterProps) {
  const [currentPath, setCurrentPath] = useState('');

  useEffect(() => {
    setCurrentPath(window.location.pathname);
  }, []);

  const isPortfolioPage = currentPath.startsWith('/portfolio');
  const shouldBeDark = isDark || isPortfolioPage;

  return (
    <footer
      className="relative py-10 md:py-16 px-6 border-t"
      style={{
        background: shouldBeDark ? '#0a0a0a' : '#f8f8f8',
        borderColor: shouldBeDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
      }}
    >
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 mb-8 md:mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <img
              src={shouldBeDark
                ? "https://static.readdy.ai/image/08981d36cd0b73cf08022d4d82071d03/fc04818c74ad69bdfb22b93a6a0c6a72.png"
                : "https://static.readdy.ai/image/08981d36cd0b73cf08022d4d82071d03/547b59870e776a20eb28e4f20931787c.png"
              }
              alt="Huna Creatives"
              className="h-8 md:h-10 w-auto mb-3"
            />
            <p
              className="text-xs leading-relaxed"
              style={{ color: shouldBeDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.5)' }}
            >
              Let&apos;s bring your{' '}
              <em
                className="not-italic font-semibold"
                style={{
                  background: 'linear-gradient(135deg, #f97316, #fb7185)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                hunahuna
              </em>{' '}
              to life.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4
              className="text-xs font-semibold tracking-widest uppercase mb-3"
              style={{ color: shouldBeDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)' }}
            >
              Quick Links
            </h4>
            <ul className="space-y-2">
              {[
                { label: 'Home', href: '/' },
                { label: 'About Us', href: '/about' },
                { label: 'Portfolio', href: '/portfolio' },
                { label: 'Services', href: '/services' },
                { label: 'Blog', href: '/blog' },
                { label: 'Careers', href: '/careers' },
              ].map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-xs transition-colors cursor-pointer hover:text-orange-500"
                    style={{ color: shouldBeDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.5)' }}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4
              className="text-xs font-semibold tracking-widest uppercase mb-3"
              style={{ color: shouldBeDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)' }}
            >
              Services
            </h4>
            <ul className="space-y-2">
              {['Brand Identity', 'Digital Design', 'Content Creation', 'Creative Strategy'].map((service) => (
                <li key={service}>
                  <span
                    className="text-xs"
                    style={{ color: shouldBeDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.5)' }}
                  >
                    {service}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="col-span-2 md:col-span-1">
            <h4
              className="text-xs font-semibold tracking-widest uppercase mb-3"
              style={{ color: shouldBeDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)' }}
            >
              Get In Touch
            </h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="mailto:contact@hunacreatives.com"
                  className="text-xs transition-colors cursor-pointer hover:text-orange-500 break-all"
                  style={{ color: shouldBeDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.5)' }}
                >
                  contact@hunacreatives.com
                </a>
              </li>
              <li>
                <a
                  href="tel:+6325056921"
                  className="text-xs transition-colors cursor-pointer hover:text-orange-500"
                  style={{ color: shouldBeDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.5)' }}
                >
                  (032) 505 6921
                </a>
              </li>
            </ul>

            {/* Social */}
            <div className="flex items-center gap-3 mt-4">
              {[
                { icon: 'ri-facebook-fill', href: 'http://facebook.com/hunacreatives/', label: 'Facebook' },
                { icon: 'ri-instagram-line', href: 'http://instagram.com/hunacreatives/', label: 'Instagram' },
                { icon: 'ri-linkedin-fill', href: 'https://www.linkedin.com/company/huna-creatives/', label: 'LinkedIn' },
              ].map((social) => (
                <a
                  key={social.icon}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer hover:scale-110"
                  style={{
                    background: shouldBeDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                    color: shouldBeDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLAnchorElement;
                    el.style.background = 'rgba(249,115,22,0.15)';
                    el.style.color = '#f97316';
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLAnchorElement;
                    el.style.background = shouldBeDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
                    el.style.color = shouldBeDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
                  }}
                >
                  <i className={`${social.icon} text-xs`} />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div
          className="pt-6 border-t flex flex-col md:flex-row items-center justify-between gap-2"
          style={{
            borderColor: shouldBeDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
          }}
        >
          <p
            className="text-xs"
            style={{ color: shouldBeDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.4)' }}
          >
            &copy; {new Date().getFullYear()} Huna Creatives. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
