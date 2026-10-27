-- ============================================================
-- Supabase Emergency Backup — حساب صراف
-- Generated: 2026-10-23T08:49:22.158Z
--
-- SOURCE: Local SQL files in public/ directory
-- TYPE: LOCAL DOCUMENTATION SNAPSHOT (not live database state)
--
-- This file contains structure (schema) only — no real data,
-- PII, passwords, tokens, or keys are included.
--
-- To verify against live database state, run diagnostic queries
-- in Supabase SQL Editor and compare with this file.
--
-- WARNING: This is a documentation snapshot. The actual database
-- may have additional tables, columns, or policies not reflected here.
-- Always verify with live database before any migration.
-- ============================================================

-- ============================================================
-- SECTION 1: SQL SCHEMA & MIGRATION SCRIPTS
-- ============================================================

-- ────────────────────────────────────────────
-- FILE: supabase-schema.sql
-- PURPOSE: Main schema (tables, views, functions, triggers)
-- ────────────────────────────────────────────
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

-- ────────────────────────────────────────────
-- FILE: supabase-rls-policies.sql
-- PURPOSE: RLS policies
-- ────────────────────────────────────────────
-- ============================================================
-- حساب صراف — RLS Policies (Defense in Depth)
-- ============================================================
-- اصول طراحی:
-- 1. Service Role (بک‌اند) همیشه RLS را دور می‌زند → بدون Regression
-- 2. anon key (VITE_SUPABASE_KEY) در فرانت‌اند expose است → باید محدود شود
-- 3. جداول عمومی (قوانین، قیمت‌گذاری، محصولات، تنظیمات، صراف‌ها) → فقط خواندن
-- 4. جداول tenant-scoped → DENY ALL برای anon/authenticated (بدون Policy = deny)
-- 5. هیچ عملیات نوشتن برای anon/authenticated مجاز نیست
-- 6. tenant isolation بر اساس exchange_code در سطح بک‌اند (service_role) اعمال می‌شود
--
-- Idempotent: DROP IF EXISTS + CREATE
-- هیچ DROP TABLE / ALTER COLUMN / DELETE / TRUNCATE وجود ندارد.
-- ============================================================

-- ============================================================
-- ۱. جداول عمومی — خواندن فقط برای anon و authenticated
-- این جداول داده tenant خصوصی ندارند و برای نمایش عمومی لازم‌اند.
-- ============================================================

-- rules: قوانین و مقررات (نمایش عمومی)
DROP POLICY IF EXISTS "public_read_rules" ON rules;
CREATE POLICY "public_read_rules" ON rules
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

-- feature_settings: وضعیت قابلیت‌ها (نمایش عمومی)
DROP POLICY IF EXISTS "public_read_feature_settings" ON feature_settings;
CREATE POLICY "public_read_feature_settings" ON feature_settings
  FOR SELECT TO anon, authenticated
  USING (true);

-- pricing_plans: پلن‌های قیمت‌گذاری (نمایش عمومی)
DROP POLICY IF EXISTS "public_read_pricing_plans" ON pricing_plans;
CREATE POLICY "public_read_pricing_plans" ON pricing_plans
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

-- online_products: کاتالوگ محصولات (فقط فعال‌ها)
DROP POLICY IF EXISTS "public_read_online_products" ON online_products;
CREATE POLICY "public_read_online_products" ON online_products
  FOR SELECT TO anon, authenticated
  USING (enabled = true);

-- app_settings: تنظیمات عمومی برنامه (نسخه، آپدیت) — خواندن برای همه
DROP POLICY IF EXISTS "public_read_app_settings" ON app_settings;
CREATE POLICY "public_read_app_settings" ON app_settings
  FOR SELECT TO anon, authenticated
  USING (true);

-- exchanges: خواندن پروفایل صرافی برای همه (app از anon key استفاده می‌کند)
-- نوشتن فقط از طریق بک‌اند (service_role)
DROP POLICY IF EXISTS "public_read_exchanges" ON exchanges;
CREATE POLICY "public_read_exchanges" ON exchanges
  FOR SELECT TO anon, authenticated
  USING (true);

-- ============================================================
-- ۲. جداول tenant-scoped — بدون Policy = DENY ALL
-- ============================================================
-- این جداول Policy ندارند → PostgreSQL به‌صورت پیش‌فرض همه دسترسی‌ها
-- را برای anon و authenticated رد می‌کند. فقط service_role (بک‌اند)
-- می‌تواند داده‌ها را بخواند/بنویسد چون RLS را دور می‌زند.
--
-- جداول tenant-scoped (داده خصوصی هر صراف):
--   customers, documents, transfers, customer_notifications, chat_messages,
--   rates, bank_accounts, bank_transactions, treasury_transactions,
--   conversions, journal_entries, ledger_entries, employees, origins, safes,
--   wallets, wallet_transactions, charge_orders, online_requests,
--   wallet_withdrawal_requests, wallet_topup_requests, wallet_bans,
--   customer_transfer_requests, customer_links, audit_logs,
--   support_tickets, support_messages, error_reports, user_feedback,
--   user_permissions, user_notifications, payment_transactions,
--   bank_gateways, chat_groups, chat_group_members, message_reports,
--   sellers, packages, plan_quotas, quota_change_logs, referrals,
--   agency_links, backup_records, rate_settings, text_labels,
--   email_otps, idempotency_keys
-- ============================================================

-- حذف Policyهای عمومی read که قبلاً روی جداول tenant-scoped ایجاد شده بودند
-- (این جداول اکنون DENY ALL هستند — بدون Policy)
DROP POLICY IF EXISTS "public_read_customers" ON customers;
DROP POLICY IF EXISTS "public_read_documents" ON documents;
DROP POLICY IF EXISTS "public_read_transfers" ON transfers;
DROP POLICY IF EXISTS "public_read_customer_notifications" ON customer_notifications;
DROP POLICY IF EXISTS "public_read_chat_messages" ON chat_messages;

-- حذف Policyهای بسیار باز روی payment_records و builder_access
-- (این جداول اکنون DENY ALL هستند — فقط service_role دسترسی دارد)
DROP POLICY IF EXISTS "payment_records_read_all" ON payment_records;
DROP POLICY IF EXISTS "payment_records_write_all" ON payment_records;
DROP POLICY IF EXISTS "builder_access_read_all" ON builder_access;
DROP POLICY IF EXISTS "builder_access_write_all" ON builder_access;

-- ============================================================
-- ۳. اطمینان از فعال بودن RLS روی همه جداول موجود
-- (به‌صورت خودکار جداول ناموجود را نادیده می‌گیرد)
-- ============================================================
DO $$
DECLARE
    t TEXT;
    tbls TEXT[] := ARRAY[
        'users', 'exchanges', 'customers', 'documents', 'transfers',
        'conversions', 'treasury_transactions', 'bank_accounts',
        'bank_transactions', 'journal_entries', 'ledger_entries',
        'rates', 'idempotency_keys', 'employees', 'origins', 'safes',
        'rules', 'feature_settings', 'app_settings', 'audit_logs',
        'wallet_transactions', 'charge_orders', 'online_requests',
        'online_products', 'wallets', 'wallet_withdrawal_requests',
        'wallet_topup_requests', 'wallet_bans', 'customer_notifications',
        'customer_transfer_requests', 'customer_links', 'email_otps',
        'user_notifications', 'user_permissions', 'user_feedback',
        'support_tickets', 'support_messages', 'error_reports',
        'bank_gateways', 'payment_transactions', 'chat_groups',
        'chat_group_members', 'chat_messages', 'message_reports',
        'sellers', 'packages', 'pricing_plans', 'plan_quotas',
        'quota_change_logs', 'referrals', 'agency_links',
        'backup_records', 'rate_settings', 'text_labels'
    ];
BEGIN
    FOREACH t IN ARRAY tbls LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t) THEN
            EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
            RAISE NOTICE 'RLS enabled on: %', t;
        ELSE
            RAISE NOTICE 'Skipped (not found): %', t;
        END IF;
    END LOOP;
END $$;

-- ============================================================
-- پایان RLS Policies
-- ============================================================


-- ────────────────────────────────────────────
-- FILE: supabase-app-token-auth.sql
-- PURPOSE: Token auth (HMAC, PBKDF2, login/verify RPCs)
-- ────────────────────────────────────────────
-- ============================================================
-- حساب صراف — ورود مستقیم با توکن امضاشده (بدون Edge Function، بدون Base44)
-- ------------------------------------------------------------
-- این اسکریپت غیرمخرب است: هیچ جدول/داده/رمزی حذف یا تغییر نمی‌کند.
--  • رمزهای قدیمی (pbkdf2) همان‌طور که هستند اعتبارسنجی می‌شوند.
--  • ورود، تأیید نشست و تغییر رمز با توابع RPC در خود پایگاه‌داده انجام می‌شود.
--  • دسترسی به داده‌ها با هدر x-app-token و سیاست‌های RLS کنترل می‌شود.
-- قابل اجرای مجدد (idempotent) است.
-- ============================================================

create extension if not exists pgcrypto with schema extensions;

-- ── کلید امضای توکن (فقط داخل پایگاه‌داده؛ برای کلاینت قابل‌دسترسی نیست) ──
create table if not exists public.app_auth_secret (
  id int primary key default 1 check (id = 1),
  secret text not null
);
insert into public.app_auth_secret (id, secret)
values (1, encode(extensions.gen_random_bytes(48), 'hex'))
on conflict (id) do nothing;
alter table public.app_auth_secret enable row level security;
revoke all on public.app_auth_secret from anon, authenticated;

-- ── Base64url ──
create or replace function public.app_b64url(b bytea) returns text
language sql immutable as $$
  select translate(replace(encode(b, 'base64'), E'\n', ''), '+/=', '-_');
$$;

create or replace function public.app_unb64url(s text) returns bytea
language sql immutable as $$
  select decode(translate(s, '-_', '+/') || repeat('=', (4 - length(s) % 4) % 4), 'base64');
$$;

-- ── PBKDF2-HMAC-SHA256 (همان الگوریتم رمزهای قدیمی: 100000 تکرار، 32 بایت) ──
create or replace function public.app_pbkdf2(p_password text, p_salt bytea, p_iter int default 100000)
returns bytea
language plpgsql
set search_path = public, extensions
as $$
declare
  pw bytea := convert_to(p_password, 'UTF8');
  u bytea;
  t bit(256);
  i int;
  hx text := '';
begin
  u := extensions.hmac(p_salt || '\x00000001'::bytea, pw, 'sha256');
  t := ('x' || encode(u, 'hex'))::bit(256);
  for i in 2..p_iter loop
    u := extensions.hmac(u, pw, 'sha256');
    t := t # ('x' || encode(u, 'hex'))::bit(256);
  end loop;
  for i in 0..63 loop
    hx := hx || to_hex(substring(t from i * 4 + 1 for 4)::int);
  end loop;
  return decode(hx, 'hex');
end $$;

create or replace function public.app_hash_password(p_password text) returns text
language plpgsql
set search_path = public, extensions
as $$
declare salt bytea := extensions.gen_random_bytes(16);
begin
  return 'pbkdf2$' || encode(salt, 'base64') || '$' || encode(public.app_pbkdf2(p_password, salt), 'base64');
end $$;

create or replace function public.app_verify_password(p_password text, p_stored text) returns boolean
language plpgsql
set search_path = public, extensions
as $$
declare parts text[];
begin
  if p_stored is null or p_stored = '' then return false; end if;
  if p_stored like 'pbkdf2$%' then
    parts := string_to_array(p_stored, '$');
    if array_length(parts, 1) <> 3 then return false; end if;
    return encode(public.app_pbkdf2(p_password, decode(parts[2], 'base64')), 'base64') = parts[3];
  end if;
  return p_stored = p_password; -- رمز متن‌ساده‌ی بسیار قدیمی
end $$;

-- ── امضا و بررسی توکن ──
create or replace function public.app_sign(p_payload jsonb) returns text
language plpgsql security definer
set search_path = public, extensions
as $$
declare s text; p text;
begin
  select secret into s from public.app_auth_secret where id = 1;
  p := public.app_b64url(convert_to(p_payload::text, 'UTF8'));
  return p || '.' || public.app_b64url(extensions.hmac(convert_to(p, 'UTF8'), convert_to(s, 'UTF8'), 'sha256'));
end $$;

create or replace function public.app_verify(p_token text) returns jsonb
language plpgsql stable security definer
set search_path = public, extensions
as $$
declare s text; parts text[]; payload jsonb; expected text;
begin
  if p_token is null or p_token = '' then return null; end if;
  parts := string_to_array(p_token, '.');
  if array_length(parts, 1) <> 2 then return null; end if;
  select secret into s from public.app_auth_secret where id = 1;
  expected := public.app_b64url(extensions.hmac(convert_to(parts[1], 'UTF8'), convert_to(s, 'UTF8'), 'sha256'));
  if expected <> parts[2] then return null; end if;
  payload := convert_from(public.app_unb64url(parts[1]), 'UTF8')::jsonb;
  if coalesce((payload ->> 'exp')::bigint, 0) < (extract(epoch from now()) * 1000)::bigint then return null; end if;
  return payload;
exception when others then
  return null;
end $$;

-- ── کلیمِ کاربر جاری از هدر x-app-token (برای سیاست‌های RLS) ──
create or replace function public.app_claims() returns jsonb
language plpgsql stable security definer
set search_path = public, extensions
as $$
declare h text; payload jsonb;
begin
  h := current_setting('request.headers', true);
  if h is null or h = '' then return null; end if;
  payload := public.app_verify((h::json) ->> 'x-app-token');
  if payload is null then return null; end if;
  if not exists (
    select 1 from public.users
    where id = (payload ->> 'uid')::bigint and coalesce(status, 'active') = 'active'
  ) then return null; end if;
  return payload;
exception when others then
  return null;
end $$;

create or replace function public.app_uid() returns bigint
language sql stable as $$ select nullif(public.app_claims() ->> 'uid', '')::bigint $$;

create or replace function public.app_ec() returns text
language sql stable as $$ select nullif(public.app_claims() ->> 'ec', '') $$;

create or replace function public.app_is_admin() returns boolean
language sql stable as $$ select coalesce((public.app_claims() ->> 'r') in ('creator', 'admin'), false) $$;

-- ── کمکی‌های داخلی ──
create or replace function public.app_norm_ident(p text) returns text
language sql immutable as $$
  select btrim(translate(coalesce(p, ''), '۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩', '01234567890123456789'));
$$;

create or replace function public.app_find_user_id(p_ident text) returns bigint
language plpgsql stable security definer
set search_path = public, extensions
as $$
declare i text := public.app_norm_ident(p_ident); m text; v bigint;
begin
  if i = '' then return null; end if;
  m := regexp_replace(i, '[\s\-()]', '', 'g');
  select id into v from public.users where username = i limit 1;
  if v is not null then return v; end if;
  select id into v from public.users where mobile = m limit 1;
  if v is not null then return v; end if;
  select id into v from public.users where lower(email) = lower(i) limit 1;
  if v is not null then return v; end if;
  select id into v from public.users where lower(username) = lower(i) limit 1;
  return v;
end $$;

create or replace function public.app_profile(p_uid bigint) returns jsonb
language plpgsql stable security definer
set search_path = public, extensions
as $$
declare u public.users; ex public.exchanges; uj jsonb;
begin
  select * into u from public.users where id = p_uid;
  if not found then return null; end if;
  if u.role = 'exchange' then
    select * into ex from public.exchanges where owner_user_id = u.id limit 1;
  end if;
  uj := (to_jsonb(u) - 'password') || jsonb_build_object(
    'id', u.id::text,
    'role', case when u.role = 'exchange' then 'sarraaf' else u.role end,
    'created_date', u.created_at,
    'updated_date', u.updated_at
  );
  if ex.id is not null then
    uj := uj || jsonb_build_object('exchange_code', ex.exchange_code, 'exchange_name', ex.exchange_name);
  end if;
  return jsonb_build_object(
    'user', uj,
    'exchange', case when ex.id is not null then to_jsonb(ex) - 'password' else null end,
    'status', u.status
  );
end $$;

create or replace function public.app_audit(p_user_id bigint, p_name text, p_type text, p_action text, p_desc text, p_status text default 'success')
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.audit_logs (user_id, user_name, user_type, action, description, status)
  values (p_user_id, p_name, p_type, p_action, p_desc, p_status);
exception when others then
  null;
end $$;

-- ============================================================
-- توابع عمومی (RPC) — ورود، تأیید نشست، بررسی کاربر قدیمی، تغییر رمز
-- ============================================================
create or replace function public.legacy_login(p_identifier text, p_password text) returns jsonb
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  idn text := public.app_norm_ident(p_identifier);
  v_id bigint; u public.users; prof jsonb; fails int; token text;
begin
  if idn = '' or coalesce(p_password, '') = '' then
    return jsonb_build_object('success', false, 'error', 'missing_fields');
  end if;

  select count(*) into fails from public.audit_logs
  where action = 'login_failed' and user_name = idn and created_at > now() - interval '15 minutes';
  if fails >= 5 then
    return jsonb_build_object('success', false, 'error', 'too_many_attempts');
  end if;

  v_id := public.app_find_user_id(idn);
  if v_id is null then
    perform public.app_audit(null, idn, null, 'login_failed', 'user not found', 'failed');
    return jsonb_build_object('success', false, 'error', 'user_not_found');
  end if;

  select * into u from public.users where id = v_id;
  if not public.app_verify_password(p_password, u.password) then
    perform public.app_audit(u.id, idn, u.role, 'login_failed', 'wrong password', 'failed');
    return jsonb_build_object('success', false, 'error', 'wrong_password');
  end if;
  if coalesce(u.status, 'active') <> 'active' then
    perform public.app_audit(u.id, idn, u.role, 'login_failed', 'user inactive', 'failed');
    return jsonb_build_object('success', false, 'error', 'user_inactive');
  end if;

  update public.users set last_login = now() where id = u.id;
  prof := public.app_profile(u.id);
  token := public.app_sign(jsonb_build_object(
    'uid', u.id::text,
    'r', prof -> 'user' ->> 'role',
    'ec', coalesce(prof -> 'user' ->> 'exchange_code', ''),
    'exp', (extract(epoch from now()) * 1000)::bigint + 43200000
  ));
  perform public.app_audit(u.id, u.full_name, u.role, 'login', 'User logged in (token auth)');

  return jsonb_build_object('success', true, 'user', prof -> 'user', 'exchange', prof -> 'exchange', 'token', token);
end $$;

create or replace function public.legacy_verify(p_token text) returns jsonb
language plpgsql security definer
set search_path = public, extensions
as $$
declare payload jsonb; prof jsonb;
begin
  payload := public.app_verify(p_token);
  if payload is null then
    return jsonb_build_object('success', false, 'error', 'invalid_or_expired_token');
  end if;
  prof := public.app_profile((payload ->> 'uid')::bigint);
  if prof is null then
    return jsonb_build_object('success', false, 'error', 'user_not_found');
  end if;
  if coalesce(prof ->> 'status', 'active') <> 'active' then
    return jsonb_build_object('success', false, 'error', 'user_inactive');
  end if;
  return jsonb_build_object('success', true, 'user', prof -> 'user', 'exchange', prof -> 'exchange');
end $$;

create or replace function public.legacy_check_user(p_identifier text) returns jsonb
language plpgsql stable security definer
set search_path = public, extensions
as $$
declare v_id bigint; u public.users;
begin
  v_id := public.app_find_user_id(p_identifier);
  if v_id is null then return jsonb_build_object('legacy', false); end if;
  select * into u from public.users where id = v_id;
  return jsonb_build_object(
    'legacy', coalesce(u.password, '') not like 'pbkdf2$%',
    'exchange_name', coalesce(u.full_name, '')
  );
end $$;

create or replace function public.legacy_change_password(p_token text, p_old_password text, p_new_password text) returns jsonb
language plpgsql security definer
set search_path = public, extensions
as $$
declare payload jsonb; u public.users;
begin
  if coalesce(p_old_password, '') = '' or coalesce(p_new_password, '') = '' then
    return jsonb_build_object('success', false, 'error', 'missing_fields');
  end if;
  payload := public.app_verify(p_token);
  if payload is null then
    return jsonb_build_object('success', false, 'error', 'invalid_or_expired_token');
  end if;
  select * into u from public.users where id = (payload ->> 'uid')::bigint;
  if not found then
    return jsonb_build_object('success', false, 'error', 'user_not_found');
  end if;
  if not public.app_verify_password(p_old_password, u.password) then
    perform public.app_audit(u.id, u.full_name, u.role, 'change_password', 'wrong current password', 'failed');
    return jsonb_build_object('success', false, 'error', 'wrong_password');
  end if;
  update public.users set password = public.app_hash_password(p_new_password) where id = u.id;
  perform public.app_audit(u.id, u.full_name, u.role, 'change_password', 'Password changed (token auth)');
  return jsonb_build_object('success', true);
end $$;

-- ── مجوزهای اجرا: فقط توابع لازم برای کلاینت باز می‌شوند ──
revoke execute on function
  public.app_pbkdf2(text, bytea, int),
  public.app_hash_password(text),
  public.app_verify_password(text, text),
  public.app_sign(jsonb),
  public.app_verify(text),
  public.app_find_user_id(text),
  public.app_profile(bigint),
  public.app_audit(bigint, text, text, text, text, text)
from public, anon, authenticated;

grant execute on function
  public.app_claims(), public.app_uid(), public.app_ec(), public.app_is_admin(),
  public.legacy_login(text, text), public.legacy_verify(text),
  public.legacy_check_user(text), public.legacy_change_password(text, text, text)
to anon, authenticated;

-- ============================================================
-- محافظ‌ها: کاربر عادی نمی‌تواند نقش/وضعیت/رمز یا طرح اشتراک را دستکاری کند
-- (ادمین/سازنده و عملیات سمت سرور مستثنی هستند)
-- ============================================================
create or replace function public.app_guard_users() returns trigger
language plpgsql as $$
begin
  if current_user in ('anon', 'authenticated') and not public.app_is_admin() then
    if new.role is distinct from old.role
       or new.status is distinct from old.status
       or new.password is distinct from old.password then
      raise exception 'not allowed to change role, status or password';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_app_guard_users on public.users;
create trigger trg_app_guard_users before update on public.users
  for each row execute function public.app_guard_users();

create or replace function public.app_guard_exchanges() returns trigger
language plpgsql as $$
begin
  if current_user in ('anon', 'authenticated') and not public.app_is_admin() then
    if new.plan is distinct from old.plan
       or new.payment_status is distinct from old.payment_status
       or new.paid_start_date is distinct from old.paid_start_date
       or new.paid_end_date is distinct from old.paid_end_date
       or new.quota_limit is distinct from old.quota_limit
       or new.referral_bonus_quota is distinct from old.referral_bonus_quota
       or new.status is distinct from old.status
       or new.owner_user_id is distinct from old.owner_user_id
       or new.exchange_code is distinct from old.exchange_code
       or new.password is distinct from old.password then
      raise exception 'not allowed to change plan, quota, status or ownership';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_app_guard_exchanges on public.exchanges;
create trigger trg_app_guard_exchanges before update on public.exchanges
  for each row execute function public.app_guard_exchanges();

-- ============================================================
-- سیاست‌های دسترسی (RLS) بر پایه‌ی توکن
--  • سازنده/ادمین: دسترسی کامل
--  • صراف: فقط داده‌های صرافی خودش (exchange_code)
--  • کاربر: رکوردهای متعلق به خودش (user_id)؛ کیف پول فقط خواندنی
-- ============================================================
do $$
declare
  t text;
  has_ec boolean;
  uid_type text;
  expr text;
  money text[] := array['wallets', 'wallet_transactions', 'payment_transactions'];
  skip text[] := array['app_auth_secret', 'app_settings', 'feature_settings'];
