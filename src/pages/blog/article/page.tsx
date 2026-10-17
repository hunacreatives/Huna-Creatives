import { useParams, Link } from 'react-router-dom';
import { useEffect } from 'react';
import Navigation from '../../../components/feature/Navigation';
import Footer from '../../home/components/Footer';
import { getBlogArticle, blogArticles, type BlogArticle } from '../data';
import { useSEO } from '../../../hooks/useSEO';
import { noteArticle } from '../../../lib/leadSource';

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

// Contact link for the post's call to action: a pre-selected service, or an
// explicit href (e.g. the Sentro demo booking).
const ctaTarget = (article: BlogArticle) =>
  article.cta.href ?? (article.cta.service ? `/contact?service=${encodeURIComponent(article.cta.service)}` : '/contact');

function trackCta(slug: string, position: string) {
  const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
  if (typeof gtag === 'function') gtag('event', 'blog_cta_click', { article: slug, position });
}

function CtaLink({ article, position, className, style, children }: {
  article: BlogArticle; position: string; className: string; style: React.CSSProperties; children: React.ReactNode;
}) {
  const href = ctaTarget(article);
  const onClick = () => trackCta(article.slug, position);
  return /^https?:/.test(href) ? (
    <a href={href} target="_blank" rel="noopener" onClick={onClick} className={className} style={style}>{children}</a>
  ) : (
    <Link to={href} onClick={onClick} className={className} style={style}>{children}</Link>
  );
}

const glassCard: React.CSSProperties = {
  background: 'rgba(255,255,255,0.65)',
  backdropFilter: 'blur(20px) saturate(160%)',
  WebkitBackdropFilter: 'blur(20px) saturate(160%)',
  border: '1px solid rgba(255,255,255,0.7)',
  boxShadow: '0 10px 28px rgba(36,48,55,0.12)',
};

const ctaButtonStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, #FF5B05, #FF8A47)',
  boxShadow: '0 8px 24px rgba(255,91,5,0.3)',
};

