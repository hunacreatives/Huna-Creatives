-- Fix: contractors saw an inflated payout because project costs were invisible
-- to them, so net profit fell back to the full contract price.
--
-- Symptom: on FS Architects, admin showed a net profit basis of 43,864.29
-- (94,396.42 contract - 50,532.13 costs) and a 50% cut of 21,932.15, while the
-- assigned contractor's workspace showed 47,198.21 -- exactly 50% of the full
-- contract price with no costs subtracted. Both pages run the same formula;
-- only the visible cost rows differed.
--
-- Cause: hub_project_costs had no working SELECT policy for non-admins. Admins
-- still read it through "Admins can manage project costs" (FOR ALL), which is
-- why the figure looked correct on the admin side only.
--
-- STEP 1 (diagnostic) -- confirm before applying:
--   select policyname, cmd, roles, qual
--   from pg_policies where tablename = 'hub_project_costs';
--
-- Fix: let a contractor read costs ONLY for projects they are assigned to,
-- rather than restoring a blanket using(true) that exposes every project's
-- cost lines to every logged-in user.

drop policy if exists "Authenticated users can read project costs" on hub_project_costs;

create policy "Assigned contractors read project costs" on hub_project_costs
  for select
  to authenticated
  using (
    exists (
      select 1 from hub_project_contractors pc
      where pc.project_id = hub_project_costs.project_id
        and pc.contractor_id = auth.uid()
    )
    or exists (
      select 1 from hub_users
      where hub_users.id = auth.uid()
        and hub_users.role in ('owner', 'admin')
    )
  );

-- STEP 2 (verify) -- as Angelica, her workspace should now show
-- 50% of 43,864.29 = 21,932.15, matching the admin view.