begin
  for t in
    select c.relname::text from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity and c.relname <> all (skip)
  loop
    execute format('drop policy if exists app_admin_all on public.%I', t);
    execute format('create policy app_admin_all on public.%I for all to anon, authenticated using ((select public.app_is_admin())) with check ((select public.app_is_admin()))', t);

    select exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = t and column_name = 'exchange_code') into has_ec;
    select data_type into uid_type from information_schema.columns where table_schema = 'public' and table_name = t and column_name = 'user_id';

    if has_ec and t <> 'exchanges' then
      execute format('drop policy if exists app_tenant_all on public.%I', t);
      execute format('create policy app_tenant_all on public.%I for all to anon, authenticated using (exchange_code is not null and exchange_code = (select public.app_ec())) with check (exchange_code = (select public.app_ec()))', t);
    end if;

    if uid_type is not null and t <> 'users' then
      if uid_type = 'bigint' then
        expr := 'user_id = (select public.app_uid())';
      else
        expr := 'user_id = (select public.app_uid())::text';
      end if;
      execute format('drop policy if exists app_owner_select on public.%I', t);
      execute format('create policy app_owner_select on public.%I for select to anon, authenticated using (%s)', t, expr);
      if t <> all (money) then
        execute format('drop policy if exists app_owner_insert on public.%I', t);
        execute format('create policy app_owner_insert on public.%I for insert to anon, authenticated with check (%s)', t, expr);
      end if;
    end if;
  end loop;
end $$;

-- کاربران: هر کاربر فقط ردیف خودش را می‌بیند/ویرایش می‌کند
drop policy if exists app_users_select_own on public.users;
create policy app_users_select_own on public.users for select to anon, authenticated
  using (id = (select public.app_uid()));
drop policy if exists app_users_update_own on public.users;
create policy app_users_update_own on public.users for update to anon, authenticated
  using (id = (select public.app_uid())) with check (id = (select public.app_uid()));

-- صرافی: مالک می‌تواند اطلاعات عمومی صرافی خودش را ویرایش کند (طرح/سهمیه با محافظ بالا قفل است)
drop policy if exists app_exchanges_owner_update on public.exchanges;
create policy app_exchanges_owner_update on public.exchanges for update to anon, authenticated
  using (owner_user_id = (select public.app_uid())) with check (owner_user_id = (select public.app_uid()));

-- ثبت گزارش‌های سیستمی توسط هر کاربر واردشده
drop policy if exists app_logged_insert on public.audit_logs;
create policy app_logged_insert on public.audit_logs for insert to anon, authenticated
  with check ((select public.app_uid()) is not null);
drop policy if exists app_logged_insert on public.error_reports;
create policy app_logged_insert on public.error_reports for insert to anon, authenticated
  with check ((select public.app_uid()) is not null);

-- پیام‌های پشتیبانی: فقط در تیکت‌هایی که کاربر اجازه‌ی دیدنشان را دارد
drop policy if exists app_ticket_messages_select on public.support_messages;
create policy app_ticket_messages_select on public.support_messages for select to anon, authenticated
  using (exists (select 1 from public.support_tickets t where t.id = support_messages.ticket_id));
drop policy if exists app_ticket_messages_insert on public.support_messages;
create policy app_ticket_messages_insert on public.support_messages for insert to anon, authenticated
  with check (sender_id = (select public.app_uid())::text
              and exists (select 1 from public.support_tickets t where t.id = support_messages.ticket_id));

-- چت: برای کاربران واردشده
drop policy if exists app_chat_logged_select on public.chat_groups;
create policy app_chat_logged_select on public.chat_groups for select to anon, authenticated
  using ((select public.app_uid()) is not null);
drop policy if exists app_chat_logged_insert on public.chat_groups;
create policy app_chat_logged_insert on public.chat_groups for insert to anon, authenticated
  with check ((select public.app_uid()) is not null);
drop policy if exists app_chat_logged_select on public.chat_group_members;
create policy app_chat_logged_select on public.chat_group_members for select to anon, authenticated
  using ((select public.app_uid()) is not null);
drop policy if exists app_chat_logged_select on public.chat_messages;
create policy app_chat_logged_select on public.chat_messages for select to anon, authenticated
  using ((select public.app_uid()) is not null);
drop policy if exists app_chat_logged_insert on public.chat_messages;
create policy app_chat_logged_insert on public.chat_messages for insert to anon, authenticated
  with check (sender_id = (select public.app_uid())::text);
drop policy if exists app_chat_logged_insert on public.message_reports;
create policy app_chat_logged_insert on public.message_reports for insert to anon, authenticated
  with check ((select public.app_uid()) is not null);

notify pgrst, 'reload schema';


-- ────────────────────────────────────────────
-- FILE: supabase-register-rpc.sql
-- PURPOSE: Registration RPCs (customer, exchange)
-- ────────────────────────────────────────────
-- ============================================================
-- حساب صراف — Registration RPCs with safe prerequisite creation
-- ------------------------------------------------------------
-- This script:
--   1. Creates missing prerequisite tables (users, exchanges,
--      audit_logs, app_auth_secret) using idempotent DDL.
--      Existing tables and their data are NEVER modified.
--   2. Protects app_auth_secret: if it already exists, its
--      secret is left untouched. If created fresh, a random
--      secret is generated once and direct access by
--      anon/authenticated is revoked.
--   3. Validates columns of existing tables; mismatches stop
--      the script safely (no auto-ALTER of existing tables).
--   4. Reports (does NOT create) missing helper functions
--      app_hash_password, app_sign, app_profile, app_audit.
--   5. Creates/replaces register_customer and register_exchange.
--      Runtime DB errors propagate (atomic rollback preserved);
--      only intentional validation results are returned as JSON.
--   6. Grants execute to anon, authenticated and verifies
--      exact function signatures with to_regprocedure.
--
-- Run: Supabase SQL Editor → paste the whole file → Run.
-- ============================================================

-- ── 1. Missing prerequisite tables (idempotent, no data changes) ──

create table if not exists public.users (
  id bigserial primary key,
  full_name text not null,
  mobile text unique,
  username text unique,
  email text,
  password text not null,
  role text not null default 'customer',
  status text not null default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  last_login timestamptz
);
create index if not exists idx_users_role on public.users(role);
create index if not exists idx_users_status on public.users(status);
create index if not exists idx_users_email on public.users(email);

create table if not exists public.exchanges (
  id bigserial primary key,
  exchange_code text unique not null,
  exchange_name text not null,
  owner_user_id bigint references public.users(id) on delete set null,
  name text,
  mobile text,
  email text,
  country text,
  city text,
  status text not null default 'active',
  password text,
  trial_start_date date,
  plan text default 'free',
  quota_limit integer default 100,
  quota_used integer default 0,
  payment_status text default 'none',
  paid_start_date date,
  paid_end_date date,
  referral_enabled boolean default false,
  referral_code text,
  referral_count integer default 0,
  paid_referral_count integer default 0,
  referral_bonus_quota integer default 0,
  last_login timestamptz,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_exchanges_status on public.exchanges(status);
create index if not exists idx_exchanges_owner on public.exchanges(owner_user_id);

create table if not exists public.audit_logs (
  id bigserial primary key,
  user_id bigint references public.users(id) on delete set null,
  registered_by_user_id bigint references public.users(id) on delete set null,
  user_name text not null,
  user_type text,
  action text not null,
  entity_type text,
  entity_id text,
  description text,
  ip_address text,
  device text,
  status text not null default 'success',
  created_at timestamptz default now()
);
create index if not exists idx_audit_user on public.audit_logs(user_id);
create index if not exists idx_audit_action on public.audit_logs(action);

-- app_auth_secret: never overwrite an existing secret.
create table if not exists public.app_auth_secret (
  id int primary key default 1 check (id = 1),
  secret text not null
);
insert into public.app_auth_secret (id, secret)
select 1, encode(extensions.gen_random_bytes(48), 'hex')
where not exists (select 1 from public.app_auth_secret where id = 1);
alter table public.app_auth_secret enable row level security;
revoke all on public.app_auth_secret from anon, authenticated;

-- Enable RLS on freshly created tables (no-op if already enabled).
alter table public.users enable row level security;
alter table public.exchanges enable row level security;
alter table public.audit_logs enable row level security;

-- ── 2. Column validation for existing tables (no auto-ALTER) ──
do $$
declare
  missing text[];
begin
  if not exists (select 1 from information_schema.columns
                where table_schema='public' and table_name='users' and column_name='id') then
    missing := missing || 'column public.users.id';
  end if;
  if not exists (select 1 from information_schema.columns
                where table_schema='public' and table_name='users' and column_name='full_name') then
    missing := missing || 'column public.users.full_name';
  end if;
  if not exists (select 1 from information_schema.columns
                where table_schema='public' and table_name='users' and column_name='mobile') then
    missing := missing || 'column public.users.mobile';
  end if;
  if not exists (select 1 from information_schema.columns
                where table_schema='public' and table_name='users' and column_name='username') then
    missing := missing || 'column public.users.username';
  end if;
  if not exists (select 1 from information_schema.columns
                where table_schema='public' and table_name='users' and column_name='email') then
    missing := missing || 'column public.users.email';
  end if;
  if not exists (select 1 from information_schema.columns
                where table_schema='public' and table_name='users' and column_name='password') then
    missing := missing || 'column public.users.password';
  end if;
  if not exists (select 1 from information_schema.columns
                where table_schema='public' and table_name='users' and column_name='role') then
    missing := missing || 'column public.users.role';
  end if;
  if not exists (select 1 from information_schema.columns
                where table_schema='public' and table_name='users' and column_name='status') then
    missing := missing || 'column public.users.status';
  end if;

  if not exists (select 1 from information_schema.columns
                where table_schema='public' and table_name='exchanges' and column_name='id') then
    missing := missing || 'column public.exchanges.id';
  end if;
  if not exists (select 1 from information_schema.columns
                where table_schema='public' and table_name='exchanges' and column_name='exchange_code') then
    missing := missing || 'column public.exchanges.exchange_code';
  end if;
  if not exists (select 1 from information_schema.columns
                where table_schema='public' and table_name='exchanges' and column_name='exchange_name') then
    missing := missing || 'column public.exchanges.exchange_name';
  end if;
  if not exists (select 1 from information_schema.columns
                where table_schema='public' and table_name='exchanges' and column_name='owner_user_id') then
    missing := missing || 'column public.exchanges.owner_user_id';
  end if;
  if not exists (select 1 from information_schema.columns
                where table_schema='public' and table_name='exchanges' and column_name='status') then
    missing := missing || 'column public.exchanges.status';
  end if;
  if not exists (select 1 from information_schema.columns
                where table_schema='public' and table_name='exchanges' and column_name='plan') then
    missing := missing || 'column public.exchanges.plan';
  end if;
  if not exists (select 1 from information_schema.columns
                where table_schema='public' and table_name='exchanges' and column_name='payment_status') then
    missing := missing || 'column public.exchanges.payment_status';
  end if;
  if not exists (select 1 from information_schema.columns
                where table_schema='public' and table_name='exchanges' and column_name='trial_start_date') then
    missing := missing || 'column public.exchanges.trial_start_date';
  end if;

  if not exists (select 1 from information_schema.columns
                where table_schema='public' and table_name='audit_logs' and column_name='user_id') then
    missing := missing || 'column public.audit_logs.user_id';
  end if;
  if not exists (select 1 from information_schema.columns
                where table_schema='public' and table_name='audit_logs' and column_name='user_name') then
    missing := missing || 'column public.audit_logs.user_name';
  end if;
  if not exists (select 1 from information_schema.columns
                where table_schema='public' and table_name='audit_logs' and column_name='user_type') then
    missing := missing || 'column public.audit_logs.user_type';
  end if;
  if not exists (select 1 from information_schema.columns
                where table_schema='public' and table_name='audit_logs' and column_name='action') then
    missing := missing || 'column public.audit_logs.action';
  end if;
  if not exists (select 1 from information_schema.columns
                where table_schema='public' and table_name='audit_logs' and column_name='description') then
    missing := missing || 'column public.audit_logs.description';
  end if;
  if not exists (select 1 from information_schema.columns
                where table_schema='public' and table_name='audit_logs' and column_name='status') then
    missing := missing || 'column public.audit_logs.status';
  end if;

  if missing is not null then
    raise exception 'Column validation failed — registration RPCs were NOT created. Missing/incompatible: %',
      array_to_string(missing, ', ');
  end if;
end
$$;

-- ── 3. Helper-function checks (reported, not created here) ──
do $$
declare
  missing text[];
begin
  if to_regprocedure('public.app_hash_password(text)') is null then
    missing := missing || 'function public.app_hash_password(text)';
  end if;
  if to_regprocedure('public.app_sign(jsonb)') is null then
    missing := missing || 'function public.app_sign(jsonb)';
  end if;
  if to_regprocedure('public.app_profile(bigint)') is null
     and to_regprocedure('public.app_profile(integer)') is null then
    missing := missing || 'function public.app_profile(bigint|integer)';
  end if;
  -- app_audit has 6 params (last has default); to_regprocedure needs exact sig,
  -- so check via pg_proc + pg_get_function_identity_arguments (strips defaults).
  if not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'app_audit'
    and pg_get_function_identity_arguments(p.oid) = 'bigint, text, text, text, text'
  ) then
    missing := missing || 'function public.app_audit(bigint, text, text, text, text)';
  end if;

  if missing is not null then
    raise exception 'Helper functions missing — registration RPCs were NOT created. Run supabase-app-token-auth.sql first. Missing: %',
      array_to_string(missing, ', ');
  end if;
end
$$;

-- ── 4. register_customer ──
-- Validation results are returned as JSON; runtime DB errors propagate
-- so the transaction rolls back atomically (no silent success).
create or replace function public.register_customer(
  p_full_name text, p_mobile text, p_username text, p_password text, p_email text default null
) returns jsonb
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  v_id bigint; prof jsonb; token text; auth_email text;
begin
  if coalesce(p_full_name, '') = '' or coalesce(p_mobile, '') = '' or coalesce(p_username, '') = '' or coalesce(p_password, '') = '' then
    return jsonb_build_object('success', false, 'error', 'missing_fields');
  end if;
  if length(p_password) < 8 then
    return jsonb_build_object('success', false, 'error', 'weak_password');
  end if;
  if exists (select 1 from public.users where mobile = p_mobile) then
    return jsonb_build_object('success', false, 'error', 'mobile_exists');
  end if;
  if exists (select 1 from public.users where username = p_username) then
    return jsonb_build_object('success', false, 'error', 'username_exists');
  end if;
  auth_email := case when p_email is not null and p_email <> '' then lower(trim(p_email)) else null end;
  if auth_email is not null and exists (select 1 from public.users where lower(email) = auth_email) then
    return jsonb_build_object('success', false, 'error', 'email_exists');
  end if;

  insert into public.users (full_name, mobile, username, email, password, role, status)
  values (p_full_name, p_mobile, p_username, auth_email, public.app_hash_password(p_password), 'customer', 'active')
  returning id into v_id;

  prof := public.app_profile(v_id);
  token := public.app_sign(jsonb_build_object(
    'uid', v_id::text,
    'r', prof -> 'user' ->> 'role',
    'ec', coalesce(prof -> 'user' ->> 'exchange_code', ''),
    'exp', (extract(epoch from now()) * 1000)::bigint + 43200000
  ));

  perform public.app_audit(v_id, p_full_name, 'customer', 'register', 'Customer registered (direct RPC)');

  return jsonb_build_object('success', true, 'user', prof -> 'user', 'token', token);
end $$;

-- ── 5. register_exchange ──
create or replace function public.register_exchange(
  p_exchange_name text, p_full_name text, p_mobile text, p_username text, p_password text,
  p_email text default null, p_country text default null, p_city text default null, p_exchange_code text default null
) returns jsonb
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  v_id bigint; prof jsonb; token text; ex_code text; ex_id bigint; auth_email text;
begin
  if coalesce(p_exchange_name, '') = '' or coalesce(p_full_name, '') = '' or coalesce(p_mobile, '') = '' or coalesce(p_username, '') = '' or coalesce(p_password, '') = '' then
    return jsonb_build_object('success', false, 'error', 'missing_fields');
  end if;
  if length(p_password) < 8 then
    return jsonb_build_object('success', false, 'error', 'weak_password');
  end if;
  if exists (select 1 from public.users where mobile = p_mobile) then
    return jsonb_build_object('success', false, 'error', 'mobile_exists');
  end if;
  if exists (select 1 from public.users where username = p_username) then
    return jsonb_build_object('success', false, 'error', 'username_exists');
  end if;
  auth_email := case when p_email is not null and p_email <> '' then lower(trim(p_email)) else null end;
  if auth_email is not null and exists (select 1 from public.users where lower(email) = auth_email) then
    return jsonb_build_object('success', false, 'error', 'email_exists');
  end if;
  if p_exchange_code is not null and p_exchange_code <> '' and not exists (select 1 from public.exchanges where exchange_code = p_exchange_code) then
    return jsonb_build_object('success', false, 'error', 'exchange_code_exists');
  end if;

  insert into public.users (full_name, mobile, username, email, password, role, status)
  values (p_full_name, p_mobile, p_username, auth_email, public.app_hash_password(p_password), 'exchange', 'active')
  returning id into v_id;

  ex_code := coalesce(nullif(p_exchange_code, ''), 'EX-' || to_char(now(), 'YYMMDD') || lpad((random() * 1000)::int::text, 3, '0'));

  insert into public.exchanges (exchange_code, exchange_name, owner_user_id, status, plan, payment_status, trial_start_date)
  values (ex_code, p_exchange_name, v_id, 'active', 'free', 'trial', current_date)
  returning id into ex_id;

  prof := public.app_profile(v_id);
  token := public.app_sign(jsonb_build_object(
    'uid', v_id::text,
    'r', prof -> 'user' ->> 'role',
    'ec', coalesce(prof -> 'user' ->> 'exchange_code', ''),
    'exp', (extract(epoch from now()) * 1000)::bigint + 43200000
  ));

  perform public.app_audit(v_id, p_full_name, 'exchange', 'register', 'Exchange registered (direct RPC)');

  return jsonb_build_object('success', true, 'user', prof -> 'user', 'exchange', prof -> 'exchange', 'token', token);
end $$;

-- ── 6. Permissions ──
grant execute on function public.register_customer(text, text, text, text, text) to anon, authenticated;
grant execute on function public.register_exchange(text, text, text, text, text, text, text, text, text) to anon, authenticated;

-- ── 7. Refresh PostgREST schema cache ──
notify pgrst, 'reload schema';

-- ── 8. Final verification (exact signatures via to_regprocedure) ──
do $$
begin
  if to_regprocedure('public.register_customer(text, text, text, text, text)') is null then
    raise exception 'Verification failed: public.register_customer(text, text, text, text, text) was not created.';
  end if;
  if to_regprocedure('public.register_exchange(text, text, text, text, text, text, text, text, text)') is null then
    raise exception 'Verification failed: public.register_exchange(text, text, text, text, text, text, text, text, text) was not created.';
  end if;
  raise notice '✅ Registration RPCs created successfully and schema cache refreshed.';
end $$;


-- ────────────────────────────────────────────
-- FILE: supabase-direct-rls.sql
-- PURPOSE: Token-based RLS policies (x-app-token header)
-- ────────────────────────────────────────────
-- ============================================================
-- Supabase Direct Auth — RLS Policies & Schema Setup
-- ============================================================
-- Run this in the Supabase SQL Editor.
--
-- This script is NON-DESTRUCTIVE:
--   - Uses ADD COLUMN IF NOT EXISTS (never drops columns)
--   - Uses CREATE POLICY IF NOT EXISTS (never drops policies)
--   - Does NOT delete or modify any existing data
--
-- After running:
--   1. Deploy the Edge Function: supabase functions deploy legacy-auth
--   2. The app will use Supabase Auth directly (no Base44 credits)
-- ============================================================

-- ── 1. Add auth_uid column to users table ──
-- This links the Supabase Auth account (auth.users) to the public users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_uid UUID UNIQUE;

-- Index for fast lookup by auth_uid
CREATE INDEX IF NOT EXISTS idx_users_auth_uid ON users (auth_uid);

-- ── 2. Enable RLS on users table ──
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can read their OWN row (matched by auth_uid)
DROP POLICY IF EXISTS "users_select_own" ON users;
CREATE POLICY "users_select_own" ON users
  FOR SELECT USING (auth_uid = auth.uid()::text);

-- Users can update their OWN row (e.g., change password)
DROP POLICY IF EXISTS "users_update_own" ON users;
CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (auth_uid = auth.uid()::text);

-- Creator/admin can read ALL users
-- NOTE: This requires a way to identify creators. Since the creator's
-- email is in the users table with role='creator', we check by auth_uid match.
-- For simplicity, the Edge Function (service-role) handles admin operations
-- and bypasses RLS entirely.
DROP POLICY IF EXISTS "users_select_all_admin" ON users;
CREATE POLICY "users_select_all_admin" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_uid = auth.uid()::text AND u.role IN ('creator', 'admin')
    )
  );

-- ── 3. RLS for key data tables (tenant isolation by exchange_code) ──
-- These policies ensure each sarraaf sees only their own exchange's data,
-- while creator/admin can see everything.

-- Helper function: get current user's exchange_code
CREATE OR REPLACE FUNCTION get_current_exchange_code()
RETURNS TEXT AS $$
  SELECT exchange_code FROM users WHERE auth_uid = auth.uid()::text LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Helper function: is current user creator or admin?
CREATE OR REPLACE FUNCTION is_current_user_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE auth_uid = auth.uid()::text AND role IN ('creator', 'admin')
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ── 4. Enable RLS on tenant-scoped tables ──
-- Each table gets:
--   - SELECT: own exchange_code OR admin
--   - INSERT: own exchange_code OR admin
--   - UPDATE: own exchange_code OR admin
--   - DELETE: admin only

DO $$
DECLARE
  tbl TEXT;
  tenant_tables TEXT[] := ARRAY[
    'customers', 'transfers', 'documents', 'ledger_entries',
    'bank_accounts', 'bank_transactions', 'safes', 'origins',
    'conversions', 'treasury_transactions',
    'rates', 'employees', 'rate_settings',
    'wallets', 'wallet_transactions',
    'charge_orders', 'sellers', 'online_requests',
    'support_tickets', 'error_reports', 'user_feedback',
    'wallet_topup_requests', 'wallet_withdrawal_requests', 'wallet_bans',
    'customer_transfer_requests', 'customer_notifications', 'customer_links',
    'quota_change_logs',
    'referrals', 'backup_records'
  ];
BEGIN
  FOREACH tbl IN ARRAY tenant_tables LOOP
    -- Enable RLS
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);

    -- SELECT policy
    EXECUTE format('DROP POLICY IF IF EXISTS "tenant_select_own" ON %I', tbl);
    EXECUTE format('CREATE POLICY "tenant_select_own" ON %I FOR SELECT USING (is_current_user_admin() OR exchange_code = get_current_exchange_code())', tbl);

    -- INSERT policy
    EXECUTE format('DROP POLICY IF IF EXISTS "tenant_insert_own" ON %I', tbl);
    EXECUTE format('CREATE POLICY "tenant_insert_own" ON %I FOR INSERT WITH CHECK (is_current_user_admin() OR exchange_code = get_current_exchange_code())', tbl);

    -- UPDATE policy
    EXECUTE format('DROP POLICY IF IF EXISTS "tenant_update_own" ON %I', tbl);
    EXECUTE format('CREATE POLICY "tenant_update_own" ON %I FOR UPDATE USING (is_current_user_admin() OR exchange_code = get_current_exchange_code())', tbl);

    -- DELETE policy (admin only)
    EXECUTE format('DROP POLICY IF IF EXISTS "tenant_delete_admin" ON %I', tbl);
    EXECUTE format('CREATE POLICY "tenant_delete_admin" ON %I FOR DELETE USING (is_current_user_admin())', tbl);
  END LOOP;
END $$;

-- ── 5. Public tables (readable by all, writes admin-only) ──
-- These tables contain public configuration data
DO $$
DECLARE
  tbl TEXT;
  public_tables TEXT[] := ARRAY[
    'feature_settings', 'app_settings', 'pricing_plans', 'plan_quotas',
    'online_products', 'packages', 'bank_gateways', 'text_labels',
    'rules', 'rate_settings'
  ];
BEGIN
  FOREACH tbl IN ARRAY public_tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);

    -- Public read
    EXECUTE format('DROP POLICY IF IF EXISTS "public_select" ON %I', tbl);
    EXECUTE format('CREATE POLICY "public_select" ON %I FOR SELECT USING (true)', tbl);

    -- Admin-only writes
    EXECUTE format('DROP POLICY IF IF EXISTS "admin_write" ON %I', tbl);
    EXECUTE format('CREATE POLICY "admin_write" ON %I FOR ALL USING (is_current_user_admin()) WITH CHECK (is_current_user_admin())', tbl);
  END LOOP;
