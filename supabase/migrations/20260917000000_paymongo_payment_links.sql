-- PayMongo QRPh integration: track the gateway-generated checkout link per
-- invoice payment link, plus reconcile columns that were added live outside
-- tracked migrations (verified/verified_at, receipt_url).

alter table hub_invoice_payment_links
  add column if not exists provider text,
  add column if not exists paymongo_link_id text,
  add column if not exists paymongo_checkout_url text,
  add column if not exists paid_at timestamptz;

alter table hub_payment_proof_submissions
  add column if not exists verified boolean not null default false,
  add column if not exists verified_at timestamptz;

alter table hub_project_payments
  add column if not exists receipt_url text;
