// Tells the team a client confirmed their proposal page.
import { esc, hunaEmail, HUB_URL, p, TEAM_NOTE } from '../_shared/emailLayout.ts';

export function proposalConfirmedEmail(clientName: string, proposalName: string): string {
  return hunaEmail({
    title: `Proposal confirmed — ${proposalName}`,
    heading: 'Proposal confirmed',
    body: [
      p(`<strong>${esc(clientName)}</strong> has confirmed the <strong>${esc(proposalName)}</strong> proposal and is ready to move forward with Stage 01.`),
      p('Send over the agreement and invoice to get things started.'),
    ].join(''),
    buttons: [{ label: 'Open the hub', url: `${HUB_URL}/hub/admin/contact` }],
    note: TEAM_NOTE,
  });
}