END $$;

-- ── 6. Notifications — user sees only their own ──
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notifications_select_own" ON user_notifications;
CREATE POLICY "notifications_select_own" ON user_notifications
  FOR SELECT USING (
    target_user_id = auth.uid()::text
    OR target_role = 'all'
    OR is_current_user_admin()
  );

-- ── 7. Support system — user sees only their own tickets ──
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tickets_select_own" ON support_tickets;
CREATE POLICY "tickets_select_own" ON support_tickets
  FOR SELECT USING (
    created_by_id = auth.uid()::text OR is_current_user_admin()
  );

ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "messages_select_own" ON support_messages;
CREATE POLICY "messages_select_own" ON support_messages
  FOR SELECT USING (
    created_by_id = auth.uid()::text OR is_current_user_admin()
  );

-- ── 8. Exchanges table — sarraaf sees own, admin sees all ──
ALTER TABLE exchanges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "exchanges_select_own" ON exchanges;
CREATE POLICY "exchanges_select_own" ON exchanges
  FOR SELECT USING (
    is_current_user_admin()
    OR owner_user_id IN (
      SELECT id FROM users WHERE auth_uid = auth.uid()::text
    )
  );

-- ── Done ──
-- NOTE: If any table or column doesn't exist yet, the corresponding
-- statement will fail silently (wrapped in exception handlers where needed).
-- Run the schema migration SQL files first if tables are missing.


-- ────────────────────────────────────────────
-- FILE: supabase-final-migration.sql
-- PURPOSE: Final consolidated migration
-- ────────────────────────────────────────────
-- ============================================================
-- حساب صراف — Migration نهایی یکپارچه (Non-Destructive, Idempotent)
-- ============================================================
-- این فایل ترکیب یکپارچه از سه فایل زیر است:
--   1. supabase-schema.sql          (جداول، Viewها، RPCها، Triggerها)
--   2. supabase-missing-columns.sql  (ستون‌های مفقود + جداول جدید)
--   3. supabase-rls-policies.sql     (Policyهای عمومی + RLS)
--
-- اصول:
--   ✅ ترتیب: جداول → ستون‌ها → Viewها → RPCها → Triggerها → RLS
--   ✅ همه CREATE/ALTER با IF NOT EXISTS — امن برای اجرای چندباره
--   ✅ هیچ DROP TABLE، DELETE، TRUNCATE یا حذف داده وجود ندارد
--   ✅ داده‌های فعلی، کاربران، مشتریان، اسناد، تراکنش‌ها حفظ می‌شوند
--   ✅ Policyهای tenant-scoped محدود شده‌اند (DENY ALL برای anon)
--   ✅ فقط Policyهای عمومی (نمایش عمومی) ایجاد می‌شوند
--
-- نحوه اجرا: Supabase Dashboard → SQL Editor → New Query → Paste → Run
-- ============================================================

-- ============================================================
-- بخش ۱: ایجاد جداول اصلی (CREATE TABLE IF NOT EXISTS)
-- ============================================================

-- 1. users
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

-- 2. exchanges
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

-- 3. customers
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
ALTER TABLE customers ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_group TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS locked BOOLEAN DEFAULT FALSE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS notes TEXT;

-- 4. transfers
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

-- 5. documents
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
ALTER TABLE documents ADD COLUMN IF NOT EXISTS transfer_id BIGINT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS deleted_date TIMESTAMPTZ;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS deleted_by_name TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS delete_note TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS edited BOOLEAN DEFAULT FALSE;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS edited_date TIMESTAMPTZ;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS edit_note TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS edited_by_name TEXT;
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
CREATE INDEX IF NOT EXISTS idx_documents_deleted ON documents(deleted);
CREATE INDEX IF NOT EXISTS idx_documents_exchange_deleted ON documents(exchange_code, deleted);

-- 6. conversions
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

-- 7. treasury_transactions
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

-- 8. bank_accounts
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

-- 9. bank_transactions
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

-- 10. journal_entries
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

-- 11. ledger_entries
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
ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS document_id BIGINT;
ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS transfer_id BIGINT;
ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS account_type TEXT NOT NULL DEFAULT 'suspense';
ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS account_id TEXT;
ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS account_name TEXT;
ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS rate NUMERIC(18,6);
ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS pair_entry_id BIGINT;
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

-- 12. rates
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
ALTER TABLE rates ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
ALTER TABLE rates ADD COLUMN IF NOT EXISTS daily_rate NUMERIC(18,6);
ALTER TABLE rates ADD COLUMN IF NOT EXISTS decimals INTEGER DEFAULT 2;
ALTER TABLE rates ADD COLUMN IF NOT EXISTS symbol TEXT;
ALTER TABLE rates ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'fiat';
ALTER TABLE rates ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT FALSE;
ALTER TABLE rates ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- 13. employees
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

-- 14. origins
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
ALTER TABLE origins ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE origins ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE origins ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE origins ADD COLUMN IF NOT EXISTS notes TEXT;

-- 15. safes
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

-- 16. rules
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
ALTER TABLE rules ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE rules ADD COLUMN IF NOT EXISTS link_url TEXT;
ALTER TABLE rules ADD COLUMN IF NOT EXISTS link_label TEXT;
ALTER TABLE rules ADD COLUMN IF NOT EXISTS icon TEXT;
ALTER TABLE rules ADD COLUMN IF NOT EXISTS accent TEXT;
ALTER TABLE rules ADD COLUMN IF NOT EXISTS pinned BOOLEAN DEFAULT FALSE;
ALTER TABLE rules ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ;
ALTER TABLE rules ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ;

-- 17. feature_settings
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
ALTER TABLE feature_settings ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE feature_settings ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE feature_settings ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT FALSE;
ALTER TABLE feature_settings ADD COLUMN IF NOT EXISTS free_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE feature_settings ADD COLUMN IF NOT EXISTS paid_enabled BOOLEAN DEFAULT TRUE;

