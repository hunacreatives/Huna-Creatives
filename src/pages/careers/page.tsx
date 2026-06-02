import { useState } from 'react';
import Footer from '../home/components/Footer';
import Navigation from '../../components/feature/Navigation';
import { useSEO } from '../../hooks/useSEO';
import { supabase } from '@/lib/supabase';

interface JobListing {
  id: string;
  title: string;
  type: string;
  shift: string;
  startDate: string;
  location: string;
  summary: string;
  whatYoullDo: string[];
  lookingFor: string[];
  niceToHave: string[];
  workSetup: string[];
  setsYouApart: string[];
  growth: string[];
}

const JOB_LISTINGS: JobListing[] = [
  {
    id: 'graphic-designer',
    title: 'Graphic Designer',
    type: 'Freelance / Project-Based',
    shift: 'Flexible',
    startDate: 'ASAP',
    location: 'Remote (Cebu-based preferred)',
    summary:
      'We\'re looking for a creative Graphic Designer to join the Huna Creatives team on a freelance basis. You\'ll work on brand identity, digital assets, social media graphics, and marketing collateral for our clients across various industries.',
    whatYoullDo: [
      'Design brand identities, logos, and visual systems for clients',
      'Create social media graphics, banners, and digital marketing assets',
      'Produce print-ready files for marketing collateral (flyers, brochures, etc.)',
      'Collaborate with our team to align visuals with client goals and brand guidelines',
      'Revise designs based on client and team feedback',
    ],
    lookingFor: [
      'At least 1–2 years of graphic design experience (agency or freelance)',
      'Strong portfolio showcasing branding, digital, and/or print work',
      'Proficient in Adobe Creative Suite (Illustrator, Photoshop, InDesign)',
      'Good communication and ability to meet deadlines',
      'Eye for typography, color, and layout',
    ],
    niceToHave: [
      'Experience with Figma or Canva Pro',
      'Motion graphics or basic video editing skills',
      'Familiarity with social media content formats',
      'Experience working with local or international brands',
    ],
    workSetup: [
      'Fully remote — work from anywhere',
      'Flexible hours, output-based',
      'Project-based engagement with potential for long-term collaboration',
      'Communication via Slack and project management tools',
    ],
    setsYouApart: [
      'You think beyond aesthetics — you design with purpose',
      'You can handle multiple projects without dropping quality',
      'You take feedback well and iterate fast',
      'You bring ideas to the table, not just execution',
    ],
    growth: [
      'Ongoing project work as we grow our client roster',
      'Opportunity to become a core creative team member',
      'Exposure to diverse industries and brand challenges',
      'Direct collaboration with the creative director',
    ],
  },
];

const HAS_OPENINGS = JOB_LISTINGS.length > 0;

