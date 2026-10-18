// The Huna Creatives email layout, in the brand deck's white, black and orange:
// a white top with the logo, the message in sections, orange buttons and a black footer.
// Every email Huna sends (clients, employees, the team) goes through hunaEmail() and
// the blocks below, so they all look alike. Each function keeps its template in its
// own email.ts; scripts/email-previews.ts renders every one with sample data.
// The hub's reply composer mirrors this (ReplyComposer.tsx + .email-canvas in index.css).
//
// NOTE: the deploy workflow redeploys every function that imports a changed
// _shared file (or a shared file that imports it) on the next push.
import { inlineHtml, parseEmailBody } from './emailBody.ts';

export const SITE_URL = 'https://hunacreatives.com';
export const HUB_URL = 'https://hub.hunacreatives.com';
const INSTAGRAM_URL = 'https://www.instagram.com/hunacreatives/';
const FACEBOOK_URL = 'https://www.facebook.com/hunacreatives/';
const IMG = `${SITE_URL}/images`;
/** Black logo, for the white top. */
export const LOGO_URL = `${IMG}/547b59870e776a20eb28e4f20931787c.png`;

// Brand deck colours: black, grey, Huna Orange, and the Huna Gradient's sand and red.
export const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
export const SERIF = "Georgia,'Times New Roman',serif";
export const BLACK = '#140f0b';
export const GREY = '#333232';
export const ORANGE = '#ef6323';
export const SAND = '#d9c3ab';
export const RED = '#bf2227';
// Tints of the deck's sand, for the page, panels and rules.
export const PAGE = '#f4eee7';
export const PANEL = '#f8f2eb';
export const MUTED = '#8a7a6c';
export const RULE = '#ebe1d6';

// Inline styles for body content, so functions that build their own copy match.
const HEADING = `font-family:${SANS};font-size:17px;line-height:1.35;font-weight:700;color:${BLACK}`;
export const S = {
  p: `margin:0 0 16px;font-family:${SANS};font-size:15px;line-height:1.65;color:${GREY}`,
  /** A heading that opens the body. */
  h: `margin:0 0 12px;${HEADING}`,
  /** A heading that starts a new section mid-body: rule above, extra space. */
  section: `margin:32px 0 12px;padding-top:28px;border-top:1px solid ${RULE};${HEADING}`,
  list: `display:inline-block;margin:0 0 16px;padding:0 0 0 22px;text-align:left;font-family:${SANS};font-size:15px;line-height:1.65;color:${GREY}`,
  li: 'margin:0 0 6px;padding-left:2px',
  link: `color:${BLACK};text-decoration:underline;text-decoration-color:${ORANGE}`,
  hr: `<div style="margin:12px 0 28px;border-top:1px solid ${RULE};font-size:0;line-height:0">&nbsp;</div>`,
};

// The composer's markup (see emailBody.ts) → email HTML.
export function renderLetter(text: string): string {
  return parseEmailBody(text).map((b, i) => {
    switch (b.type) {
      case 'p': return `<p style="${S.p}">${b.lines.map((l) => inlineHtml(l, S.link)).join('<br>')}</p>`;
      case 'h': return `<p style="${i === 0 ? S.h : S.section}">${inlineHtml(b.text, S.link)}</p>`;
      case 'ul':
      case 'ol': return `<${b.type} style="${S.list}">${b.items.map((it) => `<li style="${S.li}">${inlineHtml(it, S.link)}</li>`).join('')}</${b.type}>`;
      case 'hr': return S.hr;
      case 'empty': return `<p style="${S.p}">&nbsp;</p>`;
    }
  }).join('');
}

export interface EmailButton {
  label: string;
  url: string;
  /** primary = orange, secondary = black. */
  tone?: 'primary' | 'secondary';
}

export interface HunaEmailOptions {
  /** <title>, also the fallback inbox preview. Plain text. */
  title: string;
  /** Inbox preview text shown after the subject. Plain text. */
  preheader?: string;
  /** Optional serif headline under the logo (HTML, already escaped). */
  heading?: string;
  /** Body HTML (already escaped). Use renderLetter() or the S styles. */
  body: string;
  buttons?: EmailButton[];
  /** Small print in the footer, e.g. why they got this email. Plain text. */
  note?: string;
  /** Everything is centred unless set to 'left'; tables keep their own columns. */
  align?: 'left' | 'center';
}

export const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!
));

// No lone last word on its own line.
export const keepLastWords = (html: string) => html.replace(/ (\S+)$/, '&nbsp;$1');

// ── Body blocks ─────────────────────────────────────────────────────────────
// Every value passed in as HTML must already be escaped (use esc()).

/** A paragraph. */
export const p = (html: string, o: { align?: 'left' | 'center'; muted?: boolean; small?: boolean } = {}) =>
  `<p style="${S.p}${o.align ? `;text-align:${o.align}` : ''}${o.muted ? `;color:${MUTED}` : ''}${o.small ? ';font-size:13px;line-height:1.6' : ''}">${html}</p>`;