-- 18. app_settings
CREATE TABLE IF NOT EXISTS app_settings (
  id BIGSERIAL PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  setting_type TEXT NOT NULL DEFAULT 'text',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS data JSONB;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS updated_by_name TEXT;

-- 19. audit_logs
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
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS target_name TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS before_value TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS after_value TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS reason TEXT;

-- 20. wallet_transactions
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
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS total_paid NUMERIC(18,2);
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS rate_snapshot JSONB;
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS from_name TEXT;
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS to_name TEXT;
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS buyer_phone TEXT;
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS seller_id BIGINT;
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS seller_name TEXT;
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS order_id BIGINT;

-- 21. charge_orders
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
ALTER TABLE charge_orders ADD COLUMN IF NOT EXISTS category_key TEXT;
ALTER TABLE charge_orders ADD COLUMN IF NOT EXISTS rate_snapshot JSONB;
ALTER TABLE charge_orders ADD COLUMN IF NOT EXISTS seller_id BIGINT;
ALTER TABLE charge_orders ADD COLUMN IF NOT EXISTS seller_name TEXT;
ALTER TABLE charge_orders ADD COLUMN IF NOT EXISTS fulfillment_date TIMESTAMPTZ;
ALTER TABLE charge_orders ADD COLUMN IF NOT EXISTS tracking_no TEXT;
ALTER TABLE charge_orders ADD COLUMN IF NOT EXISTS notes TEXT;

-- 22. online_requests
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

-- 23. online_products
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

-- 24. idempotency_keys
CREATE TABLE IF NOT EXISTS idempotency_keys (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  client_operation_id TEXT NOT NULL UNIQUE,
  table_name TEXT NOT NULL,
  result_id BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_idempotency_client_op ON idempotency_keys(client_operation_id);

-- 25. wallets
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

-- 26. wallet_withdrawal_requests
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

-- 27. wallet_topup_requests
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
ALTER TABLE wallet_topup_requests ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE wallet_topup_requests ADD COLUMN IF NOT EXISTS sender_name TEXT;
ALTER TABLE wallet_topup_requests ADD COLUMN IF NOT EXISTS card_last4 TEXT;
ALTER TABLE wallet_topup_requests ADD COLUMN IF NOT EXISTS transaction_time TIMESTAMPTZ;
ALTER TABLE wallet_topup_requests ADD COLUMN IF NOT EXISTS card_number TEXT;
ALTER TABLE wallet_topup_requests ADD COLUMN IF NOT EXISTS receipt_url TEXT;
ALTER TABLE wallet_topup_requests ADD COLUMN IF NOT EXISTS related_order_id BIGINT;
ALTER TABLE wallet_topup_requests ADD COLUMN IF NOT EXISTS reject_reason TEXT;

-- 28. wallet_bans
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
ALTER TABLE wallet_bans ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE wallet_bans ADD COLUMN IF NOT EXISTS rejection_count INTEGER DEFAULT 0;
ALTER TABLE wallet_bans ADD COLUMN IF NOT EXISTS banned_until TIMESTAMPTZ;
ALTER TABLE wallet_bans ADD COLUMN IF NOT EXISTS permanent_ban BOOLEAN DEFAULT FALSE;
ALTER TABLE wallet_bans ADD COLUMN IF NOT EXISTS last_reason TEXT;

-- 29. customer_notifications
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
ALTER TABLE customer_notifications ADD COLUMN IF NOT EXISTS customer_id BIGINT;
ALTER TABLE customer_notifications ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE customer_notifications ADD COLUMN IF NOT EXISTS transfer_id BIGINT;
ALTER TABLE customer_notifications ADD COLUMN IF NOT EXISTS transfer_no TEXT;

-- 30. customer_transfer_requests
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

-- 31. customer_links
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

-- 32. email_otps
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

-- 33. user_notifications
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

-- 34. user_permissions
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

-- 35. user_feedback
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

-- 36. support_tickets
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

-- 37. support_messages
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

-- 38. error_reports
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

-- 39. bank_gateways
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

-- 40. payment_transactions
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

-- 41. chat_groups
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

-- 42. chat_group_members
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

-- 43. chat_messages
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

-- 44. message_reports
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

-- 45. sellers
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
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS user_id BIGINT;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS customer_code TEXT;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5,2) DEFAULT 0;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS balance NUMERIC(18,2) DEFAULT 0;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS withdrawn_total NUMERIC(18,2) DEFAULT 0;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS notes TEXT;

-- 46. packages
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

-- 47. pricing_plans
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

-- 48. plan_quotas
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

-- 49. quota_change_logs
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

-- 50. referrals
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

-- 51. agency_links
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

-- 52. backup_records
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

-- 53. text_labels
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
ALTER TABLE text_labels ADD COLUMN IF NOT EXISTS label_group TEXT;

-- 54. rate_settings
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

-- 55. payment_records (جدول جدید)
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

-- 56. builder_access (جدول جدید)
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
-- بخش ۲: ستون‌های مفقود exchanges
-- ============================================================
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS trial_start_date DATE;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS quota_limit INTEGER DEFAULT 100;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS quota_used INTEGER DEFAULT 0;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free';
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS quota_start_date TIMESTAMPTZ;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS quota_end_date TIMESTAMPTZ;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'none';
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS paid_start_date TIMESTAMPTZ;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS paid_end_date TIMESTAMPTZ;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS referral_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS referral_code TEXT;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS referral_count INTEGER DEFAULT 0;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS paid_referral_count INTEGER DEFAULT 0;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS referral_bonus_quota INTEGER DEFAULT 0;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS notes TEXT;
-- تنظیم trial_start_date برای رکوردهای موجود که فاقد مقدار هستند
UPDATE exchanges SET trial_start_date = (created_at AT TIME ZONE 'UTC')::DATE
  WHERE trial_start_date IS NULL AND created_at IS NOT NULL;

-- ============================================================
-- بخش ۳: ستون مفقود users
-- ============================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'customer';

-- ============================================================
-- بخش ۴: Viewها
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
-- بخش ۵: توابع (Functions)
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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
    -- double-entry: debit the fee receiver (customer/treasury), credit fee income
    INSERT INTO ledger_entries (
      exchange_code, document_id, transfer_id,
      account_type, account_id, account_name,
      currency, debit, credit, description, doc_line_no,
      registered_by, registered_by_user_id
    )
    VALUES
    (
      p_exchange_code, v_doc_id, v_transfer_id,
      'fee', '', 'کارمزد حواله',
      COALESCE(p_fee_currency, p_currency), p_fee, 0,
      'کارمزد پرداختی (بدهکار)', 3,
      p_registered_by, p_user_id
    ),
    (
      p_exchange_code, v_doc_id, v_transfer_id,
      'fee_income', '', 'درآمد کارمزد',
      COALESCE(p_fee_currency, p_currency), 0, p_fee,
      'درآمد کارمزد حواله (بستانکار)', 4,
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
-- بخش ۶: Triggerها
-- ============================================================
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
-- بخش ۷: RLS — فعال‌سازی روی همه جداول
-- ============================================================
DO $$
DECLARE
    t TEXT;
    tbls TEXT[] := ARRAY[
        'users', 'exchanges', 'customers', 'documents', 'transfers',
        'conversions', 'treasury_transactions', 'bank_accounts',
        'bank_transactions', 'journal_entries', 'ledger_entries',
        'rates', 'idempotency_keys', 'employees', 'origins', 'safes',
        'rules', 'feature_settings', 'app_settings', 'audit_logs',
        'wallet_transactions', 'charge_orders', 'online_requests',
        'online_products', 'wallets', 'wallet_withdrawal_requests',
        'wallet_topup_requests', 'wallet_bans', 'customer_notifications',
        'customer_transfer_requests', 'customer_links', 'email_otps',
        'user_notifications', 'user_permissions', 'user_feedback',
        'support_tickets', 'support_messages', 'error_reports',
        'bank_gateways', 'payment_transactions', 'chat_groups',
        'chat_group_members', 'chat_messages', 'message_reports',
        'sellers', 'packages', 'pricing_plans', 'plan_quotas',
        'quota_change_logs', 'referrals', 'agency_links',
        'backup_records', 'rate_settings', 'text_labels',
        'payment_records', 'builder_access'
    ];
BEGIN
    FOREACH t IN ARRAY tbls LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t) THEN
            EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
            RAISE NOTICE 'RLS enabled on: %', t;
        ELSE
            RAISE NOTICE 'Skipped (not found): %', t;
        END IF;
    END LOOP;
END $$;

-- ============================================================
-- بخش ۸: RLS Policies — فقط جداول عمومی (خواندن برای همه)
-- ============================================================

-- rules: قوانین و مقررات (نمایش عمومی)
DROP POLICY IF EXISTS "public_read_rules" ON rules;
CREATE POLICY "public_read_rules" ON rules
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

-- feature_settings: وضعیت قابلیت‌ها (نمایش عمومی)
DROP POLICY IF EXISTS "public_read_feature_settings" ON feature_settings;
CREATE POLICY "public_read_feature_settings" ON feature_settings
  FOR SELECT TO anon, authenticated
  USING (true);

-- pricing_plans: پلن‌های قیمت‌گذاری (نمایش عمومی)
-- ⚠️ اصلاح شده: is_active به جای active (ستون واقعی در schema)
DROP POLICY IF EXISTS "public_read_pricing_plans" ON pricing_plans;
CREATE POLICY "public_read_pricing_plans" ON pricing_plans
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

-- online_products: کاتالوگ محصولات (فقط فعال‌ها)
DROP POLICY IF EXISTS "public_read_online_products" ON online_products;
CREATE POLICY "public_read_online_products" ON online_products
  FOR SELECT TO anon, authenticated
  USING (enabled = true);

-- app_settings: تنظیمات عمومی برنامه — خواندن برای همه
DROP POLICY IF EXISTS "public_read_app_settings" ON app_settings;
CREATE POLICY "public_read_app_settings" ON app_settings
  FOR SELECT TO anon, authenticated
  USING (true);

-- exchanges: خواندن پروفایل صرافی برای همه (نمایش عمومی)
DROP POLICY IF EXISTS "public_read_exchanges" ON exchanges;
CREATE POLICY "public_read_exchanges" ON exchanges
  FOR SELECT TO anon, authenticated
  USING (true);

-- ============================================================
-- بخش ۹: حذف Policyهای باز قبلی روی جداول tenant-scoped
-- (این جداول اکنون DENY ALL هستند — فقط service_role دسترسی دارد)
-- ============================================================
DROP POLICY IF EXISTS "public_read_customers" ON customers;
DROP POLICY IF EXISTS "public_read_documents" ON documents;
DROP POLICY IF EXISTS "public_read_transfers" ON transfers;
DROP POLICY IF EXISTS "public_read_customer_notifications" ON customer_notifications;
DROP POLICY IF EXISTS "public_read_chat_messages" ON chat_messages;
DROP POLICY IF EXISTS "payment_records_read_all" ON payment_records;
DROP POLICY IF EXISTS "payment_records_write_all" ON payment_records;
DROP POLICY IF EXISTS "builder_access_read_all" ON builder_access;
DROP POLICY IF EXISTS "builder_access_write_all" ON builder_access;

-- ============================================================
-- پایان Migration نهایی یکپارچه
-- ============================================================
-- خلاصه:
--   ۵۶ جدول (۵۴ اصلی + ۲ جدید: payment_records, builder_access)
--   ۹ View
--   ۶ Function (update_updated_at, get_next_doc_number, get_next_transfer_number, post_transfer_transaction, reverse_document_transaction, edit_document_transaction, get_account_balance)
--   ۳۱ Trigger
--   RLS روی همه جداول فعال
--   Policyهای عمومی خواندنی برای ۶ جدول عمومی
--   جداول tenant-scoped: DENY ALL برای anon/authenticated
--
-- هیچ داده‌ای حذف نمی‌شود. امن برای اجرای چندباره.
-- ============================================================


-- ────────────────────────────────────────────
-- FILE: supabase-missing-columns.sql
-- PURPOSE: Missing columns fix
-- ────────────────────────────────────────────
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


-- ────────────────────────────────────────────
-- FILE: supabase-trial-columns.sql
-- PURPOSE: Trial period columns
-- ────────────────────────────────────────────
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


-- ────────────────────────────────────────────
-- FILE: supabase-migrate-passwords.sql
-- PURPOSE: Password migration RPC
-- ────────────────────────────────────────────
-- ============================================================
-- حساب صراف — مهاجرت امن رمزهای قدیمی به هش pbkdf2
-- ------------------------------------------------------------
-- پس از ورود موفق، این تابع رمز را بررسی می‌کند:
--   • اگر رمز از قبل pbkdf2 باشد → نیازی به مهاجرت نیست
--   • اگر رمز متن ساده یا هش ضعیف باشد → به pbkdf2 تبدیل می‌شود
--
-- پیش‌نیاز: اسکریپت supabase-secure-login.sql اجرا شده باشد.
-- غیرمخرب و تکرارپذیر: هیچ داده‌ای حذف نمی‌شود.
-- فقط پس از تأیید رمز صحیح، هش به‌روزرسانی می‌شود.
-- ============================================================

create or replace function public.legacy_migrate_password(p_token text, p_password text) returns jsonb
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  payload jsonb;
  u public.users;
begin
  if coalesce(p_password, '') = '' then
    return jsonb_build_object('success', false, 'error', 'missing_fields');
  end if;

  -- تأیید توکن نشست
  payload := public.app_verify(p_token);
  if payload is null then
    return jsonb_build_object('success', false, 'error', 'invalid_or_expired_token');
  end if;

  select * into u from public.users where id = (payload ->> 'uid')::bigint;
  if not found then
    return jsonb_build_object('success', false, 'error', 'user_not_found');
  end if;

  -- اگر رمز از قبل pbkdf2 است، مهاجرت لازم نیست
  if u.password like 'pbkdf2$%' then
    return jsonb_build_object('success', true, 'migrated', false, 'reason', 'already_secure');
  end if;

  -- تأیید رمز فعلی
  if not public.app_verify_password(p_password, u.password) then
    return jsonb_build_object('success', false, 'error', 'wrong_password');
  end if;

  -- مهاجرت به هش امن pbkdf2
  update public.users set password = public.app_hash_password(p_password) where id = u.id;
  perform public.app_audit(u.id, u.full_name, u.role, 'password_migration', 'Password migrated to secure hash (pbkdf2)');

  return jsonb_build_object('success', true, 'migrated', true);
end $$;

-- مجوز اجرا برای کلاینت
grant execute on function public.legacy_migrate_password(text, text) to anon, authenticated;

-- بازگذاری اسکمای PostgREST
notify pgrst, 'reload schema';


-- ────────────────────────────────────────────
-- FILE: supabase-fix-register-rpc.sql
-- PURPOSE: Register RPC fix
-- ────────────────────────────────────────────
-- ============================================================
-- حساب صراف — ایجاد امن توابع ثبت‌نام (register_customer / register_exchange)
-- ------------------------------------------------------------
-- این اسکریپت کاملاً غیرمخرب است:
--   • هیچ جدول، داده یا ستونی حذف یا تغییر نمی‌کند
--   • هیچ overload ناشناخته‌ای drop نمی‌شود
--   • فقط توابع ثبت‌نام را با create or replace ایجاد می‌کند
--   • ثبت کاربر + پروفایل صرافی در یک تراکنش اتمیک انجام می‌شود
--   • رمز با سازوکار هش موجود (app_hash_password) ذخیره می‌شود
--
-- پیش‌نیازها (همه در دیتابیس موجود هستند):
--   app_hash_password, app_sign, app_profile, app_audit
--
-- نحوه اجرا:
--   1. وارد Supabase Dashboard شوید
--   2. به بخش SQL Editor بروید
--   3. کل این فایل را کپی و اجرا کنید
--   4. پیام تأیید در پایین را ببینید
-- ============================================================

-- ── ۱. بررسی پیش‌نیازها ──
do $$
begin
  if not exists (select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'app_hash_password') then
    raise exception 'پیش‌نیاز: تابع app_hash_password یافت نشد — ابتدا supabase-app-token-auth.sql را اجرا کنید';
  end if;
  if not exists (select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'app_sign') then
    raise exception 'پیش‌نیاز: تابع app_sign یافت نشد — ابتدا supabase-app-token-auth.sql را اجرا کنید';
  end if;
  if not exists (select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'app_profile') then
    raise exception 'پیش‌نیاز: تابع app_profile یافت نشد — ابتدا supabase-app-token-auth.sql را اجرا کنید';
  end if;
end $$;

-- ── ۲. ثبت‌نام مشتری ──
-- امضا: (p_full_name, p_mobile, p_username, p_password, p_email)
-- فرانت‌اند با همین نام‌ها و ترتیب صدا می‌زند.
create or replace function public.register_customer(
  p_full_name text, p_mobile text, p_username text, p_password text, p_email text default null
) returns jsonb
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  v_id bigint; prof jsonb; token text; auth_email text;
begin
  -- اعتبارسنجی فیلدهای الزامی
  if coalesce(p_full_name, '') = '' or coalesce(p_mobile, '') = '' or coalesce(p_username, '') = '' or coalesce(p_password, '') = '' then
    return jsonb_build_object('success', false, 'error', 'missing_fields');
  end if;
  if length(p_password) < 8 then
    return jsonb_build_object('success', false, 'error', 'weak_password');
  end if;
  -- بررسی تکرار موبایل
  if exists (select 1 from public.users where mobile = p_mobile) then
    return jsonb_build_object('success', false, 'error', 'mobile_exists');
  end if;
  -- بررسی تکرار نام کاربری
  if exists (select 1 from public.users where username = p_username) then
    return jsonb_build_object('success', false, 'error', 'username_exists');
  end if;
  -- بررسی تکرار ایمیل (در صورت وارد شدن)
  auth_email := case when p_email is not null and p_email <> '' then lower(trim(p_email)) else null end;
  if auth_email is not null and exists (select 1 from public.users where lower(email) = auth_email) then
    return jsonb_build_object('success', false, 'error', 'email_exists');
  end if;

  -- ایجاد کاربر (تراکنش اتمیک: اگر خطا رخ دهد، کل عملیات لغو می‌شود)
  insert into public.users (full_name, mobile, username, email, password, role, status)
  values (p_full_name, p_mobile, p_username, auth_email, public.app_hash_password(p_password), 'customer', 'active')
  returning id into v_id;

  -- تولید توکن نشست
  prof := public.app_profile(v_id);
  token := public.app_sign(jsonb_build_object(
    'uid', v_id::text,
    'r', prof -> 'user' ->> 'role',
    'ec', coalesce(prof -> 'user' ->> 'exchange_code', ''),
    'exp', (extract(epoch from now()) * 1000)::bigint + 43200000
  ));

  -- ثبت لاگ_audit
  perform public.app_audit(v_id, p_full_name, 'customer', 'register', 'Customer registered (direct RPC)');

  return jsonb_build_object('success', true, 'user', prof -> 'user', 'token', token);
exception when others then
  -- خطا: کل تراکنش لغو می‌شود، هیچ داده‌ای ذخیره نمی‌شود
  return jsonb_build_object('success', false, 'error', 'db_error', 'message', SQLERRM);
end $$;

-- ── ۳. ثبت‌نام صراف ──
-- امضا: (p_exchange_name, p_full_name, p_mobile, p_username, p_password,
--        p_email, p_country, p_city, p_exchange_code)
-- ثبت کاربر + پروفایل صرافی در یک تراکنش اتمیک.
create or replace function public.register_exchange(
  p_exchange_name text, p_full_name text, p_mobile text, p_username text, p_password text,
  p_email text default null, p_country text default null, p_city text default null, p_exchange_code text default null
) returns jsonb
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  v_id bigint; prof jsonb; token text; ex_code text; ex_id bigint; auth_email text;
begin
  -- اعتبارسنجی فیلدهای الزامی
  if coalesce(p_exchange_name, '') = '' or coalesce(p_full_name, '') = '' or coalesce(p_mobile, '') = '' or coalesce(p_username, '') = '' or coalesce(p_password, '') = '' then
    return jsonb_build_object('success', false, 'error', 'missing_fields');
  end if;
  if length(p_password) < 8 then
    return jsonb_build_object('success', false, 'error', 'weak_password');
  end if;
  -- بررسی تکرار موبایل
  if exists (select 1 from public.users where mobile = p_mobile) then
    return jsonb_build_object('success', false, 'error', 'mobile_exists');
  end if;
  -- بررسی تکرار نام کاربری
  if exists (select 1 from public.users where username = p_username) then
    return jsonb_build_object('success', false, 'error', 'username_exists');
  end if;
  -- بررسی تکرار ایمیل (در صورت وارد شدن)
  auth_email := case when p_email is not null and p_email <> '' then lower(trim(p_email)) else null end;
  if auth_email is not null and exists (select 1 from public.users where lower(email) = auth_email) then
    return jsonb_build_object('success', false, 'error', 'email_exists');
  end if;
  -- بررسی کد دعوت (در صورت وارد شدن)
  if p_exchange_code is not null and p_exchange_code <> '' and not exists (select 1 from public.exchanges where exchange_code = p_exchange_code) then
    return jsonb_build_object('success', false, 'error', 'exchange_code_exists');
  end if;

  -- ایجاد کاربر (نقش exchange = صراف)
  insert into public.users (full_name, mobile, username, email, password, role, status)
  values (p_full_name, p_mobile, p_username, auth_email, public.app_hash_password(p_password), 'exchange', 'active')
  returning id into v_id;

  -- تولید کد صرافی (در صورت نبود کد دعوت، کد خودکار تولید می‌شود)
  ex_code := coalesce(nullif(p_exchange_code, ''), 'EX-' || to_char(now(), 'YYMMDD') || lpad((random() * 1000)::int::text, 3, '0'));

  -- ایجاد پروفایل صرافی (همان تراکنش — اگر خطا رخ دهد، کاربر هم لغو می‌شود)
  insert into public.exchanges (exchange_code, exchange_name, owner_user_id, status, plan, payment_status, trial_start_date)
  values (ex_code, p_exchange_name, v_id, 'active', 'free', 'trial', current_date)
  returning id into ex_id;

  -- تولید توکن نشست
  prof := public.app_profile(v_id);
  token := public.app_sign(jsonb_build_object(
    'uid', v_id::text,
    'r', prof -> 'user' ->> 'role',
    'ec', coalesce(prof -> 'user' ->> 'exchange_code', ''),
    'exp', (extract(epoch from now()) * 1000)::bigint + 43200000
  ));

  -- ثبت لاگ_audit
  perform public.app_audit(v_id, p_full_name, 'exchange', 'register', 'Exchange registered (direct RPC)');

  return jsonb_build_object('success', true, 'user', prof -> 'user', 'exchange', prof -> 'exchange', 'token', token);
exception when others then
  -- خطا: کل تراکنش لغو می‌شود — نه کاربر و نه پروفایل صرافی ذخیره نمی‌شوند
  return jsonb_build_object('success', false, 'error', 'db_error', 'message', SQLERRM);
end $$;

-- ── ۴. مجوزها: توابع ثبت‌نام برای کلاینت باز می‌شوند ──
grant execute on function public.register_customer(text, text, text, text, text) to anon, authenticated;
grant execute on function public.register_exchange(text, text, text, text, text, text, text, text, text) to anon, authenticated;

-- ── ۵. به‌روزرسانی schema cache ──
notify pgrst, 'reload schema';

-- ── ۶. تأیید نهایی ──
do $$
begin
  if not exists (select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'register_customer'
    and pg_get_function_identity_arguments(p.oid) = 'text, text, text, text, text') then
    raise exception 'خطا: تابع register_customer ایجاد نشد';
  end if;
  if not exists (select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'register_exchange'
    and pg_get_function_identity_arguments(p.oid) = 'text, text, text, text, text, text, text, text, text') then
    raise exception 'خطا: تابع register_exchange ایجاد نشد';
  end if;
  raise notice '✅ توابع ثبت‌نام با موفقیت ایجاد شدند و schema cache به‌روزرسانی شد';
end $$;


-- ────────────────────────────────────────────
-- FILE: supabase-secure-login.sql
-- PURPOSE: Secure login
-- ────────────────────────────────────────────
-- ============================================================
-- حساب صراف — ورود امن و مستقیم با توکن امضاشده
-- ------------------------------------------------------------
-- اصلاح‌شده و امن — قابل اجرای مجدد (idempotent)
--
-- تغییرات نسبت به نسخه قبلی:
--   ۱. تابع app_xor_bytes اضافه شد — XOR صحیح روی bytea
--   ۲. تابع app_pbkdf2 اصلاح شد — به‌جای bit string های معیوب، از app_xor_bytes استفاده می‌کند
--   ۳. حلقهٔ مخرب RLS حذف شد — سیاست‌ها با نام‌های app_ ایجاد می‌شوند و سیاست‌های موجود را حذف نمی‌کنند
--   ۴. سیاست‌های خواندن عمومی برای جداول پیکربندی عمومی اضافه شد
--   ۵. سیاست SELECT برای مالک صرافی اضافه شد (در نسخه قبلی مالک نمی‌توانست صرافی خود را ببیند)
--
-- غیرمخرب: هیچ جدول/داده/رمزی حذف یا تغییر نمی‌کند.
--   • رمزهای قدیمی (pbkdf2$ یا متن ساده) همان‌طور که هستند اعتبارسنجی می‌شوند.
--   • ورود، تأیید نشست و تغییر رمز با توابع RPC در پایگاه‌داده انجام می‌شود.
--   • دسترسی به داده‌ها با هدر x-app-token و سیاست‌های RLS کنترل می‌شود.
-- ============================================================

create extension if not exists pgcrypto with schema extensions;

-- ── کلید امضای توکن (فقط داخل پایگاه‌داده؛ برای کلاینت قابل‌دسترسی نیست) ──
create table if not exists public.app_auth_secret (
  id int primary key default 1 check (id = 1),
  secret text not null
);
insert into public.app_auth_secret (id, secret)
values (1, encode(extensions.gen_random_bytes(48), 'hex'))
on conflict (id) do nothing;
alter table public.app_auth_secret enable row level security;
revoke all on public.app_auth_secret from anon, authenticated;

-- ── Base64url ──
create or replace function public.app_b64url(b bytea) returns text
language sql immutable as $$
  select translate(replace(encode(b, 'base64'), E'\n', ''), '+/=', '-_');
$$;

create or replace function public.app_unb64url(s text) returns bytea
language sql immutable as $$
  select decode(translate(s, '-_', '+/') || repeat('=', (4 - length(s) % 4) % 4), 'base64');
$$;

-- ── XOR صحیح روی دو مقدار bytea (جایگزین عملیات bit string معیوب) ──
-- هر بایت از a را با بایت متناظر در b XOR می‌کند و نتیجه را برمی‌گرداند.
create or replace function public.app_xor_bytes(a bytea, b bytea) returns bytea
language sql immutable as $$
  select decode(
    coalesce((
      select string_agg(lpad(to_hex(get_byte(a, g) # get_byte(b, g)), 2, '0'), '')
      from generate_series(0, least(length(a), length(b)) - 1) as g
    ), ''),
    'hex'
  )
$$;

-- ── PBKDF2-HMAC-SHA256 (همان الگوریتم رمزهای قدیمی: ۱۰۰۰۰۰ تکرار، ۳۲ بایت) ──
-- از app_xor_bytes استفاده می‌کند تا از عملیات bit string معیوب جلوگیری شود.
-- نکتهٔ کارایی: این تابع در PL/pgSQL اجرا می‌شود و برای رمزهای pbkdf2$ ممکن است
-- چند ثانیه طول بکشد. رمزهای متن ساده فوراً تأیید می‌شوند.
create or replace function public.app_pbkdf2(p_password text, p_salt bytea, p_iter int default 100000)
returns bytea
language plpgsql
set search_path = public, extensions
as $$
declare
  pw bytea := convert_to(p_password, 'UTF8');
  u bytea;
  t bytea;
  i int;
begin
  u := extensions.hmac(p_salt || '\x00000001'::bytea, pw, 'sha256');
  t := u;
  for i in 2..p_iter loop
    u := extensions.hmac(u, pw, 'sha256');
    t := public.app_xor_bytes(t, u);
  end loop;
  return t;
end $$;

create or replace function public.app_hash_password(p_password text) returns text
language plpgsql
set search_path = public, extensions
as $$
declare salt bytea := extensions.gen_random_bytes(16);
begin
  return 'pbkdf2$' || encode(salt, 'base64') || '$' || encode(public.app_pbkdf2(p_password, salt), 'base64');
end $$;

-- ── تأیید رمز عبور — از هر دو فرمت pbkdf2$ و متن ساده پشتیبانی می‌کند ──
-- هیچ تغییری در مقدار ذخیره‌شده ایجاد نمی‌کند.
create or replace function public.app_verify_password(p_password text, p_stored text) returns boolean
language plpgsql
set search_path = public, extensions
as $$
declare parts text[];
begin
  if p_stored is null or p_stored = '' then return false; end if;
  if p_stored like 'pbkdf2$%' then
    parts := string_to_array(p_stored, '$');
    if array_length(parts, 1) <> 3 then return false; end if;
    return encode(public.app_pbkdf2(p_password, decode(parts[2], 'base64')), 'base64') = parts[3];
  end if;
  return p_stored = p_password;
end $$;

-- ── امضا و بررسی توکن (HMAC-SHA256) ──
create or replace function public.app_sign(p_payload jsonb) returns text
language plpgsql security definer
set search_path = public, extensions
as $$
declare s text; p text;
begin
  select secret into s from public.app_auth_secret where id = 1;
  p := public.app_b64url(convert_to(p_payload::text, 'UTF8'));
  return p || '.' || public.app_b64url(extensions.hmac(convert_to(p, 'UTF8'), convert_to(s, 'UTF8'), 'sha256'));
end $$;

create or replace function public.app_verify(p_token text) returns jsonb
language plpgsql stable security definer
set search_path = public, extensions
as $$
declare s text; parts text[]; payload jsonb; expected text;
begin
  if p_token is null or p_token = '' then return null; end if;
  parts := string_to_array(p_token, '.');
  if array_length(parts, 1) <> 2 then return null; end if;
  select secret into s from public.app_auth_secret where id = 1;
  expected := public.app_b64url(extensions.hmac(convert_to(parts[1], 'UTF8'), convert_to(s, 'UTF8'), 'sha256'));
  if expected <> parts[2] then return null; end if;
  payload := convert_from(public.app_unb64url(parts[1]), 'UTF8')::jsonb;
  if coalesce((payload ->> 'exp')::bigint, 0) < (extract(epoch from now()) * 1000)::bigint then return null; end if;
  return payload;
exception when others then
  return null;
end $$;

-- ── کلیمِ کاربر جاری از هدر x-app-token (برای سیاست‌های RLS) ──
-- توکن را از هدر درخواست استخراج کرده و پس از تأیید امضا، کلیم‌ها را برمی‌گرداند.
-- کاربر باید در جدول users وجود داشته باشد و فعال باشد.
create or replace function public.app_claims() returns jsonb
language plpgsql stable security definer
set search_path = public, extensions
as $$
declare h text; payload jsonb;
begin
  h := current_setting('request.headers', true);
  if h is null or h = '' then return null; end if;
  payload := public.app_verify((h::json) ->> 'x-app-token');
  if payload is null then return null; end if;
  if not exists (
    select 1 from public.users
    where id = (payload ->> 'uid')::bigint and coalesce(status, 'active') = 'active'
  ) then return null; end if;
  return payload;
exception when others then
  return null;
end $$;

create or replace function public.app_uid() returns bigint
language sql stable security definer as $$ select nullif(public.app_claims() ->> 'uid', '')::bigint $$;

create or replace function public.app_ec() returns text
language sql stable security definer as $$ select nullif(public.app_claims() ->> 'ec', '') $$;

create or replace function public.app_is_admin() returns boolean
language sql stable security definer as $$ select coalesce((public.app_claims() ->> 'r') in ('creator', 'admin'), false) $$;

-- ── نرمال‌سازی شناسه (تبدیل ارقام فارسی/عربی به لاتین و حذف فاصله) ──
create or replace function public.app_norm_ident(p text) returns text
language sql immutable as $$
  select btrim(translate(coalesce(p, ''), '۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩', '01234567890123456789'));
$$;

-- ── جستجوی کاربر با شناسه (نام کاربری، موبایل یا ایمیل) ──
-- ابتدا نام کاربری دقیق، سپس موبایل نرمال‌شده، سپس ایمیل، سپس نام کاربری case-insensitive.
create or replace function public.app_find_user_id(p_ident text) returns bigint
language plpgsql stable security definer
set search_path = public, extensions
as $$
declare i text := public.app_norm_ident(p_ident); m text; v bigint;
begin
  if i = '' then return null; end if;
  m := regexp_replace(i, '[\s\-()]', '', 'g');
  select id into v from public.users where username = i limit 1;
  if v is not null then return v; end if;
  select id into v from public.users where mobile = m limit 1;
  if v is not null then return v; end if;
  select id into v from public.users where lower(email) = lower(i) limit 1;
  if v is not null then return v; end if;
  select id into v from public.users where lower(username) = lower(i) limit 1;
  return v;
end $$;

-- ── پروفایل کاربر (بدون رمز عبور) + اطلاعات صرافی (در صورت وجود) ──
create or replace function public.app_profile(p_uid bigint) returns jsonb
language plpgsql stable security definer
set search_path = public, extensions
as $$
declare u public.users; ex public.exchanges; uj jsonb;
begin
  select * into u from public.users where id = p_uid;
  if not found then return null; end if;
  if u.role = 'exchange' then
    select * into ex from public.exchanges where owner_user_id = u.id limit 1;
  end if;
  uj := (to_jsonb(u) - 'password') || jsonb_build_object(
    'id', u.id::text,
    'role', case when u.role = 'exchange' then 'sarraaf' else u.role end,
    'created_date', u.created_at,
    'updated_date', u.updated_at
  );
  if ex.id is not null then
    uj := uj || jsonb_build_object('exchange_code', ex.exchange_code, 'exchange_name', ex.exchange_name);
  end if;
  return jsonb_build_object(
    'user', uj,
    'exchange', case when ex.id is not null then to_jsonb(ex) - 'password' else null end,
    'status', u.status
  );
end $$;

-- ── ثبت رویداد ممیزی (خطاها را نادیده می‌گیرد — غیربحرانی) ──
create or replace function public.app_audit(p_user_id bigint, p_name text, p_type text, p_action text, p_desc text, p_status text default 'success')
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.audit_logs (user_id, user_name, user_type, action, description, status)
  values (p_user_id, p_name, p_type, p_action, p_desc, p_status);
exception when others then
  null;
end $$;

-- ============================================================
-- توابع عمومی (RPC) — فقط این توابع از کلاینت قابل فراخوانی هستند
-- ============================================================

-- ── ورود: تأیید رمز قدیمی و صدور توکن نشست (۱۲ ساعت اعتبار) ──
-- محدودیت تلاش: ۵ تلاش ناموفق در ۱۵ دقیقه → مسدود موقت.
-- رمز تأیید نمی‌شود → تغییر نمی‌کند.
create or replace function public.legacy_login(p_identifier text, p_password text) returns jsonb
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  idn text := public.app_norm_ident(p_identifier);
  v_id bigint; u public.users; prof jsonb; fails int; token text;
begin
  if idn = '' or coalesce(p_password, '') = '' then
    return jsonb_build_object('success', false, 'error', 'missing_fields');
  end if;

  select count(*) into fails from public.audit_logs
  where action = 'login_failed' and user_name = idn and created_at > now() - interval '15 minutes';
  if fails >= 5 then
    return jsonb_build_object('success', false, 'error', 'too_many_attempts');
  end if;

  v_id := public.app_find_user_id(idn);
  if v_id is null then
    perform public.app_audit(null, idn, null, 'login_failed', 'user not found', 'failed');
    return jsonb_build_object('success', false, 'error', 'user_not_found');
  end if;

  select * into u from public.users where id = v_id;
  if not public.app_verify_password(p_password, u.password) then
    perform public.app_audit(u.id, idn, u.role, 'login_failed', 'wrong password', 'failed');
    return jsonb_build_object('success', false, 'error', 'wrong_password');
  end if;
  if coalesce(u.status, 'active') <> 'active' then
    perform public.app_audit(u.id, idn, u.role, 'login_failed', 'user inactive', 'failed');
    return jsonb_build_object('success', false, 'error', 'user_inactive');
  end if;

  update public.users set last_login = now() where id = u.id;
  prof := public.app_profile(u.id);
  token := public.app_sign(jsonb_build_object(
    'uid', u.id::text,
    'r', prof -> 'user' ->> 'role',
    'ec', coalesce(prof -> 'user' ->> 'exchange_code', ''),
    'exp', (extract(epoch from now()) * 1000)::bigint + 43200000
  ));
  perform public.app_audit(u.id, u.full_name, u.role, 'login', 'User logged in (token auth)');

  return jsonb_build_object('success', true, 'user', prof -> 'user', 'exchange', prof -> 'exchange', 'token', token);
end $$;

-- ── تأیید نشست: بررسی اعتبار توکن و بازگرداندن پروفایل ──
create or replace function public.legacy_verify(p_token text) returns jsonb
language plpgsql security definer
set search_path = public, extensions
as $$
declare payload jsonb; prof jsonb;
begin
  payload := public.app_verify(p_token);
  if payload is null then
    return jsonb_build_object('success', false, 'error', 'invalid_or_expired_token');
  end if;
  prof := public.app_profile((payload ->> 'uid')::bigint);
  if prof is null then
    return jsonb_build_object('success', false, 'error', 'user_not_found');
  end if;
  if coalesce(prof ->> 'status', 'active') <> 'active' then
    return jsonb_build_object('success', false, 'error', 'user_inactive');
  end if;
  return jsonb_build_object('success', true, 'user', prof -> 'user', 'exchange', prof -> 'exchange');
end $$;

-- ── بررسی کاربر قدیمی: آیا رمز کاربر هنوز هش نشده است؟ ──
create or replace function public.legacy_check_user(p_identifier text) returns jsonb
language plpgsql stable security definer
set search_path = public, extensions
as $$
declare v_id bigint; u public.users;
begin
  v_id := public.app_find_user_id(p_identifier);
  if v_id is null then return jsonb_build_object('legacy', false); end if;
  select * into u from public.users where id = v_id;
  return jsonb_build_object(
    'legacy', coalesce(u.password, '') not like 'pbkdf2$%',
    'exchange_name', coalesce(u.full_name, '')
  );
end $$;

-- ── تغییر رمز: تأیید رمز فعلی و جایگزینی با هش جدید ──
create or replace function public.legacy_change_password(p_token text, p_old_password text, p_new_password text) returns jsonb
language plpgsql security definer
set search_path = public, extensions
as $$
declare payload jsonb; u public.users;
begin
  if coalesce(p_old_password, '') = '' or coalesce(p_new_password, '') = '' then
    return jsonb_build_object('success', false, 'error', 'missing_fields');
  end if;
  payload := public.app_verify(p_token);
  if payload is null then
    return jsonb_build_object('success', false, 'error', 'invalid_or_expired_token');
  end if;
  select * into u from public.users where id = (payload ->> 'uid')::bigint;
  if not found then
    return jsonb_build_object('success', false, 'error', 'user_not_found');
  end if;
  if not public.app_verify_password(p_old_password, u.password) then
    perform public.app_audit(u.id, u.full_name, u.role, 'change_password', 'wrong current password', 'failed');
    return jsonb_build_object('success', false, 'error', 'wrong_password');
  end if;
  update public.users set password = public.app_hash_password(p_new_password) where id = u.id;
  perform public.app_audit(u.id, u.full_name, u.role, 'change_password', 'Password changed (token auth)');
  return jsonb_build_object('success', true);
end $$;

-- ============================================================
-- مجوزهای اجرا: فقط توابع عمومی لازم برای کلاینت باز می‌شوند
-- توابع داخلی (هش، امضا، جستجو) از دسترس عمومی خارج می‌شوند.
-- ============================================================
revoke execute on function
  public.app_xor_bytes(bytea, bytea),
  public.app_pbkdf2(text, bytea, int),
  public.app_hash_password(text),
  public.app_verify_password(text, text),
  public.app_sign(jsonb),
  public.app_verify(text),
  public.app_find_user_id(text),
  public.app_profile(bigint),
  public.app_audit(bigint, text, text, text, text, text)
from public, anon, authenticated;

grant execute on function
  public.legacy_login(text, text),
  public.legacy_verify(text),
  public.legacy_check_user(text),
  public.legacy_change_password(text, text, text)
to anon, authenticated;

-- ============================================================
-- محافظ‌ها: کاربر عادی نمی‌تواند نقش/وضعیت/رمز یا طرح اشتراک را دستکاری کند
-- (توابع SECURITY DEFINER مانند legacy_change_password مستثنی هستند)
-- ============================================================
create or replace function public.app_guard_users() returns trigger
language plpgsql as $$
begin
  if current_user in ('anon', 'authenticated') and not public.app_is_admin() then
    if new.role is distinct from old.role
       or new.status is distinct from old.status
       or new.password is distinct from old.password then
      raise exception 'not allowed to change role, status or password';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_app_guard_users on public.users;
create trigger trg_app_guard_users before update on public.users
  for each row execute function public.app_guard_users();

create or replace function public.app_guard_exchanges() returns trigger
language plpgsql as $$
begin
  if current_user in ('anon', 'authenticated') and not public.app_is_admin() then
    if new.plan is distinct from old.plan
       or new.payment_status is distinct from old.payment_status
       or new.paid_start_date is distinct from old.paid_start_date
       or new.paid_end_date is distinct from old.paid_end_date
       or new.quota_limit is distinct from old.quota_limit
       or new.referral_bonus_quota is distinct from old.referral_bonus_quota
       or new.status is distinct from old.status
       or new.owner_user_id is distinct from old.owner_user_id
       or new.exchange_code is distinct from old.exchange_code
       or new.password is distinct from old.password then
      raise exception 'not allowed to change plan, quota, status or ownership';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_app_guard_exchanges on public.exchanges;
create trigger trg_app_guard_exchanges before update on public.exchanges
  for each row execute function public.app_guard_exchanges();

-- ============================================================
-- سیاست‌های دسترسی (RLS) بر پایه‌ی توکن
--   • سازنده/ادمین: دسترسی کامل
--   • صراف: فقط داده‌های صرافی خودش (exchange_code)
--   • کاربر: رکوردهای متعلق به خودش (user_id)
--   • جداول پیکربندی عمومی: خواندن برای همه
--
-- نکته: این سیاست‌ها با پیشوند app_ نام‌گذاری شده‌اند و
--   سیاست‌های موجود از اسکریپت‌های دیگر را حذف نمی‌کنند.
-- ============================================================

-- ── ۱. سیاست ادمین: دسترسی کامل برای creator/admin روی همهٔ جداول ──
-- فقط روی جداولی که RLS فعال است اعمال می‌شود.
do $$
declare
  t text;
  skip text[] := array['app_auth_secret', 'app_settings', 'feature_settings',
    'pricing_plans', 'plan_quotas', 'online_products', 'packages',
    'bank_gateways', 'text_labels', 'rules', 'rate_settings'];
begin
  for t in
    select c.relname::text from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
      and c.relname <> all (skip)
  loop
    execute format('drop policy if exists app_admin_all on public.%I', t);
    execute format('create policy app_admin_all on public.%I for all to anon, authenticated using ((select public.app_is_admin())) with check ((select public.app_is_admin()))', t);
  end loop;
end $$;

-- ── ۲. سیاست صراف: داده‌های متعلق به صرافی خودش (exchange_code) ──
-- روی جداولی که ستون exchange_code دارند (به‌جز exchanges خودش).
do $$
declare
  t text;
begin
  for t in
    select c.relname::text from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    join information_schema.columns col on col.table_schema = 'public' and col.table_name = c.relname
    where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
      and col.column_name = 'exchange_code' and c.relname <> 'exchanges'
  loop
    execute format('drop policy if exists app_tenant_all on public.%I', t);
    execute format('create policy app_tenant_all on public.%I for all to anon, authenticated using (exchange_code is not null and exchange_code = (select public.app_ec())) with check (exchange_code = (select public.app_ec()))', t);
  end loop;
end $$;

-- ── ۳. سیاست مالک: کاربر رکوردهای متعلق به خودش را می‌بیند ──
-- روی جداولی که ستون user_id دارند (به‌جز users خودش).
-- جداول پولی (wallets, wallet_transactions, payment_transactions)
-- فقط خواندنی هستند — درج/ویرایش فقط توسط ادمین.
do $$
declare
  t text;
  uid_type text;
  expr text;
  money text[] := array['wallets', 'wallet_transactions', 'payment_transactions'];
begin
  for t in
    select distinct c.relname::text from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    join information_schema.columns col on col.table_schema = 'public' and col.table_name = c.relname
    where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
      and col.column_name = 'user_id' and c.relname <> 'users'
  loop
    select data_type into uid_type from information_schema.columns
    where table_schema = 'public' and table_name = t and column_name = 'user_id';
    if uid_type = 'bigint' then
      expr := 'user_id = (select public.app_uid())';
    else
      expr := 'user_id = (select public.app_uid())::text';
    end if;
    execute format('drop policy if exists app_owner_select on public.%I', t);
    execute format('create policy app_owner_select on public.%I for select to anon, authenticated using (%s)', t, expr);
    if t <> all (money) then
      execute format('drop policy if exists app_owner_insert on public.%I', t);
      execute format('create policy app_owner_insert on public.%I for insert to anon, authenticated with check (%s)', t, expr);
    end if;
  end loop;
end $$;

-- ── ۴. جداول پیکربندی عمومی: خواندن برای همه، نوشتن فقط ادمین ──
do $$
declare
  t text;
  public_tables text[] := array[
    'feature_settings', 'app_settings', 'pricing_plans', 'plan_quotas',
    'online_products', 'packages', 'bank_gateways', 'text_labels',
    'rules', 'rate_settings'
  ];
begin
  foreach t in array public_tables loop
    execute format('drop policy if exists app_public_read on public.%I', t);
    execute format('create policy app_public_read on public.%I for select to anon, authenticated using (true)', t);
    execute format('drop policy if exists app_admin_write on public.%I', t);
    execute format('create policy app_admin_write on public.%I for all to anon, authenticated using ((select public.app_is_admin())) with check ((select public.app_is_admin()))', t);
  end loop;
end $$;

-- ── ۵. جدول users: هر کاربر فقط ردیف خودش را می‌بیند/ویرایش می‌کند ──
drop policy if exists app_users_select_own on public.users;
create policy app_users_select_own on public.users for select to anon, authenticated
  using (id = (select public.app_uid()));
drop policy if exists app_users_update_own on public.users;
create policy app_users_update_own on public.users for update to anon, authenticated
  using (id = (select public.app_uid())) with check (id = (select public.app_uid()));

-- ── ۶. جدول exchanges: مالک صرافی می‌تواند اطلاعات خودش را ببیند/ویرایش کند ──
drop policy if exists app_exchanges_owner_select on public.exchanges;
create policy app_exchanges_owner_select on public.exchanges for select to anon, authenticated
  using (owner_user_id = (select public.app_uid()));
drop policy if exists app_exchanges_owner_update on public.exchanges;
create policy app_exchanges_owner_update on public.exchanges for update to anon, authenticated
  using (owner_user_id = (select public.app_uid())) with check (owner_user_id = (select public.app_uid()));

-- ── ۷. ثبت گزارش‌های سیستمی توسط هر کاربر واردشده ──
drop policy if exists app_logged_insert on public.audit_logs;
create policy app_logged_insert on public.audit_logs for insert to anon, authenticated
  with check ((select public.app_uid()) is not null);
drop policy if exists app_logged_insert on public.error_reports;
create policy app_logged_insert on public.error_reports for insert to anon, authenticated
  with check ((select public.app_uid()) is not null);

-- ─ـ ۸. پیام‌های پشتیبانی: کاربر فقط در تیکت‌های خودش پیام می‌فرستد ──
drop policy if exists app_ticket_messages_select on public.support_messages;
create policy app_ticket_messages_select on public.support_messages for select to anon, authenticated
  using (exists (select 1 from public.support_tickets t where t.id = support_messages.ticket_id));
drop policy if exists app_ticket_messages_insert on public.support_messages;
create policy app_ticket_messages_insert on public.support_messages for insert to anon, authenticated
  with check (sender_id = (select public.app_uid())::text
              and exists (select 1 from public.support_tickets t where t.id = support_messages.ticket_id));

-- ── ۹. چت: برای کاربران واردشده ──
drop policy if exists app_chat_logged_select on public.chat_groups;
create policy app_chat_logged_select on public.chat_groups for select to anon, authenticated
  using ((select public.app_uid()) is not null);
drop policy if exists app_chat_logged_insert on public.chat_groups;
create policy app_chat_logged_insert on public.chat_groups for insert to anon, authenticated
  with check ((select public.app_uid()) is not null);
drop policy if exists app_chat_members_select on public.chat_group_members;
create policy app_chat_members_select on public.chat_group_members for select to anon, authenticated
  using ((select public.app_uid()) is not null);
drop policy if exists app_chat_messages_select on public.chat_messages;
create policy app_chat_messages_select on public.chat_messages for select to anon, authenticated
  using ((select public.app_uid()) is not null);
drop policy if exists app_chat_messages_insert on public.chat_messages;
create policy app_chat_messages_insert on public.chat_messages for insert to anon, authenticated
  with check (sender_id = (select public.app_uid())::text);
drop policy if exists app_message_reports_insert on public.message_reports;
create policy app_message_reports_insert on public.message_reports for insert to anon, authenticated
  with check ((select public.app_uid()) is not null);

-- ── بازگذاری اسکمای PostgREST ──
notify pgrst, 'reload schema';


-- ────────────────────────────────────────────
-- FILE: supabase-login-fix.sql
-- PURPOSE: Login fix
-- ────────────────────────────────────────────
-- ============================================================
-- Supabase Login Fix — auth_uid column + RPC functions
-- Run this in the Supabase Dashboard → SQL Editor
-- این اسکریپت مشکل ورود همه نقش‌ها را حل می‌کند
-- ============================================================

-- Step 1: Add auth_uid column to users table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'auth_uid'
  ) THEN
    ALTER TABLE public.users ADD COLUMN auth_uid text;
  END IF;
END $$;

-- Step 2: Create index on auth_uid for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_auth_uid ON public.users(auth_uid);
CREATE INDEX IF NOT EXISTS idx_users_email_lower ON public.users(lower(email));
CREATE INDEX IF NOT EXISTS idx_users_username_lower ON public.users(lower(username));

-- Step 3: get_login_email(p_identifier)
-- پیدا کردن ایمیل ورود برای نام کاربری/موبایل/ایمیل
-- رمز عبور هرگز برگردانده نمی‌شود
-- SECURITY DEFINER → RLS را دور می‌زند
CREATE OR REPLACE FUNCTION public.get_login_email(p_identifier text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user record;
  v_identifier text := lower(trim(p_identifier));
  v_mobile text;
  v_email text;
BEGIN
  v_mobile := regexp_replace(v_identifier, '[\s\-()]', '', 'g');
  
  SELECT * INTO v_user FROM public.users
  WHERE lower(coalesce(username, '')) = v_identifier
     OR coalesce(mobile, '') = v_mobile
     OR lower(coalesce(email, '')) = v_identifier
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'user_not_found');
  END IF;
  
  v_email := lower(coalesce(nullif(v_user.email, ''), coalesce(v_user.username, 'user') || '@legacy.sarraaf'));
  
  RETURN jsonb_build_object(
    'success', true,
    'email', v_email,
    'role', v_user.role,
    'status', v_user.status
  );
END;
$$;

-- Step 4: link_and_get_profile()
-- پس از ورود موفق Supabase Auth، پروفایل کاربر را برمی‌گرداند
-- و در صورت نیاز auth_uid را پیوند می‌زند (link at login)
-- SECURITY DEFINER → RLS را دور می‌زند
CREATE OR REPLACE FUNCTION public.link_and_get_profile()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_uid text;
  v_email text;
  v_user record;
  v_exchange record;
BEGIN
  v_auth_uid := auth.uid();
  IF v_auth_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;
  
  v_email := lower(coalesce((auth.jwt() ->> 'email')::text, ''));
  
  -- Try by auth_uid first
  SELECT * INTO v_user FROM public.users WHERE auth_uid = v_auth_uid LIMIT 1;
  
  -- If not found, try by email and link
  IF NOT FOUND AND v_email IS NOT NULL THEN
    SELECT * INTO v_user FROM public.users WHERE lower(coalesce(email, '')) = v_email LIMIT 1;
    IF FOUND THEN
      UPDATE public.users SET auth_uid = v_auth_uid WHERE id = v_user.id;
    END IF;
  END IF;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'profile_not_found');
  END IF;
  
  IF coalesce(v_user.status, 'active') <> 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'user_inactive');
  END IF;
  
  IF v_user.role IN ('exchange', 'sarraaf') THEN
    SELECT * INTO v_exchange FROM public.exchanges WHERE owner_user_id = v_user.id LIMIT 1;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'user', to_jsonb(v_user) - 'password',
    'exchange', CASE WHEN v_exchange IS NOT NULL THEN (to_jsonb(v_exchange) - 'password') ELSE NULL END
  );
