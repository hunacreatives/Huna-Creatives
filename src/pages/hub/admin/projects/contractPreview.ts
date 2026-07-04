import { HUNA_LOGO, FRANCIS_SIG } from '@/pages/hub/admin/documents/contractAssets';

// Opens a print-friendly preview window for an AI-generated client contract.
export function openContractPreview(preview: { title: string; body: string }) {
    const win = window.open('', '_blank', 'width=960,height=800');
    if (!win) return;
    const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    win.document.write(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>${preview.title}</title><style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { background: #f5f5f4; font-family: Arial, Helvetica, sans-serif; }
      .page { max-width: 820px; margin: 32px auto 80px; background: #fff; box-shadow: 0 2px 20px rgba(0,0,0,0.07); border-radius: 4px; overflow: hidden; }
      .lh { padding: 24px 52px 0; }
      .lh-inner { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px; }
      .lh-contact { text-align: right; font-size: 9pt; color: #444; line-height: 1.8; }
      .accent { height: 3px; background: linear-gradient(to right, #D64F1E 40%, #e5e7eb 40%); margin-bottom: 28px; }
      .body { padding: 0 52px 48px; font-size: 10.5pt; color: #111; line-height: 1.65; }
      .body h1.contract-title { font-size: 20pt; font-weight: 800; color: #111; margin: 0 0 6pt; text-transform: uppercase; letter-spacing: 0.02em; }
      .body p.contract-subtitle { font-size: 10.5pt; font-weight: 700; margin: 0 0 14pt; color: #111; }
      .body h2.section-between { font-size: 14pt; font-weight: 800; margin: 20pt 0 8pt; text-transform: uppercase; }
      .body h2 { font-size: 13pt; font-weight: 800; margin: 20pt 0 6pt; text-transform: uppercase; color: #111; }
      .body h3 { font-size: 10.5pt; font-weight: 700; margin: 12pt 0 4pt; color: #111; }
      .body p { margin: 0 0 8pt; text-align: justify; }
      .body ul { margin: 4pt 0 8pt 18pt; padding: 0; }
      .body ul li { margin-bottom: 4pt; text-align: justify; }
      .body hr.section-divider { border: none; border-top: 1px solid #d1d5db; margin: 16pt 0; }
      .body strong.highlight { color: #D64F1E; }
      .sig { padding: 0 52px 48px; border-top: 1px solid #e5e7eb; margin-top: 8px; }
      .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 32px; }
      .sig-label { font-size: 10pt; font-weight: 700; margin: 0 0 2px; }
      .sig-sub { font-size: 9pt; color: #6b7280; margin: 0 0 16px; }
      .sig-line { border-top: 1px solid #111; padding-top: 4px; margin-top: 4px; }
      .sig-meta { font-size: 8.5pt; color: #6b7280; margin: 0; }
      .draft-badge { margin: 0 52px 24px; padding: 10px 14px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; font-size: 11px; color: #92400e; }
      @media print { body { background: #fff; } .page { box-shadow: none; margin: 0; } }
    </style></head><body>
    <div class="page">
      <div class="lh">
        <div class="lh-inner">
          <div>
            <img src="${HUNA_LOGO}" alt="Huna Creatives" style="height:52px;width:auto;display:block">
            <p style="font-size:9pt;color:#555;font-style:italic;margin-top:4px;font-family:Arial,sans-serif">Let's bring your <em>hunahuna</em> to life.</p>
          </div>
          <div class="lh-contact">
            (032) 505 6921 | +63 952 447 2602<br>
            contact@hunacreatives.com<br>
            Cebu, Philippines, 6004
          </div>
        </div>
        <div class="accent"></div>
      </div>
      <div class="body">${preview.body}</div>
      <div class="sig">
        <div class="sig-grid">
          <div>
            <p class="sig-label">HUNA CREATIVES</p>
            <p class="sig-sub">Service Provider</p>
            <div style="height:52px;display:flex;align-items:flex-end;margin-bottom:4px">
              <img src="${FRANCIS_SIG}" style="height:52px;width:auto;max-width:200px" alt="Signature">
            </div>
            <div class="sig-line"><p class="sig-meta">Francis Fiel Roble · ${today}</p></div>
          </div>
          <div>
            <p class="sig-label">CLIENT</p>
            <p class="sig-sub">Authorized Representative</p>
            <div style="height:52px;border-bottom:1px solid #ccc;margin-bottom:4px"></div>
            <div style="padding-top:4px"><p class="sig-meta">Client signature · upon signing</p></div>
          </div>
        </div>
      </div>
      <div class="draft-badge">⚠ This is a preview — contract has not been sent yet.</div>
    </div>
    </body></html>`);
    win.document.close();
}
