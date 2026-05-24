# Crewly / Huna Hub — ChatGPT Handoff Document

> This document gives you full context on the internal operations hub built and used by Huna Creatives. It is also sold externally as **Crewly** (hunacreatives.com/crewly) — a custom hub-as-a-service for other firms and teams.

---

## 1. What It Is

A custom internal operations hub for managing a team of contractors (or employees). Built in-house by Huna Creatives, running on their own team, and now sold as a managed product to other firms.

**Two audiences:**
- **Huna Creatives** — uses it daily to manage their own contractors
- **Other firms** — buy a custom-configured version under their own brand (Crewly)

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, React Router 7, TypeScript, TailwindCSS, Framer Motion |
| Backend | Supabase (PostgreSQL + Auth + Storage + Edge Functions) |
| Build | Vite 7 |
| Deployment | Vercel (frontend), Supabase Cloud (backend) |
| Email | Resend API (`billing@hunacreatives.com`, `hello@hunacreatives.com`) |
| Notifications | Slack API (DMs via `conversations.open` + `chat.postMessage`) |
| i18n | i18next (browser language detection) |

**Project root:** `/Users/francisfielroble/Huna-Creatives`
**Supabase project ID:** `aaqpwobmfofztcbbsonw`
**Live URL:** `https://www.hunacreatives.com`

---

## 3. User Roles

| Role | Access |
|---|---|
| `owner` | Full access — payroll approval, all admin functions |
| `admin` | HR-level access — manage contractors, attendance, payroll, docs |
| `contractor` | Self-service — punch in/out, view payslips, sign docs, request time off |

Auth is Supabase email/password. RLS policies enforce role-based data isolation. Contractors can only read/edit their own records.

---

## 4. Payment Types

Each contractor has one of four payment types stored in `hub_users.payment_type`:

| Type | Description |
|---|---|
| `hourly` | Paid per logged hour at their hourly rate |
| `fixed` | Fixed monthly salary, split into two half-month periods |
| `fixed_flexible` | Fixed base + hourly OT rate for overtime |
| `project_based` | Paid a % cut of each project's revenue — no attendance tracking |

**Important:** Project-based contractors are excluded from:
- Attendance tracking (punch in/out)
- Payroll (hourly/fixed calculations)
- Sidebar nav items (Attendance, Time-Off, Overtime, Requests)

---

## 5. Database Tables

### Users & Auth
- **`hub_users`** — Core user profiles. Columns: `id` (UUID, refs auth.users), `full_name`, `email`, `role`, `avatar_url`, `phone`, `address`, `emergency_contact_name`, `emergency_contact_relationship`, `emergency_contact_phone`, `slack_username`, `slack_id`, `department`, `start_date`, `birthday`, `status` (active|inactive), `payment_type`, `project_percentage`, `hourly_rate`, `monthly_rate`, `currency`, `payment_method`, `bank_name`, `bank_account_name`, `bank_account_number`, `bank_account_type`, `notes`, `onboarding_completed`, `shift_start`, `shift_end`, `work_days[]`
- **`hub_admin_invites`** — Invite tokens for new contractor signups

### Attendance
- **`hub_attendance`** — Daily punch records. Columns: `contractor_id`, `date`, `on_time`, `off_time`, `total_hours`, `status` (complete|missing_on|missing_off|manual_adjustment)
- **`hub_overtime_requests`** — Overtime requests. Status: pending|approved|rejected

### Time & Requests
- **`hub_time_off`** — Leave requests. Type: vacation|sick|emergency|unpaid|other. Status: pending|approved|rejected
- **`hub_requests`** — General requests (equipment, access, etc.). Status: open|in_review|resolved|closed

### Payroll
- **`hub_payouts`** — Individual payout records per contractor per period. Columns: `cutoff_start`, `cutoff_end`, `approved_hours`, `hourly_rate`, `base_pay`, `bonus`, `incentives`, `reimbursements`, `deductions`, `advances`, `penalties`, `final_payout`, `receipt_url`, `status` (draft|submitted|hr_approved|paid), `locked`, `batch_id`
- **`hub_payroll_batches`** — Groups payouts into approvable batches. Status: pending_owner|owner_approved
- **`hub_rate_history`** — Historical rate changes per contractor with effective dates
- **`hub_payslip_disputes`** — Disputes on payslips. Status: open|resolved
- **`hub_payroll_cache`** — Cached payroll calculations for performance

