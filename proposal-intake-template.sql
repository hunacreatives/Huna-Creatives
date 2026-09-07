-- When a proposal carries an intake_template, approving it auto-creates a
-- client questionnaire of that type (status 'sent') and the "next steps"
-- email links straight to it. Blank = the email just says the form is coming.
--
-- Run once in the Supabase SQL editor BEFORE deploying the matching code.
-- Safe to run more than once.

alter table public.hub_proposals
  add column if not exists intake_template text;
