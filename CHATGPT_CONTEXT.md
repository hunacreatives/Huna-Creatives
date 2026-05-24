# What You're Helping With — Full Context for ChatGPT

You are helping Francis (founder of Huna Creatives) build and maintain an internal operations hub called **Huna Hub**, which is also sold externally as a product called **Crewly**. This document gives you everything you need to understand what the system is, what it does, how it's built, and how to help effectively.

---

## The Big Picture

**Huna Creatives** is a digital agency based in the Philippines. They have a team of contractors (not full-time employees) who work across design, content, social media, media buying, tech, SEO, and account management. Managing this team — attendance, payroll, documents, requests, credentials — used to be scattered across spreadsheets and manual processes.

Francis built a custom internal operations hub to manage all of that in one place. It's called **Huna Hub** internally. After building it and running it on their own team, they realized other firms have the same problem — so they productized it and now sell it under the brand **Crewly** (hunacreatives.com/crewly).

**Crewly is not a SaaS template.** It's a managed custom build. Each client gets a hub built specifically around their workflow, their roles, their modules — branded with their logo and colors. Huna Creatives builds it, deploys it, and maintains it.

---

## What the Hub Actually Does

Think of it as an internal HR + operations platform for a small-to-medium firm. Here's what it covers:

### 1. Contractor / Employee Management
Every team member has a profile with: name, photo, contact info, emergency contacts, department, role, start date, birthday, Slack username, payment details, bank account, and notes. Admins can invite new contractors via email, edit their profiles, upload their photo, and manage their status (active/inactive).

### 2. Attendance Tracking
Contractors punch in and punch out through the hub. The system records their on-time, off-time, total hours, and status (complete, missing punch, manual adjustment). Admins can view the full attendance log across all contractors, see who is in and who isn't on any given day, and make manual corrections. A cron job reminds contractors to punch in.

### 3. Payroll Processing
This is the most complex part of the hub. The system calculates pay semi-monthly (1st–15th and 16th–end of month) for each contractor based on their payment type:

- **Hourly** — paid per logged hour at their hourly rate
- **Fixed Monthly** — paid a fixed monthly salary split in half each period
- **Fixed Flexible** — fixed base salary plus an hourly OT rate for overtime hours
- **Project Based** — paid a percentage cut of project revenue; NOT included in regular payroll

The system detects mid-period rate changes and prorates pay automatically. It handles USD contractors by converting at a manually set PayPal exchange rate. Admin reviews each contractor's calculated pay, can override hours or amounts, add bonuses, deductions, reimbursements, advances, or penalties. Payouts are batched, sent to the owner for final approval, then marked as paid and payslips are emailed to each contractor.

### 4. Time Off & Overtime Requests
Contractors submit time-off requests (vacation, sick, emergency, unpaid, other) and overtime requests through the hub. Admins review and approve or reject them. The system tracks everything in a log.

### 5. Document Management & Signing
Admins can upload documents or generate them and assign them to specific contractors for e-signature. Contractors see their pending documents and sign them in the hub. Signed contracts are emailed automatically.

### 6. Credentials Vault
Platform login credentials (social media accounts, tools, client accounts) are stored securely in the hub. Contractors can request access to specific credentials. Admins approve or deny. This replaces sharing passwords over Slack.

### 7. Client & Project Management
The hub tracks clients and their assigned contractors. It also manages projects — each project has a contract price, service type, deadline, and status. Contractors can be assigned to projects with either a percentage cut or a fixed payout. When the client pays, the system calculates each contractor's share after deducting operational costs. Project-based payouts have their own approval and payment flow.

### 8. Announcements & SOPs
Admins can create internal announcements (normal, important, urgent) in categories like payroll, meetings, holidays, or policy. Announcements can be scheduled. Contractors see them on their dashboard. The hub also has a Standard Operating Procedures (SOP) library — admins maintain it, contractors read it.

### 9. Assets & Platform Access
Tracks what software, equipment, or platform access is assigned to each contractor — with status (active, revoked, pending).

### 10. Client Questionnaires
When a new client inquiry comes in, admins create a questionnaire based on the service type (website design, branding, social media management, etc.) and send it to the client via email. The client fills it out at a public URL with no login required. When they submit, Francis and Abigail (co-founder) get a Slack notification with a button to view the responses. This replaces back-and-forth email intake.

