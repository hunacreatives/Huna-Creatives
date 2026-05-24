import { useState } from 'react';

// ─── Slide data ────────────────────────────────────────────────────────────────

const SENTRO_SLIDES = [
  {
    id: 1,
    bg: 'linear-gradient(145deg, #080c14 0%, #0f1a2e 100%)',
    accent: '#FF6B35',
    label: 'The problem',
    headline: 'Still running your\nteam on spreadsheets\nand group chats?',
    sub: 'There\'s a better way.',
    visual: 'chaos',
  },
  {
    id: 2,
    bg: 'linear-gradient(145deg, #0d0d0d 0%, #1a0a00 100%)',
    accent: '#FF6B35',
    label: 'The cost',
    headline: 'Every missed punch.\nEvery late payroll.\nEvery lost credential.',
    sub: 'It adds up — and your team feels it.',
    visual: 'pain',
  },
  {
    id: 3,
    bg: 'linear-gradient(145deg, #080c14 0%, #12100a 100%)',
    accent: '#FF6B35',
    label: 'The solution',
    headline: 'Meet\nSentro OS.',
    sub: 'Your own internal operations hub — built around your team\'s exact workflow.',
    visual: 'reveal',
  },
  {
    id: 4,
    bg: 'linear-gradient(145deg, #080c14 0%, #0f1a2e 100%)',
    accent: '#FF6B35',
    label: 'What\'s inside',
    headline: 'One hub.\nEverything managed.',
    sub: null,
    visual: 'features',
  },
  {
    id: 5,
    bg: 'linear-gradient(145deg, #12100a 0%, #080c14 100%)',
    accent: '#FF6B35',
    label: 'Why trust us',
    headline: 'We built it for\nourselves first.',
    sub: 'We run Huna Creatives on Sentro OS every day. Every feature earned its place.',
    visual: 'trust',
  },
  {
    id: 6,
    bg: 'linear-gradient(145deg, #0f0800 0%, #080c14 100%)',
    accent: '#FF6B35',
    label: 'Get started',
    headline: 'Ready to give\nyour team its hub?',
    sub: 'Book a free 30-min demo. We build it around your workflow.',
    visual: 'cta',
    cta: 'hunacreatives.com/sentro-os',
  },
];

const HUNA_SLIDES = [
  {
    id: 1,
    bg: 'linear-gradient(145deg, #0d0000 0%, #1a0505 100%)',
    accent: '#ef4444',
    label: 'The problem',
    headline: 'Your brand is only\nas strong as how it\nlooks online.',
    sub: 'Most brands are invisible — not because they\'re bad, but because no one\'s telling the story right.',
    visual: 'chaos',
  },
  {
    id: 2,
    bg: 'linear-gradient(145deg, #0d0000 0%, #0d0d0d 100%)',
    accent: '#f97316',
    label: 'Sound familiar?',
    headline: 'Generic content.\nNo strategy.\nNo consistency.',
    sub: 'Your competitors are growing. You\'re posting and hoping.',
    visual: 'pain',
  },
  {
    id: 3,
    bg: 'linear-gradient(145deg, #0d0000 0%, #1a0505 100%)',
    accent: '#ef4444',
    label: 'Who we are',
    headline: 'Huna Creatives.',
    sub: 'A strategy-led creative agency from Cebu, Philippines — building brands that actually grow.',
    visual: 'reveal',
  },
  {
    id: 4,
    bg: 'linear-gradient(145deg, #0d0000 0%, #0d0d0d 100%)',
    accent: '#f97316',
    label: 'What we do',
    headline: 'Everything your\nbrand needs.',
    sub: null,
    visual: 'features',
  },
  {
    id: 5,
    bg: 'linear-gradient(145deg, #0d0000 0%, #1a0505 100%)',
    accent: '#ef4444',
    label: 'Why Huna',
    headline: 'Based in Cebu.\nBuilt for global.',
    sub: 'We\'ve worked with brands across e-commerce, F&B, real estate, and professional services.',
    visual: 'trust',
  },
  {
    id: 6,
    bg: 'linear-gradient(145deg, #1a0505 0%, #0d0000 100%)',
    accent: '#ef4444',
    label: 'Let\'s build',
    headline: 'Let\'s build your\nbrand together.',
    sub: 'Strategy. Design. Content. Done for you.',
    visual: 'cta',
    cta: 'hunacreatives.com/contact',
  },
];

// ─── Slide visuals ─────────────────────────────────────────────────────────────

