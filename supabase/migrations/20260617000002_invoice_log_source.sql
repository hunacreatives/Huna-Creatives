alter table hub_invoice_log add column if not exists source text not null default 'invoice'; -- 'invoice' | 'payment_reminder'
alter table hub_invoice_log add column if not exists pay_link_token uuid; -- token for /pay/:token proof submission