### Clients & Projects
- **`hub_clients`** — Client accounts assigned to contractors. Status: active|inactive|paused|ended
- **`hub_client_assignments`** — Many-to-many: clients ↔ contractors
- **`hub_projects`** — Projects with client name, service, contract price, deadline. Status: ongoing|completed|paused|cancelled
- **`hub_project_contractors`** — Contractor assignment to project with % cut or fixed payout. Status: pending|approved|paid
- **`hub_project_payments`** — Payments received for a project
- **`hub_project_costs`** — Operational costs deducted from a project
- **`hub_project_contractor_payouts`** — Individual payout records per project-contractor

### Documents & Credentials
- **`hub_sign_documents`** — Documents for signing (generated or uploaded)
- **`hub_sign_assignments`** — Which contractors need to sign which documents. Status: pending|signed
- **`hub_doc_requests`** — Contractor requests for documents (COE, payslip, etc.)
- **`hub_credentials`** — Platform credentials stored securely. Login type: email_password
- **`hub_credential_requests`** — Requests to access stored credentials

### Content & Communication
- **`hub_announcements`** — Internal announcements. Priority: normal|important|urgent. Category: general|payroll|meeting|holiday|policy
- **`hub_sop`** — Standard Operating Procedures. Has title, category, content, video_url, file_url
- **`hub_assets`** — Platform access/equipment assigned to contractors. Status: active|revoked|pending

### Public & Questionnaires
- **`hub_questionnaires`** — Client intake forms. Status: draft|sent|submitted. Has `questions` (JSONB array) and `answers` (JSONB). Accessed publicly via a unique `token` (UUID) — no auth required
- Question types: `short_text`, `paragraph`, `single_choice`, `multi_choice`

### System
- **`hub_audit_log`** — Immutable log of all admin actions. Columns: `actor_id`, `actor_name`, `action`, `entity_type`, `entity_id`, `description`, `metadata` (JSONB)
- **`hub_settings`** — Key-value settings store. Current keys: `usd_rate` (manual PayPal rate for USD contractor conversion)

---

## 6. Hub Pages & Routes

### Admin (`/hub/admin/*`)
| Route | Page |
|---|---|
| `/hub/admin/dashboard` | Overview — team stats, punch status, pending items |
| `/hub/admin/contractors` | List all contractors |
| `/hub/admin/contractors/:id` | Contractor detail — profile, attendance, payslip, contracts, rate history |
| `/hub/admin/attendance` | Daily attendance table across all contractors |
| `/hub/admin/payroll` | Payroll processing — calculate, review, approve batches |
| `/hub/admin/payouts` | Payout log history |
| `/hub/admin/projects` | Project management — invoices, payouts, contractor cuts |
| `/hub/admin/clients` | Client list |
| `/hub/admin/questionnaires` | Create/send/view client questionnaire responses |
| `/hub/admin/documents` | Document generation & signing management |
| `/hub/admin/credentials` | Platform credentials vault |
| `/hub/admin/timeoff` | Review time-off requests |
| `/hub/admin/requests` | Review general requests |
| `/hub/admin/overtime` | Review overtime requests |
| `/hub/admin/announcements` | Create/schedule announcements |
| `/hub/admin/sop` | SOP library management |
| `/hub/admin/assets` | Asset/platform access management |
| `/hub/admin/docrequests` | Document requests from contractors |
| `/hub/admin/auditlog` | Audit trail |
| `/hub/admin/settings` | System settings (USD rate, etc.) |

