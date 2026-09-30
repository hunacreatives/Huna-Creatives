import { formatShiftDay, inRange, latestShiftDay, periodRange, shiftDayOf, shiftEndsAt, weekStart } from '@/lib/smartgridShift';
import { pct, periodStats, type Totals } from './metrics';
import type { CallLogEntry, Caller, TrackerLead } from './types';

interface Input {
  callLog: CallLogEntry[];
  leads: TrackerLead[];
  callers: Caller[];
  day: string;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Teams keeps <table> markup on paste; inline styles because pasted HTML has no stylesheet
const TABLE = 'border-collapse:collapse;';
const TH = 'border:1px solid #d1d5db;padding:4px 10px;text-align:left;background:#f3f4f6;font-weight:bold;';
const TD = 'border:1px solid #d1d5db;padding:4px 10px;text-align:left;';

function htmlTable(head: string[], rows: string[][], boldLastRow = false) {
  const th = head.map(h => `<th style="${TH}">${esc(h)}</th>`).join('');
  const body = rows.map((r, i) => {
    const bold = boldLastRow && i === rows.length - 1;
    return `<tr>${r.map(c => `<td style="${TD}">${bold ? `<b>${esc(c)}</b>` : esc(c)}</td>`).join('')}</tr>`;
  }).join('');
  return `<table style="${TABLE}"><thead><tr>${th}</tr></thead><tbody>${body}</tbody></table>`;
}

// Monospace-free fallback for apps that drop HTML: pad columns so they still line up in most fonts
function textTable(head: string[], rows: string[][]) {
  const all = [head, ...rows];
  const widths = head.map((_, i) => Math.max(...all.map(r => r[i].length)));
  const line = (r: string[]) => r.map((c, i) => c.padEnd(widths[i])).join(' | ');
  return [line(head), widths.map(w => '-'.repeat(w)).join('-|-'), ...rows.map(line)].join('\n');
}

// One report per shift, copied as HTML (tables survive a paste into Teams) with a plain-text fallback
export function buildTeamsReport({ callLog, leads, callers, day }: Input) {
  const shift = periodStats(callLog, leads, callers, periodRange('shift', day));
  const week = periodStats(callLog, leads, callers, { start: weekStart(day), end: day, label: '' });
  const names = new Map(callers.map(c => [c.id, c.name]));

  const inProgress = day === latestShiftDay() && Date.now() < shiftEndsAt(day);
  const asOf = new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit' });
  const usDay = new Date(`${day}T12:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'short' });

  const title = `SmartGrid Western: Daily Calling Report${inProgress ? ` (so far, as of ${asOf} Manila)` : ''}`;
  const header = `Shift: ${formatShiftDay(day)} · 11 PM – 3 AM Manila (${usDay} morning, US Pacific)`;

  const resultHead = ['Caller', 'Calls', 'Conversations', 'Successful (emails)', 'Success rate', 'Callbacks', 'Meetings', 'Bills'];
  const resultRow = (name: string, s: Omit<Totals, 'lastCall'>) =>
    [name, `${s.calls}`, `${s.conversations}`, `${s.emails}`, pct(s.emails, s.calls), `${s.callbacks}`, `${s.meetings}`, `${s.bills}`];
  const resultRows = [...shift.rows.map(r => resultRow(r.name, r)), resultRow('Team total', shift.totals)];

  const weekLabel = `Week to date (${formatShiftDay(weekStart(day))} – ${formatShiftDay(day)})`;
  const compareHead = ['', 'Calls', 'Successful (emails)', 'Callbacks', 'Meetings', 'Bills'];
  const compareRow = (label: string, s: Omit<Totals, 'lastCall'>) =>
    [label, `${s.calls}`, `${s.emails}`, `${s.callbacks}`, `${s.meetings}`, `${s.bills}`];
  const compareRows = [compareRow('This shift', shift.totals), compareRow(weekLabel, week.totals)];

  const shiftRange = periodRange('shift', day);
  const bigWins = leads.flatMap(l => {
    const wins: string[] = [];
    if (l.meeting_scheduled && l.meeting_scheduled_at && inRange(shiftDayOf(l.meeting_scheduled_at), shiftRange)) wins.push('meeting booked');
    if (l.bill_received && l.bill_received_at && inRange(shiftDayOf(l.bill_received_at), shiftRange)) wins.push('utility bill received');
    return wins.length ? [`${l.account_name}: ${wins.join(' + ')} (${names.get(l.last_caller_id || '') || 'caller'})`] : [];
  });

  const contacted = leads.filter(l => l.last_worked_at).length;
  const emailsOnFile = leads.filter(l => l.email).length;
  const callbacksScheduled = leads.filter(l => l.status === 'callback_pending').length;
  const progressLine = `${contacted.toLocaleString()} of ${leads.length.toLocaleString()} hotels contacted (${pct(contacted, leads.length)}) · ${emailsOnFile} emails on file · ${callbacksScheduled} callbacks scheduled`;

  const text = [
    title,
    header,
    '',
    textTable(resultHead, resultRows),
    '',
    textTable(compareHead, compareRows),
    ...(bigWins.length ? ['', 'Big wins', ...bigWins.map(l => `• ${l}`)] : []),
    '',
    `List progress: ${progressLine}`,
  ].join('\n');

  const html = [
    `<p><b>${esc(title)}</b><br>${esc(header)}</p>`,
    htmlTable(resultHead, resultRows, true),
    '<br>',
    htmlTable(compareHead, compareRows),
    bigWins.length ? `<p><b>Big wins</b></p><ul>${bigWins.map(l => `<li>${esc(l)}</li>`).join('')}</ul>` : '',
    `<p><b>List progress:</b> ${esc(progressLine)}</p>`,
  ].join('');

  return { text, html, inProgress };
}

export async function copyReport(report: { text: string; html: string }) {
  try {
    if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([report.html], { type: 'text/html' }),
          'text/plain': new Blob([report.text], { type: 'text/plain' }),
        }),
      ]);
      return true;
    }
    await navigator.clipboard.writeText(report.text);
    return true;
  } catch {
    return false;
  }
}
