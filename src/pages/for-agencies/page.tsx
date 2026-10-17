import { useState } from 'react';
import Navigation from '../../components/feature/Navigation';
import Footer from '../home/components/Footer';
import { useSEO } from '../../hooks/useSEO';
import { BOOKING_URL } from '../../lib/demoBooking';

// ─── Data ─────────────────────────────────────────────────────────────────────

// Screenshots are the real hub in demo mode (sample data), not a mockup — so
// the page can't drift from the product. Re-shoot them when the hub's look
// changes; files live in public/images/sentro/.
const SCREENS = [
  { key: 'dashboard', label: 'Dashboard', desc: 'Who is online, what is due, and what this pay period will cost — the first thing you see each morning.' },
  { key: 'payroll', label: 'Payroll', desc: 'Hours come straight from attendance. Hourly, fixed, and overtime pay are worked out for you — review, approve, export.' },
  { key: 'attendance', label: 'Attendance', desc: 'Your team punches in from Slack. You see who is in, who is off, and every hour logged, live.' },
];

const FEATURES = [
  { icon: 'ri-time-line', title: 'Attendance', desc: 'Punch in and out from Slack. Daily hours, late flags, and overtime are tracked without anyone opening a spreadsheet.' },
  { icon: 'ri-money-dollar-circle-line', title: 'Payroll', desc: 'Pay per cutoff for hourly and fixed-rate employees, in pesos or dollars. Approve each line, then export to PDF or CSV.' },
  { icon: 'ri-file-list-3-line', title: 'Contracts & Documents', desc: 'Employment agreements, NDAs, and offer letters from your own templates — sent, signed, and stored in one place.' },
  { icon: 'ri-inbox-line', title: 'Requests & Approvals', desc: 'Leave, overtime, and document requests land in one queue. No more chasing approvals in group chats.' },
  { icon: 'ri-folder-line', title: 'Projects & Invoices', desc: 'Contract value, collections, costs, and overdue invoices for every client project, side by side.' },
  { icon: 'ri-medal-line', title: 'Performance Reviews', desc: 'Rate each employee, note strengths and areas to improve, and keep every review on file for the next one.' },
  { icon: 'ri-book-open-line', title: 'SOP Library', desc: 'Write your processes once in a proper editor. Share a link with anyone who needs it.' },
  { icon: 'ri-user-search-line', title: 'Hiring', desc: 'Post openings, collect applications, and review candidates without leaving the hub.' },
  { icon: 'ri-shield-keyhole-line', title: 'Credentials Vault', desc: 'Shared logins and licenses stored securely, with access controlled by role.' },
];

const STEPS = [
  { num: '01', title: 'Discovery call', time: '~1 week', desc: 'We map your org — roles, schedules, pay types, departments. Every detail that shapes your hub.' },
  { num: '02', title: 'We build your hub', time: '2–4 weeks', desc: 'Your own Sentro OS instance, configured around your structure — your rules, your roles, your modules.' },
  { num: '03', title: 'Go live', time: 'Ongoing', desc: 'We onboard your team, walk everyone through it, and stay on to maintain it after launch.' },
];

const PLANS = [
  {
    name: 'Starter', setup: '₱15,000', price: '₱2,500', originalPrice: '₱4,999', off: '50% off', per: '/month',
    seats: '5 seats included',
    desc: 'For small teams ready to stop running on spreadsheets.',
    features: ['Custom hub built for your workflow', 'Attendance & time tracking', 'Payroll calculation', 'Document generation', 'Client & project management', 'Onboarding & setup included', 'Email support'],
    cta: 'Book a Demo', highlight: false,
  },
  {
    name: 'Growth', setup: '₱25,000', price: '₱5,999', originalPrice: '₱9,999', off: '40% off', per: '/month',
    seats: '10 seats included',
    desc: 'For growing teams managing multiple departments, clients, and projects.',
    features: ['Everything in Starter', 'Project-based payouts', 'Client questionnaires', 'Overtime & time-off approvals', 'Audit log', '2 rounds of workflow revisions', 'Priority support'],
    cta: 'Book a Demo', highlight: true,
  },
  {
    name: 'Enterprise', setup: 'Custom', price: 'Custom', originalPrice: '', off: '', per: '',
    seats: 'Unlimited seats',
    desc: 'A fully custom build, shaped around your organization from the ground up.',
    features: ['Everything in Growth', 'Custom integrations & modules', 'Dedicated onboarding', 'Dedicated account manager', 'SLA & priority escalation'],
    cta: 'Talk to Us', highlight: false,
  },
];

