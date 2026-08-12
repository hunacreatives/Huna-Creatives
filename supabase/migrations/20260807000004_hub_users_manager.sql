-- Reporting structure for the Employees org chart. Nullable/self-referencing —
-- people with no manager are treated as top-level (e.g. the founder).
alter table hub_users add column if not exists manager_id uuid references hub_users(id) on delete set null;
