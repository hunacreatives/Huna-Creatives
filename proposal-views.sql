-- Per-view log for shared proposal pages: when, from what IP, and roughly
-- where. Rows are written only by the log-proposal-view edge function
-- (service role); admins read them in the proposal builder.
--
-- Run once in the Supabase SQL editor BEFORE deploying the matching code.
-- Safe to run more than once.

create table if not exists public.hub_proposal_views (
  id          bigint generated always as identity primary key,
  proposal_id bigint not null references public.hub_proposals(id) on delete cascade,
  viewed_at   timestamptz not null default now(),
  ip          text,
  city        text,
  country     text,
  user_agent  text
);

create index if not exists hub_proposal_views_proposal_idx
  on public.hub_proposal_views (proposal_id, viewed_at desc);

alter table public.hub_proposal_views enable row level security;

drop policy if exists "Admins read proposal views" on public.hub_proposal_views;
create policy "Admins read proposal views"
  on public.hub_proposal_views for select
  using (exists (
    select 1 from hub_users
    where id = auth.uid() and role in ('admin', 'owner', 'hr')
  ));
-- No insert policy: writes come from the edge function on the service role.
