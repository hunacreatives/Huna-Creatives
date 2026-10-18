// Emails when a client approves or declines a quotation/proposal.
import { esc, hunaEmail, HUB_URL, label, p, quote, steps, TEAM_NOTE } from '../_shared/emailLayout.ts';

export interface Decision {
  noun: 'Proposal' | 'Quotation';
  verb: string;            // approved / accepted / declined
  accepted: boolean;
  isProposal: boolean;
  clientName: string;
  title: string;
  money: string;           // formatted total, or '' for proposals
  signer: string;
  note?: string | null;
  proposalId: number | string;
}

/** Tells the team the client decided. */
export function teamDecisionEmail(d: Decision): string {
  return hunaEmail({
    title: `${d.noun} ${d.verb}`,
    heading: `${d.noun} ${d.verb}`,
    body: [
      p(`<strong>${esc(d.clientName)}</strong> ${d.verb} <strong>${esc(d.title)}</strong>${d.money ? ` (${esc(d.money)})` : ''}. Recorded under the name <strong>${esc(d.signer)}</strong>.`),
      d.note ? label('Their note') + quote(d.note) : '',
      d.accepted ? p(`Next step: send the agreement${d.isProposal ? ' and the detailed quotation' : ', then the deposit invoice'}.`) : '',
    ].join(''),
    buttons: [{ label: 'Open in the hub', url: `${HUB_URL}/hub/admin/proposals/${d.proposalId}` }],
    note: TEAM_NOTE,
  });
}

/** Next steps for the client after they approve. */
export function nextStepsEmail(o: { firstName: string; title: string; noun: string; pdfAttached: boolean; intakeUrl: string }): string {
  return hunaEmail({
    title: `${o.noun} approved — next steps`,
    heading: `Thank you, ${esc(o.firstName)}.`,
    body: [
      p(`We’ve recorded your approval of <strong>${esc(o.title)}</strong>${o.pdfAttached ? '. A copy is attached for your records' : ''}. Here’s how we get moving:`),
      steps([
        ['Project kickoff form', 'A few project details so we can set everything up on our side.'],
        ['Agreement &amp; invoice', 'We’ll send these separately: the agreement to sign, and the deposit invoice.'],
        ['We begin', 'Once the kickoff form is in and the deposit is settled, your project manager gets in touch and work starts.'],
      ]),
      o.intakeUrl ? '' : p('We’ll send your kickoff form through shortly.'),
    ].join(''),
    buttons: o.intakeUrl ? [{ label: 'Open the kickoff form', url: o.intakeUrl }] : [],
    note: 'Questions in the meantime? Just reply to this email.',
  });
}
