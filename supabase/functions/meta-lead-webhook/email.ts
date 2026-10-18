// Emails for a new Meta lead-ad lead: the auto-reply to the lead and the team alert.
import { details, esc, hunaEmail, HUB_URL, link, p, TEAM_NOTE } from '../_shared/emailLayout.ts';

export interface LeadForEmail {
  name: string;
  email: string;
  phone: string;
  business: string;
  website: string;
  budget: string;
  timeline: string;
  channel: string;
  adName: string;
  submitted: string;   // already formatted, Manila time
  websiteLabel: string; // the form's label for the "current website" question
}

function howWeReach(channel: string, phone: string): string {
  switch (channel) {
    case 'Phone call': return phone ? `call you at ${phone}` : 'call you';
    case 'Viber': return phone ? `message you on Viber at ${phone}` : 'message you on Viber';
    case 'Text / SMS': return phone ? `text you at ${phone}` : 'email you';
    // A Page can't start a Messenger chat with a lead, so text them and invite them to message first.
    case 'Messenger': return phone ? `text you at ${phone}` : 'email you';
    case 'Email': return 'email you';
    default: return 'get in touch';
  }
}

export function autoReply(l: LeadForEmail): { subject: string; html: string; text: string } {
  const first = l.name.split(/\s+/)[0] || 'there';
  const reach = howWeReach(l.channel, l.phone);
  const subject = 'We received your website inquiry';
  const messenger = l.channel === 'Messenger';
  const html = hunaEmail({
    title: subject,
    body: [
      p(`Hi ${esc(first)},`),
      p('Thanks for reaching out about a website. Here is what you sent us:'),
      details([['Business', l.business && esc(l.business)], ['Budget', l.budget && esc(l.budget)], ['Timeline', l.timeline && esc(l.timeline)]]),
      p(`What happens next: we will ${esc(reach)} within one working day to ask a few questions about your business. Your fixed quote follows within 24 hours of that conversation. No hidden fees.`),
      messenger ? p(`Facebook only lets businesses reply on Messenger after you message them first. If you prefer Messenger, send us a quick hello at ${link('https://m.me/hunacreatives', 'm.me/hunacreatives')} and we will continue there.`) : '',
      p('If anything is urgent, just reply to this email.'),
      p('Huna Creatives'),
    ].join(''),
    note: 'You’re receiving this because you asked Huna Creatives about a website through our Facebook or Instagram ad.',
  });
  const text = [
    `Hi ${first},`, '',
    'Thanks for reaching out about a website. Here is what you sent us:',
    `Business: ${l.business} · Budget: ${l.budget} · Timeline: ${l.timeline}`, '',
    `What happens next: we will ${reach} within one working day to ask a few questions about your business. Your fixed quote follows within 24 hours of that conversation. No hidden fees.`, '',
    ...(messenger ? ['Facebook only lets businesses reply on Messenger after you message them first. If you prefer Messenger, send us a quick hello at m.me/hunacreatives and we will continue there.', ''] : []),
    'If anything is urgent, just reply to this email.', '',
    'Huna Creatives',
  ].join('\n');
  return { subject, html, text };
}

/** Tells the team a lead came in and whether the auto-reply went out. */
export function teamLeadEmail(l: LeadForEmail, title: string, replyNote: string): string {
  return hunaEmail({
    title,
    heading: `New Meta lead: ${esc(l.name)}`,
    body: [
      p(`<strong>${esc(l.name)}</strong> wants to be reached by <strong>${esc(l.channel || 'any channel')}</strong>. Reply within the hour if you can.`),
      l.channel === 'Messenger'
        ? p('You can’t start a Messenger chat with a lead. Text or Viber their number (the auto-reply told them to expect a text, and invited them to message the Page first).', { muted: true, small: true })
        : '',
      details([
        ['Business', l.business && esc(l.business)], [l.websiteLabel, l.website && esc(l.website)], ['Budget', l.budget && esc(l.budget)],
        ['Timeline', l.timeline && esc(l.timeline)], ['Phone', l.phone && esc(l.phone)],
        ['Email', l.email && esc(l.email)], ['Ad', l.adName && esc(l.adName)], ['Submitted', esc(l.submitted)],
      ]),
      p(`${esc(replyNote)} Saved to the Hub contact inbox.`, { muted: true, small: true }),
    ].join(''),
    buttons: [{ label: 'Open the inbox', url: `${HUB_URL}/hub/admin/contact` }],
    note: TEAM_NOTE,
  });
}
