import { useRef, useState } from 'react';
import Footer from '../home/components/Footer';

const FEATURES = [
  {
    icon: 'ri-time-line',
    title: 'Attendance & Time Tracking',
    desc: 'Contractors punch in and out from their phone. Real-time logs, late flags, and daily summaries — no spreadsheets.',
  },
  {
    icon: 'ri-money-dollar-circle-line',
    title: 'Payroll & Payouts',
    desc: 'Auto-calculated pay per period for hourly, fixed, and project-based contractors. Approve and log payouts in one click.',
  },
  {
    icon: 'ri-file-list-3-line',
    title: 'Contracts & Documents',
    desc: 'Generate contractor agreements, NDAs, and offer letters from templates. Sign and store — all in one place.',
  },
  {
    icon: 'ri-inbox-line',
    title: 'Requests & Approvals',
    desc: 'Time-off requests, overtime, and resource requests flow through a single approval queue. No more chasing people on Slack.',
  },
  {
    icon: 'ri-building-line',
    title: 'Client & Project Management',
    desc: 'Assign contractors to clients and projects. Track who's working on what and log payouts per project.',
  },
  {
    icon: 'ri-questionnaire-line',
    title: 'Client Questionnaires',
    desc: 'Send branded intake forms to new clients. Responses come straight into your dashboard — ready for proposals.',
  },
];

const PLANS = [
  {
    name: 'Starter',
    price: '₱2,999',
    per: '/month',
    desc: 'Perfect for small agencies just getting organized.',
    seats: 'Up to 10 contractors',
    features: ['Attendance & time tracking', 'Payroll calculation', 'Document generation', 'Client management', 'Email support'],
    cta: 'Book a Demo',
    highlight: false,
  },
  {
    name: 'Growth',
    price: '₱5,499',
    per: '/month',
    desc: 'For growing agencies managing multiple teams and clients.',
    seats: 'Up to 30 contractors',
    features: ['Everything in Starter', 'Project-based payouts', 'Client questionnaires', 'Overtime & time-off approvals', 'Audit log', 'Priority support'],
    cta: 'Book a Demo',
    highlight: true,
  },
  {
    name: 'Agency',
    price: 'Custom',
    per: '',
    desc: 'White-labeled and built around how your agency works.',
    seats: 'Unlimited contractors',
    features: ['Everything in Growth', 'Your branding & domain', 'Custom integrations', 'Onboarding support', 'Dedicated account manager'],
    cta: 'Talk to Us',
    highlight: false,
  },
];

const UI_SCREENS = [
  {
    label: 'Dashboard',
    desc: 'See your whole team at a glance — who\'s in, who\'s late, pending approvals.',
    color: 'from-[#111827] to-[#1f2937]',
    preview: [
      { label: 'Active contractors', value: '12', icon: 'ri-user-line', color: 'text-emerald-400' },
      { label: 'Pending approvals', value: '3', icon: 'ri-inbox-line', color: 'text-amber-400' },
      { label: 'This period pay', value: '₱84,200', icon: 'ri-money-dollar-circle-line', color: 'text-[#FF6B35]' },
      { label: 'Punched in today', value: '9', icon: 'ri-time-line', color: 'text-sky-400' },
    ],
  },
  {
    label: 'Payroll',
    desc: 'One-click payroll for hourly, fixed, and project-based contractors — with full audit trail.',
    color: 'from-[#0f172a] to-[#1e293b]',
    preview: [
      { label: 'Angela Cruz', value: '₱18,500', icon: 'ri-user-3-line', color: 'text-emerald-400' },
      { label: 'Reese Jumawan', value: '₱9,760', icon: 'ri-user-3-line', color: 'text-emerald-400' },
      { label: 'Marco Dela Cruz', value: '₱12,000', icon: 'ri-user-3-line', color: 'text-emerald-400' },
      { label: 'Total this period', value: '₱84,200', icon: 'ri-bank-card-line', color: 'text-[#FF6B35]' },
    ],
  },
  {
    label: 'Attendance',
    desc: 'Daily punch logs with late detection, overtime tracking, and period summaries.',
    color: 'from-[#111827] to-[#1f2937]',
    preview: [
      { label: 'Angela Cruz', value: '8:02 AM — On time', icon: 'ri-checkbox-circle-line', color: 'text-emerald-400' },
      { label: 'Reese Jumawan', value: '9:14 AM — Late', icon: 'ri-error-warning-line', color: 'text-amber-400' },
      { label: 'Marco Dela Cruz', value: 'Time off approved', icon: 'ri-calendar-check-line', color: 'text-sky-400' },
      { label: 'Jay Santos', value: 'Not punched in', icon: 'ri-close-circle-line', color: 'text-red-400' },
    ],
  },
  {
    label: 'Contracts',
    desc: 'Generate, sign, and store contractor agreements in seconds.',
    color: 'from-[#0f172a] to-[#1e293b]',
    preview: [
      { label: 'Service Agreement — Angela', value: 'Signed', icon: 'ri-file-text-line', color: 'text-emerald-400' },
      { label: 'NDA — Reese Jumawan', value: 'Signed', icon: 'ri-file-text-line', color: 'text-emerald-400' },
      { label: 'Offer Letter — Jay Santos', value: 'Pending', icon: 'ri-file-text-line', color: 'text-amber-400' },
      { label: 'Contract Generator', value: 'Ready', icon: 'ri-magic-line', color: 'text-[#FF6B35]' },
    ],
  },
];

