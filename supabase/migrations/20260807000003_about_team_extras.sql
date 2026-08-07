-- Not everyone on the public About page has a Hub account (e.g. founders/
-- partners who don't need employee access). This is a small standalone
-- roster for exactly those people, managed from a dedicated admin page
-- rather than the Employees list. Unlike hub_users, nothing here is
-- sensitive, so it's safe to read publicly outright.
create table if not exists hub_about_team_extras (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  job_title text not null default '',
  bio text not null default '',
  avatar_url text,
  is_active boolean not null default true,
  sort_order int not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table hub_about_team_extras enable row level security;

create policy "Public read active about team extras" on hub_about_team_extras
  for select using (is_active = true);

create policy "Admins manage about team extras" on hub_about_team_extras
  for all using (is_hub_admin());

insert into hub_about_team_extras (full_name, job_title, bio, avatar_url, sort_order) values
  ('Francis Fiel Roble', 'Founder/Creative Director',
   'The visionary behind Huna. Francis leads with bold ideas and a deep belief that design should always serve a purpose.',
   '/images/team-francis-fiel-roble.webp', 0),
  ('Thamara Ong', 'Partner & Senior Brand Strategist',
   'Thamara is the strategic force behind every brand story. She turns insights into direction and ideas into impact.',
   '/images/team-thamara-ong.webp', 10);
