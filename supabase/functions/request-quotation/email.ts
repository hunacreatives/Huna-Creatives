// Tells the team a prospect clicked "Request a quotation" in our reply.
import { details, esc, hunaEmail, HUB_URL, label, link, p, quote, TEAM_NOTE } from '../_shared/emailLayout.ts';

export interface QuoteRequest {
  name: string;
  email: string;
  service?: string | null;
  subject?: string | null;
  message?: string | null;
  status?: string | null;
  enquirySent: string; // formatted
  quoteAsked: string;  // formatted
}

export function quoteRequestedEmail(r: QuoteRequest): string {
  return hunaEmail({
    title: `Quotation requested - ${r.name}`,
    heading: `${esc(r.name)} wants a quote`,
    body: [
      p('They clicked <strong>Request a quotation</strong> in the reply we sent. Draft one from their enquiry in the hub.'),
      details([
        ['Email', link(`mailto:${esc(r.email)}`, esc(r.email))],
        ['Service', r.service && esc(r.service)],
        ['Subject', r.subject && esc(r.subject)],
        ['Enquiry sent', esc(r.enquirySent)],
        ['Quote asked', esc(r.quoteAsked)],
        ['Status', esc(r.status ?? 'new')],
      ]),
      label('Their message'),
      quote(r.message ?? ''),
    ].join(''),
    buttons: [{ label: 'Open the inbox', url: `${HUB_URL}/hub/admin/contact` }],
    note: TEAM_NOTE,
  });
}
