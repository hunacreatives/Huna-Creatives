// Sends a client the link to their project questionnaire.
import { esc, hunaEmail, p, S } from '../_shared/emailLayout.ts';

export function questionnaireEmail(o: { clientName: string; serviceType: string; introMessage?: string | null; questionCount?: number | string | null; formUrl: string; shared: boolean }): string {
  return hunaEmail({
    title: `Your ${o.serviceType} questionnaire from Huna Creatives`,
    body: [
      p(`Hi ${esc(o.clientName)},`),
      o.introMessage
        ? `<p style="${S.p};white-space:pre-wrap">${esc(o.introMessage)}</p>`
        : p(`Thank you for reaching out to Huna Creatives. To help us give you the best proposal for your <strong>${esc(o.serviceType)}</strong> project, we’d like to learn more about your needs.`),
      p(`We’ve put together a short questionnaire (${esc(o.questionCount || 'a few')} questions). It takes about 5 minutes to fill out.`),
      o.shared ? p('This link is shared with everyone cc’d. Once one person submits, it’s locked and the rest can only view the submitted answers.', { small: true, muted: true }) : '',
    ].join(''),
    buttons: [{ label: 'Fill out your questionnaire', url: o.formUrl }],
    note: 'This email is not monitored. For concerns, email contact@hunacreatives.com.',
  });
}
