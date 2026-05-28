# Sentro Hub Deploy And Smoke Checklist

## Fresh Deploy

1. Provision a Supabase project and set these secrets before deploying functions:
   `SUPABASE_URL`
   `SUPABASE_SERVICE_ROLE_KEY`
   `SUPABASE_ANON_KEY`
   `RESEND_API_KEY`
   Any Slack, Drive, payment, or storage secrets used by your enabled functions
2. Apply every migration in `supabase/migrations` in timestamp order.
3. Deploy all edge functions in `supabase/functions`.
4. Invoke `seed-demo-workspace` once to create a usable demo workspace with real auth users.
5. Confirm every function directory contains an `index.ts` file before deployment.

## Demo Credentials

After `seed-demo-workspace` succeeds, these users should exist with password `SentroDemo2026!`:

- `demo-owner@sentrohub.local`
- `demo-admin@sentrohub.local`
- `demo-ava@sentrohub.local`
- `demo-liam@sentrohub.local`

## Smoke Test

### Auth

- Log in as `demo-admin@sentrohub.local` and verify redirect to `/hub/admin/dashboard`.
- Log in as `demo-ava@sentrohub.local` and verify redirect to `/hub/contractor/dashboard`.
- Attempt to open an admin route as a contractor and confirm the user is redirected away.
- Attempt to open a contractor route as an admin and confirm the user is redirected away.

### Contractor Flows

- `Invite/signup`
  Use a real invited user in a live environment and confirm password setup completes.
- `Onboarding`
  Open `/hub/contractor/onboarding` for a contractor with onboarding disabled and confirm redirect behavior.
- `Attendance`
  Verify seeded daily hours render in contractor and admin views.
- `Time off`
  Confirm the approved and forwarded seeded requests render with correct statuses and balances.
- `Requests`
  Confirm the seeded internal request appears for both contractor and admin.
- `Payouts`
  Confirm the seeded `hr_approved` payout appears in contractor and admin payroll views.
- `Documents`
  Confirm the seeded contract assignment and document request appear.
- `Projects`
  Confirm the seeded client, project, payout progress, and payment summaries render.

### Admin Flows

- `Dashboard`
  Verify announcements, requests, and hub metrics load without errors.
- `Attendance`
  Confirm the historical table loads and editing modal opens.
- `Payroll`
  Confirm seeded payout state appears and actions render.
- `Time off`
  Confirm forwarded requests can be reviewed and blackout dates render.
- `Clients`
  Confirm team assignments render for seeded clients.
- `Contracts`
  Confirm the seeded sign document assignment is visible.

## Local Verification Completed In This Repo

- `npm run type-check`
- `npm run build`

## Known Environment Limitation

Full end-to-end workflow execution was not possible in this workspace because no live Supabase project configuration or mail/storage secrets were attached locally. The checklist above is the required live-environment pass before agency rollout.
