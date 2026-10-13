-- SmartGrid: let callers fix their call notes once the batch is done, and
-- owner/admin fix any note at any time. Only the note text changes; outcome and
-- email-found stay as logged so stats and commissions can't move. The first
-- version of the note is kept in meta.notes_original.

create or replace function edit_lead_call_note(p_activity_id bigint, p_notes text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row hub_project_activity%rowtype;
  v_is_admin boolean;
  v_meta jsonb;
  v_latest_id bigint;
begin
  select * into v_row from hub_project_activity
  where id = p_activity_id and action = 'lead_outcome_logged';
  if not found then
    raise exception 'Call not found';
  end if;

  v_is_admin := coalesce((select role in ('admin', 'owner') from hub_users where id = auth.uid()), false);

  if not v_is_admin then
    if v_row.user_id is distinct from auth.uid() then
      raise exception 'You can only edit your own notes';
    end if;
    -- Editable once the batch this call came from is finished: nothing claimed
    -- before the call is still in this caller's queue. Finishing a batch claims
    -- the next one right away, so leads claimed after the call don't count.
    if exists (
      select 1 from hub_project_leads
      where project_id = v_row.project_id
        and locked_by = auth.uid()
        and retired_at is null
        and locked_at <= v_row.created_at
    ) then
      raise exception 'Notes can be edited once you finish this batch of leads';
    end if;
  end if;

  v_meta := coalesce(v_row.meta, '{}'::jsonb);
  if not v_meta ? 'notes_original' then
    v_meta := v_meta || jsonb_build_object('notes_original', coalesce(v_meta->>'notes', ''));
  end if;
  v_meta := v_meta || jsonb_build_object(
    'notes', coalesce(p_notes, ''),
    'notes_edited_at', now(),
    'notes_edited_by', auth.uid()
  );

  update hub_project_activity set meta = v_meta where id = p_activity_id;

  -- The lead's call_notes mirrors its latest call (the client dashboard reads it)
  select id into v_latest_id from hub_project_activity
  where entity_type = 'lead' and entity_id = v_row.entity_id and action = 'lead_outcome_logged'
  order by created_at desc, id desc limit 1;
  if v_latest_id = p_activity_id then
    update hub_project_leads set call_notes = coalesce(p_notes, '') where id = v_row.entity_id;
  end if;

  return v_meta;
end;
$$;

revoke all on function edit_lead_call_note(bigint, text) from public, anon;
grant execute on function edit_lead_call_note(bigint, text) to authenticated;

-- Project members could update or delete any activity row in their project
-- (including another caller's outcomes). Keep their insert, and leave
-- update/delete to owner/admin. Reads are covered by
-- "Assigned contractors read project activity".
drop policy if exists "Project members manage activity" on hub_project_activity;

drop policy if exists "Project members insert activity" on hub_project_activity;
create policy "Project members insert activity" on hub_project_activity
  for insert to authenticated
  with check (
    is_assigned_to_project(project_id)
    or coalesce((select role in ('admin', 'owner') from hub_users where id = auth.uid()), false)
  );

drop policy if exists "Admins manage activity" on hub_project_activity;
create policy "Admins manage activity" on hub_project_activity
  for all to authenticated
  using (coalesce((select role in ('admin', 'owner') from hub_users where id = auth.uid()), false))
  with check (coalesce((select role in ('admin', 'owner') from hub_users where id = auth.uid()), false));
