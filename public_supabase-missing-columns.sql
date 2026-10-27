-- ============================================================
-- Hesab Sarraaf — Missing columns and incomplete tables
-- This script only adds columns and tables, no data is ever deleted
-- Idempotent — safe to run multiple times
-- ============================================================

-- ============================================================
-- 1. rates — Missing columns
-- ============================================================
ALTER TABLE rates ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
ALTER TABLE rates ADD COLUMN IF NOT EXISTS daily_rate NUMERIC(18,6);
ALTER TABLE rates ADD COLUMN IF NOT EXISTS decimals INTEGER DEFAULT 2;
ALTER TABLE rates ADD COLUMN IF NOT EXISTS symbol TEXT;
ALTER TABLE rates ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'fiat';
ALTER TABLE rates ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT FALSE;
ALTER TABLE rates ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- ============================================================
-- 2. feature_settings — Missing columns (enables feature toggle from Builder Panel)
-- ============================================================
ALTER TABLE feature_settings ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE feature_settings ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE feature_settings ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT FALSE;
ALTER TABLE feature_settings ADD COLUMN IF NOT EXISTS free_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE feature_settings ADD COLUMN IF NOT EXISTS paid_enabled BOOLEAN DEFAULT TRUE;

-- ============================================================
-- 3. origins — Missing columns (Agent entity)
-- ============================================================
ALTER TABLE origins ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE origins ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE origins ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE origins ADD COLUMN IF NOT EXISTS notes TEXT;

-- ============================================================
-- 4. transfers — Missing columns
-- ============================================================
ALTER TABLE transfers ADD COLUMN IF NOT EXISTS customer_id BIGINT;
ALTER TABLE transfers ADD COLUMN IF NOT EXISTS rate NUMERIC(18,6);
ALTER TABLE transfers ADD COLUMN IF NOT EXISTS fee NUMERIC(18,2) DEFAULT 0;
ALTER TABLE transfers ADD COLUMN IF NOT EXISTS fee_currency TEXT;
ALTER TABLE transfers ADD COLUMN IF NOT EXISTS total NUMERIC(18,2);
ALTER TABLE transfers ADD COLUMN IF NOT EXISTS agent_id BIGINT;
ALTER TABLE transfers ADD COLUMN IF NOT EXISTS agent_route TEXT;
ALTER TABLE transfers ADD COLUMN IF NOT EXISTS executed_date TIMESTAMPTZ;
ALTER TABLE transfers ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(18,2);
ALTER TABLE transfers ADD COLUMN IF NOT EXISTS paid_currency TEXT;
ALTER TABLE transfers ADD COLUMN IF NOT EXISTS pay_counter TEXT;
ALTER TABLE transfers ADD COLUMN IF NOT EXISTS tx_ids TEXT;

-- ============================================================
-- 5. documents — Missing columns (Transaction entity)
-- ============================================================
ALTER TABLE documents ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS customer_side TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS counter_type TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS counter_id TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS counter_side TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS pair_currency TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS pair_amount NUMERIC(18,2);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS rate NUMERIC(18,6);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS fee_currency TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS pair_tx_id BIGINT;

-- ============================================================
-- 6. exchanges — Missing columns (SarraafProfile entity)
-- ============================================================
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS trial_start_date DATE;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS quota_limit INTEGER DEFAULT 100;

-- Set trial_start_date for existing exchanges that don't have it (use created_at as fallback)
UPDATE exchanges SET trial_start_date = (created_at AT TIME ZONE 'UTC')::DATE
  WHERE trial_start_date IS NULL;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS quota_used INTEGER DEFAULT 0;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free';
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS quota_start_date TIMESTAMPTZ;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS quota_end_date TIMESTAMPTZ;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'free';
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS paid_start_date TIMESTAMPTZ;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS paid_end_date TIMESTAMPTZ;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS referral_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS referral_code TEXT;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS referral_count INTEGER DEFAULT 0;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS paid_referral_count INTEGER DEFAULT 0;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS referral_bonus_quota INTEGER DEFAULT 0;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS notes TEXT;

-- ============================================================
-- 7. audit_logs — Missing columns
-- ============================================================
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS target_name TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS before_value TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS after_value TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS reason TEXT;

-- ============================================================
-- 8. app_settings — Missing column
-- ============================================================
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS data JSONB;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS updated_by_name TEXT;

