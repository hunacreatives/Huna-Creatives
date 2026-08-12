-- Optional "dotted-line" secondary reporting relationship, alongside the
-- primary manager_id used for the org chart's solid-line hierarchy.
alter table hub_users add column if not exists secondary_manager_id uuid references hub_users(id) on delete set null;
