-- Scope project reads to the people actually on the project.
--
-- REWRITTEN 2026-08-25 against the live pg_policies output. The first draft was
-- written from this repo's migrations and got five policy NAMES wrong. The
-- drops would have matched nothing while the creates succeeded, leaving those
-- tables open and the migration looking like it worked. Policies OR together,
-- so a missed drop is not a partial fix -- it is no fix at all.
--
-- Live names that the repo's migrations do not match:
--   hub_project_activity          "Auth users read project activity"
--   hub_project_contractors       "hub_pc_read"
--   hub_project_task_activity     "read task activity"
--   hub_project_task_attachments  "read task attachments"
--   hub_project_task_comments     "Auth users read task comments"
--
-- Deliberately NOT touching hub_project_payments. It has no permissive read
-- policy at all -- only "Admins can manage project payments" (FOR ALL). Adding
-- an assigned-contractor read would WIDEN access, not narrow it. It also means
-- the contractor projects page queries that table and silently gets nothing,
-- the same empty-result bug that made Angelica's payout look inflated. Worth
-- fixing, but as its own decision, not inside a lockdown.
--
-- hub_project_costs is already correctly scoped (applied 2026-08-24) and is
-- absent here on purpose.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- is_hub_admin() covers admin and owner only, but 'hr' is a real role here that
-- already reads payouts, settings and the invoice log, and could read all of
-- this before. Excluding it would break HR rather than tighten anything.
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

-- SECURITY DEFINER is required, not stylistic: this reads
-- hub_project_contractors, and the policy on that same table calls it. Without
-- it, the policy would recurse.
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

-- Task-level tables carry task_id and no project_id of their own.
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
-- Projects
-- ---------------------------------------------------------------------------

drop policy if exists "Authenticated users can read projects" on hub_projects;
create policy "Assigned contractors read projects" on hub_projects
  for select to authenticated
  using (is_hub_staff() or is_assigned_to_project(id));

drop policy if exists "hub_pc_read" on hub_project_contractors;
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

drop policy if exists "Auth users read task comments" on hub_project_task_comments;
create policy "Assigned contractors read task comments" on hub_project_task_comments
  for select to authenticated
  using (is_hub_staff() or is_assigned_to_task(task_id));

drop policy if exists "read task attachments" on hub_project_task_attachments;
create policy "Assigned contractors read task attachments" on hub_project_task_attachments
  for select to authenticated
  using (is_hub_staff() or is_assigned_to_task(task_id));

drop policy if exists "read task activity" on hub_project_task_activity;
create policy "Assigned contractors read task activity" on hub_project_task_activity
  for select to authenticated
  using (is_hub_staff() or is_assigned_to_task(task_id));

-- FOR ALL with using(true): any authenticated user can read AND write watchers
-- on any task, including projects they have nothing to do with.
drop policy if exists "manage task watchers" on hub_project_task_watchers;
create policy "Assigned contractors manage task watchers" on hub_project_task_watchers
  for all to authenticated
  using (is_hub_staff() or is_assigned_to_task(task_id))
  with check (is_hub_staff() or is_assigned_to_task(task_id));

-- ---------------------------------------------------------------------------
-- Activity log
-- ---------------------------------------------------------------------------

drop policy if exists "Auth users read project activity" on hub_project_activity;
create policy "Assigned contractors read project activity" on hub_project_activity
  for select to authenticated
  using (is_hub_staff() or is_assigned_to_project(project_id));

-- ---------------------------------------------------------------------------
-- Client assignments -- personal, not project-scoped: you see your own.
-- ---------------------------------------------------------------------------

drop policy if exists "Authenticated users can read client assignments" on hub_client_assignments;
create policy "Contractors read their own client assignments" on hub_client_assignments
  for select to authenticated
  using (is_hub_staff() or contractor_id = auth.uid());

-- ---------------------------------------------------------------------------
-- VERIFY -- what should remain with qual = true afterwards:
--   hub_questionnaires "Public read by token"  (anon, separate question)
--   hub_payroll_batches, hub_payroll_cache, hub_rate_history, hub_settings
--     (handled in 20260825000002)
--
--   select tablename, policyname, roles, qual
--   from pg_policies
--   where schemaname = 'public' and tablename like 'hub_%'
--     and cmd in ('SELECT','ALL') and qual = 'true';
--
-- SMOKE TEST as a contractor -- first returns only their projects, second 0:
--
--   begin;
--   select set_config('request.jwt.claims',
--     '{"sub":"7a2ac130-53c6-4402-a43c-98cc320639dd","role":"authenticated"}', true);
--   set local role authenticated;
--   select count(*) from hub_projects;
--   select count(*) from hub_project_tasks
--     where project_id not in (select project_id from hub_project_contractors
--                              where contractor_id = '7a2ac130-53c6-4402-a43c-98cc320639dd');
--   rollback;
--
-- ROLLBACK, per table:
--   drop policy if exists "Assigned contractors read projects" on hub_projects;
--   create policy "Authenticated users can read projects" on hub_projects
--     for select to authenticated using (true);
