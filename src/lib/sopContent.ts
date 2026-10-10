// SOP content helpers. SOPs written in the rich editor are stored as HTML; older
// ones are plain text with light conventions (ALL-CAPS headings ending in ":",
// "•"/"-" bullets, "1." steps, **bold**). Pasted markdown uses the same converter.

export const SOP_CATEGORIES = [
  'General', 'Onboarding', 'Attendance', 'Payroll', 'HR', 'Projects',
  'Operations', 'Communication', 'Reporting', 'Training', 'Branding', 'Ad Launch',
];

const CATEGORY_CFG: Record<string, { icon: string; bg: string; light: string }> = {
  General:       { icon: 'ri-book-2-line',              bg: 'bg-gray-500',    light: 'bg-gray-50 text-gray-600 border-gray-200' },
  Onboarding:    { icon: 'ri-rocket-line',              bg: 'bg-teal-500',    light: 'bg-teal-50 text-teal-700 border-teal-100' },
  Attendance:    { icon: 'ri-time-line',                bg: 'bg-sky-500',     light: 'bg-sky-50 text-sky-700 border-sky-100' },
  Payroll:       { icon: 'ri-money-dollar-circle-line', bg: 'bg-emerald-500', light: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  HR:            { icon: 'ri-user-heart-line',          bg: 'bg-violet-500',  light: 'bg-violet-50 text-violet-700 border-violet-100' },
  Projects:      { icon: 'ri-folder-line',              bg: 'bg-indigo-500',  light: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
  Operations:    { icon: 'ri-settings-3-line',          bg: 'bg-amber-500',   light: 'bg-amber-50 text-amber-700 border-amber-100' },
  Communication: { icon: 'ri-chat-3-line',              bg: 'bg-rose-500',    light: 'bg-rose-50 text-rose-700 border-rose-100' },
  Reporting:     { icon: 'ri-file-chart-line',          bg: 'bg-cyan-600',    light: 'bg-cyan-50 text-cyan-700 border-cyan-100' },
  Training:      { icon: 'ri-video-line',               bg: 'bg-pink-500',    light: 'bg-pink-50 text-pink-700 border-pink-100' },
  Branding:      { icon: 'ri-palette-line',             bg: 'bg-orange-500',  light: 'bg-orange-50 text-orange-700 border-orange-100' },
  'Ad Launch':   { icon: 'ri-megaphone-line',           bg: 'bg-lime-600',    light: 'bg-lime-50 text-lime-700 border-lime-100' },
};

export const getSopCategory = (cat: string) => CATEGORY_CFG[cat] ?? CATEGORY_CFG.General;

export const sopLink = (id: number) => `${window.location.origin}/hub/sop/${id}`;

export const isSopHtml = (content?: string | null) =>
  !!content && /^\s*<(p|h[1-6]|ul|ol|blockquote|pre|hr|div)[\s>/]/i.test(content);

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function inline(text: string): string {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\(((?:https?:\/\/|mailto:)[^)\s]+)\)/g, '<a href="$2">$1</a>');
}

// Plain text / markdown → HTML the editor understands.
export function sopTextToHtml(text: string): string {
  const out: string[] = [];
  let list: 'ul' | 'ol' | 'task' | null = null;

  const closeList = () => {
    if (list) out.push(list === 'ol' ? '</ol>' : '</ul>');
    list = null;
  };
  const openList = (kind: 'ul' | 'ol' | 'task', start?: number) => {
    if (list === kind) return;
    closeList();
    if (kind === 'ol') out.push(start && start !== 1 ? `<ol start="${start}">` : '<ol>');
    else out.push(kind === 'task' ? '<ul data-type="taskList">' : '<ul>');
    list = kind;
  };

  for (const raw of text.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trim();
    let m: RegExpMatchArray | null;

    if (!line) { closeList(); continue; }

    if ((m = line.match(/^(?:[-*•]\s+)?(?:\[( |x|X)\]|(☐|☑|✅))\s+(.*)$/))) {
      openList('task');
      const checked = m[1] ? m[1].toLowerCase() === 'x' : m[2] !== '☐';
      out.push(`<li data-type="taskItem" data-checked="${checked}"><p>${inline(m[3])}</p></li>`);
      continue;
    }
    if ((m = line.match(/^[-*•]\s+(.*)$/))) {
      openList('ul');
      out.push(`<li><p>${inline(m[1])}</p></li>`);
      continue;
    }
    if ((m = line.match(/^(\d+)[.)]\s+(.*)$/))) {
      openList('ol', Number(m[1]));
      out.push(`<li><p>${inline(m[2])}</p></li>`);
      continue;
    }

    closeList();
    if ((m = line.match(/^(#{1,6})\s+(.*)$/))) {
      const level = m[1].length <= 2 ? 2 : 3;
      out.push(`<h${level}>${inline(m[2])}</h${level}>`);
    } else if (/^[A-Z][A-Z0-9\s/&()'-]+:$/.test(line)) {
      // Legacy section heading, e.g. "TASK STATUSES:"
      out.push(`<h3>${inline(line.slice(0, -1))}</h3>`);
    } else if (/^(-{3,}|_{3,}|\*{3,})$/.test(line)) {
      out.push('<hr>');
    } else if ((m = line.match(/^>\s?(.*)$/))) {
      out.push(`<blockquote><p>${inline(m[1])}</p></blockquote>`);
    } else {
      out.push(`<p>${inline(line)}</p>`);
    }
  }
  closeList();
  return out.join('');
}

// Plain text that looks like markdown/structured notes rather than a sentence or two.
export const looksStructured = (text: string) =>
  /^\s*(#{1,6}\s|[-*•]\s|\d+[.)]\s|\[( |x|X)\]\s|>\s|-{3,}\s*$)/m.test(text);

export const sopToEditorHtml = (content?: string | null) =>
  !content ? '' : isSopHtml(content) ? content : sopTextToHtml(content);

// Flat text for card previews and search.
export function sopPlainText(content?: string | null): string {
  if (!content) return '';
  if (!isSopHtml(content)) return content.replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
  const spaced = content.replace(/<\/(p|h[1-6]|li|blockquote|pre)>|<br\s*\/?>/gi, '$& ');
  const doc = new DOMParser().parseFromString(spaced, 'text/html');
  return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
}
