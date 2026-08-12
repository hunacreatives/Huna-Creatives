import React, { useState, useEffect } from 'react';
import Footer from '../home/components/Footer';
import Navigation from '../../components/feature/Navigation';
import { useSearchParams } from 'react-router-dom';
import { useSEO } from '../../hooks/useSEO';
import { supabase } from '@/lib/supabase';

const SERVICE_OPTIONS = [
  'Brand Identity & Logo Design',
  'Digital Design (Social Media, Ads)',
  'Content Creation & Photography',
  'Creative Strategy & Consulting',
  'Print & Packaging Design',
  'Motion & Animation',
  'Website Design',
  'E-Vites & Event RSVP Websites',
  'Other / Not Sure Yet',
];

const BUDGET_OPTIONS = [
  'Under ₱10,000',
  '₱10,000 – ₱30,000',
  '₱30,000 – ₱60,000',
  '₱60,000 – ₱100,000',
  '₱100,000+',
  'Let\'s discuss',
];

export default function ContactPage() {
  useSEO({
    title: 'Start a Project — Contact Huna Creatives',
    description:
      'Ready to build something great? Get in touch with Huna Creatives to discuss your branding, social media content, or design project.',
    canonical: '/contact',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'ContactPage',
      '@id': 'https://www.hunacreatives.com/contact/#webpage',
      url: 'https://www.hunacreatives.com/contact',
      name: 'Contact Huna Creatives',
      isPartOf: { '@id': 'https://www.hunacreatives.com/#website' },
    },
  });

  const [searchParams] = useSearchParams();

  // Unvalidated, this used to let a ?service= param that didn't exactly match
  // one of SERVICE_OPTIONS (e.g. a stale link, or a typo in whatever set the
  // link) sit in state as a value the <select> has no matching <option> for —
  // which renders as a blank dropdown, not a validation error, so it looked
  // like "pre-select" silently did nothing.
  const validService = (param: string | null) =>
    param && SERVICE_OPTIONS.includes(param) ? param : '';

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    service: validService(searchParams.get('service')),
    budget: '',
    message: '',
  });
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  useEffect(() => {
    const serviceParam = validService(searchParams.get('service'));
    if (serviceParam) {
      setFormData((prev) => ({ ...prev, service: serviceParam }));
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (formData.message.length > 500) return;
    setStatus('sending');
    try {
      const { error } = await supabase.functions.invoke('submit-contact', {
        body: {
          name: formData.name,
          email: formData.email,
          service: formData.service,
          budget: formData.budget || 'Not specified',
          message: formData.message,
        },
      });
      if (!error) {
        setStatus('success');
        setFormData({ name: '', email: '', service: '', budget: '', message: '' });
        if (typeof window !== 'undefined' && typeof (window as any).gtag === 'function') {
          (window as any).gtag('event', 'contact_form_submit', {
            event_category: 'lead',
            event_label: formData.service || 'General Inquiry',
            value: 1,
          });
        }
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  const inputClass =
    'w-full px-4 py-3.5 rounded-xl bg-white/70 border border-[#243037]/10 text-[#243037] text-base sm:text-sm placeholder-[#243037]/35 focus:outline-none focus:border-[#FF5B05]/60 focus:ring-2 focus:ring-[#FF5B05]/20 focus:bg-white/90 transition-all';

  // Shared between the desktop position (left column, under contact details)
  // and the mobile position (below the form) — one definition so the two
  // never drift out of sync.
  const scheduleAndSocial = (
    <>
      <a
        href="https://calendly.com/hunacreatives/30min"
        target="_blank"
        rel="nofollow noreferrer"
        className="inline-flex items-center justify-center gap-2 w-auto px-6 sm:px-5 py-3 sm:py-2.5 rounded-full text-[13px] sm:text-xs font-semibold text-[#243037] border border-[#243037]/15 bg-white/60 hover:border-[#FF5B05]/50 hover:text-[#FF5B05] transition-all mb-5 sm:mb-6"
      >
        <i className="ri-calendar-line text-[#FF5B05]" />
        Schedule a 30-min call
      </a>

      <div className="flex items-center justify-center sm:justify-start gap-3">
        {[
          { icon: 'ri-instagram-line', href: 'https://www.instagram.com/hunacreatives/' },
          { icon: 'ri-facebook-circle-line', href: 'https://www.facebook.com/hunacreatives/' },
          { icon: 'ri-linkedin-box-line', href: 'https://www.linkedin.com/company/huna-creatives' },
        ].map(({ icon, href }) => (
          <a
            key={icon}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/60 border border-[#243037]/10 text-[#243037]/90 hover:text-[#FF5B05] hover:border-[#FF5B05]/35 transition-all"
          >
            <i className={`${icon} text-sm`} />
          </a>
        ))}
      </div>
    </>
  );

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
          className="absolute top-[60%] left-[30%] w-[620px] h-[620px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(211,221,222,0.5), transparent 72%)', filter: 'blur(70px)', animation: 'orb-float-c 20s ease-in-out infinite' }}
        />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pt-20 sm:pt-28 pb-16 lg:pb-28">

        {/* gap-12 was uniform across breakpoints, but the grid collapses to a
            single column below lg — so that 48px became the gap between the
            ENTIRE header/info block and the form, stacked on top of the
            mb-10s inside it. Tightened for mobile only; desktop unchanged. */}
        <div className="grid lg:grid-cols-2 gap-6 lg:gap-24 items-start">

          {/* ── LEFT: Header + Info ── */}
          {/* No order override anymore — the form used to be forced above this
              on mobile (order-1 vs order-2), so a phone visitor landed on raw
              inputs with no heading or context above them. Natural DOM order
              (header first, form second) already gives the right two-column
              placement on desktop too, since grid auto-placement follows
              source order — the order utilities were only doing the mobile
              reordering, which was the actual bug. */}
          {/* Centered on mobile — left-aligned text/rows read as a ragged
              column stacked above a full-width form, with nothing to anchor
              the eye. Same treatment as the Services/About/Careers mobile
              passes. Reverts to left alignment at sm, where it sits beside
              the form instead of above it. */}
          <div className="lg:sticky lg:top-32 text-center sm:text-left">

            {/* Header */}
            <div className="mb-6 sm:mb-10">
              <div className="flex items-center justify-center sm:justify-start gap-3 mb-3 sm:mb-5">
                <span className="text-[11px] font-medium tracking-[0.3em] uppercase text-[#075056]">Get in Touch</span>
              </div>
              <h1 className="text-2xl sm:text-2xl md:text-3xl lg:text-4xl font-bold font-display leading-tight text-[#243037] mb-3 sm:mb-4">
                Let's build something<br className="hidden sm:block" /> people remember.
              </h1>
              <p className="text-[#243037]/80 text-[15px] sm:text-sm leading-relaxed max-w-sm mx-auto sm:mx-0">
                Tell us about your project and we'll get back to you within 24 hours with a custom quote.
              </p>
            </div>

            {/* Contact details — a compact wrapping row on mobile instead of
                three full-height stacked rows (icon + label + value each),
                which was most of what made this block so tall. Desktop keeps
                the original stacked layout, where the extra height reads as
                intentional whitespace rather than dead space before the form. */}
            <div className="flex sm:hidden flex-wrap justify-center gap-2.5 mb-6">
              {[
                { icon: 'ri-mail-line', value: 'contact@hunacreatives.com', href: 'mailto:contact@hunacreatives.com' },
                { icon: 'ri-phone-line', value: '(+63) 926 751 6692', href: 'tel:+639267516692' },
                { icon: 'ri-map-pin-line', value: 'Cebu City, PH', href: null },
              ].map(({ icon, value, href }) => {
                const Tag = href ? 'a' : 'div';
                return (
                  <Tag
                    key={value}
                    {...(href ? { href } : {})}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-[13px] text-[#243037]/90"
                    style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(36,48,55,0.08)' }}
                  >
                    <i className={`${icon} text-[#FF5B05] text-sm`} />
                    {value}
                  </Tag>
                );
              })}
            </div>

            <div className="hidden sm:block space-y-5 mb-10">
              {[
                { icon: 'ri-mail-line', label: 'Email', value: 'contact@hunacreatives.com', href: 'mailto:contact@hunacreatives.com' },
                { icon: 'ri-phone-line', label: 'Phone', value: '(+63) 926 751 6692', href: 'tel:+639267516692' },
                { icon: 'ri-map-pin-line', label: 'Location', value: 'Cebu City, Philippines', href: null },
              ].map(({ icon, label, value, href }) => (
                <div key={label} className="flex items-start gap-4">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(255,91,5,0.12)', border: '1px solid rgba(255,91,5,0.22)' }}
                  >
                    <i className={`${icon} text-[#FF5B05] text-sm`} />
                  </div>
                  <div>
                    <p className="text-[11px] text-[#243037]/55 uppercase tracking-widest mb-0.5">{label}</p>
                    {href ? (
                      <a href={href} className="text-sm text-[#243037]/90 hover:text-[#FF5B05] transition-colors">{value}</a>
                    ) : (
                      <p className="text-sm text-[#243037]/90">{value}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Schedule + Social — desktop only here. On mobile this same
                block renders after the form instead (see scheduleAndSocial
                below), since a phone visitor should hit the form right after
                the header/contact chips, not a call-booking button first. */}
            <div className="hidden sm:flex border-t border-[#243037]/10 pt-8 flex-col items-start">
              {scheduleAndSocial}
            </div>
          </div>

          {/* ── RIGHT: Form ── */}
          <div className="lg:mt-12">
            {status === 'success' ? (
              <div
                className="rounded-2xl p-10 sm:p-12 text-center"
                style={{ background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(20px) saturate(160%)', WebkitBackdropFilter: 'blur(20px) saturate(160%)', border: '1px solid rgba(255,255,255,0.7)', boxShadow: '0 8px 32px rgba(36,48,55,0.08)' }}
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ background: 'rgba(255,91,5,0.14)' }}
                >
                  <i className="ri-check-line text-[#FF5B05] text-xl" />
                </div>
                <h3 className="text-lg font-bold text-[#243037] mb-2">Message sent!</h3>
                <p className="text-[#243037]/90 text-sm">We'll get back to you within 24 hours.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] text-[#243037]/65 uppercase tracking-widest">Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      placeholder="Your name"
                      className={inputClass}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] text-[#243037]/65 uppercase tracking-widest">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      placeholder="your@email.com"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] text-[#243037]/65 uppercase tracking-widest">Service</label>
                  <select
                    value={formData.service}
                    onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                    required
                    className={`${inputClass} cursor-pointer`}
                    style={{ colorScheme: 'light' }}
                  >
                    <option value="" disabled style={{ background: '#ffffff' }}>Select a service...</option>
                    {SERVICE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt} style={{ background: '#ffffff' }}>{opt}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] text-[#243037]/65 uppercase tracking-widest">Budget <span className="normal-case text-[#243037]/45">(optional)</span></label>
                  <select
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                    className={`${inputClass} cursor-pointer`}
                    style={{ colorScheme: 'light' }}
                  >
                    <option value="" style={{ background: '#ffffff' }}>Select a range...</option>
                    {BUDGET_OPTIONS.map((opt) => (
                      <option key={opt} value={opt} style={{ background: '#ffffff' }}>{opt}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] text-[#243037]/65 uppercase tracking-widest">Project details</label>
                  <textarea
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    required
                    maxLength={500}
                    rows={5}
                    placeholder="Tell us about your brand, goals, or anything you'd like us to know..."
                    className={`${inputClass} resize-none`}
                  />
                  <p className={`text-[11px] text-right ${formData.message.length > 480 ? 'text-red-500' : 'text-[#243037]/50'}`}>
                    {formData.message.length}/500
                  </p>
                </div>

                {status === 'error' && (
                  <p className="text-xs text-red-500">
                    Something went wrong. Try again or email us at contact@hunacreatives.com
                  </p>
                )}

                <button
                  type="submit"
                  disabled={status === 'sending' || formData.message.length > 500}
                  className="w-full py-4 rounded-full font-semibold text-sm text-white transition-transform duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 cursor-pointer"
                  style={{ background: 'linear-gradient(135deg, #FF5B05, #FF8A47)', boxShadow: '0 8px 24px rgba(255,91,5,0.3)' }}
                >
                  {status === 'sending' ? 'Sending...' : 'Send Message →'}
                </button>
              </form>
            )}

            {/* Mobile-only placement of schedule + social, below the form —
                see the desktop version in the left column above. */}
            <div className="sm:hidden border-t border-[#243037]/10 mt-8 pt-6 flex flex-col items-center">
              {scheduleAndSocial}
            </div>
          </div>

        </div>
      </div>

      <Footer />
    </div>
  );
}
