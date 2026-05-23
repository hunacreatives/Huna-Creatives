import { useRef, useState } from 'react';
import Footer from '../home/components/Footer';

const FEATURES = [
  { icon: 'ri-time-line', title: 'Attendance & Time Tracking', desc: 'Contractors punch in and out from their phone. Real-time logs, late flags, and daily summaries — no spreadsheets.' },
  { icon: 'ri-money-dollar-circle-line', title: 'Payroll & Payouts', desc: 'Auto-calculated pay per period for hourly, fixed, and project-based contractors. Approve and log payouts in one click.' },
  { icon: 'ri-file-list-3-line', title: 'Contracts & Documents', desc: 'Generate contractor agreements, NDAs, and offer letters from templates. Sign and store — all in one place.' },
  { icon: 'ri-inbox-line', title: 'Requests & Approvals', desc: 'Time-off requests, overtime, and resource requests flow through a single approval queue. No more chasing people on Slack.' },
  { icon: 'ri-building-line', title: 'Client & Project Management', desc: "Assign contractors to clients and projects. Track who's working on what and log payouts per project." },
  { icon: 'ri-questionnaire-line', title: 'Client Questionnaires', desc: 'Send branded intake forms to new clients. Responses come straight into your dashboard — ready for proposals.' },
];

const PLANS = [
  {
    name: 'Starter',
    setup: '₱15,000',
    price: '₱4,999',
    per: '/month',
    perSeat: '+ ₱299/seat',
    seats: '5 seats included',
    desc: 'For small agencies ready to stop running on spreadsheets.',
    features: [
      'Custom hub built for your workflow',
      'Attendance & time tracking',
      'Payroll calculation',
      'Document generation',
      'Client management',
      'Onboarding & setup included',
      'Email support',
    ],
    cta: 'Book a Demo', highlight: false,
  },
  {
    name: 'Growth',
    setup: '₱30,000',
    price: '₱9,999',
    per: '/month',
    perSeat: '+ ₱249/seat',
    seats: '10 seats included',
    desc: 'For growing agencies with multiple teams and clients to manage.',
    features: [
      'Everything in Starter',
      'Project-based payouts',
      'Client questionnaires',
      'Overtime & time-off approvals',
      'Audit log',
      '2 rounds of workflow revisions',
      'Priority support',
    ],
    cta: 'Book a Demo', highlight: true,
  },
  {
    name: 'Enterprise',
    setup: 'Custom',
    price: 'Custom',
    per: '',
    perSeat: 'Negotiated per seat',
    seats: 'Unlimited seats',
    desc: 'Full white-label build tailored to your firm from the ground up.',
    features: [
      'Everything in Growth',
      'Your branding & domain',
      'Custom integrations & modules',
      'Dedicated onboarding',
      'Dedicated account manager',
      'SLA & priority escalation',
    ],
    cta: 'Talk to Us', highlight: false,
  },
];

// ─── UI Mockup Screens ────────────────────────────────────────────────────────

