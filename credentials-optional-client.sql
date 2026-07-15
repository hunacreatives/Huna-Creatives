-- Credentials no longer have to belong to a client (e.g. internal tools).
-- Run once in the Supabase SQL editor BEFORE adding a credential without a client.
-- Safe to run more than once.

alter table public.hub_credentials
  alter column client_name drop not null;
