// The receipt a client gets after submitting their kickoff questionnaire.
import { esc, hunaEmail, p } from '../_shared/emailLayout.ts';

export function kickoffReceivedEmail(firstName: string): string {
  return hunaEmail({
    title: 'Kickoff details received',
    heading: `Thank you, ${esc(firstName)}.`,
    body: [
      p('We’ve got your kickoff details. Your project manager will be in touch shortly to get things moving.'),
      p('Left something out? Just reply to this email.', { muted: true }),
    ].join(''),
    note: 'You’re receiving this because you submitted a kickoff form to Huna Creatives.',
  });
}
