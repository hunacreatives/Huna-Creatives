// A document sent to an employee for signature.
import { details, esc, hunaEmail, p } from '../_shared/emailLayout.ts';
import { EMPLOYEE_NOTE } from '../_shared/employeeEmails.ts';

export function signRequestEmail(o: { firstName: string; title: string; url: string }): string {
  return hunaEmail({
    title: `Please sign: ${o.title}`,
    heading: 'A document needs your signature',
    body: [
      p(`Hi ${esc(o.firstName)}, a document has been sent to you for signature. Sign in with your Huna hub account and you’ll go straight to it under <strong>Documents → To Sign</strong>.`),
      details([['Document', `<strong>${esc(o.title)}</strong>`]]),
    ].join(''),
    buttons: [{ label: 'Sign document', url: o.url }],
    note: EMPLOYEE_NOTE,
  });
}