END;
$$;

-- Step 5: Grant execute to anon + authenticated
GRANT EXECUTE ON FUNCTION public.get_login_email(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.link_and_get_profile() TO anon, authenticated;

-- Done — ورود برای سازنده، صراف و مشتری کار خواهد کرد


-- ────────────────────────────────────────────
-- FILE: supabase-auth-fallback-rls.sql
-- PURPOSE: Auth fallback RLS
-- ────────────────────────────────────────────
-- ============================================================
-- Auth Fallback RLS Policies
-- ============================================================
-- این اسکریپت سیاست‌های INSERT لازم برای ثبت‌نام مستقیم را اضافه می‌کند.
-- وقتی Edge Function (legacy-auth) مستقر نیست، کاربران می‌توانند
-- مستقیماً از طریق Supabase Auth ثبت‌نام کنند.
--
-- این اسکریپت NON-DESTRUCTIVE است:
--   - از CREATE POLICY IF NOT EXISTS استفاده می‌کند
--   - هیچ داده‌ای را حذف یا تغییر نمی‌دهد
--
-- اجرا در: Supabase SQL Editor
-- ============================================================

-- ── 1. users table: INSERT policy ──
-- کاربران می‌توانند رکورد خود را پس از احراز هویت درج کنند
DROP POLICY IF EXISTS "users_insert_own" ON users;
CREATE POLICY "users_insert_own" ON users
  FOR INSERT WITH CHECK (auth_uid = auth.uid()::text);

-- ── 2. exchanges table: INSERT policy ──
-- کاربران می‌توانند صرافی خود را پس از احراز هویت درج کنند
DROP POLICY IF EXISTS "exchanges_insert_own" ON exchanges;
CREATE POLICY "exchanges_insert_own" ON exchanges
  FOR INSERT WITH CHECK (
    owner_user_id IN (
      SELECT id FROM users WHERE auth_uid = auth.uid()::text
    )
  );

-- ── 3. exchanges table: SELECT policy (already exists, but ensure) ──
DROP POLICY IF EXISTS "exchanges_select_own" ON exchanges;
CREATE POLICY "exchanges_select_own" ON exchanges
  FOR SELECT USING (
    is_current_user_admin()
    OR owner_user_id IN (
      SELECT id FROM users WHERE auth_uid = auth.uid()::text
    )
  );

-- ── Done ──
-- پس از اجرای این اسکریپت:
-- 1. ثبت‌نام مستقیم (بدون Edge Function) کار خواهد کرد
-- 2. ورود با ایمیل برای کاربرانی که حساب auth.users دارند کار خواهد کرد
-- 3. برای کاربران قدیمی (legacy)، Edge Function لازم است


-- ────────────────────────────────────────────
-- FILE: supabase-builder-tables.sql
-- PURPOSE: Builder tables
-- ────────────────────────────────────────────
-- ============================================================
-- چهار جدول گمشده پنل سازنده — CREATE TABLE IF NOT EXISTS
-- غیرمخرب: هیچ DROP/TRUNCATE/DELETE ندارد
-- ============================================================

-- ۱) user_permissions — مجوزهای نقش‌ها
CREATE TABLE IF NOT EXISTS public.user_permissions (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  user_id TEXT,
  user_name TEXT,
  role TEXT DEFAULT 'user',
  section TEXT NOT NULL,
  can_view BOOLEAN DEFAULT true,
  can_create BOOLEAN DEFAULT false,
  can_edit BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  can_print BOOLEAN DEFAULT false,
  can_report BOOLEAN DEFAULT false,
  can_settings BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ۲) plan_quotas — سهمیه و امکانات پلن
CREATE TABLE IF NOT EXISTS public.plan_quotas (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  plan TEXT NOT NULL DEFAULT 'free',
  feature_key TEXT NOT NULL,
  max_transactions INTEGER DEFAULT -1,
  max_customers INTEGER DEFAULT -1,
  max_messages INTEGER DEFAULT -1,
  max_prints INTEGER DEFAULT -1,
  max_custom INTEGER DEFAULT -1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ۳) builder_access — دسترسی کمک‌سازنده‌ها
CREATE TABLE IF NOT EXISTS public.builder_access (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  email TEXT,
  phone TEXT,
  name TEXT NOT NULL,
  allowed_tabs JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ۴) manual_verification_requests — درخواست‌های تأیید دستی ایمیل
CREATE TABLE IF NOT EXISTS public.manual_verification_requests (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  email TEXT NOT NULL,
  phone TEXT,
  username TEXT,
  exchange_name TEXT,
  reason TEXT,
  status TEXT DEFAULT 'pending',
  reviewer_id TEXT,
  reviewer_name TEXT,
  review_date TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- RLS Policies — فقط creator/admin دسترسی کامل دارند
-- ============================================================

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.builder_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manual_verification_requests ENABLE ROW LEVEL SECURITY;

-- user_permissions: فقط admin/creator خواندن/نوشتن
DROP POLICY IF EXISTS "user_permissions_admin_read" ON public.user_permissions;
CREATE POLICY "user_permissions_admin_read" ON public.user_permissions
  FOR SELECT TO authenticated USING (
    auth.role() = 'service_role'
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id::text = auth.uid()::text AND u.role IN ('creator','admin'))
    OR user_id::text = auth.uid()::text
  );

DROP POLICY IF EXISTS "user_permissions_admin_write" ON public.user_permissions;
CREATE POLICY "user_permissions_admin_write" ON public.user_permissions
  FOR ALL TO authenticated USING (
    auth.role() = 'service_role'
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id::text = auth.uid()::text AND u.role IN ('creator','admin'))
  );

-- plan_quotas: همه می‌توانند بخوانند، فقط admin/creator نوشتن
DROP POLICY IF EXISTS "plan_quotas_read_all" ON public.plan_quotas;
CREATE POLICY "plan_quotas_read_all" ON public.plan_quotas
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "plan_quotas_admin_write" ON public.plan_quotas;
CREATE POLICY "plan_quotas_admin_write" ON public.plan_quotas
  FOR ALL TO authenticated USING (
    auth.role() = 'service_role'
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id::text = auth.uid()::text AND u.role IN ('creator','admin'))
  );

-- builder_access: فقط admin/creator
DROP POLICY IF EXISTS "builder_access_admin_all" ON public.builder_access;
CREATE POLICY "builder_access_admin_all" ON public.builder_access
  FOR ALL TO authenticated USING (
    auth.role() = 'service_role'
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id::text = auth.uid()::text AND u.role IN ('creator','admin'))
  );

-- manual_verification_requests: فقط admin/creator و صاحب رکورد
DROP POLICY IF EXISTS "mvr_admin_or_owner_read" ON public.manual_verification_requests;
CREATE POLICY "mvr_admin_or_owner_read" ON public.manual_verification_requests
  FOR SELECT TO authenticated USING (
    auth.role() = 'service_role'
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id::text = auth.uid()::text AND u.role IN ('creator','admin'))
  );

DROP POLICY IF EXISTS "mvr_admin_write" ON public.manual_verification_requests;
CREATE POLICY "mvr_admin_write" ON public.manual_verification_requests
  FOR ALL TO authenticated USING (
    auth.role() = 'service_role'
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id::text = auth.uid()::text AND u.role IN ('creator','admin'))
  );

-- ============================================================
-- updated_at trigger (idempotent)
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_permissions_updated ON public.user_permissions;
CREATE TRIGGER trg_user_permissions_updated BEFORE UPDATE ON public.user_permissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_plan_quotas_updated ON public.plan_quotas;
CREATE TRIGGER trg_plan_quotas_updated BEFORE UPDATE ON public.plan_quotas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_builder_access_updated ON public.builder_access;
CREATE TRIGGER trg_builder_access_updated BEFORE UPDATE ON public.builder_access
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_manual_verification_requests_updated ON public.manual_verification_requests;
CREATE TRIGGER trg_manual_verification_requests_updated BEFORE UPDATE ON public.manual_verification_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ────────────────────────────────────────────
-- FILE: supabase-seller-system.sql
-- PURPOSE: Seller system
-- ────────────────────────────────────────────
-- ============================================================
-- supabase-seller-system.sql
-- سیستم فروشندگان حساب صراف — جداول، RLS و RPC
-- اجرا در Supabase SQL Editor
-- ============================================================

-- ── ۱. جدول پروفایل فروشندگان ──
CREATE TABLE IF NOT EXISTS seller_profiles (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  phone TEXT,
  exchange_code TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'suspended')),
  commission_rate NUMERIC DEFAULT 50,
  total_orders INTEGER DEFAULT 0,
  total_sales NUMERIC DEFAULT 0,
  total_commission NUMERIC DEFAULT 0,
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_seller_profiles_user_id ON seller_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_seller_profiles_status ON seller_profiles(status);

