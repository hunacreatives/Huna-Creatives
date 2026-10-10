-- SOPs: one library.
-- The admin page used to manage hub_sop while employees read hub_sops, so nothing
-- created on the admin side ever reached employees. Everything now lives in hub_sops;
-- "Admin only" (visibility = 'admin_only') hides an SOP from employees.
-- hub_sop is left in place untouched as a backup and is no longer read by the app.

-- Preview (run first): what moves over, and what is skipped because the employee
-- library already has an SOP with the same title
-- select s.id, s.title, s.category, s.published,
--   exists (select 1 from hub_sops x where lower(x.title) = lower(s.title)) as skipped_duplicate
-- from hub_sop s
-- order by skipped_duplicate, s.category, s.title;

alter table hub_sops
  add column if not exists visibility text not null default 'all';

alter table hub_sops drop constraint if exists hub_sops_visibility_check;
alter table hub_sops
  add constraint hub_sops_visibility_check check (visibility in ('all', 'admin_only'));

-- Admin-library SOPs come over as Admin only; untick it per SOP to share with employees.
insert into hub_sops (title, category, content, video_url, published, visibility, created_at, updated_at)
select
  s.title,
  case s.category
    when 'onboarding' then 'Onboarding'
    when 'reporting'  then 'Reporting'
    when 'ad_launch'  then 'Ad Launch'
    when 'slack'      then 'Communication'
    when 'training'   then 'Training'
    when 'branding'   then 'Branding'
    else 'General'
  end,
  s.content,
  s.video_url,
  s.published,
  'admin_only',
  coalesce(s.created_at, now()),
  coalesce(s.updated_at, now())
from hub_sop s
where not exists (select 1 from hub_sops x where lower(x.title) = lower(s.title));

comment on table hub_sop is 'Retired Oct 2026: merged into hub_sops (as admin_only). Kept as a backup; not read by the app.';

-- Reads: admin-side roles see everything; employees see published, non-admin-only SOPs.
-- Writes: owner/admin, as before. Drops every existing hub_sops policy first, since
-- any leftover permissive select policy would leak admin-only SOPs.
do $$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'hub_sops' loop
    execute format('drop policy %I on hub_sops', p.policyname);
  end loop;
end $$;

alter table hub_sops enable row level security;

create policy "Read sops" on hub_sops for select using (
  exists (select 1 from hub_users u where u.id = auth.uid() and u.role in ('owner', 'admin', 'hr'))
  or (auth.uid() is not null and published and visibility = 'all')
);

create policy "Admins manage sops" on hub_sops for all
  using (exists (select 1 from hub_users u where u.id = auth.uid() and u.role in ('owner', 'admin')))
  with check (exists (select 1 from hub_users u where u.id = auth.uid() and u.role in ('owner', 'admin')));

-- Title lookup for link previews (/api/sop-preview). Only published, non-admin-only
-- SOPs are returned, so a shared link never reveals an admin-only title.
create or replace function sop_link_preview(p_id bigint)
returns table (title text, category text)
language sql
stable
security definer
set search_path = public
as $$
  select s.title, s.category
  from hub_sops s
  where s.id = p_id and s.published and s.visibility = 'all'
$$;

revoke all on function sop_link_preview(bigint) from public;
grant execute on function sop_link_preview(bigint) to anon, authenticated;
