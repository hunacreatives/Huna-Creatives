// Emails sent when someone fills in the contact form on hunacreatives.com.
import { details, esc, hunaEmail, HUB_URL, label, link, p, quote, TEAM_NOTE } from '../_shared/emailLayout.ts';

const firstName = (name: string) => String(name).trim().split(/\s+/)[0] || 'there';

/** Thanks the person who filled in the form. Links to our work and socials live in the footer. */
export function ackEmail(name: string, service: string | null, _subject: string | null, message: string): string {
  const excerpt = message.length > 400 ? message.slice(0, 400).trimEnd() + '…' : message;
  return hunaEmail({
    title: 'We received your message',
    body: [
      p(`Hi ${esc(firstName(name))},`),
      p(`Thanks for getting in touch. We received your message${service ? ` about ${esc(service)}` : ''}:`),
      quote(excerpt),
      p('We’ll get back to you within 24 hours. If you asked about a project, that reply comes with a custom quote, or a few questions so we can put one together. No hidden fees.'),
      p('If you want to add anything, just reply to this email.'),
      p('Huna Creatives'),
    ].join(''),
    note: 'You’re receiving this because you contacted Huna Creatives through hunacreatives.com.',
  });
}

export function ackText(name: string, service: string | null, message: string): string {
  return [
    `Hi ${firstName(name)},`, '',
    `Thanks for getting in touch. We received your message${service ? ` about ${service}` : ''}.`, '',
    'We’ll get back to you within 24 hours. If you asked about a project, that reply comes with a custom quote, or a few questions so we can put one together. No hidden fees.', '',
    'If you want to add anything, just reply to this email.', '',
    'Huna Creatives', '',
    '---', 'Your message:', message,
  ].join('\n');
}

export interface InquiryForTeam {
  name: string;
  email: string;
  service?: string | null;
  subject?: string | null;
  budget?: string | null;
  sourceLine?: string | null;
  message: string;
}

/** Tells the team a new inquiry came in. */
export function teamEmail(i: InquiryForTeam): string {
  return hunaEmail({
    title: `New inquiry from ${i.name}`,
    heading: `New inquiry from ${esc(i.name)}`,
    body: [
      details([
        ['From', link(`mailto:${esc(i.email)}`, esc(i.email))],
        ['Service', i.service && esc(i.service)],
        ['Subject', i.subject && esc(i.subject)],
        ['Budget', i.budget && esc(i.budget)],
        ['Came from', i.sourceLine && esc(i.sourceLine)],
      ]),
      label('Their message'),
      quote(i.message),
      p('Submitted via hunacreatives.com. Reply to this email to answer them directly.', { muted: true, small: true }),
    ].join(''),
    buttons: [{ label: 'Open the inbox', url: `${HUB_URL}/hub/admin/contact` }],
    note: TEAM_NOTE,
  });
}
