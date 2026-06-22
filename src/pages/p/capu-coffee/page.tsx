import { useEffect } from 'react';

const APPROVE_HREF = "/p/capu-coffee/approve";

const IMG = {
  hero:        '/proposals/capu-coffee/IMG_4183.webp',
  storefront:  '/proposals/capu-coffee/IMG_4173.webp',
  sign:        '/proposals/capu-coffee/IMG_4174.webp',
  entrance:    '/proposals/capu-coffee/capu_03.webp',
  porthole:    '/proposals/capu-coffee/capu_01.webp',
  img4197:     '/proposals/capu-coffee/IMG_4197.webp',
  img4179:     '/proposals/capu-coffee/IMG_4179.webp',
  floor:       '/proposals/capu-coffee/IMG_4190.webp',
  texture:     '/proposals/capu-coffee/IMG_4195.webp',
  exterior:    '/proposals/capu-coffee/IMG_4173.webp',
  bar:         '/proposals/capu-coffee/capu_05.webp',
  interior:    '/proposals/capu-coffee/capu_04.webp',
  logo:        '/proposals/capu-coffee/capu_02.webp',
  beans:       '/proposals/capu-coffee/IMG_4200.webp',
};

/* ─── Dark glass ─── */
const glass = {
  background: 'rgba(255,255,255,0.05)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 20,
};

const glassLight = {
  background: 'rgba(255,255,255,0.08)',
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  border: '1px solid rgba(255,255,255,0.14)',
  borderRadius: 20,
};

const COPPER = '#C4873A';

const PALETTE = {
  primary: [
    { hex: '#1A1410', label: 'Deep Espresso',  note: 'Primary dark' },
    { hex: '#6B3F25', label: 'Coffee Brown',   note: 'Warm anchor' },
    { hex: '#C4873A', label: 'Copper',         note: 'Brand accent' },
    { hex: '#F2EBD9', label: 'Warm Cream',     note: 'Primary light' },
  ],
  secondary: [
    { hex: '#3A5C52', label: 'Sage',           note: 'Cocktails / evening' },
    { hex: '#8C8074', label: 'Warm Stone',     note: 'Supporting neutral' },
    { hex: '#2E2B27', label: 'Charcoal',       note: 'Text on light' },
    { hex: '#F9F6F0', label: 'Off White',      note: 'Clean background' },
  ],
};

const PILLARS = [
  { icon: '◼', word: 'ARCHITECTURAL', sub: 'Every surface considered' },
  { icon: '◎', word: 'CONSIDERED',    sub: 'Nothing accidental' },
  { icon: '◐', word: 'WARM',          sub: 'Craft over cool' },
  { icon: '◈', word: 'PURPOSEFUL',    sub: 'Space with intention' },
];

const SCOPE = [
  { n: '01', title: 'Logo Rebrand',         desc: 'Primary wordmark, icon, horizontal + stacked lockups, favicon — built for signage scale and digital miniature.' },
  { n: '02', title: 'Merchandise',          desc: 'Paper cups, coffee sleeves, kraft bags, tote bags, tissue paper, sticker sheet.' },
  { n: '03', title: 'Packaging Suite',      desc: 'Takeaway containers, box inserts, branded wax paper, coffee label system.' },
  { n: '04', title: 'Signage System',       desc: 'Exterior fascia, window decals, indoor wayfinding, menu boards — both branches.' },
  { n: '05', title: 'Brand Applications',   desc: 'Dine-in + takeaway menus, A-frame, social media kit (templates + cover photos).' },
  { n: '06', title: 'Brand Guidelines',     desc: "Usage rules, color specs, type hierarchy, dos & don'ts — a doc your vendor can print from." },
];

