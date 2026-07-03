-- Live task sync: emit realtime change events for project tasks.
-- Run once in the Supabase SQL editor. Safe to run more than once.
-- (Comments/assignments already emit events; this adds the tasks table.)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'hub_project_tasks'
  ) then
    alter publication supabase_realtime add table public.hub_project_tasks;
  end if;
end $$;
