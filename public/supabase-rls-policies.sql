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
