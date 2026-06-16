-- Allow 'pending' status on hub_users (contractor created but invite not sent yet)
ALTER TABLE hub_users DROP CONSTRAINT IF EXISTS hub_users_status_check;
ALTER TABLE hub_users ADD CONSTRAINT hub_users_status_check
  CHECK (status IN ('active', 'inactive', 'pending'));