/** A small bold label above a block, e.g. "Their message". */
export const label = (text: string) =>
  `<p style="margin:24px 0 8px;font-family:${SANS};font-size:13px;line-height:1.4;font-weight:700;color:${BLACK}">${esc(text)}</p>`;

/** A link in body copy. */
export const link = (href: string, html: string) => `<a href="${href}" style="${S.link}">${html}</a>`;

/** Label/value rows in a soft panel, labels right and values left so they meet in the middle. Falsy values are skipped. */
export function details(rows: Array<[string, string | null | undefined | false]>): string {
  const shown = rows.filter(([, v]) => v);
  if (!shown.length) return '';
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${PANEL}" style="margin:0 0 20px;background:${PANEL};border-radius:10px"><tr><td style="padding:12px 20px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${shown.map(([k, v]) =>
      `<tr><td width="42%" style="padding:7px 16px 7px 0;width:42%;vertical-align:top;text-align:right;font-family:${SANS};font-size:13px;line-height:1.5;color:${MUTED}">${esc(k)}</td><td style="padding:7px 0;vertical-align:top;text-align:left;font-family:${SANS};font-size:14px;line-height:1.5;color:${BLACK}">${v}</td></tr>`).join('')}</table>
  </td></tr></table>`;
}

/** Someone's own words (a message, a note), in a soft panel. Plain text in, escaped here. */
export const quote = (text: string) =>
  `<div style="margin:0 0 20px;padding:16px 20px;background:${PANEL};border-radius:10px;font-family:${SANS};font-size:14px;line-height:1.65;color:${GREY};white-space:pre-wrap">${esc(text)}</div>`;

/** A highlighted figure, e.g. the amount due. */
export const amount = (caption: string, value: string, sub?: string) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;border:1px solid ${SAND};border-radius:10px"><tr><td align="center" style="padding:22px 20px;text-align:center;font-family:${SANS}">
    <p style="margin:0 0 4px;font-size:13px;color:${MUTED}">${esc(caption)}</p>
    <p style="margin:0;font-family:${SERIF};font-size:30px;line-height:1.2;font-weight:700;color:${BLACK}">${value}</p>
    ${sub ? `<p style="margin:6px 0 0;font-size:13px;color:${MUTED}">${sub}</p>` : ''}
  </td></tr></table>`;

export interface ItemsTable {
  head: string[];
  /** Cells are HTML (escaped). */
  rows: string[][];
  /** Per column; amounts go right. Defaults to left for the first column, right for the rest. */
  align?: Array<'left' | 'right'>;
  /** Rows under the table, e.g. Subtotal / Discount / Total. The last one is bold. */
  totals?: Array<[string, string]>;
}

/** Line items, payment history and the like. */
export function itemsTable(t: ItemsTable): string {
  const al = (i: number) => t.align?.[i] ?? (i === 0 ? 'left' : 'right');
  const cell = (html: string, i: number, extra = '') =>
    `<td align="${al(i)}" style="padding:10px ${i === t.head.length - 1 ? 0 : 12}px 10px 0;text-align:${al(i)};vertical-align:top;font-family:${SANS};font-size:14px;line-height:1.5;color:${GREY};${extra}">${html}</td>`;
  const head = `<tr>${t.head.map((h, i) => `<td align="${al(i)}" style="padding:0 ${i === t.head.length - 1 ? 0 : 12}px 8px 0;text-align:${al(i)};font-family:${SANS};font-size:12px;font-weight:700;color:${MUTED};border-bottom:1px solid ${RULE}">${esc(h)}</td>`).join('')}</tr>`;
  const body = t.rows.map((r) => `<tr>${r.map((c, i) => cell(c, i, `border-bottom:1px solid ${RULE}`)).join('')}</tr>`).join('');
  const span = t.head.length - 1;
  const totals = (t.totals ?? []).map(([k, v], i, all) => {
    const last = i === all.length - 1;
    const st = `font-family:${SANS};font-size:${last ? 15 : 14}px;${last ? `font-weight:700;color:${BLACK}` : `color:${GREY}`};padding:${i === 0 ? 14 : 4}px 0 4px`;
    return `<tr><td colspan="${span}" align="right" style="${st};padding-right:12px;text-align:right">${esc(k)}</td><td align="right" style="${st};text-align:right;white-space:nowrap">${v}</td></tr>`;
  }).join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px">${head}${body}${totals}</table>`;
}

/** Numbered next steps: [title, description] (both HTML). A centred block, left-aligned inside. */
export function steps(items: Array<[string, string]>): string {
  return `<table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="margin:4px auto 12px;text-align:left">${items.map(([t, d], i) =>
    `<tr><td width="28" valign="top" style="padding:0 14px 18px 0"><div style="width:26px;height:26px;border-radius:50%;background:${ORANGE};color:#ffffff;font-family:${SANS};font-size:13px;font-weight:700;line-height:26px;text-align:center">${i + 1}</div></td>
      <td valign="top" style="padding:2px 0 18px;font-family:${SANS}"><p style="margin:0 0 3px;font-size:15px;font-weight:700;color:${BLACK}">${t}</p><p style="margin:0;font-size:14px;line-height:1.6;color:${GREY}">${d}</p></td></tr>`).join('')}</table>`;
}

/** Footer note for emails only the Huna team receives. */
export const TEAM_NOTE = 'For the Huna team. This email did not go to a client.';

const buttonLink = (label: string, url: string, bg: string, fg: string) =>
  `<a href="${url}" style="display:inline-block;padding:15px 28px;border-radius:6px;background:${bg};color:${fg} !important;font-family:${SANS};font-size:15px;font-weight:700;line-height:1;text-decoration:none;white-space:nowrap">${esc(label)}</a>`;

export function emailButtons(buttons: EmailButton[], align: 'left' | 'center' = 'center'): string {
  if (!buttons.length) return '';
  // Each button is its own table so they wrap onto new lines on narrow screens.
  return `<div style="text-align:${align}">${buttons.map((b) =>
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="display:inline-table;vertical-align:top"><tr><td style="padding:0 ${align === 'center' ? 5 : 10}px 10px ${align === 'center' ? 5 : 0}px">${buttonLink(b.label, b.url, (b.tone ?? 'primary') === 'primary' ? ORANGE : BLACK, '#ffffff')}</td></tr></table>`).join('')}</div>`;
}

const icon = (href: string, file: string, alt: string) =>
  `<a href="${href}" style="display:inline-block;margin:0 5px;text-decoration:none"><img src="${IMG}/email/${file}" width="22" height="22" alt="${alt}" style="display:block;width:22px;height:22px;border:0"></a>`;

export function hunaEmail(o: HunaEmailOptions): string {
  const align = o.align ?? 'center';
  const buttons = o.buttons ?? [];
  const footerLink = (label: string, href: string) => `<a href="${href}" style="color:#eadccd !important;text-decoration:none">${label}</a>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light">
  <title>${esc(o.title)}</title>
  <style>
    @media only screen and (max-width:520px){
      .h-pad{padding-left:24px!important;padding-right:24px!important}
      .h-head{font-size:26px!important}
    }
  </style>