-- ============================================================
-- 9. rules — Missing columns (Announcement entity)
-- ============================================================
ALTER TABLE rules ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE rules ADD COLUMN IF NOT EXISTS link_url TEXT;
ALTER TABLE rules ADD COLUMN IF NOT EXISTS link_label TEXT;
ALTER TABLE rules ADD COLUMN IF NOT EXISTS icon TEXT;
ALTER TABLE rules ADD COLUMN IF NOT EXISTS accent TEXT;
ALTER TABLE rules ADD COLUMN IF NOT EXISTS pinned BOOLEAN DEFAULT FALSE;
ALTER TABLE rules ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ;
ALTER TABLE rules ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ;

-- ============================================================
-- 10. charge_orders — Missing columns (OnlineOrder entity)
-- ============================================================
ALTER TABLE charge_orders ADD COLUMN IF NOT EXISTS category_key TEXT;
ALTER TABLE charge_orders ADD COLUMN IF NOT EXISTS rate_snapshot JSONB;
ALTER TABLE charge_orders ADD COLUMN IF NOT EXISTS seller_id BIGINT;
ALTER TABLE charge_orders ADD COLUMN IF NOT EXISTS seller_name TEXT;
ALTER TABLE charge_orders ADD COLUMN IF NOT EXISTS fulfillment_date TIMESTAMPTZ;
ALTER TABLE charge_orders ADD COLUMN IF NOT EXISTS tracking_no TEXT;
ALTER TABLE charge_orders ADD COLUMN IF NOT EXISTS notes TEXT;

-- ============================================================
-- 11. wallet_bans — Missing columns
-- ============================================================
ALTER TABLE wallet_bans ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE wallet_bans ADD COLUMN IF NOT EXISTS rejection_count INTEGER DEFAULT 0;
ALTER TABLE wallet_bans ADD COLUMN IF NOT EXISTS banned_until TIMESTAMPTZ;
ALTER TABLE wallet_bans ADD COLUMN IF NOT EXISTS permanent_ban BOOLEAN DEFAULT FALSE;
ALTER TABLE wallet_bans ADD COLUMN IF NOT EXISTS last_reason TEXT;

-- ============================================================
-- 12. customer_notifications — Missing columns
-- ============================================================
ALTER TABLE customer_notifications ADD COLUMN IF NOT EXISTS customer_id BIGINT;
ALTER TABLE customer_notifications ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE customer_notifications ADD COLUMN IF NOT EXISTS transfer_id BIGINT;
ALTER TABLE customer_notifications ADD COLUMN IF NOT EXISTS transfer_no TEXT;

-- ============================================================
-- 13. sellers — Missing columns
-- ============================================================
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS user_id BIGINT;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS customer_code TEXT;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5,2) DEFAULT 0;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS balance NUMERIC(18,2) DEFAULT 0;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS withdrawn_total NUMERIC(18,2) DEFAULT 0;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS notes TEXT;

-- ============================================================
-- 14. text_labels — Missing columns
-- ============================================================
ALTER TABLE text_labels ADD COLUMN IF NOT EXISTS label_group TEXT;

-- ============================================================
-- 15. backup_records — Missing columns
-- ============================================================
ALTER TABLE backup_records ADD COLUMN IF NOT EXISTS user_id BIGINT;
ALTER TABLE backup_records ADD COLUMN IF NOT EXISTS user_name TEXT;
ALTER TABLE backup_records ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE backup_records ADD COLUMN IF NOT EXISTS file_uri TEXT;
ALTER TABLE backup_records ADD COLUMN IF NOT EXISTS size_bytes BIGINT;
ALTER TABLE backup_records ADD COLUMN IF NOT EXISTS record_counts JSONB;
ALTER TABLE backup_records ADD COLUMN IF NOT EXISTS entity_types JSONB;
ALTER TABLE backup_records ADD COLUMN IF NOT EXISTS restore_date TIMESTAMPTZ;
ALTER TABLE backup_records ADD COLUMN IF NOT EXISTS restored_from_id BIGINT;
ALTER TABLE backup_records ADD COLUMN IF NOT EXISTS notes TEXT;

