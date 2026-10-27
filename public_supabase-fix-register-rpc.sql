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
