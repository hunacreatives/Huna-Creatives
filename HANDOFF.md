# Huna Creatives Hub — Handoff Document

## What Is This?

An internal HR and operations platform for **Huna Creatives**, a small creative agency based in the Philippines. It lives at `hunacreatives.com/hub` and is used daily by the team for attendance, payroll, credentials, and communication.

**Stack:** React + Vite + TypeScript + Tailwind CSS, Supabase (Postgres + Edge Functions + Storage), deployed on Vercel. Email via Resend. Slack integration via Bot API.

**Team:**
- Francis (Owner) — approves fund transfers, has full access
- Abigail (Admin/HR) — manages payroll, contractors, credentials, announcements
- Angela, Claudette, Reese, Katleen (Contractors) — clock in/out, view payslips, request time off

---

## Features Already Built

### Authentication
- Email + password login via Supabase Auth
- Role-based access: `owner`, `admin`, `contractor`
- Separate layouts per role (admin sidebar vs contractor sidebar)

### Attendance
- Contractors type `on` / `off` in a designated Slack channel
- Hourly contractors reply to their `on` thread with hours worked (e.g. reply `8`)
- Overtime logged via `overtime` thread messages
- System reads Slack via edge function (`slack-attendance`), stores to `hub_daily_hours`
- 18-hour rolling window — supports overnight shifts (e.g. 11pm–7am)
- No hours cap for hourly contractors (they self-report their hours)
- Wall-clock cap of 24h for on/off punch sessions
- Admin attendance page shows full team history

### Dashboard
- Admin: team status (online / logged off / not in yet), payroll period summary, birthday alerts, pending time-off requests, quick actions
- Contractor: personal clock widget with world clocks, hours worked this period, announcements feed, upcoming time off

### Payroll
- Two pay types: **fixed monthly** (split semi-monthly) and **hourly**
- Supports **PHP and USD** contractors (live exchange rate via exchangerate-api.com)
- USD pay shown as: `Xh × $Y/hr = $Z USD × ₱rate`
- HR workflow: review period → approve individual payslips → request fund transfer → owner approves
- **Email notifications:**
  - Owner (`francisfielroble@gmail.com`) gets email when HR requests fund transfer
  - Abigail (`duterteabigaile@gmail.com`) gets email when owner approves transfer
  - Contractor gets branded payslip email (via Resend) when marked as paid
- Payslip email: invoice number, pay period, attendance summary, earnings breakdown, adjustments
- **Adjustments:** HR can add bonuses, deductions, referral fees per contractor per period
- **Row edit:** HR can manually override hours and pay; changing hours auto-computes pay
- Prorated pay for rate changes mid-period
- Batch system: fund transfers grouped into batches with `pending_owner` → `owner_approved` workflow

### Credentials Vault
- Admin stores client credentials: email/password, OTP, SSO, API key types
- Grouped by client, collapsible
- Contractors see a catalog (no passwords) and can request access with a reason
- Admin/owner approves or denies requests — section always visible
- Notification bell alerts admin when a new request is pending

### Announcements
- Admin creates announcements with priority (normal / important / urgent) and category (payroll / meeting / holiday / policy / general)
- Contractor view shows poster's name, photo, and role
- Expandable cards with category filter tabs

### Time Off
- Contractors submit time-off requests with type and date range
- Admin reviews and approves/rejects
- Notifications sent both ways

### Requests
- Contractors submit general requests/issues (open tickets)
- Admin can mark as in review or resolved

### Documents
- Contractors can view/download HR documents uploaded by admin

### Contractor Profiles
- Each contractor has a profile with personal info, emergency contact, bank details, birthday, start date, rate, payment method
- Photo upload to Supabase Storage
- Admin can edit all fields via Edit Contractor modal
- Contractors can edit their own contact info and password

