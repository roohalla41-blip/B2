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
