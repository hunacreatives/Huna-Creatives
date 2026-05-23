import { useRef, useState } from 'react';
import Footer from '../home/components/Footer';

// ─── Data ─────────────────────────────────────────────────────────────────────

const FEATURES = [
  { icon: 'ri-time-line', title: 'Attendance & Time Tracking', desc: 'Your team punches in and out from any device. Real-time logs, late flags, and daily summaries — no spreadsheets, no guesswork.' },
  { icon: 'ri-money-dollar-circle-line', title: 'Payroll & Payouts', desc: 'Auto-calculated pay per period for hourly, fixed, and project-based staff. Approve and log payouts in one click.' },
  { icon: 'ri-file-list-3-line', title: 'Contracts & Documents', desc: 'Generate employment agreements, NDAs, and offer letters from templates. Sign and store — all in one place.' },
  { icon: 'ri-inbox-line', title: 'Requests & Approvals', desc: 'Leave requests, overtime, and resource requests flow through a single approval queue. No more chasing people on chat.' },
  { icon: 'ri-building-line', title: 'Client & Project Tracking', desc: 'Assign staff to clients and projects. See who is working on what, track progress, and log payouts per project.' },
  { icon: 'ri-questionnaire-line', title: 'Intake Forms & Questionnaires', desc: 'Send branded intake forms to new clients or leads. Responses come straight into your dashboard — ready for action.' },
];

const PLANS = [
  {
    name: 'Starter', setup: '₱15,000', price: '₱4,999', per: '/month',
    perSeat: '+ per seat', seats: '5 seats included',
    desc: 'For small teams ready to stop running on spreadsheets.',
    features: ['Custom hub built for your workflow', 'Attendance & time tracking', 'Payroll calculation', 'Document generation', 'Client & project management', 'Onboarding & setup included', 'Email support'],
    cta: 'Book a Demo', highlight: false,
  },
  {
    name: 'Growth', setup: '₱30,000', price: '₱9,999', per: '/month',
    perSeat: '+ per seat', seats: '10 seats included',
    desc: 'For growing teams managing multiple departments, clients, and projects.',
    features: ['Everything in Starter', 'Project-based payouts', 'Client questionnaires', 'Overtime & time-off approvals', 'Audit log', '2 rounds of workflow revisions', 'Priority support'],
    cta: 'Book a Demo', highlight: true,
  },
  {
    name: 'Enterprise', setup: 'Custom', price: 'Custom', per: '',
    perSeat: 'Negotiated per seat', seats: 'Unlimited seats',
    desc: 'Fully custom build tailored to your organization from the ground up.',
    features: ['Everything in Growth', 'Your branding & domain', 'Custom integrations & modules', 'Dedicated onboarding', 'Dedicated account manager', 'SLA & priority escalation'],
    cta: 'Talk to Us', highlight: false,
  },
];

// ─── UI Mockups ───────────────────────────────────────────────────────────────

function MockBrowser({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-2xl shadow-black/20">
      <div className="bg-gray-100 px-4 py-3 flex items-center gap-2 border-b border-gray-200">
        <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
        <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400"></div>
        <span className="ml-2 text-[11px] text-gray-400 font-mono">{label}</span>
      </div>
      <div className="bg-gray-50 flex" style={{ minHeight: 340 }}>
        <div className="w-14 bg-[#111827] flex flex-col items-center py-4 gap-3 border-r border-gray-200 flex-shrink-0">
          <div className="w-7 h-7 bg-[#FF6B35] rounded-lg flex items-center justify-center mb-2">
            <i className="ri-home-heart-line text-white text-xs"></i>
          </div>
          {['ri-layout-grid-line','ri-time-line','ri-money-dollar-circle-line','ri-file-list-3-line','ri-building-line','ri-inbox-line'].map((ic, i) => (
            <div key={i} className={`w-8 h-8 rounded-lg flex items-center justify-center ${i === 0 ? 'bg-[#FF6B35]' : ''}`}>
              <i className={`${ic} text-sm ${i === 0 ? 'text-white' : 'text-gray-500'}`}></i>
            </div>
          ))}
        </div>
        {children}
      </div>
    </div>
  );
}

