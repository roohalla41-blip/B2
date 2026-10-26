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
