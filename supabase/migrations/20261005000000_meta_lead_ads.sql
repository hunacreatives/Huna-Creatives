-- Meta (Facebook/Instagram) Lead Ads → contact inbox.
-- The meta-lead-webhook edge function receives each Instant Form lead, stores it
-- here alongside website inquiries, and sends the lead an auto-reply email.
--
-- Run once in the Supabase SQL editor BEFORE deploying the matching code.
-- Safe to run more than once.

-- 'website' for the contact form, 'meta_lead' for Instant Form leads.
alter table public.contact_submissions
  add column if not exists source text not null default 'website';

alter table public.contact_submissions
  add column if not exists phone text;

-- Meta's leadgen id. Unique so a webhook Meta delivers twice is stored once
-- (and the lead is only emailed once). NULL for website inquiries.
alter table public.contact_submissions
  add column if not exists meta_lead_id text;

create unique index if not exists contact_submissions_meta_lead_id_idx
  on public.contact_submissions (meta_lead_id);

-- Raw form answers + ad/campaign names, for reporting.
alter table public.contact_submissions
  add column if not exists meta_payload jsonb;

alter table public.contact_submissions
  add column if not exists auto_reply_sent_at timestamptz;
