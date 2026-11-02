-- Notice to Explain, attached to an employee's pay period.
-- HR lists the dates in question (absences without notice, hours logged but not
-- worked), the employee replies in writing, HR records a decision. It never
-- holds pay: hours actually worked are paid on the normal schedule.
--
-- Run once in the Supabase SQL editor BEFORE pushing the app code. Safe to re-run.

create table if not exists public.hub_notices_to_explain (
  id uuid primary key default gen_random_uuid(),
  contractor_id uuid not null references public.hub_users(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  incidents jsonb not null default '[]'::jsonb,   -- [{ "date": "2026-10-23", "hours": 8 }]
  details text not null,                          -- what happened, in HR's words
  reply_by date not null,                         -- at least 5 calendar days out
  status text not null default 'open' check (status in ('open', 'answered', 'decided')),
  response text,
  responded_at timestamptz,
  decision text check (decision in ('no_action', 'warning', 'final_warning', 'suspension', 'dismissal')),
  decision_note text,
  decided_at timestamptz,
  decided_by uuid references public.hub_users(id),
  issued_by uuid references public.hub_users(id),
  created_at timestamptz not null default now()
);

create index if not exists hub_notices_to_explain_period_idx
  on public.hub_notices_to_explain (period_start, contractor_id);

alter table public.hub_notices_to_explain enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'hub_notices_to_explain' and policyname = 'Employees can view own notices') then
    create policy "Employees can view own notices" on public.hub_notices_to_explain
      for select using (contractor_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where tablename = 'hub_notices_to_explain' and policyname = 'Admins manage notices') then
    create policy "Admins manage notices" on public.hub_notices_to_explain
      for all using (exists (select 1 from public.hub_users where id = auth.uid() and role in ('admin', 'owner', 'hr')));
  end if;
end $$;

-- Employees can't update the table directly (they could rewrite HR's text);
-- this lets them write their reply once, on their own open notice.
create or replace function public.reply_to_notice_to_explain(p_notice_id uuid, p_response text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(trim(p_response), '') = '' then
    raise exception 'Write your explanation before sending.';
  end if;
  update hub_notices_to_explain
     set response = trim(p_response), responded_at = now(), status = 'answered'
   where id = p_notice_id
     and contractor_id = auth.uid()
     and status = 'open';
  if not found then
    raise exception 'This notice was already answered or closed.';
  end if;
end $$;

revoke all on function public.reply_to_notice_to_explain(uuid, text) from public, anon;
grant execute on function public.reply_to_notice_to_explain(uuid, text) to authenticated;

select count(*) as notices_on_file from public.hub_notices_to_explain;
