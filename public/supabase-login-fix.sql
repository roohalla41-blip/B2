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