export default function CareersPage() {
  useSEO({
    title: 'Careers at Huna Creatives — Join Our Creative Team',
    description:
      'Looking for a creative career in Cebu? Huna Creatives is looking for designers, strategists, and creatives who love what they do. View open roles.',
    canonical: '/careers',
  });

  const [selectedJob, setSelectedJob] = useState<JobListing | null>(
    HAS_OPENINGS ? JOB_LISTINGS[0] : null
  );
  const [formData, setFormData] = useState({ name: '', email: '', role: '', rate: '', message: '' });

  const [portfolioLink, setPortfolioLink] = useState('');
  const [resumeMode, setResumeMode] = useState<'upload' | 'link'>('upload');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeLink, setResumeLink] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const portfolioRequired = !selectedJob || selectedJob.id === 'graphic-designer';
  const portfolioProvided = portfolioLink.trim().length > 0;
  const resumeProvided = resumeMode === 'upload' ? !!resumeFile : resumeLink.trim().length > 0;
  const canSubmit = resumeProvided && (portfolioProvided || !portfolioRequired) && formData.rate.trim().length > 0;

  const resetForm = () => {
    setFormData({ name: '', email: '', role: '', rate: '', message: '' });
    setPortfolioLink('');
    setResumeFile(null);
    setResumeLink('');
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (formData.message.length > 500 || !canSubmit) return;
    setStatus('sending');
    setErrorMsg('');

    try {
      const roleValue = HAS_OPENINGS && selectedJob ? selectedJob.title : formData.role;

      // Read resume file as base64 if uploaded
      let resume_base64: string | undefined;
      let resume_filename: string | undefined;
      let resume_mime: string | undefined;
      if (resumeMode === 'upload' && resumeFile) {
        const buffer = await resumeFile.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        resume_base64 = btoa(binary);
        resume_filename = resumeFile.name;
        resume_mime = resumeFile.type;
      }

      const { error } = await supabase.functions.invoke('submit-careers', {
        body: {
          name: formData.name,
          email: formData.email,
          role: roleValue || undefined,
          expected_rate: formData.rate,
          portfolio_link: portfolioLink.trim() || undefined,
          resume_link: resumeMode === 'link' ? resumeLink.trim() || undefined : undefined,
          resume_base64,
          resume_filename,
          resume_mime,
          message: formData.message,
        },
      });

      if (!error) {
        setStatus('success');
        resetForm();
      } else {
        setErrorMsg(error.message ?? 'Submission failed. Please try again.');
        setStatus('error');
      }
    } catch {
      setErrorMsg('Network error. Please check your connection and try again.');
      setStatus('error');
    }
  };

  // Inline portfolio JSX — NOT a sub-component to avoid focus loss
  const portfolioJSX = (id: string) => (
    <div>
      <label htmlFor={id} className="block text-[11px] font-medium text-gray-400 mb-2 tracking-widest uppercase">
        Portfolio Link{' '}
        {portfolioRequired
          ? <span className="text-orange-400/70 normal-case tracking-normal font-normal">*required</span>
          : <span className="text-white/20 normal-case tracking-normal font-normal">(optional)</span>}
      </label>
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center pointer-events-none">
          <i className="ri-link text-orange-400/60 text-sm" />
        </div>
        <input
          type="text"
          id={id}
          value={portfolioLink}
          onChange={(e) => setPortfolioLink(e.target.value)}
          className={`w-full pl-10 pr-5 py-3.5 bg-white/5 border rounded-xl focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/60 outline-none transition-all text-white placeholder-gray-500 text-xs ${portfolioLink.trim() ? 'border-orange-500/30' : 'border-white/10'}`}
          placeholder="behance.net/you, dribbble.com/you, drive.google.com/..."
        />
      </div>
      <p className="text-[10px] text-white/25 mt-1.5">Share a Google Drive folder, Behance, Dribbble, or any public portfolio link</p>
    </div>
  );

  // Inline resume JSX — NOT a sub-component to avoid focus loss
  const resumeJSX = (uploadId: string) => (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-[11px] font-medium text-gray-400 tracking-widest uppercase">
          Resume / CV <span className="text-orange-400/70 normal-case tracking-normal font-normal">*required</span>
        </label>
        <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <button type="button" onClick={() => setResumeMode('upload')}
            className={`px-3 py-1 rounded-md text-[10px] font-semibold tracking-wider uppercase transition-all cursor-pointer whitespace-nowrap ${resumeMode === 'upload' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'text-white/30 hover:text-white/50'}`}>
            <i className="ri-upload-2-line mr-1" />Upload PDF
          </button>
          <button type="button" onClick={() => setResumeMode('link')}
            className={`px-3 py-1 rounded-md text-[10px] font-semibold tracking-wider uppercase transition-all cursor-pointer whitespace-nowrap ${resumeMode === 'link' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'text-white/30 hover:text-white/50'}`}>
            <i className="ri-link mr-1" />Share Link
          </button>
        </div>
      </div>
      {resumeMode === 'upload' ? (
        <>
          <label htmlFor={uploadId}
            className={`flex items-center gap-4 w-full px-5 py-4 border border-dashed rounded-xl cursor-pointer transition-all ${resumeFile ? 'bg-orange-500/5 border-orange-500/30' : 'bg-white/5 border-white/10 hover:border-orange-500/40 hover:bg-white/[0.08]'}`}>
            <div className="w-8 h-8 flex items-center justify-center rounded-lg shrink-0" style={{ background: 'rgba(249,115,22,0.12)' }}>
              <i className={`text-orange-400 text-sm ${resumeFile ? 'ri-file-check-line' : 'ri-file-upload-line'}`} />
            </div>
            <div className="flex-1 min-w-0">
              {resumeFile
                ? <span className="text-white text-xs truncate block">{resumeFile.name}</span>
                : <span className="text-gray-500 text-xs">Click to upload your resume (PDF only)</span>}
            </div>
            {resumeFile && (
              <button type="button" onClick={(ev) => { ev.preventDefault(); setResumeFile(null); }}
                className="w-5 h-5 flex items-center justify-center text-gray-500 hover:text-red-400 transition-colors shrink-0 cursor-pointer">
                <i className="ri-close-line text-sm" />
              </button>
            )}
          </label>
          <input type="file" id={uploadId} accept=".pdf" onChange={(e) => setResumeFile(e.target.files?.[0] || null)} className="hidden" />
          <p className="text-[10px] text-white/25 mt-1.5">PDF only · Max 10MB</p>
        </>
      ) : (
        <>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center pointer-events-none">
              <i className="ri-link text-orange-400/60 text-sm" />
            </div>
            <input
              type="text"
              value={resumeLink}
              onChange={(e) => setResumeLink(e.target.value)}
              className={`w-full pl-10 pr-5 py-3.5 bg-white/5 border rounded-xl focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/60 outline-none transition-all text-white placeholder-gray-500 text-xs ${resumeLink.trim() ? 'border-orange-500/30' : 'border-white/10'}`}
              placeholder="drive.google.com/file/..., dropbox.com/..., or any shareable link"
            />
          </div>
          <p className="text-[10px] text-white/25 mt-1.5">Upload to Google Drive and set sharing to &quot;Anyone with the link&quot;</p>
        </>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] font-body">
      <Navigation />

      {/* HERO */}
      <section className="relative pt-32 sm:pt-36 md:pt-40 pb-16 sm:pb-20 px-4 md:px-6 bg-[#0a0a0a] overflow-hidden">
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] rounded-full bg-orange-900/15 blur-[100px] pointer-events-none" />
        <div className="max-w-6xl mx-auto relative z-10 text-center">
          <div className="inline-flex items-center gap-3 mb-5">
            <span className="w-8 h-px bg-orange-500/50" />
            <span className="text-[10px] font-medium tracking-[0.3em] uppercase text-orange-400/80">Join Our Team</span>
            <span className="w-8 h-px bg-orange-500/50" />
          </div>
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem] font-bold text-white leading-[1.1] tracking-tight mb-5">
            Build your career with{' '}
            <span className="gradient-text-animated">Huna Creatives.</span>
          </h1>
        </div>
      </section>

      {HAS_OPENINGS ? (
        <section className="relative py-16 sm:py-20 md:py-24 px-4 md:px-6 bg-[#0a0a0a]">
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-12">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-8 h-px bg-orange-500/50" />
                  <span className="text-[10px] font-medium tracking-[0.3em] uppercase text-orange-400/80">Open Roles</span>
                </div>
                <h2 className="font-display text-xl md:text-2xl lg:text-3xl font-bold text-white leading-tight">
                  We&apos;re <span className="gradient-text-animated">hiring.</span>
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-green-400 text-xs font-semibold tracking-widest uppercase">
                  {JOB_LISTINGS.length} Open Position{JOB_LISTINGS.length > 1 ? 's' : ''}
                </span>
              </div>
            </div>

            <div className="space-y-3 mb-10">
              {JOB_LISTINGS.map((job) => (
                <button key={job.id} type="button"
                  onClick={() => { const next = selectedJob?.id === job.id ? null : job; setSelectedJob(next); setPortfolioLink(''); setResumeFile(null); setResumeLink(''); setStatus('idle'); }}
                  className="w-full text-left cursor-pointer">
                  <div className={`rounded-2xl p-6 md:p-8 border transition-all ${selectedJob?.id === job.id ? 'border-orange-500/40 bg-[#1a1208]' : 'border-white/8 bg-[#141414] hover:border-white/15'}`}>
                    <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
                      <div className="w-12 h-12 flex items-center justify-center rounded-xl shrink-0" style={{ background: 'rgba(249,115,22,0.12)' }}>
                        <i className={`text-xl text-orange-400 ${job.id === 'graphic-designer' ? 'ri-palette-line' : 'ri-task-line'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <h2 className="font-display text-xl md:text-2xl font-bold text-white">{job.title}</h2>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-green-500/15 text-green-400 border border-green-500/20">Hiring</span>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1">
                          <span className="text-white/40 text-xs flex items-center gap-1.5"><i className="ri-map-pin-line text-orange-400/70" />{job.location}</span>
                          <span className="text-white/40 text-xs flex items-center gap-1.5"><i className="ri-time-line text-orange-400/70" />{job.type}</span>
                          <span className="text-white/40 text-xs flex items-center gap-1.5"><i className="ri-calendar-line text-orange-400/70" />Starts {job.startDate}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-orange-400 text-xs font-medium">{selectedJob?.id === job.id ? 'Hide details' : 'View details'}</span>
                        <i className={`ri-arrow-down-s-line text-orange-400 transition-transform ${selectedJob?.id === job.id ? 'rotate-180' : ''}`} />
                      </div>
                    </div>
                    {selectedJob?.id === job.id && (
                      <div className="mt-6 pt-6 border-t border-white/8 space-y-6">
                        <p className="text-white/40 text-sm leading-relaxed">{job.summary}</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div><h3 className="text-[11px] font-semibold tracking-widest uppercase text-orange-400 mb-3">What You&apos;ll Do</h3><ul className="space-y-2">{job.whatYoullDo.map((item) => (<li key={item} className="flex items-start gap-2.5 text-white/40 text-xs leading-relaxed"><i className="ri-arrow-right-s-line text-orange-400/60 mt-0.5 shrink-0" />{item}</li>))}</ul></div>
                          <div><h3 className="text-[11px] font-semibold tracking-widest uppercase text-orange-400 mb-3">What We&apos;re Looking For</h3><ul className="space-y-2">{job.lookingFor.map((item) => (<li key={item} className="flex items-start gap-2.5 text-white/40 text-xs leading-relaxed"><i className="ri-checkbox-circle-line text-orange-400/60 mt-0.5 shrink-0" />{item}</li>))}</ul></div>
                          <div><h3 className="text-[11px] font-semibold tracking-widest uppercase text-orange-400 mb-3">Nice to Have</h3><ul className="space-y-2">{job.niceToHave.map((item) => (<li key={item} className="flex items-start gap-2.5 text-white/40 text-xs leading-relaxed"><i className="ri-star-line text-orange-400/60 mt-0.5 shrink-0" />{item}</li>))}</ul></div>
                          <div><h3 className="text-[11px] font-semibold tracking-widest uppercase text-orange-400 mb-3">Work Setup</h3><ul className="space-y-2">{job.workSetup.map((item) => (<li key={item} className="flex items-start gap-2.5 text-white/40 text-xs leading-relaxed"><i className="ri-computer-line text-orange-400/60 mt-0.5 shrink-0" />{item}</li>))}</ul></div>
                          <div><h3 className="text-[11px] font-semibold tracking-widest uppercase text-orange-400 mb-3">What Sets You Apart</h3><ul className="space-y-2">{job.setsYouApart.map((item) => (<li key={item} className="flex items-start gap-2.5 text-white/40 text-xs leading-relaxed"><i className="ri-flashlight-line text-orange-400/60 mt-0.5 shrink-0" />{item}</li>))}</ul></div>
                          <div><h3 className="text-[11px] font-semibold tracking-widest uppercase text-orange-400 mb-3">Growth Opportunity</h3><ul className="space-y-2">{job.growth.map((item) => (<li key={item} className="flex items-start gap-2.5 text-white/40 text-xs leading-relaxed"><i className="ri-line-chart-line text-orange-400/60 mt-0.5 shrink-0" />{item}</li>))}</ul></div>
                        </div>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {selectedJob && (
              <div className="relative rounded-2xl md:rounded-3xl p-6 md:p-8 lg:p-10 fade-up fade-up-3"
                style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 8px 40px rgba(0,0,0,0.4)' }}>
                <div className="mb-6 md:mb-8">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-orange-500/15 text-orange-400 border border-orange-500/20">Applying for</span>
                    <span className="text-white font-semibold text-sm">{selectedJob.title}</span>
                  </div>
                  <h2 className="font-display text-xl md:text-2xl font-bold text-white mb-2">Submit Your Application</h2>
                  <p className="text-white/40 text-xs md:text-sm leading-relaxed">
                    {selectedJob.id === 'graphic-designer'
                      ? 'Share your portfolio as a link and upload your resume as a PDF or share a link. We review every application personally.'
                      : 'Upload your resume or share a link. Portfolio is optional but encouraged. We review every application personally.'}
                  </p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                    <div>
                      <label htmlFor="name" className="block text-[11px] font-medium text-gray-400 mb-2 tracking-widest uppercase">Full Name</label>
                      <input type="text" id="name" name="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className="w-full px-5 py-3.5 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/60 outline-none transition-all text-white placeholder-gray-500 text-xs" placeholder="Your full name" />
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-[11px] font-medium text-gray-400 mb-2 tracking-widest uppercase">Email</label>
                      <input type="email" id="email" name="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required className="w-full px-5 py-3.5 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/60 outline-none transition-all text-white placeholder-gray-500 text-xs" placeholder="your@email.com" />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="rate" className="block text-[11px] font-medium text-gray-400 mb-2 tracking-widest uppercase">
                      Expected Service Rate <span className="text-orange-400/70 normal-case tracking-normal font-normal">*required</span>
                    </label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center pointer-events-none">
                        <i className="ri-money-dollar-circle-line text-orange-400/60 text-sm" />
                      </div>
                      <input type="text" id="rate" name="rate" value={formData.rate} onChange={(e) => setFormData({ ...formData, rate: e.target.value })} required className="w-full pl-10 pr-5 py-3.5 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/60 outline-none transition-all text-white placeholder-gray-500 text-xs" placeholder="e.g. ₱500/hr, ₱25,000/mo, $5/hr..." />
                    </div>
                    <p className="text-[10px] text-white/25 mt-1.5">Enter your expected rate in any format you prefer</p>
                  </div>
                  {portfolioJSX('portfolioLink')}
                  {resumeJSX('resumeFile')}
                  <div>
                    <label htmlFor="message" className="block text-[11px] font-medium text-gray-400 mb-2 tracking-widest uppercase">Why Are You a Great Fit?</label>
                    <textarea id="message" name="message" value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} required maxLength={500} rows={5} className="w-full px-5 py-3.5 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/60 outline-none transition-all resize-none text-white placeholder-gray-500 text-xs" placeholder="Tell us about your experience and why this role excites you..." />
                    <p className={`text-[11px] mt-2 text-right transition-colors ${formData.message.length > 480 ? 'text-red-400' : 'text-gray-500'}`}>{formData.message.length}/500</p>
                  </div>
                  <button type="submit" disabled={status === 'sending' || formData.message.length > 500 || !canSubmit}
                    className="w-full px-8 py-4 rounded-xl text-xs font-semibold tracking-widest uppercase text-white transition-all hover:scale-[1.02] hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer"
                    style={{ background: 'linear-gradient(135deg, #ef4444, #f97316, #fb7185)', boxShadow: '0 0 30px rgba(239,68,68,0.3)' }}>
                    {status === 'sending' ? 'Submitting...' : `Apply for ${selectedJob.title} →`}
                  </button>
                  {status === 'success' && <div className="p-5 bg-green-900/30 border border-green-500/30 rounded-2xl text-green-400 text-sm font-medium text-center">✓ Application received! We&apos;ll be in touch soon.</div>}
                  {status === 'error' && <div className="p-5 bg-red-900/30 border border-red-500/30 rounded-2xl text-red-400 text-sm font-medium text-center">✗ {errorMsg || 'Something went wrong. Please try again or email us at contact@hunacreatives.com'}</div>}
                </form>
              </div>
            )}
          </div>
        </section>
      ) : (
        <>
          <section className="relative py-10 md:py-14 px-4 md:px-6 bg-[#0a0a0a]">
            <div className="max-w-5xl mx-auto">
              <div className="rounded-2xl md:rounded-3xl p-8 md:p-10 border border-white/8 flex flex-col md:flex-row items-center gap-6 md:gap-10 fade-up fade-up-2"
                style={{ background: '#141414', boxShadow: '0 8px 40px rgba(0,0,0,0.4)' }}>
                <div className="w-14 h-14 flex items-center justify-center rounded-2xl shrink-0" style={{ background: 'rgba(249,115,22,0.12)' }}>
                  <i className="ri-briefcase-4-line text-2xl text-orange-400" />
                </div>
                <div>
                  <h2 className="font-display text-xl md:text-2xl font-bold text-white mb-2">No Open Positions Right Now</h2>
                  <p className="text-white/40 text-sm leading-relaxed">We&apos;re not actively hiring at the moment, but we&apos;re always growing. Check back soon — new opportunities will be posted here when they open up.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="relative py-12 md:py-16 lg:py-20 px-4 md:px-6 bg-[#0a0a0a]">
            <div className="max-w-5xl mx-auto">
              <div className="relative rounded-2xl md:rounded-3xl p-6 md:p-8 lg:p-10 fade-up fade-up-3"
                style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 8px 40px rgba(0,0,0,0.4)' }}>
                <div className="mb-6 md:mb-8">
                  <span className="inline-flex items-center gap-2 text-[10px] font-semibold tracking-widest uppercase text-white/30 mb-3">
                    <i className="ri-user-star-line" />Talent Pool
                  </span>
                  <h2 className="font-display text-xl md:text-2xl font-bold text-white mb-2">Get on Our Radar</h2>
                  <p className="text-white/40 text-xs md:text-sm leading-relaxed">No roles open right now — but we&apos;re always growing. Drop your details and we&apos;ll reach out when something fits.</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                    <div>
                      <label htmlFor="nameTalent" className="block text-[11px] font-medium text-gray-400 mb-2 tracking-widest uppercase">Full Name</label>
                      <input type="text" id="nameTalent" name="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className="w-full px-5 py-3.5 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/60 outline-none transition-all text-white placeholder-gray-500 text-xs" placeholder="Your full name" />
                    </div>
                    <div>
                      <label htmlFor="emailTalent" className="block text-[11px] font-medium text-gray-400 mb-2 tracking-widest uppercase">Email</label>
                      <input type="email" id="emailTalent" name="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required className="w-full px-5 py-3.5 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/60 outline-none transition-all text-white placeholder-gray-500 text-xs" placeholder="your@email.com" />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="roleTalent" className="block text-[11px] font-medium text-gray-400 mb-2 tracking-widest uppercase">Role / Skill Set</label>
                    <input type="text" id="roleTalent" name="role" value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="w-full px-5 py-3.5 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/60 outline-none transition-all text-white placeholder-gray-500 text-xs" placeholder="e.g. Graphic Designer, Video Editor, Copywriter..." />
                  </div>
                  <div>
                    <label htmlFor="rateTalent" className="block text-[11px] font-medium text-gray-400 mb-2 tracking-widest uppercase">
                      Expected Service Rate <span className="text-orange-400/70 normal-case tracking-normal font-normal">*required</span>
                    </label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center pointer-events-none">
                        <i className="ri-money-dollar-circle-line text-orange-400/60 text-sm" />
                      </div>
                      <input type="text" id="rateTalent" name="rate" value={formData.rate} onChange={(e) => setFormData({ ...formData, rate: e.target.value })} required className="w-full pl-10 pr-5 py-3.5 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/60 outline-none transition-all text-white placeholder-gray-500 text-xs" placeholder="e.g. ₱500/hr, ₱25,000/mo, $5/hr..." />
                    </div>
                    <p className="text-[10px] text-white/25 mt-1.5">Enter your expected rate in any format you prefer</p>
                  </div>
                  {portfolioJSX('portfolioLinkTalent')}
                  {resumeJSX('resumeFileTalent')}
                  <div>
                    <label htmlFor="messageTalent" className="block text-[11px] font-medium text-gray-400 mb-2 tracking-widest uppercase">Tell Us About Yourself</label>
                    <textarea id="messageTalent" name="message" value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} required maxLength={500} rows={5} className="w-full px-5 py-3.5 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/60 outline-none transition-all resize-none text-white placeholder-gray-500 text-xs" placeholder="What do you do, what are you passionate about, and why would you love to work with us?" />
                    <p className={`text-[11px] mt-2 text-right transition-colors ${formData.message.length > 480 ? 'text-red-400' : 'text-gray-500'}`}>{formData.message.length}/500</p>
                  </div>
                  <button type="submit" disabled={status === 'sending' || formData.message.length > 500 || !canSubmit}
                    className="w-full px-8 py-4 rounded-xl text-xs font-semibold tracking-widest uppercase text-white transition-all hover:scale-[1.02] hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer"
                    style={{ background: 'linear-gradient(135deg, #ef4444, #f97316, #fb7185)', boxShadow: '0 0 30px rgba(239,68,68,0.3)' }}>
                    {status === 'sending' ? 'Submitting...' : 'Add Me to the Pool →'}
                  </button>
                  {status === 'success' && <div className="p-5 bg-green-900/30 border border-green-500/30 rounded-2xl text-green-400 text-sm font-medium text-center">✓ You&apos;re in! We&apos;ll reach out when the right opportunity comes up.</div>}
                  {status === 'error' && <div className="p-5 bg-red-900/30 border border-red-500/30 rounded-2xl text-red-400 text-sm font-medium text-center">✗ {errorMsg || 'Something went wrong. Please try again or email us at contact@hunacreatives.com'}</div>}
                </form>
              </div>
            </div>
          </section>
        </>
      )}

      <Footer isDark />
    </div>
  );
}
