import { useState } from 'react';
import Footer from '../home/components/Footer';
import Navigation from '../../components/feature/Navigation';
import { motion } from 'framer-motion';

export default function CareersPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: '',
    portfolio: '',
    message: '',
  });
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setResumeFile(file);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (formData.message.length > 500) return;

    setStatus('sending');

    try {
      const body = new URLSearchParams();
      body.append('name', formData.name);
      body.append('email', formData.email);
      body.append('role', formData.role);
      body.append('portfolio', formData.portfolio);
      body.append('message', formData.message);
      if (resumeFile) {
        body.append('resume_filename', `[File attached: ${resumeFile.name}]`);
      }

      const res = await fetch('https://formspree.io/f/mbdaedkb', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: body.toString(),
      });

      const json = await res.json();

      if (res.ok && !json.errors) {
        setStatus('success');
        setFormData({ name: '', email: '', role: '', portfolio: '', message: '' });
        setResumeFile(null);
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] font-body">
      <Navigation />

      {/* HERO */}
      <section className="relative pt-24 pb-12 md:pt-32 md:pb-16 px-4 md:px-6 bg-[#0a0a0a] overflow-hidden">
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
                Join Our Team
                <span className="w-6 h-px bg-orange-500" />
              </span>
              <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight mb-4 md:mb-6">
                Build your career with
                <br />
                <span
                  style={{
                    background: 'linear-gradient(135deg, #ef4444 0%, #f97316 40%, #fb7185 80%, #fbbf24 100%)',
                    backgroundSize: '200% 200%',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    animation: 'gradient-shift 6s ease infinite',
                  }}
                >
                  Huna Creatives.
                </span>
              </h1>
              <p className="text-white/40 text-sm md:text-base leading-relaxed max-w-2xl mx-auto">
                At Huna Creatives, we build brands that mean something. If you're a creative who thinks boldly, works with intention, and wants to be part of something worth building — you're in the right place.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* NO OPENINGS NOTICE */}
      <section className="relative py-10 md:py-14 px-4 md:px-6 bg-[#0a0a0a]">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="rounded-2xl md:rounded-3xl p-8 md:p-10 border border-white/8 flex flex-col md:flex-row items-center gap-6 md:gap-10"
            style={{ background: '#141414', boxShadow: '0 8px 40px rgba(0,0,0,0.4)' }}
          >
            <div className="w-14 h-14 flex items-center justify-center rounded-2xl shrink-0" style={{ background: 'rgba(249,115,22,0.12)' }}>
              <i className="ri-briefcase-4-line text-2xl text-orange-400" />
            </div>
            <div>
              <h2 className="font-display text-xl md:text-2xl font-bold text-white mb-2">
                No Open Positions Right Now
              </h2>
              <p className="text-white/40 text-sm leading-relaxed">
                We're not actively hiring at the moment, but we're always growing. Check back soon — new opportunities will be posted here when they open up.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* TALENT POOL FORM */}
      <section className="relative py-12 md:py-16 lg:py-20 px-4 md:px-6 bg-[#0a0a0a]">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="relative rounded-2xl md:rounded-3xl p-6 md:p-8 lg:p-10"
            style={{
              background: '#141414',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
            }}
          >
            <div className="mb-6 md:mb-8">
              <h2 className="font-display text-xl md:text-2xl font-bold text-white mb-2">
                Join Our Talent Pool
              </h2>
              <p className="text-white/40 text-xs md:text-sm leading-relaxed">
                Huna is built by passionate creatives who love what they do. If that sounds like you, we'd love to have you in our corner — drop your details and be part of something worth building.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5">
              {/* Full Name */}
              <div>
                <label htmlFor="name" className="block text-[11px] font-medium text-gray-400 mb-2 tracking-widest uppercase">
                  Full Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-5 py-3.5 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/60 outline-none transition-all text-white placeholder-gray-500 text-xs"
                  placeholder="Your full name"
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

              {/* Role / Skill Set */}
              <div>
                <label htmlFor="role" className="block text-[11px] font-medium text-gray-400 mb-2 tracking-widest uppercase">
                  Role / Skill Set
                </label>
                <input
                  type="text"
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-5 py-3.5 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/60 outline-none transition-all text-white placeholder-gray-500 text-xs"
                  placeholder="e.g. Graphic Designer, Video Editor, Copywriter..."
                />
              </div>

              {/* Portfolio URL */}
              <div>
                <label htmlFor="portfolio" className="block text-[11px] font-medium text-gray-400 mb-2 tracking-widest uppercase">
                  Portfolio / Website URL
                </label>
                <input
                  type="url"
                  id="portfolio"
                  name="portfolio"
                  value={formData.portfolio}
                  onChange={(e) => setFormData({ ...formData, portfolio: e.target.value })}
                  className="w-full px-5 py-3.5 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/60 outline-none transition-all text-white placeholder-gray-500 text-xs"
                  placeholder="https://yourportfolio.com (optional)"
                />
              </div>

              {/* Resume / Portfolio File Upload */}
              <div>
                <label htmlFor="resumeFile" className="block text-[11px] font-medium text-gray-400 mb-2 tracking-widest uppercase">
                  Resume or Portfolio File <span className="text-white/20 normal-case tracking-normal">(optional)</span>
                </label>
                <label
                  htmlFor="resumeFile"
                  className="flex items-center gap-4 w-full px-5 py-4 bg-white/5 border border-white/10 border-dashed rounded-xl cursor-pointer hover:border-orange-500/40 hover:bg-white/[0.08] transition-all group"
                >
                  <div className="w-8 h-8 flex items-center justify-center rounded-lg shrink-0" style={{ background: 'rgba(249,115,22,0.12)' }}>
                    <i className="ri-upload-2-line text-orange-400 text-sm" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {resumeFile ? (
                      <span className="text-white text-xs truncate block">{resumeFile.name}</span>
                    ) : (
                      <span className="text-gray-500 text-xs">Click to upload PDF, DOC, or image file</span>
                    )}
                  </div>
                  {resumeFile && (
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); setResumeFile(null); }}
                      className="w-5 h-5 flex items-center justify-center text-gray-500 hover:text-red-400 transition-colors shrink-0 cursor-pointer"
                    >
                      <i className="ri-close-line text-sm" />
                    </button>
                  )}
                </label>
                <input
                  type="file"
                  id="resumeFile"
                  name="resumeFile"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <p className="text-[10px] text-white/20 mt-1.5">Accepted: PDF, DOC, DOCX, PNG, JPG</p>
              </div>

              {/* Message */}
              <div>
                <label htmlFor="message" className="block text-[11px] font-medium text-gray-400 mb-2 tracking-widest uppercase">
                  Tell Us About Yourself
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
                  placeholder="What do you do, what are you passionate about, and why would you love to work with us?"
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
                {status === 'sending' ? 'Submitting...' : 'Add Me to the Pool →'}
              </button>

              {status === 'success' && (
                <div className="p-5 bg-green-900/30 border border-green-500/30 rounded-2xl text-green-400 text-sm font-medium text-center">
                  ✓ You're in! We'll reach out when the right opportunity comes up.
                </div>
              )}
              {status === 'error' && (
                <div className="p-5 bg-red-900/30 border border-red-500/30 rounded-2xl text-red-400 text-sm font-medium text-center">
                  ✗ Something went wrong. Please try again or email us at contact@hunacreatives.com
                </div>
              )}
            </form>
          </motion.div>
        </div>
      </section>

      <Footer isDark />
    </div>
  );
}
