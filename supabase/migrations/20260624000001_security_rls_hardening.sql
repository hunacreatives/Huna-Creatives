-- Security hardening — 2026-06-24
-- Triggered by Supabase advisor "rls_disabled_in_public" + manual anon-read probe.
-- Safe to run in the Supabase Dashboard SQL Editor (no credentials to share).

-- =====================================================================
-- STEP 1 (DIAGNOSTIC): which public tables still have RLS OFF?
-- Run this alone first — these are the table(s) the advisor flagged.
-- =====================================================================
-- select n.nspname as schema, c.relname as "table", c.relrowsecurity as rls_enabled
-- from pg_class c
-- join pg_namespace n on n.oid = c.relnamespace
-- where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity = false
-- order by c.relname;

-- =====================================================================
-- STEP 2 (FIX the email): enable RLS on every public table that has it off.
-- RLS on + no policy = denies all anon/authenticated access (safe default).
-- Every repo table already ships its policies, so this only touches tables
-- created or toggled in the dashboard — exactly what the advisor caught.
-- =====================================================================
do $$
declare r record;
begin
  for r in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity = false
  loop
    execute format('alter table public.%I enable row level security', r.relname);
    raise notice 'Enabled RLS on public.%', r.relname;
  end loop;
end $$;

-- =====================================================================
-- STEP 2b (claudy_rsvps policies): the advisor's flagged table.
-- RSVP writes come from claudy-at-30's server route (service-role, bypasses
-- RLS) so they keep working. The Huna hub admin page reads/edits/deletes as
-- a logged-in admin, so it needs an explicit policy. The public anon key now
-- gets nothing — guest PII is no longer downloadable or deletable by anyone.
-- =====================================================================
drop policy if exists "Admins manage claudy rsvps" on claudy_rsvps;

create policy "Admins manage claudy rsvps" on claudy_rsvps
  for all
  using (
    exists (
      select 1 from hub_users
      where hub_users.id = auth.uid()
      and hub_users.role in ('admin', 'owner')
    )
  );

-- =====================================================================
-- STEP 3 (FIX leaking admin tokens): drop the dead public-read policy.
-- "Public can read admin invites" USING (true) exposed live, unused admin
-- invite tokens + emails to anyone with the public anon key. The frontend
-- never reads this table (signup uses Supabase Auth verifyOtp), so dropping
-- it breaks nothing. Add an admin-only read for the dashboard.
-- =====================================================================
drop policy if exists "Public can read admin invites" on hub_admin_invites;

create policy "Admins read invites" on hub_admin_invites
  for select
  using (
    exists (
      select 1 from hub_users
      where hub_users.id = auth.uid()
      and hub_users.role in ('admin', 'owner')
    )
  );

-- =====================================================================
-- STEP 4 (REDUCE contract exposure): stop leaking signer IP to the public.
-- The public signing page reads hub_client_contracts by slug, but RLS lets
-- anon read ALL sent contracts (body, total_value, signer_ip). Lowest-risk
-- win that doesn't touch the signing flow: revoke the signer_ip column from
-- anon (the page never displays it). The slug stays the access secret.
-- (Full fix = move the public fetch to an edge function keyed by slug.)
-- =====================================================================
revoke select (signer_ip) on hub_client_contracts from anon;
