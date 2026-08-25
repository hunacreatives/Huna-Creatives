-- Close the reads that matter more than the project data.
--
-- The live pg_policies dump turned up exposures the first pass never
-- catalogued. Every one of these is readable by ANY authenticated account:
--
--   hub_credentials      "Hub members can view credentials"  auth.uid() is not null
--   hub_rate_history     "Authenticated can view rate history"  true
--   hub_payroll_batches  "Authenticated can view batches"  true
--   hub_payroll_cache    "Authenticated can view payroll cache"  true
--   hub_payroll_runs     "Admins read runs"  auth.uid() is not null  (misnamed)
--
-- Stored client credentials, everyone's pay rates, and company-wide payroll
-- totals. Worse than the project tables 20260825000001 deals with.
--
-- Run 20260825000001 first: this file depends on is_hub_staff() from it.

-- ---------------------------------------------------------------------------
-- Pay rates -- yours only.
-- ---------------------------------------------------------------------------

drop policy if exists "Authenticated can view rate history" on hub_rate_history;
create policy "Contractors read their own rate history" on hub_rate_history
  for select to authenticated
  using (is_hub_staff() or contractor_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Payroll
--
-- hub_payroll_batches carries total_amount and contractor_count -- company-wide
-- payroll spend per period. But the contractor payouts page reads this table
-- for one honest reason: to know whether a period is closed.
--
-- RLS cannot hide columns, so the fix is a view that exposes only the period
-- fields. It is a plain (SECURITY DEFINER) view, so it reads the base table
-- without the caller's RLS -- deliberate, and safe because the view cannot
-- select total_amount at all. The base table then goes staff-only.
-- ---------------------------------------------------------------------------

create or replace view hub_payroll_periods as
  select id, period_start, period_end, period_label, status
  from hub_payroll_batches;

grant select on hub_payroll_periods to authenticated;

drop policy if exists "Authenticated can view batches" on hub_payroll_batches;
create policy "Staff read payroll batches" on hub_payroll_batches
  for select to authenticated
  using (is_hub_staff());

drop policy if exists "Authenticated can view payroll cache" on hub_payroll_cache;
create policy "Staff read payroll cache" on hub_payroll_cache
  for select to authenticated
  using (is_hub_staff());

-- Named "Admins read runs" but the qual was only "is anybody logged in".
drop policy if exists "Admins read runs" on hub_payroll_runs;
create policy "Staff read payroll runs" on hub_payroll_runs
  for select to authenticated
  using (is_hub_staff());

-- ---------------------------------------------------------------------------
-- Credentials
--
-- "Hub members can view credentials" hands every stored client credential to
-- anyone with a login. A scoped policy already sits beside it -- but it keys
-- off hub_clients.assigned_contractor_id and hub_credential_requests, and
-- credentials/page.tsx documents that assigned_contractor_id and
-- hub_client_assignments are one-time snapshots nothing keeps in sync: being
-- removed from a project team never touches either. Dropping the blanket
-- policy and leaving that one would hand access on stale data while denying it
-- to people who legitimately need it.
--
-- So this mirrors what the page actually treats as the source of truth: active
-- retainer-project team membership, matched on project_name, because for this
-- hub's retainer rows client_name holds the billing contact's personal name
-- while project_name holds the company. Approved one-off credential requests
-- still grant access.
-- ---------------------------------------------------------------------------

drop policy if exists "Hub members can view credentials" on hub_credentials;
drop policy if exists "contractors read assigned client credentials" on hub_credentials;

create policy "Contractors read credentials for their retainer clients" on hub_credentials
  for select to authenticated
  using (
    is_hub_staff()
    or exists (
      select 1
      from hub_projects p
      join hub_project_contractors pc on pc.project_id = p.id
      where pc.contractor_id = auth.uid()
        and p.project_type = 'retainer'
        and p.archived_at is null
        and p.status <> 'cancelled'
        and p.project_name = hub_credentials.client_name
    )
    or exists (
      select 1
      from hub_credential_requests r
      where r.credential_id = hub_credentials.id
        and r.contractor_id = auth.uid()
        and r.status = 'approved'
    )
  );

-- ---------------------------------------------------------------------------
-- NOT changed here, on purpose:
--
-- hub_settings ("hub users read settings", true) stays open. The contractor
-- dashboard and payouts pages read usd_rate and active_payroll_period from it.
-- It is configuration, not personal or financial data, and locking it to staff
-- would break both pages to hide an exchange rate.
--
-- hub_questionnaires ("Public read by token", qual true, role anon) lets an
-- unauthenticated caller list EVERY questionnaire, not just one matching a
-- token -- RLS cannot see the token in the request, so no policy can express
-- "only the row whose token was supplied". Fixing it properly means serving
-- public questionnaires through an edge function that takes the token and
-- returns one row. That is a code change with a public flow behind it, so it
-- is not bundled into a policy migration. It remains open.
--
-- VERIFY -- after both migrations, only hub_settings and hub_questionnaires
-- should remain:
--
--   select tablename, policyname, roles, qual
--   from pg_policies
--   where schemaname = 'public' and tablename like 'hub_%'
--     and cmd in ('SELECT','ALL')
--     and (qual = 'true' or qual = '(auth.uid() IS NOT NULL)');
--
-- SMOKE TEST as a contractor -- own rates only, no payroll totals, and
-- credentials limited to their retainer clients:
--
--   begin;
--   select set_config('request.jwt.claims',
--     '{"sub":"7a2ac130-53c6-4402-a43c-98cc320639dd","role":"authenticated"}', true);
--   set local role authenticated;
--   select count(*) from hub_rate_history
--     where contractor_id <> '7a2ac130-53c6-4402-a43c-98cc320639dd';  -- expect 0
--   select count(*) from hub_payroll_batches;                          -- expect 0
--   select count(*) from hub_payroll_periods;                          -- expect > 0
--   select count(*) from hub_credentials;                              -- expect few
--   rollback;
--
-- ROLLBACK, per table:
--   drop policy if exists "Staff read payroll batches" on hub_payroll_batches;
--   create policy "Authenticated can view batches" on hub_payroll_batches
--     for select to authenticated using (true);
