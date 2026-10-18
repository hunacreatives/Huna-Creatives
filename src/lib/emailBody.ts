import type { JSONContent } from '@tiptap/core';
import { inlineHtml, parseEmailBody } from '../../supabase/functions/_shared/emailBody.ts';

export { emailBodyPlain } from '../../supabase/functions/_shared/emailBody.ts';

// Reply bodies are stored and sent as the light markup described in
// supabase/functions/_shared/emailBody.ts. These helpers move it in and out of
// the Tiptap editor in the reply composer.

export function bodyToHtml(text: string): string {
  return parseEmailBody(text).map((b) => {
    switch (b.type) {
      case 'p': return `<p>${b.lines.map((l) => inlineHtml(l)).join('<br>')}</p>`;
      case 'h': return `<h2>${inlineHtml(b.text)}</h2>`;
      case 'ul':
      case 'ol': return `<${b.type}>${b.items.map((i) => `<li><p>${inlineHtml(i)}</p></li>`).join('')}</${b.type}>`;
      case 'hr': return '<hr>';
      case 'empty': return '<p></p>';
    }
  }).join('');
}

type MarkLike = { type: string; attrs?: Record<string, unknown> };

const MARK_ORDER = ['link', 'bold', 'italic'];
const markKey = (m: MarkLike) => (m.type === 'link' ? `link:${m.attrs?.href}` : m.type);
const openMark = (m: MarkLike) => (m.type === 'link' ? '[' : m.type === 'bold' ? '**' : '_');
const closeMark = (m: MarkLike) => (m.type === 'link' ? `](${m.attrs?.href})` : m.type === 'bold' ? '**' : '_');

// Inline nodes → markup. Hard breaks become newlines; marks close at each break
// so every line parses on its own.
function serializeInline(nodes: JSONContent[] = []): string {
  let out = '';
  let open: MarkLike[] = [];
  const closeFrom = (i: number) => {
    out += open.slice(i).reverse().map(closeMark).join('');
    open = open.slice(0, i);
  };

  for (const node of nodes) {
    if (node.type === 'hardBreak') { closeFrom(0); out += '\n'; continue; }
    if (node.type !== 'text' || !node.text) continue;
    const want = MARK_ORDER
      .map((t) => node.marks?.find((m) => m.type === t) as MarkLike | undefined)
      .filter((m): m is MarkLike => !!m && (m.type !== 'link' || /^(https?:|mailto:)/.test(String(m.attrs?.href ?? ''))));
    let keep = 0;
    while (keep < open.length && keep < want.length && markKey(open[keep]) === markKey(want[keep])) keep++;
    closeFrom(keep);
    for (const m of want.slice(keep)) { out += openMark(m); open.push(m); }
    out += node.text.replace(/[\\*_[\]]/g, '\\$&');
  }
  closeFrom(0);
  return out;
}

// A typed line that starts like a list, heading or divider stays a paragraph.
const guardLine = (line: string) =>
  line.replace(/^(\s*)([-•#])/, '$1\\$2').replace(/^(\s*\d+)([.)])/, '$1\\$2');

const textOf = (node: JSONContent): string =>
  node.type === 'text' ? node.text ?? '' : (node.content ?? []).map(textOf).join(' ');

function listItems(list: JSONContent): string[] {
  const items: string[] = [];
  for (const li of list.content ?? []) {
    const parts: string[] = [];
    for (const child of li.content ?? []) {
      if (child.type === 'bulletList' || child.type === 'orderedList') {
        // Email lists are one level deep; nested items join the parent list.
        if (parts.length) items.push(parts.join(' '));
        parts.length = 0;
        items.push(...listItems(child));
      } else {
        parts.push(serializeInline(child.content).replace(/\n/g, ' '));
      }
    }
    if (parts.length) items.push(parts.join(' '));
  }
  return items.filter((i) => i.trim());
}

export function docToBody(doc: JSONContent): string {
  const blocks: string[] = [];
  let empties = 0;
  const push = (block: string) => {
    if (blocks.length) block = '\n'.repeat(empties) + block;
    blocks.push(block);
    empties = 0;
  };

  for (const node of doc.content ?? []) {
    switch (node.type) {
      case 'paragraph': {
        const text = serializeInline(node.content);
        if (!text.trim()) { empties++; break; }
        push(text.split('\n').map(guardLine).join('\n'));
        break;
      }
      case 'heading': {
        const text = serializeInline(node.content).replace(/\n/g, ' ');
        if (text.trim()) push(`## ${text}`);
        break;
      }
      case 'bulletList':
      case 'orderedList': {
        const items = listItems(node);
        if (items.length) push(items.map((i, n) => `${node.type === 'orderedList' ? `${n + 1}.` : '-'} ${i}`).join('\n'));
        break;
      }
      case 'horizontalRule':
        push('---');
        break;
      default: {
        const text = textOf(node).trim();
        if (text) push(guardLine(text.replace(/[\\*_[\]]/g, '\\$&')));
      }
    }
  }
  return blocks.join('\n\n');
}

// Plain-text paste that carries markdown (ChatGPT, Claude, Notes) keeps its structure.
export const looksLikeMarkdown = (text: string) =>
  /^\s*(#{1,6}\s|[-*•]\s|\d+[.)]\s|-{3,}\s*$)|\*\*[^*\n]+\*\*/m.test(text);
