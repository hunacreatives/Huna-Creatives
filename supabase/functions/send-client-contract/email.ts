// Sends a client the link to review and sign their contract.
import { details, esc, hunaEmail, p } from '../_shared/emailLayout.ts';

export function contractReadyEmail(o: { firstName: string; subject: string; contractTitle?: string | null; projectName?: string | null; contractUrl: string }): string {
  return hunaEmail({
    title: o.subject,
    body: [
      p(`Hi ${esc(o.firstName)},`),
      p('Your service agreement with Huna Creatives is ready for your review. Please take a moment to read the full document, then sign it electronically when you’re ready to proceed.'),
      details([['Contract', o.contractTitle && `<strong>${esc(o.contractTitle)}</strong>`], ['Project', o.projectName && esc(o.projectName)]]),
    ].join(''),
    buttons: [{ label: 'Review & sign contract', url: o.contractUrl }],
    note: 'Questions? Reply to this email or reach us at contact@hunacreatives.com.',
  });
}
