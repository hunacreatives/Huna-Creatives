-- Add daily_hours_cap to hub_users for part-time employee hour capping
ALTER TABLE hub_users
  ADD COLUMN IF NOT EXISTS daily_hours_cap numeric DEFAULT 8 CHECK (daily_hours_cap > 0);
