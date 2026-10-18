// The email that sends a client the link to their proposal page.
import { esc, hunaEmail, p } from '../_shared/emailLayout.ts';

export function proposalEmail(o: { name: string; projectTitle?: string | null; url: string; subject: string; thankYouContext?: string | null }): string {
  return hunaEmail({
    title: o.subject,
    body: [
      p(`Hi ${esc(o.name)},`),
      p(o.thankYouContext ? `Thank you for ${esc(o.thankYouContext)}.` : 'Thank you for your time.'),
      p(`Here is the proposal${o.projectTitle ? ` for <strong>${esc(o.projectTitle)}</strong>` : ''} we put together for you.`),
      p('Once you’ve had a look, the next step is to approve the proposal inside. If you have any questions before then, just reply to this email and we’ll clarify.'),
      p('Warm regards,<br>The Huna Creatives Team'),
    ].join(''),
    buttons: [{ label: 'View proposal', url: esc(o.url) }],
    note: 'You’re receiving this because Huna Creatives prepared a proposal for you.',
  });
}
