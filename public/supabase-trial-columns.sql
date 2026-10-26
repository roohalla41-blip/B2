-- supabase-trial-columns.sql
-- Adds trial/plan/payment columns to the exchanges table.
-- Safe: uses IF NOT EXISTS — idempotent, non-destructive.

ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS trial_start_date DATE;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS plan VARCHAR(20) DEFAULT 'free';
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'none';
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS paid_start_date DATE;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS paid_end_date DATE;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS quota_limit INTEGER DEFAULT 100;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS quota_used INTEGER DEFAULT 0;

-- Backfill existing exchanges: set trial_start_date to created_at if missing
UPDATE exchanges
SET trial_start_date = created_at::DATE
WHERE trial_start_date IS NULL;

-- Set plan and payment_status for existing exchanges that don't have them set
UPDATE exchanges
SET plan = 'free'
WHERE plan IS NULL OR plan = '';

UPDATE exchanges
SET payment_status = 'trial'
WHERE payment_status IS NULL OR payment_status = 'none';