### Notification Bell
- **Admins see:** new comments, pending time-off requests, open general requests, pending credential access requests, fund transfers awaiting approval, submitted payslips
- **Contractors see:** new announcements, payout status updates (approved / paid), owner-approved fund transfers, time-off decisions, request status updates

### Birthday Slack Greetings
- Edge function (`slack-birthday`) checks for birthdays daily at 9am PH time (via pg_cron)
- Posts to Slack channel `C0830PCJB4P` with a GIF and custom-written copy per team member
- Custom copy written for: Angela, Claudette, Reese, Abigail
- Falls back to a personalized generic message for future hires

### Payouts (Contractor View)
- Contractors see their payout history, status, and can view payslip breakdown per period

---

## Known Limitations / Things to Be Aware Of

- **Slack hours are per-session** — if a contractor logs a multi-day total in one thread reply, it goes into one daily record. Best practice: log daily.
- **rowOverrides are in-memory** — payroll row edits reset on page refresh unless saved. Always hit Save on the edit modal before refreshing.
- **Birthday SQL not yet run** for Angela, Claudette, Abigail — needs to be executed in Supabase SQL Editor.
- **pg_cron for birthday** needs to be set up manually in Supabase SQL Editor (SQL provided in `supabase/migrations/20260521000001_birthday_cron.sql`).
- **Reese's historical hours (May 16–21)** need to be manually corrected via SQL (32h distributed across 6 days).

---

## Features I'd Suggest Adding Next

### High Priority
1. **Contractor onboarding flow** — when a new contractor is invited, walk them through setting up their profile, uploading a photo, and confirming their bank details before they can access the hub
2. **Overtime approval** — currently overtime is just logged; add a step where the contractor requests OT and the admin pre-approves before it's logged
3. **Payslip dispute / flag** — let contractors flag a payslip if they disagree with the hours or amount, with a text field for the reason, so HR can review
4. **Push/in-app notifications** — the bell only updates on page load; add Supabase Realtime subscriptions so it updates live without refreshing
5. **Hours summary per contractor** — a page showing total hours logged per week/month with a chart, so both admin and contractor can track pace vs expected hours

### Medium Priority
6. **Leave balance tracker** — track how many vacation/sick days each contractor has used vs. their allowance per year
7. **Performance notes** — let admin attach private notes per contractor per period (e.g. "great output this sprint") that build a history log
8. **Announcement comments** — contractors can already react; let them reply/comment on announcements for discussion
9. **Contractor-to-admin direct message** — lightweight internal messaging so contractors don't need to go to Slack for HR questions
10. **Payroll export to CSV/PDF** — export the full payroll table for a period for accounting records
11. **Rate change history UI** — currently stored in DB; surface it in the contractor detail page so admin can see a timeline of rate changes

### Nice to Have
12. **Mobile-responsive redesign** — the hub is desktop-first; some contractors may access on phone
13. **Calendar view for time off** — show approved leaves on a monthly calendar so admin can spot coverage gaps
14. **Automated birthday message via email** in addition to Slack — some contractors may not be on Slack on their birthday
15. **Client project tagging for hours** — let contractors tag which client/project their hours are for, so the agency can track hours per client
16. **Two-factor authentication** — especially important for the credentials vault given it holds client passwords

---

## Tech Reference

| Thing | Detail |
|---|---|
| Supabase project | `aaqpwobmfofztcbbsonw` |
| Production URL | `hunacreatives.com/hub` |
| GitHub repo | `hunacreatives/Huna-Creatives` |
| Deploy | Vercel (auto-deploy on push to `main`) |
| Email | Resend, from `payroll@hunacreatives.com` |
| Slack channel (attendance) | `C0830PCGQK1` |
| Slack channel (announcements/birthday) | `C0830PCJB4P` |
| Edge functions | `send-payslip`, `notify-owner`, `slack-attendance`, `slack-birthday` |
| Secrets needed | `RESEND_API_KEY`, `SLACK_BOT_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY` |
