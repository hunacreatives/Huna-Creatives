// Converts the AI's plain-text certificate body (paragraphs separated by
// blank lines) into HTML paragraphs for the formal certificate template.
function bodyToParagraphs(body: string): string {
  return body
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => `<p>${p.replace(/\n/g, '<br />')}</p>`)
    .join('\n');
}

function refNumber(contractorId: string): string {
  const stamp = new Date();
  const y = stamp.getFullYear();
  const m = String(stamp.getMonth() + 1).padStart(2, '0');
  const short = contractorId.replace(/-/g, '').slice(0, 6).toUpperCase();
  return `HC-${y}${m}-${short}`;
}

// Formal, legal-looking certificate — bordered frame, centered serif title,
// reference number, "TO WHOM IT MAY CONCERN" salutation, and an owner
// signature block. Deliberately more formal than the contract letterhead
// (client contracts read as agency-branded; this reads as an official record).
export function renderCertificateHTML(
  title: string,
  body: string,
  contractorId: string,
  logoData: string,
  sigData: string,
): string {
  const issued = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const ref = refNumber(contractorId);
  const paragraphs = bodyToParagraphs(body);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; color: #111; background: #eceae6; }
  .sheet { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 14mm; }
  .frame { border: 2pt solid #1a1a1a; padding: 16mm 18mm 14mm; min-height: 265mm; position: relative; background: #fff; }
  .frame::before {
    content: ''; position: absolute; inset: 6pt; border: 0.75pt solid #b8b0a3; pointer-events: none;
  }
  .header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 4pt; }
  .logo-block img { height: 40pt; width: auto; display: block; }
  .logo-tagline { font-family: Arial, sans-serif; font-size: 8pt; color: #444; margin-top: 4pt; font-style: italic; }
  .header-contact { text-align: right; font-family: Arial, sans-serif; font-size: 8pt; color: #444; line-height: 1.7; }
  .header-rule { border: none; border-top: 1.5pt solid #D64F1E; margin: 8pt 0 4pt; }
  .meta-row { display: flex; justify-content: space-between; font-family: Arial, sans-serif; font-size: 8.5pt; color: #666; margin-bottom: 22pt; letter-spacing: 0.02em; }
  .doc-title { text-align: center; font-size: 20pt; font-weight: bold; text-transform: uppercase; letter-spacing: 1.5pt; margin: 6pt 0 4pt; }
  .doc-underline { width: 90pt; height: 2pt; background: #D64F1E; margin: 0 auto 26pt; }
  .salutation { font-weight: bold; letter-spacing: 0.5pt; margin-bottom: 16pt; text-align: center; font-size: 11.5pt; }
  p { text-align: justify; margin-bottom: 12pt; line-height: 1.85; font-size: 11.5pt; text-indent: 24pt; }
  .sign-block { margin-top: 40pt; display: flex; justify-content: flex-end; }
  .sign-col { text-align: center; width: 220pt; }
  .sign-img { height: 56pt; width: auto; max-width: 200pt; object-fit: contain; margin: 0 auto 2pt; display: block; }
  .sign-line { border-top: 1pt solid #111; margin-top: 2pt; padding-top: 5pt; }
  .sign-name { font-weight: bold; font-size: 11pt; }
  .sign-title { font-family: Arial, sans-serif; font-size: 9pt; color: #555; margin-top: 1pt; }
  .footer-note { position: absolute; bottom: 12mm; left: 18mm; right: 18mm; text-align: center; font-family: Arial, sans-serif; font-size: 7.5pt; color: #999; border-top: 0.5pt solid #ddd; padding-top: 6pt; }
  @media print {
    body { background: #fff; }
    .sheet { margin: 0; padding: 10mm; }
    @page { size: A4; margin: 0; }
  }
</style>
</head>
<body>
<div class="sheet">
  <div class="frame">
    <div class="header">
      <div class="logo-block">
        <img src="${logoData}" alt="Huna Creatives" />
        <div class="logo-tagline">Let's bring your <em>hunahuna</em> to life.</div>
      </div>
      <div class="header-contact">
        (032) 505 6921 | +63 952 447 2602<br />
        contact@hunacreatives.com<br />
        Cebu, Philippines, 6004
      </div>
    </div>
    <hr class="header-rule" />
    <div class="meta-row">
      <span>Ref. No. ${ref}</span>
      <span>Date Issued: ${issued}</span>
    </div>

    <div class="doc-title">${title}</div>
    <div class="doc-underline"></div>
    <div class="salutation">TO WHOM IT MAY CONCERN,</div>

    ${paragraphs}

    <div class="sign-block">
      <div class="sign-col">
        <img src="${sigData}" class="sign-img" alt="Signature" />
        <div class="sign-line">
          <div class="sign-name">Francis Fiel Roble</div>
          <div class="sign-title">Owner, Huna Creatives</div>
        </div>
      </div>
    </div>

    <div class="footer-note">Huna Creatives &middot; Cebu, Philippines &middot; This document is issued electronically and is valid without a physical signature.</div>
  </div>
</div>
</body>
</html>`;
}
