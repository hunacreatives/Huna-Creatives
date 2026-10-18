// Renders every Huna email with sample data into one gallery page, to review the
// designs before they go live:
//
//   npx tsx scripts/email-previews.ts [out-dir]     (default: ./email-previews, git-ignored)
//
// Images are copied next to the gallery so it opens straight from disk. When you
// add an email, add a sample here too.
import { copyFileSync, cpSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { renderLetter, hunaEmail } from '../supabase/functions/_shared/emailLayout.ts';
import { ackEmail, teamEmail as inquiryTeamEmail } from '../supabase/functions/submit-contact/email.ts';
import { autoReply, teamLeadEmail, type LeadForEmail } from '../supabase/functions/meta-lead-webhook/email.ts';
import { quoteRequestedEmail } from '../supabase/functions/request-quotation/email.ts';
import { quotationEmail } from '../supabase/functions/send-quotation/email.ts';
import { nextStepsEmail, teamDecisionEmail } from '../supabase/functions/accept-quotation/email.ts';
import { proposalEmail } from '../supabase/functions/send-proposal/email.ts';
import { proposalConfirmedEmail } from '../supabase/functions/confirm-proposal/email.ts';
import { contractReadyEmail } from '../supabase/functions/send-client-contract/email.ts';
import { signedCopyEmail, teamSignedEmail } from '../supabase/functions/notify-contract-signed/email.ts';
import { invoiceEmail } from '../supabase/functions/send-invoice/email.ts';
import { reminderEmail } from '../supabase/functions/send-payment-reminder/email.ts';
import { receiptEmail } from '../supabase/functions/send-payment-receipt/email.ts';
import { questionnaireEmail } from '../supabase/functions/send-questionnaire/email.ts';
import { kickoffReceivedEmail } from '../supabase/functions/public-questionnaire/email.ts';
import { applicantEmail } from '../supabase/functions/notify-applicant-status/email.ts';
import type { QuoteRecord } from '../supabase/functions/_shared/quotationTemplate.ts';
import { inviteEmail } from '../supabase/functions/_shared/employeeEmails.ts';
import { payslipEmail } from '../supabase/functions/send-payslip/email.ts';
import { teamPayslipEmail } from '../supabase/functions/notify-payslip-submitted/email.ts';
import { disputeResolvedEmail } from '../supabase/functions/notify-contractor/email.ts';
import { projectPayoutEmail } from '../supabase/functions/notify-contractor-payment/email.ts';
import { signRequestEmail } from '../supabase/functions/notify-contract-assigned/email.ts';
import { signedCopyEmail as employeeSignedCopy } from '../supabase/functions/send-signed-contract/email.ts';
import { certificateEmail } from '../supabase/functions/send-hr-certificate/email.ts';

const peso = (n: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(n);

const lead: LeadForEmail = {
  name: 'Tobey Emm', email: 'tobey@example.com', phone: '0917 555 0123', business: 'Yoga studio',
  website: 'Instagram only', budget: '₱100K – ₱150K', timeline: '1 - 3 months', channel: 'Viber',
  adName: 'h_booking_asana_image', submitted: 'Sat, Oct 18, 7:35 AM', websiteLabel: 'Current website',
};

const quote: QuoteRecord = {
  slug: 'yoga-retreats-el-nido', client_name: 'Tobey Emm', project_title: 'Booking website',
  tagline: 'Classes, retreats and payments in one place', accent_color: '#ef6323',
  sections: [
    { heading: 'Scope', body: 'A custom website with a live class schedule, online booking and online payments.\n\nAn admin dashboard to manage classes, prices and content.' },
  ],
  line_items: [
    { description: 'Design and build', qty: 1, unit_price: 85000, notes: 'Custom design, 8 pages, phone-first' },
    { description: 'Booking and payments', qty: 1, unit_price: 25000 },
    { description: 'SMS confirmations', qty: 1, unit_price: 6000, optional: true },
  ],
  currency: 'PHP', discount: 10000, tax_rate: 0, valid_until: '2026-11-30',
  terms: '50% deposit to start, 50% on launch.',
  payment_schedule: [{ label: 'Deposit', amount: 50000, due: 'On signing' }, { label: 'Balance', amount: 50000, due: 'On launch' }],
};

const emails: Array<{ group: string; name: string; html: string }> = [
  // Clients and leads
  { group: 'Clients', name: 'Contact reply (composer)', html: hunaEmail({
    title: 'Re: Your inquiry', body: renderLetter('Hi Tobey,\n\nThanks for reaching out.\n\n## Design and build\n- A fully custom design built around your brand\n- Built for phones first\n\n## Rates\nBooking websites start at **₱100,000**.\n\nBest,\nFrancis\nHuna Creatives'),
    buttons: [{ label: 'Schedule a meeting', url: '#' }, { label: 'Request a quotation', url: '#', tone: 'secondary' }],
    note: 'You’re receiving this because you contacted Huna Creatives. Reply to this email to reach us.' }) },
  { group: 'Clients', name: 'Contact form: thank-you', html: ackEmail('Tobey Emm', 'Website Design', 'Booking website', 'Hello,\n\nI saw a website you made, Asana Ormoc. I have a yoga business in El Nido.') },
  { group: 'Clients', name: 'Meta lead: auto-reply', html: autoReply(lead).html },
  { group: 'Clients', name: 'Quotation', html: quotationEmail({ quote, isProposal: false, intro: 'Here is the quotation we discussed on our call.', quoteUrl: 'https://www.hunacreatives.com/p/yoga-retreats-el-nido', acceptUrl: '#' }) },
  { group: 'Clients', name: 'Proposal (via quotation tool)', html: quotationEmail({ quote, isProposal: true, quoteUrl: '#', acceptUrl: '#' }) },
  { group: 'Clients', name: 'Approved: next steps', html: nextStepsEmail({ firstName: 'Tobey', title: 'Booking website', noun: 'Quotation', pdfAttached: true, intakeUrl: '#' }) },
  { group: 'Clients', name: 'Proposal link', html: proposalEmail({ name: 'Tobey', projectTitle: 'Booking website', url: 'https://hunacreatives.com/p/yoga', subject: 'A proposal from Huna Creatives', thankYouContext: 'the call on Thursday' }) },
  { group: 'Clients', name: 'Contract ready to sign', html: contractReadyEmail({ firstName: 'Tobey', subject: 'Your contract is ready', contractTitle: 'Service Agreement — Booking website', projectName: 'Yoga Retreats El Nido', contractUrl: '#' }) },
  { group: 'Clients', name: 'Signed contract copy', html: signedCopyEmail({ title: 'Service Agreement — Booking website', clientName: 'Tobey Emm', signerName: 'Tobey Emm', signedAt: 'October 20, 2026', contractUrl: '#', firstName: 'Tobey', pdfAttached: true }) },
  { group: 'Clients', name: 'Invoice', html: invoiceEmail({
    invoiceNo: '0042', billedTo: 'Yoga Retreats El Nido', toLine: 'tobey@example.com', billToAddress: 'El Nido, Palawan',
    projectName: 'Booking website', service: 'Website Design', startDate: 'Oct 20, 2026', issueDate: 'October 20, 2026', dueDate: 'October 27, 2026',
    lineItems: [{ description: 'Deposit (50%)', amount: '50000' }], payments: [], subtotal: peso(50000), totalPaid: peso(0), showPaidRow: false,
    amountDue: peso(50000), isPaid: false, message: 'Thanks for signing. Here is the deposit invoice.', notes: null, payUrl: '#', fmt: peso }) },
  { group: 'Clients', name: 'Payment reminder', html: reminderEmail({ clientName: 'Tobey', projectName: 'Booking website', amountDue: peso(50000), dueDate: 'November 30, 2026', paidToDate: `${peso(50000)} of ${peso(100000)}`, payUrl: '#' }) },
  { group: 'Clients', name: 'Payment receipt', html: receiptEmail({ clientName: 'Tobey', projectName: 'Booking website', amount: peso(50000), date: 'October 22, 2026', ref: '0042', totalPaid: peso(50000), balance: peso(50000), isPaid: false }) },
  { group: 'Clients', name: 'Questionnaire', html: questionnaireEmail({ clientName: 'Tobey', serviceType: 'Website Design', questionCount: 12, formUrl: 'https://www.hunacreatives.com/q/abc123', shared: false }) },
  { group: 'Clients', name: 'Kickoff form received', html: kickoffReceivedEmail('Tobey') },
  { group: 'Clients', name: 'Applicant: reviewing', html: applicantEmail('reviewing', 'Ana Cruz', 'Graphic Designer').html },
  { group: 'Clients', name: 'Applicant: shortlisted', html: applicantEmail('shortlisted', 'Ana Cruz', 'Graphic Designer', { date: '2026-10-24', time: '14:00', link: 'https://meet.google.com/abc-defg-hij' }).html },
  { group: 'Clients', name: 'Applicant: not moving forward', html: applicantEmail('archived', 'Ana Cruz', 'Graphic Designer').html },

  // Employees
  { group: 'Employees', name: 'Welcome invite', html: inviteEmail({ firstName: 'Ana', url: '#', kind: 'welcome' }) },
  { group: 'Employees', name: 'Fresh invite link', html: inviteEmail({ firstName: 'Ana', url: '#', kind: 'fresh-link' }) },
  { group: 'Employees', name: 'Password reset', html: inviteEmail({ firstName: 'Ana', url: '#', kind: 'reset' }) },
  { group: 'Employees', name: 'Payment sent (payslip)', html: payslipEmail({
    firstName: 'Ana', periodLabel: 'October 1–15, 2026', issuedLabel: 'Oct 17, 2026', payslipNo: 'INV-20261001-7F3A',
    department: 'Design', contractType: 'Hourly', rateLabel: '₱180/hr', total: 18240, basePay: 15840,
    basePayDesc: '88.00 hours × ₱180/hr', overtimePay: 1800, overtimeHours: 8, daysWorked: 11, hoursBilled: 88,
    adjustments: [{ label: 'Internet allowance', amount: 1000, type: 'allowance' }, { label: 'Cash advance', amount: -400, type: 'deduction' }],
    days: ['2026-10-01','2026-10-02','2026-10-05','2026-10-06','2026-10-07','2026-10-08','2026-10-09','2026-10-12','2026-10-13','2026-10-14','2026-10-15']
      .map((date, i) => ({ date, hours: [8, 8, 7.5, 8, 8, 8, 6.5, 8, 8, 8, 8][i], overtime: [0, 0, 0, 2, 0, 0, 0, 3, 0, 0, 3][i] })),
    pdfAttached: true, hourly: true, fmt: peso }) },
  { group: 'Employees', name: 'Payslip flag resolved', html: disputeResolvedEmail({ firstName: 'Ana', periodLabel: 'October 1–15, 2026', amount: peso(18240) }) },
  { group: 'Employees', name: 'Project payout', html: projectPayoutEmail({ name: 'Ana', projectName: 'Kei Coffee House rebrand', clientName: 'Kei Concepts', amount: peso(6000), date: 'October 17, 2026', totalCut: 15000, totalPaid: 9000, isFullyPaid: false, receiptUrl: '#', fmt: peso }) },
  { group: 'Employees', name: 'Document to sign', html: signRequestEmail({ firstName: 'Ana', title: 'Employment Agreement 2026', url: '#' }) },
  { group: 'Employees', name: 'Signed copy', html: employeeSignedCopy({ firstName: 'Ana', title: 'Employment Agreement 2026', signedName: 'Ana Cruz', date: 'October 17, 2026', pdfAttached: true }) },
  { group: 'Employees', name: 'HR certificate', html: certificateEmail('Ana', 'Certificate of Employment') },

  // Team only
  { group: 'Team', name: 'Payslip submitted', html: teamPayslipEmail({ name: 'Ana Cruz', department: 'Design', periodLabel: 'October 1–15, 2026', amount: peso(18240), reviewUrl: '#' }) },
  { group: 'Team', name: 'New inquiry', html: inquiryTeamEmail({ name: 'Tobey Emm', email: 'tobey@example.com', service: 'Website Design', budget: '₱100K – ₱150K', sourceLine: 'google → /services', message: 'Hello, I saw a website you made, Asana Ormoc.' }) },
  { group: 'Team', name: 'New Meta lead', html: teamLeadEmail(lead, 'New Meta lead: Tobey Emm', 'Auto-reply sent.') },
  { group: 'Team', name: 'Quotation requested', html: quoteRequestedEmail({ name: 'Tobey Emm', email: 'tobey@example.com', service: 'Website Design', message: 'Hello, I saw a website you made.', enquirySent: 'Oct 18, 7:35 AM (Manila)', quoteAsked: 'Oct 18, 9:10 AM (Manila)' }) },
  { group: 'Team', name: 'Quotation accepted', html: teamDecisionEmail({ noun: 'Quotation', verb: 'accepted', accepted: true, isProposal: false, clientName: 'Tobey Emm', title: 'Booking website', money: peso(100000), signer: 'Tobey Emm', note: 'Looking forward to it.', proposalId: 12 }) },
  { group: 'Team', name: 'Proposal confirmed', html: proposalConfirmedEmail('Adrian Manuel Tan', 'Capu Coffee Brand Elevation') },
  { group: 'Team', name: 'Contract signed', html: teamSignedEmail({ title: 'Service Agreement — Booking website', clientName: 'Tobey Emm', signerName: 'Tobey Emm', signedAt: 'October 20, 2026', clientEmail: 'tobey@example.com', contractUrl: '#' }) },
];

const root = resolve(import.meta.dirname, '..');
const out = resolve(process.argv[2] ?? join(root, 'email-previews'));
mkdirSync(join(out, 'emails'), { recursive: true });
mkdirSync(join(out, 'images', 'email'), { recursive: true });

// Images the emails load from hunacreatives.com, copied locally so the gallery works offline.
const images = join(root, 'public', 'images');
cpSync(join(images, 'email'), join(out, 'images', 'email'), { recursive: true });
for (const f of ['547b59870e776a20eb28e4f20931787c.png', 'qr-gcash.jpg', 'qr-bdo.jpg', 'qr-gotyme.jpg']) {
  try { copyFileSync(join(images, f), join(out, 'images', f)); } catch { /* optional */ }
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
for (const e of emails) {
  const local = e.html.replace(/https:\/\/(www\.)?hunacreatives\.com\/images\//g, '../images/');
  writeFileSync(join(out, 'emails', `${slug(e.group)}-${slug(e.name)}.html`), local);
}

const card = (e: (typeof emails)[number]) => `<figure><figcaption>${e.name}</figcaption>
  <iframe src="emails/${slug(e.group)}-${slug(e.name)}.html" loading="lazy" onload="this.style.height=this.contentDocument.documentElement.scrollHeight+'px'"></iframe></figure>`;

writeFileSync(join(out, 'index.html'), `<!doctype html><html><head><meta charset="utf-8"><title>Huna emails</title>
<style>
  body{margin:0;padding:24px;background:#e8e6e4;font-family:-apple-system,'Segoe UI',sans-serif;color:#140f0b}
  h1{font-size:20px;margin:0 0 4px} h2{font-size:15px;margin:32px 0 12px} p{margin:0;color:#6f6a66;font-size:13px}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(620px,1fr));gap:20px}
  figure{margin:0} figcaption{font-size:13px;font-weight:600;margin:0 0 6px}
  iframe{width:100%;height:900px;border:0;border-radius:12px;background:#f1f0ef}
</style></head><body>
<h1>Huna emails</h1><p>${emails.length} emails, rendered with sample data.</p>
${['Clients', 'Employees', 'Team'].map((g) => `<h2>${g === 'Team' ? 'Team only' : g === 'Employees' ? 'Employees' : 'Clients, leads and applicants'}</h2><div class="grid">${emails.filter((e) => e.group === g).map(card).join('')}</div>`).join('')}
</body></html>`);

console.log(`${emails.length} emails → ${join(out, 'index.html')}`);