const QUICKWINS = [
  { icon: 'ri-cup-line',     title: 'Elevate the Cup',         desc: 'The cup is the most-photographed touchpoint. A refined sleeve shifts perception overnight.' },
  { icon: 'ri-store-2-line', title: 'Unify the Signage',       desc: 'Exterior circle sign and interior typography need to speak the same language.' },
  { icon: 'ri-text',         title: 'Strengthen the Wordmark', desc: 'Replace the rounded typeface with something that has the weight the space deserves.' },
  { icon: 'ri-image-line',   title: 'Social Style Guide',      desc: 'Photography tone is inconsistent. A simple visual guide closes this gap fast.' },
  { icon: 'ri-goblet-line',  title: 'Cocktail Identity Layer', desc: '"Coffee+Cocktails" deserves its own moodier visual register for the evening menu.' },
  { icon: 'ri-leaf-line',    title: 'Surface the Bean Origin', desc: 'Triad Coffee is a quality signal. Make it visible on menus and packaging.' },
];

export default function CapuCoffeeProposal() {
  useEffect(() => {
    document.title = 'Brand Strategy Proposal — Capu Coffee';
  }, []);

  return (
    <div style={{ minHeight: '100vh', position: 'relative', fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif" }}>

      {/* ── Fixed dark background ── */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        backgroundImage: `url(${IMG.hero})`,
        backgroundSize: 'cover', backgroundPosition: 'center',
        filter: 'blur(6px) brightness(0.4)',
        transform: 'scale(1.05)',
      }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 1, background: 'rgba(8,6,4,0.75)', pointerEvents: 'none' }} />

      {/* ── Content ── */}
      <div style={{ position: 'relative', zIndex: 2 }}>

        {/* ════════════════ HERO ════════════════ */}
        <section style={{ maxWidth: 1100, margin: '0 auto', padding: '36px 40px 0' }}>

          {/* Top bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 64 }}>
            <img src="https://hunacreatives.com/images/fc04818c74ad69bdfb22b93a6a0c6a72.png"
              alt="Huna Creatives" style={{ height: 32, opacity: 0.85 }} />
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: COPPER, border: `1px solid rgba(196,135,58,0.35)`, padding: '5px 12px', borderRadius: 6 }}>
              Brand Strategy Proposal
            </span>
          </div>

          {/* Hero 2-col */}
          <div style={{ display: 'flex', gap: 40, alignItems: 'stretch' }}>
            <div style={{ flex: '0 0 50%', minWidth: 0 }}>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 20 }}>
                Prepared for Adrian Manuel Tan · Capu Coffee
              </p>
              <h1 style={{ color: '#fff', fontSize: 64, lineHeight: 1.05, margin: '0 0 24px', fontWeight: 700 }}>
                The Brand That<br />Grew Past<br />Its Logo.
              </h1>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 20, lineHeight: 1.8, margin: '0 0 32px' }}>
                Capu has built one of the most considered interior experiences in Cebu. This proposal is about making the brand worthy of the room.
              </p>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                <a href={APPROVE_HREF}
                  style={{ background: COPPER, border: 'none', color: '#fff', fontSize: 16, fontWeight: 700, letterSpacing: '0.06em', padding: '13px 28px', textDecoration: 'none', display: 'inline-block', borderRadius: 10 }}>
                  Approve &amp; Get Started →
                </a>
                <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11 }}>June 2026 · Huna Creatives</span>
              </div>
            </div>

            <div style={{ flex: '0 0 calc(50% - 40px)', minWidth: 0, minHeight: 0, position: 'relative' }}>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', gap: 8, borderRadius: 16, overflow: 'hidden' }}>
                {/* Left column — two equal-height images */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0 }}>
                  <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
                    <img src={IMG.sign} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 60%', display: 'block', transform: 'scale(1.25)', transformOrigin: 'center' }} />
                  </div>
                  <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
                    <img src={IMG.img4197} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 78%', display: 'block' }} />
                  </div>
                </div>
                {/* Right column — full height */}
                <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
                  <img src={IMG.img4179} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', display: 'block' }} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ════════════════ BODY ════════════════ */}
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 40px 80px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* ── SECTION HEADER: BRAND STUDY ── */}
          <SectionDivider label="Part I" title="Brand Study" sub="What we observed on-site and what it means for the brand." />

          {/* ── BIG STATEMENT 1 ── */}
          <BigStatement
            quote="The space already tells the story."
            sub="The interior Beatrix designed — porthole window, molten glass floor, bespoke lighting — is the brand. Everything else just needs to catch up."
            img={IMG.porthole}
          />

          {/* ── ROW 1: Brand Essence + What We Found ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

            <GlassCard num="1" title="BRAND ESSENCE">
              <Eyebrow>What Capu Is</Eyebrow>
              <p style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.2, color: '#fff', margin: '10px 0 16px' }}>
                A Third Place Built<br />for People Building Things.
              </p>
              <Body>
                Founded by three siblings — Adrian in operations, Beatrix in interior design, Mandee in pastry — Capu was never a generic café. It was a deliberate act: a place where the coffee is serious, the space is considered, and the people who come to work, think, and connect feel that the moment they walk in.
              </Body>
              <Body mt>
                The signage reads <em style={{ color: 'rgba(255,255,255,0.8)' }}>"capu coffee+cocktails."</em> The menu spans morning espresso to evening cocktails. The clientele skews toward builders, creatives, and professionals. This is not a neighborhood hangout that happened to grow. It is a destination that was designed to be one.
              </Body>
            </GlassCard>

            <GlassCard num="2" title="WHAT WE FOUND">
              <Eyebrow>Site Visit Observations</Eyebrow>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, margin: '14px 0' }}>
                {[
                  [IMG.porthole, "Porthole window in hand-textured stucco — Beatrix designed the interior"],
                  [IMG.floor,    "Molten glass mosaic floor, lit from below with recessed uplights"],
                  [IMG.interior, "Bespoke ceiling treatment — the kind of detail you specify, not source"],
                  [IMG.exterior, "Exterior: 'capu coffee+cocktails' — a positioning the logo doesn't reflect"],
                ].map(([src, cap]) => (
                  <div key={src as string} style={{ borderRadius: 10, overflow: 'hidden' }}>
                    <img src={src as string} alt="" style={{ width: '100%', height: 110, objectFit: 'cover', display: 'block' }} />
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: '5px 0 0', lineHeight: 1.4 }}>{cap as string}</p>
                  </div>
                ))}
              </div>
              <Body>
                The space was designed with the care of a boutique hotel — rough-to-smooth tactile contrast, custom furniture, considered lighting at every level. The brand identity has not kept pace.
              </Body>
            </GlassCard>
          </div>

          {/* ── IDENTITY GAP (full-width) ── */}
          <GlassCard num="3" title="THE IDENTITY GAP">
            <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr 1fr', gap: 32, alignItems: 'start' }}>
              <div>
                <Eyebrow>Current Logo</Eyebrow>
                <div style={{ borderRadius: 12, overflow: 'hidden', background: '#fff', padding: 16, marginTop: 12 }}>
                  <img src={IMG.logo} alt="Current logo" style={{ width: '100%', aspectRatio: '1', objectFit: 'contain', display: 'block' }} />
                </div>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: 6, letterSpacing: '0.1em', textTransform: 'uppercase' }}>As it stands today</p>
              </div>
              <div>
                <Eyebrow>The Logo Reads</Eyebrow>
                <div style={{ marginTop: 12 }}>
                  {['Friendly neighborhood café', 'Approachable, casual, safe', 'Generic coffee category', 'Pre-growth, pre-cocktails'].map(t => (
                    <div key={t} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <span style={{ color: 'rgba(255,80,60,0.8)', fontSize: 14, flexShrink: 0 }}>✕</span>
                      <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>{t}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <Eyebrow>The Space Reads</Eyebrow>
                <div style={{ marginTop: 12 }}>
                  {['Architectural destination', 'Considered, precise, warm', 'Specialty coffee + cocktail bar', 'A place people seek out'].map(t => (
                    <div key={t} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <span style={{ color: 'rgba(80,200,120,0.8)', fontSize: 14, flexShrink: 0 }}>✓</span>
                      <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)' }}>{t}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </GlassCard>

          {/* ── BIG STATEMENT 2 ── */}
          <BigStatement
            quote={<>The logo is cute<br />where the space is considered.</>}
            sub="It signals 'coffee shop' when Capu has already earned 'destination.' The gap between them is the brand opportunity."
            img={IMG.interior}
            flip
          />

          {/* ── SECTION HEADER: THE PROPOSAL ── */}
          <SectionDivider label="Part II" title="The Proposal" sub="Our direction for elevating the Capu identity to match the space." copper />

          {/* ── COLOR DIRECTION (full width) ── */}
          <GlassCard num="4" title="PROPOSED COLOR DIRECTION">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
              <div>
                <Eyebrow>Primary Colors</Eyebrow>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginTop: 12 }}>
                  {PALETTE.primary.map(c => (
                    <div key={c.hex}>
                      <div style={{ height: 72, borderRadius: 10, background: c.hex, border: c.hex === '#F2EBD9' ? '1px solid rgba(255,255,255,0.15)' : 'none' }} />
                      <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginTop: 6, letterSpacing: '0.06em' }}>{c.hex}</p>
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{c.label}</p>
                      <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 1 }}>{c.note}</p>
                    </div>
                  ))}
                </div>
                <Eyebrow mt>Secondary / Supporting</Eyebrow>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginTop: 12 }}>
                  {PALETTE.secondary.map(c => (
                    <div key={c.hex}>
                      <div style={{ height: 48, borderRadius: 8, background: c.hex, border: c.hex === '#F9F6F0' ? '1px solid rgba(255,255,255,0.15)' : 'none' }} />
                      <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginTop: 6, letterSpacing: '0.06em' }}>{c.hex}</p>
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{c.label}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <Eyebrow>Background Applications</Eyebrow>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 12 }}>
                  {[
                    { bg: '#F2EBD9', label: 'Day / Café',  sub: 'Warm, open',       dark: false },
                    { bg: '#1A1410', label: 'Night / Bar', sub: 'Intimate, low-lit', dark: true },
                    { bg: `linear-gradient(135deg, ${COPPER} 0%, #6B3F25 100%)`, label: 'Accent', sub: 'Heat, craft', dark: true },
                  ].map(b => (
                    <div key={b.label} style={{ background: b.bg, padding: '20px 14px', borderRadius: 10, border: b.bg === '#F2EBD9' ? '1px solid rgba(255,255,255,0.1)' : 'none', minHeight: 90, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: b.dark ? '#fff' : '#1A1410', margin: 0 }}>{b.label}</p>
                      <p style={{ fontSize: 12, color: b.dark ? 'rgba(255,255,255,0.45)' : '#8C8074', marginTop: 3 }}>{b.sub}</p>
                    </div>
                  ))}
                </div>
                <Eyebrow mt>Color Rationale</Eyebrow>
                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { swatch: '#C4873A', label: 'Copper',        reason: 'Carries the warmth of the espresso bar — premium without being cold.' },
                    { swatch: '#1A1410', label: 'Deep Espresso',  reason: 'Anchors the brand in coffee. Works as a primary dark across all print and digital.' },
                    { swatch: '#3A5C52', label: 'Sage',           reason: 'Separates the cocktail identity from the café register — evening without being stark.' },
                  ].map(r => (
                    <div key={r.label} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <div style={{ width: 14, height: 14, borderRadius: 3, background: r.swatch, flexShrink: 0, marginTop: 2 }} />
                      <div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>{r.label} — </span>
                        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{r.reason}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </GlassCard>

          {/* ── VISUAL STYLE (full width) ── */}
          <GlassCard num="5" title="VISUAL STYLE DIRECTION">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
              <div>
                <Eyebrow>Brand Pillars</Eyebrow>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
                  {PILLARS.map(p => (
                    <div key={p.word} style={{ ...glass, padding: '18px 14px', textAlign: 'center' }}>
                      <div style={{ fontSize: 28, marginBottom: 8, color: COPPER }}>{p.icon}</div>
                      <p style={{ fontSize: 15, fontWeight: 700, letterSpacing: '0.16em', color: '#fff', margin: 0 }}>{p.word}</p>
                      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>{p.sub}</p>
                    </div>
                  ))}
                </div>
                <Eyebrow mt>Visual References</Eyebrow>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 12 }}>
                  {([
                    [IMG.floor, 'MATERIAL'],
                    [IMG.bar,   'CRAFT'],
                    [IMG.beans, 'PROVENANCE'],
                  ] as [string, string][]).map(([src, cap]) => (
                    <div key={cap} style={{ borderRadius: 8, overflow: 'hidden' }}>
                      <img src={src} alt="" style={{ width: '100%', height: 90, objectFit: 'cover', display: 'block' }} />
                      <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 5, textAlign: 'center', letterSpacing: '0.1em' }}>{cap}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <Eyebrow>Photography Direction</Eyebrow>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 12 }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'rgba(80,200,120,0.9)', marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>Do</p>
                    {["Close-up material texture", "Warm, low-key lighting", "Triad bean origin", "People working, not posing"].map(t => (
                      <div key={t} style={{ display: 'flex', gap: 8, padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <span style={{ color: 'rgba(80,200,120,0.8)', fontSize: 13, flexShrink: 0 }}>✓</span>
                        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>{t}</span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,80,60,0.9)', marginBottom: 10, letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>Don't</p>
                    {["Flat overhead lighting", "Generic latte art shots", "Overly staged scenes", "Bright white backgrounds"].map(t => (
                      <div key={t} style={{ display: 'flex', gap: 8, padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <span style={{ color: 'rgba(255,80,60,0.8)', fontSize: 13, flexShrink: 0 }}>✕</span>
                        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>{t}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <Eyebrow mt>Mood</Eyebrow>
                <Body mt>Architectural photography — not lifestyle. Capture the materials, the light, the space itself. The people are incidental. The room is the subject.</Body>
                <Body mt>Think: boutique hotel editorial. Rough-to-smooth contrast. Imperfect warmth. Never sterile, never over-lit.</Body>
              </div>
            </div>
          </GlassCard>

          {/* ── BIG STATEMENT 3 ── */}
          <BigStatement
            quote="The second branch is the right moment. Doing it now means the cost is absorbed into work you were already going to do."
            sub="Launching with an elevated identity means the new space opens as Capu at its fullest — not version two, the definitive version."
            img={IMG.exterior}
          />

          {/* ── ROW 4: Deliverables + Quick Wins ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

            <GlassCard num="6" title="DELIVERABLES">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px', marginTop: 4 }}>
                {SCOPE.map((s, i) => (
                  <div key={s.n} style={{ paddingTop: i < 2 ? 0 : 20, paddingBottom: 20, borderBottom: i >= SCOPE.length - 2 ? 'none' : '1px solid rgba(255,255,255,0.06)' }}>
                    <p style={{ fontSize: 32, fontWeight: 300, color: COPPER, margin: '0 0 6px', letterSpacing: '-0.02em', lineHeight: 1 }}>{s.n}</p>
                    <p style={{ fontSize: 15, fontWeight: 600, color: '#fff', margin: '0 0 5px' }}>{s.title}</p>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, margin: 0 }}>{s.desc}</p>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', marginTop: 20, letterSpacing: '0.08em' }}>6–8 weeks from kickoff · phased with review points</p>
            </GlassCard>

            <GlassCard num="7" title="QUICK WIN IDEAS">
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 20, lineHeight: 1.6 }}>High-impact moves that shift perception before the second branch opens.</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
                {QUICKWINS.map((q, i) => (
                  <div key={q.title} style={{ paddingTop: i < 2 ? 0 : 18, paddingBottom: 18, borderBottom: i >= QUICKWINS.length - 2 ? 'none' : '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <i className={q.icon} style={{ fontSize: 16, color: COPPER, flexShrink: 0 }} />
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#fff', margin: 0 }}>{q.title}</p>
                    </div>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, margin: 0 }}>{q.desc}</p>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>

          {/* ── WHAT HAPPENS NEXT ── */}
          <div style={{ ...glassLight, padding: '36px 36px' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'baseline', marginBottom: 28, borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: 16 }}>
              <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase' as const, color: 'rgba(255,255,255,0.4)' }}>What Happens Next</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
              {[
                { n: '1', phase: 'Brand Study',  status: 'complete', label: 'COMPLETE', desc: "We've documented the space, identified the identity gap, and the brief is clear. This is where we are now." },
                { n: '2', phase: 'Logo Drafts',  status: 'active',   label: 'UP NEXT',  desc: 'We create 3–5 directions from the current logo — each a different interpretation of the Capu brand. Two revision rounds included.' },
                { n: '3', phase: 'Applications', status: 'pending',  label: 'PENDING',  desc: 'Once the logo is locked: packaging, merchandise, signage, and the full social kit.' },
                { n: '4', phase: 'Handoff',       status: 'pending',  label: 'PENDING',  desc: 'A living brand guidelines document + all production-ready files for print, digital, and your vendor.' },
              ].map((step) => (
                <div key={step.n} style={{ ...glass, padding: '20px 18px', opacity: step.status === 'pending' ? 0.55 : 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: COPPER, letterSpacing: '0.1em' }}>{step.n}.</span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase' as const,
                      color: step.status === 'complete' ? 'rgba(80,200,120,0.9)' : step.status === 'active' ? COPPER : 'rgba(255,255,255,0.25)',
                      border: `1px solid ${step.status === 'complete' ? 'rgba(80,200,120,0.3)' : step.status === 'active' ? 'rgba(196,135,58,0.4)' : 'rgba(255,255,255,0.1)'}`,
                      padding: '2px 7px', borderRadius: 4,
                    }}>{step.label}</span>
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: '0 0 8px' }}>{step.phase}</p>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, margin: 0 }}>{step.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── DISCLAIMER ── */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', marginTop: 8, paddingTop: 40, paddingBottom: 8, paddingLeft: 4, paddingRight: 4 }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '24px 28px' }}>
              <span style={{ fontSize: 18, marginTop: 2, flexShrink: 0, opacity: 0.5 }}>ⓘ</span>
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginBottom: 8 }}>A note on this proposal</p>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.75, margin: 0 }}>
                  The directions, scope, and creative concepts outlined here are preliminary — presented to give you an overall picture of what we can do for the brand. Nothing is locked in stone. As we move forward, we keep you in the loop at every step, and the work evolves together with your input and approval.
                </p>
              </div>
            </div>
          </div>

          {/* ── FINAL CTA ── */}
          <div style={{ ...glassLight, padding: '56px 48px', marginTop: 8, textAlign: 'center' }}>
            <p style={{ fontSize: 13, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginBottom: 16 }}>Next Step</p>
            <h2 style={{ color: '#fff', fontSize: 'clamp(1.8rem,3.5vw,2.8rem)', lineHeight: 1.1, margin: '0 0 16px', fontWeight: 700 }}>
              Approve the proposal.<br />We start immediately.
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 17, lineHeight: 1.75, margin: '0 auto 36px', maxWidth: 480 }}>
              We've had the call. The direction is clear. One reply is all it takes to kick off the logo redesign and the first phase of the brand elevation.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <a href={APPROVE_HREF}
                style={{ background: COPPER, color: '#fff', fontSize: 16, fontWeight: 700, letterSpacing: '0.06em', padding: '15px 36px', textDecoration: 'none', display: 'inline-block', borderRadius: 10 }}>
                Approve &amp; Get Started →
              </a>
              <a href="mailto:contact@hunacreatives.com"
                style={{ ...glass, color: 'rgba(255,255,255,0.5)', fontSize: 15, padding: '15px 28px', textDecoration: 'none', display: 'inline-block' }}>
                Reply with questions
              </a>
            </div>
          </div>

        </div>{/* end body */}

        {/* Footer */}
        <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '24px 40px' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <img src="https://hunacreatives.com/images/fc04818c74ad69bdfb22b93a6a0c6a72.png" alt="Huna Creatives" style={{ height: 18, opacity: 0.25 }} />
            <div style={{ display: 'flex', gap: 24 }}>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.18)' }}>Cebu City, Philippines</span>
              <a href="mailto:contact@hunacreatives.com" style={{ fontSize: 13, color: 'rgba(255,255,255,0.18)', textDecoration: 'none' }}>
                contact@hunacreatives.com
              </a>
            </div>
          </div>
        </footer>

      </div>
    </div>
  );
}

