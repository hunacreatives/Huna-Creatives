// Reply-email body format, shared by the hub's reply composer (src/lib/emailBody.ts)
// and send-contact-reply, so the editor shows exactly what the client receives.
// No Deno or DOM APIs here: both sides import this file as-is.
//
// Blocks are separated by a blank line; each extra blank line is an empty paragraph.
//   ## Heading
//   - item   (also "* " and "• ")
//   1. item
//   ---      divider
//   anything else is a paragraph; lines inside one are joined with a line break
// Inline: **bold**, _italic_, [text](https://…). A backslash escapes the next symbol.

export type EmailBlock =
  | { type: 'p'; lines: string[] }
  | { type: 'h'; text: string }
  | { type: 'ul' | 'ol'; items: string[] }
  | { type: 'hr' }
  | { type: 'empty' };

export function escapeHtml(s: string): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!
  ));
}

export function parseEmailBody(text: string): EmailBlock[] {
  const blocks: EmailBlock[] = [];
  // Index of the paragraph or list still taking lines, or -1.
  let open = -1;
  let blanks = 0;

  for (const raw of String(text ?? '').replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trim();
    if (!line) { open = -1; blanks++; continue; }
    if (blocks.length) for (let i = 1; i < blanks; i++) blocks.push({ type: 'empty' });
    blanks = 0;

    const heading = line.match(/^#{1,6}\s+(.*)$/);
    const listItem = line.match(/^(?:([-*•])|\d+[.)])\s+(.*)$/);
    const last = open >= 0 ? blocks[open] : null;

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line)) { blocks.push({ type: 'hr' }); open = -1; }
    else if (heading) { blocks.push({ type: 'h', text: heading[1] }); open = -1; }
    else if (listItem) {
      const kind = listItem[1] ? 'ul' : 'ol';
      if (last && (last.type === 'ul' || last.type === 'ol') && last.type === kind) last.items.push(listItem[2]);
      else { blocks.push({ type: kind, items: [listItem[2]] }); open = blocks.length - 1; }
    } else if (last && last.type === 'p') last.lines.push(line);
    else { blocks.push({ type: 'p', lines: [line] }); open = blocks.length - 1; }
  }
  return blocks;
}

const ESCAPED = /\\([\\*_[\]()#\-.+•`>!])/g;

// Inline markup → HTML. Everything is escaped first; links only allow http(s) and mailto.
export function inlineHtml(s: string, linkStyle = ''): string {
  const held: string[] = [];
  const hold = (html: string) => `\u0000${held.push(html) - 1}\u0000`;

  let out = String(s ?? '').replace(ESCAPED, (_, c) => hold(escapeHtml(c)));
  out = escapeHtml(out);
  out = out.replace(/\[([^\]]+)\]\(((?:https?:\/\/|mailto:)[^\s)]+)\)/g, (_, label, href) =>
    `${hold(`<a href="${href}"${linkStyle ? ` style="${linkStyle}"` : ''}>`)}${label}${hold('</a>')}`);
  out = out.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(?<![\w\\])_(.+?)_(?!\w)/g, '<em>$1</em>');
  return out.replace(/\u0000(\d+)\u0000/g, (_, i) => held[Number(i)]);
}

// Inline markup stripped, for one-line previews.
export function inlinePlain(s: string): string {
  return String(s ?? '')
    .replace(/\[([^\]]+)\]\([^)\s]+\)/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/(?<![\w\\])_(.+?)_(?!\w)/g, '$1')
    .replace(ESCAPED, '$1');
}

export function emailBodyPlain(text: string): string {
  return parseEmailBody(text).map((b) =>
    b.type === 'p' ? b.lines.map(inlinePlain).join(' ')
    : b.type === 'h' ? inlinePlain(b.text)
    : b.type === 'ul' || b.type === 'ol' ? b.items.map(inlinePlain).join(', ')
    : '').filter(Boolean).join(' ');
}
