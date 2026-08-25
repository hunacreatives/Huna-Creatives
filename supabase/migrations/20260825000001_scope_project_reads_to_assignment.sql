-- Scope project-related reads to the people actually on the project.
--
-- Around a dozen tables carried "for select to authenticated using (true)".
-- Those policies never look at hub_users, so deleting someone's profile does
-- not revoke anything: an account that can still authenticate reads every
-- project, every client payment, and every contractor's payout percentage --
-- straight from the REST API with the anon key, without going near the app.
-- Found while off-boarding two employees whose auth accounts outlived their
-- hub_users rows.
--
-- Same shape as the fix already applied to hub_project_costs on 2026-08-24:
-- assigned contractors, or staff. Nothing here changes what staff can read.
--
-- STEP 1 (diagnostic) -- run FIRST and read the output. The repo's migrations
-- have twice been found to disagree with this database, so confirm the live
-- policy names before dropping anything by name:
--
--   select tablename, policyname, cmd, roles, qual
--   from pg_policies
--   where schemaname = 'public'
--     and tablename like 'hub_%'
--     and cmd in ('SELECT', 'ALL')
--   order by tablename, policyname;
--
-- Any permissive read policy this file does not drop keeps the table open,
-- because RLS policies OR together. If STEP 1 shows a using(true) SELECT
-- policy under a name not listed below, add it to the drops.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- is_hub_admin() covers admin and owner only, but 'hr' is a real role here --
-- it already reads payouts, settings and the invoice log, and under the old
-- using(true) policies it could read all of this too. Excluding it would
-- quietly break HR rather than tighten anything, since HR is staff, not an
-- ex-employee with a stale login. This is the line that keeps them working.
create or replace function is_hub_staff()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from hub_users
    where id = auth.uid() and role in ('admin', 'owner', 'hr')
  )
$$;

-- SECURITY DEFINER for two reasons: it reads hub_project_contractors, which is
-- itself protected below (a policy on that table querying that table would
-- recurse), and it matches the existing is_hub_admin() pattern.
create or replace function is_assigned_to_project(pid bigint)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from hub_project_contractors pc
    where pc.project_id = pid
      and pc.contractor_id = auth.uid()
  )
$$;

-- Task-level tables hang off task_id and have no project_id of their own.
create or replace function is_assigned_to_task(tid bigint)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1
    from hub_project_tasks t
    join hub_project_contractors pc on pc.project_id = t.project_id
    where t.id = tid
      and pc.contractor_id = auth.uid()
  )
$$;

-- ---------------------------------------------------------------------------
-- Projects and money
-- ---------------------------------------------------------------------------

drop policy if exists "Authenticated users can read projects" on hub_projects;
create policy "Assigned contractors read projects" on hub_projects
  for select to authenticated
  using (is_hub_staff() or is_assigned_to_project(id));

drop policy if exists "Authenticated users can read project payments" on hub_project_payments;
create policy "Assigned contractors read project payments" on hub_project_payments
  for select to authenticated
  using (is_hub_staff() or is_assigned_to_project(project_id));

drop policy if exists "Authenticated users can read project contractors" on hub_project_contractors;
create policy "Assigned contractors read project team" on hub_project_contractors
  for select to authenticated
  using (is_hub_staff() or is_assigned_to_project(project_id));

-- ---------------------------------------------------------------------------
-- Tasks and their children
-- ---------------------------------------------------------------------------

drop policy if exists "Auth users read tasks" on hub_project_tasks;
create policy "Assigned contractors read tasks" on hub_project_tasks
  for select to authenticated
  using (is_hub_staff() or is_assigned_to_project(project_id));

drop policy if exists "Auth users read comments" on hub_project_task_comments;
drop policy if exists "Authenticated users can read task comments" on hub_project_task_comments;
create policy "Assigned contractors read task comments" on hub_project_task_comments
  for select to authenticated
  using (is_hub_staff() or is_assigned_to_task(task_id));

drop policy if exists "Auth users read attachments" on hub_project_task_attachments;
drop policy if exists "Authenticated users can read task attachments" on hub_project_task_attachments;
create policy "Assigned contractors read task attachments" on hub_project_task_attachments
  for select to authenticated
  using (is_hub_staff() or is_assigned_to_task(task_id));

drop policy if exists "Auth users read task activity" on hub_project_task_activity;
drop policy if exists "Authenticated users can read task activity" on hub_project_task_activity;
create policy "Assigned contractors read task activity" on hub_project_task_activity
  for select to authenticated
  using (is_hub_staff() or is_assigned_to_task(task_id));

-- ---------------------------------------------------------------------------
-- Activity log
-- ---------------------------------------------------------------------------

drop policy if exists "Auth users read activity" on hub_project_activity;
drop policy if exists "Authenticated users can read project activity" on hub_project_activity;
create policy "Assigned contractors read project activity" on hub_project_activity
  for select to authenticated
  using (is_hub_staff() or is_assigned_to_project(project_id));

-- ---------------------------------------------------------------------------
-- Client assignments -- personal, not project-scoped: you see your own.
-- ---------------------------------------------------------------------------

drop policy if exists "Auth users read client assignments" on hub_client_assignments;
drop policy if exists "Authenticated users can read client assignments" on hub_client_assignments;
create policy "Contractors read their own client assignments" on hub_client_assignments
  for select to authenticated
  using (is_hub_staff() or contractor_id = auth.uid());

-- ---------------------------------------------------------------------------
-- STEP 2 (verify) -- no using(true) SELECT policies should remain:
--
--   select tablename, policyname, qual
--   from pg_policies
--   where schemaname = 'public'
--     and tablename like 'hub_%'
--     and cmd = 'SELECT'
--     and qual = 'true';
--
-- STEP 3 (smoke test, as a contractor) -- the first must return only their own
-- projects, the second zero rows:
--
--   begin;
--   select set_config('request.jwt.claims',
--     '{"sub":"<contractor uuid>","role":"authenticated"}', true);
--   set local role authenticated;
--   select count(*) from hub_projects;
--   select count(*) from hub_project_payments
--     where project_id not in (
--       select project_id from hub_project_contractors
--       where contractor_id = '<contractor uuid>');
--   rollback;
--
-- ROLLBACK -- if the hub misbehaves, this restores the previous behaviour for
-- one table (repeat per table, substituting names):
--
--   drop policy if exists "Assigned contractors read projects" on hub_projects;
--   create policy "Authenticated users can read projects" on hub_projects
--     for select to authenticated using (true);
