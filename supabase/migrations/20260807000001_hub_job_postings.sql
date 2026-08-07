-- Job postings for the public careers page, manageable from the Hub instead
-- of being hardcoded in src/pages/careers/page.tsx.
create table if not exists hub_job_postings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type text not null default 'Full-Time',
  shift text not null default '',
  start_date text not null default 'ASAP',
  location text not null default 'Remote',
  summary text not null default '',
  what_youll_do text[] not null default '{}',
  what_you_bring text[] not null default '{}',
  why_join_us text[] not null default '{}',
  portfolio_required boolean not null default false,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table hub_job_postings enable row level security;

-- Public (anon) careers page only ever needs active postings.
create policy "Public read active job postings" on hub_job_postings
  for select using (is_active = true);

-- is_hub_admin() is already defined in fix-rls.sql
create policy "Admins manage job postings" on hub_job_postings
  for all using (is_hub_admin());

-- Carry over the one listing that used to be hardcoded so nothing goes blank.
insert into hub_job_postings (
  title, type, shift, start_date, location, summary,
  what_youll_do, what_you_bring, why_join_us, portfolio_required, sort_order
) values (
  'Graphic Designer', 'Full-Time', '11:00 PM - 7:00 AM (PH Time)', 'ASAP', 'Remote',
  'We are looking for a full-time Graphic Designer with a minimalist, clean design approach and strong experience creating visuals for the food industry, including menus, flyers, and marketing materials.',
  array[
    'Design graphics for menus, flyers, promotions, and digital content',
    'Create clean, modern visuals aligned with brand guidelines',
    'Support ongoing marketing and design needs',
    'Collaborate with the team to produce high-quality ad creatives',
    'Work full-time from 11:00 PM - 7:00 AM (PH Time)'
  ],
  array[
    'Proven experience in the food industry (menus, flyers, etc.)',
    'Strong eye for minimalist, clean, and modern design',
    'Non-negotiable: Proficiency in Adobe Photoshop',
    'Bonus: Experience with Adobe Illustrator',
    'Ability to follow direction and work efficiently',
    'Strong portfolio showcasing relevant design work'
  ],
  array[
    'Full-time position',
    'Competitive salary based on experience',
    'Opportunity to work with a growing creative team',
    'Must be available to start ASAP'
  ],
  true, 0
);
