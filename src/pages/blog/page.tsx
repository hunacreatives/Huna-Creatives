
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../../components/feature/Navigation';
import Footer from '../home/components/Footer';
import { blogArticles } from './data';

const CATEGORIES = ['All', 'Brand Identity', 'Web Design', 'Digital Marketing', 'Content Creation', 'Brand Strategy'];

export default function BlogPage() {
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
    <div className="min-h-screen" style={{ background: '#0a0a0a' }}>
      <Navigation />

      {/* Page Header */}
      <section className="pt-36 pb-16 px-6 text-center relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(234,88,12,0.12) 0%, transparent 70%)',
          }}
        />
        <div className="relative z-10 max-w-3xl mx-auto">
          <div
            className="inline-flex items-center gap-2 mb-5 px-4 py-1.5 rounded-full"
            style={{ background: 'rgba(234,88,12,0.1)', border: '1px solid rgba(234,88,12,0.3)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
            <span className="text-[10px] font-medium tracking-[0.2em] uppercase text-orange-300">
              Insights & Ideas
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white leading-tight mb-4 font-display">
            The Huna{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, #ef4444, #f97316, #fb7185)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Journal
            </span>
          </h1>
          <p className="text-sm text-white/50 leading-relaxed max-w-xl mx-auto font-body">
            Strategy, design, and brand-building insights from the Huna Creatives team — written to help you grow a brand that actually means something.
          </p>
        </div>
      </section>

      {/* Category Filter */}
      <section className="px-6 pb-10">
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
                        background: 'linear-gradient(135deg, #ef4444, #f97316)',
                        color: '#fff',
                        boxShadow: '0 4px 16px rgba(234,88,12,0.35)',
                      }
                    : {
                        background: 'rgba(255,255,255,0.05)',
                        color: 'rgba(255,255,255,0.5)',
                        border: '1px solid rgba(255,255,255,0.1)',
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
        <section className="px-6 pb-12">
          <div className="max-w-6xl mx-auto">
            <button
              onClick={() => navigate(`/blog/${featured.slug}`)}
              className="w-full group cursor-pointer text-left"
            >
              <div
                className="relative rounded-2xl overflow-hidden transition-all duration-500 group-hover:scale-[1.01]"
                style={{ border: '1px solid rgba(255,255,255,0.08)' }}
              >
                {/* Hero Image */}
                <div className="relative w-full h-64 md:h-80 lg:h-96 overflow-hidden">
                  <img
                    src={featured.heroImage}
                    alt={featured.title}
                    className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(10,10,10,0.95) 0%, rgba(10,10,10,0.4) 50%, transparent 100%)' }} />
                  {/* Featured Badge */}
                  <div
                    className="absolute top-4 left-4 px-3 py-1 rounded-full text-[10px] font-semibold tracking-widest uppercase text-white"
                    style={{ background: 'linear-gradient(135deg, #ef4444, #f97316)' }}
                  >
                    Featured
                  </div>
                </div>

                {/* Content */}
                <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                  <div className="flex items-center gap-3 mb-3">
                    <span
                      className="text-[10px] font-semibold tracking-widest uppercase px-2.5 py-1 rounded-full"
                      style={{ background: 'rgba(234,88,12,0.2)', color: '#f97316', border: '1px solid rgba(234,88,12,0.3)' }}
                    >
                      {featured.category}
                    </span>
                    <span className="text-[11px] text-white/35">{featured.date}</span>
                    <span className="text-[11px] text-white/35">{featured.readTime}</span>
                  </div>
                  <h2 className="text-xl md:text-2xl lg:text-3xl font-black text-white leading-tight mb-2 font-display group-hover:text-orange-300 transition-colors duration-300">
                    {featured.title}
                  </h2>
                  <p className="text-sm text-white/50 leading-relaxed max-w-2xl font-body line-clamp-2">
                    {featured.excerpt}
                  </p>
                  <div className="flex items-center gap-2 mt-4">
                    <span className="text-xs font-semibold text-orange-400 group-hover:text-orange-300 transition-colors">
                      Read Article
                    </span>
                    <i className="ri-arrow-right-line text-orange-400 text-sm transition-transform duration-300 group-hover:translate-x-1" />
                  </div>
                </div>
              </div>
            </button>
          </div>
        </section>
      )}

      {/* Article Grid */}
      <section className="px-6 pb-20">
        <div className="max-w-6xl mx-auto">
          {filtered.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-white/30 text-sm">No articles in this category yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((article) => (
                <button
                  key={article.slug}
                  onClick={() => navigate(`/blog/${article.slug}`)}
                  className="group cursor-pointer text-left flex flex-col rounded-2xl overflow-hidden transition-all duration-400 hover:scale-[1.02] hover:-translate-y-1"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.07)',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(234,88,12,0.3)';
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 16px 40px rgba(0,0,0,0.4)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.07)';
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
                  }}
                >
                  {/* Image */}
                  <div className="relative w-full h-44 overflow-hidden flex-shrink-0">
                    <img
                      src={article.heroImage}
                      alt={article.title}
                      className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(10,10,10,0.6) 0%, transparent 60%)' }} />
                  </div>

                  {/* Body */}
                  <div className="flex flex-col flex-1 p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <span
                        className="text-[9px] font-semibold tracking-widest uppercase px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(234,88,12,0.15)', color: '#f97316', border: '1px solid rgba(234,88,12,0.25)' }}
                      >
                        {article.category}
                      </span>
                      <span className="text-[10px] text-white/30">{article.readTime}</span>
                    </div>

                    <h3 className="text-sm font-bold text-white leading-snug mb-2 font-display group-hover:text-orange-300 transition-colors duration-300 line-clamp-2">
                      {article.title}
                    </h3>
                    <p className="text-xs text-white/40 leading-relaxed font-body line-clamp-3 flex-1">
                      {article.excerpt}
                    </p>

                    <div className="flex items-center justify-between mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <span className="text-[10px] text-white/30">{article.date}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-semibold text-orange-400">Read</span>
                        <i className="ri-arrow-right-line text-orange-400 text-xs transition-transform duration-300 group-hover:translate-x-0.5" />
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer isDark />
    </div>
  );
}
