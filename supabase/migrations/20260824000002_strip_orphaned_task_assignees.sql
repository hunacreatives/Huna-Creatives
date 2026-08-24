-- Fix: editing a task failed with
--   insert or update on table "hub_project_tasks" violates foreign key
--   constraint "hub_project_tasks_assigned_to_fkey"
--
-- Cause: hub_project_tasks.assignee_ids is a plain uuid[] with no foreign key,
-- so when an employee is deleted from hub_users their id stays in the array.
-- Deleting them correctly nulls assigned_to (that column has ON DELETE SET
-- NULL), but nothing cleans the array. The task panel then saves the array back
-- and promotes element zero into assigned_to, which IS constrained -- so the
-- write fails on an assignee the UI never displayed, because the chip row
-- filters unknown ids out of the render.
--
-- Observed on task 173 "Create Flyer": assignee_ids held a single id belonging
-- to a deleted employee, and assigned_to was already null.
--
-- STEP 1 (diagnostic) -- see the damage before changing anything:
--   select t.id, t.title, t.assignee_ids,
--          (select array_agg(x) from unnest(t.assignee_ids) x
--           where not exists (select 1 from hub_users u where u.id = x))
--            as orphaned_ids
--   from hub_project_tasks t
--   where exists (
--     select 1 from unnest(t.assignee_ids) x
--     where not exists (select 1 from hub_users u where u.id = x)
--   );

-- Drop ids that no longer resolve to a user. An array that empties out becomes
-- null rather than '{}', matching what normalizeTaskAssigneePayload writes for
-- an unassigned task.
update hub_project_tasks t
set assignee_ids = nullif(
      array(
        select x from unnest(t.assignee_ids) x
        where exists (select 1 from hub_users u where u.id = x)
      ),
      '{}'::uuid[]
    )
where t.assignee_ids is not null
  and exists (
    select 1 from unnest(t.assignee_ids) x
    where not exists (select 1 from hub_users u where u.id = x)
  );

-- STEP 2 (verify) -- must return zero rows:
--   select id, title, assignee_ids from hub_project_tasks t
--   where exists (
--     select 1 from unnest(t.assignee_ids) x
--     where not exists (select 1 from hub_users u where u.id = x)
--   );
