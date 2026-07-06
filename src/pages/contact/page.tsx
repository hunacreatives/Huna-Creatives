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

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    service: searchParams.get('service') ?? '',
    budget: '',
    message: '',
  });
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  useEffect(() => {
    const serviceParam = searchParams.get('service');
    if (serviceParam && SERVICE_OPTIONS.includes(serviceParam)) {
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
    'w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#FF6B35]/50 focus:bg-white/7 transition-all';

  return (
    <div className="min-h-screen font-body" style={{ background: '#080c14' }}>
      <Navigation />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-28 pb-20 lg:pt-32 lg:pb-28">

        {/* Full-width header */}
        <div className="mb-12 lg:mb-16">
          <p className="text-xs font-semibold text-[#FF6B35] uppercase tracking-widest mb-4">Get in touch</p>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight mb-4">
            Let's build something<br className="hidden sm:block" /> people remember.
          </h1>
          <p className="text-gray-400 text-sm leading-relaxed max-w-sm">
            Tell us about your project and we'll get back to you within 24 hours with a custom quote.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-24 items-start">

          {/* ── LEFT: Info ── */}
          <div className="order-2 lg:order-1 lg:sticky lg:top-32">

            {/* Contact details */}
            <div className="space-y-5 mb-10">
              {[
                { icon: 'ri-mail-line', label: 'Email', value: 'contact@hunacreatives.com', href: 'mailto:contact@hunacreatives.com' },
                { icon: 'ri-phone-line', label: 'Phone', value: '(+63) 926 751 6692', href: 'tel:+639267516692' },
                { icon: 'ri-map-pin-line', label: 'Location', value: 'Cebu City, Philippines', href: null },
              ].map(({ icon, label, value, href }) => (
                <div key={label} className="flex items-start gap-4">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(255,107,53,0.1)', border: '1px solid rgba(255,107,53,0.2)' }}
                  >
                    <i className={`${icon} text-[#FF6B35] text-sm`} />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-0.5">{label}</p>
                    {href ? (
                      <a href={href} className="text-sm text-gray-300 hover:text-white transition-colors">{value}</a>
                    ) : (
                      <p className="text-sm text-gray-300">{value}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Schedule + Social */}
            <div className="border-t border-white/5 pt-8">
              <a
                href="https://calendly.com/hunacreatives/30min"
                target="_blank"
                rel="nofollow noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold text-white border border-white/10 hover:border-[#FF6B35]/40 hover:bg-white/3 transition-all mb-6"
              >
                <i className="ri-calendar-line text-[#FF6B35]" />
                Schedule a 30-min call
              </a>

              <div className="flex items-center gap-3">
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
                    className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/3 border border-white/8 text-gray-500 hover:text-[#FF6B35] hover:border-[#FF6B35]/30 transition-all"
                  >
                    <i className={`${icon} text-sm`} />
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* ── RIGHT: Form ── */}
          <div className="order-1 lg:order-2">
            {status === 'success' ? (
              <div
                className="rounded-2xl p-12 text-center bg-white/3 border border-white/8"
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ background: 'rgba(255,107,53,0.15)' }}
                >
                  <i className="ri-check-line text-[#FF6B35] text-xl" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Message sent!</h3>
                <p className="text-gray-500 text-sm">We'll get back to you within 24 hours.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-gray-500 uppercase tracking-widest">Name</label>
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
                    <label className="text-[10px] text-gray-500 uppercase tracking-widest">Email</label>
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
                  <label className="text-[10px] text-gray-500 uppercase tracking-widest">Service</label>
                  <select
                    value={formData.service}
                    onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                    required
                    className={`${inputClass} cursor-pointer`}
                    style={{ colorScheme: 'dark' }}
                  >
                    <option value="" disabled style={{ background: '#0e1420' }}>Select a service...</option>
                    {SERVICE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt} style={{ background: '#0e1420' }}>{opt}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-gray-500 uppercase tracking-widest">Budget <span className="normal-case text-gray-700">(optional)</span></label>
                  <select
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                    className={`${inputClass} cursor-pointer`}
                    style={{ colorScheme: 'dark' }}
                  >
                    <option value="" style={{ background: '#0e1420' }}>Select a range...</option>
                    {BUDGET_OPTIONS.map((opt) => (
                      <option key={opt} value={opt} style={{ background: '#0e1420' }}>{opt}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-gray-500 uppercase tracking-widest">Project details</label>
                  <textarea
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    required
                    maxLength={500}
                    rows={5}
                    placeholder="Tell us about your brand, goals, or anything you'd like us to know..."
                    className={`${inputClass} resize-none`}
                  />
                  <p className={`text-[11px] text-right ${formData.message.length > 480 ? 'text-red-400' : 'text-gray-700'}`}>
                    {formData.message.length}/500
                  </p>
                </div>

                {status === 'error' && (
                  <p className="text-xs text-red-400">
                    Something went wrong. Try again or email us at contact@hunacreatives.com
                  </p>
                )}

                <button
                  type="submit"
                  disabled={status === 'sending' || formData.message.length > 500}
                  className="w-full py-3.5 rounded-lg font-semibold text-sm text-white transition-all hover:bg-[#e55a27] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  style={{ background: '#FF6B35', boxShadow: '0 0 24px rgba(255,107,53,0.3)' }}
                >
                  {status === 'sending' ? 'Sending...' : 'Send Message →'}
                </button>
              </form>
            )}
          </div>

        </div>
      </div>

      <Footer isDark />
    </div>
  );
}
