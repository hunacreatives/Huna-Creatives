-- Fix entity_id to accept UUID values for lead tracking
alter table hub_project_activity
  alter column entity_id type uuid using entity_id::text::uuid;
