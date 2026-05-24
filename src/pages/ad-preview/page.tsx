import { useState } from 'react';

// ─── Mockup components ─────────────────────────────────────────────────────────

function DashboardMockup({ compact = false }: { compact?: boolean }) {
  return (
    <div className="w-full rounded-xl overflow-hidden shadow-2xl" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="flex items-center gap-1.5 px-3 py-2 bg-[#161616]">
        <div className="w-2 h-2 rounded-full bg-red-500/60"></div>
        <div className="w-2 h-2 rounded-full bg-yellow-500/60"></div>
        <div className="w-2 h-2 rounded-full bg-green-500/60"></div>
        <div className="flex-1 mx-2 bg-[#2a2a2a] rounded text-[6px] text-gray-600 px-2 py-0.5 text-center">sentro.app / dashboard</div>
      </div>
      <div className="flex" style={{ height: compact ? 130 : 170, background: '#f8f9fa' }}>
        <div className="w-12 bg-[#1a1f2e] flex flex-col items-center py-2 gap-1.5 flex-shrink-0">
          <div className="w-6 h-6 rounded-lg bg-[#FF6B35] flex items-center justify-center mb-1">
            <i className="ri-layout-grid-line text-white" style={{ fontSize: 8 }}></i>
          </div>
          {['ri-user-line','ri-time-line','ri-money-dollar-circle-line','ri-folder-line','ri-file-list-3-line'].map((icon, i) => (
            <div key={i} className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: i === 0 ? 'rgba(255,107,53,0.15)' : 'transparent' }}>
              <i className={`${icon} text-gray-500`} style={{ fontSize: 8 }}></i>
            </div>
          ))}
        </div>
        <div className="flex-1 p-2 overflow-hidden flex flex-col gap-1.5">
          <div className="rounded-lg p-2 text-white" style={{ background: 'linear-gradient(135deg, #1e3a5f, #0f2040)' }}>
            <div className="font-black mb-0.5" style={{ fontSize: 7 }}>Good morning, Francis 👋</div>
            <div className="text-blue-300/70" style={{ fontSize: 6 }}>Saturday · May 24, 2026</div>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {[['8','Online','#22c55e'],['2','On Leave','#f59e0b'],['₱84k','Period','#FF6B35']].map(([v,l,c]) => (
              <div key={l} className="bg-white rounded-lg p-1.5 shadow-sm">
                <div className="font-black" style={{ fontSize: 9, color: c }}>{v}</div>
                <div className="text-gray-400" style={{ fontSize: 6 }}>{l}</div>
              </div>
            ))}
          </div>
          <div className="flex-1 flex flex-col gap-1 overflow-hidden">
            {[['Sofia L.','Design',true],['Renzo A.','Creative',true],['Mika T.','Accounts',false],['Bianca R.','Admin',compact ? undefined : false]].filter(Boolean).map(([n,d,o]) => (
              <div key={String(n)} className="flex items-center gap-1 bg-white rounded-md px-1.5 py-1 shadow-sm">
                <div className="relative flex-shrink-0">
                  <div className="w-3.5 h-3.5 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-600" style={{ fontSize: 5 }}>{String(n)[0]}</div>
                  <div className={`absolute -bottom-px -right-px w-1.5 h-1.5 rounded-full border border-white ${o ? 'bg-green-400' : 'bg-gray-300'}`}></div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-700 truncate" style={{ fontSize: 6 }}>{String(n)}</div>
                  <div className="text-gray-400 truncate" style={{ fontSize: 5 }}>{String(d)}</div>
                </div>
                <div className="font-semibold flex-shrink-0" style={{ fontSize: 5.5, color: o ? '#22c55e' : '#9ca3af' }}>{o ? '●' : '○'}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AttendanceMockup() {
  const rows = [
    { name: 'Sofia L.', time: '8:02 AM', status: 'On time', dot: '#22c55e' },
    { name: 'Renzo A.', time: '8:17 AM', status: 'Late', dot: '#f59e0b' },
    { name: 'Mika T.', time: '8:01 AM', status: 'On time', dot: '#22c55e' },
    { name: 'Bianca R.', time: '—', status: 'Absent', dot: '#ef4444' },
    { name: 'Paolo M.', time: '8:05 AM', status: 'On time', dot: '#22c55e' },
  ];
  return (
    <div className="w-full rounded-xl overflow-hidden shadow-2xl" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="flex items-center gap-1.5 px-3 py-2 bg-[#161616]">
        <div className="w-2 h-2 rounded-full bg-red-500/60"></div>
        <div className="w-2 h-2 rounded-full bg-yellow-500/60"></div>
        <div className="w-2 h-2 rounded-full bg-green-500/60"></div>
        <div className="flex-1 mx-2 bg-[#2a2a2a] rounded text-[6px] text-gray-600 px-2 py-0.5 text-center">sentro.app / attendance</div>
      </div>
      <div className="flex" style={{ background: '#f8f9fa' }}>
        <div className="w-12 bg-[#1a1f2e] flex flex-col items-center py-2 gap-1.5 flex-shrink-0">
          <div className="w-6 h-6 rounded-lg bg-[#FF6B35] flex items-center justify-center mb-1">
            <i className="ri-layout-grid-line text-white" style={{ fontSize: 8 }}></i>
          </div>
          {['ri-user-line','ri-time-line','ri-money-dollar-circle-line','ri-folder-line'].map((icon, i) => (
            <div key={i} className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: i === 1 ? 'rgba(255,107,53,0.15)' : 'transparent' }}>
              <i className={`${icon} text-gray-500`} style={{ fontSize: 8 }}></i>
            </div>
          ))}
        </div>
        <div className="flex-1 p-2 overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="font-black text-gray-700" style={{ fontSize: 8 }}>Attendance · Today</span>
            <span className="px-1.5 py-0.5 rounded text-white font-bold" style={{ fontSize: 6, background: '#FF6B35' }}>May 24</span>
          </div>
          <div className="flex flex-col gap-1">
            {rows.map(r => (
              <div key={r.name} className="flex items-center gap-1.5 bg-white rounded-lg px-2 py-1.5 shadow-sm">
                <div className="w-3.5 h-3.5 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-600 flex-shrink-0" style={{ fontSize: 5 }}>{r.name[0]}</div>
                <div className="flex-1 font-semibold text-gray-700 truncate" style={{ fontSize: 6.5 }}>{r.name}</div>
                <div className="text-gray-400" style={{ fontSize: 6 }}>{r.time}</div>
                <div className="flex items-center gap-0.5">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: r.dot }}></div>
                  <span style={{ fontSize: 6, color: r.dot, fontWeight: 700 }}>{r.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PayrollMockup() {
  const items = [
    { name: 'Sofia Lim', role: 'Designer', days: 22, gross: '₱18,500', net: '₱16,200' },
    { name: 'Renzo Aquino', role: 'Creative', days: 21, gross: '₱16,000', net: '₱14,100' },
    { name: 'Mika Torres', role: 'Accounts', days: 22, gross: '₱14,500', net: '₱12,800' },
  ];
  return (
    <div className="w-full rounded-xl overflow-hidden shadow-2xl" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="flex items-center gap-1.5 px-3 py-2 bg-[#161616]">
        <div className="w-2 h-2 rounded-full bg-red-500/60"></div>
        <div className="w-2 h-2 rounded-full bg-yellow-500/60"></div>
        <div className="w-2 h-2 rounded-full bg-green-500/60"></div>
        <div className="flex-1 mx-2 bg-[#2a2a2a] rounded text-[6px] text-gray-600 px-2 py-0.5 text-center">sentro.app / payroll</div>
      </div>
      <div className="flex" style={{ background: '#f8f9fa' }}>
        <div className="w-12 bg-[#1a1f2e] flex flex-col items-center py-2 gap-1.5 flex-shrink-0">
          <div className="w-6 h-6 rounded-lg bg-[#FF6B35] flex items-center justify-center mb-1">
            <i className="ri-layout-grid-line text-white" style={{ fontSize: 8 }}></i>
          </div>
          {['ri-user-line','ri-time-line','ri-money-dollar-circle-line','ri-folder-line'].map((icon, i) => (
            <div key={i} className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: i === 2 ? 'rgba(255,107,53,0.15)' : 'transparent' }}>
              <i className={`${icon} text-gray-500`} style={{ fontSize: 8 }}></i>
            </div>
          ))}
        </div>
        <div className="flex-1 p-2 overflow-hidden">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-black text-gray-700" style={{ fontSize: 8 }}>Payroll · May 2026</span>
            <span className="px-1.5 py-0.5 rounded text-white font-bold" style={{ fontSize: 6, background: '#22c55e' }}>Processed</span>
          </div>
          <div className="grid grid-cols-3 gap-1 mb-2">
            {[['₱84k','Total Out'],['22','Avg Days'],['3','Contractors']].map(([v,l]) => (
              <div key={l} className="bg-white rounded-lg p-1.5 shadow-sm text-center">
                <div className="font-black text-[#FF6B35]" style={{ fontSize: 9 }}>{v}</div>
                <div className="text-gray-400" style={{ fontSize: 6 }}>{l}</div>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-1">
            {items.map(item => (
              <div key={item.name} className="bg-white rounded-lg px-2 py-1.5 shadow-sm">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-semibold text-gray-700" style={{ fontSize: 6.5 }}>{item.name}</span>
                  <span className="font-black text-[#22c55e]" style={{ fontSize: 7 }}>{item.net}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400" style={{ fontSize: 5.5 }}>{item.role}</span>
                  <span className="text-gray-300" style={{ fontSize: 5.5 }}>·</span>
                  <span className="text-gray-400" style={{ fontSize: 5.5 }}>{item.days} days</span>
                  <span className="text-gray-300" style={{ fontSize: 5.5 }}>·</span>
                  <span className="text-gray-400" style={{ fontSize: 5.5 }}>Gross {item.gross}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Slide shell ───────────────────────────────────────────────────────────────

function SlideWrapper({ children, bg, grain = true }: { children: React.ReactNode; bg: string; grain?: boolean }) {
  return (
    <div className="relative w-full rounded-2xl overflow-hidden flex flex-col" style={{ aspectRatio: '4/5', background: bg }}>
      {grain && (
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`, backgroundSize: '200px' }} />
      )}
      {children}
    </div>
  );
}

function PillLabel({ text, accent }: { text: string; accent: string }) {
  return (
    <span className="text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full self-start"
      style={{ background: `${accent}18`, color: accent, border: `1px solid ${accent}30` }}>
      {text}
    </span>
  );
}

// ─── Sentro slides ─────────────────────────────────────────────────────────────

function Slide1Sentro() {
  const tools = ['WhatsApp', 'Spreadsheet', 'Email', 'Notion', 'Slack DMs', 'Paper trails'];
  return (
    <SlideWrapper bg="linear-gradient(145deg, #060a12 0%, #0e1828 100%)">
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 80%, rgba(255,107,53,0.08) 0%, transparent 70%)' }} />
      <div className="flex flex-col h-full p-6">
        <PillLabel text="Sound familiar?" accent="#FF6B35" />
        <div className="flex-1 flex flex-col justify-center">
          <h2 className="font-black text-white leading-tight mb-4"
            style={{ fontSize: 'clamp(1.5rem, 5.5vw, 2rem)', letterSpacing: '-0.03em', textShadow: '0 0 40px rgba(255,255,255,0.05)' }}>
            {'Still running\nyour team on\nthis?'}
          </h2>
          <div className="flex flex-wrap gap-2">
            {tools.map((t, i) => (
              <span key={t} className="text-[10px] font-semibold px-3 py-1.5 rounded-full"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.4)',
                  transform: `rotate(${[-2,-1,1,2,-1.5,1.5][i]}deg)`,
                }}>
                {t}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="w-1.5 h-1.5 rounded-full bg-[#FF6B35]"></div>
          <span className="text-[10px] text-gray-600">There's a better way.</span>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, #FF6B3540, transparent)' }} />
    </SlideWrapper>
  );
}

function Slide2Sentro() {
  const pains = [
    { icon: 'ri-user-unfollow-line', text: 'Missed punch-ins slip through' },
    { icon: 'ri-money-dollar-circle-line', text: 'Payroll errors every period' },
    { icon: 'ri-lock-unlock-line', text: 'Credentials shared over chat' },
    { icon: 'ri-time-line', text: 'Overtime tracked manually' },
  ];
  return (
    <SlideWrapper bg="linear-gradient(145deg, #0d0505 0%, #180800 100%)">
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 100%, rgba(220,38,38,0.12) 0%, transparent 60%)' }} />
      <div className="flex flex-col h-full p-6">
        <PillLabel text="The real cost" accent="#ef4444" />
        <div className="flex-1 flex flex-col justify-center gap-4">
          <h2 className="font-black text-white leading-tight"
            style={{ fontSize: 'clamp(1.4rem, 5vw, 1.8rem)', letterSpacing: '-0.03em' }}>
            Every crack in<br />your system has<br /><span style={{ color: '#ef4444', textShadow: '0 0 20px rgba(239,68,68,0.4)' }}>a price.</span>
          </h2>
          <div className="flex flex-col gap-2.5">
            {pains.map(p => (
              <div key={p.text} className="flex items-center gap-3 rounded-xl px-4 py-2.5" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)' }}>
                <i className={`${p.icon} text-red-500 text-base flex-shrink-0`}></i>
                <span className="text-[11px] text-gray-400">{p.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SlideWrapper>
  );
}

// Slide 3 — Reveal with full dashboard mockup below
function Slide3Sentro() {
  return (
    <SlideWrapper bg="linear-gradient(145deg, #080c14 0%, #0d1000 100%)">
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 20%, rgba(255,107,53,0.14) 0%, transparent 60%)' }} />
      <div className="flex flex-col h-full p-5">
        {/* Top — brand */}
        <div className="flex flex-col items-center text-center pt-2 pb-4">
          <PillLabel text="The solution" accent="#FF6B35" />
          <div className="my-4 relative">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto"
              style={{ background: 'rgba(255,107,53,0.15)', border: '1px solid rgba(255,107,53,0.3)', boxShadow: '0 0 40px rgba(255,107,53,0.25)' }}>
              <i className="ri-layout-grid-line text-2xl text-[#FF6B35]"></i>
            </div>
          </div>
          <h2 className="font-black text-white leading-none mb-2"
            style={{ fontSize: 'clamp(2rem, 8vw, 3rem)', letterSpacing: '-0.04em', textShadow: '0 0 60px rgba(255,107,53,0.3)' }}>
            SENTRO<span style={{ color: '#FF6B35' }}> OS</span>
          </h2>
          <p className="text-gray-500 text-[10px] leading-relaxed max-w-[220px]">Your own internal operations hub — built around your team's workflow.</p>
        </div>
        {/* Bottom — dashboard mockup */}
        <div className="flex-1 relative min-h-0 px-1">
          <DashboardMockup />
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3/4 h-6 pointer-events-none" style={{ background: 'rgba(255,107,53,0.18)', filter: 'blur(14px)' }} />
        </div>
        <div className="mt-3 flex items-center justify-center gap-1.5">
          {['by','Huna','Creatives'].map(w => <span key={w} className="text-[9px] text-gray-700">{w}</span>)}
        </div>
      </div>
    </SlideWrapper>
  );
}

// Slide 4 — What's inside with attendance mockup
function Slide4Sentro() {
  const features = ['Attendance', 'Payroll', 'Documents', 'Credentials', 'Projects', 'SOPs', 'Requests', 'Overtime', 'Announcements'];
  return (
    <SlideWrapper bg="linear-gradient(145deg, #060a12 0%, #0e1828 100%)">
      <div className="absolute top-0 right-0 w-40 h-40 pointer-events-none" style={{ background: 'radial-gradient(circle at top right, rgba(255,107,53,0.1), transparent 70%)' }} />
      <div className="flex flex-col h-full p-5">
        <PillLabel text="What's inside" accent="#FF6B35" />
        <h2 className="font-black text-white mt-3 mb-3 leading-tight"
          style={{ fontSize: 'clamp(1.2rem, 4.5vw, 1.5rem)', letterSpacing: '-0.02em' }}>
          One hub.<br />Everything managed.
        </h2>
        {/* Attendance mockup */}
        <div className="relative mb-3">
          <AttendanceMockup />
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2/3 h-4 pointer-events-none" style={{ background: 'rgba(255,107,53,0.12)', filter: 'blur(10px)' }} />
        </div>
        {/* Feature pills */}
        <div className="flex flex-wrap gap-1.5 justify-center">
          {features.map(f => (
            <span key={f} className="text-[8px] font-semibold px-2 py-1 rounded-full"
              style={{ background: 'rgba(255,107,53,0.08)', border: '1px solid rgba(255,107,53,0.15)', color: 'rgba(255,107,53,0.8)' }}>
              {f}
            </span>
          ))}
        </div>
      </div>
    </SlideWrapper>
  );
}

// Slide 5 — Trust with payroll mockup
function Slide5Sentro() {
  return (
    <SlideWrapper bg="linear-gradient(145deg, #0a0c08 0%, #080c14 100%)">
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(255,107,53,0.08) 0%, transparent 60%)' }} />
      <div className="flex flex-col h-full p-5">
        <PillLabel text="Why trust us" accent="#FF6B35" />
        <div className="mt-3 mb-4">
          <h2 className="font-black text-white leading-tight mb-1"
            style={{ fontSize: 'clamp(1.2rem, 4.5vw, 1.6rem)', letterSpacing: '-0.03em' }}>
            We built it<br />for <span style={{ color: '#FF6B35', textShadow: '0 0 20px rgba(255,107,53,0.4)' }}>ourselves</span> first.
          </h2>
          <p className="text-gray-600 text-[10px] leading-relaxed">Every feature on Sentro OS has been used by our own team since day one.</p>
        </div>
        {/* Payroll mockup */}
        <div className="flex-1 relative min-h-0">
          <PayrollMockup />
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2/3 h-4 pointer-events-none" style={{ background: 'rgba(255,107,53,0.12)', filter: 'blur(10px)' }} />
        </div>
        {/* Quote */}
        <div className="mt-3 rounded-xl p-3" style={{ background: 'rgba(255,107,53,0.06)', border: '1px solid rgba(255,107,53,0.15)' }}>
          <p className="text-gray-400 text-[10px] leading-relaxed italic mb-2">
            "We didn't build this to sell software. We built it because we needed it."
          </p>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white flex-shrink-0" style={{ background: '#FF6B35' }}>F</div>
            <div>
              <p className="text-[8px] font-bold text-white">Francis · Founder, Huna Creatives</p>
            </div>
          </div>
        </div>
      </div>
    </SlideWrapper>
  );
}

// Slide 6 — CTA with full dashboard
function Slide6Sentro() {
  return (
    <SlideWrapper bg="linear-gradient(160deg, #060810 0%, #0f0a00 60%, #120800 100%)">
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 100%, rgba(255,107,53,0.2) 0%, transparent 60%)' }} />
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 50% 40% at 50% 30%, rgba(255,107,53,0.06) 0%, transparent 70%)' }} />
      <div className="flex flex-col h-full p-5">
        <PillLabel text="Get started" accent="#FF6B35" />
        <h2 className="font-black text-white mt-3 mb-1 leading-tight"
          style={{ fontSize: 'clamp(1.2rem, 4.5vw, 1.6rem)', letterSpacing: '-0.03em' }}>
          Ready to give your<br /><span style={{ color: '#FF6B35', textShadow: '0 0 30px rgba(255,107,53,0.5)' }}>team its hub?</span>
        </h2>
        <p className="text-gray-600 text-[9px] mb-3">Book a free 30-min demo. We build it for you.</p>
        {/* Dashboard mockup */}
        <div className="flex-1 relative min-h-0">
          <div className="absolute inset-0 rounded-xl overflow-hidden shadow-2xl" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-center gap-1 px-2 py-1.5 bg-[#161616]">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500/60"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-yellow-500/60"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-green-500/60"></div>
              <div className="flex-1 mx-1.5 bg-[#222] rounded text-[6px] text-gray-700 px-1.5 py-0.5 text-center">sentro.app</div>
            </div>
            <div className="flex" style={{ height: 'calc(100% - 24px)', background: '#f9fafb' }}>
              <div className="w-12 bg-[#1a1f2e] flex flex-col items-center py-2 gap-1.5 flex-shrink-0">
                <div className="w-6 h-6 rounded-lg bg-[#FF6B35] flex items-center justify-center mb-1">
                  <i className="ri-layout-grid-line text-white" style={{ fontSize: 8 }}></i>
                </div>
                {['ri-user-line','ri-time-line','ri-money-dollar-circle-line','ri-folder-line','ri-file-list-3-line'].map((icon, i) => (
                  <div key={i} className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: i === 0 ? 'rgba(255,107,53,0.15)' : 'transparent' }}>
                    <i className={`${icon} text-gray-600`} style={{ fontSize: 8 }}></i>
                  </div>
                ))}
              </div>
              <div className="flex-1 p-2 overflow-hidden flex flex-col gap-1.5">
                <div className="rounded-lg p-2 text-white" style={{ background: 'linear-gradient(135deg, #1e3a5f, #0f2040)' }}>
                  <div className="font-black mb-0.5" style={{ fontSize: 7 }}>Good morning, Francis 👋</div>
                  <div className="text-blue-300/70" style={{ fontSize: 6 }}>Saturday · May 24, 2026</div>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {[['8','Online','#22c55e'],['2','On Leave','#f59e0b'],['₱84k','Period','#FF6B35']].map(([v,l,c]) => (
                    <div key={l} className="bg-white rounded-lg p-1.5 shadow-sm">
                      <div className="font-black" style={{ fontSize: 9, color: c }}>{v}</div>
                      <div className="text-gray-400" style={{ fontSize: 6 }}>{l}</div>
                    </div>
                  ))}
                </div>
                <div className="flex-1 flex flex-col gap-1 overflow-hidden">
                  {[['Sofia L.','Design',true],['Renzo A.','Creative',true],['Mika T.','Accounts',false],['Bianca R.','Admin',false]].map(([n,d,o]) => (
                    <div key={String(n)} className="flex items-center gap-1 bg-white rounded-md px-1.5 py-1 shadow-sm">
                      <div className="relative flex-shrink-0">
                        <div className="w-3.5 h-3.5 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-600" style={{ fontSize: 5 }}>{String(n)[0]}</div>
                        <div className={`absolute -bottom-px -right-px w-1.5 h-1.5 rounded-full border border-white ${o ? 'bg-green-400' : 'bg-gray-300'}`}></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-700 truncate" style={{ fontSize: 6 }}>{String(n)}</div>
                        <div className="text-gray-400 truncate" style={{ fontSize: 5 }}>{String(d)}</div>
                      </div>
                      <div className="font-semibold flex-shrink-0" style={{ fontSize: 5.5, color: o ? '#22c55e' : '#9ca3af' }}>{o ? '●' : '○'}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3/4 h-4 pointer-events-none" style={{ background: 'rgba(255,107,53,0.2)', filter: 'blur(12px)' }} />
        </div>
        <div className="mt-3 w-full py-2.5 rounded-xl text-center text-xs font-black text-white"
          style={{ background: 'linear-gradient(135deg, #FF6B35, #e55a27)', boxShadow: '0 0 20px rgba(255,107,53,0.4)' }}>
          Book a Free Demo →
        </div>
        <p className="text-[8px] text-gray-700 text-center mt-1">hunacreatives.com/sentro-os</p>
      </div>
    </SlideWrapper>
  );
}

// ─── Huna slides ───────────────────────────────────────────────────────────────

function Slide1Huna() {
  const tools = ['No strategy', 'Inconsistent look', 'Low engagement', 'No clear direction', 'DIY posts', 'No brand voice'];
  return (
    <SlideWrapper bg="linear-gradient(145deg, #0d0000 0%, #1a0404 100%)">
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 60% at 50% 80%, rgba(239,68,68,0.1) 0%, transparent 70%)' }} />
      <div className="flex flex-col h-full p-6">
        <PillLabel text="Sound familiar?" accent="#ef4444" />
        <div className="flex-1 flex flex-col justify-center">
          <h2 className="font-black text-white leading-tight mb-4"
            style={{ fontSize: 'clamp(1.5rem, 5.5vw, 2rem)', letterSpacing: '-0.03em' }}>
            Your brand<br />deserves more<br />than <span style={{ color: '#ef4444', textShadow: '0 0 20px rgba(239,68,68,0.5)' }}>DIY posts.</span>
          </h2>
          <div className="flex flex-wrap gap-2">
            {tools.map((t, i) => (
              <span key={t} className="text-[10px] font-semibold px-3 py-1.5 rounded-full"
                style={{
                  background: 'rgba(239,68,68,0.06)',
                  border: '1px solid rgba(239,68,68,0.12)',
                  color: 'rgba(239,68,68,0.6)',
                  transform: `rotate(${[-2,-1,1,2,-1.5,1.5][i]}deg)`,
                }}>
                {t}
              </span>
            ))}
          </div>
        </div>
        <p className="text-gray-600 text-[10px] mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>You're spending time on content that isn't converting.</p>
      </div>
    </SlideWrapper>
  );
}

function Slide2Huna() {
  const pains = [
    { icon: 'ri-draft-line', text: 'Generic, copy-paste content' },
    { icon: 'ri-calendar-close-line', text: 'No posting consistency' },
    { icon: 'ri-bar-chart-line', text: 'No data, no direction' },
    { icon: 'ri-eye-off-line', text: 'Your brand is invisible' },
  ];
  return (
    <SlideWrapper bg="linear-gradient(145deg, #0d0000 0%, #0d0d0d 100%)">
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 100%, rgba(239,68,68,0.1) 0%, transparent 60%)' }} />
      <div className="flex flex-col h-full p-6">
        <PillLabel text="The problem" accent="#f97316" />
        <div className="flex-1 flex flex-col justify-center gap-4">
          <h2 className="font-black text-white leading-tight"
            style={{ fontSize: 'clamp(1.4rem, 5vw, 1.8rem)', letterSpacing: '-0.03em' }}>
            Your competitors<br />are growing.<br /><span style={{ color: '#f97316', textShadow: '0 0 20px rgba(249,115,22,0.4)' }}>You're posting<br />and hoping.</span>
          </h2>
          <div className="flex flex-col gap-2.5">
            {pains.map(p => (
              <div key={p.text} className="flex items-center gap-3 rounded-xl px-4 py-2.5" style={{ background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.1)' }}>
                <i className={`${p.icon} text-orange-500 text-base flex-shrink-0`}></i>
                <span className="text-[11px] text-gray-500">{p.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SlideWrapper>
  );
}

function Slide3Huna() {
  return (
    <SlideWrapper bg="linear-gradient(145deg, #0d0000 0%, #1a0404 100%)">
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 70% 70% at 50% 50%, rgba(239,68,68,0.15) 0%, transparent 65%)' }} />
      <div className="flex flex-col h-full p-6 items-center justify-center text-center relative">
        <PillLabel text="Who we are" accent="#ef4444" />
        <div className="my-6 relative">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto overflow-hidden"
            style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', boxShadow: '0 0 60px rgba(239,68,68,0.25)' }}>
            <span className="text-3xl font-black text-white">H</span>
          </div>
          <div className="absolute -inset-4 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(239,68,68,0.1) 0%, transparent 70%)' }} />
        </div>
        <h2 className="font-black text-white leading-none mb-3"
          style={{ fontSize: 'clamp(2rem, 7vw, 2.6rem)', letterSpacing: '-0.04em', textShadow: '0 0 40px rgba(239,68,68,0.2)' }}>
          HUNA<br /><span style={{ color: '#ef4444' }}>CREATIVES</span>
        </h2>
        <p className="text-gray-500 text-xs leading-relaxed max-w-[240px] mb-4">Strategy-led creative agency from Cebu, Philippines. We build brands that grow — branding, social, content, web.</p>
        <div className="flex flex-wrap gap-2 justify-center">
          {['Branding', 'Social Media', 'Web Design', 'Content', 'Strategy'].map(s => (
            <span key={s} className="text-[9px] px-2.5 py-1 rounded-full" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: 'rgba(239,68,68,0.7)' }}>{s}</span>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-2">
          <div className="w-1 h-1 rounded-full bg-red-500/40"></div>
          <span className="text-[9px] text-gray-700">Cebu, PH · Global clients</span>
          <div className="w-1 h-1 rounded-full bg-red-500/40"></div>
        </div>
      </div>
    </SlideWrapper>
  );
}

function Slide4Huna() {
  const services = [
    { icon: 'ri-palette-line', label: 'Branding' },
    { icon: 'ri-instagram-line', label: 'Social Media' },
    { icon: 'ri-global-line', label: 'Web Design' },
    { icon: 'ri-video-line', label: 'Content' },
    { icon: 'ri-bar-chart-line', label: 'Strategy' },
    { icon: 'ri-megaphone-line', label: 'Media Buying' },
    { icon: 'ri-quill-pen-line', label: 'Copywriting' },
    { icon: 'ri-camera-line', label: 'Photography' },
    { icon: 'ri-layout-line', label: 'Design' },
  ];
  return (
    <SlideWrapper bg="linear-gradient(145deg, #0d0000 0%, #0d0d0d 100%)">
      <div className="absolute top-0 right-0 w-40 h-40 pointer-events-none" style={{ background: 'radial-gradient(circle at top right, rgba(239,68,68,0.1), transparent 70%)' }} />
      <div className="flex flex-col h-full p-5">
        <PillLabel text="What we do" accent="#ef4444" />
        <h2 className="font-black text-white mt-3 mb-4 leading-tight"
          style={{ fontSize: 'clamp(1.2rem, 4.5vw, 1.5rem)', letterSpacing: '-0.02em' }}>
          Everything your<br />brand needs.
        </h2>
        <div className="grid grid-cols-3 gap-2 flex-1">
          {services.map(f => (
            <div key={f.label} className="flex flex-col items-center justify-center gap-1.5 rounded-xl py-3"
              style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.1)' }}>
              <i className={`${f.icon} text-[#ef4444] text-lg`}></i>
              <span className="text-[9px] font-semibold text-gray-500">{f.label}</span>
            </div>
          ))}
        </div>
      </div>
    </SlideWrapper>
  );
}

function Slide5Huna() {
  return (
    <SlideWrapper bg="linear-gradient(145deg, #0d0000 0%, #1a0404 100%)">
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 60% at 80% 50%, rgba(239,68,68,0.07) 0%, transparent 70%)' }} />
      <div className="flex flex-col h-full p-6 justify-between">
        <PillLabel text="Why Huna" accent="#ef4444" />
        <div>
          <h2 className="font-black text-white leading-tight mb-2"
            style={{ fontSize: 'clamp(1.3rem, 5vw, 1.7rem)', letterSpacing: '-0.03em' }}>
            Based in Cebu.<br /><span style={{ color: '#ef4444', textShadow: '0 0 20px rgba(239,68,68,0.4)' }}>Built for global.</span>
          </h2>
          <p className="text-gray-500 text-xs leading-relaxed">We've worked with brands across e-commerce, F&B, real estate, and professional services.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 my-2">
          {[['50+','Brands served'],['3+','Years running'],['Global','Client reach'],['Full-service','End-to-end']].map(([v,l]) => (
            <div key={l} className="rounded-xl p-3" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.1)' }}>
              <div className="font-black text-white text-sm mb-0.5">{v}</div>
              <div className="text-gray-600 text-[9px]">{l}</div>
            </div>
          ))}
        </div>
        <div className="rounded-xl p-4" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
          <p className="text-gray-300 text-[11px] leading-relaxed italic mb-2">
            "Every brand we work with gets the same attention we'd give our own."
          </p>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white flex-shrink-0" style={{ background: '#ef4444' }}>F</div>
            <p className="text-[9px] font-bold text-white">Francis · Founder, Huna Creatives</p>
          </div>
        </div>
      </div>
    </SlideWrapper>
  );
}

function Slide6Huna() {
  return (
    <SlideWrapper bg="linear-gradient(160deg, #0d0000 0%, #1a0404 60%, #0d0000 100%)">
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 100%, rgba(239,68,68,0.2) 0%, transparent 60%)' }} />
      <div className="flex flex-col h-full p-6 items-center justify-center text-center">
        <PillLabel text="Let's build" accent="#ef4444" />
        <h2 className="font-black text-white mt-6 mb-3 leading-tight"
          style={{ fontSize: 'clamp(1.6rem, 6vw, 2.2rem)', letterSpacing: '-0.03em', textShadow: '0 0 40px rgba(239,68,68,0.2)' }}>
          Let's build your<br /><span style={{ color: '#ef4444', textShadow: '0 0 30px rgba(239,68,68,0.5)' }}>brand together.</span>
        </h2>
        <p className="text-gray-500 text-xs mb-8 leading-relaxed">Strategy. Design. Content.<br />Done for you.</p>
        <div className="w-full py-3 rounded-xl text-center text-sm font-black text-white"
          style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', boxShadow: '0 0 30px rgba(239,68,68,0.4)' }}>
          Get in Touch →
        </div>
        <p className="text-[9px] text-gray-700 mt-2">hunacreatives.com/contact</p>
        <div className="mt-6 flex items-center gap-2">
          <div className="h-px flex-1" style={{ background: 'rgba(239,68,68,0.15)' }}></div>
          <span className="text-[9px] text-gray-700 font-bold tracking-widest uppercase">Huna Creatives</span>
          <div className="h-px flex-1" style={{ background: 'rgba(239,68,68,0.15)' }}></div>
        </div>
      </div>
    </SlideWrapper>
  );
}

// ─── Slide registry ────────────────────────────────────────────────────────────

const SENTRO_SLIDES = [Slide1Sentro, Slide2Sentro, Slide3Sentro, Slide4Sentro, Slide5Sentro, Slide6Sentro];
const HUNA_SLIDES = [Slide1Huna, Slide2Huna, Slide3Huna, Slide4Huna, Slide5Huna, Slide6Huna];

const SENTRO_LABELS = ['Sound familiar?', 'The cost', 'The solution', "What's inside", 'Why trust us', 'Get started'];
const HUNA_LABELS = ['Sound familiar?', 'The problem', 'Who we are', 'What we do', 'Why Huna', "Let's build"];

const SENTRO_BG = ['#060a12','#0d0505','#080c14','#060a12','#0a0c08','#060810'];
const HUNA_BG = ['#1a0404','#0d0000','#1a0404','#0d0000','#1a0404','#0d0000'];

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function AdPreviewPage() {
  const [brand, setBrand] = useState<'sentro' | 'huna'>('sentro');
  const [current, setCurrent] = useState(0);

  const slides = brand === 'sentro' ? SENTRO_SLIDES : HUNA_SLIDES;
  const labels = brand === 'sentro' ? SENTRO_LABELS : HUNA_LABELS;
  const bgs = brand === 'sentro' ? SENTRO_BG : HUNA_BG;
  const accent = brand === 'sentro' ? '#FF6B35' : '#ef4444';

  const SlideComponent = slides[current];

  const prev = () => setCurrent(i => (i - 1 + slides.length) % slides.length);
  const next = () => setCurrent(i => (i + 1) % slides.length);

  return (
    <div className="min-h-screen bg-[#030305] text-white flex flex-col items-center px-4 py-10 font-sans">
      <style>{`
        @import url('https://cdn.jsdelivr.net/npm/remixicon@3.5.0/fonts/remixicon.css');
      `}</style>

      {/* Header */}
      <div className="w-full max-w-sm mb-8 text-center">
        <p className="text-[10px] text-gray-700 uppercase tracking-widest mb-4">Ad Carousel Preview</p>
        <div className="flex rounded-xl overflow-hidden border border-white/8 w-fit mx-auto">
          <button onClick={() => { setBrand('sentro'); setCurrent(0); }}
            className="px-5 py-2.5 text-sm font-bold transition-all cursor-pointer"
            style={brand === 'sentro' ? { background: '#FF6B35', color: '#fff' } : { color: '#4b5563', background: 'transparent' }}>
            Sentro OS
          </button>
          <button onClick={() => { setBrand('huna'); setCurrent(0); }}
            className="px-5 py-2.5 text-sm font-bold transition-all cursor-pointer"
            style={brand === 'huna' ? { background: '#ef4444', color: '#fff' } : { color: '#4b5563', background: 'transparent' }}>
            Huna Creatives
          </button>
        </div>
      </div>

      {/* Main slide */}
      <div className="w-full max-w-sm">
        <SlideComponent />

        {/* Controls */}
        <div className="flex items-center justify-between mt-4">
          <button onClick={prev}
            className="w-10 h-10 rounded-xl flex items-center justify-center border border-white/8 hover:bg-white/5 transition-colors cursor-pointer text-gray-500">
            <i className="ri-arrow-left-s-line text-xl"></i>
          </button>
          <div className="flex items-center gap-1.5">
            {slides.map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)} className="cursor-pointer transition-all duration-200"
                style={{ width: i === current ? 22 : 6, height: 6, borderRadius: 3, background: i === current ? accent : 'rgba(255,255,255,0.1)' }} />
            ))}
          </div>
          <button onClick={next}
            className="w-10 h-10 rounded-xl flex items-center justify-center border border-white/8 hover:bg-white/5 transition-colors cursor-pointer text-gray-500">
            <i className="ri-arrow-right-s-line text-xl"></i>
          </button>
        </div>

        {/* Thumbnail strip */}
        <div className="mt-6">
          <p className="text-[9px] text-gray-700 uppercase tracking-widest mb-2">All slides</p>
          <div className="grid grid-cols-6 gap-1.5">
            {slides.map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)}
                className="relative rounded-lg overflow-hidden cursor-pointer transition-all flex flex-col items-center justify-center"
                style={{ aspectRatio: '4/5', background: bgs[i], outline: i === current ? `2px solid ${accent}` : '2px solid transparent', outlineOffset: 2 }}>
                <span className="text-[7px] font-black uppercase text-white/30">{i + 1}</span>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-6 gap-1.5 mt-1">
            {labels.map((l, i) => (
              <span key={l} className="text-[7px] text-center truncate" style={{ color: i === current ? accent : '#374151' }}>{l}</span>
            ))}
          </div>
        </div>

        <p className="text-[9px] text-gray-700 text-center mt-8">Screenshot each slide at full size · 4:5 format</p>
      </div>
    </div>
  );
}
