create table if not exists hub_client_contracts (
  id uuid primary key default gen_random_uuid(),
  project_id int references hub_projects(id) on delete cascade,
  slug text unique not null,
  title text not null,
  body text not null,
  total_value numeric,
  currency text default 'PHP',
  status text default 'draft' check (status in ('draft', 'sent', 'signed')),
  signed_at timestamptz,
  signer_name text,
  signer_ip text,
  created_at timestamptz default now()
);

alter table hub_client_contracts enable row level security;

-- Admins/owners can do everything
create policy "admin_all" on hub_client_contracts
  for all
  using (
    exists (
      select 1 from hub_users
      where hub_users.id = auth.uid()
        and hub_users.role in ('owner', 'admin')
    )
  );

-- Public can read sent/signed contracts by slug (for client-facing view)
create policy "public_read_sent" on hub_client_contracts
  for select
  using (status in ('sent', 'signed'));

-- Public can update signing fields on sent contracts
create policy "public_sign" on hub_client_contracts
  for update
  using (status = 'sent')
  with check (status = 'signed');

create index if not exists hub_client_contracts_project_id_idx on hub_client_contracts(project_id);
create index if not exists hub_client_contracts_slug_idx on hub_client_contracts(slug);
