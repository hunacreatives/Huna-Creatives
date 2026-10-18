// An HR document (e.g. certificate of employment) the employee asked for.
import { esc, hunaEmail, p } from '../_shared/emailLayout.ts';
import { EMPLOYEE_NOTE } from '../_shared/employeeEmails.ts';

export function certificateEmail(firstName: string, title: string): string {
  return hunaEmail({
    title: `Your ${title}`,
    heading: esc(title),
    body: [
      p(`Hi ${esc(firstName)}, your <strong>${esc(title)}</strong> is attached as a PDF.`),
    ].join(''),
    note: EMPLOYEE_NOTE,
  });
}
