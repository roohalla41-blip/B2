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
