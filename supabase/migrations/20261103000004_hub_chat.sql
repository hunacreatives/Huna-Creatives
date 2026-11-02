-- Stage 0 · 4 of 4 (run after 20261103000001–3):
-- Sentro chat — channels, DMs, group DMs, threads, mentions, reactions, files,
-- read markers, live delivery — tied to the work:
--   • every project gets a chat whose members follow the project team
--   • every task can have its own thread (made the first time someone opens it)
--   • tasks remember the message they were made from (source_message_id)
-- Project and task chats use the hub's existing access checks
-- (is_hub_staff, is_assigned_to_project, is_assigned_to_task), so chat access
-- always matches project access.
--
-- How a message travels: the app inserts it, then a trigger sends the saved row
-- to each member's private Realtime topic (chat:u:<user id>). Nothing polls.
-- Typing and online dots ride on client broadcasts (chat:t:<conversation>,
-- chat:presence) and are never stored.
--
-- Run once in the Supabase SQL editor BEFORE pushing the app code. Safe to re-run.

-- ── Tables ─────────────────────────────────────────────────────────────────

create table if not exists public.hub_chat_conversations (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('channel', 'dm', 'group', 'project', 'task')),
  name text,                                   -- channels: 'general'; projects: the project name
  project_id bigint references public.hub_projects(id) on delete cascade,   -- project chats and task threads
  task_id bigint references public.hub_project_tasks(id) on delete cascade, -- task threads
  client_id bigint references public.hub_clients(id) on delete set null,    -- groups project chats under their client
  topic text,
  is_private boolean not null default false,
  auto_join boolean not null default false,    -- everyone is added (e.g. #general)
  dm_key text unique,                          -- sorted member ids, so a DM is never created twice
  created_by uuid references public.hub_users(id) on delete set null,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  archived_at timestamptz,
  check (kind <> 'channel' or name is not null),
  check (kind <> 'project' or project_id is not null),
  check (kind <> 'task' or (task_id is not null and project_id is not null))
);
create unique index if not exists hub_chat_channel_name_idx
  on public.hub_chat_conversations (lower(name)) where kind = 'channel';
create unique index if not exists hub_chat_project_conv_idx
  on public.hub_chat_conversations (project_id) where kind = 'project';
create unique index if not exists hub_chat_task_conv_idx
  on public.hub_chat_conversations (task_id) where kind = 'task';

create table if not exists public.hub_chat_members (
  conversation_id uuid not null references public.hub_chat_conversations(id) on delete cascade,
  user_id uuid not null references public.hub_users(id) on delete cascade,
  last_read_id bigint not null default 0,      -- everything up to this message id has been seen
  muted boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
create index if not exists hub_chat_members_user_idx on public.hub_chat_members (user_id);

create table if not exists public.hub_chat_messages (
  id bigint generated always as identity primary key,  -- also the order of the conversation
  conversation_id uuid not null references public.hub_chat_conversations(id) on delete cascade,
  user_id uuid references public.hub_users(id) on delete set null,  -- null = Sentro (system)
  client_id uuid unique,                       -- set by the sender's app, so a retried send never duplicates
  parent_id bigint references public.hub_chat_messages(id) on delete cascade,  -- thread reply
  also_in_channel boolean not null default false,  -- thread reply also shown in the channel
  kind text not null default 'message' check (kind in ('message', 'system')),
  body text not null default '' check (char_length(body) <= 8000),
  attachments jsonb not null default '[]'::jsonb,  -- [{ path, name, size, mime, w, h }]
  mentions uuid[] not null default '{}',
  mention_all boolean not null default false,  -- @channel / @here
  reply_count int not null default 0,
  reply_user_ids uuid[] not null default '{}',
  last_reply_at timestamptz,
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists hub_chat_messages_conv_idx on public.hub_chat_messages (conversation_id, id desc);
create index if not exists hub_chat_messages_parent_idx on public.hub_chat_messages (parent_id, id) where parent_id is not null;

create table if not exists public.hub_chat_reactions (
  message_id bigint not null references public.hub_chat_messages(id) on delete cascade,
  user_id uuid not null references public.hub_users(id) on delete cascade,
  emoji text not null check (char_length(emoji) <= 32),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, emoji)
);

-- ── Access helpers ─────────────────────────────────────────────────────────

-- Only active team members use chat; people who left lose access at once.
create or replace function public.hub_chat_active_user()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from hub_users where id = auth.uid() and status = 'active');
$$;

