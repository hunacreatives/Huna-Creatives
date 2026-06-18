import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const COPPER = '#C4873A';
const IMG_BG = '/proposals/capu-coffee/IMG_4183.webp';
const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif";

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

const STAGES = [
  {
    num: '01',
    title: 'Brand Identity & Direction',
    desc: 'The complete brand system — not just a logo, but a fully resolved identity with the documentation and depth to apply it anywhere. This is the base everything else builds on.',
    items: [
      'Logo rebrand — wordmark, icon, horizontal + stacked lockups, favicon',
      'Full color system with application rules',
      'Typography direction + hierarchy',
      'Extensive brand guidelines document — usage rules, dos & don\'ts, color specs, type specs',
      'Brand application direction across all key touchpoints',
      'Production-ready master file set',
    ],
    fee: '₱35,000',
    feeNote: 'Base engagement',
    timeline: '3–4 weeks',
    active: true,
  },
  {
    num: '02',
    title: 'Brand Applications',
    desc: 'Once the identity is locked, we apply it across your physical and digital touchpoints. Quoted per deliverable — pick what you need now, add the rest as the brand grows.',
    items: [
      'Packaging — cups, sleeves, bags, containers, wax paper, labels',
      'Merchandise — tote bags, tissue paper, sticker sheet',
      'Signage — exterior fascia, window decals, menu boards',
      'Print — dine-in + takeaway menus, A-frame',
      'Digital — social media kit, cover photos, templates',
    ],
    fee: 'Quoted per item',
    feeNote: 'À la carte — only what you need',
    timeline: 'Per deliverable',
    active: false,
  },
  {
    num: '03',
    title: 'Supplier Coordination',
    desc: 'We liaise with your printers and vendors to make sure everything executes correctly in production — specs, proofs, and file handoff handled on your behalf.',
    items: [
      'Print-ready file prep per supplier',
      'Spec sheets + technical briefs',
      'Proof review before anything goes to print',
      'Coordination across packaging, merch, and signage vendors',
    ],
    fee: '₱15,000',
    feeNote: 'Optional',
    timeline: 'Supplier-dependent',
    active: false,
    optional: true,
  },
  {
    num: '04',
    title: 'Social Media Support',
    desc: 'Ongoing creative support to keep the brand consistent on social — content direction, templates, and a visual framework your team can actually use.',
    items: [
      'Monthly content direction + shot list',
      'Custom post templates (Stories + Feed)',
      'Caption tone + voice guidelines',
      'Monthly creative check-in',
    ],
    fee: 'Quoted separately',
    feeNote: 'Optional — monthly retainer',
    timeline: 'Ongoing',
    active: false,
    optional: true,
  },
];