</head>
<body style="margin:0;padding:0;background:${PAGE};-webkit-text-size-adjust:100%" bgcolor="${PAGE}">
  ${o.preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(o.preheader)}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>` : ''}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${PAGE}" style="background:${PAGE}">
    <tr><td align="center" style="padding:32px 12px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff"
        style="max-width:560px;background:#ffffff;border-radius:14px">

        <tr><td align="center" style="padding:40px 32px 8px">
          <a href="${SITE_URL}"><img src="${LOGO_URL}" alt="Huna Creatives" width="120" style="display:block;width:120px;height:auto;border:0"></a>
        </td></tr>

        <tr><td class="h-pad" align="${align}" style="padding:32px 48px ${buttons.length ? 20 : 40}px;text-align:${align};font-family:${SANS};color:${GREY}">
          ${o.heading ? `<div class="h-head" style="margin:0 0 20px;font-family:${SERIF};font-size:32px;line-height:1.2;font-weight:700;color:${BLACK};text-align:${align}">${keepLastWords(o.heading)}</div>` : ''}
          ${o.body}
        </td></tr>

        ${buttons.length ? `<tr><td class="h-pad" style="padding:8px 48px 40px">${emailButtons(buttons, align)}</td></tr>` : ''}

        <tr><td class="h-pad" align="center" bgcolor="${BLACK}" style="background:${BLACK};background-image:linear-gradient(135deg,${RED} 0%,#5a1712 30%,${BLACK} 62%);border-radius:0 0 14px 14px;padding:30px 48px 32px;font-family:${SANS};text-align:center">
          <div style="margin:0 0 16px">${icon(INSTAGRAM_URL, 'instagram-orange.png', 'Instagram')}${icon(FACEBOOK_URL, 'facebook-orange.png', 'Facebook')}</div>
          <p style="margin:0 0 12px;font-size:12px;color:#a8988a">${footerLink('Services', `${SITE_URL}/services`)}&nbsp;&nbsp;&middot;&nbsp;&nbsp;${footerLink('Our work', `${SITE_URL}/portfolio`)}&nbsp;&nbsp;&middot;&nbsp;&nbsp;${footerLink('hunacreatives.com', SITE_URL)}</p>
          <p style="margin:0;font-size:11px;line-height:1.6;color:#a8988a">${o.note ? `${keepLastWords(esc(o.note))}<br>` : ''}Huna Creatives &middot; Cebu City, Philippines</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