export default function ForAgenciesPage() {
  const [activeScreen, setActiveScreen] = useState(0);
  const demoRef = useRef<HTMLDivElement>(null);

  const scrollToDemo = () => demoRef.current?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div className="bg-[#0a0f1a] text-white min-h-screen font-sans">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#0a0f1a]/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="https://www.hunacreatives.com">
            <img src="https://www.hunacreatives.com/images/fc04818c74ad69bdfb22b93a6a0c6a72.png"
              alt="Huna Creatives" className="h-6" />
          </a>
          <div className="flex items-center gap-6">
            <a href="#features" className="text-sm text-gray-400 hover:text-white transition-colors hidden sm:block">Features</a>
            <a href="#pricing" className="text-sm text-gray-400 hover:text-white transition-colors hidden sm:block">Pricing</a>
            <button onClick={scrollToDemo}
              className="text-sm bg-[#FF6B35] text-white px-4 py-2 rounded-lg hover:bg-[#e55a27] transition-colors cursor-pointer whitespace-nowrap">
              Book a Demo
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-flex items-center gap-2 text-xs font-semibold text-[#FF6B35] uppercase tracking-widest mb-6 bg-[#FF6B35]/10 px-3 py-1.5 rounded-full">
            <i className="ri-building-line"></i> Built for Creative Agencies
          </span>
          <h1 className="text-4xl sm:text-6xl font-bold leading-tight mb-6 tracking-tight">
            Run your agency.<br />
            <span className="text-[#FF6B35]">Not spreadsheets.</span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Huna Hub gives your team one place for attendance, payroll, contracts, and client work —
            so you spend less time managing admin and more time doing great work.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={scrollToDemo}
              className="w-full sm:w-auto px-8 py-4 bg-[#FF6B35] text-white font-semibold rounded-xl hover:bg-[#e55a27] transition-colors cursor-pointer text-base">
              Book a Demo →
            </button>
            <a href="#features"
              className="w-full sm:w-auto px-8 py-4 border border-white/10 text-gray-300 font-medium rounded-xl hover:bg-white/5 transition-colors text-base text-center">
              See how it works
            </a>
          </div>
          <p className="text-xs text-gray-600 mt-5">No credit card required · Setup in under a day</p>
        </div>
      </section>

      {/* Social proof bar */}
      <div className="border-y border-white/5 bg-white/2 py-5 px-6">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-8 text-sm text-gray-500">
          {['Attendance tracking', 'Payroll calculation', 'Contract generation', 'Client management', 'Project payouts', 'Slack notifications'].map(f => (
            <span key={f} className="flex items-center gap-1.5">
              <i className="ri-check-line text-[#FF6B35]"></i>{f}
            </span>
          ))}
        </div>
      </div>

      {/* UI Preview */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Everything your agency needs</h2>
            <p className="text-gray-400 max-w-xl mx-auto">One platform. No duct tape.</p>
          </div>

          {/* Screen tabs */}
          <div className="flex flex-wrap gap-2 justify-center mb-8">
            {UI_SCREENS.map((s, i) => (
              <button key={s.label} onClick={() => setActiveScreen(i)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${activeScreen === i ? 'bg-[#FF6B35] text-white' : 'text-gray-400 hover:text-white border border-white/10 hover:bg-white/5'}`}>
                {s.label}
              </button>
            ))}
          </div>

          {/* Screen preview */}
          <div className={`rounded-2xl bg-gradient-to-br ${UI_SCREENS[activeScreen].color} border border-white/10 p-6 sm:p-10 mb-5`}>
            <div className="flex items-center gap-1.5 mb-6">
              <div className="w-3 h-3 rounded-full bg-red-500/60"></div>
              <div className="w-3 h-3 rounded-full bg-amber-500/60"></div>
              <div className="w-3 h-3 rounded-full bg-emerald-500/60"></div>
              <span className="ml-3 text-xs text-gray-600 font-mono">hub.hunacreatives.com / {UI_SCREENS[activeScreen].label.toLowerCase()}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {UI_SCREENS[activeScreen].preview.map(item => (
                <div key={item.label} className="bg-white/5 rounded-xl p-4 border border-white/5">
                  <i className={`${item.icon} text-lg ${item.color} mb-2 block`}></i>
                  <p className="text-[11px] text-gray-500 mb-1">{item.label}</p>
                  <p className="text-sm font-semibold text-white">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
          <p className="text-center text-sm text-gray-500">{UI_SCREENS[activeScreen].desc}</p>
        </div>
      </section>

      {/* Feature grid */}
      <section className="py-16 px-6 bg-white/2 border-y border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(f => (
              <div key={f.title} className="bg-white/3 border border-white/8 rounded-2xl p-6 hover:bg-white/5 transition-colors">
                <div className="w-10 h-10 bg-[#FF6B35]/10 rounded-xl flex items-center justify-center mb-4">
                  <i className={`${f.icon} text-[#FF6B35] text-lg`}></i>
                </div>
                <h3 className="font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Simple, flat monthly pricing</h2>
            <p className="text-gray-400">No per-seat surprises. Cancel anytime.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {PLANS.map(p => (
              <div key={p.name} className={`rounded-2xl p-7 border flex flex-col ${p.highlight ? 'bg-[#FF6B35] border-[#FF6B35] text-white' : 'bg-white/3 border-white/10 text-white'}`}>
                {p.highlight && (
                  <span className="text-xs font-bold uppercase tracking-widest text-white/70 mb-4">Most Popular</span>
                )}
                <h3 className={`font-bold text-lg mb-1 ${p.highlight ? 'text-white' : 'text-white'}`}>{p.name}</h3>
                <div className="flex items-end gap-1 mb-1">
                  <span className={`text-4xl font-bold ${p.highlight ? 'text-white' : 'text-white'}`}>{p.price}</span>
                  <span className={`text-sm mb-1.5 ${p.highlight ? 'text-white/70' : 'text-gray-400'}`}>{p.per}</span>
                </div>
                <p className={`text-sm mb-1 ${p.highlight ? 'text-white/80' : 'text-gray-400'}`}>{p.seats}</p>
                <p className={`text-sm mb-6 ${p.highlight ? 'text-white/70' : 'text-gray-500'}`}>{p.desc}</p>
                <ul className="space-y-2.5 mb-8 flex-1">
                  {p.features.map(f => (
                    <li key={f} className={`flex items-center gap-2 text-sm ${p.highlight ? 'text-white/90' : 'text-gray-300'}`}>
                      <i className={`ri-check-line flex-shrink-0 ${p.highlight ? 'text-white' : 'text-[#FF6B35]'}`}></i>
                      {f}
                    </li>
                  ))}
                </ul>
                <button onClick={scrollToDemo}
                  className={`w-full py-3 rounded-xl font-semibold text-sm transition-colors cursor-pointer ${p.highlight ? 'bg-white text-[#FF6B35] hover:bg-gray-100' : 'bg-[#FF6B35] text-white hover:bg-[#e55a27]'}`}>
                  {p.cta} →
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Huna */}
      <section className="py-16 px-6 border-y border-white/5 bg-white/2">
        <div className="max-w-4xl mx-auto">
          <div className="grid sm:grid-cols-3 gap-8 text-center">
            {[
              { icon: 'ri-tools-line', title: 'Built by an agency, for agencies', desc: 'We run our own team on this. Every feature exists because we needed it.' },
              { icon: 'ri-shield-check-line', title: 'Your brand, not ours', desc: 'White-labeled on the Agency plan — your logo, your colors, your domain.' },
              { icon: 'ri-customer-service-2-line', title: 'We set it up with you', desc: 'No onboarding headache. We configure it for your team structure and workflow.' },
            ].map(w => (
              <div key={w.title}>
                <div className="w-12 h-12 bg-[#FF6B35]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <i className={`${w.icon} text-[#FF6B35] text-xl`}></i>
                </div>
                <h3 className="font-semibold mb-2">{w.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{w.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo CTA */}
      <section ref={demoRef} className="py-24 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-16 h-16 bg-[#FF6B35]/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <i className="ri-calendar-line text-[#FF6B35] text-2xl"></i>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">See it running your agency</h2>
          <p className="text-gray-400 mb-10 leading-relaxed">
            Book a 30-minute demo. We'll walk through the full platform, answer your questions,
            and show you exactly how it maps to your team.
          </p>
          <a
            href="https://calendly.com/hunacreatives"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-10 py-4 bg-[#FF6B35] text-white font-semibold rounded-xl hover:bg-[#e55a27] transition-colors text-base"
          >
            <i className="ri-calendar-check-line"></i>
            Book a Free Demo
          </a>
          <p className="text-xs text-gray-600 mt-5">30 minutes · No commitment · We'll do the setup</p>
        </div>
      </section>

      {/* Footer */}
      <div className="border-t border-white/5">
        <Footer />
      </div>
    </div>
  );
}