// Rendered on the page AND fed to the FAQPage schema, so the two stay in sync.
const FAQS = [
  { q: 'What is Sentro OS?', a: 'Sentro OS is a custom-built internal operations hub for agencies and firms. It brings HR, attendance, payroll, contracts, client projects, and internal workflows into one system, set up for your team and branded as your own.' },
  { q: 'Who is it for?', a: 'Creative agencies, design firms, marketing studios, and any service business running a team of employees — particularly Philippine-based teams that want one place for HR and operations.' },
  { q: 'How does attendance tracking work?', a: 'Sentro OS connects to Slack. Your team punches in and out from a Slack channel; the hub records the time, calculates daily hours, flags overtime, and feeds it into payroll.' },
  { q: 'Does it handle payroll?', a: 'Yes. It calculates pay per cutoff for hourly and fixed-rate employees, supports USD-to-PHP conversion, and produces payout summaries you approve line by line.' },
  { q: 'How much does it cost?', a: 'Starter is ₱2,500/month with a ₱15,000 one-time setup. Growth is ₱5,999/month with a ₱25,000 setup. Enterprise is priced per build. Per-seat pricing is set on the demo call based on team size.' },
  { q: 'Is it a SaaS I sign up for?', a: 'No. You get your own instance, configured by us around how your team works, and we maintain it after launch. We run Huna Creatives on the same system.' },
];

// Same frosted-glass recipe as Services and the homepage HighlightTiles.
const glassCardStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.45)',
  backdropFilter: 'blur(20px) saturate(160%)',
  WebkitBackdropFilter: 'blur(20px) saturate(160%)',
  border: '1px solid rgba(255,255,255,0.6)',
  boxShadow: '0 8px 32px rgba(36,48,55,0.08), inset 0 1px 0 rgba(255,255,255,0.5)',
};

const iconChipStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, rgba(7,80,86,0.72), rgba(15,106,112,0.55))',
  backdropFilter: 'blur(12px) saturate(180%)',
  WebkitBackdropFilter: 'blur(12px) saturate(180%)',
  border: '1px solid rgba(255,255,255,0.35)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.45), 0 4px 14px rgba(7,80,86,0.2)',
};

const primaryButtonStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, #FF5B05, #FF8A47)',
  boxShadow: '0 6px 24px rgba(255,91,5,0.35)',
};