-- ============================================================
-- 16. quota_change_logs — Missing columns
-- ============================================================
ALTER TABLE quota_change_logs ADD COLUMN IF NOT EXISTS sarraaf_id BIGINT;
ALTER TABLE quota_change_logs ADD COLUMN IF NOT EXISTS sarraaf_name TEXT;
ALTER TABLE quota_change_logs ADD COLUMN IF NOT EXISTS sarraaf_code TEXT;
ALTER TABLE quota_change_logs ADD COLUMN IF NOT EXISTS previous_limit INTEGER;
ALTER TABLE quota_change_logs ADD COLUMN IF NOT EXISTS change_amount INTEGER;
ALTER TABLE quota_change_logs ADD COLUMN IF NOT EXISTS new_limit INTEGER;
ALTER TABLE quota_change_logs ADD COLUMN IF NOT EXISTS changed_by_id TEXT;
ALTER TABLE quota_change_logs ADD COLUMN IF NOT EXISTS changed_by_name TEXT;
ALTER TABLE quota_change_logs ADD COLUMN IF NOT EXISTS change_date TIMESTAMPTZ;
ALTER TABLE quota_change_logs ADD COLUMN IF NOT EXISTS request_id BIGINT;

-- ============================================================
-- 17. referrals — Missing columns
-- ============================================================
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS inviter_id BIGINT;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS inviter_name TEXT;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS inviter_code TEXT;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS invitee_id BIGINT;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS invitee_name TEXT;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS invitee_type TEXT;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS reward_type TEXT;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS reward_given BOOLEAN DEFAULT FALSE;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS reward_date TIMESTAMPTZ;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS verified_date TIMESTAMPTZ;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS cancelled_date TIMESTAMPTZ;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS cancel_reason TEXT;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS notes TEXT;

-- ============================================================
-- 18. agency_links — Missing columns
-- ============================================================
ALTER TABLE agency_links ADD COLUMN IF NOT EXISTS requester_profile_id BIGINT;
ALTER TABLE agency_links ADD COLUMN IF NOT EXISTS requester_user_id BIGINT;
ALTER TABLE agency_links ADD COLUMN IF NOT EXISTS requester_code TEXT;
ALTER TABLE agency_links ADD COLUMN IF NOT EXISTS requester_name TEXT;
ALTER TABLE agency_links ADD COLUMN IF NOT EXISTS requester_exchange_name TEXT;
ALTER TABLE agency_links ADD COLUMN IF NOT EXISTS requester_phone TEXT;
ALTER TABLE agency_links ADD COLUMN IF NOT EXISTS target_profile_id BIGINT;
ALTER TABLE agency_links ADD COLUMN IF NOT EXISTS target_user_id BIGINT;
ALTER TABLE agency_links ADD COLUMN IF NOT EXISTS target_code TEXT;
ALTER TABLE agency_links ADD COLUMN IF NOT EXISTS target_name TEXT;
ALTER TABLE agency_links ADD COLUMN IF NOT EXISTS target_exchange_name TEXT;
ALTER TABLE agency_links ADD COLUMN IF NOT EXISTS target_phone TEXT;
ALTER TABLE agency_links ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE agency_links ADD COLUMN IF NOT EXISTS requester_confirmed BOOLEAN DEFAULT FALSE;
ALTER TABLE agency_links ADD COLUMN IF NOT EXISTS target_confirmed BOOLEAN DEFAULT FALSE;
ALTER TABLE agency_links ADD COLUMN IF NOT EXISTS request_note TEXT;
ALTER TABLE agency_links ADD COLUMN IF NOT EXISTS respond_note TEXT;
ALTER TABLE agency_links ADD COLUMN IF NOT EXISTS confirmed_date TIMESTAMPTZ;

-- ============================================================
-- 19. customer_transfer_requests — Missing columns
-- ============================================================
ALTER TABLE customer_transfer_requests ADD COLUMN IF NOT EXISTS customer_user_id BIGINT;
ALTER TABLE customer_transfer_requests ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE customer_transfer_requests ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE customer_transfer_requests ADD COLUMN IF NOT EXISTS sarraaf_code TEXT;
ALTER TABLE customer_transfer_requests ADD COLUMN IF NOT EXISTS sarraaf_profile_id BIGINT;
ALTER TABLE customer_transfer_requests ADD COLUMN IF NOT EXISTS sarraaf_user_id BIGINT;
ALTER TABLE customer_transfer_requests ADD COLUMN IF NOT EXISTS sarraaf_name TEXT;
ALTER TABLE customer_transfer_requests ADD COLUMN IF NOT EXISTS sarraaf_exchange_name TEXT;
ALTER TABLE customer_transfer_requests ADD COLUMN IF NOT EXISTS respond_note TEXT;
ALTER TABLE customer_transfer_requests ADD COLUMN IF NOT EXISTS linked_transfer_id BIGINT;
ALTER TABLE customer_transfer_requests ADD COLUMN IF NOT EXISTS reviewer_id TEXT;
ALTER TABLE customer_transfer_requests ADD COLUMN IF NOT EXISTS reviewer_name TEXT;
ALTER TABLE customer_transfer_requests ADD COLUMN IF NOT EXISTS review_date TIMESTAMPTZ;

