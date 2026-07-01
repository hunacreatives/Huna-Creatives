// Demo help content — powers the ⓘ InfoHint popovers and the first-visit tour.
// Shown ONLY in the interactive demo (gated on isDemo), so real staff never see it.
// Edit copy here in one place.

export interface HelpEntry {
  title: string;
  body: string;
}

// "What is this page for" — keyed by route. Detail routes fall back to a prefix
// match (see getPageHelp).
export const PAGE_HELP: Record<string, HelpEntry> = {
  '/hub/admin/dashboard': {
    title: 'Admin Dashboard',
    body: 'Your command center — see who is online, pending approvals, upcoming payroll, and quick stats across the whole team at a glance.',
  },
  '/hub/admin/employees': {
    title: 'Employees',
    body: 'Your full team directory. Add employees, set their pay type and schedule, and open any profile to see attendance, documents, and payout history.',
  },
  '/hub/admin/attendance': {
    title: 'Attendance',
    body: 'Live and historical time tracking. See who clocked in, raw vs. billable hours (8h daily cap), and correct any day if needed.',
  },
  '/hub/admin/requests': {
    title: 'Requests',
    body: 'General requests employees file (equipment, concerns, questions). Review and mark them resolved here.',
  },
  '/hub/admin/timeoff': {
    title: 'Time-Off',
    body: 'Approve or decline leave requests. Paid leave automatically flows into payroll as credited hours; blackout dates block non-emergency leave.',
  },
  '/hub/admin/overtime': {
    title: 'Overtime',
    body: 'Review overtime an employee logged. Approved OT is added to their daily hours and paid at the overtime rate.',
  },
  '/hub/admin/payroll': {
    title: 'Payroll',
    body: 'Run a pay cutoff: hours are pulled from attendance, capped at 8h/day, and turned into payslips. Approve, then request the fund transfer.',
  },
  '/hub/admin/payouts': {
    title: 'Payouts',
    body: 'Every generated payslip and its status — pending, approved, or paid. Open one to adjust bonuses, deductions, or reimbursements.',
  },
  '/hub/admin/announcements': {
    title: 'Announcements',
    body: 'Post company-wide notices. Employees see them on their dashboard and can react and comment.',
  },
  '/hub/admin/sop': {
    title: 'SOP Library',
    body: 'Your standard operating procedures. Publish guides employees can read anytime from their hub.',
  },
  '/hub/admin/assets': {
    title: 'Asset Access',
    body: 'Track which tools, accounts, and equipment each employee has access to.',
  },
  '/hub/admin/credentials': {
    title: 'Credentials Vault',
    body: 'Securely store client logins. Grant employees access per client; they request access and you approve.',
  },
  '/hub/admin/documents': {
    title: 'Documents',
    body: 'Generate and send documents (agreements, certificates) for employees to e-sign, and handle their document requests.',
  },
  '/hub/admin/docrequests': {
    title: 'Document Requests',
    body: 'Employee requests for official documents (COE, payment summaries). Fulfil and attach the file here.',
  },
  '/hub/admin/performance': {
    title: 'Performance',
    body: 'Record performance reviews per employee across attendance, quality, communication, and initiative.',
  },
  '/hub/admin/auditlog': {
    title: 'Audit Log',
    body: 'A trail of every important action taken in the hub — who did what and when.',
  },
  '/hub/admin/settings': {
    title: 'Settings',
    body: 'Configure the hub — company details, payroll period, and toggles like the role switcher.',
  },
  // Employee side
  '/hub/contractor/dashboard': {
    title: 'Your Dashboard',
    body: 'Your home base — clock status, hours this period, estimated pay, announcements, and who on the team is online.',
  },
  '/hub/contractor/attendance': {
    title: 'My Attendance',
    body: 'Your clock-in status today and your hours history for each pay period.',
  },
  '/hub/contractor/my-requests': {
    title: 'My Requests',
    body: 'File and track your requests, leave/time-off, and overtime — all in one place.',
  },
  '/hub/contractor/payouts': {
    title: 'My Payouts',
    body: 'Your payslips per period. Review your hours and pay, download a payslip, or flag an issue.',
  },
  '/hub/contractor/documents': {
    title: 'Documents',
    body: 'Documents assigned to you to sign, and requests you have made for official paperwork.',
  },
  '/hub/contractor/credentials': {
    title: 'Credentials',
    body: 'Client logins you have access to. Request access to others when you need it.',
  },
  '/hub/contractor/sop': {
    title: 'SOP Library',
    body: 'Company procedures and guides you can reference anytime.',
  },
};

// Key-button / control hints, referenced by id from <InfoHint id="..." />.
export const HINTS: Record<string, HelpEntry> = {
  'role-switcher': {
    title: 'Role switcher (demo only)',
    body: 'Jump between the Owner, Admin, and Employee views to see the hub from each side. This bar only exists in the demo.',
  },
  'run-payroll': {
    title: 'Run payroll',
    body: 'Opens the current cutoff and pulls everyone’s hours from attendance so you can review and generate payslips.',
  },
  'add-employee': {
    title: 'Add employee',
    body: 'Create a new team member — set their pay type, rate, schedule, and generate their agreement.',
  },
  'team-status': {
    title: 'Team status',
    body: 'A live view of who is clocked in right now, with hours logged today.',
  },
  'approvals': {
    title: 'Approvals',
    body: 'Anything waiting on you — time-off, overtime, and requests — surfaces here so nothing slips.',
  },
};

// First-visit guided tour on the admin dashboard. `anchor` matches a
// data-tour="..." attribute in the DOM; if not found, the step centers.
export interface TourStep {
  anchor?: string;
  title: string;
  body: string;
  /** Final step shows a "Book a call" primary action instead of "Got it". */
  cta?: boolean;
}

export const DASHBOARD_TOUR: TourStep[] = [
  { title: 'Welcome to Sentro 👋', body: 'This quick tour shows the main parts of the hub. You can skip anytime and explore on your own — nothing you do in the demo is saved.' },
  { anchor: 'role-switcher', title: 'Switch roles', body: 'Use this bar to view the hub as the Owner, an Admin, or an Employee. Try it after the tour.' },
  { anchor: 'sidebar', title: 'Navigation', body: 'Everything lives here — employees, attendance, payroll, time-off, documents, and more.' },
  { anchor: 'team-status', title: 'Team status', body: 'See who is online right now and how many hours they have logged today.' },
  { anchor: 'help-hint', title: 'Need a hand?', body: 'Look for the small pulsing orange dots around the hub — tap any of them to learn what a page or action does.' },
  { title: 'Ready to see it with your team?', body: 'Explore as much as you like. When you’re ready, book a free 20-minute exploration call and we’ll set Sentro up for your business.', cta: true },
];

// Resolve the help entry for the current path, with prefix fallback for
// detail routes (e.g. /hub/admin/employees/123 -> /hub/admin/employees).
export function getPageHelp(pathname: string): HelpEntry | null {
  if (PAGE_HELP[pathname]) return PAGE_HELP[pathname];
  const match = Object.keys(PAGE_HELP)
    .filter((key) => pathname.startsWith(key))
    .sort((a, b) => b.length - a.length)[0];
  return match ? PAGE_HELP[match] : null;
}
