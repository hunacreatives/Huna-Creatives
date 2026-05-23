import { useRef, useState, useEffect } from 'react';
import Footer from '../home/components/Footer';
import { useSEO } from '../../hooks/useSEO';

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

const SCREENS = [
  { label: 'Dashboard', desc: 'Your team at a glance — attendance, approvals, and period summary all in one view.', url: 'sentro.app / dashboard', navItem: 'Dashboard' },
  { label: 'Payroll', desc: 'One-click payroll for every payment type — hourly, fixed, project-based, and USD contractors.', url: 'sentro.app / payroll', navItem: 'Payroll' },
  { label: 'Attendance', desc: 'Live punch-in logs with late detection, time-off status, and daily hour tracking.', url: 'sentro.app / attendance', navItem: 'Attendance' },
  { label: 'Projects', desc: 'Track every client project — contract value, collections, costs, and team payouts in one view.', url: 'sentro.app / projects', navItem: 'Projects' },
];

// ─── Hub preview shell ─────────────────────────────────────────────────────────

function HubPreview({ activeScreen, setActiveScreen }: { activeScreen: number; setActiveScreen: (i: number) => void }) {
  const screen = SCREENS[activeScreen];

  const mainNav = [
    { icon: 'ri-layout-grid-line', label: 'Dashboard', screen: 0 },
    { icon: 'ri-user-line', label: 'Contractors', screen: -1 },
    { icon: 'ri-time-line', label: 'Attendance', screen: 2 },
    { icon: 'ri-inbox-line', label: 'Requests', screen: -1 },
    { icon: 'ri-calendar-line', label: 'Time-Off', screen: -1 },
    { icon: 'ri-timer-flash-line', label: 'Overtime', screen: -1 },
  ];
  const financeNav = [
    { icon: 'ri-money-dollar-circle-line', label: 'Payroll', screen: 1 },
    { icon: 'ri-folder-line', label: 'Projects', screen: 3 },
    { icon: 'ri-file-list-3-line', label: 'Doc Requests', screen: -1 },
    { icon: 'ri-draft-line', label: 'Contracts', screen: -1 },
  ];
  const contentNav = [
    { icon: 'ri-book-open-line', label: 'SOP Library', screen: -1 },
    { icon: 'ri-megaphone-line', label: 'Announcements', screen: -1 },
    { icon: 'ri-questionnaire-line', label: 'Questionnaires', screen: -1 },
    { icon: 'ri-shield-keyhole-line', label: 'Credentials Vault', screen: -1 },
    { icon: 'ri-bar-chart-line', label: 'Audit Log', screen: -1 },
  ];

  const NavItem = ({ icon, label, screenIdx }: { icon: string; label: string; screenIdx: number }) => {
    const active = label === screen.navItem;
    const clickable = screenIdx >= 0;
    return (
      <div
        className={`flex items-center gap-1.5 px-2 py-1 rounded-lg mb-0.5 transition-colors ${clickable ? 'cursor-pointer' : ''} ${!active && clickable ? 'hover:bg-white/5' : ''}`}
        style={active ? { background: '#FF6B35' } : {}}
        onClick={() => clickable && setActiveScreen(screenIdx)}
      >
        <i className={`${icon} ${active ? 'text-white' : 'text-gray-500'}`} style={{ fontSize: 9 }}></i>
        <span className={`text-[9px] font-medium ${active ? 'text-white' : 'text-gray-400'}`}>{label}</span>
      </div>
    );
  };

  return (
    <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-2xl shadow-black/20">
      {/* Browser chrome */}
      <div className="bg-gray-100 px-4 py-2.5 flex items-center gap-2 border-b border-gray-200">
        <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
        <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400"></div>
        <span className="ml-2 text-[11px] text-gray-400 font-mono">{screen.url}</span>
      </div>
      <div className="flex bg-white" style={{ height: 520 }}>
        {/* Sidebar */}
        <div className="w-36 bg-[#111827] flex flex-col flex-shrink-0">
          <div className="px-3 py-2 border-b border-white/5 flex items-center gap-1.5">
            <div className="w-5 h-5 bg-[#FF6B35] rounded-md flex items-center justify-center flex-shrink-0">
              <i className="ri-home-heart-line text-white" style={{ fontSize: 8 }}></i>
            </div>
            <span className="text-[9px] font-black text-white tracking-tight">SENTRO HUB</span>
          </div>
          <div className="px-1.5 py-1 border-b border-white/5">
            <span className="text-[8px] px-2 py-0.5 rounded font-bold text-[#FF6B35]" style={{ background: 'rgba(255,107,53,0.12)' }}>Owner</span>
          </div>
          <nav className="flex-1 py-1.5 px-1.5 overflow-y-auto min-h-0">
            {mainNav.map(n => <NavItem key={n.label} icon={n.icon} label={n.label} screenIdx={n.screen} />)}
            <p className="text-[7px] font-bold text-gray-600 uppercase tracking-wider px-2 pt-1.5 pb-1">Finance</p>
            {financeNav.map(n => <NavItem key={n.label} icon={n.icon} label={n.label} screenIdx={n.screen} />)}
            <p className="text-[7px] font-bold text-gray-600 uppercase tracking-wider px-2 pt-1.5 pb-1">Content</p>
            {contentNav.map(n => <NavItem key={n.label} icon={n.icon} label={n.label} screenIdx={n.screen} />)}
          </nav>
          <div className="px-3 py-2 border-t border-white/5 flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-[#FF6B35]/20 flex items-center justify-center flex-shrink-0">
              <span className="text-[7px] font-bold text-[#FF6B35]">M</span>
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-medium text-white truncate">Miguel Santos</p>
              <p className="text-[7px] text-gray-500 truncate">miguelsan@gm...</p>
            </div>
          </div>
        </div>

        {/* Main */}
        <div className="flex-1 flex flex-col min-w-0 bg-gray-50">
          <div className="bg-white border-b border-gray-100 px-4 py-2 flex items-center justify-between flex-shrink-0">
            <span className="text-[12px] font-bold text-gray-900">{screen.label}</span>
            <div className="flex items-center gap-2">
              <i className="ri-notification-3-line text-gray-400 text-sm"></i>
              <div className="w-px h-4 bg-gray-200 mx-0.5"></div>
              <div className="w-5 h-5 rounded-full bg-[#FF6B35]/10 flex items-center justify-center">
                <span className="text-[7px] font-bold text-[#FF6B35]">M</span>
              </div>
              <span className="text-[9px] text-gray-600 font-medium">Miguel Santos</span>
              <span className="text-[8px] px-1.5 py-0.5 bg-[#FF6B35]/10 text-[#FF6B35] rounded font-bold">Owner</span>
            </div>
          </div>
          <div className="flex-1 overflow-auto min-h-0">
            {activeScreen === 0 && <DashboardContent />}
            {activeScreen === 1 && <PayrollContent />}
            {activeScreen === 2 && <AttendanceContent />}
            {activeScreen === 3 && <ProjectsContent />}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Screen content components ────────────────────────────────────────────────

function DashboardContent() {
  const [phTime, setPhTime] = useState(() => new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' })));
  useEffect(() => {
    const t = setInterval(() => setPhTime(new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }))), 60000);
    return () => clearInterval(t);
  }, []);

  const h = phTime.getHours();
  const timeStr = phTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  const dateStr = phTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const greeting = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const isDay = h >= 6 && h < 18;
  const isDawn = h >= 5 && h < 7;
  const isDusk = h >= 17 && h < 20;

  const skyBg = (() => {
    if (isDawn)               return 'linear-gradient(135deg, #7f1d1d 0%, #c2410c 35%, #fb923c 65%, #fde68a 100%)';
    if (h >= 7 && h < 12)    return 'linear-gradient(160deg, #0369a1 0%, #0ea5e9 40%, #7dd3fc 80%, #e0f2fe 100%)';
    if (h >= 12 && h < 16)   return 'linear-gradient(160deg, #1d4ed8 0%, #3b82f6 45%, #93c5fd 100%)';
    if (isDusk)               return 'linear-gradient(135deg, #7c2d12 0%, #9333ea 45%, #1e1b4b 100%)';
    return                           'linear-gradient(160deg, #020617 0%, #0f172a 50%, #1e1b4b 100%)';
  })();

  return (
    <div className="p-3 space-y-2.5">
      {/* Greeting banner */}
      <div className="relative rounded-xl overflow-hidden flex items-center justify-between px-4 py-3" style={{ background: skyBg }}>
        {/* Stars (night/dusk) */}
        {(!isDay || isDusk) && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[
              [8,12],[18,6],[30,20],[45,8],[60,15],[72,5],[80,18],[88,10],[15,30],[55,25],[70,28],[40,35],
            ].map(([x,y], i) => (
              <div key={i} className="absolute w-0.5 h-0.5 bg-white rounded-full"
                style={{ left: `${x}%`, top: `${y}%`, opacity: isDusk ? 0.4 : 0.7 }}></div>
            ))}
          </div>
        )}
        {/* Celestial body */}
        <div className="absolute top-2.5 right-20 pointer-events-none">
          {isDay && !isDusk ? (
            <div className="w-8 h-8 rounded-full bg-yellow-200"
              style={{ boxShadow: '0 0 0 3px rgba(253,224,71,0.3), 0 0 16px rgba(253,224,71,0.6), 0 0 32px rgba(251,191,36,0.3)' }}>
            </div>
          ) : (
            <div className="w-6 h-6 rounded-full bg-slate-200"
              style={{ boxShadow: '-4px -2px 0 3px #0f172a inset, 0 0 10px rgba(226,232,240,0.4)' }}>
            </div>
          )}
        </div>
        {/* Content */}
        <div className="relative">
          <p className="text-[9px] text-white/60 mb-1">{dateStr} · {timeStr} PH</p>
          <p className="text-[13px] font-black text-white drop-shadow">{greeting}, team.</p>
          <p className="text-[9px] text-white/60 mt-0.5">6 online right now.</p>
        </div>
        <div className="relative">
          <div className="bg-black/20 backdrop-blur-sm rounded-lg px-3 py-2 text-right border border-white/10">
            <p className="text-[8px] text-white/50 mb-0.5">Current Pay Period</p>
            <p className="text-[11px] font-black text-white">May 16–31</p>
            <div className="w-28 h-1 bg-white/20 rounded-full mt-1.5 mb-1">
              <div className="h-full bg-white/70 rounded-full" style={{ width: '53%' }}></div>
            </div>
            <p className="text-[8px] text-white/40">8 days until May 31</p>
          </div>
        </div>
      </div>
      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Online Now', value: '6', icon: 'ri-user-heart-line', color: 'text-emerald-500', bg: 'bg-emerald-50' },
          { label: 'Logged Off', value: '1', icon: 'ri-logout-box-line', color: 'text-gray-400', bg: 'bg-gray-100' },
          { label: 'Not In Yet', value: '4', icon: 'ri-user-unfollow-line', color: 'text-amber-500', bg: 'bg-amber-50' },
          { label: 'Cutoff Hours', value: '192h', icon: 'ri-timer-2-line', color: 'text-sky-500', bg: 'bg-sky-50' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-100 rounded-xl p-2.5 shadow-sm">
            <div className={`w-5 h-5 ${s.bg} rounded-md flex items-center justify-center mb-1.5`}>
              <i className={`${s.icon} text-[9px] ${s.color}`}></i>
            </div>
            <p className="text-[15px] font-black text-gray-900 leading-none">{s.value}</p>
            <p className="text-[8px] text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>
      {/* Team status + financial cards */}
      <div className="grid grid-cols-5 gap-2">
        <div className="col-span-3 bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold text-gray-800">Team Status</p>
            <span className="text-[9px] text-[#FF6B35]">Full view</span>
          </div>
          <p className="text-[8px] text-gray-400 flex items-center gap-1 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span> Online
          </p>
          {['Sofia Lim', 'Renzo Aquino', 'Mika Torres'].map(n => (
            <div key={n} className="flex items-center gap-1.5 rounded-lg px-2 py-1 mb-0.5" style={{ background: 'rgba(16,185,129,0.06)' }}>
              <div className="w-4 h-4 rounded-full bg-[#FF6B35]/15 flex items-center justify-center flex-shrink-0">
                <span className="text-[7px] font-bold text-[#FF6B35]">{n[0]}</span>
              </div>
              <span className="text-[9px] font-medium text-gray-700 flex-1">{n}</span>
              <span className="text-[8px] text-gray-400">1h logged</span>
            </div>
          ))}
          <p className="text-[8px] text-gray-400 flex items-center gap-1 mt-2 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block"></span> Not In Yet
          </p>
          <div className="flex flex-wrap gap-1">
            {['Bianca R.', 'Carlo M.', 'Dani S.', 'Lea V.'].map(n => (
              <div key={n} className="flex items-center gap-1 bg-amber-50 rounded-full px-1.5 py-0.5">
                <div className="w-3.5 h-3.5 rounded-full bg-amber-200 flex items-center justify-center flex-shrink-0">
                  <span className="text-[6px] font-bold text-amber-700">{n[0]}</span>
                </div>
                <span className="text-[8px] text-amber-700">{n}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="col-span-2 flex flex-col gap-2">
          <div className="rounded-xl p-2.5 flex-1" style={{ background: '#FF6B35' }}>
            <p className="text-[8px] font-bold text-white/70 uppercase tracking-wider mb-0.5">Estimated Payroll</p>
            <p className="text-[15px] font-black text-white leading-none">₱71,450.00</p>
            <p className="text-[8px] text-white/60 mt-0.5 mb-2">May 16–31 cutoff</p>
            <div className="bg-white/20 rounded-lg py-1 text-center">
              <span className="text-[8px] font-bold text-white">View Payroll</span>
            </div>
          </div>
          <div className="rounded-xl p-2.5 flex-1" style={{ background: '#0d9488' }}>
            <p className="text-[8px] font-bold text-white/70 uppercase tracking-wider mb-0.5">Projects Net Profit</p>
            <p className="text-[15px] font-black text-white leading-none">₱204,130.00</p>
            <p className="text-[8px] text-white/60 mt-0.5 mb-2">4 active projects</p>
            <div className="bg-white/20 rounded-lg py-1 text-center">
              <span className="text-[8px] font-bold text-white">View Projects</span>
            </div>
          </div>
          <div className="rounded-xl p-2.5 flex-1" style={{ background: '#7c3aed' }}>
            <p className="text-[8px] font-bold text-white/70 uppercase tracking-wider mb-0.5">Monthly Retainers</p>
            <p className="text-[15px] font-black text-white leading-none">₱285,000.00</p>
            <p className="text-[8px] text-white/60 mt-0.5 mb-2">active client contracts</p>
            <div className="bg-white/20 rounded-lg py-1 text-center">
              <span className="text-[8px] font-bold text-white">View Clients</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PayrollContent() {
  const rows = [
    { name: 'Sofia Lim',    dept: 'Creative', type: 'Fixed',  rate: '₱45,000/mo · ₱281.25/hr OT', days: 5, rawHrs: '22.40h', billed: '21.50h', ot: '—',     pay: '₱22,500.00' },
    { name: 'Renzo Aquino', dept: 'Content',  type: 'Fixed',  rate: '₱38,000/mo · ₱237.50/hr OT', days: 4, rawHrs: '21.20h', billed: '20.10h', ot: '+3h OT', pay: '₱21,712.50', prorated: true },
    { name: 'Mika Torres',  dept: 'Media',    type: 'Hourly', rate: '$5/hr USD',                   days: 5, rawHrs: '40.00h', billed: '40.00h', ot: '—',     pay: '₱12,400.00' },
    { name: 'Bianca Reyes', dept: 'Creative', type: 'Fixed',  rate: '₱15,000/mo · ₱93.75/hr OT',  days: 4, rawHrs: '29.80h', billed: '24.00h', ot: '—',     pay: '₱7,500.00' },
    { name: 'Carlo Mendez', dept: 'Admin',    type: 'Fixed',  rate: '₱9,000/mo · ₱56.25/hr OT',   days: 4, rawHrs: '26.30h', billed: '22.50h', ot: '—',     pay: '₱4,500.00' },
  ];
  const cols = '2fr 0.7fr 2fr 0.5fr 0.8fr 0.8fr 0.8fr 1fr 1.2fr';
  return (
    <div className="p-3 space-y-2">
      {/* Period selector */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {['2026', 'May'].map(l => (
          <div key={l} className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-2 py-1">
            <span className="text-[9px] font-medium text-gray-700">{l}</span>
            <i className="ri-arrow-up-down-line text-gray-400" style={{ fontSize: 8 }}></i>
          </div>
        ))}
        <div className="bg-white border border-gray-200 rounded-lg px-2 py-1">
          <span className="text-[9px] text-gray-400">May 1–15, 2026</span>
        </div>
        <div className="rounded-lg px-2.5 py-1" style={{ background: '#111827' }}>
          <span className="text-[9px] font-semibold text-white">May 16–31, 2026</span>
        </div>
        <div className="ml-auto flex gap-1.5">
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-2 py-1">
            <i className="ri-file-list-line text-gray-400" style={{ fontSize: 8 }}></i>
            <span className="text-[8px] text-gray-500">CSV</span>
          </div>
          <div className="flex items-center gap-1 rounded-lg px-2 py-1" style={{ background: '#FF6B35' }}>
            <i className="ri-file-pdf-line text-white" style={{ fontSize: 8 }}></i>
            <span className="text-[8px] font-semibold text-white">PDF</span>
          </div>
        </div>
      </div>
      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Total Payroll', value: '₱68,612.50', icon: 'ri-coins-line', color: 'text-gray-700' },
          { label: 'Total Hours',   value: '138.0h',      icon: 'ri-timer-2-line', color: 'text-sky-500' },
          { label: 'Hourly',        value: '1',            icon: 'ri-user-line', color: 'text-violet-500' },
          { label: 'Fixed Rate',    value: '4',            icon: 'ri-calendar-check-line', color: 'text-emerald-500' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-100 rounded-xl p-2.5 shadow-sm">
            <div className="flex items-center gap-1 mb-1">
              <i className={`${s.icon} text-[9px] ${s.color}`}></i>
              <span className="text-[8px] text-gray-400">{s.label}</span>
            </div>
            <p className="text-[13px] font-black text-gray-900 leading-none">{s.value}</p>
          </div>
        ))}
      </div>
      {/* Banners */}
      <div className="flex items-center gap-2 bg-sky-50 border border-sky-100 rounded-lg px-3 py-1.5">
        <i className="ri-exchange-dollar-line text-sky-500" style={{ fontSize: 9 }}></i>
        <span className="text-[8px] text-sky-700">PayPal rate: <strong>1 USD =</strong></span>
        <span className="bg-white border border-sky-200 rounded px-1.5 py-0.5 text-[8px] font-bold text-sky-700">₱ 62</span>
        <span className="text-[8px] text-sky-600">— check paypal.com before processing</span>
      </div>
      <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-1.5">
        <i className="ri-information-line text-amber-500 flex-shrink-0 mt-0.5" style={{ fontSize: 9 }}></i>
        <span className="text-[8px] text-amber-700 leading-relaxed">Hours from Slack attendance. Daily cap 8h — raw hours beyond 8 not counted. Fixed-rate contractors paid <strong>monthly rate ÷ 2</strong> regardless of hours.</span>
      </div>
      {/* Table */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        <div className="grid text-[7px] font-bold text-gray-400 uppercase tracking-wider px-3 py-1.5 border-b border-gray-50"
          style={{ gridTemplateColumns: cols }}>
          <span>Contractor</span><span>Type</span><span>Rate</span><span>Days</span>
          <span>Raw Hrs</span><span>Billed</span><span>OT</span><span>Pay</span><span>Status</span>
        </div>
        {rows.map(r => (
          <div key={r.name} className="grid items-center px-3 py-2 border-b border-gray-50 last:border-0"
            style={{ gridTemplateColumns: cols }}>
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-5 h-5 rounded-full bg-[#FF6B35]/10 flex items-center justify-center flex-shrink-0">
                <span className="text-[7px] font-bold text-[#FF6B35]">{r.name[0]}</span>
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-semibold text-gray-800 truncate">{r.name}</p>
                <p className="text-[7px] text-gray-400">{r.dept}</p>
              </div>
            </div>
            <span className={`text-[7px] px-1.5 py-0.5 rounded font-bold w-fit ${r.type === 'Hourly' ? 'bg-violet-50 text-violet-600' : 'bg-sky-50 text-sky-600'}`}>{r.type}</span>
            <span className="text-[7px] text-gray-500 truncate pr-2">{r.rate}</span>
            <span className="text-[8px] text-gray-600">{r.days}</span>
            <span className="text-[8px] text-amber-500 font-medium">{r.rawHrs}</span>
            <span className="text-[8px] text-gray-700 font-medium">{r.billed}</span>
            <span className={`text-[7px] font-medium ${r.ot === '—' ? 'text-gray-300' : 'text-emerald-600'}`}>{r.ot}</span>
            <div>
              <p className="text-[8px] font-bold text-gray-900">{r.pay}</p>
              {r.prorated && <span className="text-[6px] px-1 py-0.5 bg-violet-50 text-violet-500 rounded font-medium">prorated</span>}
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[7px] text-gray-400">Pending</span>
              <div className="rounded px-1.5 py-0.5" style={{ background: '#111827' }}>
                <span className="text-[7px] font-bold text-white">Approve</span>
              </div>
            </div>
          </div>
        ))}
        <div className="grid items-center px-3 py-2 bg-gray-50" style={{ gridTemplateColumns: cols }}>
          <span className="text-[8px] font-bold text-gray-700 col-span-7">Total</span>
          <span className="text-[8px] font-bold text-gray-900">138.10h</span>
          <span className="text-[8px] font-bold text-gray-900">₱68,612.50</span>
        </div>
      </div>
      {/* Fund Transfer */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-3">
        <p className="text-[9px] font-bold text-gray-800">Fund Transfer</p>
        <p className="text-[8px] text-gray-400 mt-0.5">May 16–31, 2026</p>
        <p className="text-[8px] text-gray-300 mt-1">Approve at least one contractor to request a fund transfer.</p>
      </div>
    </div>
  );
}

function AttendanceContent() {
  const people = [
    { name: 'Angela Rivera',  dept: 'Account Mgmt', status: 'logged-off', detail: 'Last: 6:00 PM' },
    { name: 'Claudette Tahil', dept: 'Account Mgmt', status: 'not-in',    detail: 'No punch today' },
    { name: 'Reese Jumawan',  dept: 'Creative',      status: 'not-in',    detail: 'No punch today' },
    { name: 'Bianca Reyes',   dept: 'Admin',         status: 'not-in',    detail: 'No punch today' },
    { name: 'Sofia Lim',      dept: 'Design',        status: 'not-in',    detail: 'No punch today' },
    { name: 'Carlo Mendez',   dept: 'Creative',      status: 'not-in',    detail: 'No punch today' },
    { name: 'Mika Torres',    dept: 'Media',         status: 'not-in',    detail: 'No punch today' },
  ];
  return (
    <div className="p-3 space-y-2.5">
      {/* Date row */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="bg-white border border-gray-200 rounded-lg px-2.5 py-1.5">
          <span className="text-[9px] font-mono font-bold text-gray-700">05/23/2026</span>
        </div>
        <div>
          <p className="text-[9px] font-semibold text-gray-800">Saturday, May 23</p>
          <p className="text-[8px] text-gray-400">Last updated 9:12:05 AM</p>
        </div>
        <div className="ml-auto flex gap-1.5">
          {['Week PDF', 'Month PDF', 'Year PDF'].map(l => (
            <div key={l} className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-2 py-1">
              <i className="ri-file-pdf-line text-gray-400" style={{ fontSize: 8 }}></i>
              <span className="text-[8px] text-gray-500">{l}</span>
            </div>
          ))}
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-2 py-1">
            <i className="ri-refresh-line text-gray-400" style={{ fontSize: 8 }}></i>
            <span className="text-[8px] text-gray-500">Refresh</span>
          </div>
        </div>
      </div>
      {/* KPI */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Online', value: '0', icon: 'ri-user-heart-line', color: 'text-emerald-500', bg: 'bg-emerald-50' },
          { label: 'Logged Off', value: '1', icon: 'ri-logout-box-line', color: 'text-gray-400', bg: 'bg-gray-100' },
          { label: 'Not In Yet', value: '6', icon: 'ri-user-unfollow-line', color: 'text-amber-400', bg: 'bg-amber-50' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm text-center">
            <div className={`w-6 h-6 ${s.bg} rounded-full flex items-center justify-center mx-auto mb-2`}>
              <i className={`${s.icon} text-[9px] ${s.color}`}></i>
            </div>
            <p className="text-[22px] font-black text-gray-900 leading-none">{s.value}</p>
            <p className="text-[9px] text-gray-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>
      {/* Slack banner */}
      <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5">
        <i className="ri-settings-3-line text-gray-400" style={{ fontSize: 9 }}></i>
        <span className="text-[8px] text-gray-500">Live from Slack — contractors type <code className="bg-white border border-gray-200 rounded px-1 font-mono text-gray-600">On</code> or <code className="bg-white border border-gray-200 rounded px-1 font-mono text-gray-600">Off</code> in the attendance channel. Auto-refreshes every minute.</span>
      </div>
      {/* Filter tabs */}
      <div className="flex items-center gap-1.5">
        <div className="rounded-lg px-2.5 py-1" style={{ background: '#111827' }}>
          <span className="text-[8px] font-bold text-white">All  7</span>
        </div>
        <div className="rounded-lg px-2.5 py-1 bg-white border border-gray-200">
          <span className="text-[8px] text-gray-500">Online / Off  1</span>
        </div>
        <div className="rounded-lg px-2.5 py-1 bg-white border border-gray-200">
          <span className="text-[8px] text-gray-500">Not In  6</span>
        </div>
      </div>
      {/* List */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        {people.map((p, i) => (
          <div key={p.name} className={`flex items-center gap-3 px-3 py-2.5 ${i < people.length - 1 ? 'border-b border-gray-50' : ''}`}>
            <div className="relative flex-shrink-0">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                <span className="text-[9px] font-bold text-gray-600">{p.name[0]}</span>
              </div>
              <span className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-white ${p.status === 'logged-off' ? 'bg-gray-400' : 'bg-amber-400'}`}></span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-semibold text-gray-800">{p.name}</p>
              <p className="text-[8px] text-gray-400">{p.dept}</p>
            </div>
            <div className="text-right">
              {p.status === 'logged-off' ? (
                <>
                  <span className="text-[9px] text-gray-500 font-medium">Logged Off</span>
                  <p className="text-[8px] text-gray-300">{p.detail}</p>
                </>
              ) : (
                <>
                  <span className="text-[8px] px-2 py-0.5 rounded font-bold bg-amber-50 text-amber-600">Not In</span>
                  <p className="text-[8px] text-gray-300 mt-0.5">{p.detail}</p>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProjectsContent() {
  return (
    <div className="flex overflow-hidden h-full">
      {/* Left panel */}
      <div className="w-56 border-r border-gray-100 flex flex-col bg-white flex-shrink-0">
        <div className="grid grid-cols-2 gap-1.5 p-2.5 border-b border-gray-100">
          {[
            { icon: 'ri-file-list-line', color: 'text-gray-400',    val: '₱185,000', label: 'Total Contract Value', valColor: 'text-gray-900' },
            { icon: 'ri-subtract-line', color: 'text-red-400',       val: '₱18,500',  label: 'Operational Costs',   valColor: 'text-red-500' },
            { icon: 'ri-line-chart-line', color: 'text-emerald-500', val: '₱166,500', label: 'Net Profit',          valColor: 'text-emerald-600' },
            { icon: 'ri-money-dollar-circle-line', color: 'text-emerald-500', val: '₱108,250', label: 'Collected (62%)', valColor: 'text-emerald-600' },
          ].map(s => (
            <div key={s.label} className="bg-gray-50 rounded-lg p-2">
              <i className={`${s.icon} ${s.color} text-[9px]`}></i>
              <p className={`text-[10px] font-black ${s.valColor} leading-none mt-1`}>{s.val}</p>
              <p className="text-[7px] text-gray-400 mt-0.5 leading-tight">{s.label}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-2 border-b border-gray-100">
          <div className="flex-1 flex items-center gap-1 bg-gray-50 border border-gray-100 rounded-lg px-2 py-1">
            <i className="ri-search-line text-gray-300" style={{ fontSize: 8 }}></i>
            <span className="text-[8px] text-gray-300">Search...</span>
          </div>
          <div className="rounded-lg px-2 py-1 flex items-center" style={{ background: '#111827' }}>
            <span className="text-[9px] font-bold text-white">+ New</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          <p className="text-[7px] font-bold text-gray-400 uppercase tracking-wider mb-1 px-1">Branding & Identity</p>
          <div className="rounded-lg border border-[#FF6B35]/40 bg-orange-50/30 p-2 mb-2">
            <div className="flex items-center justify-between mb-0.5">
              <p className="text-[9px] font-bold text-gray-800">Nova Brew Co.</p>
              <span className="text-[7px] px-1.5 py-0.5 bg-sky-50 text-sky-500 rounded font-bold">Ongoing</span>
            </div>
            <p className="text-[8px] text-gray-400 mb-1">Kristine Ang</p>
            <div className="flex items-center justify-between text-[7px] text-gray-400 mb-1">
              <span>₱55,000.00 collected</span><span>55.0%</span>
            </div>
            <div className="w-full h-1 bg-gray-100 rounded-full">
              <div className="h-full bg-emerald-400 rounded-full" style={{ width: '55%' }}></div>
            </div>
          </div>
          <p className="text-[7px] font-bold text-gray-400 uppercase tracking-wider mb-1 px-1">Website Design</p>
          {[
            { name: 'fernandodesigns.ph', client: 'David Sy',         pct: '54.9%', w: '55%', collected: '₱33,295.00' },
            { name: 'greenstone.ph',      client: 'Marco Dela Cruz',  pct: '76.1%', w: '76%', collected: '₱37,198.00', urgent: true },
          ].map(p => (
            <div key={p.name} className="rounded-lg bg-gray-50 p-2 mb-1.5">
              <div className="flex items-center justify-between mb-0.5">
                <p className="text-[9px] font-semibold text-gray-700">{p.name}</p>
                <div className="flex gap-0.5">
                  {p.urgent && <span className="text-[7px] px-1 py-0.5 bg-amber-50 text-amber-500 rounded font-bold">2d left</span>}
                  <span className="text-[7px] px-1.5 py-0.5 bg-sky-50 text-sky-500 rounded font-bold">Ongoing</span>
                </div>
              </div>
              <p className="text-[8px] text-gray-400 mb-1">{p.client}</p>
              <div className="flex items-center justify-between text-[7px] text-gray-400 mb-1">
                <span>{p.collected} collected</span><span>{p.pct}</span>
              </div>
              <div className="w-full h-1 bg-gray-100 rounded-full">
                <div className="h-full bg-emerald-400 rounded-full" style={{ width: p.w }}></div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Right panel */}
      <div className="flex-1 overflow-y-auto p-3 bg-gray-50">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="text-[13px] font-black text-gray-900">Nova Brew Co.</h3>
              <span className="text-[7px] px-1.5 py-0.5 bg-sky-50 text-sky-500 rounded font-bold">Ongoing</span>
            </div>
            <p className="text-[8px] text-gray-400">Kristine Ang · Branding & Identity</p>
            <p className="text-[8px] text-gray-400">Started Mar 3, 2026 · Due Jun 3, 2026</p>
          </div>
          <div className="flex gap-1.5">
            <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-2 py-1">
              <i className="ri-printer-line text-gray-400" style={{ fontSize: 8 }}></i>
              <span className="text-[8px] text-gray-500">Print</span>
            </div>
            <div className="flex items-center gap-1 rounded-lg px-2 py-1" style={{ background: '#111827' }}>
              <i className="ri-mail-send-line text-white" style={{ fontSize: 8 }}></i>
              <span className="text-[8px] font-semibold text-white">Send Invoice</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2 mb-3">
          {[
            { label: 'CONTRACT PRICE',    value: '₱100,000.00', color: 'text-gray-900' },
            { label: 'OPERATIONAL COSTS', value: '₱10,000.00',  color: 'text-red-500' },
            { label: 'NET PROFIT',        value: '₱90,000.00',  color: 'text-gray-900', sub: 'after costs' },
            { label: 'BALANCE DUE',       value: '₱45,000.00',  color: 'text-amber-500', sub: '55.0% collected' },
          ].map(c => (
            <div key={c.label} className="bg-white border border-gray-100 rounded-xl p-2.5 shadow-sm">
              <p className="text-[7px] font-bold text-gray-400 uppercase tracking-wider mb-1">{c.label}</p>
              <p className={`text-[11px] font-black ${c.color} leading-none`}>{c.value}</p>
              {c.sub && <p className="text-[7px] text-gray-300 mt-0.5">{c.sub}</p>}
            </div>
          ))}
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-2.5 mb-3 shadow-sm">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[8px] text-gray-500">Client payments</span>
            <span className="text-[8px] text-gray-400">₱55,000.00 of ₱100,000.00</span>
          </div>
          <div className="w-full h-1.5 bg-gray-100 rounded-full">
            <div className="h-full bg-emerald-400 rounded-full" style={{ width: '55%' }}></div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-white border border-gray-100 rounded-xl p-2.5 shadow-sm">
            <p className="text-[8px] font-bold text-gray-600 uppercase tracking-wider mb-2">Client Payments</p>
            {[
              { amount: '₱25,000.00', date: 'May 23, 2026', note: 'Downpayment' },
              { amount: '₱30,000.00', date: 'Mar 27, 2026', note: 'Stage 2 - Payment' },
            ].map(p => (
              <div key={p.note} className="mb-2">
                <p className="text-[10px] font-black text-emerald-600 leading-none">{p.amount}</p>
                <p className="text-[7px] text-gray-400 mt-0.5">{p.date} · {p.note}</p>
              </div>
            ))}
            <div className="flex items-center gap-1 mt-2">
              <div className="flex-1 bg-gray-50 border border-gray-100 rounded px-1.5 py-1">
                <span className="text-[7px] text-gray-300">Amount</span>
              </div>
              <div className="bg-gray-50 border border-gray-100 rounded px-1.5 py-1">
                <span className="text-[7px] text-gray-400">05/23/2026</span>
              </div>
              <div className="rounded px-1.5 py-1" style={{ background: '#111827' }}>
                <span className="text-[7px] font-bold text-white">+ Log</span>
              </div>
            </div>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-2.5 shadow-sm">
            <p className="text-[8px] font-bold text-gray-600 uppercase tracking-wider mb-2">Operational Costs</p>
            <div className="flex items-center gap-1 mb-2">
              <p className="text-[8px] text-gray-600 flex-1">Admin</p>
              <p className="text-[9px] font-black text-red-500">₱10,000.00</p>
              <span className="text-[7px] text-gray-400">· May 23</span>
            </div>
            <div className="flex items-center gap-1 mb-1.5">
              <div className="flex-1 bg-gray-50 border border-gray-100 rounded px-1.5 py-1">
                <span className="text-[7px] text-gray-300">e.g. Hosting, Domain</span>
              </div>
              <div className="bg-gray-50 border border-gray-100 rounded px-1.5 py-1">
                <span className="text-[7px] text-gray-300">Amount</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <div className="bg-gray-50 border border-gray-100 rounded px-1.5 py-1">
                <span className="text-[7px] text-gray-400">05/23/2026</span>
              </div>
              <div className="flex-1 rounded px-2 py-1 text-center" style={{ background: 'rgba(255,107,53,0.15)' }}>
                <span className="text-[7px] font-bold text-[#FF6B35]">+ Log Cost</span>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-2.5 shadow-sm">
          <p className="text-[8px] font-bold text-gray-600 uppercase tracking-wider mb-0.5">Team & Payouts</p>
          <p className="text-[7px] text-gray-400 mb-2">Based on net profit of <span className="text-emerald-600 font-bold">₱90,000.00</span></p>
          <div className="flex items-center gap-2 border-b border-gray-50 pb-2 mb-1.5">
            <div className="w-6 h-6 rounded-full bg-[#FF6B35]/10 flex items-center justify-center flex-shrink-0">
              <span className="text-[7px] font-bold text-[#FF6B35]">S</span>
            </div>
            <span className="text-[9px] font-semibold text-gray-700 flex-1">Sofia Lim</span>
            <span className="text-[8px] text-gray-400">50%</span>
            <span className="text-[8px] font-bold text-gray-800">→ ₱45,000.00</span>
            <span className="text-[8px] px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded font-bold">₱20,000 paid</span>
          </div>
          <p className="text-[8px] text-emerald-600 font-bold pl-8">· ₱20,000.00  Mar 27, 2026 · First Payment</p>
        </div>
      </div>
    </div>
  );
}

// ─── Mobile mockup ────────────────────────────────────────────────────────────

function MobileBottomNav({ active }: { active: number }) {
  return (
    <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex items-center justify-around px-3 py-2 z-10">
      {[
        { icon: 'ri-layout-grid-line', idx: 0 },
        { icon: 'ri-money-dollar-circle-line', idx: 1 },
        { icon: 'ri-time-line', idx: 2 },
        { icon: 'ri-folder-line', idx: 3 },
      ].map(n => (
        <i key={n.idx} className={`${n.icon} ${n.idx === active ? 'text-[#FF6B35]' : 'text-gray-300'}`} style={{ fontSize: 17 }}></i>
      ))}
    </div>
  );
}

function MobileDashboard() {
  const [phTime] = useState(() => new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' })));
  const h = phTime.getHours();
  const greeting = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const isDay = h >= 6 && h < 18;
  const skyBg = h >= 5 && h < 7
    ? 'linear-gradient(160deg,#7f1d1d,#fb923c,#fde68a)'
    : h >= 7 && h < 12
    ? 'linear-gradient(160deg,#0369a1,#38bdf8,#bae6fd)'
    : h >= 12 && h < 17
    ? 'linear-gradient(160deg,#1d4ed8,#60a5fa)'
    : h >= 17 && h < 20
    ? 'linear-gradient(160deg,#7c2d12,#9333ea,#1e1b4b)'
    : 'linear-gradient(160deg,#020617,#0f172a,#1e1b4b)';
  return (
    <div className="h-full bg-gray-50 flex flex-col pb-12 overflow-hidden">
      <div className="relative px-4 pt-2 pb-3 flex-shrink-0" style={{ background: skyBg }}>
        <div className="absolute top-2 right-4">
          {isDay
            ? <div className="w-5 h-5 rounded-full bg-yellow-200" style={{ boxShadow: '0 0 8px rgba(253,224,71,0.9)' }}></div>
            : <div className="w-4 h-4 rounded-full bg-slate-200" style={{ boxShadow: '-2px -1px 0 2px #0f172a inset' }}></div>}
        </div>
        <p className="text-[8px] text-white/60">May 23, 2026</p>
        <p className="text-[11px] font-black text-white mt-0.5 drop-shadow">{greeting}, team.</p>
        <p className="text-[8px] text-white/60 mt-0.5">6 online right now</p>
      </div>
      <div className="grid grid-cols-3 gap-1.5 px-3 py-2 flex-shrink-0">
        {[
          { label: 'Online', val: '6', c: 'text-emerald-500' },
          { label: 'Not In', val: '4', c: 'text-amber-500' },
          { label: 'Hrs', val: '192h', c: 'text-sky-500' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl p-2 text-center shadow-sm border border-gray-100">
            <p className={`text-[13px] font-black ${s.c} leading-none`}>{s.val}</p>
            <p className="text-[7px] text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="px-3 flex-1 min-h-0 overflow-y-auto space-y-1">
        <p className="text-[8px] font-bold text-gray-400 mb-1">Team Status</p>
        {['Sofia Lim|Design|online','Renzo Aquino|Content|online','Mika Torres|Media|online','Bianca R.|Creative|not-in','Carlo M.|Admin|not-in'].map(r => {
          const [name, dept, st] = r.split('|');
          return (
            <div key={name} className="flex items-center gap-2 bg-white rounded-lg px-2.5 py-1.5 shadow-sm border border-gray-50">
              <div className="w-5 h-5 rounded-full bg-[#FF6B35]/10 flex items-center justify-center flex-shrink-0">
                <span className="text-[7px] font-bold text-[#FF6B35]">{name[0]}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-medium text-gray-800 truncate">{name}</p>
                <p className="text-[7px] text-gray-400">{dept}</p>
              </div>
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${st === 'online' ? 'bg-emerald-400' : 'bg-amber-300'}`}></span>
            </div>
          );
        })}
        <div className="rounded-xl p-2.5 mt-1" style={{ background: '#FF6B35' }}>
          <p className="text-[7px] font-bold text-white/70 uppercase tracking-wider">Estimated Payroll</p>
          <p className="text-[14px] font-black text-white leading-none mt-0.5">₱71,450.00</p>
          <p className="text-[7px] text-white/60 mt-0.5">May 16–31 cutoff</p>
        </div>
      </div>
      <MobileBottomNav active={0} />
    </div>
  );
}

function MobilePayroll() {
  return (
    <div className="h-full bg-gray-50 flex flex-col pb-12 overflow-hidden">
      <div className="bg-white px-4 py-2.5 border-b border-gray-100 flex-shrink-0">
        <p className="text-[12px] font-black text-gray-900">Payroll</p>
        <div className="flex gap-1.5 mt-1.5">
          <div className="rounded-lg px-2 py-0.5 bg-gray-100"><span className="text-[7px] text-gray-400">May 1–15</span></div>
          <div className="rounded-lg px-2 py-0.5" style={{ background: '#111827' }}><span className="text-[7px] font-bold text-white">May 16–31</span></div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1.5 px-3 py-2 flex-shrink-0">
        {[{ label: 'Total', val: '₱68,612', c: 'text-gray-900' }, { label: 'Hours', val: '138h', c: 'text-sky-500' }].map(s => (
          <div key={s.label} className="bg-white rounded-xl p-2.5 shadow-sm border border-gray-100">
            <p className={`text-[12px] font-black ${s.c} leading-none`}>{s.val}</p>
            <p className="text-[7px] text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto px-3 space-y-1.5">
        {[
          { name: 'Sofia Lim',    dept: 'Creative', type: 'Fixed',  pay: '₱22,500' },
          { name: 'Renzo Aquino', dept: 'Content',  type: 'Fixed',  pay: '₱21,712' },
          { name: 'Mika Torres',  dept: 'Media',    type: 'Hourly', pay: '₱12,400' },
          { name: 'Bianca Reyes', dept: 'Creative', type: 'Fixed',  pay: '₱7,500' },
          { name: 'Carlo Mendez', dept: 'Admin',    type: 'Fixed',  pay: '₱4,500' },
        ].map(r => (
          <div key={r.name} className="bg-white rounded-xl px-2.5 py-2 shadow-sm border border-gray-100 flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-[#FF6B35]/10 flex items-center justify-center flex-shrink-0">
              <span className="text-[7px] font-bold text-[#FF6B35]">{r.name[0]}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-semibold text-gray-800 truncate">{r.name}</p>
              <span className={`text-[6px] px-1 py-0.5 rounded font-bold ${r.type === 'Hourly' ? 'bg-violet-50 text-violet-600' : 'bg-sky-50 text-sky-600'}`}>{r.type}</span>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-[9px] font-black text-gray-900">{r.pay}</p>
              <div className="rounded px-1.5 py-0.5 mt-0.5 inline-block" style={{ background: '#111827' }}>
                <span className="text-[6px] font-bold text-white">Approve</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <MobileBottomNav active={1} />
    </div>
  );
}

function MobileAttendance() {
  return (
    <div className="h-full bg-gray-50 flex flex-col pb-12 overflow-hidden">
      <div className="bg-white px-4 py-2.5 border-b border-gray-100 flex-shrink-0">
        <p className="text-[12px] font-black text-gray-900">Attendance</p>
        <p className="text-[7px] text-gray-400 mt-0.5">Saturday, May 23 · Last updated 9:12 AM</p>
      </div>
      <div className="grid grid-cols-3 gap-1.5 px-3 py-2 flex-shrink-0">
        {[
          { label: 'Online', val: '0', c: 'text-emerald-500' },
          { label: 'Logged Off', val: '1', c: 'text-gray-400' },
          { label: 'Not In', val: '6', c: 'text-amber-500' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl p-2 text-center shadow-sm border border-gray-100">
            <p className={`text-[15px] font-black ${s.c} leading-none`}>{s.val}</p>
            <p className="text-[7px] text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto px-3 space-y-1">
        {[
          ['Angela Rivera','Account Mgmt','logged-off'],
          ['Claudette T.','Account Mgmt','not-in'],
          ['Reese J.','Creative','not-in'],
          ['Bianca Reyes','Admin','not-in'],
          ['Sofia Lim','Design','not-in'],
          ['Carlo Mendez','Creative','not-in'],
        ].map(([name, dept, st]) => (
          <div key={name} className="flex items-center gap-2 bg-white rounded-lg px-2.5 py-2 border border-gray-50">
            <div className="relative flex-shrink-0">
              <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                <span className="text-[8px] font-bold text-gray-500">{name[0]}</span>
              </div>
              <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white ${st === 'logged-off' ? 'bg-gray-400' : 'bg-amber-400'}`}></span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-semibold text-gray-800 truncate">{name}</p>
              <p className="text-[7px] text-gray-400">{dept}</p>
            </div>
            {st === 'logged-off'
              ? <span className="text-[8px] text-gray-400 flex-shrink-0">Logged Off</span>
              : <span className="text-[7px] px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded font-bold flex-shrink-0">Not In</span>}
          </div>
        ))}
      </div>
      <MobileBottomNav active={2} />
    </div>
  );
}

function MobileProjects() {
  return (
    <div className="h-full bg-gray-50 flex flex-col pb-12 overflow-hidden">
      <div className="bg-white px-4 py-2.5 border-b border-gray-100 flex-shrink-0">
        <p className="text-[12px] font-black text-gray-900">Projects</p>
      </div>
      <div className="grid grid-cols-2 gap-1.5 px-3 py-2 flex-shrink-0">
        {[{ label: 'Net Profit', val: '₱166,500', c: 'text-emerald-600' }, { label: 'Collected', val: '62%', c: 'text-emerald-600' }].map(s => (
          <div key={s.label} className="bg-white rounded-xl p-2.5 shadow-sm border border-gray-100">
            <p className={`text-[12px] font-black ${s.c} leading-none`}>{s.val}</p>
            <p className="text-[7px] text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto px-3 space-y-1.5">
        <p className="text-[7px] font-bold text-gray-400 uppercase tracking-wider">Branding & Identity</p>
        <div className="bg-white rounded-xl p-3 shadow-sm border border-[#FF6B35]/20">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-bold text-gray-800">Nova Brew Co.</p>
            <span className="text-[6px] px-1.5 py-0.5 bg-sky-50 text-sky-500 rounded font-bold">Ongoing</span>
          </div>
          <p className="text-[7px] text-gray-400 mb-1.5">Kristine Ang</p>
          <div className="w-full h-1 bg-gray-100 rounded-full mb-1">
            <div className="h-full bg-emerald-400 rounded-full" style={{ width: '55%' }}></div>
          </div>
          <div className="flex justify-between text-[7px] text-gray-400">
            <span>₱55,000 collected</span><span>55.0%</span>
          </div>
        </div>
        <p className="text-[7px] font-bold text-gray-400 uppercase tracking-wider">Website Design</p>
        {[
          { name: 'fernandodesigns.ph', client: 'David Sy', pct: '54.9%', w: '55%' },
          { name: 'greenstone.ph', client: 'Marco D.', pct: '76.1%', w: '76%', urgent: true },
        ].map(p => (
          <div key={p.name} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[9px] font-semibold text-gray-700 truncate mr-1">{p.name}</p>
              <div className="flex gap-0.5 flex-shrink-0">
                {p.urgent && <span className="text-[6px] px-1 bg-amber-50 text-amber-500 rounded font-bold">2d</span>}
                <span className="text-[6px] px-1.5 py-0.5 bg-sky-50 text-sky-500 rounded font-bold">Ongoing</span>
              </div>
            </div>
            <p className="text-[7px] text-gray-400 mb-1.5">{p.client}</p>
            <div className="w-full h-1 bg-gray-100 rounded-full">
              <div className="h-full bg-emerald-400 rounded-full" style={{ width: p.w }}></div>
            </div>
          </div>
        ))}
      </div>
      <MobileBottomNav active={3} />
    </div>
  );
}

function PhoneMockup({ activeScreen }: { activeScreen: number }) {
  return (
    <div className="relative flex-shrink-0" style={{ width: 300 }}>
      {/* Side buttons */}
      <div className="absolute right-0 top-20 translate-x-[3px] w-[3px] h-10 bg-gray-700 rounded-r-sm"></div>
      <div className="absolute left-0 top-16 -translate-x-[3px] w-[3px] h-7 bg-gray-700 rounded-l-sm"></div>
      <div className="absolute left-0 top-28 -translate-x-[3px] w-[3px] h-7 bg-gray-700 rounded-l-sm"></div>
      {/* Phone body */}
      <div className="relative rounded-[32px] bg-gray-900 overflow-hidden shadow-2xl shadow-black/50"
        style={{ height: 560, border: '6px solid #1f2937' }}>
        {/* Dynamic island */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-14 h-3.5 bg-black rounded-full z-20"></div>
        {/* Status bar */}
        <div className="absolute top-0.5 left-0 right-0 flex items-center justify-between px-5 z-10">
          <span className="text-white text-[7px] font-bold">9:12</span>
          <div className="flex items-center gap-0.5">
            <i className="ri-signal-wifi-fill text-white" style={{ fontSize: 6 }}></i>
            <i className="ri-battery-fill text-white" style={{ fontSize: 6 }}></i>
          </div>
        </div>
        {/* Screen */}
        <div className="absolute inset-0 top-5 bg-gray-50 overflow-hidden">
          {activeScreen === 0 && <MobileDashboard />}
          {activeScreen === 1 && <MobilePayroll />}
          {activeScreen === 2 && <MobileAttendance />}
          {activeScreen === 3 && <MobileProjects />}
        </div>
        {/* Home indicator */}
        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-16 h-0.5 bg-white/30 rounded-full z-20"></div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ForAgenciesPage() {
  useSEO({
    title: 'Sentro OS — Custom Internal Operations Hub for Agencies & Firms',
    description:
      'Sentro OS is a done-for-you internal operations hub built around your team\'s workflow. Attendance, payroll, documents, credentials, and more — fully branded for your organization.',
    canonical: '/sentro-os',
    schema: [
      {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'Sentro OS',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        description: 'A custom internal operations hub for agencies and firms. Manage attendance, payroll, documents, credentials, and internal operations — all in one branded system.',
        offers: [
          { '@type': 'Offer', name: 'Starter', price: '4999', priceCurrency: 'PHP' },
          { '@type': 'Offer', name: 'Growth', price: '9999', priceCurrency: 'PHP' },
        ],
        provider: {
          '@type': 'Organization',
          name: 'Huna Creatives',
          url: 'https://www.hunacreatives.com',
        },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        url: 'https://www.hunacreatives.com/sentro-os',
        name: 'Sentro OS — Custom Internal Operations Hub',
        isPartOf: { '@id': 'https://www.hunacreatives.com/#website' },
      },
    ],
  });

  const [activeScreen, setActiveScreen] = useState(0);
  const demoRef = useRef<HTMLDivElement>(null);
  const scrollToDemo = () => demoRef.current?.scrollIntoView({ behavior: 'smooth' });

  const [lit, setLit] = useState(false);
  const [bylineVisible, setBylineVisible] = useState(false);
  const [pageVisible, setPageVisible] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setLit(true),          600);
    const t2 = setTimeout(() => setBylineVisible(true), 1500);
    const t3 = setTimeout(() => setPageVisible(true),   3000);
    return () => [t1, t2, t3].forEach(clearTimeout);
  }, []);

  return (
    <div className="bg-[#080c14] text-white min-h-screen font-sans overflow-x-hidden">

      {/* Nav */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#080c14]/80 backdrop-blur-xl"
        style={{ opacity: pageVisible ? 1 : 0, transition: 'opacity 0.8s ease-out' }}
      >
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

      {/* Keyframes */}
      <style>{`
        @keyframes bulb-on {
          0%   { opacity: 0; text-shadow: none; }
          55%  { opacity: 1; text-shadow: 0 0 10px rgba(255,210,130,0.85), 0 0 28px rgba(255,150,60,0.6), 0 0 60px rgba(255,100,30,0.4), 0 0 100px rgba(255,80,20,0.18); }
          72%  { opacity: 0.93; text-shadow: 0 0 5px rgba(255,190,90,0.6), 0 0 14px rgba(255,120,40,0.4), 0 0 28px rgba(255,80,20,0.18); }
          88%  { opacity: 1; text-shadow: 0 0 8px rgba(255,200,100,0.85), 0 0 20px rgba(255,130,40,0.6), 0 0 40px rgba(255,80,20,0.28); }
          100% { opacity: 1; text-shadow: 0 0 8px rgba(255,200,100,0.9), 0 0 20px rgba(255,130,40,0.6), 0 0 40px rgba(255,80,20,0.3); }
        }
        @keyframes text-breathe {
          0%, 100% { text-shadow: 0 0 8px rgba(255,200,100,0.9), 0 0 20px rgba(255,130,40,0.6), 0 0 40px rgba(255,80,20,0.3); }
          50%       { text-shadow: 0 0 12px rgba(255,220,120,1), 0 0 30px rgba(255,150,60,0.8), 0 0 60px rgba(255,100,30,0.45); }
        }
        .sentro-lit {
          animation: bulb-on 1.1s ease-out forwards, text-breathe 3.8s ease-in-out 1.1s infinite;
        }
        @keyframes marquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .marquee-track { animation: marquee 28s linear infinite; }
      `}</style>

      {/* ── HERO ── */}
      <section
        className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 pt-16"
        style={{
          background: lit
            ? 'radial-gradient(ellipse 75% 55% at 50% 50%, rgba(255,140,50,0.2) 0%, rgba(255,80,20,0.07) 55%, transparent 75%)'
            : 'transparent',
          transition: 'background 2s ease-out',
        }}
      >
        <div className="relative flex flex-col items-center">
          <div
            className={`flex items-baseline select-none${lit ? ' sentro-lit' : ''}`}
            style={{ gap: '0.18em', opacity: lit ? undefined : 0 }}
          >
            <span className="font-black text-white"
              style={{ fontSize: 'clamp(3rem, 12vw, 12rem)', letterSpacing: '-0.03em', lineHeight: 1 }}>
              SENTRO
            </span>
            <span className="font-black text-white/70"
              style={{ fontSize: 'clamp(1.4rem, 5vw, 5rem)', letterSpacing: '-0.02em', lineHeight: 1, marginBottom: '0.5vw', marginLeft: '0.3em' }}>
              OS
            </span>
          </div>
          <div className="w-full flex justify-end mt-1.5"
            style={{ opacity: bylineVisible ? 1 : 0, transform: bylineVisible ? 'translateY(0)' : 'translateY(6px)', transition: 'opacity 1s ease-out, transform 1s ease-out' }}>
            <p className="text-[10px] sm:text-xs text-gray-600 tracking-[0.2em] uppercase">by Huna Creatives</p>
          </div>
        </div>
        <div className="mt-8 sm:mt-12 text-center max-w-xl"
          style={{ opacity: pageVisible ? 1 : 0, transform: pageVisible ? 'translateY(0)' : 'translateY(16px)', transition: 'opacity 1.2s ease-out, transform 1.2s ease-out' }}>
          <p className="text-lg sm:text-xl text-gray-300 leading-relaxed mb-2">
            A custom internal operations hub built around{' '}
            <em className="not-italic font-black text-[#FF6B35]" style={{ textShadow: '0 0 20px rgba(255,107,53,0.5)' }}>your</em>{' '}
            team's workflow.
          </p>
          <p className="text-sm text-gray-500 mb-8">
            Manage HR, attendance, payroll, documents, credentials, SOPs, and internal operations — all in one branded system.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button onClick={scrollToDemo}
              className="w-full sm:w-auto px-7 py-3.5 font-semibold rounded-xl text-sm cursor-pointer transition-all text-white"
              style={{ background: 'linear-gradient(135deg, #FF6B35, #e55a27)', boxShadow: '0 0 24px rgba(255,107,53,0.4)' }}>
              Book a Free Demo →
            </button>
            <a href="#features"
              className="w-full sm:w-auto px-7 py-3.5 border border-white/10 text-gray-400 font-medium rounded-xl hover:bg-white/5 transition-colors text-sm text-center">
              See how it works
            </a>
          </div>
          <p className="text-xs text-gray-700 mt-4">No credit card required · We set it up with you · Your brand on it</p>
        </div>
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          style={{ opacity: pageVisible ? 1 : 0, transition: 'opacity 1s ease-out' }}>
          <div className="w-px h-10 bg-gradient-to-b from-gray-700 to-transparent"></div>
        </div>
      </section>

      {/* ── MARQUEE STRIP ── */}
      <div className="relative z-10 border-y border-white/5 py-4 overflow-hidden">
        <div className="marquee-track flex items-center whitespace-nowrap" style={{ gap: '3rem', width: 'max-content' }}>
          {[...Array(2)].map((_, pass) =>
            [
              { icon: 'ri-time-line',                label: 'Attendance tracking' },
              { icon: 'ri-money-dollar-circle-line', label: 'Payroll calculation' },
              { icon: 'ri-file-text-line',           label: 'Contract generation' },
              { icon: 'ri-building-line',            label: 'Client management' },
              { icon: 'ri-funds-line',               label: 'Project payouts' },
              { icon: 'ri-slack-line',               label: 'Slack notifications' },
              { icon: 'ri-calendar-check-line',      label: 'Time-off approvals' },
              { icon: 'ri-timer-flash-line',         label: 'Overtime tracking' },
              { icon: 'ri-settings-3-line',          label: 'Custom workflow' },
              { icon: 'ri-shield-keyhole-line',      label: 'Credentials vault' },
              { icon: 'ri-book-open-line',           label: 'SOP library' },
              { icon: 'ri-megaphone-line',           label: 'Announcements' },
            ].flatMap((item, i) => [
              <span key={`${pass}-${i}`} className="flex items-center gap-2 flex-shrink-0 text-sm text-gray-500">
                <i className={`${item.icon} text-[#FF6B35] text-base`}></i>
                {item.label}
              </span>,
              <span key={`${pass}-d-${i}`} className="text-white/10 flex-shrink-0">·</span>,
            ])
          )}
        </div>
      </div>

      {/* ── SCREENS ── */}
      <section id="features" className="relative z-10 py-16 sm:py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold text-[#FF6B35] uppercase tracking-widest mb-3">The Platform</p>
            <h2 className="text-4xl sm:text-5xl font-black mb-5 tracking-tight">Built to run your whole team</h2>
            <p className="text-gray-400 max-w-xl mx-auto text-lg">Every screen is designed around how your team actually works — not how enterprise software thinks it does.</p>
          </div>

          {/* Tab buttons — above both columns */}
          <div className="flex flex-wrap gap-2 mb-8 justify-center">
            {SCREENS.map((s, i) => (
              <button key={s.label} onClick={() => setActiveScreen(i)}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${activeScreen === i ? 'text-white' : 'text-gray-400 hover:text-white border border-white/10 hover:bg-white/5'}`}
                style={activeScreen === i ? { background: 'linear-gradient(135deg, #FF6B35, #e55a27)', boxShadow: '0 0 20px rgba(255,107,53,0.3)' } : {}}>
                {s.label}
              </button>
            ))}
          </div>

          {/* Mobile: phone mockup only */}
          <div className="lg:hidden flex justify-center mb-6">
            <PhoneMockup activeScreen={activeScreen} />
          </div>
          <div className="lg:hidden">
            <p className="text-sm text-gray-500 text-center mt-4">{SCREENS[activeScreen].desc}</p>
          </div>

          {/* Desktop: side by side */}
          <div className="hidden lg:flex gap-10 items-start">
            {/* Left: desktop mockup */}
            <div className="flex-1 min-w-0">
              <HubPreview activeScreen={activeScreen} setActiveScreen={setActiveScreen} />
              <p className="text-sm text-gray-500 mt-6">{SCREENS[activeScreen].desc}</p>
            </div>

            {/* Right: phone mockup */}
            <div className="flex-shrink-0">
              <PhoneMockup activeScreen={activeScreen} />
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="relative z-10 py-14 sm:py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-xs font-semibold text-[#FF6B35] uppercase tracking-widest mb-2">What's included</p>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">Everything. Out of the box.</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {FEATURES.map(f => (
              <div key={f.title} className="bg-white/3 border border-white/8 rounded-xl p-4 hover:bg-white/5 hover:border-white/15 transition-all group flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center mt-0.5"
                  style={{ background: 'rgba(255,107,53,0.1)' }}>
                  <i className={`${f.icon} text-[#FF6B35] text-sm`}></i>
                </div>
                <div>
                  <h3 className="font-bold text-white mb-1 text-sm">{f.title}</h3>
                  <p className="text-xs text-gray-400 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="relative z-10 py-14 sm:py-20 px-6 border-y border-white/5">
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
      <section id="pricing" className="relative z-10 py-16 sm:py-28 px-6">
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
      <section className="relative z-10 py-14 sm:py-20 px-6 border-t border-white/5">
        <div className="max-w-4xl mx-auto">
          <div className="grid sm:grid-cols-3 gap-8 text-center">
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
      <section ref={demoRef} className="relative z-10 py-20 sm:py-32 px-6 text-center">
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
          <a href="https://calendly.com/hunacreatives/30min" target="_blank" rel="noopener noreferrer"
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
