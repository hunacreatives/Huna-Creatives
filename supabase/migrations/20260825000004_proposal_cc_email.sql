-- CC recipients for a quotation or proposal.
--
-- Stored so Resend prefills the same CC list, rather than the sender having to
-- retype it and risk leaving someone off a follow-up. Held as the raw
-- comma-separated string the sender typed: send-quotation validates and
-- de-duplicates at send time, so the column is a convenience, not the
-- authority.

alter table hub_proposals
  add column if not exists cc_email text;
