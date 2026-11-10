-- Clients cleanup (Nov 2026). Run hub-clients-cleanup-preview.sql first.
-- 1. Deletes the 4 empty retainers created by clicking client rows (#28–31).
-- 2. Names clients after the business, not the contact person; merges duplicates.
-- 3. Splits Chris Nguyen's projects into three clients; Carlo & Trixia get their own.
-- 4. New projects link to a client by business name and never create a
--    client from a contact person's name.
-- One block: if any check fails, nothing changes.
do $$
declare
  n int;
  trade_id bigint; coop_id bigint; wedding_id bigint;
begin
  -- 1. Empty accidental retainers — refuse if any has real data.
  select count(*) into n from hub_projects p
   where p.id in (28, 29, 30, 31)
     and (p.project_type <> 'retainer' or coalesce(p.monthly_rate, 0) <> 0 or coalesce(p.contract_price, 0) <> 0
          or exists (select 1 from hub_project_tasks t where t.project_id = p.id)
          or exists (select 1 from hub_project_contractors x where x.project_id = p.id)
          or exists (select 1 from hub_project_payments x where x.project_id = p.id)
          or exists (select 1 from hub_project_costs x where x.project_id = p.id)
          or exists (select 1 from hub_payment_reminders x where x.project_id = p.id));
  if n > 0 then raise exception 'Stopped: % of projects 28–31 have data. Nothing changed.', n; end if;
  delete from hub_projects where id in (28, 29, 30, 31);
  get diagnostics n = row_count; raise notice 'deleted % empty retainers', n;

  -- 2a. Contact-person duplicates → the business client that already existed.
  update hub_projects set client_id = 1 where id = 10;   -- Kei Concepts (was Derek Choi)
  update hub_projects set client_id = 3 where id = 9;    -- Blue Collar Nutrition (was Victor Romero)
  update hub_projects set client_id = 7 where id = 6;    -- The Second Haus (was Angelica Lim)
  update hub_client_assignments set client_id = 1 where client_id = 15;
  update hub_client_assignments set client_id = 3 where client_id = 21;
  update hub_client_assignments set client_id = 7 where client_id = 8;
  delete from hub_clients where id in (15, 21, 8) and not exists (select 1 from hub_projects p where p.client_id = hub_clients.id);
  get diagnostics n = row_count; raise notice 'merged % duplicate clients', n;

  -- 2b. Rename to the business.
  update hub_clients c set client_name = v.new_name, updated_at = now()
    from (values (9,'Hulma Fiberglass'),(10,'SmartGrid Western'),(11,'DH Ultimate'),(12,'Maison Aeria Pilates'),
                 (14,'Peak Coffee Roasters'),(17,'FS Architects'),(19,'Obra Majoralia'),(20,'Asana Pilates')) v(id, new_name)
   where c.id = v.id;
  get diagnostics n = row_count; raise notice 'renamed % clients', n;

  -- 3. Chris Nguyen's other projects and the wedding get their own clients.
  insert into hub_clients (client_name, status) values ('The Trade Network', 'active') returning id into trade_id;
  insert into hub_clients (client_name, status) values ('Cooperative Plumbing & Drain', 'active') returning id into coop_id;
  insert into hub_clients (client_name, status) values ('Carlo & Trixia', 'active') returning id into wedding_id;
  update hub_projects set client_id = trade_id where id = 23;
  update hub_projects set client_id = coop_id where id = 20;
  update hub_projects set client_id = wedding_id where id = 13;

  -- Project chats follow their project's client.
  update hub_chat_conversations cv set client_id = p.client_id
    from hub_projects p
   where cv.project_id = p.id and cv.client_id is distinct from p.client_id;
end $$;

-- 4. Link new projects by business name; never create a client from a contact's name.
--    Retainers are named after the business (project_name); the client_name
--    field holds the contact person.
create or replace function public.hub_projects_link_client()
returns trigger language plpgsql security definer set search_path = public as $$
declare cid bigint;
begin
  if tg_op = 'UPDATE' and new.client_id is not null
     and new.client_name is not distinct from old.client_name
     and new.project_name is not distinct from old.project_name then
    return new;
  end if;
  if tg_op = 'UPDATE' and new.client_id is distinct from old.client_id and new.client_id is not null then
    return new;  -- set on purpose
  end if;
  if new.project_type = 'internal' then
    select id into cid from hub_clients where is_internal order by id limit 1;
  else
    select id into cid from hub_clients where lower(trim(client_name)) = lower(trim(new.project_name)) order by id limit 1;
    if cid is null then
      select id into cid from hub_clients where lower(trim(client_name)) = lower(trim(coalesce(new.client_name, ''))) order by id limit 1;
    end if;
    if cid is null and new.project_type = 'retainer' and coalesce(trim(new.project_name), '') <> '' then
      insert into hub_clients (client_name, status) values (trim(new.project_name), 'active') returning id into cid;
    end if;
  end if;
  new.client_id := coalesce(cid, new.client_id);
  return new;
end $$;

drop trigger if exists hub_projects_link_client on public.hub_projects;
create trigger hub_projects_link_client before insert or update of client_name, project_name, client_id on public.hub_projects
  for each row execute function public.hub_projects_link_client();

-- Check: every client and its projects after the cleanup.
select c.id, c.client_name, c.is_internal,
       string_agg(p.id || ' ' || p.project_type || ' · ' || p.project_name, ', ' order by p.id) as projects
  from hub_clients c left join hub_projects p on p.client_id = c.id
 group by c.id order by c.id;
