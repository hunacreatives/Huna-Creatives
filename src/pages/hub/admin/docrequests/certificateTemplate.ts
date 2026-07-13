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

export function refNumber(contractorId: string): string {
  const stamp = new Date();
  const y = stamp.getFullYear();
  const m = String(stamp.getMonth() + 1).padStart(2, '0');
  const short = contractorId.replace(/-/g, '').slice(0, 6).toUpperCase();
  return `HC-${y}${m}-${short}`;
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

// Standard Philippine HR/legal-certificate closing line — generated here
// (not by the AI) so it's always present and consistently worded.
function issuedLine(): string {
  const now = new Date();
  return `Issued this ${ordinal(now.getDate())} day of ${now.toLocaleDateString('en-US', { month: 'long' })}, ${now.getFullYear()} in Cebu City, Philippines, for whatever legal purpose it may serve.`;
}

// Modern, minimal legal-document look — SF Pro / system-font stack, compact
// type scale, a single accent rule instead of an ornate border, and a
// footer carrying the standard confidentiality/verification legal notice.
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
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Segoe UI', Helvetica, Arial, sans-serif;
    font-size: 9.5pt; color: #1a1a1a; background: #e9e9ea; -webkit-font-smoothing: antialiased;
  }
  .sheet { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 12mm; }
  .doc { background: #fff; min-height: 273mm; padding: 16mm 18mm; position: relative; box-shadow: 0 1px 3px rgba(0,0,0,0.12); }

  .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10pt; }
  .logo-block img { height: 26pt; width: auto; display: block; }
  .header-contact { text-align: right; font-size: 7.5pt; color: #6b6b6b; line-height: 1.6; }
  .header-rule { border: none; border-top: 1pt solid #D64F1E; margin: 0 0 10pt; }

  .meta-row { display: flex; justify-content: space-between; font-size: 7.5pt; color: #8a8a8a; margin-bottom: 26pt; letter-spacing: 0.02em; text-transform: uppercase; }

  .doc-title { font-size: 13.5pt; font-weight: 600; letter-spacing: 0.01em; margin: 0 0 3pt; color: #111; }
  .doc-underline { width: 34pt; height: 2pt; background: #D64F1E; margin: 0 0 22pt; }
  .salutation { font-weight: 600; font-size: 9.5pt; margin-bottom: 14pt; color: #111; }

  p { text-align: justify; margin-bottom: 11pt; line-height: 1.6; font-size: 9.5pt; color: #222; }
  .issued-line { margin-top: 2pt; color: #555; font-size: 9pt; }

  .sign-block { margin-top: 34pt; display: flex; justify-content: flex-end; }
  .sign-col { text-align: center; width: 190pt; }
  .sign-img { height: 44pt; width: auto; max-width: 170pt; object-fit: contain; margin: 0 auto 2pt; display: block; }
  .sign-line { border-top: 1pt solid #222; margin-top: 2pt; padding-top: 5pt; }
  .sign-name { font-weight: 600; font-size: 9.5pt; color: #111; }
  .sign-title { font-size: 8pt; color: #777; margin-top: 1pt; }

  .footer { margin-top: 36pt; border-top: 0.75pt solid #e5e5e5; padding-top: 8pt; }
  .footer p { text-align: justify; margin: 0 0 3pt; font-size: 6.8pt; line-height: 1.5; color: #9a9a9a; }
  .footer p:last-child { margin-bottom: 0; }
  .footer strong { color: #7a7a7a; }

  @media print {
    body { background: #fff; }
    .sheet { margin: 0; padding: 0; }
    .doc { box-shadow: none; min-height: auto; }
    @page { size: A4; margin: 12mm; }
  }
</style>
</head>
<body>
<div class="sheet">
  <div class="doc">
    <div class="header">
      <div class="logo-block">
        <img src="${logoData}" alt="Huna Creatives" />
      </div>
      <div class="header-contact">
        (032) 505 6921 &nbsp;|&nbsp; +63 952 447 2602<br />
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
    <div class="salutation">To Whom It May Concern,</div>

    ${paragraphs}

    <p class="issued-line">${issuedLine()}</p>

    <div class="sign-block">
      <div class="sign-col">
        <img src="${sigData}" class="sign-img" alt="Signature" />
        <div class="sign-line">
          <div class="sign-name">Francis Fiel Roble</div>
          <div class="sign-title">Owner, Huna Creatives</div>
        </div>
      </div>
    </div>

    <div class="footer">
      <p><strong>Huna Creatives</strong> &middot; Cebu, Philippines &middot; This document was generated electronically and is valid without a physical signature.</p>
      <p>This document is confidential and intended solely for the named recipient and the party or institution for which it was requested. Unauthorized reproduction, alteration, or redistribution is prohibited.</p>
      <p>To verify the authenticity of this document, contact Huna Creatives at contact@hunacreatives.com quoting Reference No. ${ref}.</p>
    </div>
  </div>
</div>
</body>
</html>`;
}
