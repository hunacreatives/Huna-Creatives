-- SmartGrid: calling lists by industry. Callers work one list at a time, in
-- sort_order, and each list carries a short guide for the call.
--
-- Imported leads use status 'queued' until a caller claims them. Older open tabs
-- only ask for 'new' and 'calling', so they can never hand these out early.
-- Leads held back (no phone yet, national operators) reuse retired_at, which
-- already keeps a lead out of queues, counts and Chris's dashboard.

create table if not exists hub_project_lead_lists (
  id bigint generated always as identity primary key,
  project_id bigint not null references hub_projects(id) on delete cascade,
  key text not null,
  name text not null,
  sort_order int not null,
  paused boolean not null default false,
  ask_for text,
  questions text[] not null default '{}',
  good_fit text,
  created_at timestamptz not null default now(),
  unique (project_id, key)
);

alter table hub_project_lead_lists enable row level security;

drop policy if exists "Project team reads lead lists" on hub_project_lead_lists;
create policy "Project team reads lead lists" on hub_project_lead_lists
  for select to authenticated
  using (is_hub_staff() or is_assigned_to_project(project_id));

drop policy if exists "Staff update lead lists" on hub_project_lead_lists;
create policy "Staff update lead lists" on hub_project_lead_lists
  for update to authenticated
  using (is_hub_staff())
  with check (is_hub_staff());

alter table hub_project_leads
  add column if not exists list_id bigint references hub_project_lead_lists(id),
  add column if not exists queue_rank int,
  add column if not exists import_key text,
  add column if not exists website text,
  add column if not exists utility_likely text,
  add column if not exists source text,
  add column if not exists owner_type text,
  add column if not exists capacity_cuft bigint,
  add column if not exists phone_check boolean not null default false,
  add column if not exists utility_confirmed text,
  add column if not exists approx_monthly_bill text,
  add column if not exists owns_building text;

create unique index if not exists idx_hub_project_leads_import_key on hub_project_leads(import_key);
create index if not exists idx_hub_project_leads_list_queue on hub_project_leads(project_id, list_id, status);

alter table hub_project_leads drop constraint if exists hub_project_leads_status_check;
alter table hub_project_leads add constraint hub_project_leads_status_check
  check (status in ('new', 'queued', 'calling', 'complete', 'attempted', 'callback_pending'));

-- The lists, in calling order. Guides can be edited later; re-running won't overwrite them.
insert into hub_project_lead_lists (project_id, key, name, sort_order, ask_for, questions, good_fit)
select p.id, v.key, v.name, v.sort_order, v.ask_for, v.questions, v.good_fit
from hub_projects p
cross join (values
  ('hotels', 'Hotels', 1,
    'General manager or chief engineer',
    array['Who looks after the electric bill?', 'Roughly how much is the monthly electric bill?', 'Do you own the building or lease it?'],
    'Monthly bill above about $13K in summer or $9K in winter.'),
  ('cold_storage', 'Cold Storage', 2,
    'The owner or facility manager. Use the contact name on the card if there is one.',
    array['Which utility serves this site?', 'Roughly how much is the summer electric bill?', 'Do you own the building or lease it?'],
    'Independent operators who decide on energy at the site, with a large monthly bill.'),
  ('rice_mills', 'Rice Mills', 3,
    'The mill or plant manager. If you reach a head office, ask for the California mill.',
    array['Where is the mill itself?', 'Which utility serves the mill?', 'Roughly how much is the monthly electric bill in season?'],
    'A mill in California with a large monthly bill. City-owned utilities are a weaker fit.'),
  ('wineries', 'Wineries', 4,
    'The owner, winemaker or operations manager',
    array['Do you crush and ferment on site?', 'Roughly how much is the summer electric bill?', 'Do you own the building or lease it?'],
    'Production wineries. Bills above about $15K a month are mostly these, and tasting rooms usually fall short. Call November to July, not August to October.'),
  ('food_processors', 'Food Processors', 5,
    'The plant manager or facilities manager. If you reach a head office, ask for the California plant.',
    array['Which California plant does this cover?', 'Which utility serves the plant?', 'Roughly how much is the monthly electric bill?'],
    'A California plant with a large monthly bill, where energy can be decided locally.'),
  ('manufacturers', 'Manufacturers', 6,
    'The plant manager, facilities manager or owner',
    array['Do you run your plant in California?', 'Which utility serves it?', 'Roughly how much is the monthly electric bill?'],
    'A California plant with a large monthly bill. Small shops usually fall short.')
) as v(key, name, sort_order, ask_for, questions, good_fit)
where p.project_name = 'SmartGrid Western'
on conflict (project_id, key) do nothing;

-- Every current lead is a hotel. Largest first among leads with the same number of tries.
with ranked as (
  select l.id, row_number() over (order by l.number_of_rooms desc nulls last, l.account_name) as rank
  from hub_project_leads l
  join hub_projects p on p.id = l.project_id and p.project_name = 'SmartGrid Western'
  where l.list_id is null
)
update hub_project_leads l
set list_id = ll.id, queue_rank = ranked.rank
from ranked, hub_project_lead_lists ll
where l.id = ranked.id and ll.project_id = l.project_id and ll.key = 'hotels';

-- Progress per list, for the caller's banner. Runs as the caller, so RLS still applies.
create or replace function hub_lead_list_progress(p_project_id bigint)
returns table (list_id bigint, total int, called int, remaining int)
language sql stable as $$
  select l.list_id,
    count(*)::int,
    (count(*) filter (where l.last_worked_at is not null))::int,
    (count(*) filter (where l.status in ('new', 'queued', 'calling')))::int
  from hub_project_leads l
  where l.project_id = p_project_id and l.retired_at is null and l.list_id is not null
  group by l.list_id
$$;

grant execute on function hub_lead_list_progress(bigint) to authenticated;
