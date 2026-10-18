// The employee's copy of a document they signed.
import { details, esc, hunaEmail, link, p } from '../_shared/emailLayout.ts';
import { EMPLOYEE_NOTE } from '../_shared/employeeEmails.ts';

export function signedCopyEmail(o: { firstName: string; title: string; signedName: string; date: string; pdfAttached: boolean; contractLink?: string | null }): string {
  return hunaEmail({
    title: `Your signed copy — ${o.title}`,
    heading: 'Signed and on file',
    body: [
      p(`Hi ${esc(o.firstName)}, this confirms you signed the document below.`),
      details([['Document', `<strong>${esc(o.title)}</strong>`], ['Signed as', esc(o.signedName)], ['Date', esc(o.date)]]),
      p(o.pdfAttached
        ? 'Your signed copy is attached as a PDF.'
        : o.contractLink
          ? `You can view the original document ${link(esc(o.contractLink), 'here')}.`
          : 'Keep this email for your records.'),
    ].join(''),
    note: EMPLOYEE_NOTE,
  });
}