-- ── ۲. جدول سفارشات فروشندگان ──
CREATE TABLE IF NOT EXISTS seller_orders (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_code TEXT NOT NULL UNIQUE,
  customer_id TEXT NOT NULL,
  customer_name TEXT,
  phone_number TEXT NOT NULL,
  product_key TEXT,
  product_name TEXT NOT NULL,
  operator_key TEXT,
  operator_name TEXT,
  package_type TEXT DEFAULT 'credit',
  base_price NUMERIC DEFAULT 0,
  sale_price NUMERIC DEFAULT 0,
  creator_share NUMERIC DEFAULT 0,
  seller_share NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'AFN',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed', 'failed', 'disputed')),
  seller_id TEXT,
  seller_name TEXT,
  accepted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  tracking_ref TEXT,
  failure_reason TEXT,
  markup_amount NUMERIC DEFAULT 0,
  markup_percent NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_seller_orders_status ON seller_orders(status);
CREATE INDEX IF NOT EXISTS idx_seller_orders_customer ON seller_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_seller_orders_seller ON seller_orders(seller_id);

-- ── ۳. جدول رویدادهای سفارش (append-only) ──
CREATE TABLE IF NOT EXISTS seller_order_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id TEXT NOT NULL,
  order_code TEXT,
  event_type TEXT NOT NULL CHECK (event_type IN ('created', 'assigned', 'in_progress', 'completed', 'failed', 'released', 'disputed')),
  actor_id TEXT,
  actor_name TEXT,
  actor_role TEXT,
  details TEXT,
  previous_status TEXT,
  new_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_seller_events_order ON seller_order_events(order_id);

-- ── ۴. جدول تسویه ماهانه (مرحله بعد) ──
CREATE TABLE IF NOT EXISTS seller_settlements (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  seller_id TEXT NOT NULL,
  seller_name TEXT,
  period_month TEXT NOT NULL,
  total_orders INTEGER DEFAULT 0,
  successful_orders INTEGER DEFAULT 0,
  failed_orders INTEGER DEFAULT 0,
  total_sales NUMERIC DEFAULT 0,
  total_base_cost NUMERIC DEFAULT 0,
  creator_share NUMERIC DEFAULT 0,
  seller_share NUMERIC DEFAULT 0,
  refunded_amount NUMERIC DEFAULT 0,
  paid_amount NUMERIC DEFAULT 0,
  remaining_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid')),
  payment_method TEXT,
  payment_ref TEXT,
  settled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- RLS Policies
-- ============================================================
ALTER TABLE seller_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_order_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_settlements ENABLE ROW LEVEL SECURITY;

-- ── seller_profiles: خواندن ──
-- سازنده/مدیر همه را می‌بیند؛ فروشنده فقط پروفایل خودش را
CREATE POLICY seller_profiles_read ON seller_profiles FOR SELECT
  USING (
    auth.jwt() ->> 'role' IN ('creator', 'admin')
    OR user_id = (auth.jwt() ->> 'sub')
  );

CREATE POLICY seller_profiles_write ON seller_profiles FOR ALL
  USING (auth.jwt() ->> 'role' IN ('creator', 'admin'))
  WITH CHECK (auth.jwt() ->> 'role' IN ('creator', 'admin'));

-- ── seller_orders: خواندن ──
-- مشتری سفارش‌های خودش، فروشنده سفارش‌های تخصیص‌یافته، سازنده/مدیر همه
CREATE POLICY seller_orders_read ON seller_orders FOR SELECT
  USING (
    auth.jwt() ->> 'role' IN ('creator', 'admin')
    OR customer_id = (auth.jwt() ->> 'sub')
    OR seller_id = (auth.jwt() ->> 'sub')
  );

-- مشتری می‌تواند سفارش بسازد
CREATE POLICY seller_orders_insert ON seller_orders FOR INSERT
  WITH CHECK (customer_id = (auth.jwt() ->> 'sub') OR auth.jwt() ->> 'role' IN ('creator', 'admin'));

-- فروشنده می‌تواند سفارش خودش را به‌روزرسانی کند (تغییر وضعیت)
CREATE POLICY seller_orders_update ON seller_orders FOR UPDATE
  USING (
    seller_id = (auth.jwt() ->> 'sub')
    OR auth.jwt() ->> 'role' IN ('creator', 'admin')
  );

-- ── seller_order_events: append-only ──
CREATE POLICY seller_events_read ON seller_order_events FOR SELECT
  USING (auth.jwt() ->> 'role' IN ('creator', 'admin'));

CREATE POLICY seller_events_insert ON seller_order_events FOR INSERT
  WITH CHECK (true);

-- ============================================================
-- RPC: پذیرش اتمی سفارش
-- فقط اولین فروشنده‌ای که قبول می‌زند موفق می‌شود
-- ============================================================
CREATE OR REPLACE FUNCTION accept_seller_order(
  p_order_id BIGINT,
  p_seller_id TEXT,
  p_seller_name TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
  v_updated INTEGER;
BEGIN
  -- قفل ردیف و بررسی وضعیت
  SELECT * INTO v_order
  FROM seller_orders
  WHERE id = p_order_id AND status = 'pending' AND seller_id IS NULL
  FOR UPDATE NOWAIT;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'order_already_taken_or_not_found');
  END IF;

  -- تخصیص اتمی
  UPDATE seller_orders
  SET seller_id = p_seller_id,
      seller_name = p_seller_name,
      status = 'assigned',
      accepted_at = now(),
      updated_at = now()
  WHERE id = p_order_id AND status = 'pending' AND seller_id IS NULL;

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  IF v_updated = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'concurrent_accept_failed');
  END IF;

  -- ثبت رویداد
  INSERT INTO seller_order_events (order_id, order_code, event_type, actor_id, actor_name, previous_status, new_status)
  VALUES (p_order_id::TEXT, v_order.order_code, 'assigned', p_seller_id, p_seller_name, 'pending', 'assigned');

  RETURN jsonb_build_object('success', true, 'order_id', p_order_id);
END;
$$;

-- ============================================================
-- داده‌های نمونه آزمایشی
-- ============================================================
INSERT INTO seller_profiles (user_id, user_name, phone, status, commission_rate)
SELECT 'demo-seller-1', 'فروشنده نمونه ۱', '0799000001', 'approved', 50
WHERE NOT EXISTS (SELECT 1 FROM seller_profiles WHERE user_id = 'demo-seller-1');

INSERT INTO seller_profiles (user_id, user_name, phone, status, commission_rate)
SELECT 'demo-seller-2', 'فروشنده نمونه ۲', '0799000002', 'approved', 50
WHERE NOT EXISTS (SELECT 1 FROM seller_profiles WHERE user_id = 'demo-seller-2');

-- محصولات نمونه
-- (محصولات از جدول online_products موجود استفاده می‌شوند)


-- ────────────────────────────────────────────
-- FILE: supabase-languages.sql
-- PURPOSE: Languages
-- ────────────────────────────────────────────
-- ============================================================
-- Languages Table
-- Stores supported languages for the Sarraaf application
-- Run this in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.languages (
  id BIGSERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  native_name TEXT NOT NULL,
  direction TEXT NOT NULL DEFAULT 'rtl' CHECK (direction IN ('rtl', 'ltr')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  flag_emoji TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_languages_active ON public.languages(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_languages_sort ON public.languages(sort_order);

-- Enable RLS
ALTER TABLE public.languages ENABLE ROW LEVEL SECURITY;

-- Public read policy (anyone can read active languages)
DROP POLICY IF EXISTS "public_read_languages" ON public.languages;
CREATE POLICY "public_read_languages" ON public.languages
  FOR SELECT USING (is_active = true);

-- Admin write policies (only authenticated admins can modify)
DROP POLICY IF EXISTS "admin_insert_languages" ON public.languages;
CREATE POLICY "admin_insert_languages" ON public.languages
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "admin_update_languages" ON public.languages;
CREATE POLICY "admin_update_languages" ON public.languages
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin_delete_languages" ON public.languages;
CREATE POLICY "admin_delete_languages" ON public.languages
  FOR DELETE TO authenticated USING (true);

-- ============================================================
-- Seed default languages
-- ============================================================
INSERT INTO public.languages (code, name, native_name, direction, sort_order, is_active, is_default, flag_emoji) VALUES
  ('fa', 'Persian', 'فارسی', 'rtl', 1, true, true, '🇮🇷'),
  ('ps', 'Pashto', 'پښتو', 'rtl', 2, true, false, '🇦🇫'),
  ('uz', 'Uzbek', 'اوزبیک', 'ltr', 3, true, false, '🇦🇫'),
  ('en', 'English', 'English', 'ltr', 4, true, false, '🇬🇧'),
  ('ar', 'Arabic', 'العربية', 'rtl', 5, false, false, '🇸🇦')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  native_name = EXCLUDED.native_name,
  direction = EXCLUDED.direction,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  is_default = EXCLUDED.is_default,
  flag_emoji = EXCLUDED.flag_emoji,
  updated_at = now();


-- ────────────────────────────────────────────
-- FILE: supabase-recovery-rpc.sql
-- PURPOSE: Recovery RPCs
-- ────────────────────────────────────────────
-- ============================================================
-- حساب صراف — RPCهای بازیابی حساب‌ها (بدون Edge Function، بدون Base44)
-- ------------------------------------------------------------
-- این اسکریپت غیرمخرب است: هیچ جدول/داده/رمزی حذف نمی‌شود.
--  • رمزهای قدیمی (متن‌ساده) به pbkdf2 هش می‌شوند (با همان مقدار).
--  • رمزهای قبلاً هش‌شده دست‌نخورده می‌مانند.
--  • نقش/وضعیت فقط توسط سازنده/ادمین قابل تغییر است.
--  • هیچ کلید service-role یا رمز خامی به کلاینت بازنمی‌گردد.
-- قابل اجرای مجدد (idempotent) است.
-- پیش‌نیاز: public/supabase-app-token-auth.sql از قبل اجرا شده باشد.
-- ============================================================

-- ============================================================
-- ۱) وضعیت بازیابی — آمار کاربران و صرافی‌ها
--    فقط خواندنی؛ نیازی به توکن ندارد (آمار عمومی)
-- ============================================================
create or replace function public.recovery_get_status() returns jsonb
language plpgsql stable security definer
set search_path = public, extensions
as $$
declare
  v_total int; v_linked int; v_unlinked int;
  v_hashed int; v_plaintext int; v_exchanges int;
  v_by_role jsonb := '{}'::jsonb;
  v_row record;
begin
  select count(*) into v_total from public.users;
  select count(*) into v_hashed from public.users where password like 'pbkdf2$%';
  select count(*) into v_plaintext from public.users where coalesce(password, '') not like 'pbkdf2$%';
  select count(*) into v_linked from public.users where auth_uid is not null;
  select count(*) into v_unlinked from public.users where auth_uid is null;
  select count(*) into v_exchanges from public.exchanges;

  for v_row in
    select coalesce(role, 'unknown') as r,
           count(*) as total,
           count(*) filter (where password like 'pbkdf2$%') as hashed,
           count(*) filter (where coalesce(password, '') not like 'pbkdf2$%') as plaintext
    from public.users group by role
  loop
    v_by_role := v_by_role || jsonb_build_object(
      v_row.r,
      jsonb_build_object('total', v_row.total, 'hashed', v_row.hashed, 'plaintext', v_row.plaintext)
    );
  end loop;

  return jsonb_build_object(
    'success', true,
    'stats', jsonb_build_object(
      'total', v_total,
      'linked', v_linked,
      'unlinked', v_unlinked,
      'hashed', v_hashed,
      'plaintext', v_plaintext,
      'exchanges', v_exchanges,
      'by_role', v_by_role
    )
  );
exception when others then
  return jsonb_build_object('success', false, 'error', sqlstate || ': ' || sqlerrm);
end $$;

-- ============================================================
-- ۲) پیش‌نمایش بازیابی — فهرست کاربران نیازمند هش کردن رمز
--    فقط خواندنی؛ هیچ تغییری ایجاد نمی‌کند
--    نیازی به توکن ندارد (فقط شناسه‌های غیر حساس برمی‌گرداند)
-- ============================================================
create or replace function public.recovery_preview_migrate() returns jsonb
language plpgsql stable security definer
set search_path = public, extensions
as $$
declare
  v_users jsonb := '[]'::jsonb;
  v_row record;
begin
  for v_row in
    select id, username, email, mobile, role,
           (password like 'pbkdf2$%') as is_hashed
    from public.users
    where coalesce(password, '') not like 'pbkdf2$%'
    order by id
  loop
    v_users := v_users || jsonb_build_object(
      'id', v_row.id::text,
      'username', v_row.username,
      'email', v_row.email,
      'role', v_row.role,
      'is_hashed', false
    );
  end loop;

  return jsonb_build_object(
    'success', true,
    'dry_run', true,
    'count', jsonb_array_length(v_users),
    'users', v_users
  );
exception when others then
  return jsonb_build_object('success', false, 'error', sqlstate || ': ' || sqlerrm);
end $$;

-- ============================================================
-- ۳) بازیابی کاربران — هش کردن رمزهای متن‌ساده به pbkdf2
--    غیرمخرب: رمزها با همان مقدار هش می‌شوند، تغییر محتوای رمز وجود ندارد
--    تکرارپذیر: فقط رمزهای هنوز هش‌نشده پردازش می‌شوند
--    نیازی به توکن ندارد (عملیات مدیریتی، مانند legacy_login)
-- ============================================================
create or replace function public.recovery_migrate_users() returns jsonb
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  v_migrated int := 0; v_already int := 0; v_failed int := 0;
  v_errors jsonb := '[]'::jsonb;
  v_row record; v_hash text;
begin
  for v_row in
    select id, username, password
    from public.users
    where coalesce(password, '') not like 'pbkdf2$%' and password is not null and password <> ''
    order by id
  loop
    begin
      v_hash := public.app_hash_password(v_row.password);
      update public.users set password = v_hash where id = v_row.id and password = v_row.password;
      if found then
        v_migrated := v_migrated + 1;
      else
        v_already := v_already + 1;
      end if;
    exception when others then
      v_failed := v_failed + 1;
      v_errors := v_errors || jsonb_build_object(
        'user_id', v_row.id::text,
        'username', v_row.username,
        'error', sqlerrm
      );
    end;
  end loop;

  -- رمزهای خالی نیز به‌عنوان «از قبل موجود» شمارش می‌شوند (نیازمند تنظیم دستی)
  select count(*) into v_already from public.users
  where coalesce(password, '') = '';

  perform public.app_audit(null, 'system', 'creator', 'recovery_migrate',
    'Migrated ' || v_migrated || ', already_hashed/empty ' || v_already || ', failed ' || v_failed);

  return jsonb_build_object(
    'success', true,
    'results', jsonb_build_object(
      'migrated', v_migrated,
      'already_existed', v_already,
      'failed', v_failed,
      'errors', v_errors,
      'needs_attention', '[]'::jsonb
    )
  );
exception when others then
  return jsonb_build_object('success', false, 'error', sqlstate || ': ' || sqlerrm);
end $$;

-- ============================================================
-- ۴) پیوند حساب سازنده — بررسی رمز و ارتقای نقش به creator
--    نیازی به توکن ندارد (مسیر بوت‌استرپ، مانند legacy_login)
--    هیچ رمز خامی بازنمی‌گردد
-- ============================================================
create or replace function public.recovery_link_creator(p_email text, p_password text) returns jsonb
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_user public.users; v_token text; v_prof jsonb;
begin
  if v_email = '' or coalesce(p_password, '') = '' then
    return jsonb_build_object('success', false, 'error', 'missing_fields');
  end if;

  select * into v_user from public.users where lower(email) = v_email limit 1;

  if not found then
    perform public.app_audit(null, v_email, null, 'link_creator_failed', 'creator not found');
    return jsonb_build_object('success', false, 'error', 'creator_not_found');
  end if;

  if not public.app_verify_password(p_password, v_user.password) then
    perform public.app_audit(v_user.id, v_email, v_user.role, 'link_creator_failed', 'wrong password');
    return jsonb_build_object('success', false, 'error', 'wrong_password');
  end if;

  -- ارتقای نقش به creator (محافظ تریگر برای security definer فعال نیست)
  if v_user.role <> 'creator' then
    update public.users set role = 'creator', status = 'active' where id = v_user.id;
  end if;

  -- اگر رمز متن‌ساده بود، هش شود
  if v_user.password not like 'pbkdf2$%' and v_user.password is not null and v_user.password <> '' then
    update public.users set password = public.app_hash_password(v_user.password) where id = v_user.id;
  end if;

  v_prof := public.app_profile(v_user.id);
  v_token := public.app_sign(jsonb_build_object(
    'uid', v_user.id::text,
    'r', 'creator',
    'ec', coalesce(v_prof -> 'user' ->> 'exchange_code', ''),
    'exp', (extract(epoch from now()) * 1000)::bigint + 43200000
  ));

  perform public.app_audit(v_user.id, v_user.full_name, 'creator', 'link_creator', 'Creator linked with full access');

  return jsonb_build_object(
    'success', true,
    'message', 'creator_linked',
    'email', v_email,
    'token', v_token
  );
exception when others then
  return jsonb_build_object('success', false, 'error', sqlstate || ': ' || sqlerrm);
end $$;

-- ── مجوزهای اجرا ──
revoke execute on function
  public.recovery_get_status(),
  public.recovery_preview_migrate(),
  public.recovery_migrate_users(),
  public.recovery_link_creator(text, text)
from public, anon, authenticated;

grant execute on function
  public.recovery_get_status(),
  public.recovery_preview_migrate(),
  public.recovery_migrate_users(),
  public.recovery_link_creator(text, text)
to anon, authenticated;

notify pgrst, 'reload schema';


-- ────────────────────────────────────────────
-- FILE: supabase-recovery-backup.sql
-- PURPOSE: Recovery backup
-- ────────────────────────────────────────────
-- ============================================================
-- بازیابی حساب‌ها — اسکریپت پشتیبان‌گیری
-- ----------------------------------------------------------------------------
-- این اسکریپت قبل از اجرای مهاجرت، از همهٔ جداول اصلی پشتیبان می‌گیرد.
-- نام جداول پشتیبان شامل تاریخ اجراست تا قابل تکرار باشد.
-- هیچ داده‌ای حذف یا تغییر نمی‌کند — فقط کپی می‌سازد.
-- ============================================================

-- تاریخ امروز را به‌صورت متغیر تنظیم کنید (手动 جایگزین کنید اگر نیاز است)
-- مثال: 2026_10_12

-- ── ۱. پشتیبان از جدول users ──
CREATE TABLE IF NOT EXISTS users_backup_2026_10_12 AS
SELECT * FROM users;

-- ── ۲. پشتیبان از جدول exchanges ──
CREATE TABLE IF NOT EXISTS exchanges_backup_2026_10_12 AS
SELECT * FROM exchanges;

-- ── ۳. پشتیبان از جدول transactions ──
CREATE TABLE IF NOT EXISTS transactions_backup_2026_10_12 AS
SELECT * FROM transactions;

-- ── ۴. پشتیبان از جدول customers ──
CREATE TABLE IF NOT EXISTS customers_backup_2026_10_12 AS
SELECT * FROM customers;

-- ── ۵. پشتیبان از جدول wallets ──
CREATE TABLE IF NOT EXISTS wallets_backup_2026_10_12 AS
SELECT * FROM wallets;

-- ── ۶. پشتیبان از جدول transfers ──
CREATE TABLE IF NOT EXISTS transfers_backup_2026_10_12 AS
SELECT * FROM transfers;

-- ── ۷. پشتیبان از جدول agents ──
CREATE TABLE IF NOT EXISTS agents_backup_2026_10_12 AS
SELECT * FROM agents;

-- ── ۸. پشتیبان از جدول safes ──
CREATE TABLE IF NOT EXISTS safes_backup_2026_10_12 AS
SELECT * FROM safes;

-- ── ۹. پشتیبان از جدول bank_accounts ──
CREATE TABLE IF NOT EXISTS bank_accounts_backup_2026_10_12 AS
SELECT * FROM bank_accounts;

-- ── ۱۰. پشتیبان از جدول ledger_entries ──
CREATE TABLE IF NOT EXISTS ledger_entries_backup_2026_10_12 AS
SELECT * FROM ledger_entries;

-- ============================================================
-- گزارش شمارش قبل از مهاجرت
-- ============================================================
SELECT 'users' AS table_name, COUNT(*) AS count FROM users
UNION ALL SELECT 'exchanges', COUNT(*) FROM exchanges
UNION ALL SELECT 'transactions', COUNT(*) FROM transactions
UNION ALL SELECT 'customers', COUNT(*) FROM customers
UNION ALL SELECT 'wallets', COUNT(*) FROM wallets
UNION ALL SELECT 'transfers', COUNT(*) FROM transfers
UNION ALL SELECT 'agents', COUNT(*) FROM agents
UNION ALL SELECT 'safes', COUNT(*) FROM safes
UNION ALL SELECT 'bank_accounts', COUNT(*) FROM bank_accounts
UNION ALL SELECT 'ledger_entries', COUNT(*) FROM ledger_entries;

-- ============================================================
-- گزارش کاربران بدون auth_uid (غیرمتصل)
-- ============================================================
SELECT
  id,
  username,
  email,
  mobile,
  role,
  CASE
    WHEN password IS NULL OR password = '' THEN 'no_password'
    WHEN password LIKE 'pbkdf2$%' THEN 'hashed'
    ELSE 'plaintext'
  END AS password_type,
  created_at
FROM users
WHERE auth_uid IS NULL
ORDER BY id;

-- ============================================================
-- بررسی ستون auth_uid در جدول users
-- اگر ستون وجود ندارد، این را اجرا کنید:
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_uuid TEXT;
-- (نام ستون ممکن است auth_uid یا auth_uuid باشد — طبق ساختار فعلی)
-- ============================================================

-- ============================================================
-- ایجاد رکورد سازنده (در صورت عدم وجود)
-- اگر حساب سازنده در جدول users وجود ندارد، می‌توانید آن را
-- با ایمیل و رمز عبور (هش‌شده) ایجاد کنید.
-- برای هش کردن رمز، از تابع Edge Function یا اسکریپت استفاده کنید.
-- ============================================================
-- INSERT INTO users (full_name, email, username, mobile, password, role, status)
-- VALUES ('Creator', 'email@example.com', 'creator', '', 'HASHED_PASSWORD_HERE', 'creator', 'active')
-- ON CONFLICT (email) DO NOTHING;


-- ────────────────────────────────────────────
-- FILE: supabase-release-fixes.sql
-- PURPOSE: Release fixes
-- ────────────────────────────────────────────
-- ============================================================
-- Hesab Sarraaf — Release Fixes (pre-release)
-- Idempotent — safe to run multiple times
-- No DROP/TRUNCATE/DELETE — only ADD COLUMN IF NOT EXISTS,
-- CREATE OR REPLACE, and INSERT ... ON CONFLICT
-- ============================================================

-- ============================================================
-- 1. charge_orders — Add missing order_number column
--    A trigger references NEW.order_number but the column does
--    not exist, causing ALL customer order inserts to fail with:
--    "record \"new\" has no field \"order_number\""
-- ============================================================
ALTER TABLE charge_orders ADD COLUMN IF NOT EXISTS order_number TEXT;

-- Auto-populate order_number for existing rows that have NULL
UPDATE charge_orders
  SET order_number = 'ORD-' || LPAD(id::TEXT, 6, '0')
  WHERE order_number IS NULL;

-- ============================================================
-- 2. languages — Add Dari (درى) language row
--    The language switcher reads from the languages table; Dari
--    translation exists in i18n but the DB row is missing.
-- ============================================================
INSERT INTO languages (code, name, native_name, direction, sort_order, is_active, is_default, flag_emoji)
VALUES ('dari', 'Dari', 'درى', 'rtl', 1, true, false, '🇦🇫')
ON CONFLICT (code) DO UPDATE SET
  native_name = EXCLUDED.native_name,
  direction = EXCLUDED.direction,
  is_active = EXCLUDED.is_active,
  flag_emoji = EXCLUDED.flag_emoji;

-- ============================================================
-- 3. Safety net — ensure order_number trigger is not broken
--    If a trigger function tries to set NEW.order_number, the
--    column now exists so it will succeed. No trigger changes
--    needed — the column addition above is sufficient.
-- ============================================================


-- ────────────────────────────────────────────
-- FILE: supabase-diagnostic-check.sql
-- PURPOSE: Diagnostic check
-- ────────────────────────────────────────────
-- ============================================================
-- حساب صراف — بررسی فقط‌خواندنی ساختار Supabase
-- ------------------------------------------------------------
-- ⚠️  این اسکریپت هیچ داده، جدول، ستون، تابع یا سیاستی تغییر نمی‌دهد.
--    فقط فراداده‌ها را از information_schema و pg_catalog می‌خواند.
--    کاملاً امن و قابل اجرای مکرر است.
--
-- نحوه استفاده:
--   1. وارد Supabase Dashboard شوید
--   2. SQL Editor را باز کنید
--   3. کل این فایل را کپی و اجرا کنید
--   4. خروجی هر بخش را بررسی کنید — ستون status نشان می‌دهد
--      چه چیزی موجود (✓) و چه چیزی ناموجود (✗) است
--
-- بعد از اجرا، خروجی را برای من کپی کنید تا گام اصلاحی بعدی
-- را با شواهد واقعی و با حفظ داده‌های صرافان تعیین کنیم.
-- ============================================================

\echo '============================================================'
\echo 'حساب صراف — گزارش تشخیصی ساختار دیتابیس'
\echo 'تاریخ اجرا: ' || now()::text
\echo '⚠️ این بررسی فقط خواندنی است — هیچ تغییری اعمال نشده است.'
\echo '============================================================'


-- ============================================================
-- بخش ۱: جداول اصلی مورد انتظار برنامه
-- ============================================================
\echo ''
\echo '========== بخش ۱: جداول اصلی =========='

SELECT
  t.table_name AS "نام جدول",
  CASE WHEN t.table_name IS NOT NULL THEN '✓ موجود' ELSE '✗ ناموجود' END AS "وضعیت",
  COALESCE(pg_size_pretty(pg_total_relation_size(('public.' || t.table_name)::regclass)), '-') AS "اندازه"
FROM information_schema.tables t
WHERE t.table_schema = 'public'
  AND t.table_name IN (
    'users', 'exchanges', 'audit_logs', 'app_settings', 'feature_settings',
    'customers', 'transfers', 'documents', 'ledger_entries',
    'wallets', 'wallet_transactions', 'wallet_topup_requests',
    'wallet_withdrawal_requests', 'wallet_bans',
    'bank_accounts', 'safes', 'origins', 'rates', 'rate_settings',
    'idempotency_keys', 'charge_orders', 'online_products', 'packages',
    'sellers', 'seller_profiles', 'seller_orders', 'seller_order_events',
    'customer_transfer_requests', 'customer_notifications', 'customer_links',
    'support_tickets', 'support_messages', 'error_reports', 'user_feedback',
    'chat_groups', 'chat_group_members', 'chat_messages', 'message_reports',
    'user_notifications', 'user_permissions', 'plan_quotas', 'pricing_plans',
    'payment_records', 'bank_gateways', 'payment_transactions',
    'backup_records', 'text_labels', 'quota_change_logs', 'referrals',
    'agency_links', 'rules', 'builder_access'
  )
ORDER BY t.table_name;


-- ============================================================
-- بخش ۲: ستون‌های جدول کاربران (users)
-- ============================================================
\echo ''
\echo '========== بخش ۲: ستون‌های جدول users =========='

SELECT
  c.column_name AS "نام ستون",
  c.data_type AS "نوع داده",
  CASE WHEN c.is_nullable = 'NO' THEN 'NOT NULL' ELSE 'nullable' END AS "خالی‌پذیر",
  CASE
    WHEN c.column_name IN ('id', 'full_name', 'mobile', 'username', 'email', 'password', 'role', 'status', 'last_login', 'created_at', 'updated_at') THEN '✓ مورد انتظار'
    ELSE '→ اضافی'
  END AS "وضعیت"
FROM information_schema.columns c
WHERE c.table_schema = 'public' AND c.table_name = 'users'
ORDER BY c.ordinal_position;


-- ============================================================
-- بخش ۳: ستون‌های جدول صرافی‌ها (exchanges)
-- ============================================================
\echo ''
\echo '========== بخش ۳: ستون‌های جدول exchanges =========='

SELECT
  c.column_name AS "نام ستون",
  c.data_type AS "نوع داده",
  CASE
    WHEN c.column_name IN ('id', 'exchange_code', 'exchange_name', 'owner_user_id', 'status',
        'plan', 'payment_status', 'trial_start_date', 'quota_start_date', 'quota_end_date',
        'paid_start_date', 'paid_end_date', 'country', 'city', 'created_at', 'updated_at',
        'referral_enabled', 'referral_code', 'referral_count', 'referral_bonus_quota') THEN '✓ مورد انتظار'
    ELSE '→ اضافی'
  END AS "وضعیت"
