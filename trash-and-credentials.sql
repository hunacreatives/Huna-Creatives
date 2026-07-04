-- Task trash (30-day) + encrypted credentials storage.
-- Run once in the Supabase SQL editor BEFORE deploying the matching app code.
-- Safe to run more than once.

-- Soft-delete for project tasks: deleted tasks go to a per-workspace trash
-- and are restorable for 30 days before being purged.
alter table public.hub_project_tasks
  add column if not exists deleted_at timestamptz;

-- Encrypted credential storage: ciphertext lives here; the plaintext
-- `password` column is nulled out as rows are migrated by the
-- credentials-vault edge function.
alter table public.hub_credentials
  add column if not exists password_enc text;
