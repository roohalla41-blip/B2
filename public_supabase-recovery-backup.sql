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
