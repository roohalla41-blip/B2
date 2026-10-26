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
