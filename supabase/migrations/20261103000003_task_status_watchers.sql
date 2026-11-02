-- Stage 0 · 3 of 4: one way to change a task's status, task watchers, and
-- comments limited to the people on the task.
--
-- • hub_set_task_status(): the projects page, the employee dashboard and chat
--   all change status through this, so the completed date, the blocked reason,
--   the activity log and watchers are always handled the same way. (The
--   dashboard's quick toggle skipped the log and notifications.)
-- • Watchers: assignees, commenters and whoever changes a status follow the
--   task. Task notifications go to watchers, not to every admin.
-- • Comments: anyone signed in could comment on any task. Now only people who
--   can see the task.
--
-- Run after 2 of 4. Safe to re-run.

-- ── Status ─────────────────────────────────────────────────────────────────

create or replace function public.hub_set_task_status(p_task_id bigint, p_status text, p_blocked_reason text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  t record;
  actor record;
  next_meta jsonb;
  saved record;
begin
  if p_status not in ('todo', 'in_progress', 'in_review', 'blocked', 'done') then
    raise exception 'Unknown status %', p_status;
  end if;
  if not (is_hub_staff() or is_assigned_to_task(p_task_id)) then
    raise exception 'You are not on this task''s project.';
  end if;

  select * into t from hub_project_tasks where id = p_task_id for update;
  if not found then raise exception 'Task not found.'; end if;

  next_meta := t.meta;
  if p_status = 'blocked' then
    next_meta := coalesce(t.meta, '{}'::jsonb) || jsonb_build_object('blocked_reason', coalesce(trim(p_blocked_reason), ''));
  elsif t.meta ? 'blocked_reason' then
    next_meta := t.meta - 'blocked_reason';
    if next_meta = '{}'::jsonb then next_meta := null; end if;
  end if;

  if t.status = p_status and next_meta is not distinct from t.meta then
    return to_jsonb(t);
  end if;

  update hub_project_tasks
     set status = p_status,
         completed_at = case when p_status = 'done' then coalesce(t.completed_at, now()) else null end,
         updated_at = now(),
         meta = next_meta
   where id = p_task_id
  returning * into saved;

  select id, full_name into actor from hub_users where id = auth.uid();

  if t.status <> p_status then
    insert into hub_project_task_activity (task_id, actor_id, actor_name, type, description)
    values (p_task_id, auth.uid(), coalesce(actor.full_name, 'Someone'), 'status_change',
            format('changed status from %s to %s', replace(t.status, '_', ' '), replace(p_status, '_', ' ')));
    -- The project-level feed, in the current layout or the older one (the
    -- employee projects page tries both the same way). Never blocks the change.
    begin
      execute 'insert into hub_project_activity (project_id, user_id, action, entity_type, entity_id, entity_title, meta)
               values ($1, $2, ''task_status_changed'', ''task'', $3, $4, $5)'
        using t.project_id, auth.uid(), t.id, t.title,
              jsonb_build_object('from', t.status, 'to', p_status,
                                 'message', format('moved "%s" to %s', t.title, replace(p_status, '_', ' ')));
    exception when others then
      begin
        execute 'insert into hub_project_activity (project_id, actor_id, actor_name, description) values ($1, $2, $3, $4)'
          using t.project_id, auth.uid(), coalesce(actor.full_name, 'Team'),
                format('moved "%s" to %s', t.title, replace(p_status, '_', ' '));
      exception when others then
        raise warning 'project activity insert failed: %', sqlerrm;
      end;
    end;
  end if;

  insert into hub_project_task_watchers (task_id, user_id) values (p_task_id, auth.uid()) on conflict do nothing;

  return to_jsonb(saved);
end $$;

revoke all on function public.hub_set_task_status(bigint, text, text) from public, anon;
grant execute on function public.hub_set_task_status(bigint, text, text) to authenticated;

-- ── Watchers ───────────────────────────────────────────────────────────────

create or replace function public.hub_task_watch_assignees()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into hub_project_task_watchers (task_id, user_id)
  select new.id, u
    from unnest(array_append(coalesce(new.assignee_ids, '{}'::uuid[]), new.assigned_to)) u
   where u is not null and exists (select 1 from hub_users h where h.id = u)
  on conflict do nothing;
  return null;
end $$;

drop trigger if exists hub_task_watch_assignees on public.hub_project_tasks;
create trigger hub_task_watch_assignees after insert or update of assignee_ids, assigned_to on public.hub_project_tasks
  for each row execute function public.hub_task_watch_assignees();

create or replace function public.hub_task_watch_commenter()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.user_id is not null then
    insert into hub_project_task_watchers (task_id, user_id) values (new.task_id, new.user_id) on conflict do nothing;
  end if;
  return null;
end $$;

drop trigger if exists hub_task_watch_commenter on public.hub_project_task_comments;
create trigger hub_task_watch_commenter after insert on public.hub_project_task_comments
  for each row execute function public.hub_task_watch_commenter();

-- Backfill from today's assignees and commenters.
insert into public.hub_project_task_watchers (task_id, user_id)
select t.id, u
  from public.hub_project_tasks t
  cross join lateral unnest(array_append(coalesce(t.assignee_ids, '{}'::uuid[]), t.assigned_to)) u
 where u is not null and exists (select 1 from public.hub_users h where h.id = u)
on conflict do nothing;

insert into public.hub_project_task_watchers (task_id, user_id)
select distinct c.task_id, c.user_id
  from public.hub_project_task_comments c
 where c.user_id is not null and exists (select 1 from public.hub_users h where h.id = c.user_id)
on conflict do nothing;

-- ── Comments: only people who can see the task ─────────────────────────────

drop policy if exists "Auth users insert task comments" on public.hub_project_task_comments;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'hub_project_task_comments' and policyname = 'Task members add comments') then
    create policy "Task members add comments" on public.hub_project_task_comments
      for insert to authenticated
      with check (user_id = auth.uid() and (is_hub_staff() or is_assigned_to_task(task_id)));
  end if;
end $$;

-- Check
select (select count(*) from public.hub_project_task_watchers) as watchers,
       (select string_agg(policyname, ', ') from pg_policies where tablename = 'hub_project_task_comments' and cmd = 'INSERT') as comment_insert_rules;
