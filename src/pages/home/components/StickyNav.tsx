import { Link, useNavigate } from 'react-router-dom';

const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'About Us', href: '/about' },
  { label: 'Portfolio', href: '/portfolio' },
  { label: 'Services', href: '/services' },
  { label: 'Blog', href: '/blog' },
  { label: 'Careers', href: '/careers' },
];

// Slim light-style nav that fades in once the hero card has scrolled out of
// view — the hero carries its own embedded nav, so this only needs to cover
// the rest of the (white) page.
export default function StickyNav({ visible }: { visible: boolean }) {
  const navigate = useNavigate();

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-2 pointer-events-none'
      }`}
      style={{
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        borderBottom: '1px solid rgba(48,50,54,0.08)',
        boxShadow: '0 4px 20px rgba(48,50,54,0.06)',
      }}
    >
      <div className="px-6 lg:px-12 py-3.5 flex items-center justify-between">
        <Link
          to="/"
          onClick={() => {
            if (window.location.pathname === '/') window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="flex-shrink-0"
        >
          <img src="/images/547b59870e776a20eb28e4f20931787c.png" alt="Huna Creatives" className="h-9 w-auto" />
        </Link>

        <div className="hidden lg:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              onClick={() => {
                // Link to the current route is a no-op in React Router, so
                // clicking "Home" while already on "/" (with the hero
                // scrolled past) would otherwise do nothing.
                if (window.location.pathname === link.href) window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="text-xs font-medium tracking-wide text-gray-600 hover:text-gray-900 transition-colors whitespace-nowrap cursor-pointer relative group"
            >
              {link.label}
              <span className="absolute -bottom-0.5 left-0 w-0 h-px group-hover:w-full transition-all duration-300 bg-[#A0C9CB]" />
            </Link>
          ))}
          <button
            onClick={() => navigate('/hub/login')}
            className="text-xs font-medium tracking-wide text-gray-600 hover:text-gray-900 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            Team Portal
          </button>
          <Link
            to="/contact"
            className="px-6 py-2.5 rounded-full text-xs font-semibold tracking-wide transition-all duration-300 whitespace-nowrap cursor-pointer hover:scale-105 text-white"
            style={{ background: 'linear-gradient(135deg, #E65416, #F06B33)', boxShadow: '0 4px 20px rgba(230,84,22,0.35)' }}
          >
            Contact Us
          </Link>
        </div>
      </div>
    </nav>
  );
}