const primaryButton = 'inline-flex items-center justify-center gap-2 w-full sm:w-auto px-7 py-3.5 sm:py-3 rounded-full text-[13px] sm:text-xs font-semibold tracking-widest uppercase text-white whitespace-nowrap cursor-pointer transition-transform duration-300 hover:scale-105';
const secondaryButton = 'inline-flex items-center justify-center gap-2 w-full sm:w-auto px-7 py-3.5 sm:py-3 rounded-full text-[13px] sm:text-xs font-semibold tracking-widest uppercase text-[#243037]/60 border border-[#243037]/15 hover:text-[#243037] hover:bg-white/40 whitespace-nowrap transition-all';
const eyebrow = 'text-[11px] font-medium tracking-[0.3em] uppercase text-[#075056]';

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ForAgenciesPage() {
  useSEO({
    title: 'Sentro OS — HR & Operations Hub for Creative Agencies in the Philippines',
    description:
      'Sentro OS is a custom-built internal operations hub for creative agencies and firms in the Philippines. Manage attendance, payroll, contracts, client projects, time-off, overtime, and your full team — all in one branded system. Built and maintained by Huna Creatives.',
    canonical: '/sentro',
    schema: [
      {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'Sentro OS',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        description: 'A custom internal operations hub for creative agencies and firms in the Philippines. Manage attendance, payroll, contracts, client projects, time-off, overtime approvals, SOP library, and credentials — all in one system.',
        keywords: 'agency operations hub, HR software Philippines, payroll management, attendance tracking, creative agency management software, internal operations system, agency HR tool, project tracking Philippines',
        areaServed: 'Philippines',
        offers: [
          { '@type': 'Offer', name: 'Starter', price: '2500', priceCurrency: 'PHP', description: 'For small teams ready to stop running on spreadsheets. Includes attendance, payroll, documents, and project management.' },
          { '@type': 'Offer', name: 'Growth', price: '5999', priceCurrency: 'PHP', description: 'For growing agencies managing multiple departments, clients, and projects. Includes project-based payouts, overtime approvals, and audit log.' },
        ],
        provider: {
          '@type': 'Organization',
          name: 'Huna Creatives',
          url: 'https://www.hunacreatives.com',
          areaServed: 'Philippines',
        },
        featureList: [
          'Attendance & Time Tracking via Slack',
          'Automated Payroll Calculation',
          'Contract & Document Generation',
          'Leave & Overtime Approval Workflows',
          'Client & Project Tracking',
          'Performance Reviews',
          'Careers & Applications Pipeline',
          'SOP Library',
          'Credentials & Shared Asset Vault',
          'Audit Log',
        ],
      },
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: FAQS.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      },
      {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        url: 'https://www.hunacreatives.com/sentro',
        name: 'Sentro OS — HR & Operations Hub for Creative Agencies in the Philippines',
        description: 'Custom-built internal operations hub for creative agencies. Attendance, payroll, contracts, and project tracking — all in one system.',
        isPartOf: { '@id': 'https://www.hunacreatives.com/#website' },
        about: { '@type': 'SoftwareApplication', name: 'Sentro OS' },
      },
    ],
  });

  const [activeScreen, setActiveScreen] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-[#243037] font-body">
      <Navigation invertOnScroll />

      {/* Same continuous orb field as Services/About — one wrapper spanning the
          page so every glass card picks up the color behind it. */}
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute top-[-6%] -left-[15%] w-[900px] h-[900px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(255,91,5,0.16), transparent 72%)', filter: 'blur(70px)', animation: 'orb-float-a 22s ease-in-out infinite' }} />
        <div className="pointer-events-none absolute top-[4%] -right-[15%] w-[820px] h-[820px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(7,80,86,0.4), transparent 72%)', filter: 'blur(70px)', animation: 'orb-float-b 26s ease-in-out infinite' }} />
        <div className="pointer-events-none absolute top-[22%] left-[30%] w-[620px] h-[620px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(211,221,222,0.5), transparent 72%)', filter: 'blur(70px)', animation: 'orb-float-c 20s ease-in-out infinite' }} />
        <div className="pointer-events-none absolute top-[38%] -left-[10%] w-[760px] h-[760px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(7,80,86,0.36), transparent 72%)', filter: 'blur(70px)', animation: 'orb-float-c 24s ease-in-out infinite' }} />
        <div className="pointer-events-none absolute top-[56%] right-[0%] w-[900px] h-[900px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(255,138,71,0.18), transparent 72%)', filter: 'blur(70px)', animation: 'orb-float-d 28s ease-in-out infinite' }} />
        <div className="pointer-events-none absolute top-[72%] left-[8%] w-[560px] h-[560px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(7,80,86,0.32), transparent 72%)', filter: 'blur(70px)', animation: 'orb-float-b 23s ease-in-out infinite' }} />
        <div className="pointer-events-none absolute top-[88%] left-1/3 w-[850px] h-[850px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(7,80,86,0.3), transparent 72%)', filter: 'blur(70px)', animation: 'orb-float-a 25s ease-in-out infinite' }} />

        {/* ═══ HERO ═══ */}
        <section className="relative pt-24 sm:pt-28 pb-10 sm:pb-12">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center sm:text-left">
            <p className={`${eyebrow} mb-4`}>Sentro OS · by Huna Creatives</p>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold font-display leading-tight text-[#243037]">
              Your whole team,<br />run from one place.
            </h1>
            <p className="text-[15px] sm:text-base text-[#243037]/60 leading-relaxed max-w-xl mt-5 mx-auto sm:mx-0">
              Attendance, payroll, contracts, approvals, and projects in one internal hub — built around how your team already works, branded as your own, and maintained by us.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mt-8">
              <a href={BOOKING_URL} target="_blank" rel="noopener noreferrer" className={primaryButton} style={primaryButtonStyle}>
                Book a Demo
              </a>
              <a href="/hub/demo" className={secondaryButton}>
                Try the Live Demo
              </a>
            </div>
            <div className="flex flex-col items-center sm:flex-row sm:flex-wrap gap-3 sm:gap-6 text-[13px] sm:text-xs text-[#243037]/50 mt-7">
              <span className="flex items-center gap-2"><i className="ri-check-line text-[#FF5B05]" />We do the setup</span>
              <span className="flex items-center gap-2"><i className="ri-check-line text-[#FF5B05]" />Your own instance, your branding</span>
              <span className="flex items-center gap-2"><i className="ri-check-line text-[#FF5B05]" />Peso and dollar payroll</span>
            </div>
          </div>
        </section>

        {/* ═══ PRODUCT — real hub screenshots, tabbed ═══ */}
        <section id="features" className="relative px-4 sm:px-6 lg:px-8 pb-16 sm:pb-24 scroll-mt-24">
          <div className="max-w-6xl mx-auto">
            <div
              className="rounded-3xl p-3 sm:p-5 lg:p-6"
              style={{
                background: 'linear-gradient(135deg, rgba(160,180,205,0.5), rgba(205,215,225,0.28))',
                backdropFilter: 'blur(30px) saturate(160%)',
                WebkitBackdropFilter: 'blur(30px) saturate(160%)',
                border: '1px solid rgba(255,255,255,0.5)',
                boxShadow: '0 20px 60px rgba(36,48,55,0.12), inset 0 1px 0 rgba(255,255,255,0.5)',
              }}
            >
              <div className="flex items-center justify-center sm:justify-start gap-1.5 mb-4 sm:mb-5" role="tablist" aria-label="Hub screens">
                {SCREENS.map((s, i) => (
                  <button
                    key={s.key}
                    role="tab"
                    aria-selected={activeScreen === i}
                    onClick={() => setActiveScreen(i)}
                    className={`px-4 sm:px-5 py-2 rounded-full text-[13px] sm:text-xs font-semibold transition-all cursor-pointer ${
                      activeScreen === i ? 'bg-[#243037] text-white' : 'text-[#243037]/60 hover:text-[#243037] hover:bg-white/50'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {/* Desktop view: all screens share one grid cell and cross-fade,
                  so switching tabs never reflows or flashes while loading. */}
              <div className="relative hidden md:block">
                <div className="grid rounded-2xl overflow-hidden border border-white/70 shadow-[0_12px_40px_rgba(36,48,55,0.18)] bg-[#e8edf5]">
                  {SCREENS.map((s, i) => (
                    <img
                      key={s.key}
                      src={`/images/sentro/hub-${s.key}.webp`}
                      alt={`Sentro OS ${s.label} screen`}
                      width={2200}
                      height={1375}
                      loading={i === 0 ? 'eager' : 'lazy'}
                      aria-hidden={i !== activeScreen}
                      className={`col-start-1 row-start-1 w-full h-auto transition-opacity duration-500 ${i === activeScreen ? 'opacity-100' : 'opacity-0'}`}
                    />
                  ))}
                </div>
                {/* Phone view of the same screen, overlapping the corner */}
                <div className="hidden lg:block absolute -right-10 -bottom-12 w-[200px]">
                  <div className="grid rounded-[28px] overflow-hidden border-[6px] border-[#243037] shadow-[0_20px_50px_rgba(36,48,55,0.35)] bg-white">
                    {SCREENS.map((s, i) => (
                      <img
                        key={s.key}
                        src={`/images/sentro/hub-${s.key}-phone.webp`}
                        alt=""
                        width={780}
                        height={1688}
                        loading="lazy"
                        className={`col-start-1 row-start-1 w-full h-auto transition-opacity duration-500 ${i === activeScreen ? 'opacity-100' : 'opacity-0'}`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Phone screens on phones — the desktop shot is unreadable at 360px */}
              <div className="md:hidden flex justify-center">
                <div className="grid w-[260px] rounded-[30px] overflow-hidden border-[6px] border-[#243037] shadow-[0_16px_40px_rgba(36,48,55,0.3)] bg-white">
                  {SCREENS.map((s, i) => (
                    <img
                      key={s.key}
                      src={`/images/sentro/hub-${s.key}-phone.webp`}
                      alt={`Sentro OS ${s.label} screen on a phone`}
                      width={780}
                      height={1688}
                      loading={i === 0 ? 'eager' : 'lazy'}
                      aria-hidden={i !== activeScreen}
                      className={`col-start-1 row-start-1 w-full h-auto transition-opacity duration-500 ${i === activeScreen ? 'opacity-100' : 'opacity-0'}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <p className="text-[15px] sm:text-sm text-[#243037]/60 leading-relaxed mt-6 max-w-xl text-center sm:text-left mx-auto sm:mx-0 min-h-[3em]">
              {SCREENS[activeScreen].desc}
            </p>
          </div>
        </section>

        {/* ═══ WHY WE BUILT IT ═══ */}
        <section className="relative px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
          <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 md:gap-16 items-start">
            <div className="text-center sm:text-left">
              <p className={`${eyebrow} mb-3`}>Why it exists</p>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#243037] leading-tight">
                We built it for<br />ourselves first.
              </h2>
            </div>
            <div className="space-y-4 text-[15px] sm:text-sm text-[#243037]/65 leading-relaxed">
              <p>
                Huna ran on spreadsheets, group chats, and payroll done by hand. It was slow and error-prone.
              </p>
              <p>
                So we built one hub for our own team — attendance, payroll, contracts, approvals, credentials. It worked. Other firms had the same problem, so we started building it for them.
              </p>
              <p>
                Sentro OS is that system, set up for them. Same foundation, configured around their roles, pay rules, and workflow — not a generic tool their team has to bend around.
              </p>
              <figure className="rounded-2xl p-5 sm:p-6 mt-6" style={{ ...glassCardStyle, background: 'rgba(255,255,255,0.6)' }}>
                <blockquote className="text-[15px] sm:text-base text-[#243037]/80 leading-relaxed">
                  &ldquo;We didn&rsquo;t build Sentro OS to sell software. We built it because we needed it — and it turned out everyone else needed it too.&rdquo;
                </blockquote>
                <figcaption className="flex items-center gap-3 mt-4">
                  <img src="/images/francis-fiel-roble-headshot.png" alt="Francis Fiel Roble" className="w-9 h-9 rounded-full object-cover" />
                  <span className="text-xs text-[#243037]/50">
                    <span className="font-semibold text-[#243037]">Francis Fiel Roble</span> · Founder, Huna Creatives
                  </span>
                </figcaption>
              </figure>
            </div>
          </div>
        </section>

        {/* ═══ WHAT'S INSIDE ═══ */}
        <section className="relative px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <div className="max-w-6xl mx-auto">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#243037] mb-2 text-center sm:text-left">What&rsquo;s inside.</h2>
            <p className="text-[15px] sm:text-sm text-[#243037]/50 mb-8 sm:mb-10 text-center sm:text-left">Pick the modules your team needs. We switch on the rest as you grow.</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {FEATURES.map((f) => (
                <div key={f.title} className="rounded-2xl p-6 sm:p-7" style={glassCardStyle}>
                  <div className="w-12 h-12 flex items-center justify-center rounded-xl mb-5" style={iconChipStyle}>
                    <i className={`${f.icon} text-xl text-white`} />
                  </div>
                  <h3 className="font-display text-base sm:text-lg font-bold text-[#243037] mb-2 leading-tight">{f.title}</h3>
                  <p className="text-[13px] text-[#243037]/55 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ HOW WE SET IT UP ═══ */}
        <section className="relative px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <div className="max-w-6xl mx-auto">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#243037] mb-2 text-center sm:text-left">How we set it up.</h2>
            <p className="text-[15px] sm:text-sm text-[#243037]/50 mb-8 sm:mb-10 text-center sm:text-left">From the first call to your team logging in.</p>
            <ol className="grid sm:grid-cols-3 gap-5">
              {STEPS.map((s) => (
                <li key={s.num} className="rounded-2xl p-6 sm:p-7" style={glassCardStyle}>
                  <div className="flex items-baseline justify-between mb-4">
                    <span className="font-display text-3xl font-bold text-[#243037]/15">{s.num}</span>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#075056]">{s.time}</span>
                  </div>
                  <h3 className="font-display text-base sm:text-lg font-bold text-[#243037] mb-2">{s.title}</h3>
                  <p className="text-[13px] text-[#243037]/55 leading-relaxed">{s.desc}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ═══ PRICING ═══ */}
        <section id="pricing" className="relative px-4 sm:px-6 lg:px-8 py-10 sm:py-16 scroll-mt-24">
          <div className="max-w-6xl mx-auto">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#243037] mb-2 text-center sm:text-left">Pricing.</h2>
            <p className="text-[15px] sm:text-sm text-[#243037]/50 mb-8 sm:mb-10 text-center sm:text-left">One-time setup, then a flat monthly base plus seats. No surprises.</p>
            <div className="grid md:grid-cols-3 gap-5 items-stretch">
              {PLANS.map((p) => (
                <div
                  key={p.name}
                  className="relative rounded-3xl p-6 sm:p-7 flex flex-col"
                  style={p.highlight
                    ? { ...glassCardStyle, background: 'rgba(255,255,255,0.78)', boxShadow: '0 16px 48px rgba(36,48,55,0.14), inset 0 1px 0 rgba(255,255,255,0.6)' }
                    : glassCardStyle}
                >
                  {p.highlight && (
                    <span className="absolute top-6 right-6 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[9px] font-bold tracking-wider uppercase text-[#FF5B05] bg-[#FF5B05]/10 border border-[#FF5B05]/20">
                      Most Popular
                    </span>
                  )}
                  <h3 className="font-display text-lg font-bold text-[#243037]">{p.name}</h3>
                  <p className="text-[13px] text-[#243037]/55 leading-relaxed mt-1 mb-5">{p.desc}</p>

                  <div className="flex items-end gap-2 flex-wrap">
                    {p.originalPrice && <span className="text-base text-[#243037]/35 line-through mb-1">{p.originalPrice}</span>}
                    <span className="font-display text-3xl font-bold text-[#243037]">{p.price}</span>
                    {p.per && <span className="text-sm text-[#243037]/50 mb-1">{p.per}</span>}
                  </div>
                  <p className="text-[11px] text-[#243037]/45 mt-1">
                    {p.off ? <><span className="text-[#FF5B05] font-semibold">Introductory · {p.off}</span> · </> : null}
                    {p.setup === 'Custom' ? 'Custom setup fee' : `${p.setup} one-time setup`}
                  </p>
                  <p className="text-[11px] text-[#243037]/45 mt-0.5">{p.seats} · then per seat</p>

                  <ul className="space-y-2 mt-6 mb-7 flex-1 pt-6 border-t border-[#243037]/8">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-[13px] text-[#243037]/70">
                        <i className="ri-check-line text-[#075056] mt-0.5 flex-shrink-0" />{f}
                      </li>
                    ))}
                  </ul>

                  <a
                    href={BOOKING_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={p.highlight ? `${primaryButton} sm:w-full` : `${secondaryButton} sm:w-full`}
                    style={p.highlight ? primaryButtonStyle : undefined}
                  >
                    {p.cta}
                  </a>
                </div>
              ))}
            </div>
            <p className="text-xs text-[#243037]/45 mt-5 text-center sm:text-left">Per-seat pricing is set on the demo call, based on team size.</p>
          </div>
        </section>

        {/* ═══ CTA — Gradient Cloud panel, same as Services ═══ */}
        <section className="relative px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <div
            className="max-w-4xl mx-auto rounded-3xl p-8 sm:p-14 text-center relative overflow-hidden"
            style={{
              background: [
                'linear-gradient(180deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 40%)',
                'linear-gradient(120deg, rgba(255,217,138,0.7), rgba(255,138,71,0.7), rgba(255,91,5,0.7), rgba(255,198,112,0.7))',
              ].join(', '),
              backgroundSize: '100% 100%, 300% 300%',
              animation: 'gradient-shift 8s ease infinite',
              backdropFilter: 'blur(24px) saturate(160%)',
              WebkitBackdropFilter: 'blur(24px) saturate(160%)',
              border: '1px solid rgba(255,255,255,0.5)',
              boxShadow: '0 20px 60px rgba(255,91,5,0.25), inset 0 1px 0 rgba(255,255,255,0.4)',
            }}
          >
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white mb-3 leading-tight">
              See it with your own team in mind.
            </h2>
            <p className="text-white/80 text-[15px] sm:text-sm mb-7 max-w-md mx-auto leading-relaxed">
              Thirty minutes. We walk through the hub, learn how your team runs, and show you what we&rsquo;d build.
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
              <a
                href={BOOKING_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-8 py-3.5 rounded-full text-[13px] sm:text-xs font-semibold tracking-widest uppercase text-[#243037] bg-white whitespace-nowrap cursor-pointer transition-transform duration-300 hover:scale-105"
              >
                Book a Demo
              </a>
              <a
                href="/hub/demo"
                className="w-full sm:w-auto px-8 py-3.5 rounded-full text-[13px] sm:text-xs font-semibold tracking-widest uppercase text-white border border-white/60 hover:bg-white/15 whitespace-nowrap transition-colors"
              >
                Try the Live Demo
              </a>
            </div>
          </div>
        </section>

        {/* ═══ FAQ ═══ */}
        <section className="relative px-4 sm:px-6 lg:px-8 pt-10 sm:pt-14 pb-16 sm:pb-24">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#243037] mb-8 text-center">Questions.</h2>
            <div className="space-y-3">
              {FAQS.map((f, i) => {
                const open = openFaq === i;
                return (
                  <div key={f.q} className="rounded-2xl" style={glassCardStyle}>
                    <button
                      onClick={() => setOpenFaq(open ? null : i)}
                      aria-expanded={open}
                      className="w-full flex items-center justify-between gap-4 text-left px-5 sm:px-6 py-4 cursor-pointer"
                    >
                      <span className="font-display text-[15px] sm:text-sm font-bold text-[#243037]">{f.q}</span>
                      <i className={`ri-add-line text-lg text-[#243037]/50 flex-shrink-0 transition-transform duration-300 ${open ? 'rotate-45' : ''}`} />
                    </button>
                    {/* Always in the HTML (hidden when closed) so crawlers read
                        every answer the FAQPage schema claims is on the page. */}
                    <p hidden={!open} className="px-5 sm:px-6 pb-5 -mt-1 text-[15px] sm:text-sm text-[#243037]/60 leading-relaxed">{f.a}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>

      <Footer isDark />
    </div>
  );
}