### Contractor (`/hub/contractor/*`)
| Route | Page |
|---|---|
| `/hub/contractor/dashboard` | Personal dashboard — schedule, recent attendance, announcements |
| `/hub/contractor/attendance` | Punch in/out, view own attendance log |
| `/hub/contractor/payouts` | Own payout history + payslip details |
| `/hub/contractor/timeoff` | Submit & track time-off requests |
| `/hub/contractor/requests` | Submit general requests |
| `/hub/contractor/overtime` | Submit overtime requests |
| `/hub/contractor/clients` | View assigned clients |
| `/hub/contractor/projects` | View assigned projects + payout status |
| `/hub/contractor/documents` | View & sign assigned documents |
| `/hub/contractor/credentials` | Request access to platform credentials |
| `/hub/contractor/sop` | Read SOPs |
| `/hub/contractor/announcements` | View announcements |
| `/hub/contractor/profile` | Edit own profile + upload photo + change password |
| `/hub/contractor/onboarding` | First-time onboarding flow |

### Public
| Route | Description |
|---|---|
| `/q/:token` | Public questionnaire form — no auth required, accessed via UUID token |

### Marketing
| Route | Description |
|---|---|
| `/crewly` | Crewly landing page (also `/for-agencies`) |

---

## 7. Edge Functions

All deployed to Supabase. Called via `supabase.functions.invoke(name, { body })`.

| Function | What it does |
|---|---|
| `invite-contractor` | Creates hub_users record + sends Supabase auth invite email |
| `send-invoice` | Generates HTML invoice and sends via Resend. Params: `cc`, `subject`, `message`, `due_date`, `invoice_number` |
| `send-payslip` | Emails payslip to contractor via Resend |
| `send-questionnaire` | Emails questionnaire link to client. Link: `hunacreatives.com/q/{token}` |
| `notify-questionnaire-submitted` | Slack DM to Abigail (U091BL9PQ77) and Francis (U0838LWSY4E) when a questionnaire is submitted |
| `notify-contractor-payment` | Emails payment receipt to contractor |
| `notify-announcement` | Pushes announcement notifications |
| `notify-owner` | Notifies owner of important events |
| `notify-batch-approved` | Notifies when payroll batch is approved |
| `notify-payslip-submitted` | Notifies on payslip submission |
| `notify-contract-assigned` | Notifies when a contract is assigned |
| `slack-attendance` | Posts attendance updates to Slack |
| `slack-birthday` | Birthday notifications to Slack |
| `slack-anniversary` | Work anniversary notifications to Slack |
| `slack-interactivity` | Handles Slack interactive callbacks (returns 200 — required for button blocks) |
| `slack-onboarding` | Posts onboarding messages to Slack |
| `remind-attendance` | Cron — reminds contractors to punch in |
| `publish-scheduled-announcements` | Cron — publishes announcements at scheduled time |
| `send-signed-contract` | Emails signed contract PDF |

---

## 8. Storage Buckets

| Bucket | Access | Use |
|---|---|---|
| `avatars` | Public | Profile photos. Max 5MB. JPEG/PNG/WebP/GIF. Path: `{user_id}/avatar.{ext}` |

Documents, signed contracts, and attachments are also stored but policies vary.

---

## 9. Slack Integration

**Bot token:** Stored as `SLACK_BOT_TOKEN` env var in Supabase.

**Key user IDs:**
- Abigail: `U091BL9PQ77`
- Francis: `U0838LWSY4E`

**DM flow:**
1. Call `conversations.open` with user ID → get channel ID
2. Call `chat.postMessage` with channel ID and blocks

**Important:** Any `actions` block in Slack messages requires an interactivity URL to be configured in the Slack app. This is handled by the `slack-interactivity` edge function (just returns 200). Interactivity URL: `https://aaqpwobmfofztcbbsonw.supabase.co/functions/v1/slack-interactivity`

---

## 10. Payroll Logic

**Pay periods:** 1st–15th and 16th–end of month (semi-monthly)

**Calculation per contractor:**
- `hourly`: `capped_hours × hourly_rate` + overtime
- `fixed`: `monthly_rate / 2` per period + overtime
- `fixed_flexible`: `monthly_rate / 2` + `overtime_hours × hourly_rate`
- `project_based`: Not in payroll — paid per project payout

**USD contractors:** Pay is calculated in USD then converted using `usd_rate` from `hub_settings` (set manually from PayPal rate before processing).

