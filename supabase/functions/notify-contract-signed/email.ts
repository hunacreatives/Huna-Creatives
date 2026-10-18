// Emails when a contract is signed: the team alert and the signed copy for the signer.
import { details, esc, hunaEmail, link, p, TEAM_NOTE } from '../_shared/emailLayout.ts';

export interface Signed {
  title: string;
  clientName: string;
  signerName: string;
  signedAt: string;
  clientEmail?: string | null;
  contractUrl: string;
}

export function teamSignedEmail(s: Signed): string {
  return hunaEmail({
    title: `Contract signed — ${s.title}`,
    heading: 'Contract signed',
    body: [
      p(`<strong>${esc(s.title)}</strong>`),
      details([
        ['Client', esc(s.clientName)],
        ['Signed as', esc(s.signerName)],
        ['Date', esc(s.signedAt)],
        ['Email', s.clientEmail && link(`mailto:${esc(s.clientEmail)}`, esc(s.clientEmail))],
      ]),
    ].join(''),
    buttons: [{ label: 'View signed contract', url: s.contractUrl }],
    note: TEAM_NOTE,
  });
}

export function signedCopyEmail(s: Signed & { firstName: string; pdfAttached: boolean }): string {
  return hunaEmail({
    title: `Your signed contract — ${s.title}`,
    body: [
      p(`Hi ${esc(s.firstName)},`),
      p(`Thank you for signing your contract with Huna Creatives. ${s.pdfAttached ? 'Your signed copy is attached to this email as a PDF.' : 'You can view your signed contract using the button below.'}`),
      details([['Contract', `<strong>${esc(s.title)}</strong>`], ['Signed by', esc(s.signerName)], ['Date', esc(s.signedAt)]]),
      p('We’ll be in touch soon with next steps.'),
    ].join(''),
    buttons: [{ label: 'View signed contract', url: s.contractUrl }],
    note: 'Questions? Reply to this email or reach us at contact@hunacreatives.com.',
  });
}