/* ─── Big statement ─── */
function BigStatement({ quote, sub, img, flip = false }: { quote: React.ReactNode; sub: string; img: string; flip?: boolean }) {
  const COPPER = '#C4873A';
  return (
    <div style={{ position: 'relative', borderRadius: 20, overflow: 'hidden', minHeight: 200, display: 'flex', alignItems: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${img})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'brightness(0.35)' }} />
      <div style={{ position: 'absolute', inset: 0, background: flip ? 'linear-gradient(to left, rgba(10,8,6,0.75), rgba(10,8,6,0.2))' : 'linear-gradient(to right, rgba(10,8,6,0.75), rgba(10,8,6,0.2))' }} />
      <div style={{ position: 'relative', zIndex: 1, padding: '44px 48px', maxWidth: 700 }}>
        <div style={{ width: 36, height: 3, background: COPPER, marginBottom: 20, borderRadius: 2 }} />
        <p style={{ fontSize: 'clamp(1.3rem,2.5vw,2rem)', color: '#fff', lineHeight: 1.25, margin: '0 0 14px', fontWeight: 700 }}>
          "{quote}"
        </p>
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, margin: 0 }}>{sub}</p>
      </div>
    </div>
  );
}

/* ─── Glass card ─── */
function GlassCard({ num, title, children }: { num: string; title: string; children: React.ReactNode }) {
  const COPPER = '#C4873A';
  return (
    <div style={{
      background: 'rgba(255,255,255,0.05)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 20,
      padding: '32px 28px',
    }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'baseline', marginBottom: 22, borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: 14 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: COPPER, letterSpacing: '0.16em' }}>{num}.</span>
        <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase' as const, color: 'rgba(255,255,255,0.35)' }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

/* ─── Section divider ─── */
function SectionDivider({ label, title, sub, copper = false }: { label: string; title: string; sub: string; copper?: boolean }) {
  const COPPER = '#C4873A';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 24, padding: '20px 0 8px' }}>
      <div style={{ flexShrink: 0 }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: copper ? COPPER : 'rgba(255,255,255,0.25)', margin: '0 0 4px' }}>{label}</p>
        <p style={{ fontSize: 24, fontWeight: 700, color: copper ? '#fff' : 'rgba(255,255,255,0.7)', margin: 0, letterSpacing: '-0.01em' }}>{title}</p>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', margin: '4px 0 0', lineHeight: 1.5 }}>{sub}</p>
      </div>
      <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, rgba(196,135,58,0.5), transparent)' }} />
    </div>
  );
}

/* ─── Small helpers ─── */
function Eyebrow({ children, mt }: { children: React.ReactNode; mt?: boolean }) {
  return <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', margin: mt ? '20px 0 0' : 0 }}>{children}</p>;
}
function Body({ children, mt }: { children: React.ReactNode; mt?: boolean }) {
  return <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.55)', lineHeight: 1.75, margin: mt ? '10px 0 0' : 0 }}>{children}</p>;
}
