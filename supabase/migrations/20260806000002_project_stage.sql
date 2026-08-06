-- Project lifecycle stage, genericized for a creative agency (ported from
-- fs-architects' project_stage migration, replacing its architecture-firm
-- specific stage list).
alter table hub_projects
  add column if not exists stage text not null default 'Discovery'
  check (stage in (
    'Discovery',
    'Proposal',
    'In Production',
    'Client Review',
    'Revisions',
    'Final Delivery',
    'Closed'
  ));