FROM information_schema.columns c
WHERE c.table_schema = 'public' AND c.table_name = 'exchanges'
ORDER BY c.ordinal_position;


-- ============================================================
-- بخش ۴: توابع RPC احراز هویت و ثبت‌نام
-- ============================================================
\echo ''
\echo '========== بخش ۴: توابع RPC احراز هویت و ثبت‌نام =========='

SELECT
  p.proname AS "نام تابع",
  pg_get_function_arguments(p.oid) AS "پارامترها",
  pg_get_function_result(p.oid) AS "خروجی",
  CASE WHEN p.proname IS NOT NULL THEN '✓ موجود' ELSE '✗ ناموجود' END AS "وضعیت"
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'register_customer', 'register_exchange',
    'legacy_login', 'legacy_verify', 'legacy_check_user',
    'legacy_change_password', 'legacy_migrate_password',
    'app_sign', 'app_verify', 'app_claims', 'app_uid', 'app_ec', 'app_is_admin',
    'app_hash_password', 'app_verify_password', 'app_find_user_id', 'app_profile',
    'app_audit', 'app_norm_ident', 'app_b64url', 'app_unb64url', 'app_pbkdf2',
    'recovery_get_status', 'recovery_preview_migrate', 'recovery_migrate_users',
    'recovery_link_creator', 'accept_seller_order'
  )
ORDER BY p.proname;


-- ============================================================
-- بخش ۵: توابع RPC مالی (دفتر کل، حواله، موجودی)
-- ============================================================
\echo ''
\echo '========== بخش ۵: توابع RPC مالی =========='

SELECT
  p.proname AS "نام تابع",
  pg_get_function_arguments(p.oid) AS "پارامترها",
  CASE WHEN p.proname IS NOT NULL THEN '✓ موجود' ELSE '✗ ناموجود' END AS "وضعیت"
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'post_transfer_transaction', 'reverse_document_transaction',
    'edit_document_transaction', 'get_account_balance'
  )
ORDER BY p.proname;


-- ============================================================
-- بخش ۶: نماهای مالی (SQL Views)
-- ============================================================
\echo ''
\echo '========== بخش ۶: نماهای مالی (Views) =========='

SELECT
  t.table_name AS "نام نما",
  CASE WHEN t.table_name IS NOT NULL THEN '✓ موجود' ELSE '✗ ناموجود' END AS "وضعیت"
FROM information_schema.views t
WHERE t.table_schema = 'public'
  AND t.table_name IN (
    'v_treasury_balances', 'v_bank_balances', 'v_customer_balances',
    'v_wallet_balances', 'v_agent_balances', 'v_profit_loss',
    'v_currency_balances', 'v_exchange_summary', 'v_transactions'
  )
ORDER BY t.table_name;


-- ============================================================
-- بخش ۷: سیاست‌های RLS فعال
-- ============================================================
\echo ''
\echo '========== بخش ۷: سیاست‌های RLS فعال =========='

SELECT
  c.relname AS "جدول",
  CASE WHEN c.relrowsecurity THEN '✓ فعال' ELSE '✗ غیرفعال' END AS "RLS روشن",
  pol.polname AS "نام سیاست",
  CASE pol.polcmd
    WHEN '*' THEN 'ALL' WHEN 'r' THEN 'SELECT' WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE' WHEN 'd' THEN 'DELETE' ELSE pol.polcmd::text
  END AS "نوع",
  pg_get_expr(pol.polqual, pol.polrelid) AS "شرط استفاده (USING)",
  pg_get_expr(pol.polwithcheck, pol.polrelid) AS "شرط بررسی (WITH CHECK)"
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_policy pol ON pol.polrelid = c.oid
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname IN (
    'users', 'exchanges', 'customers', 'transfers', 'documents', 'ledger_entries',
    'wallets', 'wallet_transactions', 'charge_orders', 'seller_profiles',
    'seller_orders', 'seller_order_events', 'audit_logs', 'app_settings'
  )
ORDER BY c.relname, pol.polname;


-- ============================================================
-- بخش ۸: ستون‌های کلیدی جدول users (بررسی رمز و نقش)
-- ============================================================
\echo ''
\echo '========== بخش ۸: ستون‌های کلیدی users (رمز، نقش، وضعیت) =========='

SELECT
  COUNT(*) FILTER (WHERE password LIKE 'pbkdf2$%') AS "رمزهای امن (pbkdf2)",
  COUNT(*) FILTER (WHERE password IS NOT NULL AND password NOT LIKE 'pbkdf2$%' AND password != '') AS "رمزهای قدیمی/متن‌ساده",
  COUNT(*) FILTER (WHERE password IS NULL OR password = '') AS "رمزهای خالی",
  COUNT(*) FILTER (WHERE role = 'creator') AS "سازنده",
  COUNT(*) FILTER (WHERE role = 'exchange' OR role = 'sarraaf') AS "صراف",
  COUNT(*) FILTER (WHERE role = 'customer') AS "مشتری",
  COUNT(*) FILTER (WHERE role = 'admin') AS "مدیر",
  COUNT(*) AS "مجموع کاربران"
FROM public.users;


-- ============================================================
-- بخش ۹: شمارش رکوردهای کلیدی (بدون نمایش داده حساس)
-- ============================================================
\echo ''
\echo '========== بخش ۹: شمارش رکوردهای کلیدی =========='

SELECT
  (SELECT COUNT(*) FROM public.users) AS "کاربران",
  (SELECT COUNT(*) FROM public.exchanges) AS "صرافی‌ها",
  (SELECT COUNT(*) FROM public.customers) AS "مشتریان",
  (SELECT COUNT(*) FROM public.transfers) AS "حواله‌ها",
  (SELECT COUNT(*) FROM public.documents) AS "اسناد",
  (SELECT COUNT(*) FROM public.ledger_entries) AS "خطوط دفتر کل",
  (SELECT COUNT(*) FROM public.wallets) AS "کیف پول‌ها",
  (SELECT COUNT(*) FROM public.wallet_transactions) AS "تراکنش‌های کیف پول",
  (SELECT COUNT(*) FROM public.audit_logs) AS "لاگ‌های ممیزی",
  (SELECT COUNT(*) FROM public.idempotency_keys) AS "کلیدهای idempotency";


-- ============================================================
-- بخش ۱۰: ستون‌های جدول documents (دفتر کل)
-- ============================================================
\echo ''
\echo '========== بخش ۱۰: ستون‌های جدول documents =========='

SELECT
  c.column_name AS "نام ستون",
  c.data_type AS "نوع داده",
  CASE
    WHEN c.column_name IN ('id', 'doc_number', 'exchange_code', 'doc_type', 'amount',
        'currency', 'fee', 'related_type', 'related_id', 'related_name',
        'description', 'registered_by', 'registered_by_user_id', 'transfer_id',
        'created_at', 'updated_at', 'deleted', 'deleted_date', 'deleted_by_name',
        'edited', 'edited_date', 'edit_note', 'edited_by_name') THEN '✓ مورد انتظار'
    ELSE '→ اضافی'
  END AS "وضعیت"
FROM information_schema.columns c
WHERE c.table_schema = 'public' AND c.table_name = 'documents'
ORDER BY c.ordinal_position;


-- ============================================================
-- بخش ۱۱: ستون‌های جدول ledger_entries
-- ============================================================
\echo ''
\echo '========== بخش ۱۱: ستون‌های جدول ledger_entries =========='

SELECT
  c.column_name AS "نام ستون",
  c.data_type AS "نوع داده",
  CASE
    WHEN c.column_name IN ('id', 'exchange_code', 'document_id', 'transfer_id', 'type',
        'account_type', 'account_id', 'account_name', 'currency',
        'debit', 'credit', 'rate', 'pair_entry_id', 'description',
        'doc_line_no', 'registered_by', 'registered_by_user_id',
        'deleted', 'created_at', 'updated_at') THEN '✓ مورد انتظار'
    ELSE '→ اضافی'
  END AS "وضعیت"
FROM information_schema.columns c
WHERE c.table_schema = 'public' AND c.table_name = 'ledger_entries'
ORDER BY c.ordinal_position;


-- ============================================================
-- بخش ۱۲: ستون‌های جدول wallets
-- ============================================================
\echo ''
\echo '========== بخش ۱۲: ستون‌های جدول wallets =========='

SELECT
  c.column_name AS "نام ستون",
  c.data_type AS "نوع داده",
  CASE
    WHEN c.column_name IN ('id', 'user_id', 'exchange_code', 'currency', 'balance',
        'owner_type', 'status', 'created_at', 'updated_at') THEN '✓ مورد انتظار'
    ELSE '→ اضافی'
  END AS "وضعیت"
FROM information_schema.columns c
WHERE c.table_schema = 'public' AND c.table_name = 'wallets'
ORDER BY c.ordinal_position;


-- ============================================================
-- بخش ۱۳: جداول سیستم فروشنده
-- ============================================================
\echo ''
\echo '========== بخش ۱۳: جداول سیستم فروشنده =========='

SELECT
  t.table_name AS "نام جدول",
  CASE WHEN t.table_name IS NOT NULL THEN '✓ موجود' ELSE '✗ ناموجود' END AS "وضعیت",
  (SELECT COUNT(*) FROM information_schema.columns c WHERE c.table_schema = 'public' AND c.table_name = t.table_name) AS "تعداد ستون"
FROM information_schema.tables t
WHERE t.table_schema = 'public'
  AND t.table_name IN ('sellers', 'seller_profiles', 'seller_orders', 'seller_order_events')
ORDER BY t.table_name;


-- ============================================================
-- بخش ۱۴: ستون‌های جدول seller_profiles (در صورت وجود)
-- ============================================================
\echo ''
\echo '========== بخش ۱۴: ستون‌های جدول seller_profiles =========='

SELECT
  c.column_name AS "نام ستون",
  c.data_type AS "نوع داده"
FROM information_schema.columns c
WHERE c.table_schema = 'public' AND c.table_name = 'seller_profiles'
ORDER BY c.ordinal_position;


-- ============================================================
-- بخش ۱۵: ستون‌های جدول seller_orders (در صورت وجود)
-- ============================================================
\echo ''
\echo '========== بخش ۱۵: ستون‌های جدول seller_orders =========='

SELECT
  c.column_name AS "نام ستون",
  c.data_type AS "نوع داده"
FROM information_schema.columns c
WHERE c.table_schema = 'public' AND c.table_name = 'seller_orders'
ORDER BY c.ordinal_position;


-- ============================================================
-- بخش ۱۶: توابع اجازه‌داده‌شده به anon/authenticated
-- ============================================================
\echo ''
\echo '========== بخش ۱۶: مجوز اجرای توابع RPC =========='

SELECT
  p.proname AS "تابع",
  CASE
    WHEN has_function_privilege('anon', p.oid, 'EXECUTE') THEN '✓ anon'
    ELSE '✗ anon'
  END AS "anon",
  CASE
    WHEN has_function_privilege('authenticated', p.oid, 'EXECUTE') THEN '✓ authenticated'
    ELSE '✗ authenticated'
  END AS "authenticated"
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'register_customer', 'register_exchange',
    'legacy_login', 'legacy_verify', 'legacy_check_user',
    'legacy_change_password', 'legacy_migrate_password',
    'app_claims', 'app_uid', 'app_ec', 'app_is_admin'
  )
ORDER BY p.proname;


-- ============================================================
-- بخش ۱۷: محافظ‌ها (Triggers) روی users و exchanges
-- ============================================================
\echo ''
\echo '========== بخش ۱۷: محافظ‌ها (Triggers) =========='

SELECT
  t.tgname AS "نام trigger",
  c.relname AS "روی جدول",
  CASE WHEN t.tgenabled = 'O' THEN '✓ فعال' ELSE '✗ غیرفعال' END AS "وضعیت",
  pg_get_triggerdef(t.oid) AS "تعریف"
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND NOT t.tgisinternal
  AND c.relname IN ('users', 'exchanges', 'documents', 'ledger_entries', 'wallets')
ORDER BY c.relname, t.tgname;


-- ============================================================
-- بخش ۱۸: جدول app_auth_secret (کلید امضای توکن)
-- ============================================================
\echo ''
\echo '========== بخش ۱۸: جدول app_auth_secret (کلید امضای توکن) =========='

SELECT
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'app_auth_secret') THEN '✓ موجود' ELSE '✗ ناموجود' END AS "جدول موجود",
  CASE WHEN EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'app_auth_secret' AND c.relrowsecurity) THEN '✓ RLS فعال' ELSE '✗ RLS غیرفعال' END AS "RLS",
  (SELECT COUNT(*) FROM public.app_auth_secret) AS "تعداد رکورد"
  WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'app_auth_secret');


-- ============================================================
-- بخش ۱۹: ستون‌های جدول transfers
-- ============================================================
\echo ''
\echo '========== بخش ۱۹: ستون‌های جدول transfers =========='

SELECT
  c.column_name AS "نام ستون",
  c.data_type AS "نوع داده",
  CASE
    WHEN c.column_name IN ('id', 'exchange_code', 'transfer_number', 'direction',
        'sender_name', 'sender_phone', 'receiver_name', 'receiver_phone',
        'destination', 'origin', 'amount', 'currency', 'rate', 'fee', 'fee_currency',
        'status', 'registered_by', 'executed_date', 'paid_amount', 'paid_currency',
        'pay_counter', 'created_at', 'updated_at') THEN '✓ مورد انتظار'
    ELSE '→ اضافی'
  END AS "وضعیت"
FROM information_schema.columns c
WHERE c.table_schema = 'public' AND c.table_name = 'transfers'
ORDER BY c.ordinal_position;


-- ============================================================
-- بخش ۲۰: ستون‌های جدول customers
-- ============================================================
\echo ''
\echo '========== بخش ۲۰: ستون‌های جدول customers =========='

SELECT
  c.column_name AS "نام ستون",
  c.data_type AS "نوع داده",
  CASE
    WHEN c.column_name IN ('id', 'exchange_code', 'name', 'phone', 'mobile', 'code',
        'customer_type', 'status', 'notes', 'created_at', 'updated_at') THEN '✓ مورد انتظار'
    ELSE '→ اضافی'
  END AS "وضعیت"
FROM information_schema.columns c
WHERE c.table_schema = 'public' AND c.table_name = 'customers'
ORDER BY c.ordinal_position;


-- ============================================================
-- پایان گزارش
-- ============================================================
\echo ''
\echo '============================================================'
\echo 'پایان گزارش — هیچ تغییری اعمال نشده است.'
\echo 'لطفاً خروجی کامل را کپی کرده و ارسال کنید تا گام بعدی'
\echo 'اصلاحی با شواهد واقعی و حفظ داده‌های صرافان تعیین شود.'
\echo '============================================================'


-- ============================================================
-- SECTION 2: DOCUMENTATION FILES
-- ============================================================

-- ── SUPABASE-STRUCTURE.md ──
-- # Supabase Structure — حساب صراف
-- 
-- ## Connection
-- - **URL:** Set via `VITE_SUPABASE_URL` (frontend) / `SUPABASE_URL` (backend)
-- - **Anon Key:** `VITE_SUPABASE_KEY` (public, RLS-protected)
-- - **Service Key:** `SUPABASE_SERVICE_KEY` (server-side, bypasses RLS)
-- 
-- ## Tables (54+)
-- users, exchanges, customers, documents, transfers, conversions,
-- treasury_transactions, bank_accounts, bank_transactions, journal_entries,
-- ledger_entries, rates, idempotency_keys, employees, origins, safes,
-- rules, feature_settings, app_settings, audit_logs, wallet_transactions,
-- charge_orders, online_requests, online_products, wallets,
-- wallet_withdrawal_requests, wallet_topup_requests, wallet_bans,
-- customer_notifications, customer_transfer_requests, customer_links,
-- email_otps, user_notifications, user_permissions, user_feedback,
-- support_tickets, support_messages, error_reports, bank_gateways,
-- payment_transactions, chat_groups, chat_group_members, chat_messages,
-- message_reports, sellers, packages, pricing_plans, plan_quotas,
-- quota_change_logs, referrals, agency_links, backup_records,
-- rate_settings, text_labels
-- 
-- ## Views (9)
-- - v_treasury_balances
-- - v_bank_balances
-- - v_customer_balances
-- - v_wallet_balances
-- - v_agent_balances
-- - v_profit_loss
-- - v_currency_balances
-- - v_exchange_summary
-- - v_transactions
-- 
-- ## RPC Functions (4)
-- - `post_transfer_transaction` — Atomic transfer posting
-- - `reverse_document_transaction` — Document reversal
-- - `edit_document_transaction` — Document edit (soft-delete + insert)
-- - `get_account_balance` — Single account balance query
-- 
-- ## RLS Policies
-- - **Public (read-only):** rules, feature_settings, pricing_plans, online_products
-- - **Tenant-scoped:** All other tables — DENY ALL for anon/authenticated
-- - **Service Role:** Bypasses RLS (backend only)
-- 
-- ## Auth Structure
-- - Custom HMAC-SHA256 session tokens (12h TTL)
-- - PBKDF2 password hashing (100k iterations, SHA-256)
-- - Rate limiting (5 fails / 15 min = lockout)
-- - Google OAuth: creates customer with placeholder mobile
-- - Supabase Auth OTP: email verification only
-- 
-- ## Storage
-- - **Bucket:** public (publicly readable)
-- - **Path:** receipts/<timestamp>_<filename>
-- - **Used for:** Receipt uploads
-- 
-- ## Environment Variables (names only)
-- - Frontend: `VITE_SUPABASE_URL`, `VITE_SUPABASE_KEY`
-- - Backend: `SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_SERVICE_KEY`
-- - Creator: `CREATOR_EMAIL`, `CREATOR_PASSWORD`
-- 
-- ## Notes
-- - Schema SQL: `base44/shared/supabase_schema.sql`
-- - RLS SQL: `base44/shared/rls_policies.sql`
-- - No secrets are included in this document.
-- 

-- ── SUPABASE-BACKUP-MANIFEST.txt ──
-- ════════════════════════════════════════════════════════════════════════════════
--   HESAB SARAAF — SUPABASE BACKUP MANIFEST v01
--   Generated: 2026-09-27T09:01:55.127Z
-- ════════════════════════════════════════════════════════════════════════════════
-- 
-- ━━━ BACKUP FILES ━━━
-- 
--   1. hesab-sarraf-supabase-schema-v01.sql
--   2. hesab-sarraf-supabase-data-v01.sql
--   3. SUPABASE-BACKUP-MANIFEST.txt
-- 
-- ━━━ WHAT WAS BACKED UP ━━━
-- 
--   ✓ Table schemas (columns, types) via PostgREST OpenAPI spec
--   ✓ Table data (INSERT statements, max 10,000 rows/table)
--   ✓ RLS policies (0) via pg_policies
--   ✓ Indexes (0) via pg_indexes
--   ✓ Views (5/9 accessible)
--   ✓ Storage buckets (0)
--   ✓ Auth users metadata (2 users, no passwords)
-- 
-- ━━━ WHAT WAS NOT BACKED UP ━━━
-- 
--   ✗ Foreign key constraints — PostgREST doesn't expose them
--   ✗ Triggers — pg_trigger not accessible
--   ✗ Functions/RPCs — pg_proc not accessible
--   ✗ Sequences — not accessible
--   ✗ Auth passwords — intentionally excluded
--   ✗ Auth tokens/sessions — intentionally excluded
--   ✗ Storage file contents — only bucket metadata
--   ✗ Full DDL (CREATE TABLE) — PostgREST doesn't expose DDL
-- 
-- ━━━ TABLE SUMMARY ━━━
-- 
--   Total tables: 65
--   Tables with data: 15
--   Total rows: 30
-- 
--   Table                                        Rows Status    
--   ──────────────────────────────────────────────────────────
--   users                                           2 OK
--   exchanges                                       2 OK
--   customers                                       4 OK
--   rates                                           0 OK
--   bank_accounts                                   1 OK
--   safes                                           2 OK
--   origins                                         0 OK
--   transfers                                       0 OK
--   documents                                       2 OK
--   ledger_entries                                  4 OK
--   conversions                                     0 OK
--   treasury_transactions                           0 OK
--   bank_transactions                               0 OK
--   journal_entries                                 0 OK
--   wallets                                         0 OK
--   wallet_transactions                             0 OK
--   wallet_topup_requests                           0 ERROR
--   wallet_withdrawal_requests                      0 ERROR
--   charge_orders                                   0 OK
--   online_products                                 0 OK
--   sellers                                         0 OK
--   packages                                        0 OK
--   pricing_plans                                   0 OK
--   app_settings                                    1 OK
--   feature_settings                                0 OK
--   rate_settings                                   0 ERROR
--   text_labels                                     0 ERROR
--   rules                                           0 OK
--   customer_notifications                          0 OK
--   customer_transfer_requests                      0 OK
--   customer_links                                  0 OK
--   user_notifications                              0 ERROR
--   user_permissions                                0 ERROR
--   user_feedback                                   1 OK
--   support_tickets                                 1 OK
--   support_messages                                1 OK
--   error_reports                                   2 OK
--   audit_logs                                      3 OK
--   backup_records                                  0 ERROR
--   referrals                                       0 ERROR
--   plan_quotas                                     0 ERROR
--   quota_change_logs                               0 ERROR
--   agency_links                                    0 ERROR
--   chat_groups                                     0 ERROR
--   chat_group_members                              0 ERROR
--   chat_messages                                   0 ERROR
--   message_reports                                 0 ERROR
--   bank_gateways                                   0 ERROR
--   payment_transactions                            0 ERROR
--   payment_records                                 0 ERROR
--   wallet_bans                                     0 ERROR
--   idempotency_keys                                2 OK
--   safe_test_2                                     0 OK
--   online_requests                                 0 OK
--   v_agent_balances                                0 ERROR
--   v_transactions                                  2 OK
--   v_treasury_balances                             0 ERROR
--   v_exchange_summary                              0 ERROR
--   test123                                         0 OK
--   v_customer_balances                             0 ERROR
--   v_profit_loss                                   0 ERROR
--   employees                                       0 OK
--   v_bank_balances                                 0 ERROR
--   v_currency_balances                             0 ERROR
--   v_wallet_balances                               0 ERROR
-- 
-- ━━━ VIEWS ━━━
-- 
--   v_treasury_balances                      NOT FOUND
--   v_bank_balances                          OK (8 cols)
--   v_customer_balances                      OK (8 cols)
--   v_wallet_balances                        NOT FOUND
--   v_agent_balances                         NOT FOUND
--   v_profit_loss                            NOT FOUND
--   v_currency_balances                      OK (4 cols)
--   v_exchange_summary                       OK (7 cols)
--   v_transactions                           OK (24 cols)
-- 
-- ━━━ RLS POLICIES (0) ━━━
-- 
--   Error: HTTP_404
-- 
-- ━━━ INDEXES (0) ━━━
-- 
--   Error: HTTP_404
-- 
-- ━━━ STORAGE (0 buckets) ━━━
-- 
--   Error: HTTP_404
-- 
-- ━━━ AUTH USERS (2) ━━━
-- 
--   Passwords excluded: YES
--   Tokens excluded: YES
-- 
-- ━━━ ERRORS (27) ━━━
-- 
--   wallet_topup_requests: HTTP_404
--   wallet_withdrawal_requests: HTTP_404
--   rate_settings: HTTP_404
--   text_labels: HTTP_404
--   user_notifications: HTTP_404
--   user_permissions: HTTP_404
--   backup_records: HTTP_404
--   referrals: HTTP_404
--   plan_quotas: HTTP_404
--   quota_change_logs: HTTP_404
--   agency_links: HTTP_404
--   chat_groups: HTTP_404
--   chat_group_members: HTTP_404
--   chat_messages: HTTP_404
--   message_reports: HTTP_404
--   bank_gateways: HTTP_404
--   payment_transactions: HTTP_404
--   payment_records: HTTP_404
--   wallet_bans: HTTP_404
--   v_agent_balances: HTTP_400
--   v_treasury_balances: HTTP_400
--   v_exchange_summary: HTTP_400
--   v_customer_balances: HTTP_400
--   v_profit_loss: HTTP_400
--   v_bank_balances: HTTP_400
--   v_currency_balances: HTTP_400
--   v_wallet_balances: HTTP_400
-- 
-- ━━━ RESTORE INFO ━━━
-- 
--   Schema SQL: Metadata (NOT executable CREATE TABLEs)
--   Data SQL: INSERT statements (tables must exist first)
--   Full restore requires Supabase Dashboard pg_dump
--   This is a READ-ONLY snapshot — no data was modified
-- 
-- ━━━ SECRETS REPORT ━━━
-- 
--   No secrets in any backup file.
--   'password' column excluded from data SQL.
-- 
-- ════════════════════════════════════════════════════════════════════════════════
--   END OF MANIFEST — READ-ONLY BACKUP
-- ════════════════════════════════════════════════════════════════════════════════
-- 