create or replace function public.hub_chat_is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from hub_users where id = auth.uid() and coalesce(role, '') in ('owner', 'admin', 'hr'));
$$;

create or replace function public.hub_chat_is_member(p_conv uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select hub_chat_active_user()
     and exists (select 1 from hub_chat_members where conversation_id = p_conv and user_id = auth.uid());
$$;

-- Members read their conversations; anyone on the team can read a public
-- channel; project chats and task threads follow project access.
create or replace function public.hub_chat_can_read(p_conv uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select hub_chat_active_user() and (
    exists (select 1 from hub_chat_members where conversation_id = p_conv and user_id = auth.uid())
    or exists (
      select 1 from hub_chat_conversations c
       where c.id = p_conv and (
         (c.kind = 'channel' and not c.is_private)
         or (c.kind = 'project' and (is_hub_staff() or is_assigned_to_project(c.project_id)))
         or (c.kind = 'task' and (is_hub_staff() or is_assigned_to_task(c.task_id)))
       ))
  );
$$;

-- Members post. In project chats and task threads, anyone who can see the
-- project may post (staff who aren't on the team included); posting adds them.
create or replace function public.hub_chat_can_post(p_conv uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select hub_chat_is_member(p_conv)
      or (hub_chat_can_read(p_conv)
          and exists (select 1 from hub_chat_conversations where id = p_conv and kind in ('project', 'task')));
$$;

-- Storage and Realtime hand over text (a folder name, a topic suffix).
create or replace function public.hub_chat_uuid(p text)
returns uuid language plpgsql immutable as $$
begin
  return p::uuid;
exception when others then
  return null;
end $$;

-- ── Row level security ─────────────────────────────────────────────────────

alter table public.hub_chat_conversations enable row level security;
alter table public.hub_chat_members enable row level security;
alter table public.hub_chat_messages enable row level security;
alter table public.hub_chat_reactions enable row level security;

-- Writes to conversations and members go through the functions below.
revoke insert, update, delete on public.hub_chat_conversations from anon, authenticated;
revoke insert, update, delete on public.hub_chat_members from anon, authenticated;
-- Messages: the app may insert these columns only; edits and deletes go through functions.
revoke insert, update, delete on public.hub_chat_messages from anon, authenticated;
grant insert (conversation_id, user_id, client_id, parent_id, also_in_channel, body, attachments, mentions, mention_all)
  on public.hub_chat_messages to authenticated;
revoke update on public.hub_chat_reactions from anon, authenticated;
revoke all on public.hub_chat_reactions from anon;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'hub_chat_conversations' and policyname = 'chat read conversations') then
    create policy "chat read conversations" on public.hub_chat_conversations
      for select to authenticated using (hub_chat_can_read(id));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'hub_chat_members' and policyname = 'chat read members') then
    create policy "chat read members" on public.hub_chat_members
      for select to authenticated using (hub_chat_can_read(conversation_id));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'hub_chat_messages' and policyname = 'chat read messages') then
    create policy "chat read messages" on public.hub_chat_messages
      for select to authenticated using (hub_chat_can_read(conversation_id));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'hub_chat_messages' and policyname = 'chat send messages') then
    create policy "chat send messages" on public.hub_chat_messages
      for insert to authenticated
      with check (user_id = auth.uid() and kind = 'message' and hub_chat_can_post(conversation_id));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'hub_chat_reactions' and policyname = 'chat read reactions') then
    create policy "chat read reactions" on public.hub_chat_reactions
      for select to authenticated
      using (exists (select 1 from hub_chat_messages m where m.id = message_id and hub_chat_can_read(m.conversation_id)));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'hub_chat_reactions' and policyname = 'chat add reactions') then
    create policy "chat add reactions" on public.hub_chat_reactions
      for insert to authenticated
      with check (user_id = auth.uid()
        and exists (select 1 from hub_chat_messages m where m.id = message_id and hub_chat_is_member(m.conversation_id)));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'hub_chat_reactions' and policyname = 'chat remove own reactions') then
    create policy "chat remove own reactions" on public.hub_chat_reactions
      for delete to authenticated using (user_id = auth.uid());
  end if;
end $$;

-- ── Live delivery ──────────────────────────────────────────────────────────

