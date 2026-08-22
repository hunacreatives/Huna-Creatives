import { useParams, Link } from 'react-router-dom';
import { useEffect } from 'react';
import Navigation from '../../../components/feature/Navigation';
import Footer from '../../home/components/Footer';
import { getBlogArticle, blogArticles } from '../data';
import { useSEO } from '../../../hooks/useSEO';

const CategoryBadge = ({ category }: { category: string }) => (
  <span
    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold tracking-widest uppercase"
    style={{
      background: 'rgba(255,91,5,0.12)',
      border: '1px solid rgba(255,91,5,0.25)',
      color: '#FF5B05',
    }}
  >
    {category}
  </span>
);

const ArticlePage = () => {
  const { slug } = useParams<{ slug: string }>();
  const article = getBlogArticle(slug ?? '');

  useSEO({
    title: article ? `${article.title} | Huna Creatives` : 'Article Not Found | Huna Creatives',
    description: article?.seo?.description ?? 'Read brand strategy and design insights from the Huna Creatives journal.',
    canonical: `/blog/${slug}`,
    ogImage: article?.heroImage,
    ogType: 'article',
    schema: article
      ? {
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',
          '@id': `https://www.hunacreatives.com/blog/${slug}/#article`,
          headline: article.title,
          description: article.seo.description,
          image: `https://www.hunacreatives.com${article.heroImage}`,
          url: `https://www.hunacreatives.com/blog/${slug}`,
          datePublished: article.isoDate,
          dateModified: article.isoDate,
          // Person, not Organization: posts carry real bylines, and a named
          // author with a stated role is what E-E-A-T actually rewards.
          author: {
            '@type': 'Person',
            name: article.author.name,
            jobTitle: article.author.role,
            worksFor: {
              '@type': 'Organization',
              '@id': 'https://www.hunacreatives.com/#organization',
              name: 'Huna Creatives',
            },
          },
          publisher: {
            '@id': 'https://www.hunacreatives.com/#organization',
          },
          keywords: article.seo.keywords.join(', '),
          inLanguage: 'en-US',
          mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': `https://www.hunacreatives.com/blog/${slug}`,
          },
        }
      : undefined,
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  if (!article) {
    return (
      <div className="min-h-screen bg-[#F5F5F5]">
        <Navigation invertOnScroll barTheme="light" />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center px-4">
            <h2 className="text-xl font-bold text-[#243037] mb-4 font-display">
              Article not found
            </h2>
            <Link
              to="/blog"
              className="text-orange-500 hover:text-[#FF5B05] font-medium text-sm"
            >
              &larr; Back to Blog
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const related = blogArticles
    .filter((a) => article.relatedSlugs.includes(a.slug))
    .slice(0, 2);

  return (
    <div className="min-h-screen bg-[#F5F5F5] font-body">
      <Navigation invertOnScroll barTheme="light" />

      <main>
        {/* Hero */}
        <section className="relative pt-24 sm:pt-28 pb-0 px-4 sm:px-6">
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
              className="inline-flex items-center gap-2 text-[#243037]/50 hover:text-[#FF5B05] transition-colors mb-8 group text-sm"
            >
              <i className="ri-arrow-left-line text-base group-hover:-translate-x-1 transition-transform" />
              <span className="font-medium whitespace-nowrap tracking-wide">
                Back to Blog
              </span>
            </Link>

            <div className="mb-5 flex items-center gap-3 flex-wrap">
              <CategoryBadge category={article.category} />
              <span className="text-[#243037]/45 text-xs">{article.date}</span>
              <span className="text-[#243037]/35 text-xs">·</span>
              <span className="text-[#243037]/45 text-xs">{article.readTime}</span>
            </div>

            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold font-display leading-tight text-[#243037] mb-6">
              {article.title}
            </h1>

            <p className="text-[#243037]/60 text-base leading-relaxed mb-6 max-w-2xl">
              {article.excerpt}
            </p>

            {/* Author */}
            <div
              className="flex items-center gap-3 pb-10 border-b"
              style={{ borderColor: 'rgba(36,48,55,0.1)' }}
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
                <div className="text-sm font-semibold text-[#243037]">
                  {article.author.name}
                </div>
                <div className="text-xs text-[#243037]/50">
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
              className="w-full h-[240px] md:h-[360px] lg:h-[480px] rounded-xl md:rounded-2xl overflow-hidden bg-[#EDEDED]"
              style={{ border: '1px solid rgba(255,255,255,0.7)', boxShadow: '0 10px 28px rgba(36,48,55,0.15)' }}
            >
              <img
                src={article.heroImage}
                alt={article.title}
                className="w-full h-full object-cover"
                style={{ objectPosition: article.heroImagePosition ?? 'center top' }}
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
                        className="font-display text-xl md:text-2xl font-bold text-[#243037] mt-10 mb-4 leading-snug"
                      >
                        {block.content}
                      </h2>
                    );
                  }
                  if (block.type === 'paragraph') {
                    return (
                      <p
                        key={i}
                        className="text-[#243037]/70 text-sm md:text-base leading-relaxed mb-5 [&_a]:text-[#FF5B05] [&_a]:underline [&_a]:underline-offset-2 [&_a]:hover:text-[#FF8A47]"
                        dangerouslySetInnerHTML={{ __html: block.content }}
                      />
                    );
                  }
                  if (block.type === 'quote') {
                    return (
                      <blockquote
                        key={i}
                        className="my-8 pl-5 relative"
                        style={{ borderLeft: '3px solid #FF5B05' }}
                      >
                        <p className="text-[#243037]/75 text-base md:text-lg font-medium leading-relaxed italic font-display">
                          &ldquo;{block.content}&rdquo;
                        </p>
                      </blockquote>
                    );
                  }
                  if (block.type === 'list' && block.items) {
                    return (
                      <div key={i} className="my-6">
                        <p className="text-[#243037]/70 text-sm mb-3 font-medium">
                          {block.content}
                        </p>
                        <ul className="space-y-2.5">
                          {block.items.map((item, j) => (
                            <li key={j} className="flex items-start gap-3">
                              <span
                                className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0"
                                style={{ background: '#FF5B05' }}
                              />
                              <span className="text-[#243037]/70 text-sm leading-relaxed">
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
                  style={{ borderColor: 'rgba(36,48,55,0.1)' }}
                >
                  <p className="text-[10px] font-semibold tracking-widest uppercase text-[#243037]/40 mb-3">
                    Topics
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {article.seo.keywords.map((kw) => (
                      <span
                        key={kw}
                        className="px-2.5 py-1 rounded-full text-[10px] font-medium text-[#243037]/50"
                        style={{
                          background: 'rgba(255,255,255,0.6)',
                          border: '1px solid rgba(255,255,255,0.7)',
                        }}
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Internal links */}
                <div
                  className="mt-8 pt-6 border-t"
                  style={{ borderColor: 'rgba(36,48,55,0.1)' }}
                >
                  <p className="text-[10px] font-semibold tracking-widest uppercase text-[#243037]/40 mb-3">
                    Explore Huna Creatives
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: 'Our Services', href: '/services' },
                      { label: 'Portfolio', href: '/portfolio' },
                      { label: 'Contact Us', href: '/contact' },
                      { label: 'Sentro OS', href: '/sentro' },
                      { label: 'About Us', href: '/about' },
                    ].map((link) => (
                      <Link
                        key={link.href}
                        to={link.href}
                        className="px-3 py-1.5 rounded-full text-[11px] font-medium text-[#243037]/50 hover:text-[#FF5B05] transition-colors"
                        style={{
                          background: 'rgba(255,255,255,0.6)',
                          border: '1px solid rgba(255,255,255,0.7)',
                        }}
                      >
                        {link.label}
                      </Link>
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
                    background: 'rgba(255,255,255,0.65)',
                    backdropFilter: 'blur(20px) saturate(160%)',
                    WebkitBackdropFilter: 'blur(20px) saturate(160%)',
                    border: '1px solid rgba(255,91,5,0.25)',
                    boxShadow: '0 10px 28px rgba(36,48,55,0.12)',
                  }}
                >
                  <div
                    className="w-8 h-8 flex items-center justify-center rounded-lg mb-4"
                    style={{ background: 'rgba(255,91,5,0.12)' }}
                  >
                    <i className="ri-sparkling-line text-[#FF5B05] text-sm" />
                  </div>
                  <h3 className="font-display text-base font-bold text-[#243037] mb-2 leading-snug">
                    {article.cta.heading}
                  </h3>
                  <p className="text-[#243037]/55 text-xs leading-relaxed mb-4">
                    {article.cta.body}
                  </p>
                  <Link
                    to="/contact"
                    className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-full text-xs font-semibold text-white whitespace-nowrap cursor-pointer hover:scale-105 transition-all duration-300"
                    style={{
                      background: 'linear-gradient(135deg, #FF5B05, #FF8A47)',
                      boxShadow: '0 8px 24px rgba(255,91,5,0.3)',
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
                      background: 'rgba(255,255,255,0.65)',
                      backdropFilter: 'blur(20px) saturate(160%)',
                      WebkitBackdropFilter: 'blur(20px) saturate(160%)',
                      border: '1px solid rgba(255,255,255,0.7)',
                      boxShadow: '0 10px 28px rgba(36,48,55,0.12)',
                    }}
                  >
                    <h4 className="text-[11px] font-semibold tracking-widest uppercase text-[#243037]/50 mb-4">
                      Related Articles
                    </h4>
                    <div className="space-y-4">
                      {related.map((rel) => (
                        <Link key={rel.slug} to={`/blog/${rel.slug}`} className="group block">
                          <div
                            className="w-full h-20 rounded-lg overflow-hidden mb-2"
                            style={{ border: '1px solid rgba(255,255,255,0.7)', boxShadow: '0 8px 20px rgba(36,48,55,0.12)' }}
                          >
                            <img
                              src={rel.heroImage}
                              alt={rel.title}
                              className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                            />
                          </div>
                          <p className="text-xs font-medium text-[#243037]/65 group-hover:text-[#FF5B05] transition-colors leading-snug">
                            {rel.title}
                          </p>
                          <span className="text-[10px] text-[#243037]/40 mt-1 block">
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
              background: 'rgba(255,255,255,0.65)',
              backdropFilter: 'blur(20px) saturate(160%)',
              WebkitBackdropFilter: 'blur(20px) saturate(160%)',
              border: '1px solid rgba(255,91,5,0.25)',
              boxShadow: '0 10px 28px rgba(36,48,55,0.12)',
            }}
          >
            <h3 className="font-display text-base font-bold text-[#243037] mb-2">
              {article.cta.heading}
            </h3>
            <p className="text-[#243037]/55 text-xs leading-relaxed mb-4">
              {article.cta.body}
            </p>
            <Link
              to="/contact"
              className="inline-flex items-center justify-center gap-2 w-full px-4 py-3 rounded-full text-sm font-semibold text-white whitespace-nowrap cursor-pointer"
              style={{
                background: 'linear-gradient(135deg, #FF5B05, #FF8A47)',
                boxShadow: '0 8px 24px rgba(255,91,5,0.3)',
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
              <h4 className="text-[11px] font-semibold tracking-widest uppercase text-[#243037]/50 mb-5">
                Related Articles
              </h4>
              <div className="grid grid-cols-2 gap-4">
                {related.map((rel) => (
                  <Link key={rel.slug} to={`/blog/${rel.slug}`} className="group block">
                    <div
                      className="w-full h-28 rounded-lg overflow-hidden mb-2"
                      style={{ border: '1px solid rgba(255,255,255,0.7)', boxShadow: '0 8px 20px rgba(36,48,55,0.12)' }}
                    >
                      <img
                        src={rel.heroImage}
                        alt={rel.title}
                        className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <p className="text-xs font-medium text-[#243037]/65 group-hover:text-[#FF5B05] transition-colors leading-snug">
                      {rel.title}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default ArticlePage;