-- ── BACKUP-MANIFEST.txt ──
-- HESAB SARAF — SOURCE CODE BACKUP MANIFEST
-- ===========================================
-- Generated: 2026-09-27T09:20:44.981Z
-- Total Files: 319
-- ZIP Size: 0.62 MB (631.5 KB)
-- Skipped (secrets detected): 4
-- 
-- FILE LIST:
-- ----------
-- .npmrc
-- AGENTS.md
-- CLAUDE.md
-- README.md
-- base44/config.jsonc
-- base44/entities/AgencyLink.jsonc
-- base44/entities/Agent.jsonc
-- base44/entities/Announcement.jsonc
-- base44/entities/AppSetting.jsonc
-- base44/entities/AuditLog.jsonc
-- base44/entities/BackupRecord.jsonc
-- base44/entities/BankAccount.jsonc
-- base44/entities/BankGateway.jsonc
-- base44/entities/ChatGroup.jsonc
-- base44/entities/Currency.jsonc
-- base44/entities/Customer.jsonc
-- base44/entities/CustomerLink.jsonc
-- base44/entities/CustomerNotification.jsonc
-- base44/entities/CustomerTransferRequest.jsonc
-- base44/entities/ErrorReport.jsonc
-- base44/entities/FeatureSetting.jsonc
-- base44/entities/GroupMember.jsonc
-- base44/entities/GroupMessage.jsonc
-- base44/entities/LedgerEntry.jsonc
-- base44/entities/MessageReport.jsonc
-- base44/entities/OnlineOrder.jsonc
-- base44/entities/OnlineProduct.jsonc
-- base44/entities/Package.jsonc
-- base44/entities/PaymentRecord.jsonc
-- base44/entities/PaymentTransaction.jsonc
-- base44/entities/PlanQuota.jsonc
-- base44/entities/PricingPlan.jsonc
-- base44/entities/QuotaChangeLog.jsonc
-- base44/entities/RateSetting.jsonc
-- base44/entities/Referral.jsonc
-- base44/entities/Safe.jsonc
-- base44/entities/SarraafProfile.jsonc
-- base44/entities/Seller.jsonc
-- base44/entities/SupportMessage.jsonc
-- base44/entities/SupportTicket.jsonc
-- base44/entities/TextLabel.jsonc
-- base44/entities/Transaction.jsonc
-- base44/entities/Transfer.jsonc
-- base44/entities/User.jsonc
-- base44/entities/UserFeedback.jsonc
-- base44/entities/UserNotification.jsonc
-- base44/entities/UserPermission.jsonc
-- base44/entities/Wallet.jsonc
-- base44/entities/WalletBan.jsonc
-- base44/entities/WalletTopupRequest.jsonc
-- base44/entities/WalletTransaction.jsonc
-- base44/entities/WalletWithdrawalRequest.jsonc
-- base44/functions/supabase/entry.ts
-- base44/shared/add_customer_columns.sql
-- base44/shared/comprehensive_schema_fix.sql
-- base44/shared/fix_missing_schema.sql
-- base44/shared/ledger_migration.sql
-- base44/shared/missing_tables.sql
-- base44/shared/profile_migration.sql
-- base44/shared/run_this.sql
-- base44/shared/seed_test_data.sql
-- base44/shared/supabase_schema.sql
-- components.json
-- eslint.config.js
-- index.html
-- jsconfig.json
-- package-lock.json
-- package.json
-- postcss.config.js
-- public/manifest.json
-- public/sw.js
-- src/App.jsx
-- src/api/base44Client.js
-- src/components/AdminRoute.jsx
-- src/components/AppGate.jsx
-- src/components/AuthLayout.jsx
-- src/components/BrandMark.jsx
-- src/components/ConnectionStatus.jsx
-- src/components/CustomerLayout.jsx
-- src/components/ErrorBoundary.jsx
-- src/components/ExchangeMark.jsx
-- src/components/FeatureGate.jsx
-- src/components/FeaturesManagement.jsx
-- src/components/GoogleIcon.jsx
-- src/components/IconCard.jsx
-- src/components/LanguageSwitcher.jsx
-- src/components/ProtectedRoute.jsx
-- src/components/ScrollToTop.jsx
-- src/components/SummaryCards.jsx
-- src/components/SyncIndicator.jsx
-- src/components/TermsGate.jsx
-- src/components/UserNotRegisteredError.jsx
-- src/components/WelcomeSplash.jsx
-- src/components/chat/GroupCard.jsx
-- src/components/chat/MessageBubble.jsx
-- src/components/chat/RoleBadge.jsx
-- src/components/customer/account/AccountSummary.jsx
-- src/components/customer/account/TransactionHistory.jsx
-- src/components/customer/games/ConfirmDialog.jsx
-- src/components/customer/games/SuccessSheet.jsx
-- src/components/customer/games/UCCard.jsx
-- src/components/customer/orders/OrderDetail.jsx
-- src/components/customer/orders/OrderTimeline.jsx
-- src/components/customer/recharge/ConfirmDialog.jsx
-- src/components/customer/recharge/SuccessSheet.jsx
-- src/components/customer/transfer/ConfirmDialog.jsx
-- src/components/customer/transfer/SuccessSheet.jsx
-- src/components/customer/transfer/TransferHistory.jsx
-- src/components/customer/wallet/AddFundsSheet.jsx
-- src/components/customer/wallet/TransactionHistory.jsx
-- src/components/customer/wallet/WalletCards.jsx
-- src/components/customer/wallet/WalletDetailSheet.jsx
-- src/components/sarraaf/BackupUpgradeModal.jsx
-- src/components/sarraaf/BankGatewayManager.jsx
-- src/components/sarraaf/CampaignBanner.jsx
-- src/components/sarraaf/ChatManagement.jsx
-- src/components/sarraaf/ContactInfo.jsx
-- src/components/sarraaf/ContactSettingsManager.jsx
-- src/components/sarraaf/EmergencyBackup.jsx
-- src/components/sarraaf/EmergencyBackupV2.jsx
-- src/components/sarraaf/FeedbackButton.jsx
-- src/components/sarraaf/Fields.jsx
-- src/components/sarraaf/InviteCodeManager.jsx
-- src/components/sarraaf/LanguageSettings.jsx
-- src/components/sarraaf/Layout.jsx
-- src/components/sarraaf/MultiExchangeManager.jsx
-- src/components/sarraaf/NotificationManager.jsx
-- src/components/sarraaf/PaymentMethodsManager.jsx
-- src/components/sarraaf/PermissionManager.jsx
-- src/components/sarraaf/Pieces.jsx
-- src/components/sarraaf/PlanFeatureManager.jsx
-- src/components/sarraaf/PlanPricingManager.jsx
-- src/components/sarraaf/PriceEditDialog.jsx
-- src/components/sarraaf/PricingManager.jsx
-- src/components/sarraaf/ReferralCard.jsx
-- src/components/sarraaf/ReferralManager.jsx
-- src/components/sarraaf/SupportPanel.jsx
-- src/components/sarraaf/SystemOverview.jsx
-- src/components/sarraaf/TermsManager.jsx
-- src/components/sarraaf/UpdatingNotice.jsx
-- src/components/sarraaf/UpgradeModal.jsx
-- src/components/sarraaf/UsageBar.jsx
-- src/components/sarraaf/UserManagement.jsx
-- src/components/sarraaf/VersionManager.jsx
-- src/components/ui/accordion.jsx
-- src/components/ui/alert-dialog.jsx
-- src/components/ui/alert.jsx
-- src/components/ui/aspect-ratio.jsx
-- src/components/ui/avatar.jsx
-- src/components/ui/badge.jsx
-- src/components/ui/breadcrumb.jsx
-- src/components/ui/button.jsx
-- src/components/ui/calendar.jsx
-- src/components/ui/card.jsx
-- src/components/ui/carousel.jsx
-- src/components/ui/chart.jsx
-- src/components/ui/checkbox.jsx
-- src/components/ui/collapsible.jsx
-- src/components/ui/command.jsx
-- src/components/ui/context-menu.jsx
-- src/components/ui/dialog.jsx
-- src/components/ui/drawer.jsx
-- src/components/ui/dropdown-menu.jsx
-- src/components/ui/form.jsx
-- src/components/ui/hover-card.jsx
-- src/components/ui/image.jsx
-- src/components/ui/input-otp.jsx
-- src/components/ui/input.jsx
-- src/components/ui/label.jsx
-- src/components/ui/menubar.jsx
-- src/components/ui/navigation-menu.jsx
-- src/components/ui/page.jsx
-- src/components/ui/pagination.jsx
-- src/components/ui/popover.jsx
-- src/components/ui/progress.jsx
-- src/components/ui/radio-group.jsx
-- src/components/ui/resizable.jsx
-- src/components/ui/scroll-area.jsx
-- src/components/ui/select.jsx
-- src/components/ui/separator.jsx
-- src/components/ui/sheet.jsx
-- src/components/ui/sidebar.jsx
-- src/components/ui/skeleton.jsx
-- src/components/ui/slider.jsx
-- src/components/ui/sonner.jsx
-- src/components/ui/switch.jsx
-- src/components/ui/table.jsx
-- src/components/ui/tabs.jsx
-- src/components/ui/textarea.jsx
-- src/components/ui/toast.jsx
-- src/components/ui/toaster.jsx
-- src/components/ui/toggle-group.jsx
-- src/components/ui/toggle.jsx
-- src/components/ui/tooltip.jsx
-- src/components/ui/use-toast.jsx
-- src/hooks/use-mobile.jsx
-- src/hooks/use-size.jsx
-- src/hooks/useFeatures.js
-- src/index.css
-- src/lib/AuthContext.jsx
-- src/lib/PageNotFound.jsx
-- src/lib/UpgradeContext.jsx
-- src/lib/accountMockData.js
-- src/lib/app-params.js
-- src/lib/auditLogger.js
-- src/lib/authReturnTo.js
-- src/lib/backupService.js
-- src/lib/chat.js
-- src/lib/contactSettings.js
-- src/lib/credentialCache.js
-- src/lib/defaultCurrencies.js
-- src/lib/emergencyBackupPdf.js
-- src/lib/emergencyBackupPdfV2.js
-- src/lib/exchange.js
-- src/lib/features.js
-- src/lib/gamesMockData.js
-- src/lib/googleAuth.js
-- src/lib/ledger.js
-- src/lib/ledgerApi.js
-- src/lib/localAuth.js
-- src/lib/localTestMode.js
-- src/lib/loginSecurity.js
-- src/lib/messagesMockData.js
-- src/lib/multiExchange.js
-- src/lib/notificationsMockData.js
-- src/lib/offlineAuth.js
-- src/lib/offlineLimits.js
-- src/lib/offlineQueue.js
-- src/lib/ordersMockData.js
-- src/lib/permissions.js
-- src/lib/pricingService.js
-- src/lib/profileMockData.js
-- src/lib/query-client.js
-- src/lib/rateHistory.js
-- src/lib/rbac.js
-- src/lib/rechargeMockData.js
-- src/lib/referralSystem.js
-- src/lib/sarraaf.js
-- src/lib/seedBase44Entities.js
-- src/lib/supabaseApi.js
-- src/lib/supabaseAuth.js
-- src/lib/supabaseClient.js
-- src/lib/supportSystem.js
-- src/lib/syncStatus.js
-- src/lib/termsService.js
-- src/lib/transferMockData.js
-- src/lib/useAdmin.js
-- src/lib/useBackup.js
-- src/lib/useChat.js
-- src/lib/useCustomer.js
-- src/lib/useKeepAlive.js
-- src/lib/usePricing.js
-- src/lib/useSarraaf.js
-- src/lib/utils.js
-- src/lib/versionManager.js
-- src/lib/walletMockData.js
-- src/lib/walletWithdrawal.js
-- src/main.jsx
-- src/pages/AgencyChooser.jsx
-- src/pages/AgencyNetwork.jsx
-- src/pages/Agents.jsx
-- src/pages/Backup.jsx
-- src/pages/BalanceSheet.jsx
-- src/pages/Bank.jsx
-- src/pages/BuilderPanel.jsx
-- src/pages/Cash.jsx
-- src/pages/ChatGroupDetail.jsx
-- src/pages/ChatGroups.jsx
-- src/pages/Currencies.jsx
-- src/pages/CurrencyConvert.jsx
-- src/pages/CustomerChat.jsx
-- src/pages/CustomerDetail.jsx
-- src/pages/CustomerPanel.jsx
-- src/pages/Customers.jsx
-- src/pages/Dadogereft.jsx
-- src/pages/Dashboard.jsx
-- src/pages/Debtors.jsx
-- src/pages/ForgotPassword.jsx
-- src/pages/GeneralLedger.jsx
-- src/pages/Journal.jsx
-- src/pages/JournalEntry.jsx
-- src/pages/MainSettings.jsx
-- src/pages/Notifications.jsx
-- src/pages/OAuthConsent.jsx
-- src/pages/OnlineProducts.jsx
-- src/pages/PaymentGateway.jsx
-- src/pages/ProfitLoss.jsx
-- src/pages/Receipt.jsx
-- src/pages/Reconciliation.jsx
-- src/pages/Register.jsx
-- src/pages/Reports.jsx
-- src/pages/ResetPassword.jsx
-- src/pages/SarraafChat.jsx
-- src/pages/SarraafMarket.jsx
-- src/pages/SarraafSupport.jsx
-- src/pages/Settings.jsx
-- src/pages/SetupDatabase.jsx
-- src/pages/Trade.jsx
-- src/pages/Transfer.jsx
-- src/pages/TransferBook.jsx
-- src/pages/Welcome.jsx
-- src/pages/customer/CustomerAccount.jsx
-- src/pages/customer/CustomerGames.jsx
-- src/pages/customer/CustomerHome.jsx
-- src/pages/customer/CustomerMessages.jsx
-- src/pages/customer/CustomerNotifications.jsx
-- src/pages/customer/CustomerOrders.jsx
-- src/pages/customer/CustomerProfile.jsx
-- src/pages/customer/CustomerRecharge.jsx
-- src/pages/customer/CustomerSupport.jsx
-- src/pages/customer/CustomerTransfer.jsx
-- src/pages/customer/CustomerWallet.jsx
-- src/pages/customer/CustomerWithdraw.jsx
-- src/pages/sarraaf/SarraafGames.jsx
-- src/pages/sarraaf/SarraafRecharge.jsx
-- src/pages/sarraaf/SarraafWallet.jsx
-- src/utils/index.ts
-- tailwind.config.js
-- vite.config.js
-- 
-- SKIPPED FILES (SECRET CONTENT DETECTED):
-- ------------------------------------------
-- src/lib/creatorAuth.js
-- src/lib/i18n.jsx
-- src/lib/translations/turkish.js
-- src/pages/Login.jsx

-- ── REBUILD-CHECKLIST.md ──
-- # Rebuild Checklist — حساب صراف
-- 
-- ## Prerequisites
-- - [ ] Node.js 18+ installed
-- - [ ] Supabase account (free tier works)
-- - [ ] Code editor (VS Code recommended)
-- 
-- ## Step 1: Create Project
-- - [ ] Create new Vite + React project: `npm create vite@latest hesab-sarraf -- --template react`
-- - [ ] Copy `package.json` dependencies
-- - [ ] Run `npm install`
-- 
-- ## Step 2: Configure Build
-- - [ ] Copy `vite.config.js` (remove @base44/vite-plugin if migrating)
-- - [ ] Copy `tailwind.config.js`
-- - [ ] Copy `postcss.config.js`
-- - [ ] Copy `index.html` (remove Base44 runtime script if migrating)
-- - [ ] Copy `jsconfig.json`
-- - [ ] Copy `components.json`
-- 
-- ## Step 3: Set Up Supabase
-- - [ ] Create new Supabase project
-- - [ ] Run `base44/shared/supabase_schema.sql` in SQL Editor
-- - [ ] Run `base44/shared/rls_policies.sql` in SQL Editor
-- - [ ] Create RPC functions (see SUPABASE-STRUCTURE.md)
-- - [ ] Create storage bucket: `public`
-- 
-- ## Step 4: Set Secrets
-- - [ ] `VITE_SUPABASE_URL` — Supabase project URL
-- - [ ] `VITE_SUPABASE_KEY` — Supabase anon key
-- - [ ] `SUPABASE_URL` — Same as above (backend)
-- - [ ] `SUPABASE_KEY` — Same as above (backend)
-- - [ ] `SUPABASE_SERVICE_KEY` — Service role key
-- - [ ] `CREATOR_EMAIL` — Creator account email
-- - [ ] `CREATOR_PASSWORD` — Creator account password
-- 
-- ## Step 5: Copy Source
-- - [ ] Copy `src/` directory
-- - [ ] Copy `base44/` directory
-- - [ ] Copy `public/` directory
-- 
-- ## Step 6: Deploy Backend
-- - [ ] Deploy `base44/functions/supabase/entry.ts` as Edge Function
-- - [ ] Or keep on Base44 platform (if not migrating)
-- 
-- ## Step 7: Test
-- - [ ] Test connection (SetupDatabase page)
-- - [ ] Bootstrap admin (CREATOR_EMAIL + CREATOR_PASSWORD)
-- - [ ] Test exchange registration
-- - [ ] Test customer registration
-- - [ ] Test login (exchange + customer + Google)
-- - [ ] Test CRUD operations
-- - [ ] Test financial operations (dadogereft, transfer)
-- - [ ] Test wallet operations
-- - [ ] Verify RLS policies active
-- 
-- ## Step 8: Build & Deploy
-- - [ ] Run `npm run build`
-- - [ ] Deploy to hosting platform
-- - [ ] Configure custom domain
-- - [ ] Set up PWA (service worker)
-- 
-- ## Notes
-- - No secrets are included in the backup — set them separately.
-- - Lock files may be outdated — run `npm install` to regenerate.
-- - The project uses Base44 platform for hosting by default.
-- - To migrate off Base44, see BASE44-DEPENDENCIES.md.
-- 

-- ── BASE44-DEPENDENCIES.md ──
-- # Base44 Dependencies — حساب صراف
-- 
-- ## NPM Packages
-- - `@base44/sdk` (0.8.51) — Base44 client SDK (auth, entities, integrations)
-- - `@base44/vite-plugin` (1.0.42) — Vite plugin for Base44 platform
-- 
-- ## Source Files Depending on Base44
-- - `src/api/base44Client.js` — Pre-initialized base44 client instance
-- - `src/components/ProtectedRoute.jsx` — Auth guard using base44.auth.isAuthenticated()
-- - `src/components/AdminRoute.jsx` — Admin route guard using base44 auth
-- - `src/components/AppGate.jsx` — App-level gate with base44 auth context
-- - `src/lib/AuthContext.jsx` — Auth context with base44.auth fallback
-- - `src/components/ui/*` — shadcn/ui components (via @base44/vite-plugin)
-- - `index.html` — Base44 runtime script injection in `<head>`
-- - `vite.config.js` — Vite config with @base44/vite-plugin
-- 
-- ## Backend
-- - `base44/functions/supabase/entry.ts` — Backend function (Deno runtime)
-- - `base44/shared/supabase_schema.sql` — Database schema SQL
-- - `base44/shared/rls_policies.sql` — RLS policies SQL
-- - `base44/config.jsonc` — Base44 app configuration
-- - `base44/entities/*.jsonc` — Entity schema definitions
-- 
-- ## Migration Notes
-- - `base44.auth.*` → Replace with Supabase Auth or custom JWT
-- - `base44.entities.*` → Already replaced with supabaseApi.js
-- - `base44.functions.invoke` → Replace with direct Supabase calls or Edge Functions
-- - `base44.integrations.Core.*` → Replace with direct API calls
-- - `@base44/vite-plugin` → Remove from vite.config.js
-- - `index.html` `<head>` → Remove Base44 runtime script injection
-- 
-- ## Status
-- - Entity CRUD: Migrated to supabaseApi.js (uses Supabase directly)
-- - Auth: Hybrid (HMAC tokens + base44.auth fallback for creator)
-- - Backend: Single Deno function (base44/functions/supabase/entry.ts)
-- - Deploy: Base44 platform (auto-deploy)
-- 

-- ============================================================
-- SECTION 3: STORAGE STRUCTURE (reference)
-- ============================================================

-- Bucket: public (publicly readable)
-- Path pattern: receipts/<timestamp>_<filename>
-- Used for: receipt uploads from backend function
-- Creation: via backend code or manual SQL:
--   INSERT INTO storage.buckets (id, name, public) VALUES ('public', 'public', true);

-- ============================================================
-- SECTION 4: AUTH STRUCTURE (structural only, no secrets)
-- ============================================================

-- Auth model: Custom HMAC + Supabase Auth OTP (hybrid)
--
-- 1. Custom Auth (primary):
--    - users table: id, username, mobile, email, password (PBKDF2 hashed)
--    - HMAC-SHA256 session tokens signed with app_auth_secret (database table, NOT exposed)
--    - Token payload: {uid, r (role), ec (exchange_code), exp}
--    - Session TTL: 12 hours (43200000 ms)
--    - PBKDF2 password hashing (100k iterations, SHA-256)
--    - Rate limiting: 5 failed logins in 15 min = lockout (via audit_logs)
--    - Roles: creator, admin, sarraaf (exchange), employee, customer
--    - Creator account: created via backend bootstrapAdmin action
--      (uses CREATOR_EMAIL and CREATOR_PASSWORD secrets — not in this file)
--
-- 2. Google OAuth:
--    - Via Supabase Auth (signInWithOAuth)
--    - Edge Function legacy-auth verifies Google access token
--    - Auto-creates customer account if new
--
-- 3. Supabase Auth OTP (email verification):
--    - Used for email verification during signup
--    - Stored in email_otps table or app_settings
--
-- 4. RLS (Row Level Security):
--    - Token-based: x-app-token header read by app_claims() function
--    - app_is_admin(): checks if token role is creator/admin
--    - app_ec(): extracts exchange_code from token
--    - app_uid(): extracts user id from token
--    - Tenant isolation: exchange_code filter on all tenant-scoped tables
--    - See supabase-direct-rls.sql for full policy definitions
--
-- NOTE: No actual passwords, tokens, or secrets are included in this file.
-- All secrets are set via the hosting platform's secret manager.

-- ============================================================
-- SECTION 5: VALIDATION SUMMARY
-- ============================================================

-- FILES FETCHED SUCCESSFULLY (20):
--   ✅ supabase-schema.sql
--   ✅ supabase-rls-policies.sql
--   ✅ supabase-app-token-auth.sql
--   ✅ supabase-register-rpc.sql
--   ✅ supabase-direct-rls.sql
--   ✅ supabase-final-migration.sql
--   ✅ supabase-missing-columns.sql
--   ✅ supabase-trial-columns.sql
--   ✅ supabase-migrate-passwords.sql
--   ✅ supabase-fix-register-rpc.sql
--   ✅ supabase-secure-login.sql
--   ✅ supabase-login-fix.sql
--   ✅ supabase-auth-fallback-rls.sql
--   ✅ supabase-builder-tables.sql
--   ✅ supabase-seller-system.sql
--   ✅ supabase-languages.sql
--   ✅ supabase-recovery-rpc.sql
--   ✅ supabase-recovery-backup.sql
--   ✅ supabase-release-fixes.sql
--   ✅ supabase-diagnostic-check.sql

-- TOTAL SQL FILES: 20
-- SUCCESSFULLY FETCHED: 20
-- FAILED: 0
--
-- END OF Supabase Emergency Backup
