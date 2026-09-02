-- Lets a contact-inbox reply carry a "Request a formal quotation" button.
-- The client clicks the button in the email, which hits the public
-- request-quotation edge function keyed by public_token; that stamps
-- quote_requested_at and notifies the team. The inbox then shows the
-- submission as "Quotation requested".
--
-- Run once in the Supabase SQL editor BEFORE deploying the matching code.
-- Safe to run more than once.

-- Unguessable token for the email link (bare GET, no auth header).
alter table public.contact_submissions
  add column if not exists public_token uuid not null default gen_random_uuid();

create unique index if not exists contact_submissions_public_token_idx
  on public.contact_submissions (public_token);

-- Set when the client asks for a formal quotation from the reply email.
alter table public.contact_submissions
  add column if not exists quote_requested_at timestamptz;