-- ============================================================
-- 20. customer_links — Missing columns
-- ============================================================
ALTER TABLE customer_links ADD COLUMN IF NOT EXISTS customer_user_id BIGINT;
ALTER TABLE customer_links ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE customer_links ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE customer_links ADD COLUMN IF NOT EXISTS sarraaf_profile_id BIGINT;
ALTER TABLE customer_links ADD COLUMN IF NOT EXISTS sarraaf_user_id BIGINT;
ALTER TABLE customer_links ADD COLUMN IF NOT EXISTS sarraaf_code TEXT;
ALTER TABLE customer_links ADD COLUMN IF NOT EXISTS sarraaf_name TEXT;
ALTER TABLE customer_links ADD COLUMN IF NOT EXISTS sarraaf_exchange_name TEXT;
ALTER TABLE customer_links ADD COLUMN IF NOT EXISTS matched BOOLEAN DEFAULT FALSE;
ALTER TABLE customer_links ADD COLUMN IF NOT EXISTS matched_customer_id BIGINT;
ALTER TABLE customer_links ADD COLUMN IF NOT EXISTS request_note TEXT;
ALTER TABLE customer_links ADD COLUMN IF NOT EXISTS respond_note TEXT;
ALTER TABLE customer_links ADD COLUMN IF NOT EXISTS confirmed_date TIMESTAMPTZ;

-- ============================================================
-- 21. wallet_transactions — Missing columns
-- ============================================================
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS total_paid NUMERIC(18,2);
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS rate_snapshot JSONB;
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS from_name TEXT;
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS to_name TEXT;
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS buyer_phone TEXT;
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS seller_id BIGINT;
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS seller_name TEXT;
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS order_id BIGINT;

-- ============================================================
-- 22. payment_records — Completely missing table
-- ============================================================
CREATE TABLE IF NOT EXISTS payment_records (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  user_name TEXT,
  sarraaf_profile_id BIGINT,
  plan TEXT NOT NULL,
  amount NUMERIC(18,2) DEFAULT 0,
  currency TEXT DEFAULT 'AFN',
  payment_status TEXT DEFAULT 'pending',
  purchase_date TIMESTAMPTZ,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  duration_months INTEGER DEFAULT 12,
  is_active BOOLEAN DEFAULT TRUE,
  payment_method TEXT,
  notes TEXT,
  confirmed_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payment_records_user ON payment_records(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_status ON payment_records(payment_status);

-- ============================================================
-- 23. builder_access — Missing table
-- ============================================================
CREATE TABLE IF NOT EXISTS builder_access (
  id BIGSERIAL PRIMARY KEY,
  email TEXT,
  phone TEXT,
  name TEXT NOT NULL,
  allowed_tabs JSONB,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_builder_access_email ON builder_access(email);
CREATE INDEX IF NOT EXISTS idx_builder_access_status ON builder_access(status);

-- ============================================================
-- 24. customers — Missing columns
-- ============================================================
ALTER TABLE customers ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_group TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS locked BOOLEAN DEFAULT FALSE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS notes TEXT;

-- ============================================================
-- 25. users — Missing column
-- ============================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'customer';

-- ============================================================
-- 26. wallet_topup_requests — Missing columns
-- ============================================================
ALTER TABLE wallet_topup_requests ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE wallet_topup_requests ADD COLUMN IF NOT EXISTS sender_name TEXT;
ALTER TABLE wallet_topup_requests ADD COLUMN IF NOT EXISTS card_last4 TEXT;
ALTER TABLE wallet_topup_requests ADD COLUMN IF NOT EXISTS transaction_time TIMESTAMPTZ;
ALTER TABLE wallet_topup_requests ADD COLUMN IF NOT EXISTS card_number TEXT;
ALTER TABLE wallet_topup_requests ADD COLUMN IF NOT EXISTS receipt_url TEXT;
ALTER TABLE wallet_topup_requests ADD COLUMN IF NOT EXISTS related_order_id BIGINT;
ALTER TABLE wallet_topup_requests ADD COLUMN IF NOT EXISTS reject_reason TEXT;

-- ============================================================
-- 27. RLS — Enable on new tables (DENY ALL for anon/authenticated)
-- Only service_role (backend) can access — no public policies.
-- ============================================================
ALTER TABLE payment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE builder_access ENABLE ROW LEVEL SECURITY;
-- No policies = DENY ALL for anon/authenticated. Backend uses service_role.
