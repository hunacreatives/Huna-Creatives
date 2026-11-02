-- Stage 0 · 1 of 4: one client list for every project.
--
-- Today hub_clients holds only the 5 retainer workspaces; 18 of 20 projects
-- name a client that isn't on the list (matched by name only). This adds the
-- missing clients, links every project to its client by id, and keeps new
-- projects linked automatically. Huna Creatives becomes the internal client.
--
-- New clients have no contract value, so the dashboard's contract total is
-- unchanged. They will appear as client workspaces on the admin Projects page.
--
-- PREVIEW first (read-only) — the client names this will add:
--   select distinct trim(p.client_name) as will_add
--     from hub_projects p
--    where coalesce(trim(p.client_name), '') <> ''
--      and not exists (select 1 from hub_clients c where lower(trim(c.client_name)) = lower(trim(p.client_name)))
--    order by 1;
--
-- Then run this whole file. Safe to re-run.

alter table public.hub_clients add column if not exists is_internal boolean not null default false;
alter table public.hub_projects add column if not exists client_id bigint references public.hub_clients(id) on delete set null;
create index if not exists hub_projects_client_id_idx on public.hub_projects (client_id);

-- Add every client name used by a project that isn't on the list yet.
insert into public.hub_clients (client_name, status, is_internal)
select distinct on (lower(trim(p.client_name)))
       trim(p.client_name), 'active', lower(trim(p.client_name)) = 'huna creatives'
  from public.hub_projects p
 where coalesce(trim(p.client_name), '') <> ''
   and not exists (select 1 from public.hub_clients c where lower(trim(c.client_name)) = lower(trim(p.client_name)))
 order by lower(trim(p.client_name)), p.created_at;

update public.hub_clients set is_internal = true where lower(trim(client_name)) = 'huna creatives';

-- Link each project to its client.
update public.hub_projects p
   set client_id = c.id
  from public.hub_clients c
 where p.client_id is null
   and lower(trim(c.client_name)) = lower(trim(p.client_name));

-- New and renamed projects: find the client by name, or add it.
create or replace function public.hub_projects_link_client()
returns trigger language plpgsql security definer set search_path = public as $$
declare cid bigint;
begin
  if coalesce(trim(new.client_name), '') = '' then
    return new;
  end if;
  if tg_op = 'UPDATE' and new.client_id is not null and new.client_name is not distinct from old.client_name then
    return new;
  end if;
  select id into cid from hub_clients where lower(trim(client_name)) = lower(trim(new.client_name)) order by id limit 1;
  if cid is null then
    insert into hub_clients (client_name, status, is_internal)
    values (trim(new.client_name), 'active', lower(trim(new.client_name)) = 'huna creatives')
    returning id into cid;
  end if;
  new.client_id := cid;
  return new;
end $$;

drop trigger if exists hub_projects_link_client on public.hub_projects;
create trigger hub_projects_link_client before insert or update of client_name, client_id on public.hub_projects
  for each row execute function public.hub_projects_link_client();

-- Check: every project should now have a client.
select count(*) as projects,
       count(client_id) as linked_to_a_client,
       (select count(*) from public.hub_clients) as clients,
       (select string_agg(client_name, ', ') from public.hub_clients where is_internal) as internal_clients
  from public.hub_projects;
