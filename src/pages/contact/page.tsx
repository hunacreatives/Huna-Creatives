import React, { useState, useEffect } from 'react';
import Footer from '../home/components/Footer';
import Navigation from '../../components/feature/Navigation';
import { motion } from 'framer-motion';

const SERVICE_OPTIONS = [
  'Brand Identity & Logo Design',
  'Digital Design (Social Media, Ads)',
  'Content Creation & Photography',
  'Creative Strategy & Consulting',
  'Print & Packaging Design',
  'Motion & Animation',
  'Website Design',
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
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    service: '',
    budget: '',
    message: '',
  });
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 60);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Home', href: '/' },
    { label: 'About Us', href: '/about' },
    { label: 'Portfolio', href: '/portfolio' },
    { label: 'Services', href: '/services' },
  ];

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (formData.message.length > 500) return;
    
    setStatus('sending');
    
    try {
      const params = new URLSearchParams();
      params.append('name', formData.name);
      params.append('email', formData.email);
      params.append('service', formData.service);
      params.append('budget', formData.budget || 'Not specified');
      params.append('message', formData.message);

      const res = await fetch('https://formspree.io/f/mjgedgoq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
        body: params.toString(),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok || data?.ok === true || (!data?.errors)) {
        setStatus('success');
        setFormData({ name: '', email: '', service: '', budget: '', message: '' });
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  const selectStyle = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: 'white',
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] font-body">
      <Navigation />

      {/* ═══════════════════ HERO ═══════════════════ */}
      <section className="relative pt-24 pb-12 md:pt-32 md:pb-16 px-4 md:px-6 bg-[#0a0a0a] overflow-hidden">
        {/* Ambient glow blobs */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full bg-red-900/20 blur-[120px] pointer-events-none" />
        <div className="absolute top-1/3 right-0 w-[400px] h-[400px] rounded-full bg-orange-900/20 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[350px] h-[350px] rounded-full bg-red-900/15 blur-[100px] pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
            >
              <span className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.3em] uppercase text-orange-500 mb-4 md:mb-5 font-display">
                <span className="w-6 h-px bg-orange-500" />
                Get in Touch
                <span className="w-6 h-px bg-orange-500" />
              </span>
              <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight mb-4 md:mb-6">
                Let&apos;s create something
                <br />
                <span className="gradient-text-animated">amazing together.</span>
              </h1>
              <p className="text-white/40 text-sm md:text-base leading-relaxed max-w-2xl mx-auto">
                Whether you&apos;re starting from scratch or looking to elevate your brand, we&apos;re here to help bring your vision to life.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════════════════ CONTACT FORM + INFO ═══════════════════ */}
      <section className="relative py-12 md:py-16 lg:py-20 px-4 md:px-6 bg-[#0a0a0a]">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8 md:gap-12 lg:gap-16">
            {/* LEFT: Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="relative rounded-2xl md:rounded-3xl p-6 md:p-8 lg:p-10"
              style={{
                background: '#141414',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
              }}
            >
              <h2 className="font-display text-xl md:text-2xl font-bold text-white mb-2">Send us a message</h2>
              <p className="text-white/35 text-xs md:text-sm mb-6 md:mb-8">Fill out the form below and we&apos;ll get back to you within 24 hours.</p>

              <form onSubmit={handleSubmit} data-readdy-form className="space-y-4 md:space-y-5">
                {/* Name */}
                <div>
                  <label htmlFor="name" className="block text-[11px] font-medium text-gray-400 mb-2 tracking-widest uppercase">
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-5 py-3.5 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/60 outline-none transition-all text-white placeholder-gray-500 text-xs"
                    placeholder="Your name"
                  />
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-[11px] font-medium text-gray-400 mb-2 tracking-widest uppercase">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="w-full px-5 py-3.5 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/60 outline-none transition-all text-white placeholder-gray-500 text-xs"
                    placeholder="your@email.com"
                  />
                </div>

                {/* Service Dropdown */}
                <div>
                  <label htmlFor="service" className="block text-[11px] font-medium text-gray-400 mb-2 tracking-widest uppercase">
                    What service are you looking for?
                  </label>
                  <select
                    id="service"
                    name="service"
                    value={formData.service}
                    onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                    required
                    className="w-full px-5 py-3.5 rounded-xl focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/60 outline-none transition-all text-xs cursor-pointer appearance-none"
                    style={selectStyle}
                  >
                    <option value="" disabled style={{ background: '#1a1a1a' }}>Select a service...</option>
                    {SERVICE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt} style={{ background: '#1a1a1a' }}>{opt}</option>
                    ))}
                  </select>
                </div>

                {/* Budget Dropdown */}
                <div>
                  <label htmlFor="budget" className="block text-[11px] font-medium text-gray-400 mb-2 tracking-widest uppercase">
                    Estimated Budget
                  </label>
                  <select
                    id="budget"
                    name="budget"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                    className="w-full px-5 py-3.5 rounded-xl focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/60 outline-none transition-all text-xs cursor-pointer appearance-none"
                    style={selectStyle}
                  >
                    <option value="" style={{ background: '#1a1a1a' }}>Select a budget range (optional)</option>
                    {BUDGET_OPTIONS.map((opt) => (
                      <option key={opt} value={opt} style={{ background: '#1a1a1a' }}>{opt}</option>
                    ))}
                  </select>
                </div>

                {/* Message */}
                <div>
                  <label htmlFor="message" className="block text-[11px] font-medium text-gray-400 mb-2 tracking-widest uppercase">
                    Tell us about your project
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    required
                    maxLength={500}
                    rows={5}
                    className="w-full px-5 py-3.5 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/60 outline-none transition-all resize-none text-white placeholder-gray-500 text-xs"
                    placeholder="Describe your vision, goals, or any details you'd like to share..."
                  />
                  <p className={`text-[11px] mt-2 text-right transition-colors ${formData.message.length > 480 ? 'text-red-400' : 'text-gray-500'}`}>
                    {formData.message.length}/500
                  </p>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={status === 'sending' || formData.message.length > 500}
                  className="w-full px-8 py-4 rounded-xl text-xs font-semibold tracking-widest uppercase text-white transition-all hover:scale-[1.02] hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer"
                  style={{
                    background: 'linear-gradient(135deg, #ef4444, #f97316, #fb7185)',
                    boxShadow: '0 0 30px rgba(239,68,68,0.3)',
                  }}
                >
                  {status === 'sending' ? 'Sending...' : 'Send Message →'}
                </button>

                {status === 'success' && (
                  <div className="p-5 bg-green-900/30 border border-green-500/30 rounded-2xl text-green-400 text-sm font-medium text-center">
                    ✓ Message sent! We&apos;ll get back to you within 24 hours.
                  </div>
                )}
                {status === 'error' && (
                  <div className="p-5 bg-red-900/30 border border-red-500/30 rounded-2xl text-red-400 text-sm font-medium text-center">
                    ✗ Something went wrong. Please try again or email us directly at contact@hunacreatives.com
                  </div>
                )}
              </form>
            </motion.div>

            {/* RIGHT: Contact Info */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="space-y-6 md:space-y-8"
            >
              {/* Reach us directly */}
              <div
                className="rounded-2xl md:rounded-3xl p-6 md:p-8"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <h3 className="font-display text-lg md:text-xl font-bold text-white mb-5 md:mb-6">Reach us directly</h3>
                <div className="space-y-4 md:space-y-5">
                  <p className="text-gray-500 text-xs mb-6">Or reach us directly at</p>
                  <div className="inline-flex flex-col gap-4 text-left">
                    <a
                      href="mailto:contact@hunacreatives.com"
                      className="font-display font-semibold text-base transition-all cursor-pointer group"
                      style={{
                        background: 'linear-gradient(135deg, #f97316, #fb7185)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        filter: 'drop-shadow(0 0 8px rgba(249,115,22,0.3))',
                      }}
                      onMouseEnter={(e) => {
                        const el = e.currentTarget as HTMLAnchorElement;
                        el.style.filter = 'drop-shadow(0 0 12px rgba(249,115,22,0.5))';
                      }}
                      onMouseLeave={(e) => {
                        const el = e.currentTarget as HTMLAnchorElement;
                        el.style.filter = 'drop-shadow(0 0 8px rgba(249,115,22,0.3))';
                      }}
                    >
                      contact@hunacreatives.com
                    </a>
                    <a
                      href="tel:+6325056921"
                      className="text-gray-300 font-medium text-base hover:text-orange-400 transition-colors cursor-pointer"
                    >
                      (032) 505 6921
                    </a>
                    <span className="text-gray-300 font-medium text-base">
                      Cebu, Philippines, 6000
                    </span>
                  </div>
                  <div className="flex items-center justify-center gap-6 mt-8">
                    {[
                      { icon: 'ri-instagram-line', label: 'Instagram', href: 'https://www.instagram.com/hunacreatives/' },
                      { icon: 'ri-facebook-circle-line', label: 'Facebook', href: 'https://www.facebook.com/hunacreatives/' },
                      { icon: 'ri-linkedin-box-line', label: 'LinkedIn', href: 'https://www.linkedin.com/company/huna-creatives' },
                    ].map((s) => (
                      <a
                        key={s.label}
                        href={s.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-10 h-10 flex items-center justify-center rounded-full glass-dark text-gray-400 hover:text-orange-400 hover:border-orange-500/40 transition-all cursor-pointer text-base"
                        aria-label={s.label}
                      >
                        <i className={s.icon} />
                      </a>
                    ))}
                  </div>
                </div>
              </div>

              {/* Office Hours */}
              <div
                className="rounded-2xl md:rounded-3xl p-6 md:p-8"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <h3 className="font-display text-lg md:text-xl font-bold text-white mb-5 md:mb-6">Office Hours</h3>
                <div className="space-y-3 md:space-y-4">
                  <p className="text-white/40 text-xs md:text-sm mb-5 md:mb-6">
                    Prefer to talk? Schedule a 30-minute consultation with our team.
                  </p>
                  <a
                    href="https://calendly.com/hunacreatives/30min"
                    target="_blank"
                    rel="nofollow noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-6 md:px-8 py-2.5 md:py-3 rounded-full text-xs md:text-sm font-semibold border border-orange-400/50 text-orange-400 hover:bg-orange-500/10 transition-all duration-300 hover:scale-105 whitespace-nowrap cursor-pointer w-full md:w-auto"
                  >
                    <i className="ri-calendar-line text-base" />
                    Schedule Now
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <Footer isDark />
    </div>
  );
}