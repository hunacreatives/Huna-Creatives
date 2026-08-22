import { useEffect, useState } from 'react';
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
  whatYouBring: string[];
  whyJoinUs: string[];
  portfolioRequired: boolean;
}

const MAX_RESUME_SIZE_BYTES = 10 * 1024 * 1024;

// Shared by both the mobile grid and the desktop scrapbook cluster in the
// hero, so there's one list of who's on the team rather than two copies that
// can drift out of sync.
const teamPhotos = [
  { src: 'team-francis-fiel-roble.webp', alt: 'Francis', rotate: -8, y: 4 },
  { src: 'team-angela-ando.webp', alt: 'Angela', rotate: 6, y: -3 },
  { src: 'team-katleen-nellas.webp', alt: 'Katleen', rotate: -4, y: 6 },
  { src: 'team-abigail-duterte.webp', alt: 'Abigail', rotate: 7, y: -2 },
  { src: 'team-jesse-catedral.png', alt: 'Jesse', rotate: -6, y: 4 },
  { src: 'team-reeva-jumawan.webp', alt: 'Reeva', rotate: 5, y: -3 },
  { src: 'team-reese-jumawan.webp', alt: 'Reese', rotate: -7, y: 4 },
  { src: 'team-thamara-ong.webp', alt: 'Thamara', rotate: 4, y: -2 },
  { src: 'team-claudy-tahil.png', alt: 'Claudy', rotate: -5, y: 3 },
];

