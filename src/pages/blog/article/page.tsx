import { useParams, Link } from 'react-router-dom';
import { useEffect } from 'react';
import Navigation from '../../../components/feature/Navigation';
import Footer from '../../home/components/Footer';
import { getBlogArticle, blogArticles } from '../data';

const CategoryBadge = ({ category }: { category: string }) => (
  <span
    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold tracking-widest uppercase"
    style={{
      background: 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(249,115,22,0.1))',
      border: '1px solid rgba(249,115,22,0.25)',
      color: '#f97316',
    }}
  >
    {category}
  </span>
);

const ArticlePage = () => {
  const { slug } = useParams<{ slug: string }>();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  const article = getBlogArticle(slug ?? '');

  useEffect(() => {
    if (!article) return;

    // Title
    document.title = `${article.title} | Huna Creatives`;

    // Helper to upsert a <meta> tag
    const setMeta = (selector: string, attr: string, value: string) => {
      let el = document.querySelector<HTMLMetaElement>(selector);
      if (!el) {
        el = document.createElement('meta');
        document.head.appendChild(el);
      }
      el.setAttribute(attr, value);
    };

    setMeta('meta[name="description"]', 'content', article.seo.description);
    setMeta('meta[name="keywords"]', 'content', article.seo.keywords.join(', '));
    setMeta('meta[name="description"]', 'name', 'description');
    setMeta('meta[name="keywords"]', 'name', 'keywords');

    // Open Graph
    setMeta('meta[property="og:title"]', 'content', `${article.title} | Huna Creatives`);
    setMeta('meta[property="og:title"]', 'property', 'og:title');
    setMeta('meta[property="og:description"]', 'content', article.seo.description);
    setMeta('meta[property="og:description"]', 'property', 'og:description');
    setMeta('meta[property="og:image"]', 'content', article.heroImage);
    setMeta('meta[property="og:image"]', 'property', 'og:image');
    setMeta('meta[property="og:type"]', 'content', 'article');
    setMeta('meta[property="og:type"]', 'property', 'og:type');

    // Twitter Card
    setMeta('meta[name="twitter:card"]', 'content', 'summary_large_image');
    setMeta('meta[name="twitter:card"]', 'name', 'twitter:card');
    setMeta('meta[name="twitter:title"]', 'content', `${article.title} | Huna Creatives`);
    setMeta('meta[name="twitter:title"]', 'name', 'twitter:title');
    setMeta('meta[name="twitter:description"]', 'content', article.seo.description);
    setMeta('meta[name="twitter:description"]', 'name', 'twitter:description');

    // JSON-LD structured data
    const existingScript = document.querySelector('script[data-blog-jsonld]');
    if (existingScript) existingScript.remove();

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-blog-jsonld', 'true');
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: article.title,
      description: article.seo.description,
      image: article.heroImage,
      datePublished: article.date,
      author: {
        '@type': 'Organization',
        name: 'Huna Creatives',
        url: 'https://hunacreatives.com',
      },
      publisher: {
        '@type': 'Organization',
        name: 'Huna Creatives',
        logo: {
          '@type': 'ImageObject',
          url: 'https://hunacreatives.com/logo.png',
        },
      },
      keywords: article.seo.keywords.join(', '),
      inLanguage: 'en-PH',
      locationCreated: {
        '@type': 'Place',
        name: 'Cebu City, Philippines',
      },
    });
    document.head.appendChild(script);

    return () => {
      document.title = 'Huna Creatives';
      const s = document.querySelector('script[data-blog-jsonld]');
      if (s) s.remove();
    };
  }, [article]);

  if (!article) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <Navigation />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center px-4">
            <h2 className="text-xl font-bold text-white mb-4 font-display">
              Article not found
            </h2>
            <Link
              to="/blog"
              className="text-orange-500 hover:text-orange-400 font-medium text-sm"
            >
              &larr; Back to Blog
            </Link>
          </div>
        </div>
        <Footer isDark />
      </div>
    );
  }

  const related = blogArticles
    .filter((a) => article.relatedSlugs.includes(a.slug))
    .slice(0, 2);

  return (
    <div className="min-h-screen bg-[#0a0a0a] font-body">
      <Navigation />

      <main>
        {/* Hero */}
        <section className="relative pt-28 md:pt-36 pb-0 px-4 md:px-6 bg-[#0a0a0a]">
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[1px]"
            style={{
              background:
                'linear-gradient(90deg, transparent, rgba(249,115,22,0.4), transparent)',
            }}
          />
          <div className="max-w-4xl mx-auto">
            <Link
              to="/blog"
              className="inline-flex items-center gap-2 text-white/40 hover:text-orange-500 transition-colors mb-8 group text-sm"
            >
              <i className="ri-arrow-left-line text-base group-hover:-translate-x-1 transition-transform" />
              <span className="font-medium whitespace-nowrap tracking-wide">
                Back to Blog
              </span>
            </Link>

            <div className="mb-5 flex items-center gap-3 flex-wrap">
              <CategoryBadge category={article.category} />
              <span className="text-white/30 text-xs">{article.date}</span>
              <span className="text-white/20 text-xs">·</span>
              <span className="text-white/30 text-xs">{article.readTime}</span>
            </div>

            <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-[1.1] mb-6">
              {article.title}
            </h1>

            <p className="text-white/50 text-base leading-relaxed mb-6 max-w-2xl">
              {article.excerpt}
            </p>

            {/* SEO Summary Card */}
            <div
              className="mb-8 px-4 py-3 rounded-lg flex items-start gap-3"
              style={{
                background: 'rgba(249,115,22,0.06)',
                border: '1px solid rgba(249,115,22,0.15)',
              }}
            >
              <i className="ri-file-text-line text-orange-500/70 text-sm mt-0.5 flex-shrink-0" />
              <p className="text-white/40 text-xs leading-relaxed">
                {article.seo.description}
              </p>
            </div>

            {/* Author */}
            <div
              className="flex items-center gap-3 pb-10 border-b"
              style={{ borderColor: 'rgba(255,255,255,0.07)' }}
            >
              <div
                className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0"
                style={{ border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <img
                  src={article.author.avatar}
                  alt={article.author.name}
                  className="w-full h-full object-cover object-top"
                />
              </div>
              <div>
                <div className="text-sm font-semibold text-white">
                  {article.author.name}
                </div>
                <div className="text-xs text-white/35">
                  {article.author.role}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Hero Image */}
        <section className="px-4 md:px-6 py-8">
          <div className="max-w-4xl mx-auto">
            <div
              className="w-full h-[240px] md:h-[360px] lg:h-[480px] rounded-xl md:rounded-2xl overflow-hidden"
              style={{ border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <img
                src={article.heroImage}
                alt={article.title}
                className="w-full h-full object-cover object-top"
              />
            </div>
          </div>
        </section>

        {/* Article Body */}
        <section className="px-4 md:px-6 pb-16 md:pb-24">
          <div className="max-w-4xl mx-auto">
            <div className="grid lg:grid-cols-[1fr_280px] gap-12 lg:gap-16 items-start">
              {/* Content */}
              <article className="prose-custom">
                {article.body.map((block, i) => {
                  if (block.type === 'heading') {
                    return (
                      <h2
                        key={i}
                        className="font-display text-xl md:text-2xl font-bold text-white mt-10 mb-4 leading-snug"
                      >
                        {block.content}
                      </h2>
                    );
                  }
                  if (block.type === 'paragraph') {
                    return (
                      <p
                        key={i}
                        className="text-white/55 text-sm md:text-base leading-relaxed mb-5"
                      >
                        {block.content}
                      </p>
                    );
                  }
                  if (block.type === 'quote') {
                    return (
                      <blockquote
                        key={i}
                        className="my-8 pl-5 relative"
                        style={{ borderLeft: '3px solid #f97316' }}
                      >
                        <p className="text-white/70 text-base md:text-lg font-medium leading-relaxed italic font-display">
                          &ldquo;{block.content}&rdquo;
                        </p>
                      </blockquote>
                    );
                  }
                  if (block.type === 'list' && block.items) {
                    return (
                      <div key={i} className="my-6">
                        <p className="text-white/55 text-sm mb-3 font-medium">
                          {block.content}
                        </p>
                        <ul className="space-y-2.5">
                          {block.items.map((item, j) => (
                            <li key={j} className="flex items-start gap-3">
                              <span
                                className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0"
                                style={{ background: '#f97316' }}
                              />
                              <span className="text-white/55 text-sm leading-relaxed">
                                {item}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  }
                  return null;
                })}

                {/* Keywords footer */}
                <div
                  className="mt-10 pt-6 border-t"
                  style={{ borderColor: 'rgba(255,255,255,0.07)' }}
                >
                  <p className="text-[10px] font-semibold tracking-widest uppercase text-white/25 mb-3">
                    Topics
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {article.seo.keywords.map((kw) => (
                      <span
                        key={kw}
                        className="px-2.5 py-1 rounded-full text-[10px] font-medium text-white/35"
                        style={{
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.08)',
                        }}
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              </article>

              {/* Sidebar */}
              <aside className="hidden lg:block sticky top-28 space-y-6">
                {/* CTA Card */}
                <div
                  className="rounded-xl p-6"
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(239,68,68,0.1), rgba(249,115,22,0.07))',
                    border: '1px solid rgba(249,115,22,0.2)',
                  }}
                >
                  <div
                    className="w-8 h-8 flex items-center justify-center rounded-lg mb-4"
                    style={{ background: 'rgba(249,115,22,0.15)' }}
                  >
                    <i className="ri-sparkling-line text-orange-500 text-sm" />
                  </div>
                  <h3 className="font-display text-base font-bold text-white mb-2 leading-snug">
                    {article.cta.heading}
                  </h3>
                  <p className="text-white/45 text-xs leading-relaxed mb-4">
                    {article.cta.body}
                  </p>
                  <Link
                    to="/contact"
                    className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-full text-xs font-semibold text-white whitespace-nowrap cursor-pointer hover:scale-105 transition-all duration-300"
                    style={{
                      background:
                        'linear-gradient(135deg, #ef4444, #f97316, #fb7185)',
                      boxShadow: '0 6px 20px rgba(239,68,68,0.3)',
                    }}
                  >
                    Work With Huna
                    <i className="ri-arrow-right-line text-xs" />
                  </Link>
                </div>

                {/* Related Articles */}
                {related.length > 0 && (
                  <div
                    className="rounded-xl p-5"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.07)',
                    }}
                  >
                    <h4 className="text-[11px] font-semibold tracking-widest uppercase text-white/40 mb-4">
                      Related Articles
                    </h4>
                    <div className="space-y-4">
                      {related.map((rel) => (
                        <Link key={rel.slug} to={`/blog/${rel.slug}`} className="group block">
                          <div
                            className="w-full h-20 rounded-lg overflow-hidden mb-2"
                            style={{ border: '1px solid rgba(255,255,255,0.06)' }}
                          >
                            <img
                              src={rel.heroImage}
                              alt={rel.title}
                              className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                            />
                          </div>
                          <p className="text-xs font-medium text-white/60 group-hover:text-orange-400 transition-colors leading-snug">
                            {rel.title}
                          </p>
                          <span className="text-[10px] text-white/25 mt-1 block">
                            {rel.readTime}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </aside>
            </div>
          </div>
        </section>

        {/* Mobile CTA */}
        <section className="lg:hidden px-4 pb-12">
          <div
            className="max-w-4xl mx-auto rounded-xl p-6"
            style={{
              background:
                'linear-gradient(135deg, rgba(239,68,68,0.1), rgba(249,115,22,0.07))',
              border: '1px solid rgba(249,115,22,0.2)',
            }}
          >
            <h3 className="font-display text-base font-bold text-white mb-2">
              {article.cta.heading}
            </h3>
            <p className="text-white/45 text-xs leading-relaxed mb-4">
              {article.cta.body}
            </p>
            <Link
              to="/contact"
              className="inline-flex items-center justify-center gap-2 w-full px-4 py-3 rounded-full text-sm font-semibold text-white whitespace-nowrap cursor-pointer"
              style={{
                background:
                  'linear-gradient(135deg, #ef4444, #f97316, #fb7185)',
                boxShadow: '0 6px 20px rgba(239,68,68,0.3)',
              }}
            >
              Work With Huna
              <i className="ri-arrow-right-line text-sm" />
            </Link>
          </div>
        </section>

        {/* Related Articles — Mobile */}
        {related.length > 0 && (
          <section className="lg:hidden px-4 pb-16">
            <div className="max-w-4xl mx-auto">
              <h4 className="text-[11px] font-semibold tracking-widest uppercase text-white/40 mb-5">
                Related Articles
              </h4>
              <div className="grid grid-cols-2 gap-4">
                {related.map((rel) => (
                  <Link key={rel.slug} to={`/blog/${rel.slug}`} className="group block">
                    <div
                      className="w-full h-28 rounded-lg overflow-hidden mb-2"
                      style={{ border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      <img
                        src={rel.heroImage}
                        alt={rel.title}
                        className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <p className="text-xs font-medium text-white/60 group-hover:text-orange-400 transition-colors leading-snug">
                      {rel.title}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer isDark />
    </div>
  );
};

export default ArticlePage;
