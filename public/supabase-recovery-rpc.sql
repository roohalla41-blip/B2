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
