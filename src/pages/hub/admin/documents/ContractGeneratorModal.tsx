import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { HubUser } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { FRANCIS_SIG, HUNA_LOGO } from './contractAssets';
import { slugify } from '@/lib/formatUtils';

interface Props {
  contractors: HubUser[];
  onClose: () => void;
  onDone: () => void;
}

const DEFAULT_TOOLS = ['Canva Pro', 'Adobe Photoshop (if required)'];

// Converts the AI's plain text (numbered ALL-CAPS headings, "•" bullets,
// prose) into the client-contract HTML the public /c/ signing page renders
// (contract-doc classes: h1.contract-title, h2 sections, hr.section-divider).
function aiTextToContractBody(docTitle: string, subtitle: string, body: string): string {
  const isHeading = (para: string) =>
    /^\d+\.\s+\S/.test(para) && !para.includes('\n') && para === para.toUpperCase() && para.length < 90;
  const sections = body
    .split(/\n\n+/)
    .map(raw => {
      const para = raw.trim();
      if (!para) return '';
      if (isHeading(para)) return `<hr class="section-divider">\n<h2>${para}</h2>`;
      const lines = para.split('\n');
      if (lines.every(l => l.trim().startsWith('•'))) {
        return `<ul>${lines.map(l => `<li>${l.trim().replace(/^•\s*/, '')}</li>`).join('\n')}</ul>`;
      }
      // Mixed paragraph: intro line(s) followed by bullets
      if (lines.some(l => l.trim().startsWith('•'))) {
        const intro = lines.filter(l => !l.trim().startsWith('•')).join('<br />');
        const items = lines.filter(l => l.trim().startsWith('•')).map(l => `<li>${l.trim().replace(/^•\s*/, '')}</li>`).join('\n');
        return `${intro ? `<p>${intro}</p>` : ''}<ul>${items}</ul>`;
      }
      return `<p>${para.replace(/\n/g, '<br />')}</p>`;
    })
    .filter(Boolean)
    .join('\n');
  return `<h1 class="contract-title">${docTitle}</h1>\n<p class="contract-subtitle">${subtitle}</p>\n${sections}`;
}

