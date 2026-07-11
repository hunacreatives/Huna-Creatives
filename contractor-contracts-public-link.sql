-- Contractor contracts through the public /c/<slug> signing flow.
-- AI/custom contractor agreements are stored in hub_client_contracts
-- (project_id stays null); contractor_id links back to the hub user.
alter table hub_client_contracts
  add column if not exists contractor_id uuid references hub_users(id) on delete set null;

create index if not exists hub_client_contracts_contractor_id_idx
  on hub_client_contracts(contractor_id);