-- Sends one event to every member's private topic. A Realtime hiccup must
-- never block a message from saving, so failures only warn.
create or replace function public.hub_chat_broadcast(p_conv uuid, p_event text, p_payload jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare m record;
begin
  for m in select user_id from hub_chat_members where conversation_id = p_conv loop
    perform realtime.send(p_payload, p_event, 'chat:u:' || m.user_id::text, true);
  end loop;
exception when others then
  raise warning 'hub_chat_broadcast failed: %', sqlerrm;
end $$;

-- Thread replies stay one level deep and in the same conversation.
create or replace function public.hub_chat_before_message()
returns trigger language plpgsql security definer set search_path = public as $$
declare p record;
begin
  if new.parent_id is not null then
    select conversation_id, parent_id into p from hub_chat_messages where id = new.parent_id;
    if p is null or p.conversation_id <> new.conversation_id or p.parent_id is not null then
      raise exception 'Replies must be to a message in the same conversation.';
    end if;
  else
    new.also_in_channel := false;
  end if;
  -- Posting into a project chat or task thread joins you to it, so you get replies.
  if new.user_id is not null then
    insert into hub_chat_members (conversation_id, user_id)
    select new.conversation_id, new.user_id
      from hub_chat_conversations c
     where c.id = new.conversation_id and c.kind in ('project', 'task')
    on conflict do nothing;
  end if;
  new.created_at := now();
  return new;
end $$;

drop trigger if exists hub_chat_before_message on public.hub_chat_messages;
create trigger hub_chat_before_message before insert on public.hub_chat_messages
  for each row execute function public.hub_chat_before_message();

create or replace function public.hub_chat_after_message()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update hub_chat_conversations set last_message_at = new.created_at where id = new.conversation_id;
    if new.parent_id is not null then
      -- this update re-fires the trigger, which sends the parent's new reply count
      update hub_chat_messages
         set reply_count = reply_count + 1,
             last_reply_at = new.created_at,
             reply_user_ids = case when new.user_id is null or new.user_id = any(reply_user_ids)
                                   then reply_user_ids else reply_user_ids || new.user_id end
       where id = new.parent_id;
    end if;
  end if;
  perform hub_chat_broadcast(new.conversation_id, 'message', to_jsonb(new));
  return null;
end $$;

drop trigger if exists hub_chat_after_message on public.hub_chat_messages;
create trigger hub_chat_after_message after insert or update on public.hub_chat_messages
  for each row execute function public.hub_chat_after_message();

create or replace function public.hub_chat_after_reaction()
returns trigger language plpgsql security definer set search_path = public as $$
declare r record; conv uuid;
begin
  r := coalesce(new, old);
  select conversation_id into conv from hub_chat_messages where id = r.message_id;
  if conv is not null then
    perform hub_chat_broadcast(conv, 'reaction', jsonb_build_object(
      'op', lower(tg_op), 'message_id', r.message_id, 'user_id', r.user_id, 'emoji', r.emoji, 'conversation_id', conv));
  end if;
  return null;
end $$;

drop trigger if exists hub_chat_after_reaction on public.hub_chat_reactions;
create trigger hub_chat_after_reaction after insert or delete on public.hub_chat_reactions
  for each row execute function public.hub_chat_after_reaction();

-- Joining, leaving, renames: the affected people reload their sidebar.
create or replace function public.hub_chat_after_member()
returns trigger language plpgsql security definer set search_path = public as $$
declare r record;
begin
  r := coalesce(new, old);
  begin
    perform realtime.send(jsonb_build_object('conversation_id', r.conversation_id, 'op', lower(tg_op)),
      'membership', 'chat:u:' || r.user_id::text, true);
  exception when others then
    raise warning 'membership broadcast failed: %', sqlerrm;
  end;
  return null;
end $$;

drop trigger if exists hub_chat_after_member on public.hub_chat_members;
create trigger hub_chat_after_member after insert or delete on public.hub_chat_members
  for each row execute function public.hub_chat_after_member();

create or replace function public.hub_chat_after_conversation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (new.name, new.topic, new.archived_at, new.is_private) is distinct from (old.name, old.topic, old.archived_at, old.is_private) then
    perform hub_chat_broadcast(new.id, 'conversation', to_jsonb(new));
  end if;
  return null;
end $$;

drop trigger if exists hub_chat_after_conversation on public.hub_chat_conversations;
create trigger hub_chat_after_conversation after update on public.hub_chat_conversations
  for each row execute function public.hub_chat_after_conversation();

-- ── Project chats follow the project team ──────────────────────────────────

-- Makes the project's chat if it doesn't exist and adds the whole team.
create or replace function public.hub_chat_ensure_project_chat(p_project_id bigint)
returns uuid language plpgsql security definer set search_path = public as $$
declare conv uuid; p record;
begin
  select id, project_name, client_id, archived_at into p from hub_projects where id = p_project_id;
  if not found then return null; end if;
  select id into conv from hub_chat_conversations where kind = 'project' and project_id = p_project_id;
  if conv is null then
    insert into hub_chat_conversations (kind, name, project_id, client_id, is_private, archived_at)
    values ('project', p.project_name, p.id, p.client_id, true, p.archived_at)
    on conflict do nothing
    returning id into conv;
    if conv is null then
      select id into conv from hub_chat_conversations where kind = 'project' and project_id = p_project_id;
    end if;
  end if;
  insert into hub_chat_members (conversation_id, user_id)
  select conv, pc.contractor_id from hub_project_contractors pc
   where pc.project_id = p_project_id and pc.contractor_id is not null
  on conflict do nothing;
  return conv;
end $$;

create or replace function public.hub_chat_after_project()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform hub_chat_ensure_project_chat(new.id);
  elsif (new.project_name, new.client_id, new.archived_at) is distinct from (old.project_name, old.client_id, old.archived_at) then
    update hub_chat_conversations
       set name = new.project_name, client_id = new.client_id, archived_at = new.archived_at
     where kind = 'project' and project_id = new.id;
  end if;
  return null;
end $$;

drop trigger if exists hub_chat_after_project on public.hub_projects;
create trigger hub_chat_after_project after insert or update on public.hub_projects
  for each row execute function public.hub_chat_after_project();

-- Joining the project team joins its chat and task threads; leaving it leaves them.
create or replace function public.hub_chat_after_project_member()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' and new.contractor_id is not null then
    perform hub_chat_ensure_project_chat(new.project_id);
    insert into hub_chat_members (conversation_id, user_id)
    select c.id, new.contractor_id from hub_chat_conversations c
     where c.project_id = new.project_id and c.kind in ('project', 'task')
    on conflict do nothing;
  elsif tg_op = 'DELETE' and old.contractor_id is not null then
    delete from hub_chat_members m
     using hub_chat_conversations c
     where m.conversation_id = c.id and c.project_id = old.project_id
       and c.kind in ('project', 'task') and m.user_id = old.contractor_id
       and not exists (select 1 from hub_project_contractors pc
                        where pc.project_id = old.project_id and pc.contractor_id = old.contractor_id);
  end if;
  return null;
end $$;

drop trigger if exists hub_chat_after_project_member on public.hub_project_contractors;
create trigger hub_chat_after_project_member after insert or delete on public.hub_project_contractors
  for each row execute function public.hub_chat_after_project_member();

-- A task's thread, made the first time someone opens it. Members: the project team.
create or replace function public.hub_chat_task_thread(p_task_id bigint)
returns uuid language plpgsql security definer set search_path = public as $$
declare conv uuid; t record;
begin
  if not (hub_chat_active_user() and (is_hub_staff() or is_assigned_to_task(p_task_id))) then
    raise exception 'Not allowed.';
  end if;
  select id, project_id, title into t from hub_project_tasks where id = p_task_id;
  if not found then raise exception 'Task not found.'; end if;
  select id into conv from hub_chat_conversations where kind = 'task' and task_id = p_task_id;
  if conv is null then
    insert into hub_chat_conversations (kind, name, project_id, task_id, client_id, is_private)
    select 'task', t.title, t.project_id, t.id, p.client_id, true from hub_projects p where p.id = t.project_id
    on conflict do nothing
    returning id into conv;
    if conv is null then
      select id into conv from hub_chat_conversations where kind = 'task' and task_id = p_task_id;
    end if;
    insert into hub_chat_members (conversation_id, user_id)
    select conv, pc.contractor_id from hub_project_contractors pc
     where pc.project_id = t.project_id and pc.contractor_id is not null
    on conflict do nothing;
  end if;
  return conv;
end $$;

-- Tasks made from a message link back to it.
alter table public.hub_project_tasks
  add column if not exists source_message_id bigint references public.hub_chat_messages(id) on delete set null;

-- Every current project gets its chat.
do $$
declare r record;
begin
  for r in select id from public.hub_projects loop
    perform public.hub_chat_ensure_project_chat(r.id);
  end loop;
end $$;

-- Who may listen and send on which Realtime topic.
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'realtime' and tablename = 'messages' and policyname = 'hub chat listen') then
    create policy "hub chat listen" on realtime.messages for select to authenticated using (
      realtime.topic() = 'chat:u:' || auth.uid()::text
      or (realtime.topic() = 'chat:presence' and public.hub_chat_active_user())
      or (realtime.topic() like 'chat:t:%' and public.hub_chat_is_member(public.hub_chat_uuid(substr(realtime.topic(), 8))))
    );
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'realtime' and tablename = 'messages' and policyname = 'hub chat send') then
    create policy "hub chat send" on realtime.messages for insert to authenticated with check (
      (realtime.topic() = 'chat:presence' and public.hub_chat_active_user())
      or (realtime.topic() like 'chat:t:%' and public.hub_chat_is_member(public.hub_chat_uuid(substr(realtime.topic(), 8))))
    );
  end if;
