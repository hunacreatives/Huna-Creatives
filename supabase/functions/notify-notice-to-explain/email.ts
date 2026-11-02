// Notice to Explain emails: the written notice, and HR's written decision.
// These are the employee's record of the process, so both go out by email.
import { details, esc, hunaEmail, p, quote } from '../_shared/emailLayout.ts';
import { EMPLOYEE_NOTE, PAYOUTS_URL } from '../_shared/employeeEmails.ts';

export interface Incident { date: string; hours: number }

export const DECISION_LABELS: Record<string, string> = {
  no_action: 'Explanation accepted, no action',
  warning: 'Written warning',
  final_warning: 'Final written warning',
  suspension: 'Suspension',
  dismissal: 'Dismissal',
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-10-23" → "Fri, Oct 23" */
export function fmtDay(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  return `${DAYS[d.getUTCDay()]}, ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

function fmtHours(h: number): string {
  const total = Math.round(h * 60);
  const m = total % 60;
  return m === 0 ? `${Math.floor(total / 60)}h` : `${Math.floor(total / 60)}h ${m}m`;
}

const incidentRows = (incidents: Incident[]): Array<[string, string]> =>
  incidents.map((i) => [fmtDay(i.date), i.hours > 0 ? `${fmtHours(i.hours)} logged` : 'No hours logged']);

export function noticeSentEmail(o: { firstName: string; periodLabel: string; incidents: Incident[]; details: string; replyBy: string }): string {
  return hunaEmail({
    title: `Notice to explain — ${o.periodLabel}`,
    heading: 'Notice to explain',
    body: [
      p(`Hi ${esc(o.firstName)}, this is a written notice asking you to explain the following from your <strong>${esc(o.periodLabel)}</strong> pay period.`),
      details(incidentRows(o.incidents)),
      quote(o.details),
      p(`Please reply in writing in Sentro by <strong>${esc(fmtDay(o.replyBy))}</strong>. You can also ask HR for a meeting. If no reply is received by then, HR will decide based on the records on file.`),
      p('This notice does not hold your pay. Hours you worked this period are paid on the normal schedule.', { muted: true, small: true }),
    ].join(''),
    buttons: [{ label: 'Reply in Sentro', url: PAYOUTS_URL }],
    note: EMPLOYEE_NOTE,
  });
}

export function noticeDecidedEmail(o: { firstName: string; periodLabel: string; incidents: Incident[]; decision: string; note: string | null; replied: boolean }): string {
  return hunaEmail({
    title: `Decision on your notice to explain — ${o.periodLabel}`,
    heading: 'Decision on your notice to explain',
    body: [
      p(o.replied
        ? `Hi ${esc(o.firstName)}, HR reviewed your reply to the notice to explain for your <strong>${esc(o.periodLabel)}</strong> pay period.`
        : `Hi ${esc(o.firstName)}, no reply was received to the notice to explain for your <strong>${esc(o.periodLabel)}</strong> pay period, so HR decided based on the records on file.`),
      details([['Decision', `<strong>${esc(DECISION_LABELS[o.decision] ?? o.decision)}</strong>`], ...incidentRows(o.incidents)]),
      o.note ? quote(o.note) : '',
    ].join(''),
    buttons: [{ label: 'View in Sentro', url: PAYOUTS_URL }],
    note: EMPLOYEE_NOTE,
  });
}