function MockBrowser({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
      <div className="bg-[#1a1f2e] px-4 py-3 flex items-center gap-2 border-b border-white/5">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500/50"></div>
        <div className="w-2.5 h-2.5 rounded-full bg-amber-500/50"></div>
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/50"></div>
        <span className="ml-2 text-[11px] text-gray-600 font-mono">{label}</span>
      </div>
      <div className="bg-[#0f1623] flex" style={{ minHeight: 340 }}>
        {/* Sidebar */}
        <div className="w-14 bg-[#111827] flex flex-col items-center py-4 gap-3 border-r border-white/5 flex-shrink-0">
          <div className="w-7 h-7 bg-[#FF6B35] rounded-lg flex items-center justify-center mb-2">
            <i className="ri-home-heart-line text-white text-xs"></i>
          </div>
          {['ri-layout-grid-line','ri-time-line','ri-money-dollar-circle-line','ri-file-list-3-line','ri-building-line','ri-inbox-line'].map((ic, i) => (
            <div key={i} className={`w-8 h-8 rounded-lg flex items-center justify-center ${i === 0 ? 'bg-[#FF6B35]' : 'hover:bg-white/5'}`}>
              <i className={`${ic} text-sm ${i === 0 ? 'text-white' : 'text-gray-600'}`}></i>
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
    <MockBrowser label="crewly.app / dashboard">
      <div className="flex-1 p-5 overflow-hidden">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[11px] text-gray-500 uppercase tracking-wider">Overview</p>
            <p className="text-base font-bold text-white">Dashboard</p>
          </div>
          <div className="bg-white/5 rounded-lg px-3 py-1.5 text-xs text-gray-400 border border-white/5">May 2026</div>
        </div>
        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Active Team', icon: 'ri-user-line', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
            { label: 'Punched In', icon: 'ri-time-line', color: 'text-sky-400', bg: 'bg-sky-500/10' },
            { label: 'Pending Approvals', icon: 'ri-inbox-line', color: 'text-amber-400', bg: 'bg-amber-500/10' },
            { label: 'This Period', icon: 'ri-money-dollar-circle-line', color: 'text-[#FF6B35]', bg: 'bg-[#FF6B35]/10' },
          ].map(s => (
            <div key={s.label} className="bg-white/4 border border-white/5 rounded-xl p-3">
              <div className={`w-7 h-7 ${s.bg} rounded-lg flex items-center justify-center mb-2`}>
                <i className={`${s.icon} text-sm ${s.color}`}></i>
              </div>
              <p className="text-[10px] text-gray-500">{s.label}</p>
              <div className="h-4 w-10 bg-white/10 rounded mt-1 animate-pulse"></div>
            </div>
          ))}
        </div>
        {/* Team rows */}
        <div className="space-y-2">
          {[
            { name: 'Angela Cruz', dept: 'Creative', status: 'On time', sc: 'text-emerald-400 bg-emerald-500/10' },
            { name: 'Reese Jumawan', dept: 'Media Buying', status: 'Late', sc: 'text-amber-400 bg-amber-500/10' },
            { name: 'Marco Dela Cruz', dept: 'Content', status: 'Time off', sc: 'text-sky-400 bg-sky-500/10' },
          ].map(r => (
            <div key={r.name} className="flex items-center gap-3 bg-white/3 border border-white/5 rounded-lg px-3 py-2">
              <div className="w-7 h-7 rounded-full bg-[#FF6B35]/20 flex items-center justify-center flex-shrink-0">
                <span className="text-[#FF6B35] text-xs font-bold">{r.name[0]}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white truncate">{r.name}</p>
                <p className="text-[10px] text-gray-500">{r.dept}</p>
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
    <MockBrowser label="crewly.app / payroll">
      <div className="flex-1 p-5 overflow-hidden">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[11px] text-gray-500 uppercase tracking-wider">Finance</p>
            <p className="text-base font-bold text-white">Payroll</p>
          </div>
          <div className="flex gap-2">
            <div className="bg-white/5 rounded-lg px-3 py-1.5 text-xs text-gray-400 border border-white/5">May 1–15</div>
            <div className="bg-[#FF6B35] rounded-lg px-3 py-1.5 text-xs text-white font-medium cursor-pointer">Process All</div>
          </div>
        </div>
        <div className="space-y-2">
          {[
            { name: 'Angela Cruz', type: 'Fixed Monthly', status: 'Pending', approved: false },
            { name: 'Reese Jumawan', type: 'Hourly · USD', status: 'Pending', approved: false },
            { name: 'Marco Dela Cruz', type: 'Fixed Monthly', status: 'Approved', approved: true },
            { name: 'Jay Santos', type: 'Project Based', status: 'Approved', approved: true },
          ].map(r => (
            <div key={r.name} className="flex items-center gap-3 bg-white/3 border border-white/5 rounded-lg px-3 py-2.5">
              <div className="w-7 h-7 rounded-full bg-[#FF6B35]/20 flex items-center justify-center flex-shrink-0">
                <span className="text-[#FF6B35] text-xs font-bold">{r.name[0]}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white truncate">{r.name}</p>
                <p className="text-[10px] text-gray-500">{r.type}</p>
              </div>
              <div className="h-3 w-16 bg-white/10 rounded animate-pulse"></div>
              {r.approved
                ? <span className="text-[10px] px-2 py-0.5 rounded-full font-medium text-emerald-400 bg-emerald-500/10">Approved</span>
                : <div className="bg-[#FF6B35] rounded-lg px-2.5 py-1 text-[10px] text-white font-medium cursor-pointer">Approve</div>
              }
            </div>
          ))}
        </div>
        <div className="mt-4 bg-white/3 border border-white/5 rounded-xl px-4 py-3 flex items-center justify-between">
          <span className="text-xs text-gray-400">Period Total</span>
          <div className="h-4 w-20 bg-white/10 rounded animate-pulse"></div>
        </div>
      </div>
    </MockBrowser>
  );
}

function AttendanceScreen() {
  return (
    <MockBrowser label="crewly.app / attendance">
      <div className="flex-1 p-5 overflow-hidden">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[11px] text-gray-500 uppercase tracking-wider">Team</p>
            <p className="text-base font-bold text-white">Attendance</p>
          </div>
          <div className="bg-white/5 rounded-lg px-3 py-1.5 text-xs text-gray-400 border border-white/5">Today</div>
        </div>
        <div className="space-y-2">
          {[
            { name: 'Angela Cruz', time: '8:02 AM', hours: 'In progress', status: 'On time', sc: 'text-emerald-400 bg-emerald-500/10' },
            { name: 'Reese Jumawan', time: '9:14 AM', hours: 'In progress', status: 'Late', sc: 'text-amber-400 bg-amber-500/10' },
            { name: 'Marco Dela Cruz', time: '—', hours: 'Time Off', status: 'Approved', sc: 'text-sky-400 bg-sky-500/10' },
            { name: 'Jay Santos', time: '—', hours: '—', status: 'Not in', sc: 'text-red-400 bg-red-500/10' },
          ].map(r => (
            <div key={r.name} className="flex items-center gap-3 bg-white/3 border border-white/5 rounded-lg px-3 py-2.5">
              <div className="w-7 h-7 rounded-full bg-[#FF6B35]/20 flex items-center justify-center flex-shrink-0">
                <span className="text-[#FF6B35] text-xs font-bold">{r.name[0]}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white truncate">{r.name}</p>
                <p className="text-[10px] text-gray-500">Punch in: {r.time}</p>
              </div>
              <span className="text-[10px] text-gray-500 hidden sm:block">{r.hours}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${r.sc}`}>{r.status}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {['On Time', 'Late', 'Time Off'].map((l, i) => (
            <div key={l} className="bg-white/3 border border-white/5 rounded-lg px-3 py-2 text-center">
              <div className="h-3 w-6 bg-white/10 rounded mx-auto mb-1 animate-pulse"></div>
              <p className="text-[10px] text-gray-500">{l}</p>
            </div>
          ))}
        </div>
      </div>
    </MockBrowser>
  );
}

function ContractsScreen() {
  return (
    <MockBrowser label="crewly.app / documents">
      <div className="flex-1 p-5 overflow-hidden">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[11px] text-gray-500 uppercase tracking-wider">Legal</p>
            <p className="text-base font-bold text-white">Contracts & Docs</p>
          </div>
          <div className="bg-[#FF6B35] rounded-lg px-3 py-1.5 text-xs text-white font-medium cursor-pointer flex items-center gap-1">
            <i className="ri-add-line text-xs"></i> Generate
          </div>
        </div>
        <div className="space-y-2">
          {[
            { name: 'Service Agreement', person: 'Angela Cruz', status: 'Signed', sc: 'text-emerald-400 bg-emerald-500/10', icon: 'ri-file-text-line' },
            { name: 'NDA', person: 'Reese Jumawan', status: 'Signed', sc: 'text-emerald-400 bg-emerald-500/10', icon: 'ri-shield-line' },
            { name: 'Offer Letter', person: 'Jay Santos', status: 'Pending', sc: 'text-amber-400 bg-amber-500/10', icon: 'ri-mail-open-line' },
            { name: 'Service Agreement', person: 'Marco Dela Cruz', status: 'Signed', sc: 'text-emerald-400 bg-emerald-500/10', icon: 'ri-file-text-line' },
          ].map(r => (
            <div key={r.person} className="flex items-center gap-3 bg-white/3 border border-white/5 rounded-lg px-3 py-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                <i className={`${r.icon} text-gray-400 text-sm`}></i>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white truncate">{r.name}</p>
                <p className="text-[10px] text-gray-500">{r.person}</p>
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
    <div className="bg-[#0a0f1a] text-white min-h-screen font-sans">

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#0a0f1a]/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-white tracking-tight">Crewly</span>
            <span className="text-[10px] text-gray-500 hidden sm:block mt-0.5">by Huna Creatives</span>
          </div>
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
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <span className="text-xs font-semibold text-[#FF6B35] uppercase tracking-widest bg-[#FF6B35]/10 px-3 py-1.5 rounded-full">
              Built for Creative Agencies
            </span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-bold leading-tight mb-6 tracking-tight">
            Your agency deserves<br />
            <span className="text-[#FF6B35]">a hub built for it.</span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Crewly is a custom operations hub for creative agencies — built by one, for all.
            One place for your team, your payroll, your clients, and your documents.
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
          <p className="text-xs text-gray-600 mt-5">No credit card required · We set it up with you</p>
        </div>
      </section>

      {/* Feature pill bar */}
      <div className="border-y border-white/5 bg-white/2 py-5 px-6">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500">
          {['Attendance tracking', 'Payroll & payouts', 'Contract generation', 'Client management', 'Project tracking', 'Slack notifications'].map(f => (
            <span key={f} className="flex items-center gap-1.5">
              <i className="ri-check-line text-[#FF6B35]"></i>{f}
            </span>
          ))}
        </div>
      </div>

      {/* UI Screenshots */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Built to run your whole team</h2>
            <p className="text-gray-400 max-w-xl mx-auto">Every screen is designed around how agency work actually flows — not how enterprise software thinks it does.</p>
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap gap-2 justify-center mb-8">
            {SCREENS.map((s, i) => (
              <button key={s.label} onClick={() => setActiveScreen(i)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${activeScreen === i ? 'bg-[#FF6B35] text-white' : 'text-gray-400 hover:text-white border border-white/10 hover:bg-white/5'}`}>
                {s.label}
              </button>
            ))}
          </div>

          {/* Screen */}
          {SCREENS[activeScreen].component}
          <p className="text-center text-sm text-gray-500 mt-5">{SCREENS[activeScreen].desc}</p>
        </div>
      </section>

      {/* Feature grid */}
      <section className="py-16 px-6 bg-white/2 border-y border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
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
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">One-time setup. Monthly base. Per seat.</h2>
            <p className="text-gray-400">You pay to have it built right, then a flat base + per contractor. No surprises.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {PLANS.map(p => (
              <div key={p.name} className={`rounded-2xl p-7 border flex flex-col ${p.highlight ? 'bg-[#FF6B35] border-[#FF6B35]' : 'bg-white/3 border-white/10'}`}>
                {p.highlight && <span className="text-xs font-bold uppercase tracking-widest text-white/70 mb-4">Most Popular</span>}
                <h3 className="font-bold text-lg mb-3 text-white">{p.name}</h3>

                {/* Setup fee */}
                <div className={`text-xs font-medium mb-3 px-2.5 py-1.5 rounded-lg inline-flex items-center gap-1.5 w-fit ${p.highlight ? 'bg-white/20 text-white' : 'bg-white/5 text-gray-400'}`}>
                  <i className="ri-tools-line text-xs"></i>
                  {p.setup === 'Custom' ? 'Custom setup fee' : `${p.setup} one-time setup`}
                </div>

                {/* Monthly price */}
                <div className="flex items-end gap-1 mb-1">
                  <span className="text-4xl font-bold text-white">{p.price}</span>
                  <span className={`text-sm mb-1.5 ${p.highlight ? 'text-white/70' : 'text-gray-400'}`}>{p.per}</span>
                </div>
                <p className={`text-xs mb-1 ${p.highlight ? 'text-white/70' : 'text-gray-500'}`}>{p.seats} · <span className="italic">{p.perSeat}</span></p>
                <p className={`text-sm mt-3 mb-6 ${p.highlight ? 'text-white/70' : 'text-gray-500'}`}>{p.desc}</p>

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
          <p className="text-center text-xs text-gray-600 mt-6">Per-seat pricing discussed during your demo call based on team size.</p>
        </div>
      </section>

      {/* Why */}
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
            Book a 30-minute demo. We will walk through the full platform, answer your questions,
            and show you exactly how it maps to your team.
          </p>
          <a href="https://calendly.com/hunacreatives" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-10 py-4 bg-[#FF6B35] text-white font-semibold rounded-xl hover:bg-[#e55a27] transition-colors text-base">
            <i className="ri-calendar-check-line"></i>
            Book a Free Demo
          </a>
          <p className="text-xs text-gray-600 mt-5">30 minutes · No commitment · We will do the setup</p>
          <p className="text-xs text-gray-700 mt-3">A product by <a href="https://www.hunacreatives.com" className="text-gray-500 hover:text-white transition-colors">Huna Creatives</a></p>
        </div>
      </section>

      <div className="border-t border-white/5">
        <Footer />
      </div>
    </div>
  );
}