**Payroll flow:**
1. Admin opens payroll page, selects period
2. System calculates pay per contractor based on attendance
3. Admin reviews and approves individual payouts
4. Creates a batch → owner approves
5. Payouts marked as paid, payslips emailed

**Rate changes mid-period:** System detects rate changes and prorates pay — days at old rate + days at new rate.

---

## 11. Questionnaire System

**Service templates:** Website Design, Graphic Design / Flyer, Branding & Identity, Social Media Management, SEO / Digital Ads, Custom Hub / Web App

**Pricing options per service:**
- Website Design: ₱60k–₱100k, ₱100k–₱200k, ₱200k–₱500k, ₱500k+, specific budget (text field), Let's discuss
- Branding & Identity: ₱15k–₱25k, ₱25k–₱50k, ₱50k+, Let's discuss
- Social Media Management: ₱12k–₱20k/mo, ₱20k–₱35k/mo, ₱35k+/mo, Let's discuss (management fee) + separate ad budget question
- SEO / Digital Ads: Under ₱5k, ₱5k–₱15k, ₱15k–₱30k, ₱30k+, Let's discuss (monthly ad budget)
- Custom Hub / Web App: Under ₱50k, ₱50k–₱150k, ₱150k–₱300k, ₱300k+, Let's discuss
- Graphic Design: No budget question

**Flow:**
1. Admin creates questionnaire → selects service type → picks client → customize/review questions → save as draft
2. Admin sends → generates UUID token → emails form link to client
3. Client fills form at `hunacreatives.com/q/{token}` (no auth needed)
4. On submit → DB updated to `submitted` → Slack DM sent to Abigail + Francis

---

## 12. Crewly (The Product)

The same hub is sold to other firms as **Crewly by Huna Creatives**.

**Landing page:** `hunacreatives.com/crewly`

**Positioning:** Custom operations hub for any firm, office, or team — built around their specific workflow. Not a generic SaaS template.

**Pricing model:**
| Plan | Setup (one-time) | Monthly base | Seats |
|---|---|---|---|
| Starter | ₱15,000 | ₱4,999/mo | 5 included + per seat |
| Growth | ₱30,000 | ₱9,999/mo | 10 included + per seat |
| Enterprise | Custom | Custom | Unlimited |

Per-seat pricing is discussed in the demo call based on team size. Not shown publicly.

**What "custom" means:** Discovery call → map their workflow → build the hub around their structure (roles, payment types, departments, modules needed) → brand it with their logo and colors → onboard their team.

---

## 13. Key Conventions & Gotchas

- **Project-based contractors** are excluded from attendance, payroll, and the attendance/time-off/overtime/requests sidebar items
- **`hub_settings.usd_rate`** must be updated manually before processing payroll with USD contractors — it defaults to 56 and should be set to the current PayPal rate
- **Payroll periods** are hardcoded as semi-monthly (1–15, 16–end). Payroll page has a period selector
- **Rate history** is separate from `hub_users` rates — always use `hub_rate_history` for historical accuracy in payroll. The `hub_users` rate is the current/live rate
- **Questionnaire tokens** are UUIDs — security by obscurity (no auth on public form). Anon Supabase client can read/update `hub_questionnaires` where token matches
- **Avatar uploads** go to `avatars/{user_id}/avatar.{ext}` with upsert — always overwrites previous photo
- **Audit log** is written via `logAudit()` in `src/lib/audit.ts` — call it for any significant admin action
- **Slack buttons** in messages require interactivity to be configured — use mrkdwn links for simple URLs, `actions` blocks only if you have a handler

---

## 14. Environment Variables

Set in Supabase dashboard (Edge Function secrets):

| Variable | Used by |
|---|---|
| `SLACK_BOT_TOKEN` | All slack-* and notify-* functions |
| `RESEND_API_KEY` | send-invoice, send-payslip, send-questionnaire, notify-contractor-payment |
| `SUPABASE_URL` | Auto-injected |
| `SUPABASE_ANON_KEY` | Auto-injected |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-injected |

Frontend env (`.env`):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
