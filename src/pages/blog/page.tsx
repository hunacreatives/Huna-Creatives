
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../../components/feature/Navigation';
import Footer from '../home/components/Footer';
import { blogArticles } from './data';
import { useSEO } from '../../hooks/useSEO';

const CATEGORIES = ['All', 'Brand Identity', 'Web Design', 'Digital Marketing', 'Content Creation', 'Brand Strategy'];

export default function BlogPage() {
  useSEO({
    title: 'Creative Journal — Brand Strategy & Design Insights',
    description:
      'Strategy-led articles on branding, social media content, and visual design for growth-focused business owners. By the team at Huna Creatives.',
    canonical: '/blog',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'Blog',
      '@id': 'https://www.hunacreatives.com/blog/#blog',
      url: 'https://www.hunacreatives.com/blog',
      name: 'Huna Creative Journal',
      description: 'Strategy-led articles on branding, social media content, and visual design.',
      publisher: { '@id': 'https://www.hunacreatives.com/#organization' },
    },
  });

  const [activeCategory, setActiveCategory] = useState('All');
  const navigate = useNavigate();

  const featured = blogArticles[0];
  const rest = blogArticles.slice(1);

  const filtered =
    activeCategory === 'All'
      ? rest
      : rest.filter((a) => a.category === activeCategory);

  const featuredVisible =
    activeCategory === 'All' || featured.category === activeCategory;

  return (
    <div className="min-h-screen font-body" style={{ background: '#F5F5F5' }}>
      <Navigation invertOnScroll barTheme="light" />

      {/* Same continuous orb field as the rest of the site */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div
          className="absolute top-[-15%] -left-[15%] w-[900px] h-[900px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(255,91,5,0.16), transparent 72%)', filter: 'blur(70px)', animation: 'orb-float-a 22s ease-in-out infinite' }}
        />
        <div
          className="absolute top-[6%] -right-[15%] w-[820px] h-[820px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(7,80,86,0.4), transparent 72%)', filter: 'blur(70px)', animation: 'orb-float-b 26s ease-in-out infinite' }}
        />
        <div
          className="absolute top-[55%] left-[30%] w-[620px] h-[620px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(211,221,222,0.5), transparent 72%)', filter: 'blur(70px)', animation: 'orb-float-c 20s ease-in-out infinite' }}
        />
        <div
          className="absolute top-[75%] -left-[10%] w-[760px] h-[760px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(7,80,86,0.32), transparent 72%)', filter: 'blur(70px)', animation: 'orb-float-c 24s ease-in-out infinite' }}
        />
      </div>

      {/* Page Header */}
      <section className="relative z-10 pt-24 sm:pt-28 pb-12 px-4 sm:px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <span className="inline-block text-[10px] font-semibold tracking-[0.25em] uppercase text-[#075056] mb-4">
            Insights &amp; Ideas
          </span>
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold font-display leading-tight text-[#243037] mb-4">
            The Huna Journal
          </h1>
          <p className="text-sm text-[#243037]/55 leading-relaxed max-w-xl mx-auto font-body">
            Strategy, design, and brand-building insights from the Huna Creatives team — written to help you grow a brand that actually means something.
          </p>
        </div>
      </section>

      {/* Category Filter */}
      <section className="relative z-10 px-4 sm:px-6 pb-10">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap items-center gap-2 justify-center">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className="px-4 py-1.5 rounded-full text-[11px] font-medium tracking-wide transition-all duration-300 whitespace-nowrap cursor-pointer"
                style={
                  activeCategory === cat
                    ? {
                        background: 'linear-gradient(135deg, #FF5B05, #FF8A47)',
                        color: '#fff',
                        boxShadow: '0 8px 24px rgba(255,91,5,0.3)',
                      }
                    : {
                        background: 'rgba(255,255,255,0.6)',
                        backdropFilter: 'blur(20px) saturate(160%)',
                        WebkitBackdropFilter: 'blur(20px) saturate(160%)',
                        color: 'rgba(36,48,55,0.6)',
                        border: '1px solid rgba(255,255,255,0.6)',
                      }
                }
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Article */}
      {featuredVisible && (
        <section className="relative z-10 px-4 sm:px-6 pb-12">
          <div className="max-w-6xl mx-auto">
            <button
              onClick={() => navigate(`/blog/${featured.slug}`)}
              className="w-full group cursor-pointer text-left"
            >
              <div
                className="relative rounded-2xl overflow-hidden transition-all duration-500 group-hover:scale-[1.01]"
                style={{ border: '1px solid rgba(255,255,255,0.7)', boxShadow: '0 10px 28px rgba(36,48,55,0.18)' }}
              >
                {/* Hero Image */}
                <div className="relative w-full h-64 md:h-80 lg:h-96 overflow-hidden">
                  <img
                    src={featured.heroImage}
                    alt={featured.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    style={{ objectPosition: featured.heroImagePosition ?? 'center top' }}
                  />
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(36,48,55,0.92) 0%, rgba(36,48,55,0.45) 55%, transparent 100%)' }} />
                  {/* Featured Badge */}
                  <div
                    className="absolute top-4 left-4 px-3 py-1 rounded-full text-[10px] font-semibold tracking-widest uppercase text-white"
                    style={{ background: 'linear-gradient(135deg, #FF5B05, #FF8A47)' }}
                  >
                    Featured
                  </div>
                </div>

                {/* Content */}
                <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                  <div className="flex items-center gap-3 mb-3">
                    <span
                      className="text-[10px] font-semibold tracking-widest uppercase px-2.5 py-1 rounded-full"
                      style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.35)' }}
                    >
                      {featured.category}
                    </span>
                    <span className="text-[11px] text-white/35">{featured.date}</span>
                    <span className="text-[11px] text-white/35">{featured.readTime}</span>
                  </div>
                  <h2 className="text-xl md:text-2xl lg:text-3xl font-black text-white leading-tight mb-2 font-display group-hover:text-[#FF8A47] transition-colors duration-300">
                    {featured.title}
                  </h2>
                  <p className="text-sm text-white/50 leading-relaxed max-w-2xl font-body line-clamp-2">
                    {featured.excerpt}
                  </p>
                  <div className="flex items-center gap-2 mt-4">
                    <span className="text-xs font-semibold text-[#FF8A47] group-hover:text-white transition-colors">
                      Read Article
                    </span>
                    <i className="ri-arrow-right-line text-[#FF8A47] text-sm transition-transform duration-300 group-hover:translate-x-1" />
                  </div>
                </div>
              </div>
            </button>
          </div>
        </section>
      )}

      {/* Article Grid */}
      <section className="relative z-10 px-4 sm:px-6 pb-20">
        <div className="max-w-6xl mx-auto">
          {filtered.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-[#243037]/45 text-sm">No articles in this category yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((article) => (
                <button
                  key={article.slug}
                  onClick={() => navigate(`/blog/${article.slug}`)}
                  className="group cursor-pointer text-left flex flex-col rounded-2xl overflow-hidden transition-all duration-400 hover:scale-[1.02] hover:-translate-y-1"
                  style={{
                    background: 'rgba(255,255,255,0.65)',
                    backdropFilter: 'blur(20px) saturate(160%)',
                    WebkitBackdropFilter: 'blur(20px) saturate(160%)',
                    border: '1px solid rgba(255,255,255,0.7)',
                    boxShadow: '0 10px 28px rgba(36,48,55,0.12)',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,91,5,0.35)';
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 18px 40px rgba(36,48,55,0.18)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.7)';
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 10px 28px rgba(36,48,55,0.12)';
                  }}
                >
                  {/* Image */}
                  <div className="relative w-full h-44 overflow-hidden flex-shrink-0">
                    <img
                      src={article.heroImage}
                      alt={article.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      style={{ objectPosition: article.heroImagePosition ?? 'center top' }}
                    />
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(36,48,55,0.35) 0%, transparent 60%)' }} />
                  </div>

                  {/* Body */}
                  <div className="flex flex-col flex-1 p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <span
                        className="text-[9px] font-semibold tracking-widest uppercase px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(255,91,5,0.12)', color: '#FF5B05', border: '1px solid rgba(255,91,5,0.25)' }}
                      >
                        {article.category}
                      </span>
                      <span className="text-[10px] text-[#243037]/45">{article.readTime}</span>
                    </div>

                    <h3 className="text-sm font-bold text-[#243037] leading-snug mb-2 font-display group-hover:text-[#FF5B05] transition-colors duration-300 line-clamp-2">
                      {article.title}
                    </h3>
                    <p className="text-xs text-[#243037]/55 leading-relaxed font-body line-clamp-3 flex-1">
                      {article.excerpt}
                    </p>

                    <div className="flex items-center justify-between mt-4 pt-4" style={{ borderTop: '1px solid rgba(36,48,55,0.08)' }}>
                      <span className="text-[10px] text-[#243037]/45">{article.date}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-semibold text-[#FF5B05]">Read</span>
                        <i className="ri-arrow-right-line text-[#FF5B05] text-xs transition-transform duration-300 group-hover:translate-x-0.5" />
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
