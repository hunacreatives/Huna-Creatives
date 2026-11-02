-- Stage 0 · 2 of 4: task keys, client visibility, and project health updates.
--
-- • Every project gets a short key (SmartGrid Western → SW) and every task a
--   number in its project, so tasks can be referenced as SW-12 in chat.
-- • Tasks get client_hidden. The client status page shows every task today;
--   this keeps that as the default and lets the team hide internal tasks.
-- • hub_project_updates: on track / at risk / off track posts per project.
--
-- Run after 1 of 4. Safe to re-run.

-- ── Project keys and task numbers ──────────────────────────────────────────

alter table public.hub_projects add column if not exists key text;
alter table public.hub_projects add column if not exists task_seq integer not null default 0;
alter table public.hub_project_tasks add column if not exists number integer;
alter table public.hub_project_tasks add column if not exists client_hidden boolean not null default false;

-- "SmartGrid Western" → SW, "The Trade Network" → TN, "obramajoralia.com" → OBR.
-- Skips filler words and web endings; one word takes its first 3 letters.
-- Adds 2, 3… if the key is taken.
create or replace function public.hub_project_make_key(p_name text, p_exclude bigint default null)
returns text language plpgsql stable security definer set search_path = public as $$
declare
  words text[];
  base text;
  candidate text;
  n int := 1;
begin
  words := array(
    select w from unnest(regexp_split_to_array(trim(regexp_replace(
             regexp_replace(upper(coalesce(p_name, '')), '\.(COM|PH|NET|ORG|CO|IO|APP)(\.PH)?\s*$', ''),
             '[^A-Z0-9 ]', ' ', 'g')), '\s+')) with ordinality as t(w, i)
     where w <> '' and w not in ('THE', 'A', 'AN', 'AND', 'OF', 'FOR', 'TO')
     order by i);
  if coalesce(array_length(words, 1), 0) = 0 then
    base := 'P';
  elsif array_length(words, 1) = 1 then
    base := left(words[1], 3);
  else
    select left(string_agg(left(w, 1), '' order by i), 4) into base
      from unnest(words) with ordinality as t(w, i) where w <> '';
  end if;
  candidate := base;
  while exists (select 1 from hub_projects where key = candidate and id is distinct from p_exclude) loop
    n := n + 1;
    candidate := base || n::text;
  end loop;
  return candidate;
end $$;

-- Backfill keys, oldest project first so long-running projects keep the plain key.
do $$
declare r record;
begin
  for r in select id, project_name from public.hub_projects where key is null order by created_at, id loop
    update public.hub_projects set key = public.hub_project_make_key(r.project_name, r.id) where id = r.id;
  end loop;
end $$;

create unique index if not exists hub_projects_key_idx on public.hub_projects (key);

-- Backfill task numbers in the order tasks were created.
update public.hub_project_tasks t
   set number = s.n
  from (select id, row_number() over (partition by project_id order by created_at, id) as n
          from public.hub_project_tasks) s
 where t.id = s.id and t.number is null;

update public.hub_projects p
   set task_seq = greatest(p.task_seq, coalesce((select max(number) from public.hub_project_tasks t where t.project_id = p.id), 0));

create unique index if not exists hub_project_tasks_number_idx on public.hub_project_tasks (project_id, number);

create or replace function public.hub_projects_set_key()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.key is null or trim(new.key) = '' then
    new.key := hub_project_make_key(new.project_name, new.id);
  else
    new.key := upper(regexp_replace(new.key, '[^A-Za-z0-9]', '', 'g'));
  end if;
  return new;
end $$;

drop trigger if exists hub_projects_set_key on public.hub_projects;
create trigger hub_projects_set_key before insert or update of key on public.hub_projects
  for each row execute function public.hub_projects_set_key();

-- Employees can't update projects, so the counter is bumped as the definer.
create or replace function public.hub_project_tasks_set_number()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.number is null then
    update hub_projects set task_seq = task_seq + 1 where id = new.project_id returning task_seq into new.number;
  end if;
  return new;
end $$;

drop trigger if exists hub_project_tasks_set_number on public.hub_project_tasks;
create trigger hub_project_tasks_set_number before insert on public.hub_project_tasks
  for each row execute function public.hub_project_tasks_set_number();

-- ── Project health updates ─────────────────────────────────────────────────

create table if not exists public.hub_project_updates (
  id bigint generated always as identity primary key,
  project_id bigint not null references public.hub_projects(id) on delete cascade,
  author_id uuid references public.hub_users(id) on delete set null,
  health text not null check (health in ('on_track', 'at_risk', 'off_track')),
  body text not null default '' check (char_length(body) <= 8000),
  client_visible boolean not null default false,   -- shown on the client status page
  created_at timestamptz not null default now()
);
create index if not exists hub_project_updates_project_idx on public.hub_project_updates (project_id, created_at desc);

alter table public.hub_project_updates enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'hub_project_updates' and policyname = 'Staff manage project updates') then
    create policy "Staff manage project updates" on public.hub_project_updates
      for all to authenticated using (is_hub_staff()) with check (is_hub_staff());
  end if;
  if not exists (select 1 from pg_policies where tablename = 'hub_project_updates' and policyname = 'Project members read updates') then
    create policy "Project members read updates" on public.hub_project_updates
      for select to authenticated using (is_assigned_to_project(project_id));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'hub_project_updates' and policyname = 'Project members post updates') then
    create policy "Project members post updates" on public.hub_project_updates
      for insert to authenticated with check (author_id = auth.uid() and is_assigned_to_project(project_id));
  end if;
end $$;

-- Check
select p.key, p.project_name, p.task_seq as tasks_numbered
  from public.hub_projects p
 order by p.created_at;