### 11. Audit Log
Every significant admin action is logged with who did it, what they did, and when. Immutable record of changes across the system.

### 12. General Requests
Contractors can submit general requests — equipment, access, tools, anything. Admins track and resolve them.

---

## Who Uses It

There are three user roles:

- **Owner** — full access. Approves payroll batches. Can do everything.
- **Admin** — HR-level access. Manages contractors, attendance, payroll, docs, requests.
- **Contractor** — self-service. Punches in/out, views their own payslips, signs documents, submits requests and time off.

Contractors only see and edit their own data. Role-Based Access Control is enforced at the database level via Supabase RLS policies.

---

## Tech Stack

- **Frontend:** React 19, React Router 7, TypeScript, TailwindCSS, Framer Motion
- **Backend:** Supabase — PostgreSQL database, Supabase Auth (email/password), Supabase Storage (profile photos), Supabase Edge Functions (serverless backend logic)
- **Build tool:** Vite 7
- **Frontend deployment:** Vercel (auto-deploys from GitHub main branch)
- **Backend:** Supabase Cloud (project ID: `aaqpwobmfofztcbbsonw`)
- **Email:** Resend API (from `billing@hunacreatives.com` and `hello@hunacreatives.com`)
- **Notifications:** Slack API — DMs sent via `conversations.open` + `chat.postMessage`
- **Live URL:** https://www.hunacreatives.com (hub lives at `/hub/*`)
- **Project root on dev machine:** `/Users/francisfielroble/Huna-Creatives`

---

## Database

All tables are prefixed with `hub_`. Key tables:

| Table | What it stores |
|---|---|
| `hub_users` | All user profiles — contractors, admins, owners |
| `hub_attendance` | Daily punch records |
| `hub_overtime_requests` | Overtime requests |
| `hub_time_off` | Leave requests |
| `hub_requests` | General requests |
| `hub_payouts` | Individual payout records per contractor per period |
| `hub_payroll_batches` | Groups payouts into batches for owner approval |
| `hub_rate_history` | Historical rate changes with effective dates |
| `hub_payslip_disputes` | Contractor disputes on payslips |
| `hub_clients` | Client accounts |
| `hub_client_assignments` | Which contractors are assigned to which clients |
| `hub_projects` | Projects with contract price, service, deadline |
| `hub_project_contractors` | Contractor assignment to project with % cut |
| `hub_project_payments` | Payments received for a project |
| `hub_project_costs` | Operational costs per project |
| `hub_project_contractor_payouts` | Payout records per project-contractor |
| `hub_sign_documents` | Documents for signing |
| `hub_sign_assignments` | Which contractors need to sign which document |
| `hub_doc_requests` | Contractor requests for documents (COE, payslip, etc.) |
| `hub_credentials` | Stored platform credentials |
| `hub_credential_requests` | Requests to access credentials |
| `hub_announcements` | Internal announcements |
| `hub_sop` | Standard Operating Procedures |
| `hub_assets` | Platform access / equipment assigned to contractors |
| `hub_questionnaires` | Client intake questionnaires |
| `hub_audit_log` | Immutable admin action log |
| `hub_settings` | Key-value settings (e.g. `usd_rate` for payroll conversion) |
| `hub_admin_invites` | Invite tokens for contractor signup |

---

## Edge Functions (Serverless Backend)

All deployed on Supabase. Called from the frontend via `supabase.functions.invoke()`.

| Function | Purpose |
|---|---|
| `invite-contractor` | Creates user record + sends Supabase auth invite email |
| `send-invoice` | Generates and emails an HTML invoice via Resend |
| `send-payslip` | Emails payslip to contractor via Resend |
| `send-questionnaire` | Emails questionnaire link to client |
| `notify-questionnaire-submitted` | Slack DM to Abigail + Francis when client submits questionnaire |
| `notify-contractor-payment` | Emails payment receipt to contractor |
| `notify-announcement` | Pushes announcement notifications |
| `notify-owner` | Notifies owner of important events |
| `notify-batch-approved` | Notifies when payroll batch is approved |
| `notify-payslip-submitted` | Notifies on payslip submission |
| `notify-contract-assigned` | Notifies contractor when document is assigned for signing |
| `slack-attendance` | Posts attendance updates to Slack |
| `slack-birthday` | Birthday Slack notifications |
| `slack-anniversary` | Work anniversary Slack notifications |
| `slack-interactivity` | Handles Slack interactive callbacks (returns 200 — required for button blocks) |
| `slack-onboarding` | Posts onboarding messages to Slack |
| `remind-attendance` | Cron — reminds contractors to punch in |
| `publish-scheduled-announcements` | Cron — publishes scheduled announcements |
| `send-signed-contract` | Emails signed contract PDF |