function DashboardScreen() {
  return (
    <MockBrowser label="sentro.app / dashboard">
      <div className="flex-1 p-5 overflow-hidden">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[11px] text-gray-400 uppercase tracking-wider">Overview</p>
            <p className="text-base font-bold text-gray-900">Dashboard</p>
          </div>
          <div className="bg-white rounded-lg px-3 py-1.5 text-xs text-gray-500 border border-gray-200">May 2026</div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Active Team', icon: 'ri-user-line', color: 'text-emerald-500', bg: 'bg-emerald-50' },
            { label: 'Punched In', icon: 'ri-time-line', color: 'text-sky-500', bg: 'bg-sky-50' },
            { label: 'Pending Approvals', icon: 'ri-inbox-line', color: 'text-amber-500', bg: 'bg-amber-50' },
            { label: 'This Period', icon: 'ri-money-dollar-circle-line', color: 'text-[#FF6B35]', bg: 'bg-orange-50' },
          ].map(s => (
            <div key={s.label} className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
              <div className={`w-7 h-7 ${s.bg} rounded-lg flex items-center justify-center mb-2`}>
                <i className={`${s.icon} text-sm ${s.color}`}></i>
              </div>
              <p className="text-[10px] text-gray-400">{s.label}</p>
              <div className="h-4 w-10 bg-gray-100 rounded mt-1 animate-pulse"></div>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          {[
            { name: 'Angela Cruz', dept: 'Creative', status: 'On time', sc: 'text-emerald-600 bg-emerald-50' },
            { name: 'Reese Jumawan', dept: 'Media Buying', status: 'Late', sc: 'text-amber-600 bg-amber-50' },
            { name: 'Marco Dela Cruz', dept: 'Content', status: 'Time off', sc: 'text-sky-600 bg-sky-50' },
          ].map(r => (
            <div key={r.name} className="flex items-center gap-3 bg-white border border-gray-100 rounded-lg px-3 py-2 shadow-sm">
              <div className="w-7 h-7 rounded-full bg-[#FF6B35]/10 flex items-center justify-center flex-shrink-0">
                <span className="text-[#FF6B35] text-xs font-bold">{r.name[0]}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-800 truncate">{r.name}</p>
                <p className="text-[10px] text-gray-400">{r.dept}</p>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${r.sc}`}>{r.status}</span>
            </div>
          ))}
        </div>
      </div>
    </MockBrowser>
  );
}

function PayrollScreen() {
  return (
    <MockBrowser label="sentro.app / payroll">
      <div className="flex-1 p-5 overflow-hidden">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[11px] text-gray-400 uppercase tracking-wider">Finance</p>
            <p className="text-base font-bold text-gray-900">Payroll</p>
          </div>
          <div className="flex gap-2">
            <div className="bg-white rounded-lg px-3 py-1.5 text-xs text-gray-500 border border-gray-200">May 1–15</div>
            <div className="bg-[#FF6B35] rounded-lg px-3 py-1.5 text-xs text-white font-medium">Process All</div>
          </div>
        </div>
        <div className="space-y-2">
          {[
            { name: 'Angela Cruz', type: 'Fixed Monthly', approved: false },
            { name: 'Reese Jumawan', type: 'Hourly · USD', approved: false },
            { name: 'Marco Dela Cruz', type: 'Fixed Monthly', approved: true },
            { name: 'Jay Santos', type: 'Project Based', approved: true },
          ].map(r => (
            <div key={r.name} className="flex items-center gap-3 bg-white border border-gray-100 rounded-lg px-3 py-2.5 shadow-sm">
              <div className="w-7 h-7 rounded-full bg-[#FF6B35]/10 flex items-center justify-center flex-shrink-0">
                <span className="text-[#FF6B35] text-xs font-bold">{r.name[0]}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-800 truncate">{r.name}</p>
                <p className="text-[10px] text-gray-400">{r.type}</p>
              </div>
              <div className="h-3 w-16 bg-gray-100 rounded animate-pulse"></div>
              {r.approved
                ? <span className="text-[10px] px-2 py-0.5 rounded-full font-medium text-emerald-600 bg-emerald-50">Approved</span>
                : <div className="bg-[#FF6B35] rounded-lg px-2.5 py-1 text-[10px] text-white font-medium">Approve</div>}
            </div>
          ))}
        </div>
        <div className="mt-4 bg-white border border-gray-100 rounded-xl px-4 py-3 flex items-center justify-between shadow-sm">
          <span className="text-xs text-gray-500">Period Total</span>
          <div className="h-4 w-20 bg-gray-100 rounded animate-pulse"></div>
        </div>
      </div>
    </MockBrowser>
  );
}

function AttendanceScreen() {
  return (
    <MockBrowser label="sentro.app / attendance">
      <div className="flex-1 p-5 overflow-hidden">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[11px] text-gray-400 uppercase tracking-wider">Team</p>
            <p className="text-base font-bold text-gray-900">Attendance</p>
          </div>
          <div className="bg-white rounded-lg px-3 py-1.5 text-xs text-gray-500 border border-gray-200">Today</div>
        </div>
        <div className="space-y-2">
          {[
            { name: 'Angela Cruz', time: '8:02 AM', status: 'On time', sc: 'text-emerald-600 bg-emerald-50' },
            { name: 'Reese Jumawan', time: '9:14 AM', status: 'Late', sc: 'text-amber-600 bg-amber-50' },
            { name: 'Marco Dela Cruz', time: '—', status: 'Time Off', sc: 'text-sky-600 bg-sky-50' },
            { name: 'Jay Santos', time: '—', status: 'Not in', sc: 'text-red-500 bg-red-50' },
          ].map(r => (
            <div key={r.name} className="flex items-center gap-3 bg-white border border-gray-100 rounded-lg px-3 py-2.5 shadow-sm">
              <div className="w-7 h-7 rounded-full bg-[#FF6B35]/10 flex items-center justify-center flex-shrink-0">
                <span className="text-[#FF6B35] text-xs font-bold">{r.name[0]}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-800 truncate">{r.name}</p>
                <p className="text-[10px] text-gray-400">Punch in: {r.time}</p>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${r.sc}`}>{r.status}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {['On Time', 'Late', 'Time Off'].map(l => (
            <div key={l} className="bg-white border border-gray-100 rounded-lg px-3 py-2 text-center shadow-sm">
              <div className="h-3 w-6 bg-gray-100 rounded mx-auto mb-1 animate-pulse"></div>
              <p className="text-[10px] text-gray-400">{l}</p>
            </div>
          ))}
        </div>
      </div>
    </MockBrowser>
  );
}

function ContractsScreen() {
  return (
    <MockBrowser label="sentro.app / documents">
      <div className="flex-1 p-5 overflow-hidden">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[11px] text-gray-400 uppercase tracking-wider">Legal</p>
            <p className="text-base font-bold text-gray-900">Contracts & Docs</p>
          </div>
          <div className="bg-[#FF6B35] rounded-lg px-3 py-1.5 text-xs text-white font-medium flex items-center gap-1">
            <i className="ri-add-line text-xs"></i> Generate
          </div>
        </div>
        <div className="space-y-2">
          {[
            { name: 'Service Agreement', person: 'Angela Cruz', status: 'Signed', sc: 'text-emerald-600 bg-emerald-50', icon: 'ri-file-text-line' },
            { name: 'NDA', person: 'Reese Jumawan', status: 'Signed', sc: 'text-emerald-600 bg-emerald-50', icon: 'ri-shield-line' },
            { name: 'Offer Letter', person: 'Jay Santos', status: 'Pending', sc: 'text-amber-600 bg-amber-50', icon: 'ri-mail-open-line' },
            { name: 'Service Agreement', person: 'Marco Dela Cruz', status: 'Signed', sc: 'text-emerald-600 bg-emerald-50', icon: 'ri-file-text-line' },
          ].map(r => (
            <div key={r.person} className="flex items-center gap-3 bg-white border border-gray-100 rounded-lg px-3 py-2.5 shadow-sm">
              <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0">
                <i className={`${r.icon} text-gray-400 text-sm`}></i>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-800 truncate">{r.name}</p>
                <p className="text-[10px] text-gray-400">{r.person}</p>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${r.sc}`}>{r.status}</span>
            </div>
          ))}
        </div>
      </div>
    </MockBrowser>
  );
}

const SCREENS = [
  { label: 'Dashboard', desc: 'Your team at a glance — attendance, approvals, and period summary all in one view.', component: <DashboardScreen /> },
  { label: 'Payroll', desc: 'One-click payroll for every payment type — hourly, fixed, project-based, and USD contractors.', component: <PayrollScreen /> },
  { label: 'Attendance', desc: 'Live punch-in logs with late detection, time-off status, and daily hour tracking.', component: <AttendanceScreen /> },
  { label: 'Contracts', desc: 'Generate, send, and store contractor documents. Know exactly what is signed and what is pending.', component: <ContractsScreen /> },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ForAgenciesPage() {
  const [activeScreen, setActiveScreen] = useState(0);
  const demoRef = useRef<HTMLDivElement>(null);
  const scrollToDemo = () => demoRef.current?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div className="bg-[#080c14] text-white min-h-screen font-sans overflow-x-hidden">

      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div style={{ background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(255,107,53,0.18) 0%, transparent 70%)' }} className="absolute inset-0" />
      </div>

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#080c14]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex flex-col leading-none">
            <span className="text-xl font-black text-white tracking-tight">Sentro OS</span>
            <span className="text-[10px] text-gray-600">by Huna Creatives</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#features" className="text-sm text-gray-400 hover:text-white transition-colors hidden sm:block">Features</a>
            <a href="#pricing" className="text-sm text-gray-400 hover:text-white transition-colors hidden sm:block">Pricing</a>
            <button onClick={scrollToDemo}
              className="text-sm bg-[#FF6B35] text-white px-4 py-2 rounded-lg hover:bg-[#e55a27] transition-colors cursor-pointer whitespace-nowrap font-medium">
              Book a Demo
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative z-10 pt-36 pb-12 px-6 text-center">
        <div className="max-w-5xl mx-auto">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-xs text-gray-300 mb-8 backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B35] animate-pulse"></span>
            A custom operations hub — built for your team, your workflow
          </div>

          {/* Headline */}
          <h1 className="text-6xl sm:text-8xl font-black leading-[1.0] tracking-tight mb-4">
            <span style={{ background: 'linear-gradient(135deg, #ffffff 0%, #e0e0e0 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Sentro OS
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-500 mb-3 font-medium tracking-wide">by Huna Creatives</p>

          <p className="text-base sm:text-lg text-gray-400 max-w-2xl mx-auto mb-3 leading-relaxed mt-6">
            A custom internal operations hub built around <em className="text-white not-italic font-medium">your</em> team's workflow.
          </p>
          <p className="text-sm text-gray-500 max-w-xl mx-auto mb-10">
            Manage HR, attendance, payroll, documents, credentials, SOPs, and internal operations — all in one branded system.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
            <button onClick={scrollToDemo}
              className="w-full sm:w-auto px-8 py-4 font-semibold rounded-xl text-base cursor-pointer transition-all text-white"
              style={{ background: 'linear-gradient(135deg, #FF6B35, #e55a27)', boxShadow: '0 0 40px rgba(255,107,53,0.35)' }}>
              Book a Free Demo →
            </button>
            <a href="#features"
              className="w-full sm:w-auto px-8 py-4 border border-white/10 text-gray-300 font-medium rounded-xl hover:bg-white/5 transition-colors text-base text-center backdrop-blur-sm">
              See how it works
            </a>
          </div>
          <p className="text-xs text-gray-600">No credit card required · We set it up with you · Your brand on it</p>
        </div>

        {/* Hero mockup */}
        <div className="relative max-w-5xl mx-auto mt-16">
          <div className="absolute -inset-x-10 top-1/2 h-32 pointer-events-none" style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(255,107,53,0.2) 0%, transparent 70%)' }} />
          <div className="relative" style={{ transform: 'perspective(1200px) rotateX(4deg)', transformOrigin: 'bottom center' }}>
            <DashboardScreen />
          </div>
        </div>
      </section>

      {/* ── MARQUEE STRIP ── */}
      <div className="relative z-10 border-y border-white/5 bg-white/2 py-4 mt-8 overflow-hidden">
        <div className="flex items-center gap-10 text-sm text-gray-500 whitespace-nowrap animate-none"
          style={{ display: 'flex', gap: '3rem' }}>
          {['Attendance tracking', 'Payroll calculation', 'Contract generation', 'Client management', 'Project payouts', 'Slack notifications', 'Time-off approvals', 'Overtime tracking', 'Custom workflow'].flatMap((f, i) => [
            <span key={`a-${i}`} className="flex items-center gap-2 flex-shrink-0">
              <i className="ri-check-line text-[#FF6B35]"></i>{f}
            </span>,
            <span key={`d-${i}`} className="text-white/10 flex-shrink-0">·</span>
          ])}
        </div>
      </div>

      {/* ── SCREENS ── */}
      <section id="features" className="relative z-10 py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold text-[#FF6B35] uppercase tracking-widest mb-3">The Platform</p>
            <h2 className="text-4xl sm:text-5xl font-black mb-5 tracking-tight">Built to run your whole team</h2>
            <p className="text-gray-400 max-w-xl mx-auto text-lg">Every screen is designed around how your team actually works — not how enterprise software thinks it does.</p>
          </div>

          <div className="flex flex-wrap gap-2 justify-center mb-10">
            {SCREENS.map((s, i) => (
              <button key={s.label} onClick={() => setActiveScreen(i)}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${activeScreen === i ? 'text-white' : 'text-gray-400 hover:text-white border border-white/10 hover:bg-white/5'}`}
                style={activeScreen === i ? { background: 'linear-gradient(135deg, #FF6B35, #e55a27)', boxShadow: '0 0 20px rgba(255,107,53,0.3)' } : {}}>
                {s.label}
              </button>
            ))}
          </div>

          <div style={{ transform: 'perspective(1200px) rotateX(2deg)', transformOrigin: 'bottom center' }}>
            {SCREENS[activeScreen].component}
          </div>
          <p className="text-center text-sm text-gray-500 mt-6">{SCREENS[activeScreen].desc}</p>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="relative z-10 py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold text-[#FF6B35] uppercase tracking-widest mb-3">What's included</p>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight">Everything. Out of the box.</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(f => (
              <div key={f.title} className="bg-white/3 border border-white/8 rounded-2xl p-6 hover:bg-white/5 hover:border-white/15 transition-all group">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-5 transition-all"
                  style={{ background: 'rgba(255,107,53,0.1)' }}>
                  <i className={`${f.icon} text-[#FF6B35] text-xl`}></i>
                </div>
                <h3 className="font-bold text-white mb-2 text-base">{f.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="relative z-10 py-20 px-6 border-y border-white/5">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold text-[#FF6B35] uppercase tracking-widest mb-3">The process</p>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight">How it works</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              { step: '01', icon: 'ri-chat-3-line', title: 'We learn your workflow', desc: 'A discovery call to map how your organization actually operates — roles, schedules, payment types, departments.' },
              { step: '02', icon: 'ri-tools-line', title: 'We build your hub', desc: 'We configure and customize Sentro OS around your exact structure. Your brand, your rules, your modules.' },
              { step: '03', icon: 'ri-rocket-line', title: 'Your team goes live', desc: 'We onboard your team, walk everyone through the platform, and stay hands-on through go-live.' },
            ].map(s => (
              <div key={s.step} className="text-center">
                <div className="relative inline-flex mb-5">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,107,53,0.1)' }}>
                    <i className={`${s.icon} text-[#FF6B35] text-2xl`}></i>
                  </div>
                  <span className="absolute -top-2 -right-2 text-[10px] font-black text-[#FF6B35] bg-[#080c14] border border-[#FF6B35]/30 rounded-full w-5 h-5 flex items-center justify-center">{s.step}</span>
                </div>
                <h3 className="font-bold text-white mb-2">{s.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="relative z-10 py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold text-[#FF6B35] uppercase tracking-widest mb-3">Pricing</p>
            <h2 className="text-4xl sm:text-5xl font-black mb-4 tracking-tight">One-time setup. Monthly base. Per seat.</h2>
            <p className="text-gray-400 text-lg">You pay to have it built right, then a flat base + per contractor. No surprises.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {PLANS.map(p => (
              <div key={p.name} className={`rounded-2xl p-7 border flex flex-col relative overflow-hidden ${p.highlight ? 'border-[#FF6B35]/50' : 'bg-white/3 border-white/10'}`}
                style={p.highlight ? { background: 'linear-gradient(135deg, rgba(255,107,53,0.15) 0%, rgba(255,107,53,0.05) 100%)', boxShadow: '0 0 60px rgba(255,107,53,0.15)' } : {}}>
                {p.highlight && (
                  <>
                    <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, #FF6B35, transparent)' }} />
                    <span className="text-xs font-bold uppercase tracking-widest text-[#FF6B35] mb-4">Most Popular</span>
                  </>
                )}
                <h3 className="font-black text-xl mb-3 text-white">{p.name}</h3>
                <div className="inline-flex items-center gap-1.5 text-xs font-medium mb-4 px-2.5 py-1.5 rounded-lg w-fit bg-white/5 text-gray-400">
                  <i className="ri-tools-line text-xs"></i>
                  {p.setup === 'Custom' ? 'Custom setup fee' : `${p.setup} one-time setup`}
                </div>
                <div className="flex items-end gap-1 mb-1">
                  <span className="text-4xl font-black text-white">{p.price}</span>
                  <span className="text-sm mb-1.5 text-gray-400">{p.per}</span>
                </div>
                <p className="text-xs text-gray-500 mb-1">{p.seats} · <span className="italic">{p.perSeat}</span></p>
                <p className="text-sm mt-3 mb-6 text-gray-400">{p.desc}</p>
                <ul className="space-y-2.5 mb-8 flex-1">
                  {p.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
                      <i className="ri-check-line flex-shrink-0 text-[#FF6B35]"></i>{f}
                    </li>
                  ))}
                </ul>
                <button onClick={scrollToDemo}
                  className="w-full py-3 rounded-xl font-bold text-sm transition-all cursor-pointer text-white"
                  style={p.highlight
                    ? { background: 'linear-gradient(135deg, #FF6B35, #e55a27)', boxShadow: '0 0 30px rgba(255,107,53,0.3)' }
                    : { background: 'rgba(255,107,53,0.15)', border: '1px solid rgba(255,107,53,0.3)' }}>
                  {p.cta} →
                </button>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-gray-600 mt-6">Per-seat pricing discussed during your demo call based on team size.</p>
        </div>
      </section>

      {/* ── TRUST ── */}
      <section className="relative z-10 py-20 px-6 border-t border-white/5">
        <div className="max-w-4xl mx-auto">
          <div className="grid sm:grid-cols-3 gap-10 text-center">
            {[
              { icon: 'ri-tools-line', title: 'Built by a team that uses it', desc: 'We run our own operations on Sentro OS every day. Every feature exists because we needed it first.' },
              { icon: 'ri-shield-check-line', title: 'Your brand on it', desc: 'Your logo, your colors, your domain. It looks like it was built in-house — because it was.' },
              { icon: 'ri-customer-service-2-line', title: 'We set it up with you', desc: 'No onboarding headache. We map your workflow, configure everything, and train your team.' },
            ].map(w => (
              <div key={w.title}>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(255,107,53,0.1)' }}>
                  <i className={`${w.icon} text-[#FF6B35] text-xl`}></i>
                </div>
                <h3 className="font-bold mb-2 text-white">{w.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{w.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section ref={demoRef} className="relative z-10 py-32 px-6 text-center">
        <div style={{ background: 'radial-gradient(ellipse 60% 80% at 50% 50%, rgba(255,107,53,0.12) 0%, transparent 70%)' }} className="absolute inset-0 pointer-events-none" />
        <div className="relative max-w-2xl mx-auto">
          <p className="text-xs font-semibold text-[#FF6B35] uppercase tracking-widest mb-4">Get started</p>
          <h2 className="text-4xl sm:text-6xl font-black mb-6 tracking-tight leading-tight">
            Ready to give your<br />team its hub?
          </h2>
          <p className="text-gray-400 mb-10 text-lg leading-relaxed">
            Book a 30-minute demo. We walk through the platform, understand your workflow,
            and show you exactly what we would build for your organization.
          </p>
          <a href="https://calendly.com/hunacreatives" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-10 py-5 font-bold rounded-xl text-lg text-white transition-all"
            style={{ background: 'linear-gradient(135deg, #FF6B35, #e55a27)', boxShadow: '0 0 60px rgba(255,107,53,0.4)' }}>
            <i className="ri-calendar-check-line"></i>
            Book a Free Demo
          </a>
          <p className="text-xs text-gray-600 mt-5">30 minutes · No commitment · We do the setup</p>
          <p className="text-xs text-gray-700 mt-3">
            A product by <a href="https://www.hunacreatives.com" className="text-gray-500 hover:text-white transition-colors">Huna Creatives</a>
          </p>
        </div>
      </section>

      <div className="relative z-10 border-t border-white/5">
        <Footer />
      </div>
    </div>
  );
}