export default function CapuCoffeeApprovePage() {
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    document.title = 'Engagement Overview — Capu Coffee × Huna Creatives';
  }, []);

  async function handleConfirm() {
    setConfirming(true);
    try {
      await supabase.functions.invoke('confirm-proposal', {
        body: { client: 'Adrian Manuel Tan', proposal: 'Capu Coffee Brand Elevation' },
      });
    } catch (_) { /* silent fail — notification is best-effort */ }
    setConfirmed(true);
    setConfirming(false);
  }

  return (
    <div style={{ minHeight: '100vh', fontFamily: FONT, color: '#fff', position: 'relative', background: '#080604' }}>

      {/* Background */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        backgroundImage: `url(${IMG_BG})`,
        backgroundSize: 'cover', backgroundPosition: 'center',
        filter: 'blur(6px) brightness(0.3)',
      }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 1, background: 'rgba(8,6,4,0.80)', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 2 }}>

        {/* Nav */}
        <nav style={{ padding: '20px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <img src="https://hunacreatives.com/images/fc04818c74ad69bdfb22b93a6a0c6a72.png" alt="Huna Creatives" style={{ height: 22, opacity: 0.6 }} />
          <a href="/p/capu-coffee" style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', textDecoration: 'none', letterSpacing: '0.08em' }}>
            ← Back to proposal
          </a>
        </nav>

        <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 40px 100px' }}>

          {/* Header */}
          <div style={{ paddingTop: 40, paddingBottom: 56, marginBottom: 56, borderBottom: '1px solid rgba(255,255,255,0.07)', textAlign: 'center' }}>
            <p style={{ fontSize: 12, letterSpacing: '0.28em', textTransform: 'uppercase', color: COPPER, margin: '0 0 20px' }}>
              Capu Coffee × Huna Creatives
            </p>
            <h1 style={{ fontSize: 'clamp(2.2rem,5vw,3.8rem)', fontWeight: 800, lineHeight: 1.05, margin: '0 0 20px', letterSpacing: '-0.02em' }}>
              Engagement Overview
            </h1>
            <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, maxWidth: 540, margin: '0 auto 32px' }}>
              Start with a complete brand identity — then apply it wherever it makes sense, at your own pace.
            </p>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
              {[
                { label: 'Base engagement', value: '₱35,000' },
                { label: 'Applications', value: 'À la carte' },
                { label: 'First delivery', value: '3–4 weeks' },
              ].map(({ label, value }) => (
                <div key={label} style={{ ...glass, padding: '14px 20px' }}>
                  <p style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', margin: '0 0 4px' }}>{label}</p>
                  <p style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0 }}>{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Stages */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 56 }}>
            {STAGES.map((s) => (
              <div key={s.num} style={{
                ...glassLight,
                padding: '36px 40px',
                opacity: s.active ? 1 : 0.65,
                position: 'relative',
                overflow: 'hidden',
              }}>
                {s.active && (
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(to right, ${COPPER}, transparent)` }} />
                )}
                <div style={{ display: 'flex', gap: 40, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  {/* Left */}
                  <div style={{ flex: '1 1 320px', minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: s.active ? COPPER : 'rgba(255,255,255,0.2)', letterSpacing: '0.14em' }}>
                        STAGE {s.num}
                      </span>
                      {s.active && (
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: `${COPPER}22`, color: COPPER, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                          Start here
                        </span>
                      )}
                      {(s as typeof s & { optional?: boolean }).optional && (
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                          Optional
                        </span>
                      )}
                    </div>
                    <h3 style={{ fontSize: 21, fontWeight: 700, margin: '0 0 10px', color: '#fff', letterSpacing: '-0.01em' }}>
                      {s.title}
                    </h3>
                    <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.45)', lineHeight: 1.65, margin: '0 0 20px' }}>
                      {s.desc}
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {s.items.map(item => (
                        <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 14, color: 'rgba(255,255,255,0.45)' }}>
                          <span style={{ width: 4, height: 4, borderRadius: '50%', background: s.active ? COPPER : 'rgba(255,255,255,0.2)', flexShrink: 0, marginTop: 6 }} />
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 160, flexShrink: 0 }}>
                    <div>
                      <p style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', margin: '0 0 4px' }}>Fee</p>
                      <p style={{ fontSize: 22, fontWeight: 800, color: s.active ? '#fff' : 'rgba(255,255,255,0.5)', margin: 0 }}>{s.fee}</p>
                      {s.feeNote && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', margin: '3px 0 0' }}>{s.feeNote}</p>}
                    </div>
                    <div>
                      <p style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', margin: '0 0 4px' }}>Timeline</p>
                      <p style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.5)', margin: 0 }}>{s.timeline}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Payment terms */}
          <div style={{ marginBottom: 48 }}>
            <div style={{ ...glass, padding: '40px 40px' }}>
              <p style={{ fontSize: 12, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', margin: '0 0 28px' }}>How payment works</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 1, background: 'rgba(255,255,255,0.06)', borderRadius: 12, overflow: 'hidden' }}>
                {[
                  { icon: 'ri-file-list-3-line', title: 'Invoice per stage', desc: 'We send an invoice before each stage begins. No surprises.' },
                  { icon: 'ri-folder-open-line', title: 'Files at completion', desc: 'All source files and production assets are handed over when each stage is done.' },
                  { icon: 'ri-loop-left-line',   title: '2 revision rounds', desc: 'Two rounds of revisions are included in every stage at no extra charge.' },
                  { icon: 'ri-store-line',        title: 'Production costs separate', desc: 'Printing, manufacturing, and supplier costs go directly to the vendor — not through us.' },
                ].map(({ icon, title, desc }) => (
                  <div key={title} style={{ padding: '24px 24px', background: 'rgba(8,6,4,0.4)' }}>
                    <i className={icon} style={{ fontSize: 20, color: COPPER, display: 'block', marginBottom: 12 }} />
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: '0 0 6px' }}>{title}</p>
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, margin: 0 }}>{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CTA */}
          <div style={{ ...glassLight, padding: '52px 48px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 50% 0%, ${COPPER}15, transparent 65%)`, pointerEvents: 'none' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <p style={{ fontSize: 12, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', margin: '0 0 16px' }}>Ready to move forward</p>
              <h2 style={{ fontSize: 'clamp(1.8rem,3vw,2.6rem)', fontWeight: 800, lineHeight: 1.1, margin: '0 0 14px', letterSpacing: '-0.02em' }}>
                Let's build the brand.
              </h2>
              <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.4)', lineHeight: 1.75, margin: '0 auto 32px', maxWidth: 440 }}>
                Start with the brand identity — everything else follows from there. We'll send the agreement and invoice within 24 hours.
              </p>
              {confirmed ? (
                <div style={{ ...glass, padding: '16px 32px', display: 'inline-block', borderRadius: 12 }}>
                  <p style={{ margin: 0, fontSize: 16, color: '#fff', fontWeight: 600 }}>✅ Confirmed — we'll be in touch within 24 hours.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button
                    onClick={handleConfirm}
                    disabled={confirming}
                    style={{ background: confirming ? 'rgba(196,135,58,0.5)' : COPPER, color: '#fff', fontSize: 16, fontWeight: 700, letterSpacing: '0.05em', padding: '15px 36px', border: 'none', cursor: confirming ? 'default' : 'pointer', borderRadius: 10 }}
                  >
                    {confirming ? 'Sending…' : 'Confirm Stage 01 →'}
                  </button>
                  <a
                    href="mailto:contact@hunacreatives.com"
                    style={{ ...glass, color: 'rgba(255,255,255,0.5)', fontSize: 15, padding: '15px 28px', textDecoration: 'none', display: 'inline-block', cursor: 'pointer' }}
                  >
                    Ask a question
                  </a>
                </div>
              )}

            </div>
          </div>

        </div>

        {/* Footer */}
        <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '24px 40px' }}>
          <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
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
