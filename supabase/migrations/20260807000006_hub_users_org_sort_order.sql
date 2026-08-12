-- Controls display order among siblings in the Employees org chart (lower
-- shows first/leftmost within the same manager's row). Independent of
-- about_sort_order, which is specific to the public About page.
alter table hub_users add column if not exists org_sort_order int not null default 100;