---

## Important Business Rules

1. **Project-based contractors** are excluded from attendance tracking, regular payroll, and the attendance/time-off/overtime/requests navigation items. They are paid via the project payout flow instead.

2. **USD contractors** — some contractors are paid in USD. Payroll converts their pay to PHP using a manually set exchange rate (`usd_rate` in `hub_settings`). Admin must update this to the current PayPal rate before processing payroll each period.

3. **Rate history** — when an admin changes a contractor's rate, the old rate is saved to `hub_rate_history` with an effective date. The payroll engine uses this history to prorate pay correctly if a rate changed mid-period.

4. **Payroll periods** are hardcoded as semi-monthly: 1st–15th and 16th–end of month.

5. **Questionnaire access** is public — no login required. Clients get a URL like `hunacreatives.com/q/{uuid-token}`. Security is by obscurity (hard-to-guess UUID token).

6. **Slack buttons** — any Slack message using an `actions` block with a button requires an interactivity URL configured in the Slack app. This is handled by the `slack-interactivity` edge function (just returns 200). Interactivity URL: `https://aaqpwobmfofztcbbsonw.supabase.co/functions/v1/slack-interactivity`

7. **Audit log** — call `logAudit()` from `src/lib/audit.ts` for any significant admin action. It records: actor, action, entity type, entity ID, description, and optional metadata.

8. **Avatar uploads** go to `avatars/{user_id}/avatar.{ext}` in Supabase Storage with upsert — always overwrites previous photo.

---

## Crewly — The Product

The same hub system is sold to other firms as **Crewly by Huna Creatives**.

- **Landing page:** hunacreatives.com/crewly
- **What it is:** A custom internal operations hub built around a specific firm's workflow. Not a SaaS product — it's a done-for-you custom build.
- **Process:** Discovery call → map their workflow → build the hub around their structure → brand it with their logo/colors → onboard their team → maintain it monthly.
- **Who it's for:** Any firm, office, or team that manages people and needs to track attendance, pay, documents, and internal operations — not just agencies.

**Pricing:**

| Plan | Setup (one-time) | Monthly base |
|---|---|---|
| Starter | ₱15,000 | ₱4,999/mo |
| Growth | ₱30,000 | ₱9,999/mo |
| Enterprise | Custom | Custom |

Per-seat pricing is discussed during the demo call based on team size. It is not shown publicly.

---

## Slack Integration Details

**Bot token:** `SLACK_BOT_TOKEN` env var in Supabase.

**Key Slack user IDs:**
- Abigail (co-founder): `U091BL9PQ77`
- Francis (founder): `U0838LWSY4E`

**DM flow:**
1. Call `conversations.open` with the user's Slack ID → returns a channel ID
2. Call `chat.postMessage` with that channel ID and the message blocks

---

## Environment Variables

**Supabase Edge Function secrets:**
- `SLACK_BOT_TOKEN`
- `RESEND_API_KEY`
- `SUPABASE_URL` (auto-injected)
- `SUPABASE_ANON_KEY` (auto-injected)
- `SUPABASE_SERVICE_ROLE_KEY` (auto-injected)

**Frontend `.env`:**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

---

## How to Help

When Francis asks you to build something new or fix a bug, assume:
- All new pages go under `src/pages/hub/admin/` (for admin) or `src/pages/hub/contractor/` (for contractor)
- New routes are registered in `src/router/config.tsx`
- Database access always uses the `supabase` client from `src/lib/supabase.ts`
- New Edge Functions go in `supabase/functions/{function-name}/index.ts` and are deployed with `supabase functions deploy {function-name}`
- Styling is TailwindCSS — primary brand color is `#FF6B35` (orange)
- Significant admin actions should call `logAudit()` from `src/lib/audit.ts`
- TypeScript types for database records are in `src/lib/types.ts`