function SentroFeatureGrid() {
  const items = [
    { icon: 'ri-time-line', label: 'Attendance' },
    { icon: 'ri-money-dollar-circle-line', label: 'Payroll' },
    { icon: 'ri-file-list-3-line', label: 'Documents' },
    { icon: 'ri-shield-keyhole-line', label: 'Credentials' },
    { icon: 'ri-building-line', label: 'Projects' },
    { icon: 'ri-book-open-line', label: 'SOPs' },
  ];
  return (
    <div className="grid grid-cols-3 gap-2 w-full mt-4">
      {items.map(item => (
        <div key={item.label} className="flex flex-col items-center gap-1.5 bg-white/5 rounded-xl py-3 px-2">
          <i className={`${item.icon} text-[#FF6B35] text-lg`}></i>
          <span className="text-white text-[10px] font-semibold">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

function HunaFeatureGrid() {
  const items = [
    { icon: 'ri-palette-line', label: 'Branding' },
    { icon: 'ri-instagram-line', label: 'Social Media' },
    { icon: 'ri-global-line', label: 'Web Design' },
    { icon: 'ri-video-line', label: 'Content' },
    { icon: 'ri-bar-chart-line', label: 'Strategy' },
    { icon: 'ri-megaphone-line', label: 'Media Buying' },
  ];
  return (
    <div className="grid grid-cols-3 gap-2 w-full mt-4">
      {items.map(item => (
        <div key={item.label} className="flex flex-col items-center gap-1.5 bg-white/5 rounded-xl py-3 px-2">
          <i className={`${item.icon} text-[#ef4444] text-lg`}></i>
          <span className="text-white text-[10px] font-semibold">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

function ChaosVisual({ accent }: { accent: string }) {
  const tools = ['WhatsApp', 'Google Sheets', 'Notion', 'Email', 'Slack DMs', 'Paper'];
  return (
    <div className="flex flex-wrap gap-2 justify-center mt-4 w-full">
      {tools.map((t, i) => (
        <span key={t} className="text-xs font-medium px-3 py-1.5 rounded-full border"
          style={{
            borderColor: `${accent}30`,
            color: `${accent}80`,
            background: `${accent}08`,
            transform: `rotate(${(i % 2 === 0 ? -1 : 1) * (i + 1)}deg)`,
          }}>
          {t}
        </span>
      ))}
    </div>
  );
}

function PainVisual({ accent }: { accent: string }) {
  const points = ['Missed punch-ins', 'Manual payroll errors', 'Credential leaks', 'Late approvals'];
  return (
    <div className="flex flex-col gap-2 mt-4 w-full">
      {points.map(p => (
        <div key={p} className="flex items-center gap-2">
          <i className="ri-close-circle-fill text-sm" style={{ color: accent }}></i>
          <span className="text-xs text-gray-400">{p}</span>
        </div>
      ))}
    </div>
  );
}

function RevealVisual({ isSentro, accent }: { isSentro: boolean; accent: string }) {
  return (
    <div className="mt-5 flex flex-col items-center gap-2">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: `${accent}15`, border: `1px solid ${accent}30` }}>
        <i className={`${isSentro ? 'ri-layout-grid-line' : 'ri-palette-line'} text-2xl`} style={{ color: accent }}></i>
      </div>
      <div className="h-px w-16" style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}></div>
    </div>
  );
}

function TrustVisual({ isSentro, accent }: { isSentro: boolean; accent: string }) {
  return (
    <div className="mt-4 w-full border rounded-xl p-3" style={{ borderColor: `${accent}20`, background: `${accent}06` }}>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-white" style={{ background: accent }}>F</div>
        <span className="text-xs font-semibold text-white">Francis, Founder</span>
      </div>
      <p className="text-[10px] text-gray-400 leading-relaxed italic">
        {isSentro
          ? '"We built it for ourselves. When it worked, we knew other teams needed it too."'
          : '"Every brand we work with gets the same attention we\'d give our own."'}
      </p>
    </div>
  );
}

function CTAVisual({ accent, cta }: { accent: string; cta: string }) {
  return (
    <div className="mt-5 flex flex-col items-center gap-3 w-full">
      <div className="w-full py-3 rounded-xl text-center text-sm font-bold text-white"
        style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)`, boxShadow: `0 0 24px ${accent}40` }}>
        Book a Free Demo →
      </div>
      <span className="text-[10px] text-gray-600">{cta}</span>
    </div>
  );
}

// ─── Single slide ──────────────────────────────────────────────────────────────

function Slide({ slide, isSentro }: { slide: typeof SENTRO_SLIDES[0]; isSentro: boolean }) {
  return (
    <div className="relative w-full rounded-2xl overflow-hidden flex flex-col p-6"
      style={{ background: slide.bg, aspectRatio: '1/1' }}>

      {/* Corner watermark */}
      <div className="absolute bottom-4 right-4 opacity-20">
        <span className="text-[9px] font-black uppercase tracking-widest text-white">
          {isSentro ? 'Sentro OS' : 'Huna Creatives'}
        </span>
      </div>

      {/* Slide number */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full"
          style={{ background: `${slide.accent}15`, color: slide.accent }}>
          {slide.label}
        </span>
        <span className="text-[9px] text-gray-700 font-mono">{slide.id} / 6</span>
      </div>

      {/* Headline */}
      <h2 className="font-black text-white leading-tight whitespace-pre-line"
        style={{ fontSize: 'clamp(1.1rem, 4vw, 1.5rem)', letterSpacing: '-0.02em' }}>
        {slide.headline}
      </h2>

      {/* Sub */}
      {slide.sub && (
        <p className="text-gray-400 text-xs leading-relaxed mt-2">{slide.sub}</p>
      )}

      {/* Visual */}
      {slide.visual === 'chaos' && <ChaosVisual accent={slide.accent} />}
      {slide.visual === 'pain' && <PainVisual accent={slide.accent} />}
      {slide.visual === 'reveal' && <RevealVisual isSentro={isSentro} accent={slide.accent} />}
      {slide.visual === 'features' && (isSentro ? <SentroFeatureGrid /> : <HunaFeatureGrid />)}
      {slide.visual === 'trust' && <TrustVisual isSentro={isSentro} accent={slide.accent} />}
      {slide.visual === 'cta' && 'cta' in slide && <CTAVisual accent={slide.accent} cta={slide.cta} />}

      {/* Bottom accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5"
        style={{ background: `linear-gradient(90deg, transparent, ${slide.accent}60, transparent)` }} />
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function AdPreviewPage() {
  const [brand, setBrand] = useState<'sentro' | 'huna'>('sentro');
  const [current, setCurrent] = useState(0);

  const slides = brand === 'sentro' ? SENTRO_SLIDES : HUNA_SLIDES;
  const accent = brand === 'sentro' ? '#FF6B35' : '#ef4444';

  const prev = () => setCurrent(i => (i - 1 + slides.length) % slides.length);
  const next = () => setCurrent(i => (i + 1) % slides.length);

  return (
    <div className="min-h-screen bg-[#050507] text-white flex flex-col items-center justify-start px-4 py-10 font-sans">

      {/* Header */}
      <div className="w-full max-w-sm mb-6 text-center">
        <p className="text-xs text-gray-600 uppercase tracking-widest mb-3">Ad Carousel Preview</p>
        <div className="flex rounded-xl overflow-hidden border border-white/8 w-fit mx-auto">
          <button onClick={() => { setBrand('sentro'); setCurrent(0); }}
            className="px-5 py-2 text-sm font-semibold transition-all cursor-pointer"
            style={brand === 'sentro' ? { background: '#FF6B35', color: '#fff' } : { color: '#6b7280' }}>
            Sentro OS
          </button>
          <button onClick={() => { setBrand('huna'); setCurrent(0); }}
            className="px-5 py-2 text-sm font-semibold transition-all cursor-pointer"
            style={brand === 'huna' ? { background: '#ef4444', color: '#fff' } : { color: '#6b7280' }}>
            Huna Creatives
          </button>
        </div>
      </div>

      {/* Carousel */}
      <div className="w-full max-w-sm">

        {/* Main slide */}
        <Slide slide={slides[current]} isSentro={brand === 'sentro'} />

        {/* Controls */}
        <div className="flex items-center justify-between mt-4">
          <button onClick={prev}
            className="w-10 h-10 rounded-xl flex items-center justify-center border border-white/10 hover:bg-white/5 transition-colors cursor-pointer text-gray-400">
            <i className="ri-arrow-left-s-line text-xl"></i>
          </button>

          {/* Dots */}
          <div className="flex items-center gap-1.5">
            {slides.map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)} className="cursor-pointer transition-all"
                style={{
                  width: i === current ? 20 : 6,
                  height: 6,
                  borderRadius: 3,
                  background: i === current ? accent : 'rgba(255,255,255,0.15)',
                }} />
            ))}
          </div>

          <button onClick={next}
            className="w-10 h-10 rounded-xl flex items-center justify-center border border-white/10 hover:bg-white/5 transition-colors cursor-pointer text-gray-400">
            <i className="ri-arrow-right-s-line text-xl"></i>
          </button>
        </div>

        {/* All slides strip */}
        <div className="mt-6">
          <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-3">All slides</p>
          <div className="grid grid-cols-3 gap-2">
            {slides.map((s, i) => (
              <button key={s.id} onClick={() => setCurrent(i)}
                className="relative rounded-xl overflow-hidden cursor-pointer transition-all"
                style={{
                  aspectRatio: '1/1',
                  background: s.bg,
                  outline: i === current ? `2px solid ${accent}` : '2px solid transparent',
                  outlineOffset: 2,
                }}>
                <div className="absolute inset-0 flex flex-col justify-end p-1.5">
                  <span className="text-[7px] font-bold uppercase tracking-widest"
                    style={{ color: s.accent }}>{s.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <p className="text-[10px] text-gray-700 text-center mt-6">
          Screenshot each slide at full size for export · 1:1 format
        </p>
      </div>
    </div>
  );
}
