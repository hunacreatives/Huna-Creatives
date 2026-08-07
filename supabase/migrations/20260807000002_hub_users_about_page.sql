-- job_title: the employee's specific role/title (e.g. "Senior Graphic
-- Designer"), shown in the admin Employees list/forms and reused as the
-- public-facing title on hunacreatives.com/about. Distinct from `department`
-- (a fixed category) and from `role` (admin/contractor access level).
alter table hub_users add column if not exists job_title text;

-- Lets the public /about team section be controlled from the Hub instead of
-- a hardcoded array in src/pages/about/page.tsx. Opt-in (show_on_about
-- defaults false) since hub_users otherwise only has admin-only RLS access —
-- job_title/about_bio/avatar_url/department are the only fields ever
-- exposed publicly, via a dedicated edge function that selects just these
-- columns and only for rows with show_on_about = true.
alter table hub_users add column if not exists about_bio text;
alter table hub_users add column if not exists show_on_about boolean not null default false;
alter table hub_users add column if not exists about_sort_order int not null default 100;

-- Seed the people currently hardcoded on /about, preserving their existing
-- title/bio/order, so the page doesn't go blank on cutover. No-ops for
-- anyone whose email doesn't match (e.g. "Dan" the freelance web designer,
-- who isn't in hub_users at all — flagged separately, not silently dropped).
update hub_users set show_on_about = true, about_sort_order = 0,
  job_title = 'Founder/Creative Director',
  about_bio = 'The visionary behind Huna. Francis leads with bold ideas and a deep belief that design should always serve a purpose.'
  where email = 'ffroble@icloud.com';

update hub_users set show_on_about = true, about_sort_order = 30,
  job_title = 'HR Specialist/Admin',
  about_bio = 'Abigail is the backbone of the team. She keeps everything running smoothly so the creatives can focus on what they do best.'
  where email = 'duterteabigaile@gmail.com';

update hub_users set show_on_about = true, about_sort_order = 40,
  job_title = 'Admin/Account Specialist',
  about_bio = 'Angela is the bridge between partners and the team. She ensures every project runs on time and every brand feels heard.'
  where email = 'angelalouiseando@gmail.com';

update hub_users set show_on_about = true, about_sort_order = 50,
  job_title = 'Admin/Account Specialist',
  about_bio = 'Claudette keeps brand relationships strong and operations seamless, ensuring every account is handled with care and precision.'
  where email = 'claudettemaytahil@gmail.com';

update hub_users set show_on_about = true, about_sort_order = 20,
  job_title = 'Senior Graphic Designer',
  about_bio = 'Katleen crafts visuals that speak before words do. She blends creativity with precision to deliver designs that truly stand out.'
  where email = 'nellaskatleen@gmail.com';