const ArticlePage = () => {
  const { slug } = useParams<{ slug: string }>();
  const article = getBlogArticle(slug ?? '');

  useSEO({
    title: article ? `${article.title} | Huna Creatives` : 'Article Not Found | Huna Creatives',
    description: article?.seo?.description ?? 'Read brand strategy and design insights from the Huna Creatives journal.',
    canonical: `/blog/${slug}`,
    ogImage: article?.heroImage,
    ogType: 'article',
    noIndex: !article,
    schema: article
      ? [{
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',
          '@id': `https://www.hunacreatives.com/blog/${slug}/#article`,
          headline: article.title,
          description: article.seo.description,
          image: `https://www.hunacreatives.com${article.heroImage}`,
          url: `https://www.hunacreatives.com/blog/${slug}`,
          datePublished: article.isoDate,
          dateModified: article.updatedIsoDate ?? article.isoDate,
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
        }, ...(article.faqs?.length ? [{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: article.faqs.map((f) => ({
            '@type': 'Question',
            name: f.q,
            acceptedAnswer: { '@type': 'Answer', text: f.a },
          })),
        }] : []), {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.hunacreatives.com' },
            { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://www.hunacreatives.com/blog' },
            { '@type': 'ListItem', position: 3, name: article.title, item: `https://www.hunacreatives.com/blog/${slug}` },
          ],
        }]
      : undefined,
  });

  useEffect(() => {
    window.scrollTo(0, 0);
    if (article && slug) noteArticle(slug);
  }, [slug, article]);

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
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[min(900px,100%)] h-[1px]"
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
              <article className="prose-custom min-w-0">
                {article.verdict && article.verdict.length > 0 && (
                  <div className="rounded-xl p-5 sm:p-6 mb-8" style={glassCard}>
                    <p className="text-[10px] font-semibold tracking-widest uppercase text-[#FF5B05] mb-3">
                      The short answer
                    </p>
                    <dl className="space-y-3">
                      {article.verdict.map((v) => (
                        <div key={v.option} className="sm:grid sm:grid-cols-[180px_1fr] sm:gap-4">
                          <dt className="text-sm font-semibold text-[#243037]">{v.option}</dt>
                          <dd className="text-sm text-[#243037]/65 leading-relaxed">{v.bestFor}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}

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
                  if (block.type === 'image') {
                    return (
                      <figure key={i} className="my-8">
                        <div className="rounded-xl md:rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(36,48,55,0.08)' }}>
                          <img
                            src={block.content}
                            alt={block.alt ?? block.caption ?? ''}
                            loading="lazy"
                            className="w-full h-auto object-cover"
                          />
                        </div>
                        {block.caption && (
                          <figcaption className="mt-2.5 text-xs text-[#243037]/45 leading-relaxed">
                            {block.caption}
                          </figcaption>
                        )}
                      </figure>
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
                  if (block.type === 'table' && block.columns && block.rows) {
                    return (
                      <figure key={i} className="my-8">
                        {block.columns.length > 3 && (
                          <p className="sm:hidden text-[11px] text-[#243037]/45 mb-2 flex items-center gap-1">
                            Swipe the table for more <i className="ri-arrow-right-line" />
                          </p>
                        )}
                        {/* Scrolls sideways inside its box on phones; the page itself never does. */}
                        <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid rgba(36,48,55,0.1)', background: 'rgba(255,255,255,0.7)' }}>
                          <table className="w-full min-w-[560px] text-left text-[13px] leading-snug">
                            <thead>
                              <tr style={{ background: 'rgba(36,48,55,0.04)' }}>
                                {block.columns.map((c, ci) => (
                                  <th key={ci} scope="col" className={`px-3.5 py-3 font-semibold text-[#243037] align-bottom ${ci === 0 ? 'sticky left-0 bg-[#F3F4F4]' : ''}`}>
                                    {c}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {block.rows.map((row, ri) => (
                                <tr key={ri} style={{ borderTop: '1px solid rgba(36,48,55,0.08)' }}>
                                  {row.map((cell, ci) =>
                                    ci === 0 ? (
                                      <th key={ci} scope="row" className="px-3.5 py-3 font-semibold text-[#243037] align-top sticky left-0 bg-[#FAFAFA]">{cell}</th>
                                    ) : (
                                      <td key={ci} className="px-3.5 py-3 text-[#243037]/70 align-top">{cell}</td>
                                    ),
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {block.content && (
                          <figcaption className="mt-2.5 text-xs text-[#243037]/45 leading-relaxed">{block.content}</figcaption>
                        )}
                      </figure>
                    );
                  }
                  if (block.type === 'callout') {
                    return (
                      <div
                        key={i}
                        className="my-7 rounded-xl px-5 py-4 text-sm text-[#243037]/80 leading-relaxed [&_a]:text-[#FF5B05] [&_a]:underline [&_a]:underline-offset-2 [&_strong]:text-[#243037]"
                        style={{ background: 'rgba(255,91,5,0.06)', border: '1px solid rgba(255,91,5,0.2)' }}
                        dangerouslySetInnerHTML={{ __html: block.content }}
                      />
                    );
                  }
                  if (block.type === 'cta') {
                    return (
                      <div key={i} className="my-8 rounded-xl p-5 sm:p-6 sm:flex sm:items-center sm:justify-between sm:gap-6" style={{ ...glassCard, border: '1px solid rgba(255,91,5,0.25)' }}>
                        <div className="mb-4 sm:mb-0">
                          <p className="font-display text-base font-bold text-[#243037] leading-snug mb-1">{article.cta.heading}</p>
                          <p className="text-[#243037]/55 text-xs leading-relaxed">{article.cta.body}</p>
                        </div>
                        <CtaLink
                          article={article}
                          position={`inline-${i}`}
                          className="inline-flex items-center justify-center gap-2 w-full sm:w-auto flex-shrink-0 px-5 py-3 sm:py-2.5 rounded-full text-sm sm:text-xs font-semibold text-white whitespace-nowrap"
                          style={ctaButtonStyle}
                        >
                          {article.cta.label ?? 'Get a Quote'}
                          <i className="ri-arrow-right-line" />
                        </CtaLink>
                      </div>
                    );
                  }
                  return null;
                })}

                {article.faqs && article.faqs.length > 0 && (
                  <section className="mt-12">
                    <h2 className="font-display text-xl md:text-2xl font-bold text-[#243037] mb-5 leading-snug">
                      Questions people ask
                    </h2>
                    <div className="space-y-5">
                      {article.faqs.map((f) => (
                        <div key={f.q}>
                          <h3 className="text-sm md:text-base font-semibold text-[#243037] mb-1.5">{f.q}</h3>
                          <p className="text-[#243037]/70 text-sm md:text-base leading-relaxed">{f.a}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {article.sources && article.sources.length > 0 && (
                  <div className="mt-10">
                    <p className="text-[10px] font-semibold tracking-widest uppercase text-[#243037]/40 mb-3">Sources</p>
                    <ol className="space-y-1.5 list-decimal pl-4">
                      {article.sources.map((src) => (
                        <li key={src.url} className="text-xs text-[#243037]/55 leading-relaxed">
                          <a href={src.url} target="_blank" rel="noopener nofollow" className="underline underline-offset-2 hover:text-[#FF5B05] break-words">
                            {src.label}
                          </a>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

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
                  <CtaLink
                    article={article}
                    position="sidebar"
                    className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-full text-xs font-semibold text-white whitespace-nowrap cursor-pointer hover:scale-105 transition-all duration-300"
                    style={ctaButtonStyle}
                  >
                    {article.cta.label ?? 'Work With Huna'}
                    <i className="ri-arrow-right-line text-xs" />
                  </CtaLink>
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
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              style={{ objectPosition: rel.heroImagePosition ?? 'center top' }}
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
            <CtaLink
              article={article}
              position="mobile-end"
              className="inline-flex items-center justify-center gap-2 w-full px-4 py-3 rounded-full text-sm font-semibold text-white whitespace-nowrap cursor-pointer"
              style={ctaButtonStyle}
            >
              {article.cta.label ?? 'Work With Huna'}
              <i className="ri-arrow-right-line text-sm" />
            </CtaLink>
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
