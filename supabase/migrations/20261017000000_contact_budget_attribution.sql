-- Contact form: keep the budget the visitor picked, and where they came from
-- (referrer, landing page, utm_* params, last blog post read). The form has
-- always sent budget; the edge function dropped it.
--
-- Run once in the Supabase SQL editor BEFORE deploying submit-contact.
-- Safe to run more than once.

alter table public.contact_submissions
  add column if not exists budget text;

alter table public.contact_submissions
  add column if not exists attribution jsonb;
