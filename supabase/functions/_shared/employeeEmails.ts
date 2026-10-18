// Pieces shared by the employee emails: the Sentro invite (invite-employee and
// resend-invite both send it) and the payslip tracker (received → approved → paid).
import { esc, hunaEmail, iconTiles, label, p, tracker, type StageState } from './emailLayout.ts';

export const PAYOUTS_URL = 'https://www.hunacreatives.com/hub/contractor/payouts';

/** Employees can't reply to these addresses; HR answers on Slack. */
export const EMPLOYEE_NOTE = 'This inbox isn’t monitored. Questions? Message HR on Slack.';

export type PayslipStage = 'received' | 'approved' | 'paid';

/** Submitted → HR approved → Paid, with the stage this email is about highlighted. */
export function payslipTracker(stage: PayslipStage, subs: Partial<Record<'submitted' | 'approved' | 'paid', string>> = {}): string {
  const order: PayslipStage[] = ['received', 'approved', 'paid'];
  const at = order.indexOf(stage);
  // "received" means it's with HR now; the other two mean that step is done.
  const state = (i: number): StageState => (stage === 'received'
    ? (i === 0 ? 'done' : i === 1 ? 'current' : 'todo')
    : i <= at ? 'done' : i === at + 1 ? 'current' : 'todo');
  return tracker([
    { label: 'Submitted', state: state(0), sub: subs.submitted },
    { label: 'HR approved', state: state(1), sub: subs.approved },
    { label: 'Paid', state: state(2), sub: subs.paid },
  ]);
}

/** The Sentro invite, or a password reset when the account already exists. */
export function inviteEmail(o: { firstName: string; url: string; kind: 'welcome' | 'fresh-link' | 'reset' }): string {
  const name = esc(o.firstName);
  if (o.kind === 'reset') {
    return hunaEmail({
      title: 'Reset your Sentro password',
      heading: 'Reset your password',
      body: [
        p(`Hi ${name}, someone requested a password reset for your Sentro account. Tap below to set a new password.`),
        p('This link expires in 24 hours. If you didn’t ask for this, you can ignore this&nbsp;email.', { small: true, muted: true }),
      ].join(''),
      buttons: [{ label: 'Reset my password', url: o.url }],
      note: EMPLOYEE_NOTE,
    });
  }
  return hunaEmail({
    title: 'Welcome to Sentro',
    heading: o.kind === 'welcome' ? `Welcome to Huna, ${name}.` : `Your Sentro invite, ${name}`,
    body: [
      p(o.kind === 'welcome'
        ? 'Your profile is set up. Create your password to get into Sentro, where your work at Huna Creatives lives.'
        : 'Here’s a fresh invite link to your Sentro account. Set your password to get started.'),
      label('Your first steps'),
      tracker([
        { label: 'Set your password', state: 'current', sub: 'Today' },
        { label: 'Sign your contract', state: 'todo', sub: 'In Sentro' },
        { label: 'Clock in', state: 'todo', sub: 'On Slack' },
        { label: 'Get paid', state: 'todo', sub: 'Twice a month' },
      ]),
      label('What’s inside Sentro'),
      iconTiles([
        { icon: 'attendance', title: 'Attendance', text: 'Clock in and out through Slack' },
        { icon: 'payslips', title: 'Payslips', text: 'Your payslips and payouts' },
        { icon: 'sops', title: 'SOPs', text: 'Guides and team announcements' },
        { icon: 'documents', title: 'Documents', text: 'Your contract and HR documents' },
      ]),
      p('This link expires in 24 hours. If you didn’t expect this email, you can ignore&nbsp;it.', { small: true, muted: true }),
    ].join(''),
    buttons: [{ label: 'Set my password', url: o.url }],
    note: 'Questions? Ask your admin, or message HR on Slack.',
  });
}
