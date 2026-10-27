-- ============================================================
-- حساب صراف — Complete Database Schema (Non-Destructive, Idempotent)
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================
-- Safe to run multiple times. Uses CREATE TABLE IF NOT EXISTS and
-- ALTER TABLE ADD COLUMN IF NOT EXISTS — no data is ever lost.
--
-- Creator account is created via backend function using
-- CREATOR_EMAIL and CREATOR_PASSWORD secrets (not hardcoded here).
-- ============================================================

-- ============================================================
-- 1. users
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  mobile TEXT UNIQUE,
  username TEXT UNIQUE,
  email TEXT,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'customer',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================================
-- 2. exchanges
-- ============================================================
CREATE TABLE IF NOT EXISTS exchanges (
  id BIGSERIAL PRIMARY KEY,
  exchange_code TEXT UNIQUE NOT NULL,
  exchange_name TEXT NOT NULL,
  owner_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  name TEXT,
  mobile TEXT,
  email TEXT,
  country TEXT,
  city TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  password TEXT,
  trial_start_date DATE,
  plan TEXT DEFAULT 'free',
  quota_limit INTEGER DEFAULT 100,
  quota_used INTEGER DEFAULT 0,
  payment_status TEXT DEFAULT 'none',
  paid_start_date DATE,
  paid_end_date DATE,
  referral_enabled BOOLEAN DEFAULT FALSE,
  referral_code TEXT,
  referral_count INTEGER DEFAULT 0,
  paid_referral_count INTEGER DEFAULT 0,
  referral_bonus_quota INTEGER DEFAULT 0,
  last_login TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_exchanges_status ON exchanges(status);
CREATE INDEX IF NOT EXISTS idx_exchanges_owner ON exchanges(owner_user_id);

-- ============================================================
-- 3. customers
-- ============================================================
CREATE TABLE IF NOT EXISTS customers (
  id BIGSERIAL PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  email TEXT,
  country TEXT,
  exchange_code TEXT NOT NULL REFERENCES exchanges(exchange_code) ON DELETE CASCADE,
  account_details TEXT,
  description TEXT,
  opening_balance NUMERIC(18,2) DEFAULT 0,
  balance_currency TEXT DEFAULT 'AFN',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_customers_exchange ON customers(exchange_code);
CREATE INDEX IF NOT EXISTS idx_customers_mobile ON customers(mobile);
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_code_exchange ON customers(code, exchange_code);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_type TEXT DEFAULT 'permanent';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS tazkira_id TEXT;

-- ============================================================
-- 4. documents
-- ============================================================
CREATE TABLE IF NOT EXISTS documents (
  id BIGSERIAL PRIMARY KEY,
  doc_number TEXT NOT NULL,
  exchange_code TEXT NOT NULL REFERENCES exchanges(exchange_code) ON DELETE CASCADE,
  doc_type TEXT NOT NULL,
  amount NUMERIC(18,2) DEFAULT 0 CHECK (amount >= 0),
  currency TEXT NOT NULL,
  fee NUMERIC(18,2) DEFAULT 0 CHECK (fee >= 0),
  related_type TEXT NOT NULL DEFAULT 'none',
  related_id BIGINT,
  related_name TEXT,
  description TEXT,
  registered_by TEXT,
  registered_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_documents_exchange ON documents(exchange_code);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(doc_type);
CREATE INDEX IF NOT EXISTS idx_documents_doc_number ON documents(doc_number);
CREATE INDEX IF NOT EXISTS idx_documents_related ON documents(related_type, related_id);
CREATE INDEX IF NOT EXISTS idx_documents_registered_by ON documents(registered_by_user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_documents_doc_number_exchange ON documents(doc_number, exchange_code);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS transfer_id BIGINT REFERENCES transfers(id) ON DELETE SET NULL;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS deleted_date TIMESTAMPTZ;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS deleted_by_name TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS delete_note TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS edited BOOLEAN DEFAULT FALSE;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS edited_date TIMESTAMPTZ;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS edit_note TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS edited_by_name TEXT;
CREATE INDEX IF NOT EXISTS idx_documents_deleted ON documents(deleted);
CREATE INDEX IF NOT EXISTS idx_documents_exchange_deleted ON documents(exchange_code, deleted);

-- ============================================================
-- 5. transfers
-- ============================================================
CREATE TABLE IF NOT EXISTS transfers (
  id BIGSERIAL PRIMARY KEY,
  exchange_code TEXT NOT NULL REFERENCES exchanges(exchange_code) ON DELETE CASCADE,
  transfer_number TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  sender_phone TEXT,
  sender_country TEXT,
  receiver_name TEXT NOT NULL,
  receiver_phone TEXT,
  receiver_country TEXT,
  account_owner TEXT,
  amount NUMERIC(18,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL,
  origin TEXT,
  status TEXT NOT NULL DEFAULT 'done',
  registered_by TEXT,
  registered_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_transfers_exchange ON transfers(exchange_code);
CREATE INDEX IF NOT EXISTS idx_transfers_number ON transfers(transfer_number);
CREATE INDEX IF NOT EXISTS idx_transfers_status ON transfers(status);
CREATE INDEX IF NOT EXISTS idx_transfers_registered_by ON transfers(registered_by_user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_transfers_number_exchange ON transfers(transfer_number, exchange_code);
ALTER TABLE transfers ADD COLUMN IF NOT EXISTS direction TEXT DEFAULT 'send';
ALTER TABLE transfers ADD COLUMN IF NOT EXISTS destination TEXT;

-- ============================================================
-- 6. conversions
-- ============================================================
CREATE TABLE IF NOT EXISTS conversions (
  id BIGSERIAL PRIMARY KEY,
  exchange_code TEXT NOT NULL REFERENCES exchanges(exchange_code) ON DELETE CASCADE,
  customer_id BIGINT REFERENCES customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_mobile TEXT,
  from_currency TEXT NOT NULL,
  from_amount NUMERIC(18,2) NOT NULL CHECK (from_amount > 0),
  rate NUMERIC(18,6) NOT NULL CHECK (rate > 0),
  to_currency TEXT NOT NULL,
  to_amount NUMERIC(18,2) NOT NULL CHECK (to_amount > 0),
  description TEXT,
  registered_by TEXT,
  registered_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_conversions_exchange ON conversions(exchange_code);
CREATE INDEX IF NOT EXISTS idx_conversions_customer ON conversions(customer_id);

-- ============================================================
-- 7. treasury_transactions
-- ============================================================
CREATE TABLE IF NOT EXISTS treasury_transactions (
  id BIGSERIAL PRIMARY KEY,
  exchange_code TEXT NOT NULL REFERENCES exchanges(exchange_code) ON DELETE CASCADE,
  currency TEXT NOT NULL,
  amount NUMERIC(18,2) NOT NULL CHECK (amount > 0),
  type TEXT NOT NULL,
  description TEXT,
  registered_by TEXT,
  registered_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_treasury_exchange ON treasury_transactions(exchange_code);
CREATE INDEX IF NOT EXISTS idx_treasury_currency ON treasury_transactions(currency);

-- ============================================================
-- 8. bank_accounts
-- ============================================================
CREATE TABLE IF NOT EXISTS bank_accounts (
  id BIGSERIAL PRIMARY KEY,
  exchange_code TEXT NOT NULL REFERENCES exchanges(exchange_code) ON DELETE CASCADE,
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  currency TEXT NOT NULL,
  balance NUMERIC(18,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_exchange ON bank_accounts(exchange_code);
CREATE UNIQUE INDEX IF NOT EXISTS idx_bank_accounts_number_exchange ON bank_accounts(account_number, exchange_code);

-- ============================================================
-- 9. bank_transactions
-- ============================================================
CREATE TABLE IF NOT EXISTS bank_transactions (
  id BIGSERIAL PRIMARY KEY,
  exchange_code TEXT NOT NULL REFERENCES exchanges(exchange_code) ON DELETE CASCADE,
  bank_id BIGINT NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
  bank_name TEXT,
  account_number TEXT,
  currency TEXT,
  amount NUMERIC(18,2) NOT NULL CHECK (amount > 0),
  type TEXT NOT NULL,
  registered_by TEXT,
  registered_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bank_tx_exchange ON bank_transactions(exchange_code);
CREATE INDEX IF NOT EXISTS idx_bank_tx_bank ON bank_transactions(bank_id);

-- ============================================================
-- 10. journal_entries
-- ============================================================
CREATE TABLE IF NOT EXISTS journal_entries (
  id BIGSERIAL PRIMARY KEY,
  exchange_code TEXT NOT NULL REFERENCES exchanges(exchange_code) ON DELETE CASCADE,
  type TEXT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(18,2) DEFAULT 0 CHECK (amount >= 0),
  currency TEXT,
  related_type TEXT,
  registered_by TEXT,
  registered_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_journal_exchange ON journal_entries(exchange_code);
CREATE INDEX IF NOT EXISTS idx_journal_type ON journal_entries(type);

-- ============================================================
-- 11. ledger_entries
-- ============================================================
CREATE TABLE IF NOT EXISTS ledger_entries (
  id BIGSERIAL PRIMARY KEY,
  exchange_code TEXT NOT NULL REFERENCES exchanges(exchange_code) ON DELETE CASCADE,
  type TEXT,
  description TEXT,
  debit NUMERIC(18,2) DEFAULT 0 CHECK (debit >= 0),
  credit NUMERIC(18,2) DEFAULT 0 CHECK (credit >= 0),
  currency TEXT,
  related_type TEXT,
  registered_by TEXT,
  registered_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ledger_exchange ON ledger_entries(exchange_code);
ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS document_id BIGINT REFERENCES documents(id) ON DELETE CASCADE;
ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS transfer_id BIGINT REFERENCES transfers(id) ON DELETE SET NULL;
ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS account_type TEXT NOT NULL DEFAULT 'suspense';
ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS account_id TEXT;
ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS account_name TEXT;
ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS rate NUMERIC(18,6);
ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS pair_entry_id BIGINT REFERENCES ledger_entries(id) ON DELETE SET NULL;
ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS doc_line_no INTEGER DEFAULT 0;
ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS deleted_date TIMESTAMPTZ;
ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS deleted_by_name TEXT;
ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS edited BOOLEAN DEFAULT FALSE;
ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS edited_date TIMESTAMPTZ;
ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS edit_note TEXT;
ALTER TABLE ledger_entries ALTER COLUMN type DROP NOT NULL;
ALTER TABLE ledger_entries ALTER COLUMN description DROP NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ledger_document ON ledger_entries(document_id);
CREATE INDEX IF NOT EXISTS idx_ledger_account ON ledger_entries(account_type, account_id);
CREATE INDEX IF NOT EXISTS idx_ledger_account_cur ON ledger_entries(account_type, account_id, currency);
CREATE INDEX IF NOT EXISTS idx_ledger_transfer ON ledger_entries(transfer_id);
CREATE INDEX IF NOT EXISTS idx_ledger_deleted ON ledger_entries(deleted);
CREATE INDEX IF NOT EXISTS idx_ledger_exchange_cur ON ledger_entries(exchange_code, currency);
CREATE INDEX IF NOT EXISTS idx_ledger_pair ON ledger_entries(pair_entry_id);

-- ============================================================
-- 12. rates
-- ============================================================
CREATE TABLE IF NOT EXISTS rates (
  id BIGSERIAL PRIMARY KEY,
  exchange_code TEXT NOT NULL REFERENCES exchanges(exchange_code) ON DELETE CASCADE,
  currency TEXT NOT NULL,
  buy_rate NUMERIC(18,6) NOT NULL CHECK (buy_rate > 0),
  sell_rate NUMERIC(18,6) NOT NULL CHECK (sell_rate > 0),
  description TEXT,
  mobile TEXT,
  show_to_customer BOOLEAN DEFAULT TRUE,
  show_to_anonymous BOOLEAN DEFAULT FALSE,
  show_mobile BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rates_exchange ON rates(exchange_code);
CREATE INDEX IF NOT EXISTS idx_rates_currency ON rates(currency);
CREATE UNIQUE INDEX IF NOT EXISTS idx_rates_currency_exchange ON rates(currency, exchange_code);

-- ============================================================
-- 13. employees
-- ============================================================
CREATE TABLE IF NOT EXISTS employees (
  id BIGSERIAL PRIMARY KEY,
  exchange_code TEXT NOT NULL REFERENCES exchanges(exchange_code) ON DELETE CASCADE,
  name TEXT NOT NULL,
  show_profit_loss BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_employees_exchange ON employees(exchange_code);
CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_name_exchange ON employees(name, exchange_code);

-- ============================================================
-- 14. origins
-- ============================================================
CREATE TABLE IF NOT EXISTS origins (
  id BIGSERIAL PRIMARY KEY,
  exchange_code TEXT NOT NULL REFERENCES exchanges(exchange_code) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'origin',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_origins_exchange ON origins(exchange_code);
CREATE UNIQUE INDEX IF NOT EXISTS idx_origins_name_exchange ON origins(name, exchange_code);

-- ============================================================
-- 15. safes
-- ============================================================
CREATE TABLE IF NOT EXISTS safes (
  id BIGSERIAL PRIMARY KEY,
  exchange_code TEXT NOT NULL REFERENCES exchanges(exchange_code) ON DELETE CASCADE,
  name TEXT NOT NULL,
  currency TEXT NOT NULL,
  opening_balance NUMERIC(18,2) DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  registered_by TEXT,
  registered_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_safes_exchange ON safes(exchange_code);
CREATE UNIQUE INDEX IF NOT EXISTS idx_safes_name_exchange ON safes(name, exchange_code);

-- ============================================================
-- 16. rules
-- ============================================================
CREATE TABLE IF NOT EXISTS rules (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'all',
  sort_order NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 17. feature_settings
-- ============================================================
CREATE TABLE IF NOT EXISTS feature_settings (
  id BIGSERIAL PRIMARY KEY,
  feature_key TEXT NOT NULL UNIQUE,
  feature_name TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  message TEXT,
  icon_name TEXT,
  sort_order NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 18. app_settings
-- ============================================================
CREATE TABLE IF NOT EXISTS app_settings (
  id BIGSERIAL PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  setting_type TEXT NOT NULL DEFAULT 'text',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 19. audit_logs
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  registered_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  user_name TEXT NOT NULL,
  user_type TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  description TEXT,
  ip_address TEXT,
  device TEXT,
  status TEXT NOT NULL DEFAULT 'success',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);

-- ============================================================
-- 20. wallet_transactions
-- ============================================================
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_type TEXT NOT NULL,
  exchange_code TEXT,
  amount NUMERIC(18,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  registered_by TEXT,
  registered_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wallet_user ON wallet_transactions(user_id, user_type);
CREATE INDEX IF NOT EXISTS idx_wallet_exchange ON wallet_transactions(exchange_code);
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS wallet_id BIGINT;
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS reason TEXT;
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS actor_name TEXT;
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed';

-- ============================================================
-- 21. charge_orders
-- ============================================================
CREATE TABLE IF NOT EXISTS charge_orders (
  id BIGSERIAL PRIMARY KEY,
  customer_id BIGINT REFERENCES customers(id) ON DELETE SET NULL,
  customer_name TEXT,
  customer_mobile TEXT,
  exchange_code TEXT REFERENCES exchanges(exchange_code) ON DELETE SET NULL,
  product_type TEXT NOT NULL,
  product_name TEXT,
  amount NUMERIC(18,2) NOT NULL CHECK (amount > 0),
  currency TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  registered_by TEXT,
  registered_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_charge_customer ON charge_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_charge_exchange ON charge_orders(exchange_code);
CREATE INDEX IF NOT EXISTS idx_charge_status ON charge_orders(status);
ALTER TABLE charge_orders ADD COLUMN IF NOT EXISTS product_key TEXT;
ALTER TABLE charge_orders ADD COLUMN IF NOT EXISTS total NUMERIC(18,2) DEFAULT 0;
ALTER TABLE charge_orders ADD COLUMN IF NOT EXISTS paid_currency TEXT;
ALTER TABLE charge_orders ADD COLUMN IF NOT EXISTS total_paid NUMERIC(18,2) DEFAULT 0;
ALTER TABLE charge_orders ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE charge_orders ADD COLUMN IF NOT EXISTS wallet_id BIGINT;
ALTER TABLE charge_orders ADD COLUMN IF NOT EXISTS fields JSONB;
ALTER TABLE charge_orders ADD COLUMN IF NOT EXISTS user_id BIGINT;

-- ============================================================
-- 22. online_requests
-- ============================================================
CREATE TABLE IF NOT EXISTS online_requests (
  id BIGSERIAL PRIMARY KEY,
  exchange_code TEXT REFERENCES exchanges(exchange_code) ON DELETE SET NULL,
  user_name TEXT NOT NULL,
  user_mobile TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_online_status ON online_requests(status);
CREATE INDEX IF NOT EXISTS idx_online_exchange ON online_requests(exchange_code);

-- ============================================================
-- 23. online_products
-- ============================================================
CREATE TABLE IF NOT EXISTS online_products (
  id BIGSERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  icon TEXT,
  parent_key TEXT,
  level TEXT NOT NULL DEFAULT 'product',
  price NUMERIC(18,2) DEFAULT 0,
  original_price NUMERIC(18,2),
  currency TEXT DEFAULT 'AFN',
  amount TEXT,
  image TEXT,
  badge TEXT,
  account_fields JSONB,
  enabled BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_online_products_key ON online_products(key);
CREATE INDEX IF NOT EXISTS idx_online_products_parent ON online_products(parent_key);

-- ============================================================
-- 24. idempotency_keys
-- ============================================================
CREATE TABLE IF NOT EXISTS idempotency_keys (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  client_operation_id TEXT NOT NULL UNIQUE,
  table_name TEXT NOT NULL,
  result_id BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_idempotency_client_op ON idempotency_keys(client_operation_id);

-- ============================================================
-- 25. wallets
-- ============================================================
CREATE TABLE IF NOT EXISTS wallets (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  phone TEXT,
  balance NUMERIC(18,2) DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'AFN',
  exchange_code TEXT REFERENCES exchanges(exchange_code) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wallets_user ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallets_exchange ON wallets(exchange_code);
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS owner_type TEXT DEFAULT 'customer';
CREATE INDEX IF NOT EXISTS idx_wallets_owner ON wallets(owner_type, user_id);

-- ============================================================
-- 26. wallet_withdrawal_requests
-- ============================================================
CREATE TABLE IF NOT EXISTS wallet_withdrawal_requests (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  user_name TEXT,
  wallet_id BIGINT NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  amount NUMERIC(18,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'AFN',
  method TEXT NOT NULL DEFAULT 'bank_transfer',
  destination TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  reject_reason TEXT,
  reviewer_id TEXT,
  reviewer_name TEXT,
  review_date TIMESTAMPTZ,
  notes TEXT,
  exchange_code TEXT REFERENCES exchanges(exchange_code) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_withdrawal_wallet ON wallet_withdrawal_requests(wallet_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_status ON wallet_withdrawal_requests(status);
CREATE INDEX IF NOT EXISTS idx_withdrawal_user ON wallet_withdrawal_requests(user_id);

-- ============================================================
-- 27. wallet_topup_requests
-- ============================================================
CREATE TABLE IF NOT EXISTS wallet_topup_requests (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  user_name TEXT,
  wallet_id BIGINT NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  amount NUMERIC(18,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'AFN',
  method TEXT NOT NULL DEFAULT 'bank_transfer',
  reference TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewer_id TEXT,
  reviewer_name TEXT,
  review_date TIMESTAMPTZ,
  exchange_code TEXT REFERENCES exchanges(exchange_code) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_topup_wallet ON wallet_topup_requests(wallet_id);
CREATE INDEX IF NOT EXISTS idx_topup_status ON wallet_topup_requests(status);

-- ============================================================
-- 28. wallet_bans
-- ============================================================
CREATE TABLE IF NOT EXISTS wallet_bans (
  id BIGSERIAL PRIMARY KEY,
  wallet_id BIGINT NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  user_name TEXT,
  reason TEXT,
  banned_by TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  exchange_code TEXT REFERENCES exchanges(exchange_code) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wallet_bans_wallet ON wallet_bans(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_bans_status ON wallet_bans(status);

-- ============================================================
-- 29. customer_notifications
-- ============================================================
CREATE TABLE IF NOT EXISTS customer_notifications (
  id BIGSERIAL PRIMARY KEY,
  customer_user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  exchange_code TEXT REFERENCES exchanges(exchange_code) ON DELETE SET NULL,
  title TEXT NOT NULL,
  body TEXT,
  type TEXT NOT NULL DEFAULT 'info',
  read BOOLEAN DEFAULT FALSE,
  action_url TEXT,
  action_label TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_customer_notif_user ON customer_notifications(customer_user_id);
CREATE INDEX IF NOT EXISTS idx_customer_notif_exchange ON customer_notifications(exchange_code);
CREATE INDEX IF NOT EXISTS idx_customer_notif_read ON customer_notifications(read);

-- ============================================================
-- 30. customer_transfer_requests
-- ============================================================
CREATE TABLE IF NOT EXISTS customer_transfer_requests (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  exchange_code TEXT REFERENCES exchanges(exchange_code) ON DELETE SET NULL,
  direction TEXT NOT NULL,
  sender_name TEXT,
  sender_phone TEXT,
  receiver_name TEXT,
  receiver_phone TEXT,
  destination TEXT,
  currency TEXT NOT NULL,
  amount NUMERIC(18,2) NOT NULL,
  rate NUMERIC(18,6),
  fee NUMERIC(18,2) DEFAULT 0,
  fee_currency TEXT,
  total NUMERIC(18,2),
  status TEXT NOT NULL DEFAULT 'pending',
  transfer_no TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_customer_transfer_user ON customer_transfer_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_transfer_exchange ON customer_transfer_requests(exchange_code);
CREATE INDEX IF NOT EXISTS idx_customer_transfer_status ON customer_transfer_requests(status);

-- ============================================================
-- 31. customer_links
-- ============================================================
CREATE TABLE IF NOT EXISTS customer_links (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  exchange_code TEXT REFERENCES exchanges(exchange_code) ON DELETE SET NULL,
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_customer_links_user ON customer_links(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_links_exchange ON customer_links(exchange_code);

-- ============================================================
-- 32. email_otps
-- ============================================================
CREATE TABLE IF NOT EXISTS email_otps (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  purpose TEXT NOT NULL DEFAULT 'signup',
  expires_at TIMESTAMPTZ NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_email_otps_email ON email_otps(email);
CREATE INDEX IF NOT EXISTS idx_email_otps_code ON email_otps(code);

-- ============================================================
-- 33. user_notifications
-- ============================================================
CREATE TABLE IF NOT EXISTS user_notifications (
  id BIGSERIAL PRIMARY KEY,
  target_user_id TEXT,
  target_user_name TEXT,
  target_role TEXT NOT NULL DEFAULT 'all',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'general',
  action_url TEXT,
  action_label TEXT,
  read BOOLEAN DEFAULT FALSE,
  sent_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_notif_target ON user_notifications(target_user_id);
CREATE INDEX IF NOT EXISTS idx_user_notif_role ON user_notifications(target_role);
CREATE INDEX IF NOT EXISTS idx_user_notif_read ON user_notifications(read);

-- ============================================================
-- 34. user_permissions
-- ============================================================
CREATE TABLE IF NOT EXISTS user_permissions (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_name TEXT,
  role TEXT NOT NULL,
  section TEXT NOT NULL,
  can_view BOOLEAN DEFAULT TRUE,
  can_create BOOLEAN DEFAULT FALSE,
  can_edit BOOLEAN DEFAULT FALSE,
  can_delete BOOLEAN DEFAULT FALSE,
  can_print BOOLEAN DEFAULT FALSE,
  can_report BOOLEAN DEFAULT FALSE,
  can_settings BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_perms_user ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_perms_section ON user_permissions(section);

-- ============================================================
-- 35. user_feedback
-- ============================================================
CREATE TABLE IF NOT EXISTS user_feedback (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  exchange_code TEXT REFERENCES exchanges(exchange_code) ON DELETE SET NULL,
  type TEXT NOT NULL DEFAULT 'suggestion',
  message TEXT NOT NULL,
  rating NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON user_feedback(status);

-- ============================================================
-- 36. support_tickets
-- ============================================================
CREATE TABLE IF NOT EXISTS support_tickets (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  exchange_code TEXT REFERENCES exchanges(exchange_code) ON DELETE SET NULL,
  ticket_number TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT,
  category TEXT,
  priority TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  assigned_to TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_user ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_exchange ON support_tickets(exchange_code);

-- ============================================================
-- 37. support_messages
-- ============================================================
CREATE TABLE IF NOT EXISTS support_messages (
  id BIGSERIAL PRIMARY KEY,
  ticket_id BIGINT NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  sender_name TEXT,
  message TEXT NOT NULL,
  attachment_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_support_msgs_ticket ON support_messages(ticket_id);

-- ============================================================
-- 38. error_reports
-- ============================================================
CREATE TABLE IF NOT EXISTS error_reports (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  exchange_code TEXT REFERENCES exchanges(exchange_code) ON DELETE SET NULL,
  error_type TEXT NOT NULL,
  error_message TEXT,
  stack_trace TEXT,
  device TEXT,
  app_version TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_errors_status ON error_reports(status);

-- ============================================================
-- 39. bank_gateways
-- ============================================================
CREATE TABLE IF NOT EXISTS bank_gateways (
  id BIGSERIAL PRIMARY KEY,
  gateway_key VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  provider VARCHAR(50) NOT NULL DEFAULT 'bank_gateway',
  currency VARCHAR(10) NOT NULL DEFAULT 'AFN',
  merchant_id VARCHAR(200),
  callback_url TEXT,
  webhook_url TEXT,
  secret_ref VARCHAR(200),
  min_amount NUMERIC(15,2) DEFAULT 0,
  max_amount NUMERIC(15,2) DEFAULT 0,
  fee_percent NUMERIC(5,2) DEFAULT 0,
  fee_fixed NUMERIC(15,2) DEFAULT 0,
  display_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'pending',
  test_mode BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 40. payment_transactions
-- ============================================================
CREATE TABLE IF NOT EXISTS payment_transactions (
  id BIGSERIAL PRIMARY KEY,
  gateway_key VARCHAR(100) NOT NULL,
  gateway_name VARCHAR(200),
  user_id BIGINT,
  user_name VARCHAR(200),
  order_id VARCHAR(100),
  amount NUMERIC(15,2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'AFN',
  fee NUMERIC(15,2) DEFAULT 0,
  total NUMERIC(15,2),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  provider_transaction_id VARCHAR(200),
  provider_reference VARCHAR(200),
  paid_at TIMESTAMPTZ,
  failed_reason TEXT,
  metadata JSONB,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payment_tx_gateway ON payment_transactions(gateway_key);
CREATE INDEX IF NOT EXISTS idx_payment_tx_user ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_tx_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_tx_order ON payment_transactions(order_id);

-- ============================================================
-- 41. chat_groups
-- ============================================================
CREATE TABLE IF NOT EXISTS chat_groups (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'public',
  image TEXT,
  creator_id TEXT,
  creator_name TEXT,
  exchange_code TEXT,
  rules TEXT,
  creator_managed BOOLEAN DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'active',
  member_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chat_groups_type ON chat_groups(type);
CREATE INDEX IF NOT EXISTS idx_chat_groups_status ON chat_groups(status);
CREATE INDEX IF NOT EXISTS idx_chat_groups_creator ON chat_groups(creator_id);

-- ============================================================
-- 42. chat_group_members
-- ============================================================
CREATE TABLE IF NOT EXISTS chat_group_members (
  id BIGSERIAL PRIMARY KEY,
  group_id BIGINT NOT NULL REFERENCES chat_groups(id) ON DELETE CASCADE,
  group_name TEXT,
  user_id TEXT NOT NULL,
  user_name TEXT,
  user_role TEXT,
  role TEXT NOT NULL DEFAULT 'member',
  status TEXT NOT NULL DEFAULT 'active',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chat_members_group ON chat_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_chat_members_user ON chat_group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_members_status ON chat_group_members(status);

-- ============================================================
-- 43. chat_messages
-- ============================================================
CREATE TABLE IF NOT EXISTS chat_messages (
  id BIGSERIAL PRIMARY KEY,
  group_id BIGINT NOT NULL REFERENCES chat_groups(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL,
  sender_name TEXT,
  sender_role TEXT,
  message TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  status TEXT NOT NULL DEFAULT 'active',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chat_messages_group ON chat_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_status ON chat_messages(status);

-- ============================================================
-- 44. message_reports
-- ============================================================
CREATE TABLE IF NOT EXISTS message_reports (
  id BIGSERIAL PRIMARY KEY,
  message_id BIGINT NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  group_id BIGINT,
  reporter_id TEXT NOT NULL,
  reporter_name TEXT,
  sender_id TEXT,
  sender_name TEXT,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_message_reports_message ON message_reports(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reports_status ON message_reports(status);

-- ============================================================
-- 45. sellers
-- ============================================================
CREATE TABLE IF NOT EXISTS sellers (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  mobile TEXT,
  exchange_code TEXT REFERENCES exchanges(exchange_code) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sellers_exchange ON sellers(exchange_code);

-- ============================================================
-- 46. packages
-- ============================================================
CREATE TABLE IF NOT EXISTS packages (
  id BIGSERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  price NUMERIC(18,2) DEFAULT 0,
  currency TEXT DEFAULT 'AFN',
  duration_months INTEGER DEFAULT 12,
  features JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 47. pricing_plans
-- ============================================================
CREATE TABLE IF NOT EXISTS pricing_plans (
  id BIGSERIAL PRIMARY KEY,
  plan_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  price NUMERIC(18,2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'AFN',
  duration_months INTEGER DEFAULT 12,
  description TEXT,
  features JSONB,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 48. plan_quotas
-- ============================================================
CREATE TABLE IF NOT EXISTS plan_quotas (
  id BIGSERIAL PRIMARY KEY,
  plan TEXT NOT NULL,
  feature_key TEXT NOT NULL,
  max_transactions INTEGER DEFAULT -1,
  max_customers INTEGER DEFAULT -1,
  max_messages INTEGER DEFAULT -1,
  max_prints INTEGER DEFAULT -1,
  max_custom INTEGER DEFAULT -1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_plan_quotas_plan ON plan_quotas(plan, feature_key);

-- ============================================================
-- 49. quota_change_logs
-- ============================================================
CREATE TABLE IF NOT EXISTS quota_change_logs (
  id BIGSERIAL PRIMARY KEY,
  exchange_code TEXT REFERENCES exchanges(exchange_code) ON DELETE SET NULL,
  plan_key TEXT,
  old_value TEXT,
  new_value TEXT,
  changed_by TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 50. referrals
-- ============================================================
CREATE TABLE IF NOT EXISTS referrals (
  id BIGSERIAL PRIMARY KEY,
  referrer_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  referrer_name TEXT,
  referred_mobile TEXT,
  referred_name TEXT,
  exchange_code TEXT REFERENCES exchanges(exchange_code) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reward_amount NUMERIC(18,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_user_id);

-- ============================================================
-- 51. agency_links
-- ============================================================
CREATE TABLE IF NOT EXISTS agency_links (
  id BIGSERIAL PRIMARY KEY,
  exchange_code TEXT REFERENCES exchanges(exchange_code) ON DELETE CASCADE,
  linked_exchange_code TEXT,
  type TEXT NOT NULL DEFAULT 'agency',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_agency_links_exchange ON agency_links(exchange_code);

-- ============================================================
-- 52. backup_records
-- ============================================================
CREATE TABLE IF NOT EXISTS backup_records (
  id BIGSERIAL PRIMARY KEY,
  exchange_code TEXT,
  file_name TEXT NOT NULL,
  file_size BIGINT,
  record_count INTEGER,
  status TEXT NOT NULL DEFAULT 'completed',
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 53. text_labels
-- ============================================================
CREATE TABLE IF NOT EXISTS text_labels (
  id BIGSERIAL PRIMARY KEY,
  label_key TEXT NOT NULL UNIQUE,
  fa TEXT,
  en TEXT,
  ps TEXT,
  ar TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 54. rate_settings
-- ============================================================
CREATE TABLE IF NOT EXISTS rate_settings (
  id BIGSERIAL PRIMARY KEY,
  exchange_code TEXT REFERENCES exchanges(exchange_code) ON DELETE CASCADE,
  currency TEXT NOT NULL,
  buy_rate NUMERIC(18,6),
  sell_rate NUMERIC(18,6),
  daily_rate NUMERIC(18,6),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rate_settings_exchange ON rate_settings(exchange_code);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchanges ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE treasury_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE origins ENABLE ROW LEVEL SECURITY;
ALTER TABLE safes ENABLE ROW LEVEL SECURITY;
ALTER TABLE rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE charge_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE online_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE online_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_topup_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_bans ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_transfer_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_otps ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_gateways ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE quota_change_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE backup_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE text_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- TRIGGERS — auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_users_updated BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER trg_exchanges_updated BEFORE UPDATE ON exchanges
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER trg_customers_updated BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER trg_documents_updated BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER trg_transfers_updated BEFORE UPDATE ON transfers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER trg_conversions_updated BEFORE UPDATE ON conversions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER trg_treasury_updated BEFORE UPDATE ON treasury_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER trg_bank_accounts_updated BEFORE UPDATE ON bank_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER trg_bank_transactions_updated BEFORE UPDATE ON bank_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER trg_journal_updated BEFORE UPDATE ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER trg_ledger_updated BEFORE UPDATE ON ledger_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER trg_rates_updated BEFORE UPDATE ON rates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER trg_employees_updated BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER trg_origins_updated BEFORE UPDATE ON origins
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER trg_safes_updated BEFORE UPDATE ON safes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER trg_wallets_updated BEFORE UPDATE ON wallets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER trg_wallet_tx_updated BEFORE UPDATE ON wallet_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER trg_charge_orders_updated BEFORE UPDATE ON charge_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER trg_online_requests_updated BEFORE UPDATE ON online_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER trg_online_products_updated BEFORE UPDATE ON online_products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER trg_feature_settings_updated BEFORE UPDATE ON feature_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER trg_app_settings_updated BEFORE UPDATE ON app_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER trg_customer_notif_updated BEFORE UPDATE ON customer_notifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER trg_customer_transfer_updated BEFORE UPDATE ON customer_transfer_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER trg_customer_links_updated BEFORE UPDATE ON customer_links
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER trg_withdrawal_updated BEFORE UPDATE ON wallet_withdrawal_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER trg_topup_updated BEFORE UPDATE ON wallet_topup_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER trg_user_notif_updated BEFORE UPDATE ON user_notifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER trg_chat_groups_updated BEFORE UPDATE ON chat_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER trg_chat_messages_updated BEFORE UPDATE ON chat_messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER trg_rate_settings_updated BEFORE UPDATE ON rate_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- FUNCTIONS — doc/transfer number generators
-- ============================================================
CREATE OR REPLACE FUNCTION get_next_doc_number(p_exchange_code TEXT)
RETURNS TEXT AS $$
DECLARE
  max_num INT;
  next_num INT;
BEGIN
  SELECT COALESCE(MAX(
    CASE
      WHEN doc_number ~ '^DOC-([0-9]+)$' THEN CAST(SUBSTRING(doc_number FROM 5) AS INT)
      ELSE 0
    END
  ), 0) INTO max_num
  FROM documents
  WHERE exchange_code = p_exchange_code;
  next_num := max_num + 1;
  RETURN 'DOC-' || LPAD(next_num::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_next_transfer_number(p_exchange_code TEXT)
RETURNS TEXT AS $$
DECLARE
  max_num INT;
  next_num INT;
BEGIN
  SELECT COALESCE(MAX(
    CASE
      WHEN transfer_number ~ '^HV-([0-9]+)$' THEN CAST(SUBSTRING(transfer_number FROM 4) AS INT)
      ELSE 0
    END
  ), 0) INTO max_num
  FROM transfers
  WHERE exchange_code = p_exchange_code;
  next_num := max_num + 1;
  RETURN 'HV-' || LPAD(next_num::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- VIEWS
-- ============================================================
CREATE OR REPLACE VIEW v_customer_balances AS
SELECT
  c.id AS customer_id,
  c.exchange_code,
  c.code AS customer_code,
  c.name AS customer_name,
  c.opening_balance,
  c.balance_currency,
  COALESCE(SUM(le.debit - le.credit), 0) + c.opening_balance AS net_balance,
  COALESCE(SUM(CASE WHEN le.account_type = 'fee' THEN le.debit - le.credit ELSE 0 END), 0) AS total_fees,
  COUNT(le.id) AS entry_count
FROM customers c
LEFT JOIN ledger_entries le
  ON le.account_type = 'customer'
  AND le.account_id = c.id::TEXT
  AND le.exchange_code = c.exchange_code
  AND le.deleted = FALSE
GROUP BY c.id, c.exchange_code, c.code, c.name, c.opening_balance, c.balance_currency;

CREATE OR REPLACE VIEW v_treasury_balances AS
SELECT
  le.exchange_code,
  le.currency,
  SUM(le.debit - le.credit) AS balance,
  COUNT(*) AS entry_count
FROM ledger_entries le
WHERE le.account_type = 'cash'
  AND le.deleted = FALSE
GROUP BY le.exchange_code, le.currency;

CREATE OR REPLACE VIEW v_bank_balances AS
SELECT
  b.id AS bank_id,
  b.exchange_code,
  b.bank_name,
  b.account_number,
  b.currency,
  b.balance AS initial_balance,
  COALESCE(SUM(le.debit - le.credit), 0) AS transaction_sum,
  b.balance + COALESCE(SUM(le.debit - le.credit), 0) AS current_balance
FROM bank_accounts b
LEFT JOIN ledger_entries le
  ON le.account_type = 'bank'
  AND le.account_id = b.id::TEXT
  AND le.exchange_code = b.exchange_code
  AND le.deleted = FALSE
GROUP BY b.id, b.exchange_code, b.bank_name, b.account_number, b.currency, b.balance;

CREATE OR REPLACE VIEW v_wallet_balances AS
SELECT
  w.id AS wallet_id,
  w.user_id,
  w.owner_type,
  w.exchange_code,
  w.currency,
  w.balance AS cached_balance,
  COALESCE(SUM(le.debit - le.credit), 0) AS actual_balance,
  w.balance AS initial_balance
FROM wallets w
LEFT JOIN ledger_entries le
  ON le.account_type = 'wallet'
  AND le.account_id = w.id::TEXT
  AND le.deleted = FALSE
GROUP BY w.id, w.user_id, w.owner_type, w.exchange_code, w.currency, w.balance;

CREATE OR REPLACE VIEW v_agent_balances AS
SELECT
  o.id AS agent_id,
  o.exchange_code,
  o.name AS agent_name,
  o.type AS agent_type,
  COALESCE(SUM(le.debit - le.credit), 0) AS balance,
  COUNT(le.id) AS entry_count
FROM origins o
LEFT JOIN ledger_entries le
  ON le.account_type = 'agent'
  AND le.account_id = o.id::TEXT
  AND le.exchange_code = o.exchange_code
  AND le.deleted = FALSE
GROUP BY o.id, o.exchange_code, o.name, o.type;

CREATE OR REPLACE VIEW v_profit_loss AS
SELECT
  le.exchange_code,
  le.currency,
  SUM(CASE WHEN le.account_type = 'fee' THEN le.debit - le.credit ELSE 0 END) AS fee_profit,
  SUM(CASE WHEN le.account_type = 'rate_diff' THEN le.debit - le.credit ELSE 0 END) AS rate_diff_profit,
  SUM(CASE WHEN le.account_type IN ('fee', 'rate_diff') THEN le.debit - le.credit ELSE 0 END) AS total_profit,
  COUNT(*) AS entry_count
FROM ledger_entries le
WHERE le.account_type IN ('fee', 'rate_diff')
  AND le.deleted = FALSE
GROUP BY le.exchange_code, le.currency;

CREATE OR REPLACE VIEW v_exchange_summary AS
SELECT
  e.exchange_code,
  e.exchange_name,
  (SELECT COUNT(*) FROM customers WHERE exchange_code = e.exchange_code) AS customer_count,
  (SELECT COUNT(*) FROM transfers WHERE exchange_code = e.exchange_code) AS transfer_count,
  (SELECT COUNT(*) FROM conversions WHERE exchange_code = e.exchange_code) AS conversion_count,
  (SELECT COUNT(*) FROM documents WHERE exchange_code = e.exchange_code AND deleted = FALSE) AS document_count,
  (SELECT COUNT(*) FROM bank_accounts WHERE exchange_code = e.exchange_code) AS bank_count,
  (SELECT COUNT(*) FROM employees WHERE exchange_code = e.exchange_code) AS employee_count,
  (SELECT COALESCE(SUM(fee), 0) FROM documents WHERE exchange_code = e.exchange_code AND deleted = FALSE) AS total_fees,
  (SELECT COALESCE(SUM(le.debit - le.credit), 0) FROM ledger_entries le WHERE le.account_type IN ('fee', 'rate_diff') AND le.exchange_code = e.exchange_code AND le.deleted = FALSE) AS total_profit
FROM exchanges e;

CREATE OR REPLACE VIEW v_currency_balances AS
SELECT
  le.exchange_code,
  le.currency,
  le.account_type,
  SUM(le.debit - le.credit) AS balance,
  COUNT(*) AS entry_count
FROM ledger_entries le
WHERE le.deleted = FALSE
  AND le.account_type NOT IN ('fee', 'rate_diff', 'suspense')
GROUP BY le.exchange_code, le.currency, le.account_type;

CREATE OR REPLACE VIEW v_transactions AS
SELECT
  d.id::TEXT AS id,
  d.exchange_code,
  d.doc_number AS document_no,
  d.doc_type AS type,
  d.amount,
  d.currency,
  d.fee,
  d.related_type,
  d.related_id::TEXT AS customer_id,
  d.related_name AS customer_name,
  d.description,
  d.registered_by,
  d.registered_by_user_id,
  d.transfer_id,
  d.created_at,
  d.created_at::DATE AS date,
  d.updated_at,
  d.deleted,
  d.deleted_date,
  d.deleted_by_name,
  d.edited,
  d.edited_date,
  d.edit_note,
  d.edited_by_name
FROM documents d
WHERE d.deleted = FALSE;

-- ============================================================
-- RPC: post_transfer_transaction
-- ============================================================
CREATE OR REPLACE FUNCTION post_transfer_transaction(
  p_exchange_code TEXT,
  p_direction TEXT,
  p_sender_name TEXT,
  p_sender_phone TEXT,
  p_receiver_name TEXT,
  p_receiver_phone TEXT,
  p_destination TEXT,
  p_origin TEXT,
  p_amount NUMERIC,
  p_currency TEXT,
  p_rate NUMERIC DEFAULT NULL,
  p_fee NUMERIC DEFAULT 0,
  p_fee_currency TEXT DEFAULT NULL,
  p_description TEXT,
  p_registered_by TEXT,
  p_doc_type TEXT DEFAULT 'transfer',
  p_user_id BIGINT DEFAULT NULL,
  p_client_operation_id TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_transfer_id BIGINT;
  v_transfer_number TEXT;
  v_doc_id BIGINT;
  v_doc_number TEXT;
  v_existing_result_id BIGINT;
  v_lines JSONB;
BEGIN
  IF p_client_operation_id IS NOT NULL THEN
    SELECT result_id INTO v_existing_result_id
    FROM idempotency_keys
    WHERE client_operation_id = p_client_operation_id
    LIMIT 1;
    IF v_existing_result_id IS NOT NULL AND v_existing_result_id > 0 THEN
      RETURN json_build_object('transfer_id', v_existing_result_id, 'idempotent', true);
    END IF;
  END IF;

  v_transfer_number := get_next_transfer_number(p_exchange_code);

  INSERT INTO transfers (
    exchange_code, transfer_number,
    sender_name, sender_phone, sender_country,
    receiver_name, receiver_phone, receiver_country,
    account_owner, amount, currency, origin, direction, destination,
    status, registered_by, registered_by_user_id
  ) VALUES (
    p_exchange_code, v_transfer_number,
    p_sender_name, p_sender_phone, NULL,
    p_receiver_name, p_receiver_phone, p_destination,
    NULL, p_amount, p_currency, p_origin, p_direction, p_destination,
    'done', p_registered_by, p_user_id
  )
  RETURNING id INTO v_transfer_id;

  v_doc_number := get_next_doc_number(p_exchange_code);

  INSERT INTO documents (
    doc_number, exchange_code, doc_type, amount, currency, fee,
    related_type, related_id, related_name, description,
    registered_by, registered_by_user_id, transfer_id
  ) VALUES (
    v_doc_number, p_exchange_code, p_doc_type, p_amount, p_currency, p_fee,
    'transfer', v_transfer_id, p_sender_name || ' → ' || p_receiver_name,
    p_description, p_registered_by, p_user_id, v_transfer_id
  )
  RETURNING id INTO v_doc_id;

  IF p_direction = 'send' THEN
    v_lines := jsonb_build_array(
      jsonb_build_object('account_type','customer','account_id','','account_name',p_sender_name,'currency',p_currency,'debit',p_amount,'credit',0,'description','بدهکاری فرستنده','line_no',1),
      jsonb_build_object('account_type','suspense','account_id',v_transfer_id::TEXT,'account_name','حواله در راه','currency',p_currency,'debit',0,'credit',p_amount,'description','بستانکاری موقت','line_no',2)
    );
  ELSE
    v_lines := jsonb_build_array(
      jsonb_build_object('account_type','suspense','account_id',v_transfer_id::TEXT,'account_name','حواله در راه','currency',p_currency,'debit',p_amount,'credit',0,'description','خروج از موقت','line_no',1),
      jsonb_build_object('account_type','customer','account_id','','account_name',p_receiver_name,'currency',p_currency,'debit',0,'credit',p_amount,'description','بستانکاری گیرنده','line_no',2)
    );
  END IF;

  INSERT INTO ledger_entries (
    exchange_code, document_id, transfer_id,
    account_type, account_id, account_name,
    currency, debit, credit, description, doc_line_no,
    registered_by, registered_by_user_id
  )
  SELECT
    p_exchange_code, v_doc_id, v_transfer_id,
    row->>'account_type', row->>'account_id', row->>'account_name',
    row->>'currency', (row->>'debit')::NUMERIC, (row->>'credit')::NUMERIC,
    row->>'description', (row->>'line_no')::INTEGER,
    p_registered_by, p_user_id
  FROM jsonb_array_elements(v_lines) AS t(row);

  IF p_fee > 0 THEN
    INSERT INTO ledger_entries (
      exchange_code, document_id, transfer_id,
      account_type, account_id, account_name,
      currency, debit, credit, description, doc_line_no,
      registered_by, registered_by_user_id
    ) VALUES (
      p_exchange_code, v_doc_id, v_transfer_id,
      'fee', '', 'کارمزد حواله',
      COALESCE(p_fee_currency, p_currency), p_fee, 0,
      'کارمزد حواله', 3,
      p_registered_by, p_user_id
    );
  END IF;

  IF p_client_operation_id IS NOT NULL THEN
    INSERT INTO idempotency_keys (client_operation_id, table_name, result_id)
    VALUES (p_client_operation_id, 'transfers', v_transfer_id)
    ON CONFLICT (client_operation_id) DO NOTHING;
  END IF;

  RETURN json_build_object(
    'transfer_id', v_transfer_id,
    'transfer_number', v_transfer_number,
    'document_id', v_doc_id,
    'doc_number', v_doc_number,
    'idempotent', false
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- RPC: reverse_document_transaction
-- ============================================================
CREATE OR REPLACE FUNCTION reverse_document_transaction(
  p_exchange_code TEXT,
  p_document_id BIGINT,
  p_registered_by TEXT,
  p_reason TEXT
)
RETURNS JSON AS $$
DECLARE
  v_orig record;
  v_new_doc_id BIGINT;
  v_new_doc_number TEXT;
  v_line record;
BEGIN
  SELECT * INTO v_orig FROM documents WHERE id = p_document_id AND exchange_code = p_exchange_code;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'document_not_found';
  END IF;

  UPDATE documents
  SET deleted = TRUE, deleted_date = NOW(), delete_note = p_reason, updated_at = NOW()
  WHERE id = p_document_id;

  UPDATE ledger_entries
  SET deleted = TRUE, deleted_date = NOW(), deleted_by_name = p_registered_by
  WHERE document_id = p_document_id AND deleted = FALSE;

  v_new_doc_number := get_next_doc_number(p_exchange_code);

  INSERT INTO documents (
    doc_number, exchange_code, doc_type, amount, currency, fee,
    related_type, related_id, related_name, description, registered_by
  ) VALUES (
    v_new_doc_number, p_exchange_code, 'reversal',
    v_orig.amount, v_orig.currency, 0,
    'document', p_document_id, 'سند برگشتی',
    'برگشت سند ' || v_orig.doc_number || ' — ' || p_reason,
    p_registered_by
  )
  RETURNING id INTO v_new_doc_id;

  FOR v_line IN
    SELECT account_type, account_id, account_name, currency, rate, description, debit, credit
    FROM ledger_entries
    WHERE document_id = p_document_id AND deleted = TRUE AND deleted_by_name = p_registered_by
  LOOP
    INSERT INTO ledger_entries (
      exchange_code, document_id, account_type, account_id, account_name,
      currency, debit, credit, rate, description, registered_by
    ) VALUES (
      p_exchange_code, v_new_doc_id,
      v_line.account_type, v_line.account_id, v_line.account_name,
      v_line.currency, v_line.credit, v_line.debit, v_line.rate,
      'برگشت — ' || v_line.description, p_registered_by
    );
  END LOOP;

  RETURN json_build_object(
    'reversal_document_id', v_new_doc_id,
    'reversal_doc_number', v_new_doc_number,
    'original_document_id', p_document_id
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- RPC: edit_document_transaction
-- ============================================================
CREATE OR REPLACE FUNCTION edit_document_transaction(
  p_exchange_code TEXT,
  p_document_id BIGINT,
  p_description TEXT,
  p_amount NUMERIC,
  p_currency TEXT,
  p_edit_note TEXT,
  p_new_lines JSONB,
  p_registered_by TEXT,
  p_user_id BIGINT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_doc record;
  v_line record;
  v_line_id BIGINT;
  v_line_no INTEGER := 1;
  v_debit_total NUMERIC;
  v_credit_total NUMERIC;
BEGIN
  SELECT * INTO v_doc FROM documents WHERE id = p_document_id AND exchange_code = p_exchange_code;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'document_not_found';
  END IF;

  IF p_new_lines IS NULL OR jsonb_array_length(p_new_lines) = 0 THEN
    RAISE EXCEPTION 'no_lines_provided';
  END IF;

  UPDATE ledger_entries
  SET deleted = TRUE, deleted_date = NOW(), deleted_by_name = p_registered_by
  WHERE document_id = p_document_id AND deleted = FALSE;

  UPDATE documents
  SET edited = TRUE, edited_date = NOW(), edit_note = p_edit_note,
      edited_by_name = p_registered_by, amount = p_amount, currency = p_currency,
      description = COALESCE(p_description, description), updated_at = NOW()
  WHERE id = p_document_id;

  SELECT
    COALESCE(SUM((row->>'debit')::NUMERIC), 0),
    COALESCE(SUM((row->>'credit')::NUMERIC), 0)
  INTO v_debit_total, v_credit_total
  FROM jsonb_array_elements(p_new_lines) AS t(row);

  IF v_debit_total <> v_credit_total THEN
    RAISE EXCEPTION 'unbalanced_lines: debit % != credit %', v_debit_total, v_credit_total;
  END IF;

  FOR v_line IN
    SELECT
      row->>'account_type' AS account_type,
      row->>'account_id' AS account_id,
      row->>'account_name' AS account_name,
      row->>'currency' AS currency,
      (row->>'debit')::NUMERIC AS debit,
      (row->>'credit')::NUMERIC AS credit,
      (row->>'rate')::NUMERIC AS rate,
      row->>'description' AS description
    FROM jsonb_array_elements(p_new_lines) AS t(row)
  LOOP
    INSERT INTO ledger_entries (
      exchange_code, document_id, account_type, account_id, account_name,
      currency, debit, credit, rate, description, doc_line_no,
      registered_by, registered_by_user_id
    ) VALUES (
      p_exchange_code, p_document_id,
      v_line.account_type, v_line.account_id, v_line.account_name,
      v_line.currency, v_line.debit, v_line.credit, v_line.rate,
      v_line.description, v_line_no,
      p_registered_by, p_user_id
    )
    RETURNING id INTO v_line_id;
    v_line_no := v_line_no + 1;
  END LOOP;

  RETURN json_build_object('document_id', p_document_id, 'lines_replaced', true);
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- RPC: get_account_balance
-- ============================================================
CREATE OR REPLACE FUNCTION get_account_balance(
  p_exchange_code TEXT,
  p_account_type TEXT,
  p_account_id TEXT,
  p_currency TEXT DEFAULT NULL
)
RETURNS NUMERIC AS $$
DECLARE
  v_balance NUMERIC;
BEGIN
  SELECT COALESCE(SUM(debit - credit), 0) INTO v_balance
  FROM ledger_entries
  WHERE exchange_code = p_exchange_code
    AND account_type = p_account_type
    AND account_id = p_account_id
    AND deleted = FALSE
    AND (p_currency IS NULL OR currency = p_currency);
  RETURN v_balance;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- DONE! 54 tables + 9 views + 6 functions + 30 triggers.
-- Non-destructive: safe to run multiple times.
-- Creator account is created via backend function (CREATOR_EMAIL/CREATOR_PASSWORD).
-- ============================================================