export default function CareersPage() {
  useSEO({
    title: 'Careers at Huna Creatives — Join Our Creative Team',
    description:
      'Looking for a creative career in Cebu? Huna Creatives is looking for designers, strategists, and creatives who love what they do. View open roles.',
    canonical: '/careers',
  });

  const [jobListings, setJobListings] = useState<JobListing[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const hasOpenings = jobListings.length > 0;

  const [selectedJob, setSelectedJob] = useState<JobListing | null>(null);
  const [applyingJobId, setApplyingJobId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', email: '', role: '', rate: '', message: '' });

  const [portfolioLink, setPortfolioLink] = useState('');
  const [resumeMode, setResumeMode] = useState<'upload' | 'link'>('upload');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeLink, setResumeLink] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('hub_job_postings')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')
        .order('created_at');

      const mapped: JobListing[] = (data ?? []).map((j: any) => ({
        id: j.id,
        title: j.title,
        type: j.type,
        shift: j.shift,
        startDate: j.start_date,
        location: j.location,
        summary: j.summary,
        whatYoullDo: j.what_youll_do ?? [],
        whatYouBring: j.what_you_bring ?? [],
        whyJoinUs: j.why_join_us ?? [],
        portfolioRequired: j.portfolio_required,
      }));
      setJobListings(mapped);
      setSelectedJob(mapped[0] ?? null);
      setJobsLoading(false);
    })();
  }, []);

  const activeJob = hasOpenings ? jobListings.find((job) => job.id === applyingJobId) ?? null : null;
  const portfolioRequired = activeJob?.portfolioRequired ?? false;
  const portfolioProvided = portfolioLink.trim().length > 0;
  const resumeProvided = resumeMode === 'upload' ? !!resumeFile : resumeLink.trim().length > 0;
  const canSubmit = resumeProvided && (portfolioProvided || !portfolioRequired) && formData.rate.trim().length > 0;

  const resetForm = () => {
    setFormData({ name: '', email: '', role: '', rate: '', message: '' });
    setPortfolioLink('');
    setResumeFile(null);
    setResumeLink('');
  };

  const resetApplicationState = () => {
    resetForm();
    setResumeMode('upload');
    setStatus('idle');
    setErrorMsg('');
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if ((hasOpenings && !activeJob) || formData.message.length > 500 || !canSubmit) return;
    setStatus('sending');
    setErrorMsg('');

    try {
      const roleValue = hasOpenings && activeJob ? activeJob.title : formData.role;

      // Read resume file as base64 if uploaded
      let resume_base64: string | undefined;
      let resume_filename: string | undefined;
      let resume_mime: string | undefined;
      if (resumeMode === 'upload' && resumeFile) {
        if (resumeFile.size > MAX_RESUME_SIZE_BYTES) {
          setErrorMsg('Resume file is too large. Please upload a PDF under 10MB.');
          setStatus('error');
          return;
        }
        const buffer = await resumeFile.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        resume_base64 = btoa(binary);
        resume_filename = resumeFile.name;
        resume_mime = resumeFile.type;
      }

      const invokePromise = supabase.functions.invoke('submit-careers', {
        body: {
          name: formData.name,
          email: formData.email,
          role: roleValue || undefined,
          job_id: activeJob?.id || undefined,
          expected_rate: formData.rate,
          portfolio_link: portfolioLink.trim() || undefined,
          resume_link: resumeMode === 'link' ? resumeLink.trim() || undefined : undefined,
          resume_base64,
          resume_filename,
          resume_mime,
          message: formData.message,
        },
      });

      const timeoutPromise = new Promise<never>((_, reject) => {
        window.setTimeout(() => reject(new Error('Submission timed out. Please try again.')), 60000);
      });

      const { error } = await Promise.race([invokePromise, timeoutPromise]);

      if (!error) {
        setStatus('success');
        resetForm();
      } else {
        setErrorMsg(error.message ?? 'Submission failed. Please try again.');
        setStatus('error');
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Network error. Please check your connection and try again.');
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
          : <span className="text-[#243037]/20 normal-case tracking-normal font-normal">(optional)</span>}
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
          className={`w-full pl-10 pr-5 py-3.5 bg-white/80 border rounded-xl shadow-sm focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/60 outline-none transition-all text-[#243037] placeholder-gray-400 text-base sm:text-xs ${portfolioLink.trim() ? 'border-orange-500/30' : 'border-[#243037]/10'}`}
          placeholder="behance.net/you, dribbble.com/you, drive.google.com/..."
        />
      </div>
      <p className="text-[10px] text-[#243037]/25 mt-1.5">Share a Google Drive folder, Behance, Dribbble, or any public portfolio link</p>
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
            className={`px-3 py-1 rounded-md text-[10px] font-semibold tracking-wider uppercase transition-all cursor-pointer whitespace-nowrap ${resumeMode === 'upload' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'text-[#243037]/30 hover:text-[#243037]/50'}`}>
            <i className="ri-upload-2-line mr-1" />Upload PDF
          </button>
          <button type="button" onClick={() => setResumeMode('link')}
            className={`px-3 py-1 rounded-md text-[10px] font-semibold tracking-wider uppercase transition-all cursor-pointer whitespace-nowrap ${resumeMode === 'link' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'text-[#243037]/30 hover:text-[#243037]/50'}`}>
            <i className="ri-link mr-1" />Share Link
          </button>
        </div>
      </div>
      {resumeMode === 'upload' ? (
        <>
          <label htmlFor={uploadId}
            className={`flex items-center gap-4 w-full px-5 py-4 border border-dashed rounded-xl cursor-pointer transition-all ${resumeFile ? 'bg-orange-500/5 border-orange-500/30' : 'bg-black/[0.03] border-[#243037]/10 hover:border-orange-500/40 hover:bg-black/[0.05]'}`}>
            <div className="w-8 h-8 flex items-center justify-center rounded-lg shrink-0" style={{ background: 'rgba(249,115,22,0.12)' }}>
              <i className={`text-orange-400 text-sm ${resumeFile ? 'ri-file-check-line' : 'ri-file-upload-line'}`} />
            </div>
            <div className="flex-1 min-w-0">
              {resumeFile
                ? <span className="text-[#243037] text-xs truncate block">{resumeFile.name}</span>
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
          <p className="text-[10px] text-[#243037]/25 mt-1.5">PDF only · Max 10MB</p>
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
              className={`w-full pl-10 pr-5 py-3.5 bg-white/80 border rounded-xl shadow-sm focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/60 outline-none transition-all text-[#243037] placeholder-gray-400 text-base sm:text-xs ${resumeLink.trim() ? 'border-orange-500/30' : 'border-[#243037]/10'}`}
              placeholder="drive.google.com/file/..., dropbox.com/..., or any shareable link"
            />
          </div>
          <p className="text-[10px] text-[#243037]/25 mt-1.5">Upload to Google Drive and set sharing to &quot;Anyone with the link&quot;</p>
        </>
      )}
    </div>
  );

  const applicationFormJSX = (job: JobListing) => (
    <div
      className="mt-6 rounded-2xl md:rounded-3xl p-6 md:p-8 lg:p-10"
      style={{ background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(20px) saturate(160%)', WebkitBackdropFilter: 'blur(20px) saturate(160%)', border: '1px solid rgba(255,255,255,0.6)', boxShadow: '0 8px 32px rgba(36,48,55,0.08)' }}
    >
      <div className="mb-6 md:mb-8">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-orange-500/15 text-orange-400 border border-orange-500/20">
            Applying for
          </span>
          <span className="text-[#243037] font-semibold text-sm">{job.title}</span>
          <span className="text-[#243037]/25 text-xs">•</span>
          <span className="text-[#243037]/45 text-xs">{job.type}</span>
        </div>
        <h2 className="font-display text-xl md:text-2xl font-bold text-[#243037] mb-2">
          Submit Your {job.title} Application
        </h2>
        <p className="text-[#243037]/40 text-xs md:text-sm leading-relaxed">
          {job.portfolioRequired
            ? `This application is specifically for the ${job.title} role. Share your portfolio and resume so we can review your fit clearly.`
            : `This application is specifically for the ${job.title} role. Share your resume and tell us about your experience.`}
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
          <div>
            <label htmlFor={`name-${job.id}`} className="block text-[11px] font-medium text-gray-400 mb-2 tracking-widest uppercase">Full Name</label>
            <input type="text" id={`name-${job.id}`} name="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className="w-full px-5 py-3.5 bg-white/80 border border-[#243037]/15 shadow-sm rounded-xl focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/60 outline-none transition-all text-[#243037] placeholder-gray-400 text-base sm:text-xs" placeholder="Your full name" />
          </div>
          <div>
            <label htmlFor={`email-${job.id}`} className="block text-[11px] font-medium text-gray-400 mb-2 tracking-widest uppercase">Email</label>
            <input type="email" id={`email-${job.id}`} name="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required className="w-full px-5 py-3.5 bg-white/80 border border-[#243037]/15 shadow-sm rounded-xl focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/60 outline-none transition-all text-[#243037] placeholder-gray-400 text-base sm:text-xs" placeholder="your@email.com" />
          </div>
        </div>
        <div>
          <label htmlFor={`rate-${job.id}`} className="block text-[11px] font-medium text-gray-400 mb-2 tracking-widest uppercase">
            Expected Service Rate <span className="text-orange-400/70 normal-case tracking-normal font-normal">*required</span>
          </label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center pointer-events-none">
              <i className="ri-money-dollar-circle-line text-orange-400/60 text-sm" />
            </div>
            <input type="text" id={`rate-${job.id}`} name="rate" value={formData.rate} onChange={(e) => setFormData({ ...formData, rate: e.target.value })} required className="w-full pl-10 pr-5 py-3.5 bg-white/80 border border-[#243037]/15 shadow-sm rounded-xl focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/60 outline-none transition-all text-[#243037] placeholder-gray-400 text-base sm:text-xs" placeholder="e.g. ₱500/hr, ₱25,000/mo, $5/hr..." />
          </div>
          <p className="text-[10px] text-[#243037]/25 mt-1.5">Enter your expected rate in any format you prefer</p>
        </div>
        {portfolioJSX(`portfolioLink-${job.id}`)}
        {resumeJSX(`resumeFile-${job.id}`)}
        <div>
          <label htmlFor={`message-${job.id}`} className="block text-[11px] font-medium text-gray-400 mb-2 tracking-widest uppercase">Why Are You a Great Fit?</label>
          <textarea id={`message-${job.id}`} name="message" value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} required maxLength={500} rows={5} className="w-full px-5 py-3.5 bg-white/80 border border-[#243037]/15 shadow-sm rounded-xl focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/60 outline-none transition-all resize-none text-[#243037] placeholder-gray-400 text-base sm:text-xs" placeholder="Tell us about your experience and why this role excites you..." />
          <p className={`text-[11px] mt-2 text-right transition-colors ${formData.message.length > 480 ? 'text-red-400' : 'text-gray-500'}`}>{formData.message.length}/500</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button type="submit" disabled={status === 'sending' || formData.message.length > 500 || !canSubmit}
            className="flex-1 px-8 py-4 rounded-xl text-[13px] sm:text-xs font-semibold tracking-widest uppercase text-white transition-all hover:scale-[1.02] hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer"
            style={{ background: 'linear-gradient(135deg, #ef4444, #f97316, #fb7185)', boxShadow: '0 0 30px rgba(239,68,68,0.3)' }}>
            {status === 'sending' ? 'Submitting...' : `Apply for ${job.title} →`}
          </button>
          <button
            type="button"
            onClick={() => {
              setApplyingJobId(null);
              resetApplicationState();
            }}
            className="px-5 py-4 rounded-xl text-xs font-semibold tracking-widest uppercase text-[#243037]/60 border border-[#243037]/10 hover:text-[#243037] hover:border-[#243037]/20 transition-all cursor-pointer"
          >
            Cancel
          </button>
        </div>
        {status === 'success' && <div className="p-5 bg-green-900/30 border border-green-500/30 rounded-2xl text-green-400 text-sm font-medium text-center">✓ Application received! We&apos;ll be in touch soon.</div>}
        {status === 'error' && <div className="p-5 bg-red-900/30 border border-red-500/30 rounded-2xl text-red-400 text-sm font-medium text-center">✗ {errorMsg || 'Something went wrong. Please try again or email us at contact@hunacreatives.com'}</div>}
      </form>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F5F5F5] font-body">
      <Navigation invertOnScroll />

      {/* Same continuous orb field used on About/Services — one wrapper
          spanning the whole page so the glass cards below actually have
          color behind them to blur. */}
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute top-[-15%] -left-[15%] w-[900px] h-[900px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(255,91,5,0.16), transparent 72%)', filter: 'blur(70px)', animation: 'orb-float-a 22s ease-in-out infinite' }} />
        <div className="pointer-events-none absolute top-[6%] -right-[15%] w-[820px] h-[820px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(7,80,86,0.4), transparent 72%)', filter: 'blur(70px)', animation: 'orb-float-b 26s ease-in-out infinite' }} />
        <div className="pointer-events-none absolute top-[28%] left-[38%] w-[620px] h-[620px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(211,221,222,0.5), transparent 72%)', filter: 'blur(70px)', animation: 'orb-float-c 20s ease-in-out infinite' }} />
        <div className="pointer-events-none absolute top-[48%] -left-[10%] w-[760px] h-[760px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(7,80,86,0.4), transparent 72%)', filter: 'blur(70px)', animation: 'orb-float-c 24s ease-in-out infinite' }} />
        <div className="pointer-events-none absolute top-[68%] right-[5%] w-[900px] h-[900px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(255,138,71,0.18), transparent 72%)', filter: 'blur(70px)', animation: 'orb-float-d 28s ease-in-out infinite' }} />
        <div className="pointer-events-none absolute top-[80%] left-[8%] w-[560px] h-[560px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(7,80,86,0.32), transparent 72%)', filter: 'blur(70px)', animation: 'orb-float-b 23s ease-in-out infinite' }} />
        <div className="pointer-events-none absolute top-[92%] left-1/3 w-[850px] h-[850px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(7,80,86,0.34), transparent 72%)', filter: 'blur(70px)', animation: 'orb-float-a 25s ease-in-out infinite' }} />

      {/* HERO — breadcrumb + centered headline + scattered photo collage */}
      <section className="relative pt-24 sm:pt-28 pb-16 sm:pb-24 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto relative z-10 text-center">
          <div className="flex items-center justify-center gap-2 text-[10px] font-medium tracking-[0.25em] uppercase text-[#075056] mb-5">
            <span>Careers</span>
          </div>
          <h1 className="text-2xl sm:text-2xl md:text-3xl lg:text-4xl font-bold font-display leading-tight text-[#243037]">
            Build your career with<br />Huna Creatives.
          </h1>
          <p className="text-[15px] sm:text-sm text-[#243037]/55 leading-relaxed max-w-md mx-auto mt-4">
            Join a small, tight-knit team of designers and strategists building brands people remember.
          </p>
        </div>

        {/* Mobile — a real grid, not the scrapbook. The old markup laid all 10
            photos out with `flex-wrap`, which wraps wherever the row happens
            to run out of width rather than at a fixed count — so on a phone
            it broke unpredictably (e.g. 4-then-1), leaving the last one or two
            stranded alone on their own row. A fixed per-row width guarantees an
            even layout regardless of viewport width. No rotation,
            overlap, or floating decoration here — those are sm+ only anyway
            (see the quote bubbles/stickers below), so mobile was already
            meant to be the plain version; the photos just hadn't caught up. */}
        <div className="sm:hidden mt-10 px-4">
          {/* 9 photos at 3-per-row divides evenly into 3 full rows. Kept as
              flex-wrap + justify-center rather than a plain grid so that if
              the roster count changes again, an incomplete last row centers
              itself instead of sitting stuck on the left. */}
          <div className="flex flex-wrap justify-center gap-1.5">
            {teamPhotos.map((p) => (
              <img
                key={p.src}
                src={`/images/${p.src}`}
                alt={`${p.alt}, Huna Creatives team`}
                className="w-[calc(33.333%-0.25rem)] aspect-[3/4] object-cover object-top rounded-lg shadow-sm"
              />
            ))}
          </div>
        </div>

        <div className="hidden sm:flex justify-center mt-32">
        <div className="relative inline-block">
          {/* Dense scrapbook cluster — negative space-x/margin overlap
              guarantees photos actually touch, rather than hand-picked
              percentages that leave gaps. Two rows, second pulled up to
              overlap the first. This wrapper is `inline-block` (shrink-wraps
              to the cluster's actual rendered size) so the quote bubble and
              icons below, anchored to ITS edges, land at the cluster's real
              corners instead of a wider container's edges. */}
          <div className="flex flex-wrap justify-center space-x-1">
            {teamPhotos.slice(0, 5).map((p) => (
              <img
                key={p.src}
                src={`/images/${p.src}`}
                alt={`${p.alt}, Huna Creatives team`}
                className="w-44 h-56 object-cover object-top rounded-xl shadow-lg flex-shrink-0"
                style={{ transform: `rotate(${p.rotate}deg) translateY(${p.y}px)`, animation: `float-gentle ${8 + Math.abs(p.rotate) * 0.3}s ease-in-out infinite ${Math.abs(p.y) * 0.05}s` }}
              />
            ))}
          </div>
          <div className="flex flex-wrap justify-center space-x-1 mt-3">
            {teamPhotos.slice(5).map((p) => (
              <img
                key={p.src}
                src={`/images/${p.src}`}
                alt={`${p.alt}, Huna Creatives team`}
                className="w-44 h-56 object-cover object-top rounded-xl shadow-lg flex-shrink-0"
                style={{ transform: `rotate(${p.rotate}deg) translateY(${p.y}px)`, animation: `float-gentle ${8 + Math.abs(p.rotate) * 0.3}s ease-in-out infinite ${Math.abs(p.y) * 0.05}s` }}
              />
            ))}
          </div>

          {/* Floating quote bubbles */}
          <div
            className="hidden sm:flex absolute -top-10 -left-36 max-w-[190px] items-start gap-2 rounded-2xl rounded-bl-sm px-4 py-3"
            style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(16px) saturate(160%)', WebkitBackdropFilter: 'blur(16px) saturate(160%)', boxShadow: '0 8px 24px rgba(36,48,55,0.15)', transform: 'rotate(-5deg)', animation: 'float-gentle 9s ease-in-out infinite', zIndex: 6 }}
          >
            <i className="ri-double-quotes-l text-[#FF5B05] text-lg leading-none flex-shrink-0" />
            <p className="text-[11px] text-[#243037]/70 leading-snug">
              We merge creativity with strategy to build brands that turn heads.
            </p>
          </div>

          <div
            className="hidden sm:flex absolute -bottom-12 -right-36 max-w-[190px] items-start gap-2 rounded-2xl rounded-tr-sm px-4 py-3"
            style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(16px) saturate(160%)', WebkitBackdropFilter: 'blur(16px) saturate(160%)', boxShadow: '0 8px 24px rgba(36,48,55,0.15)', transform: 'rotate(4deg)', animation: 'float-gentle 10s ease-in-out infinite 0.7s', zIndex: 6 }}
          >
            <i className="ri-double-quotes-l text-[#075056] text-lg leading-none flex-shrink-0" />
            <p className="text-[11px] text-[#243037]/70 leading-snug">
              Small team, big craft — every brand gets our full attention.
            </p>
          </div>

          {/* Fun floating icons/emoji at the cluster's own corners — kept
              clear of both quote bubbles (top-left and bottom-right) */}
          <span className="hidden sm:block absolute -top-3 -right-2 text-3xl" style={{ transform: 'rotate(10deg)', animation: 'float-gentle 7.5s ease-in-out infinite 0.2s', zIndex: 6 }}>🎨</span>
          <span className="hidden sm:block absolute -bottom-2 left-8 text-2xl" style={{ transform: 'rotate(6deg)', animation: 'float-gentle 8s ease-in-out infinite 1.1s', zIndex: 6 }}>✨</span>
          <span className="hidden sm:block absolute top-1/3 -left-5 text-[1.6875rem]" style={{ transform: 'rotate(-8deg)', animation: 'float-gentle 9s ease-in-out infinite 0.9s', zIndex: 6 }}>🦄</span>
          <span className="hidden sm:block absolute top-6 -left-6 text-2xl" style={{ transform: 'rotate(8deg)', animation: 'float-gentle 8.5s ease-in-out infinite 1.4s', zIndex: 6 }}>🎉</span>
          <span className="hidden sm:block absolute top-1/2 -right-5 text-[1.6875rem]" style={{ transform: 'rotate(6deg)', animation: 'float-gentle 10s ease-in-out infinite 0.4s', zIndex: 6 }}>🚀</span>
          <span className="hidden sm:block absolute bottom-6 -right-6 text-2xl" style={{ transform: 'rotate(-6deg)', animation: 'float-gentle 7.8s ease-in-out infinite 1.7s', zIndex: 6 }}>⭐</span>
        </div>
        </div>
      </section>

      {/* WHY JOIN US */}
      <section className="relative py-16 sm:py-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="max-w-xl mb-10">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-[11px] font-medium tracking-[0.3em] uppercase text-[#075056]">Why Join Us</span>
            </div>
            <h2 className="font-display text-2xl md:text-2xl lg:text-3xl font-bold text-[#243037] leading-tight mb-3">
              A team that values your growth, craft, and well-being.
            </h2>
            <p className="text-[15px] sm:text-sm text-[#243037]/55 leading-relaxed">
              A small studio means real ownership — your work ships, your name is on it, and your growth isn&apos;t stuck behind layers of hierarchy.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { icon: 'ri-line-chart-line', title: 'Room to grow fast', desc: 'Take on real client work early — no waiting years to get meaningful responsibility.' },
              { icon: 'ri-team-line', title: 'Supportive team culture', desc: 'A tight-knit, collaborative team that actually has each other’s backs.' },
              { icon: 'ri-rocket-2-line', title: 'Exciting, varied projects', desc: 'Branding, web, social, and more — across industries, not the same brief on repeat.' },
              { icon: 'ri-time-line', title: 'Flexible work setup', desc: 'Work built around getting great work done, not watching the clock.' },
            ].map((b) => (
              <div
                key={b.title}
                className="rounded-2xl p-5 sm:p-6"
                style={{ background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(20px) saturate(160%)', WebkitBackdropFilter: 'blur(20px) saturate(160%)', border: '1px solid rgba(255,255,255,0.6)', boxShadow: '0 8px 32px rgba(36,48,55,0.08)' }}
              >
                <div className="mb-4">
                  <i className={`${b.icon} text-[1.6875rem] text-[#FF5B05]`} />
                </div>
                <h3 className="font-display font-bold text-sm sm:text-base text-[#243037] mb-1.5">{b.title}</h3>
                <p className="text-[13px] text-[#243037]/55 leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* OUR VALUES */}
      <section className="relative py-16 sm:py-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-8 lg:gap-14 items-start">
          <div className="relative">
            <div className="relative rounded-3xl overflow-hidden h-[300px] sm:h-[336px] flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(255,91,5,0.12), rgba(7,80,86,0.12))' }}>
              <img src="/images/abigail-duterte-full.webp" alt="Abigail Duterte, Huna Creatives team" className="h-full w-auto object-contain" />
            </div>
            <div className="mt-3 text-center">
              <p className="font-display font-bold text-sm text-[#243037]">Abigail Duterte</p>
              <p className="text-xs text-[#243037]/50">HR Specialist / Admin</p>
            </div>

            {/* Floating quote bubble */}
            <div
              className="flex absolute top-3 right-3 sm:-top-4 sm:-right-6 max-w-[170px] sm:max-w-[190px] items-start gap-2 rounded-2xl rounded-bl-sm px-3.5 sm:px-4 py-2.5 sm:py-3"
              style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(16px) saturate(160%)', WebkitBackdropFilter: 'blur(16px) saturate(160%)', boxShadow: '0 8px 24px rgba(36,48,55,0.15)', transform: 'rotate(4deg)', animation: 'float-gentle 9s ease-in-out infinite', zIndex: 6 }}
            >
              <i className="ri-double-quotes-l text-[#FF5B05] text-lg leading-none flex-shrink-0" />
              <p className="text-[11px] sm:text-[11px] text-[#243037]/70 leading-snug">
                Hi! We can&apos;t wait to meet you — reach out anytime.
              </p>
            </div>

            {/* Second bubble, opposite corner — balances the frame instead of
                leaving all the visual weight on the top-right. Desktop only:
                the mobile card is only 300px tall, so two bubbles there would
                just crowd Abigail's photo rather than frame it. Anchored well
                clear of the frame (rather than tucked into its corner) so it
                can't drift over her face regardless of how the photo is
                cropped inside the container. */}
            <div
              className="flex absolute bottom-3 left-3 sm:bottom-16 sm:-left-14 max-w-[160px] sm:max-w-[180px] items-start gap-2 rounded-2xl rounded-tl-sm px-3.5 sm:px-4 py-2.5 sm:py-3 z-0"
              style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(16px) saturate(160%)', WebkitBackdropFilter: 'blur(16px) saturate(160%)', boxShadow: '0 8px 24px rgba(36,48,55,0.15)', transform: 'rotate(-4deg)', animation: 'float-gentle 10s ease-in-out infinite 0.6s' }}
            >
              <i className="ri-double-quotes-l text-[#075056] text-lg leading-none flex-shrink-0" />
              <p className="text-[11px] text-[#243037]/70 leading-snug">
                We usually reply within 48 hours.
              </p>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-[11px] font-medium tracking-[0.3em] uppercase text-[#075056]">Our Values</span>
            </div>
            <h2 className="font-display text-2xl md:text-2xl lg:text-3xl font-bold text-[#243037] leading-tight mb-3">
              How we&apos;re guided.
            </h2>
            <p className="text-[15px] sm:text-sm text-[#243037]/55 leading-relaxed mb-8">
              Dedicated to craft, honesty, and doing right by the brands we work with.
            </p>
            <div className="grid grid-cols-2 gap-5 sm:gap-6">
              {[
                { icon: 'ri-lightbulb-flash-line', title: 'Creativity', desc: 'Original thinking over templates.', color: '#FF5B05' },
                { icon: 'ri-hammer-line', title: 'Craftsmanship', desc: 'Obsessive attention to detail.', color: '#075056' },
                { icon: 'ri-team-line', title: 'Collaboration', desc: 'We build better work together.', color: '#075056' },
                { icon: 'ri-shield-check-line', title: 'Integrity', desc: 'Honest work, honest feedback.', color: '#FF5B05' },
              ].map((v) => (
                <div key={v.title}>
                  <div className="w-9 h-9 flex items-center justify-center rounded-lg mb-2.5" style={{ background: `${v.color}18` }}>
                    <i className={`${v.icon} text-sm`} style={{ color: v.color }} />
                  </div>
                  <h3 className="font-display font-bold text-sm text-[#243037] mb-1">{v.title}</h3>
                  <p className="text-[13px] sm:text-xs text-[#243037]/50 leading-relaxed">{v.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {jobsLoading ? null : hasOpenings ? (
        <section className="relative py-16 sm:py-20 md:py-24 px-4 sm:px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <div className="flex items-center justify-center gap-3 mb-4">
                <span className="text-[11px] font-medium tracking-[0.3em] uppercase text-[#075056]">Now Hiring</span>
              </div>
              <h2 className="font-display text-2xl md:text-2xl lg:text-3xl font-bold text-[#243037] leading-tight mb-3">
                Open Positions Available
              </h2>
              <div className="flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#075056] animate-pulse" />
                <span className="text-[#075056] text-xs font-semibold tracking-widest uppercase">
                  {jobListings.length} Open Position{jobListings.length > 1 ? 's' : ''}
                </span>
              </div>
            </div>

            <div className="space-y-3 mb-10">
              {jobListings.map((job) => (
                <div key={job.id}>
                  <div className={`rounded-2xl p-5 md:p-6 border transition-all ${selectedJob?.id === job.id ? 'border-orange-500/40 bg-orange-50/60' : 'border-[#243037]/8 bg-white/70 hover:border-[#243037]/15'}`}>
                    <button
                      type="button"
                      onClick={() => {
                        const isClosing = selectedJob?.id === job.id;
                        setSelectedJob(isClosing ? null : job);
                        if (isClosing && applyingJobId === job.id) {
                          setApplyingJobId(null);
                          resetApplicationState();
                        }
                      }}
                      className="w-full text-left cursor-pointer"
                    >
                      <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-5">
                        <div className="shrink-0">
                          <i className={`text-[1.875rem] text-orange-400 ${job.portfolioRequired ? 'ri-palette-line' : 'ri-megaphone-line'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            <h2 className="font-display text-lg sm:text-xl md:text-2xl font-bold text-[#243037]">{job.title}</h2>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-[#075056]/10 text-[#075056] border border-[#075056]/20">Hiring</span>
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1">
                            <span className="text-[#243037]/45 text-[13px] sm:text-xs flex items-center gap-1.5"><i className="ri-map-pin-line text-orange-400/70" />{job.location}</span>
                            <span className="text-[#243037]/45 text-[13px] sm:text-xs flex items-center gap-1.5"><i className="ri-briefcase-line text-orange-400/70" />{job.type}</span>
                            <span className="text-[#243037]/45 text-[13px] sm:text-xs flex items-center gap-1.5"><i className="ri-time-line text-orange-400/70" />{job.shift}</span>
                            <span className="text-[#243037]/45 text-[13px] sm:text-xs flex items-center gap-1.5"><i className="ri-calendar-line text-orange-400/70" />Starts {job.startDate}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 md:self-start">
                          <span className="text-[#FF5B05] text-[13px] sm:text-xs font-medium">{selectedJob?.id === job.id ? 'Hide details' : 'View details'}</span>
                          <i className={`ri-arrow-down-s-line text-[#FF5B05] transition-transform ${selectedJob?.id === job.id ? 'rotate-180' : ''}`} />
                        </div>
                      </div>
                    </button>
                    {selectedJob?.id === job.id && (
                      <div className="mt-5 pt-5 border-t border-[#243037]/8 space-y-5">
                        <p className="text-[#243037]/55 text-[15px] sm:text-sm leading-relaxed max-w-3xl">{job.summary}</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                          <div>
                            <h3 className="text-[11px] font-semibold tracking-widest uppercase text-orange-400 mb-3">What You&apos;ll Do</h3>
                            <ul className="space-y-2">
                              {job.whatYoullDo.map((item) => (
                                <li key={item} className="flex items-start gap-2.5 text-[#243037]/55 text-[13px] sm:text-xs leading-relaxed">
                                  <i className="ri-arrow-right-s-line text-orange-400/60 mt-0.5 shrink-0" />
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <h3 className="text-[11px] font-semibold tracking-widest uppercase text-orange-400 mb-3">What You Bring</h3>
                            <ul className="space-y-2">
                              {job.whatYouBring.map((item) => (
                                <li key={item} className="flex items-start gap-2.5 text-[#243037]/55 text-[13px] sm:text-xs leading-relaxed">
                                  <i className="ri-checkbox-circle-line text-orange-400/60 mt-0.5 shrink-0" />
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <h3 className="text-[11px] font-semibold tracking-widest uppercase text-orange-400 mb-3">Why Join Us</h3>
                            <ul className="space-y-2">
                              {job.whyJoinUs.map((item) => (
                                <li key={item} className="flex items-start gap-2.5 text-[#243037]/55 text-[13px] sm:text-xs leading-relaxed">
                                  <i className="ri-star-line text-orange-400/60 mt-0.5 shrink-0" />
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                        {applyingJobId !== job.id ? (
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
                            <p className="text-[#243037]/35 text-xs">
                              This will open the application form for <span className="text-[#243037]/70">{job.title}</span> only.
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                setApplyingJobId(job.id);
                                resetApplicationState();
                              }}
                              className="w-full sm:w-auto px-5 py-3.5 sm:py-3 rounded-xl text-[13px] sm:text-xs font-semibold tracking-widest uppercase border border-[#FF5B05]/50 text-[#FF5B05] hover:bg-[#FF5B05]/10 transition-all hover:scale-[1.02] cursor-pointer whitespace-nowrap"
                            >
                              Apply for {job.title}
                            </button>
                          </div>
                        ) : applicationFormJSX(job)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : (
        <>
          <section className="relative py-10 md:py-14 px-4 sm:px-6">
            <div className="max-w-5xl mx-auto">
              <div className="rounded-2xl md:rounded-3xl p-8 md:p-10 border border-[#243037]/8 flex flex-col md:flex-row items-center gap-6 md:gap-10 fade-up fade-up-2"
                style={{ background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(20px) saturate(160%)', WebkitBackdropFilter: 'blur(20px) saturate(160%)', boxShadow: '0 8px 32px rgba(36,48,55,0.08)' }}>
                <div className="shrink-0">
                  <i className="ri-briefcase-4-line text-[2.25rem] text-orange-400" />
                </div>
                <div>
                  <h2 className="font-display text-xl md:text-2xl font-bold text-[#243037] mb-2">No Open Positions Right Now</h2>
                  <p className="text-[#243037]/40 text-sm leading-relaxed">We&apos;re not actively hiring at the moment — but you can still get on our radar below.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="relative py-12 md:py-16 lg:py-20 px-4 sm:px-6">
            <div className="max-w-3xl mx-auto fade-up fade-up-3">
                <div className="mb-6 md:mb-8">
                  <span className="inline-flex items-center gap-2 text-[10px] font-semibold tracking-widest uppercase text-[#243037]/30 mb-3">
                    <i className="ri-user-star-line" />Talent Pool
                  </span>
                  <h2 className="font-display text-xl md:text-2xl font-bold text-[#243037] mb-2">Get on Our Radar</h2>
                  <p className="text-[#243037]/40 text-xs md:text-sm leading-relaxed">No roles open right now — but we&apos;re always growing. Drop your details and we&apos;ll reach out when something fits.</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                    <div>
                      <label htmlFor="nameTalent" className="block text-[11px] font-medium text-gray-400 mb-2 tracking-widest uppercase">Full Name</label>
                      <input type="text" id="nameTalent" name="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className="w-full px-5 py-3.5 bg-white/80 border border-[#243037]/15 shadow-sm rounded-xl focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/60 outline-none transition-all text-[#243037] placeholder-gray-400 text-base sm:text-xs" placeholder="Your full name" />
                    </div>
                    <div>
                      <label htmlFor="emailTalent" className="block text-[11px] font-medium text-gray-400 mb-2 tracking-widest uppercase">Email</label>
                      <input type="email" id="emailTalent" name="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required className="w-full px-5 py-3.5 bg-white/80 border border-[#243037]/15 shadow-sm rounded-xl focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/60 outline-none transition-all text-[#243037] placeholder-gray-400 text-base sm:text-xs" placeholder="your@email.com" />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="roleTalent" className="block text-[11px] font-medium text-gray-400 mb-2 tracking-widest uppercase">Role / Skill Set</label>
                    <input type="text" id="roleTalent" name="role" value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="w-full px-5 py-3.5 bg-white/80 border border-[#243037]/15 shadow-sm rounded-xl focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/60 outline-none transition-all text-[#243037] placeholder-gray-400 text-base sm:text-xs" placeholder="e.g. Graphic Designer, Video Editor, Copywriter..." />
                  </div>
                  <div>
                    <label htmlFor="rateTalent" className="block text-[11px] font-medium text-gray-400 mb-2 tracking-widest uppercase">
                      Expected Service Rate <span className="text-orange-400/70 normal-case tracking-normal font-normal">*required</span>
                    </label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center pointer-events-none">
                        <i className="ri-money-dollar-circle-line text-orange-400/60 text-sm" />
                      </div>
                      <input type="text" id="rateTalent" name="rate" value={formData.rate} onChange={(e) => setFormData({ ...formData, rate: e.target.value })} required className="w-full pl-10 pr-5 py-3.5 bg-white/80 border border-[#243037]/15 shadow-sm rounded-xl focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/60 outline-none transition-all text-[#243037] placeholder-gray-400 text-base sm:text-xs" placeholder="e.g. ₱500/hr, ₱25,000/mo, $5/hr..." />
                    </div>
                    <p className="text-[10px] text-[#243037]/25 mt-1.5">Enter your expected rate in any format you prefer</p>
                  </div>
                  {portfolioJSX('portfolioLinkTalent')}
                  {resumeJSX('resumeFileTalent')}
                  <div>
                    <label htmlFor="messageTalent" className="block text-[11px] font-medium text-gray-400 mb-2 tracking-widest uppercase">Tell Us About Yourself</label>
                    <textarea id="messageTalent" name="message" value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} required maxLength={500} rows={5} className="w-full px-5 py-3.5 bg-white/80 border border-[#243037]/15 shadow-sm rounded-xl focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/60 outline-none transition-all resize-none text-[#243037] placeholder-gray-400 text-base sm:text-xs" placeholder="What do you do, what are you passionate about, and why would you love to work with us?" />
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
          </section>
        </>
      )}
      </div>

      <Footer isDark />
    </div>
  );
}