end $$;

-- ── Functions the app calls ────────────────────────────────────────────────

-- Everyone on the team, for names, avatars and @mentions.
create or replace function public.hub_chat_people()
returns table (id uuid, full_name text, avatar_url text, job_title text, department text, role text)
language sql stable security definer set search_path = public as $$
  select u.id, u.full_name, u.avatar_url, u.job_title, u.department, u.role
    from hub_users u
   where hub_chat_active_user() and u.status = 'active'
   order by u.full_name;
$$;

-- Adds the caller to every auto-join channel (new hires land in #general).
create or replace function public.hub_chat_bootstrap()
returns void language plpgsql security definer set search_path = public as $$
begin
  if not hub_chat_active_user() then return; end if;
  insert into hub_chat_members (conversation_id, user_id)
  select c.id, auth.uid() from hub_chat_conversations c
   where c.auto_join and c.archived_at is null
  on conflict do nothing;
end $$;

-- The sidebar in one call: every conversation the caller is in, with unread
-- and mention counts worked out from their read marker. Task threads live on
-- their task, not in the sidebar. In DMs every message counts as a mention;
-- in channels and project chats only @you, @channel and @here do.
drop function if exists public.hub_chat_sidebar();
create or replace function public.hub_chat_sidebar()
returns table (
  id uuid, kind text, name text, topic text, is_private boolean, auto_join boolean,
  project_id bigint, client_id bigint,
  last_message_at timestamptz, last_read_id bigint, muted boolean,
  unread int, mentions int, member_ids uuid[], created_by uuid
)
language sql stable security definer set search_path = public as $$
  select c.id, c.kind, c.name, c.topic, c.is_private, c.auto_join,
         c.project_id, c.client_id,
         c.last_message_at, m.last_read_id, m.muted,
         (select count(*)::int from hub_chat_messages x
           where x.conversation_id = c.id and x.id > m.last_read_id
             and (x.parent_id is null or x.also_in_channel)
             and x.deleted_at is null and x.user_id is distinct from auth.uid()),
         (select count(*)::int from hub_chat_messages x
           where x.conversation_id = c.id and x.id > m.last_read_id
             and (x.parent_id is null or x.also_in_channel)
             and x.deleted_at is null and x.user_id is distinct from auth.uid()
             and (c.kind in ('dm', 'group') or auth.uid() = any(x.mentions) or x.mention_all)),
         (select array_agg(mm.user_id order by mm.joined_at) from hub_chat_members mm where mm.conversation_id = c.id),
         c.created_by
    from hub_chat_members m
    join hub_chat_conversations c on c.id = m.conversation_id
   where m.user_id = auth.uid() and hub_chat_active_user() and c.archived_at is null and c.kind <> 'task'
   order by c.last_message_at desc;
$$;

create or replace function public.hub_chat_mark_read(p_conv uuid, p_message_id bigint)
returns void language sql security definer set search_path = public as $$
  update hub_chat_members set last_read_id = greatest(last_read_id, p_message_id)
   where conversation_id = p_conv and user_id = auth.uid();
$$;

create or replace function public.hub_chat_set_muted(p_conv uuid, p_muted boolean)
returns void language sql security definer set search_path = public as $$
  update hub_chat_members set muted = p_muted where conversation_id = p_conv and user_id = auth.uid();
$$;

-- Finds or creates the DM (2 people) or group DM (3–9) between the caller and these people.
create or replace function public.hub_chat_open_dm(p_user_ids uuid[])
returns uuid language plpgsql security definer set search_path = public as $$
declare ids uuid[]; key text; conv uuid;
begin
  if not hub_chat_active_user() then raise exception 'Not allowed.'; end if;
  select array_agg(distinct u order by u) into ids
    from unnest(array_append(coalesce(p_user_ids, '{}'), auth.uid())) u
   where exists (select 1 from hub_users h where h.id = u and h.status = 'active');
  if ids is null or array_length(ids, 1) < 2 or array_length(ids, 1) > 9 then
    raise exception 'A direct message is with 1 to 8 people on the team.';
  end if;
  key := array_to_string(ids, ',');
  select id into conv from hub_chat_conversations where dm_key = key;
  if conv is null then
    insert into hub_chat_conversations (kind, dm_key, created_by)
    values (case when array_length(ids, 1) <= 2 then 'dm' else 'group' end, key, auth.uid())
    on conflict (dm_key) do nothing
    returning id into conv;
    if conv is null then
      select id into conv from hub_chat_conversations where dm_key = key;
    end if;
    insert into hub_chat_members (conversation_id, user_id)
    select conv, u from unnest(ids) u on conflict do nothing;
  end if;
  return conv;
end $$;

create or replace function public.hub_chat_channel_slug(p_name text)
returns text language sql immutable as $$
  select left(trim(both '-' from regexp_replace(regexp_replace(lower(trim(coalesce(p_name, ''))), '\s+', '-', 'g'), '[^a-z0-9_-]', '', 'g')), 80);
$$;

create or replace function public.hub_chat_create_channel(p_name text, p_private boolean, p_topic text, p_member_ids uuid[])
returns uuid language plpgsql security definer set search_path = public as $$
declare slug text; conv uuid;
begin
  if not hub_chat_active_user() then raise exception 'Not allowed.'; end if;
  slug := hub_chat_channel_slug(p_name);
  if slug = '' then raise exception 'Give the channel a name.'; end if;
  if exists (select 1 from hub_chat_conversations where kind = 'channel' and lower(name) = slug) then
    raise exception 'There is already a #% channel.', slug;
  end if;
  insert into hub_chat_conversations (kind, name, topic, is_private, created_by)
  values ('channel', slug, nullif(trim(coalesce(p_topic, '')), ''), coalesce(p_private, false), auth.uid())
  returning id into conv;
  insert into hub_chat_members (conversation_id, user_id)
  select conv, u from unnest(array_append(coalesce(p_member_ids, '{}'), auth.uid())) u
   where exists (select 1 from hub_users h where h.id = u and h.status = 'active')
  on conflict do nothing;
  return conv;
end $$;

-- Join a public channel yourself, or add people to a channel you're in.
create or replace function public.hub_chat_add_members(p_conv uuid, p_user_ids uuid[])
returns void language plpgsql security definer set search_path = public as $$
declare c record;
begin
  select * into c from hub_chat_conversations where id = p_conv;
  if c is null or c.kind <> 'channel' or not hub_chat_active_user() then raise exception 'Not allowed.'; end if;
  if not (hub_chat_is_member(p_conv) or (not c.is_private and p_user_ids = array[auth.uid()])) then
    raise exception 'Join the channel before adding people.';
  end if;
  insert into hub_chat_members (conversation_id, user_id)
  select p_conv, u from unnest(p_user_ids) u
   where exists (select 1 from hub_users h where h.id = u and h.status = 'active')
  on conflict do nothing;
end $$;

create or replace function public.hub_chat_leave(p_conv uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from hub_chat_conversations where id = p_conv and kind = 'channel') then
    raise exception 'You can only leave channels.';
  end if;
  delete from hub_chat_members where conversation_id = p_conv and user_id = auth.uid();
end $$;

-- Topic: any member. Rename or archive: whoever made the channel, or an admin.
create or replace function public.hub_chat_update_channel(p_conv uuid, p_name text, p_topic text, p_archive boolean)
returns void language plpgsql security definer set search_path = public as $$
declare c record; slug text;
begin
  select * into c from hub_chat_conversations where id = p_conv;
  if c is null or c.kind <> 'channel' or not hub_chat_is_member(p_conv) then raise exception 'Not allowed.'; end if;
  slug := hub_chat_channel_slug(coalesce(p_name, c.name));
  if (slug <> c.name or coalesce(p_archive, false)) and not (c.created_by = auth.uid() or hub_chat_is_admin()) then
    raise exception 'Only the channel creator or an admin can rename or archive it.';
  end if;
  if slug = '' then raise exception 'Give the channel a name.'; end if;
  update hub_chat_conversations
     set name = slug,
         topic = case when p_topic is null then topic else nullif(trim(p_topic), '') end,
         archived_at = case when coalesce(p_archive, false) then now() else archived_at end
   where id = p_conv;
end $$;

create or replace function public.hub_chat_edit_message(p_id bigint, p_body text, p_mentions uuid[], p_mention_all boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  update hub_chat_messages
     set body = p_body, mentions = coalesce(p_mentions, '{}'), mention_all = coalesce(p_mention_all, false), edited_at = now()
   where id = p_id and user_id = auth.uid() and deleted_at is null and hub_chat_active_user();
  if not found then raise exception 'You can only edit your own messages.'; end if;
end $$;

-- Authors delete their own; admins can remove anyone's.
create or replace function public.hub_chat_delete_message(p_id bigint)
returns void language plpgsql security definer set search_path = public as $$
begin
  update hub_chat_messages
     set body = '', attachments = '[]'::jsonb, mentions = '{}', mention_all = false, deleted_at = now()
   where id = p_id and deleted_at is null and hub_chat_active_user()
     and (user_id = auth.uid() or hub_chat_is_admin());
  if not found then raise exception 'You can only delete your own messages.'; end if;
end $$;

revoke all on function public.hub_chat_broadcast(uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.hub_chat_ensure_project_chat(bigint) from public, anon, authenticated;
do $$
declare f text;
begin
  foreach f in array array[
    'hub_chat_people()', 'hub_chat_bootstrap()', 'hub_chat_sidebar()',
    'hub_chat_mark_read(uuid, bigint)', 'hub_chat_set_muted(uuid, boolean)', 'hub_chat_open_dm(uuid[])',
    'hub_chat_create_channel(text, boolean, text, uuid[])', 'hub_chat_add_members(uuid, uuid[])',
    'hub_chat_leave(uuid)', 'hub_chat_update_channel(uuid, text, text, boolean)',
    'hub_chat_edit_message(bigint, text, uuid[], boolean)', 'hub_chat_delete_message(bigint)',
    'hub_chat_task_thread(bigint)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

-- ── Files ──────────────────────────────────────────────────────────────────
-- Private bucket; files live at <conversation id>/<random id>/<file name> and
-- are read through short-lived signed links.

insert into storage.buckets (id, name, public, file_size_limit)
values ('chat-files', 'chat-files', false, 52428800)
on conflict (id) do nothing;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'chat files read') then
    create policy "chat files read" on storage.objects for select to authenticated
      using (bucket_id = 'chat-files' and public.hub_chat_can_read(public.hub_chat_uuid((storage.foldername(name))[1])));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'chat files upload') then
    create policy "chat files upload" on storage.objects for insert to authenticated
      with check (bucket_id = 'chat-files' and public.hub_chat_is_member(public.hub_chat_uuid((storage.foldername(name))[1])));
  end if;
end $$;

-- ── Starting channels ──────────────────────────────────────────────────────

insert into public.hub_chat_conversations (kind, name, topic, auto_join)
values ('channel', 'general', 'The whole team. Announcements and everyday chat.', true),
       ('channel', 'random', 'Everything that isn''t work.', true)
on conflict do nothing;

insert into public.hub_chat_members (conversation_id, user_id)
select c.id, u.id
  from public.hub_chat_conversations c
  cross join public.hub_users u
 where c.auto_join and u.status = 'active'
on conflict do nothing;

-- Check: #general and #random with everyone, plus one chat per project.
select c.kind, coalesce(c.name, '') as name, count(m.user_id) as members
  from public.hub_chat_conversations c
  left join public.hub_chat_members m on m.conversation_id = c.id
 group by c.kind, c.name
 order by c.kind, c.name;
