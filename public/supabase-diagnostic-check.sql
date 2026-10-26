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