// Preview wrapper matching the public /c/ page look: Huna letterhead, the
// contract-doc styles, and a note that the e-signature block is collected on
// the signing page (no manual-looking blank signature lines).
function clientStylePreviewHTML(bodyHtml: string, logoData: string): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #f5f5f4; font-family: Arial, Helvetica, sans-serif; }
  .page { max-width: 820px; margin: 24px auto 60px; background: #fff; box-shadow: 0 2px 20px rgba(0,0,0,0.07); border-radius: 4px; overflow: hidden; }
  .lh { padding: 24px 52px 0; }
  .lh-inner { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px; }
  .lh-contact { text-align: right; font-size: 9pt; color: #444; line-height: 1.8; }
  .accent { height: 3px; background: linear-gradient(to right, #D64F1E 40%, #e5e7eb 40%); margin-bottom: 28px; }
  .contract-doc { padding: 0 52px 48px; font-size: 10.5pt; color: #111; line-height: 1.65; }
  .contract-doc h1.contract-title { font-size: 20pt; font-weight: 800; color: #111; margin: 0 0 6pt; text-transform: uppercase; letter-spacing: 0.02em; }
  .contract-doc p.contract-subtitle { font-size: 10.5pt; font-weight: 700; margin: 0 0 14pt; color: #111; }
  .contract-doc h2 { font-size: 13pt; font-weight: 800; margin: 20pt 0 6pt; text-transform: uppercase; color: #111; }
  .contract-doc h3 { font-size: 10.5pt; font-weight: 700; margin: 12pt 0 4pt; color: #111; }
  .contract-doc p { margin: 0 0 8pt; text-align: justify; }
  .contract-doc ul { margin: 4pt 0 8pt 18pt; padding: 0; }
  .contract-doc ul li { margin-bottom: 4pt; text-align: justify; }
  .contract-doc hr.section-divider { border: none; border-top: 1px solid #d1d5db; margin: 16pt 0; }
  .contract-doc strong.highlight { color: #D64F1E; }
  .esig-note { margin: 0 52px 32px; padding: 12px 16px; background: #fff7f5; border: 1px solid #fed7cc; border-radius: 8px; font-size: 11px; color: #9a3412; }
  </style></head><body>
  <div class="page">
    <div class="lh">
      <div class="lh-inner">
        <div>
          <img src="${logoData}" alt="Huna Creatives" style="height:52px;width:auto;display:block">
          <p style="font-size:9pt;color:#555;font-style:italic;margin-top:4px">Let's bring your <em>hunahuna</em> to life.</p>
        </div>
        <div class="lh-contact">
          (032) 505 6921 | +63 952 447 2602<br>
          contact@hunacreatives.com<br>
          Cebu, Philippines, 6004
        </div>
      </div>
      <div class="accent"></div>
    </div>
    <div class="contract-doc">${bodyHtml}</div>
    <div class="esig-note">✍️ The e-signature block is added automatically on the signing page — the contractor signs electronically through their personal contract link.</div>
  </div>
  </body></html>`;
}

export function generateContractHTML(fields: ContractFields, sigData: string, logoData: string): string {
  const {
    contractorName, effectiveDate, role, responsibilities,
    additionalResponsibilities, hoursPerDay, workDays, shiftTime, monthlyRate,
    hourlyRate, currency, paymentType, paymentSchedule, tools, ptaDays, sickDays,
    hasCommission, commissionClient, commissionPercent, termDate,
  } = fields;

  const isHourly = paymentType === 'hourly';
  const isFlexible = paymentType === 'hourly' || paymentType === 'fixed_flexible';
  const fmt = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const currSymbol = currency === 'USD' ? '$' : '₱';
  const rate = isHourly ? Number(hourlyRate).toLocaleString() : Number(monthlyRate).toLocaleString();
  const rateLabel = `${currSymbol}${rate} ${currency}`;
  const respItems = responsibilities.filter(r => r.trim()).map(r => `<li>${r}</li>`).join('\n');
  const addItems = additionalResponsibilities.filter(r => r.trim()).map(r => `<li>${r}</li>`).join('\n');
  const toolItems = tools.filter(t => t.trim()).map(t => `<li>${t}</li>`).join('\n');

  // Dynamic section numbering — commission inserts as section 19, shifting 19+ up by 1
  const s = (base: number) => hasCommission ? base + 1 : base;

  const commissionSection = hasCommission ? `
  <hr class="divider" />
  <div class="section-title">19. Performance-Based Commission – ${commissionClient}</div>
  <p>19.1 In recognition of the Contractor's role in supporting <strong>${commissionClient}</strong>, the Contractor shall be entitled to a <strong>${commissionPercent}% commission</strong> derived from <strong>performance-based commissions actually received by Huna Creatives</strong> under its agreement with ${commissionClient}.</p>
  <p>19.2 The commission shall be calculated <strong>solely on amounts received by Huna Creatives</strong>, and not on gross sales, gross revenue, or client-side net profit.</p>
  <p>19.3 The Contractor shall have <strong>no direct contractual relationship or claim</strong> against ${commissionClient}.</p>
  <p>19.4 Commission eligibility applies only while the Contractor is <strong>actively engaged</strong> with Huna Creatives.</p>
  <p>19.5 Commission payouts shall be settled on a <strong>monthly basis</strong>, aligned with Huna Creatives' receipt of commission payments.</p>
  <p>19.6 No commission shall be due on refunded, reversed, disputed, unpaid, or cancelled transactions, or after termination of this Agreement.</p>
  <p>19.7 This commission is a <strong>performance-based incentive</strong> and does not form part of the Contractor's guaranteed compensation.</p>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Times New Roman', Times, serif; font-size: 11pt; color: #111; background: #fff; line-height: 1.6; }
  .page { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 18mm 20mm 20mm 20mm; }
  .header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 4pt; }
  .logo-block img { height: 44pt; width: auto; display: block; }
  .logo-tagline { font-size: 8.5pt; color: #333; margin-top: 4pt; font-style: italic; }
  .header-contact { text-align: right; font-size: 8.5pt; color: #333; line-height: 1.7; }
  .header-rule { border: none; border-top: 2.5pt solid #D64F1E; margin: 6pt 0 14pt 0; width: 100%; }
  .doc-title { font-size: 15pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5pt; margin-bottom: 14pt; font-family: Arial, sans-serif; }
  p { text-align: justify; margin-bottom: 7pt; font-size: 11pt; }
  ul { margin: 4pt 0 8pt 24pt; }
  ul li { margin-bottom: 3pt; font-size: 11pt; }
  .section-title { font-size: 13pt; font-weight: bold; margin: 20pt 0 8pt 0; font-family: Arial, sans-serif; }
  .sub-title { font-size: 11pt; font-weight: bold; margin: 10pt 0 4pt 0; font-family: Arial, sans-serif; }
  .divider { border: none; border-top: 0.75pt solid #ccc; margin: 14pt 0; }
  .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20pt; margin-top: 14pt; }
  .sig-label { font-size: 9pt; color: #555; }
  @media print { body { background: #fff; } .page { margin: 0; padding: 15mm 18mm 18mm 18mm; min-height: auto; } @page { size: A4; margin: 0; } }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="logo-block">
      <img src="${logoData}" alt="Huna Creatives" />
      <div class="logo-tagline">Let's bring your <em>hunahuna</em> to life.</div>
    </div>
    <div class="header-contact">
      (032) 505 6921 | +63 952 447 2602<br />
      contact@hunacreatives.com<br />
      Cebu, Philippines, 6004
    </div>
  </div>
  <hr class="header-rule" />

  <div class="doc-title">Independent Contractor Agreement</div>
  <p>This Independent Contractor Agreement ("Agreement") is entered into effective <strong>${fmt(effectiveDate)}</strong>, by and between <strong>Huna Creatives</strong>, a creative agency represented by <strong>Francis Fiel Roble</strong>, with principal address at Cebu, Philippines ("Client"), and <strong>${contractorName}</strong> ("Contractor"). Both parties agree to be bound by the following terms and conditions.</p>
  <hr class="divider" />

  <div class="section-title">1. Scope of Work</div>
  <div class="sub-title">1.1 Primary Role</div>
  <p>The Contractor is engaged to serve as <strong>${role}</strong> for <strong>Huna Creatives</strong>, providing services across the agency's client portfolio. Responsibilities include, but are not limited to:</p>
  <ul>${respItems}</ul>
  ${addItems ? `<div class="sub-title">1.2 Additional Responsibilities</div>
  <p>The Contractor may also be assigned the following additional responsibilities:</p>
  <ul>${addItems}</ul>` : ''}
  <div class="sub-title">${addItems ? '1.3' : '1.2'} General Duties</div>
  <p>The Contractor agrees to perform tasks reasonably related to the scope above, consistent with the Contractor's skills and expertise, as directed by Huna Creatives. Assignments may span multiple client accounts at the agency's discretion.</p>
  <div class="sub-title">${addItems ? '1.4' : '1.3'} Deliverable Standards</div>
  <p>All deliverables must meet the quality standards, brand guidelines, and specifications communicated by Huna Creatives. The Contractor shall promptly revise work that does not meet agreed standards upon receiving written feedback. Persistent failure to meet quality expectations may constitute grounds for termination under Section ${s(20)} of this Agreement.</p>
  <div class="sub-title">${addItems ? '1.5' : '1.4'} No Subcontracting</div>
  <p>The Contractor shall perform all services personally and shall <strong>not subcontract, delegate, or outsource</strong> any portion of the work to any third party without prior written consent from Huna Creatives. Any unauthorized subcontracting shall constitute a material breach of this Agreement.</p>
  <hr class="divider" />

  <div class="section-title">2. Work Schedule &amp; Availability</div>
  <p>2.1 The Contractor shall be <strong>primarily available</strong> to render services for up to <strong>${hoursPerDay} hours per day</strong>, <strong>${workDays.length} days per week</strong> (${workDays.join(', ')}), based on agreed priorities and deliverables.</p>
  <p>2.2 Standard working hours shall follow the <strong>${shiftTime}</strong>, unless otherwise agreed in writing.</p>
  ${isFlexible ? `<p>2.3 As an hourly engagement, actual hours logged may vary based on project requirements. The schedule above reflects expected availability windows and does not constitute a guaranteed minimum number of hours per period.</p>` : `<p>2.3 The Contractor is expected to remain responsive and available during scheduled working hours.</p>`}
  <p>2.4 <strong>Unexcused Absence / AWOL.</strong> If the Contractor fails to report for work or communicate for <strong>three (3) consecutive business days</strong> without prior notice or approval, Huna Creatives may treat such absence as voluntary abandonment of the engagement and may effect immediate termination without the notice period required under Section ${s(20)}.2. Any unpaid compensation for work actually rendered remains due and payable.</p>
  <hr class="divider" />

  <div class="section-title">3. Compensation</div>
  ${isHourly ? `
  <div class="sub-title">3.1 Hourly Rate</div>
  <p>Effective <strong>${fmt(effectiveDate)}</strong>, the Contractor shall be compensated at a rate of <strong>${rateLabel} per hour</strong> for all approved hours rendered.</p>
  <div class="sub-title">3.2 Hour Logging</div>
  <p>The Contractor is responsible for accurately logging all hours worked through Huna Creatives' designated attendance and time-tracking system. Hours must be submitted and approved by a designated supervisor prior to payment processing. Falsification of time records shall constitute grounds for immediate termination and recovery of any overpayment.</p>
  <div class="sub-title">3.3 Payment Schedule</div>
  <p>Payments shall be made on a <strong>${paymentSchedule}</strong>, based on approved hours logged during the pay period.</p>
  <div class="sub-title">3.4 Disputed Hours</div>
  <p>Any dispute regarding logged hours must be raised in writing within five (5) business days of receiving a payment summary. Huna Creatives reserves the right to withhold payment for hours that cannot be verified or are found to be inaccurate.</p>
  <div class="sub-title">3.5 Adjustments</div>
  <p>Any changes to the hourly rate, scope of work, or engagement terms must be confirmed in writing by both parties prior to taking effect.</p>
  ` : `
  <div class="sub-title">3.1 Monthly Service Fee</div>
  <p>Effective <strong>${fmt(effectiveDate)}</strong>, the Contractor shall receive a fixed <strong>monthly service fee of ${rateLabel}</strong>${paymentType === 'fixed_flexible' ? ', covering services rendered on a flexible, as-needed basis during the pay period.' : ', regardless of the number of working days in a given month, subject to the deductions outlined herein.'}</p>
  <div class="sub-title">3.2 Payment Schedule</div>
  <p>Payments shall be made on a <strong>${paymentSchedule}</strong>.</p>
  ${paymentType === 'fixed_flexible' ? '' : `
  <div class="sub-title">3.3 Absences and Deductions</div>
  <p>In the event of unapproved absences or non-rendered workdays beyond allotted leave entitlements, a proportional deduction shall be applied as follows: ${rateLabel} ÷ Total Scheduled Working Days in the Month = Daily Rate per absent day.</p>
  `}
  <div class="sub-title">${paymentType === 'fixed_flexible' ? '3.3' : '3.4'} Adjustments</div>
  <p>Any changes to the service fee, workload, or scope of work must be confirmed in writing by both parties and shall take effect no earlier than the following billing period.</p>
  `}
  <hr class="divider" />

  <div class="section-title">4. Tools &amp; Resources</div>
  <p>4.1 Huna Creatives shall provide the Contractor with access to necessary tools and subscriptions required for work, which may include but are not limited to:</p>
  <ul>${toolItems}</ul>
  <p>4.2 All tools, software licenses, accounts, and subscriptions provided by Huna Creatives remain the sole property of Huna Creatives and must be used exclusively for authorized work purposes. Personal use is strictly prohibited.</p>
  <p>4.3 The Contractor shall not share login credentials, grant third-party access, or use any provided accounts in a manner inconsistent with Huna Creatives' policies. Upon termination of this Agreement, the Contractor must cease all use immediately, and access will be revoked in accordance with Section 17.</p>
  <hr class="divider" />

  <div class="section-title">5. Discretionary Paid Time Away (PTA)</div>
  <p>5.1 As a <strong>courtesy benefit voluntarily extended by Huna Creatives</strong>, the Contractor may be granted up to <strong>${ptaDays} days of Paid Time Away (PTA) per calendar year</strong>, effective after <strong>six (6) months</strong> of continuous engagement.</p>
  <p>5.2 PTA is <strong>not a statutory entitlement</strong>, does not form part of the Contractor's service fee, and is provided solely as a goodwill benefit at the discretion of Huna Creatives. It shall not be construed as evidence of an employer-employee relationship.</p>
  <p>5.3 PTA may be taken in increments; however, <strong>no more than three (3) consecutive PTA days</strong> may be taken without prior written approval from Huna Creatives.</p>
  <p>5.4 PTA requests must be submitted at least <strong>one (1) week in advance</strong>, except in emergencies, and remain subject to operational approval.</p>
  <p>5.5 Unused PTA credits do not carry over and automatically expire at the end of each calendar year with no cash conversion.</p>
  <p>5.6 Huna Creatives reserves the right to modify, suspend, or withdraw this discretionary benefit at any time with reasonable notice.</p>
  <hr class="divider" />

  <div class="section-title">6. Sick Leave</div>
  <p>6.1 The Contractor is entitled to <strong>${sickDays} days of paid sick leave per calendar year</strong>, effective from the start of engagement.</p>
  <p>6.2 Sick leave is intended solely for use when the Contractor is genuinely ill or unwell and unable to perform services. It is <strong>not interchangeable with PTA</strong> or any other leave type.</p>
  <p>6.3 The Contractor must notify the designated supervisor <strong>as early as possible</strong> on the day of absence, or in advance when foreseeable, via the designated communication channel.</p>
  <p>6.4 Huna Creatives may request reasonable documentation (e.g., a medical certificate) for sick leave absences exceeding two (2) consecutive days.</p>
  <p>6.5 Unused sick leave credits do not carry over and automatically expire at the end of each calendar year with no cash conversion.</p>
  <p>6.6 Sick leave taken beyond the allotted days will be treated as unpaid leave${isHourly ? ', and no compensation shall be due for those hours.' : ' and deducted proportionally from the Contractor\'s monthly service fee.'}</p>
  <hr class="divider" />

  <div class="section-title">7. Representations &amp; Warranties</div>
  <p>The Contractor represents and warrants that:</p>
  <p>7.1 The Contractor has the full right, power, and authority to enter into and perform this Agreement, and that doing so does not violate any other agreement, obligation, or legal restriction to which the Contractor is subject.</p>
  <p>7.2 The Contractor is not currently engaged in, and will not during the term of this Agreement enter into, any employment or contractor agreement that conflicts with or creates a conflict of interest with the Contractor's obligations to Huna Creatives.</p>
  <p>7.3 All work, deliverables, and creative output produced under this Agreement shall be <strong>original</strong>, created solely by the Contractor (unless otherwise disclosed and approved), and shall not infringe upon the intellectual property rights, moral rights, privacy rights, or any other rights of any third party.</p>
  <p>7.4 The Contractor has not and will not introduce any malware, unauthorized code, or harmful content into any systems, files, or platforms used by Huna Creatives.</p>
  <p>7.5 The Contractor shall promptly disclose to Huna Creatives any circumstances that arise during the engagement that may affect the accuracy of the above representations.</p>
  <hr class="divider" />

  <div class="section-title">8. Confidentiality</div>
  <p>8.1 <strong>Scope.</strong> The Contractor acknowledges that during the course of this engagement, the Contractor will have access to confidential and proprietary information of Huna Creatives and its clients, including but not limited to: client identities, campaign strategies, creative briefs, pricing structures, business plans, financial data, internal processes, login credentials, and any other information designated as confidential or that a reasonable person would understand to be confidential ("Confidential Information").</p>
  <p>8.2 <strong>Obligation.</strong> The Contractor agrees to: (a) hold all Confidential Information in strict confidence; (b) not disclose, share, publish, or communicate Confidential Information to any third party without prior written consent from Huna Creatives; (c) use Confidential Information solely for the purpose of performing services under this Agreement; and (d) take all reasonable precautions to prevent unauthorized access or disclosure.</p>
  <p>8.3 <strong>Duration.</strong> These confidentiality obligations shall survive the termination or expiry of this Agreement for a period of <strong>three (3) years</strong>, or indefinitely for trade secrets and client data.</p>
  <p>8.4 <strong>Exceptions.</strong> The obligations above shall not apply to information that: (a) is or becomes publicly known through no breach of this Agreement; (b) was independently known to the Contractor prior to disclosure; or (c) is required to be disclosed by law or court order, provided the Contractor gives Huna Creatives prompt written notice to seek a protective order.</p>
  <p>8.5 <strong>Breach.</strong> The Contractor acknowledges that any breach of this section may cause irreparable harm to Huna Creatives and its clients for which monetary damages would be inadequate, and that Huna Creatives shall be entitled to seek injunctive relief in addition to any other available remedies.</p>
  <hr class="divider" />

  <div class="section-title">9. Data Privacy</div>
  <p>9.1 In performing services under this Agreement, the Contractor may process personal data of Huna Creatives' clients, employees, or end users. The Contractor agrees to handle all such data in full compliance with Republic Act No. 10173, otherwise known as the <strong>Data Privacy Act of 2012</strong>, its Implementing Rules and Regulations, and applicable issuances by the National Privacy Commission.</p>
  <p>9.2 The Contractor shall: (a) process personal data only to the extent necessary to perform the agreed services; (b) not retain, copy, transfer, or use personal data beyond the scope of this Agreement; (c) implement reasonable organizational and technical security measures to protect personal data from unauthorized access, loss, or disclosure; and (d) promptly notify Huna Creatives of any actual or suspected data breach involving personal data accessed under this Agreement.</p>
  <p>9.3 Upon termination of this Agreement, the Contractor shall immediately delete or return to Huna Creatives all personal data in the Contractor's possession.</p>
  <hr class="divider" />

  <div class="section-title">10. Non-Compete &amp; Conflict of Interest</div>
  <p>10.1 <strong>During Engagement.</strong> Throughout the term of this Agreement, the Contractor shall not, directly or indirectly, provide services to, be employed by, or have a financial interest in any business that is a <strong>direct competitor of Huna Creatives</strong> — defined as any entity offering digital marketing, creative design, social media management, or related agency services targeting the same market segments — without prior written approval from Huna Creatives.</p>
  <p>10.2 <strong>Post-Termination.</strong> For a period of <strong>twelve (12) months</strong> following the termination of this Agreement, the Contractor shall not directly solicit, approach, or accept work from any client that the Contractor served or had material knowledge of during the engagement with Huna Creatives, in a capacity that directly competes with services offered by Huna Creatives.</p>
  <p>10.3 The Contractor shall promptly disclose any existing or potential conflict of interest to Huna Creatives upon becoming aware of it.</p>
  <hr class="divider" />

  <div class="section-title">11. Non-Solicitation</div>
  <p>11.1 <strong>Clients.</strong> During the term of this Agreement and for a period of <strong>twelve (12) months</strong> thereafter, the Contractor shall not, directly or indirectly, solicit, contact, or enter into any business arrangement with any client of Huna Creatives for the purpose of providing services similar to those offered by Huna Creatives, without the prior written consent of Huna Creatives.</p>
  <p>11.2 <strong>Team Members.</strong> During the term of this Agreement and for a period of <strong>twelve (12) months</strong> thereafter, the Contractor shall not solicit, recruit, hire, or encourage any other contractor, employee, or team member of Huna Creatives to leave or reduce their engagement with Huna Creatives.</p>
  <p>11.3 The Contractor acknowledges that these restrictions are reasonable and necessary to protect the legitimate business interests of Huna Creatives, and that any breach may entitle Huna Creatives to seek injunctive relief without the need to post a bond.</p>
  <hr class="divider" />

  <div class="section-title">12. Intellectual Property &amp; Ownership of Work</div>
  <p>12.1 <strong>Work for Hire.</strong> All creative output, designs, artworks, written content, code, strategies, reports, and other materials produced by the Contractor in the course of this engagement ("Work Product") shall be considered work made for hire and shall be the <strong>sole and exclusive property of Huna Creatives and/or its designated clients</strong> from the moment of creation.</p>
  <p>12.2 <strong>Assignment.</strong> To the extent any Work Product does not qualify as work made for hire under applicable law, the Contractor hereby irrevocably assigns to Huna Creatives all rights, title, and interest in and to such Work Product, including all intellectual property rights therein, worldwide and in perpetuity, without additional compensation.</p>
  <p>12.3 <strong>Moral Rights Waiver.</strong> In accordance with Republic Act No. 8293 (Intellectual Property Code of the Philippines), to the fullest extent permitted by law, the Contractor hereby waives any and all moral rights in and to the Work Product, including the right of attribution and the right to object to modifications, and agrees not to assert such rights against Huna Creatives, its clients, or their respective licensees.</p>
  <p>12.4 <strong>Pre-Existing Materials.</strong> If the Contractor incorporates any pre-existing materials, tools, or third-party assets into any Work Product, the Contractor warrants that Huna Creatives has or will have the right to use such materials without restriction, and the Contractor shall disclose any such use prior to delivery.</p>
  <p>12.5 <strong>Further Assistance.</strong> The Contractor agrees to execute such documents and take such further actions as Huna Creatives may reasonably request to perfect, record, or enforce Huna Creatives' rights in the Work Product.</p>
  <hr class="divider" />

  <div class="section-title">13. Portfolio &amp; Social Media Policy</div>
  <p>13.1 The Contractor shall <strong>not publicly display, post, publish, or otherwise disclose</strong> any Work Product, client names, campaign details, or project outcomes on personal websites, social media profiles, portfolio platforms, or any other public medium without the prior written consent of Huna Creatives.</p>
  <p>13.2 Where Huna Creatives grants consent for portfolio use, such use shall be limited to the specific materials and context approved, shall not disclose any confidential client information, and shall credit Huna Creatives as the agency of record.</p>
  <p>13.3 The Contractor shall not make any public statements — whether online, in print, or verbally — that identify, reference, or comment on Huna Creatives' clients, internal operations, or business strategies without prior written approval.</p>
  <hr class="divider" />

  <div class="section-title">14. Non-Disparagement</div>
  <p>14.1 During the term of this Agreement and at all times thereafter, the Contractor agrees not to make, publish, or communicate any false, misleading, or disparaging statements about Huna Creatives, its owners, team members, clients, services, or business practices — whether in person, in writing, or through any online platform, social media channel, review site, or other medium.</p>
  <p>14.2 This obligation survives the termination of this Agreement and is a material term hereof. Huna Creatives reserves the right to seek damages for any breach of this section.</p>
  <hr class="divider" />

  <div class="section-title">15. Communication &amp; Remote Work Expectations</div>
  <p>15.1 The Contractor shall remain active and responsive during scheduled working hours via Slack, email, or other designated platforms, and must promptly notify the Client if unavailable for any reason.</p>
  <p>15.2 The Contractor is expected to respond to messages from Huna Creatives within <strong>two (2) hours</strong> during scheduled working hours, unless prior notice of unavailability has been given.</p>
  <p>15.3 The Contractor shall attend all required team meetings, briefings, and check-ins as scheduled, whether synchronous or asynchronous.</p>
  <p>15.4 All work-related communications, files, and deliverables must be conducted and stored through Huna Creatives' designated platforms and shall not be shared via personal or unauthorized channels.</p>
  <hr class="divider" />

  <div class="section-title">16. Indemnification</div>
  <p>16.1 The Contractor shall <strong>indemnify, defend, and hold harmless</strong> Huna Creatives, its owners, officers, agents, and clients from and against any and all claims, damages, losses, liabilities, costs, and expenses (including reasonable legal fees) arising out of or related to: (a) any breach by the Contractor of this Agreement or any representation or warranty contained herein; (b) any infringement of third-party intellectual property rights by the Contractor's work; (c) any negligent or wrongful act or omission by the Contractor in performing services hereunder; or (d) any violation of applicable law by the Contractor.</p>
  <p>16.2 Huna Creatives shall promptly notify the Contractor of any claim for which indemnification may be sought and shall cooperate reasonably in the defense thereof.</p>
  <hr class="divider" />

  <div class="section-title">17. Return of Assets &amp; Access Revocation</div>
  <p>17.1 Upon termination or expiry of this Agreement for any reason, the Contractor shall, within <strong>24 hours</strong>: (a) cease all use of Huna Creatives' tools, accounts, platforms, and systems; (b) return or permanently delete all Confidential Information, Work Product drafts, client files, and company data in the Contractor's possession; and (c) confirm in writing that all such materials have been returned or destroyed.</p>
  <p>17.2 Huna Creatives shall revoke all access credentials and permissions provided to the Contractor upon or before the effective date of termination.</p>
  <p>17.3 The Contractor's failure to comply with this section shall entitle Huna Creatives to withhold any outstanding payment until compliance is confirmed, without prejudice to any other remedies available.</p>
  <hr class="divider" />

  <div class="section-title">18. Force Majeure</div>
  <p>18.1 Neither party shall be liable for any delay or failure to perform its obligations under this Agreement to the extent caused by circumstances beyond its reasonable control, including but not limited to: acts of God, natural disasters, pandemics, war, civil unrest, government action, or failure of third-party infrastructure ("Force Majeure Event").</p>
  <p>18.2 The party affected by a Force Majeure Event shall notify the other party in writing as soon as reasonably practicable and shall use reasonable efforts to mitigate the impact and resume performance.</p>
  <p>18.3 If a Force Majeure Event continues for more than <strong>thirty (30) consecutive days</strong>, either party may terminate this Agreement by written notice, without liability, except for payment of amounts due for work already completed.</p>

  ${commissionSection}

  <hr class="divider" />
  <div class="section-title">${s(19)}. Dispute Resolution</div>
  <p>${s(19)}.1 The parties agree to attempt to resolve any dispute arising from or relating to this Agreement through <strong>good-faith negotiation</strong> within fifteen (15) days of written notice of the dispute.</p>
  <p>${s(19)}.2 If negotiation fails, the parties shall submit the dispute to non-binding <strong>mediation</strong> before a mutually agreed mediator prior to initiating any formal legal proceedings.</p>
  <p>${s(19)}.3 Any unresolved disputes shall be subject to the jurisdiction of the courts of Cebu City, Philippines.</p>
  <hr class="divider" />

  <div class="section-title">${s(20)}. Term &amp; Termination</div>
  <p>${s(20)}.1 This Agreement shall commence on <strong>${fmt(termDate || effectiveDate)}</strong> and shall continue on a <strong>month-to-month basis</strong> until terminated in accordance with this section.</p>
  <p>${s(20)}.2 <strong>Notice Period.</strong> Either party may terminate this Agreement by providing <strong>thirty (30) days' written notice</strong> to the other party. During the notice period, the Contractor is expected to continue performing services and complete any outstanding deliverables, and Huna Creatives shall continue to pay compensation for work rendered.</p>
  <p>${s(20)}.3 <strong>Immediate Termination.</strong> Huna Creatives may terminate this Agreement immediately and without notice in the event of: (a) material breach of any provision of this Agreement by the Contractor; (b) unauthorized disclosure of Confidential Information; (c) violation of the intellectual property, non-solicitation, or non-disparagement provisions; (d) falsification of time records or submission of fraudulent work; (e) gross negligence or willful misconduct; or (f) AWOL as defined in Section 2.4.</p>
  <p>${s(20)}.4 <strong>Final Payment.</strong> Upon termination, Huna Creatives shall pay the Contractor for all approved work actually completed and delivered up to the effective date of termination, less any amounts owed to Huna Creatives for overpayments, damages, or unreturned assets.</p>
  <hr class="divider" />

  <div class="section-title">${s(21)}. Post-Termination Survival</div>
  <p>The following provisions shall survive the termination or expiry of this Agreement and remain in full force and effect: Section 8 (Confidentiality), Section 9 (Data Privacy), Section 10 (Non-Compete, post-termination period), Section 11 (Non-Solicitation), Section 12 (Intellectual Property), Section 13 (Portfolio &amp; Social Media Policy), Section 14 (Non-Disparagement), Section 16 (Indemnification), Section 17 (Return of Assets), and Section ${s(19)} (Dispute Resolution).</p>
  <hr class="divider" />

  <div class="section-title">${s(22)}. Independent Contractor Status</div>
  <p>${s(22)}.1 The Contractor is engaged solely as an independent contractor. Nothing in this Agreement shall be construed to create an employer-employee relationship, partnership, joint venture, or agency between the parties.</p>
  <p>${s(22)}.2 The Contractor is solely responsible for all applicable taxes, SSS, PhilHealth, Pag-IBIG, and other government contributions or obligations arising from compensation received under this Agreement. Huna Creatives shall not withhold taxes or make contributions on behalf of the Contractor.</p>
  <p>${s(22)}.3 The Contractor shall not represent themselves as an employee of Huna Creatives to any third party.</p>
  <hr class="divider" />

  <div class="section-title">${s(23)}. Entire Agreement &amp; Severability</div>
  <p>${s(23)}.1 This Agreement constitutes the entire agreement between the parties with respect to its subject matter and supersedes all prior negotiations, representations, warranties, and understandings, whether oral or written.</p>
  <p>${s(23)}.2 This Agreement may be amended only by a written instrument signed by both parties.</p>
  <p>${s(23)}.3 If any provision of this Agreement is found to be invalid, illegal, or unenforceable under applicable law, such provision shall be modified to the minimum extent necessary to make it enforceable, and the remaining provisions shall continue in full force and effect.</p>
  <p>${s(23)}.4 The failure of either party to enforce any provision of this Agreement shall not constitute a waiver of that party's right to enforce such provision in the future.</p>
  <hr class="divider" />

  <div class="section-title">${s(24)}. Governing Law</div>
  <p>This Agreement shall be governed by and construed in accordance with the laws of the Republic of the Philippines. Any disputes not resolved through the process described in Section ${s(19)} shall be subject to the exclusive jurisdiction of the appropriate courts of Cebu City, Philippines.</p>
  <hr class="divider" />

  <div class="section-title">Signatures</div>
  <p>By signing below, both parties acknowledge that they have read, understood, and agree to be bound by all terms and conditions of this Agreement.</p>
  <div class="sig-grid">
    <div>
      <p><strong>Huna Creatives</strong><br />("Client")</p>
      <div style="height:44pt;display:flex;align-items:flex-end;padding-bottom:0;margin-top:16pt;">
        <img src="${sigData}" style="height:70pt;width:auto;max-width:240pt;object-fit:contain;" />
      </div>
      <div style="border-top:1pt solid #111;margin-bottom:4pt;"></div>
      <p class="sig-label">Francis Fiel Roble &nbsp;|&nbsp; ${fmt(effectiveDate)}</p>
    </div>
    <div>
      <p><strong>${contractorName}</strong><br />("Contractor")</p>
      <div style="height:44pt;margin-top:16pt;border-bottom:1pt solid #111;"></div>
      <p class="sig-label" style="margin-top:4pt;">Signature</p>
      <div style="border-top:1pt solid #111;margin-top:20pt;margin-bottom:4pt;"></div>
      <p class="sig-label">${contractorName} &nbsp;|&nbsp; Date</p>
    </div>
  </div>
</div>
</body>
</html>`;
}

export interface ContractFields {
  contractorId: string;
  contractorName: string;
  effectiveDate: string;
  role: string;
  responsibilities: string[];
  additionalResponsibilities: string[];
  hoursPerDay: string;
  workDays: string[];
  shiftTime: string;
  monthlyRate: string;
  hourlyRate: string;
  currency: 'PHP' | 'USD';
  paymentType: 'fixed' | 'hourly' | 'fixed_flexible';
  paymentSchedule: string;
  tools: string[];
  ptaDays: string;
  sickDays: string;
  hasCommission: boolean;
  commissionClient: string;
  commissionPercent: string;
  termDate: string;
  amendmentType: string;
}

export const ROLE_TEMPLATES: Record<string, Partial<ContractFields>> = {
  'Junior Graphic Designer': {
    role: 'Junior Graphic Designer',
    responsibilities: [
      'Create social media graphics, marketing materials, and brand collateral',
      'Follow brand guidelines and maintain visual consistency across deliverables',
      'Assist with layout, typography, and design revisions as directed',
    ],
    tools: ['Canva Pro', 'Adobe Photoshop', 'Adobe Illustrator'],
    ptaDays: '6', sickDays: '4',
  },
  'Senior Graphic Designer': {
    role: 'Senior Graphic Designer',
    responsibilities: [
      'Lead visual design for client campaigns, branding projects, and marketing materials',
      'Develop and maintain brand identities and design systems',
      'Oversee and review work from junior designers, providing creative direction',
    ],
    tools: ['Canva Pro', 'Adobe Photoshop', 'Adobe Illustrator', 'Adobe InDesign'],
    ptaDays: '6', sickDays: '4',
  },
  'Social Media Manager': {
    role: 'Social Media Manager',
    responsibilities: [
      'Plan, create, and schedule content across social media platforms (Facebook, Instagram, TikTok)',
      'Monitor engagement, respond to comments, and manage community interactions',
      'Analyze performance metrics and prepare monthly reports',
    ],
    tools: ['Canva Pro', 'Meta Business Suite', 'Later or Buffer'],
    ptaDays: '6', sickDays: '4',
  },
  'Copywriter': {
    role: 'Copywriter',
    responsibilities: [
      'Write copy for social media captions, ad creatives, email campaigns, and website content',
      'Adapt brand voice and tone guidelines across multiple client accounts',
      'Collaborate with designers and strategists to align messaging with visual output',
    ],
    tools: ['Google Docs', 'Grammarly', 'Notion'],
    ptaDays: '6', sickDays: '4',
  },
  'Video Editor': {
    role: 'Video Editor',
    responsibilities: [
      'Edit raw footage into polished video content for social media, ads, and client presentations',
      'Add motion graphics, subtitles, transitions, and audio as needed',
      'Deliver videos in required formats and aspect ratios across platforms',
    ],
    tools: ['Adobe Premiere Pro', 'CapCut', 'Adobe After Effects'],
    ptaDays: '6', sickDays: '4',
  },
  'Media Buyer': {
    role: 'Media Buyer / Ads Specialist',
    responsibilities: [
      'Set up, manage, and optimize paid ad campaigns on Meta, Google, and other platforms',
      'Monitor campaign performance, adjust budgets, and report on key metrics',
      'Collaborate with the creative team to align ad creatives with campaign objectives',
    ],
    tools: ['Meta Ads Manager', 'Google Ads', 'Google Analytics'],
    ptaDays: '6', sickDays: '4',
  },
  'Virtual Assistant': {
    role: 'Virtual Assistant',
    responsibilities: [
      'Provide administrative and operational support to the Huna Creatives team',
      'Manage schedules, emails, and task tracking as directed',
      'Assist with data entry, research, and client communication as needed',
    ],
    tools: ['Google Workspace', 'Slack', 'Notion'],
    ptaDays: '6', sickDays: '4',
  },
};

export const BLANK: ContractFields = {
  contractorId: '',
  contractorName: '',
  effectiveDate: new Date().toISOString().slice(0, 10),
  role: '',
  responsibilities: ['', '', ''],
  additionalResponsibilities: [],
  hoursPerDay: '8',
  workDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  shiftTime: 'graveyard shift from 11:00 PM to 7:00 AM Philippine Time',
  monthlyRate: '',
  hourlyRate: '',
  currency: 'PHP',
  paymentType: 'fixed',
  paymentSchedule: 'bi-monthly basis, on the 15th and the last working day of each month',
  tools: [...DEFAULT_TOOLS],
  ptaDays: '6',
  sickDays: '4',
  hasCommission: false,
  commissionClient: '',
  commissionPercent: '1',
  termDate: '',
  amendmentType: 'initial',
};

export default function ContractGeneratorModal({ contractors, onClose, onDone }: Props) {
  const { hubUser } = useAuth();
  const [fields, setFields] = useState<ContractFields>({ ...BLANK });
  const [step, setStep] = useState<'form' | 'preview'>('form');
  const [previewHtml, setPreviewHtml] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [contractMode, setContractMode] = useState<'template' | 'custom'>('template');
  const [customBody, setCustomBody] = useState('');
  const [aiBrief, setAiBrief] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState('');

  // AI draft: fills the custom body from a brief + the selected contractor's
  // details; the normal preview → send-for-signature flow takes over from there.
  const generateWithAI = async () => {
    if (!aiBrief.trim() && !fields.role.trim()) { setAiError('Describe the engagement first (or pick a role).'); return; }
    setAiGenerating(true);
    setAiError('');
    try {
      const { data, error } = await supabase.functions.invoke('generate-contractor-contract', {
        body: {
          brief: aiBrief.trim(),
          contractor_name: fields.contractorName || null,
          role: fields.role || null,
          effective_date: fields.effectiveDate || null,
          payment_type: fields.paymentType,
          monthly_rate: fields.monthlyRate || null,
          hourly_rate: fields.hourlyRate || null,
          currency: fields.currency,
          amendment_type: fields.amendmentType,
        },
      });
      if (error || data?.error || !data?.body) {
        setAiError(data?.error ?? error?.message ?? 'Generation failed — try again.');
        return;
      }
      setCustomBody(data.body);
      setToast('Draft generated — review and edit below before previewing.');
      setTimeout(() => setToast(''), 4000);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'Generation failed — try again.');
    } finally {
      setAiGenerating(false);
    }
  };

  const set = (key: keyof ContractFields, val: any) =>
    setFields(prev => ({ ...prev, [key]: val }));

  const setListItem = (key: 'responsibilities' | 'additionalResponsibilities' | 'tools', idx: number, val: string) =>
    setFields(prev => {
      const arr = [...(prev[key] as string[])];
      arr[idx] = val;
      return { ...prev, [key]: arr };
    });

  const addItem = (key: 'responsibilities' | 'additionalResponsibilities' | 'tools') =>
    setFields(prev => ({ ...prev, [key]: [...(prev[key] as string[]), ''] }));

  const removeItem = (key: 'responsibilities' | 'additionalResponsibilities' | 'tools', idx: number) =>
    setFields(prev => {
      const arr = (prev[key] as string[]).filter((_, i) => i !== idx);
      return { ...prev, [key]: arr };
    });

  const applyTemplate = (templateKey: string) => {
    const t = ROLE_TEMPLATES[templateKey];
    if (!t) return;
    setFields(prev => ({ ...prev, ...t }));
  };

  const handleContractorChange = (id: string) => {
    const c = contractors.find(x => x.id === id);
    setFields(prev => ({
      ...prev,
      contractorId: id,
      contractorName: c?.full_name ?? '',
      ...(c?.payment_type && c.payment_type !== 'project_based' ? {
        paymentType: c.payment_type as 'fixed' | 'hourly' | 'fixed_flexible',
        monthlyRate: c.payment_type !== 'hourly' && c.monthly_rate ? String(c.monthly_rate) : prev.monthlyRate,
        hourlyRate: c.payment_type === 'hourly' && c.hourly_rate ? String(c.hourly_rate) : prev.hourlyRate,
        currency: (c.currency === 'USD' || c.currency === 'PHP') ? c.currency : prev.currency,
      } : {}),
    }));
  };

  const customDocTitle = () => fields.amendmentType && fields.amendmentType !== 'initial'
    ? 'AMENDMENT TO INDEPENDENT CONTRACTOR AGREEMENT'
    : 'INDEPENDENT CONTRACTOR AGREEMENT';

  const customContractBody = () => {
    const effective = new Date(fields.effectiveDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    return aiTextToContractBody(customDocTitle(), `${fields.contractorName} — Effective ${effective}`, customBody);
  };

  const handlePreview = () => {
    const html = contractMode === 'custom'
      ? clientStylePreviewHTML(customContractBody(), HUNA_LOGO)
      : generateContractHTML(fields, FRANCIS_SIG, HUNA_LOGO);
    setPreviewHtml(html);
    setStep('preview');
  };

  // Custom/AI contracts go through the public client-contract flow: a
  // hub_client_contracts row with its own /c/<slug> link, signed
  // electronically on that page — same experience as client contracts.
  const sendCustomContract = async () => {
    const contractor = contractors.find(c => c.id === fields.contractorId);
    if (!contractor?.email) {
      setToast('This contractor has no email on file — add one first.');
      setTimeout(() => setToast(''), 4000);
      setSaving(false);
      return;
    }
    const title = `${fields.amendmentType && fields.amendmentType !== 'initial' ? 'Amendment to Independent Contractor Agreement' : 'Independent Contractor Agreement'} — ${fields.contractorName}`;
    const slug = `${slugify(`${fields.contractorName}-contractor-agreement`)}-${Date.now().toString(36)}`;

    const { error } = await supabase.from('hub_client_contracts').insert({
      project_id: null,
      contractor_id: fields.contractorId,
      slug,
      title,
      body: customContractBody(),
      total_value: fields.paymentType === 'hourly'
        ? (fields.hourlyRate ? Number(fields.hourlyRate) : null)
        : (fields.monthlyRate ? Number(fields.monthlyRate) : null),
      currency: fields.currency,
      status: 'sent',
    });
    if (error) {
      setToast(`Failed to save contract: ${error.message}`);
      setTimeout(() => setToast(''), 5000);
      setSaving(false);
      return;
    }

    await supabase.functions.invoke('send-client-contract', {
      body: {
        slug,
        client_email: contractor.email,
        client_name: fields.contractorName,
        contract_title: title,
      },
    }).catch(console.error);

    const link = `https://www.hunacreatives.com/c/${slug}`;
    try { await navigator.clipboard.writeText(link); } catch { /* clipboard unavailable */ }
    setToast('Contract sent — signing link copied to clipboard.');
    setTimeout(() => setToast(''), 5000);
    setSaving(false);
    onDone();
  };

  const handleSendForSignature = async () => {
    if (!fields.contractorId) return;
    setSaving(true);

    if (contractMode === 'custom') { await sendCustomContract(); return; }

    const html = previewHtml;
    const title = `Independent Contractor Agreement – ${fields.contractorName}`;

    const { data: doc, error } = await supabase
      .from('hub_sign_documents')
      .insert({
        title,
        description: `Effective ${new Date(fields.effectiveDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
        file_url: null,
        file_name: null,
        content: html,
        is_generated: true,
        amendment_type: fields.amendmentType,
        rate_snapshot: fields.paymentType === 'hourly'
          ? (fields.hourlyRate ? Number(fields.hourlyRate) : null)
          : (fields.monthlyRate ? Number(fields.monthlyRate) : null),

        uploaded_by: hubUser!.id,
      })
      .select('id')
      .single();

    if (error || !doc) {
      setToast('Failed to save contract.');
      setSaving(false);
      return;
    }

    const { data: assignment } = await supabase.from('hub_sign_assignments').insert({
      document_id: doc.id,
      contractor_id: fields.contractorId,
    }).select('id').single();

    if (assignment?.id) {
      await supabase.functions.invoke('notify-contract-assigned', { body: { assignment_id: assignment.id } });
    }

    setSaving(false);
    onDone();
  };

  const openPreviewInTab = () => {
    const blob = new Blob([previewHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      {toast && (
        <div className="fixed top-5 right-5 z-[60] bg-gray-900 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg">{toast}</div>
      )}
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            {step === 'preview' && (
              <button onClick={() => setStep('form')} className="text-gray-400 hover:text-gray-700 cursor-pointer">
                <i className="ri-arrow-left-line text-lg"></i>
              </button>
            )}
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                {step === 'form' ? 'Generate Contract' : 'Preview Contract'}
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {step === 'form' ? 'Fill in the details — your signature is added automatically' : 'Review before sending'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer">
            <i className="ri-close-line text-lg"></i>
          </button>
        </div>

        {step === 'form' && (
          <div className="overflow-y-auto flex-1 p-5 space-y-5">

            {/* Mode toggle */}
            <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
              {(['template', 'custom'] as const).map(m => (
                <button key={m} type="button" onClick={() => setContractMode(m)}
                  className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                    contractMode === m ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                  }`}>
                  {m === 'template' ? 'Use Template' : 'Custom · AI'}
                </button>
              ))}
            </div>

            {contractMode === 'custom' ? (
              <>
                {/* Contractor */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Contractor *</label>
                  <select
                    value={fields.contractorId}
                    onChange={e => handleContractorChange(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] bg-white cursor-pointer"
                  >
                    <option value="">Select contractor…</option>
                    {contractors.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                  </select>
                </div>

                {/* Effective date + amendment type */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Effective Date *</label>
                    <input type="date" value={fields.effectiveDate} onChange={e => set('effectiveDate', e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Contract Type</label>
                    <select value={fields.amendmentType} onChange={e => set('amendmentType', e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] bg-white cursor-pointer">
                      <option value="initial">Initial Agreement</option>
                      <option value="rate_amendment">Rate Amendment</option>
                      <option value="scope_change">Scope Change</option>
                      <option value="renewal">Renewal</option>
                      <option value="other">Other Amendment</option>
                    </select>
                  </div>
                </div>

                {/* AI draft */}
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 space-y-2">
                  <p className="text-xs font-semibold text-indigo-700 flex items-center gap-1.5">
                    <i className="ri-sparkling-2-line"></i> Draft with AI
                  </p>
                  <textarea
                    value={aiBrief}
                    onChange={e => setAiBrief(e.target.value)}
                    rows={3}
                    placeholder={"Describe the engagement — role, responsibilities, schedule, rate, special terms…\nThe selected contractor's name, rate, and dates above are included automatically."}
                    className="w-full border border-indigo-200 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 resize-y"
                  />
                  {aiError && <p className="text-xs text-red-500">{aiError}</p>}
                  <button
                    type="button"
                    onClick={generateWithAI}
                    disabled={aiGenerating}
                    className="w-full py-2 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 cursor-pointer disabled:opacity-40 font-medium flex items-center justify-center gap-1.5">
                    {aiGenerating
                      ? <><i className="ri-loader-4-line animate-spin text-sm"></i> Drafting… this can take a minute</>
                      : <><i className="ri-magic-line text-sm"></i> {customBody.trim() ? 'Regenerate draft' : 'Generate draft'}</>}
                  </button>
                  <p className="text-[10px] text-indigo-400">The draft lands in the Contract Body below — always review before sending.</p>
                </div>

                {/* Custom body */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Contract Body *</label>
                  <textarea
                    value={customBody}
                    onChange={e => setCustomBody(e.target.value)}
                    rows={18}
                    placeholder={"Type or paste your contract here...\n\nSeparate paragraphs with a blank line.\n\nThe Huna Creatives header and signature block are added automatically."}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] font-mono resize-y"
                  />
                  <p className="text-xs text-gray-400 mt-1">Blank line = new paragraph. Header + signature block added automatically.</p>
                </div>
              </>
            ) : (
              <>
            {/* Contractor */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Contractor *</label>
              <select
                value={fields.contractorId}
                onChange={e => handleContractorChange(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] bg-white cursor-pointer"
              >
                <option value="">Select contractor…</option>
                {contractors.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
              </select>
            </div>

            {/* Payment type */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">Payment Structure *</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {([
                  { key: 'fixed',          label: 'Fixed Monthly',      icon: 'ri-calendar-line',  desc: 'Same pay every month' },
                  { key: 'fixed_flexible', label: 'Fixed, Open Schedule', icon: 'ri-shield-line',    desc: 'Fixed pay, hours vary by project' },
                  { key: 'hourly',         label: 'Hourly',               icon: 'ri-time-line',      desc: 'Paid per approved hour logged' },
                ] as const).map(t => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => set('paymentType', t.key)}
                    className={`flex flex-col items-start gap-0.5 px-3 py-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                      fields.paymentType === t.key
                        ? 'bg-[#FF6B35] border-[#FF6B35] text-white'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 text-xs font-medium"><i className={t.icon}></i>{t.label}</span>
                    <span className={`text-[10px] ${fields.paymentType === t.key ? 'text-white/70' : 'text-gray-400'}`}>{t.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Contract type */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Contract Type *</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { key: 'initial',        label: 'Initial Agreement', icon: 'ri-file-text-line' },
                  { key: 'rate_amendment', label: 'Rate Amendment',    icon: 'ri-money-dollar-circle-line' },
                  { key: 'scope_change',   label: 'Scope Change',      icon: 'ri-edit-box-line' },
                  { key: 'renewal',        label: 'Renewal',           icon: 'ri-refresh-line' },
                  { key: 'other',          label: 'Other Amendment',   icon: 'ri-file-edit-line' },
                ].map(t => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => set('amendmentType', t.key)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium cursor-pointer transition-all ${
                      fields.amendmentType === t.key
                        ? 'bg-[#FF6B35] border-[#FF6B35] text-white'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <i className={t.icon}></i>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Effective Date *</label>
                <input type="date" value={fields.effectiveDate} onChange={e => set('effectiveDate', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Term Start Date</label>
                <input type="date" value={fields.termDate} onChange={e => set('termDate', e.target.value)}
                  placeholder="Same as effective date"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
              </div>
            </div>

            {/* Role template picker */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Load Template <span className="text-gray-400 font-normal">(optional — pre-fills role, responsibilities & tools)</span></label>
              <select
                defaultValue=""
                onChange={e => { if (e.target.value) applyTemplate(e.target.value); }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] bg-white cursor-pointer"
              >
                <option value="">Choose a role template…</option>
                {Object.keys(ROLE_TEMPLATES).map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>

            {/* Role */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Role / Title *</label>
              <input type="text" value={fields.role} onChange={e => set('role', e.target.value)}
                placeholder="e.g. Junior Graphic Designer"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
            </div>

            {/* Responsibilities */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-gray-600">Responsibilities *</label>
                <button onClick={() => addItem('responsibilities')} className="text-xs text-[#FF6B35] cursor-pointer hover:underline">+ Add</button>
              </div>
              <div className="space-y-2">
                {fields.responsibilities.map((r, i) => (
                  <div key={i} className="flex gap-2">
                    <input type="text" value={r} onChange={e => setListItem('responsibilities', i, e.target.value)}
                      placeholder={`Responsibility ${i + 1}`}
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
                    {fields.responsibilities.length > 1 && (
                      <button onClick={() => removeItem('responsibilities', i)} className="text-gray-300 hover:text-red-400 cursor-pointer flex-shrink-0">
                        <i className="ri-close-line"></i>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Additional responsibilities */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-gray-600">Additional Responsibilities <span className="text-gray-400 font-normal">(optional)</span></label>
                <button onClick={() => addItem('additionalResponsibilities')} className="text-xs text-[#FF6B35] cursor-pointer hover:underline">+ Add</button>
              </div>
              {fields.additionalResponsibilities.length === 0 ? (
                <p className="text-xs text-gray-400">None added.</p>
              ) : (
                <div className="space-y-2">
                  {fields.additionalResponsibilities.map((r, i) => (
                    <div key={i} className="flex gap-2">
                      <input type="text" value={r} onChange={e => setListItem('additionalResponsibilities', i, e.target.value)}
                        placeholder={`Additional duty ${i + 1}`}
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
                      <button onClick={() => removeItem('additionalResponsibilities', i)} className="text-gray-300 hover:text-red-400 cursor-pointer flex-shrink-0">
                        <i className="ri-close-line"></i>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Schedule */}
            <div>
              <p className="text-xs font-medium text-gray-600 mb-2">Work Schedule</p>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Work Days</label>
                <div className="flex gap-1.5 flex-wrap">
                  {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(day => {
                    const active = fields.workDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => set('workDays', active ? fields.workDays.filter(d => d !== day) : [...fields.workDays, day])}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all border ${active ? 'bg-[#FF6B35] border-[#FF6B35] text-white' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                      >
                        {day.slice(0, 3)}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Hours/day</label>
                  <input type="number" value={fields.hoursPerDay} onChange={e => set('hoursPerDay', e.target.value)} min={1} max={24}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">PTA days/year</label>
                  <input type="number" value={fields.ptaDays} onChange={e => set('ptaDays', e.target.value)} min={0}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Sick days/year</label>
                  <input type="number" value={fields.sickDays} onChange={e => set('sickDays', e.target.value)} min={0}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
                </div>
              </div>
              <div className="mt-2">
                <label className="block text-xs text-gray-500 mb-1">Shift / Working Hours</label>
                <input type="text" value={fields.shiftTime} onChange={e => set('shiftTime', e.target.value)}
                  placeholder="e.g. 9:00 AM to 6:00 PM Philippine Time"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
              </div>
            </div>

            {/* Compensation */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {fields.paymentType !== 'hourly' ? 'Monthly Rate *' : 'Hourly Rate *'}
                </label>
                <div className="flex gap-2">
                  <select value={fields.currency} onChange={e => set('currency', e.target.value)}
                    className="border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none bg-white cursor-pointer w-20 flex-shrink-0">
                    <option value="PHP">₱ PHP</option>
                    <option value="USD">$ USD</option>
                  </select>
                  {fields.paymentType !== 'hourly' ? (
                    <input type="number" value={fields.monthlyRate} onChange={e => set('monthlyRate', e.target.value)}
                      placeholder="55000"
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
                  ) : (
                    <input type="number" value={fields.hourlyRate} onChange={e => set('hourlyRate', e.target.value)}
                      placeholder="250"
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
                  )}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Payment Schedule</label>
                <select value={fields.paymentSchedule} onChange={e => set('paymentSchedule', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] bg-white cursor-pointer">
                  <option value="bi-monthly basis, on the 15th and the last working day of each month">Bi-monthly (15th & last day)</option>
                  <option value="monthly basis, on the last working day of each month">Monthly (last day)</option>
                  <option value="weekly basis, every Friday">Weekly (every Friday)</option>
                </select>
              </div>
            </div>

            {/* Tools */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-gray-600">Tools Provided</label>
                <button onClick={() => addItem('tools')} className="text-xs text-[#FF6B35] cursor-pointer hover:underline">+ Add</button>
              </div>
              <div className="space-y-2">
                {fields.tools.map((t, i) => (
                  <div key={i} className="flex gap-2">
                    <input type="text" value={t} onChange={e => setListItem('tools', i, e.target.value)}
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
                    <button onClick={() => removeItem('tools', i)} className="text-gray-300 hover:text-red-400 cursor-pointer flex-shrink-0">
                      <i className="ri-close-line"></i>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Commission toggle */}
            <div className="border border-gray-200 rounded-xl p-4 space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={fields.hasCommission} onChange={e => set('hasCommission', e.target.checked)} className="accent-[#FF6B35]" />
                <span className="text-sm font-medium text-gray-700">Include performance-based commission clause</span>
              </label>
              {fields.hasCommission && (
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Client name</label>
                    <input type="text" value={fields.commissionClient} onChange={e => set('commissionClient', e.target.value)}
                      placeholder="e.g. The Second Haus"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Commission %</label>
                    <input type="number" value={fields.commissionPercent} onChange={e => set('commissionPercent', e.target.value)}
                      min={0} max={100} step={0.5}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
                  </div>
                </div>
              )}
            </div>
              </>
            )}

          </div>
        )}

        {step === 'preview' && (
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="flex items-center gap-3 px-5 py-3 bg-amber-50 border-b border-amber-100 flex-shrink-0">
              <i className="ri-information-line text-amber-500"></i>
              <p className="text-xs text-amber-700">{contractMode === 'custom'
                ? 'Review the contract below. Sending emails the contractor a personal signing link — they sign electronically, no hub login needed.'
                : 'Review the contract below. Your signature is already on it. Once sent, the contractor will be notified to sign.'}</p>
              <button onClick={openPreviewInTab} className="ml-auto text-xs text-[#FF6B35] cursor-pointer whitespace-nowrap hover:underline flex-shrink-0">
                Open in new tab <i className="ri-external-link-line"></i>
              </button>
            </div>
            <iframe
              srcDoc={previewHtml}
              className="flex-1 w-full"
              title="Contract Preview"
              sandbox="allow-same-origin"
            />
          </div>
        )}

        {/* Footer */}
        <div className="p-5 border-t border-gray-100 flex gap-3 flex-shrink-0">
          <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 rounded-lg py-2 text-sm hover:bg-gray-50 cursor-pointer">
            Cancel
          </button>
          {step === 'form' ? (
            <button
              onClick={handlePreview}
              disabled={contractMode === 'custom'
                ? !fields.contractorId || !customBody.trim() || !fields.effectiveDate
                : !fields.contractorId || !fields.role || !(fields.paymentType === 'hourly' ? fields.hourlyRate : fields.monthlyRate) || !fields.effectiveDate}
              className="flex-1 bg-[#111827] text-white rounded-lg py-2 text-sm font-medium hover:bg-gray-800 cursor-pointer disabled:opacity-40"
            >
              Preview Contract →
            </button>
          ) : (
            <button
              onClick={handleSendForSignature}
              disabled={saving}
              className="flex-1 bg-[#FF6B35] text-white rounded-lg py-2 text-sm font-medium hover:bg-[#e55a24] cursor-pointer disabled:opacity-40"
            >
              {saving ? 'Sending…' : 'Send for Signature'}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
