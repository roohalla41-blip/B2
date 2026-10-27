-- ============================================================
-- حساب صراف — Registration RPCs with safe prerequisite creation
-- ------------------------------------------------------------
-- This script:
--   1. Creates missing prerequisite tables (users, exchanges,
--      audit_logs, app_auth_secret) using idempotent DDL.
--      Existing tables and their data are NEVER modified.
--   2. Protects app_auth_secret: if it already exists, its
--      secret is left untouched. If created fresh, a random
--      secret is generated once and direct access by
--      anon/authenticated is revoked.
--   3. Validates columns of existing tables; mismatches stop
--      the script safely (no auto-ALTER of existing tables).
--   4. Reports (does NOT create) missing helper functions
--      app_hash_password, app_sign, app_profile, app_audit.
--   5. Creates/replaces register_customer and register_exchange.
--      Runtime DB errors propagate (atomic rollback preserved);
--      only intentional validation results are returned as JSON.
--   6. Grants execute to anon, authenticated and verifies
--      exact function signatures with to_regprocedure.
--
-- Run: Supabase SQL Editor → paste the whole file → Run.
-- ============================================================

-- ── 1. Missing prerequisite tables (idempotent, no data changes) ──

create table if not exists public.users (
  id bigserial primary key,
  full_name text not null,
  mobile text unique,
  username text unique,
  email text,
  password text not null,
  role text not null default 'customer',
  status text not null default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  last_login timestamptz
);
create index if not exists idx_users_role on public.users(role);
create index if not exists idx_users_status on public.users(status);
create index if not exists idx_users_email on public.users(email);

create table if not exists public.exchanges (
  id bigserial primary key,
  exchange_code text unique not null,
  exchange_name text not null,
  owner_user_id bigint references public.users(id) on delete set null,
  name text,
  mobile text,
  email text,
  country text,
  city text,
  status text not null default 'active',
  password text,
  trial_start_date date,
  plan text default 'free',
  quota_limit integer default 100,
  quota_used integer default 0,
  payment_status text default 'none',
  paid_start_date date,
  paid_end_date date,
  referral_enabled boolean default false,
  referral_code text,
  referral_count integer default 0,
  paid_referral_count integer default 0,
  referral_bonus_quota integer default 0,
  last_login timestamptz,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_exchanges_status on public.exchanges(status);
create index if not exists idx_exchanges_owner on public.exchanges(owner_user_id);

create table if not exists public.audit_logs (
  id bigserial primary key,
  user_id bigint references public.users(id) on delete set null,
  registered_by_user_id bigint references public.users(id) on delete set null,
  user_name text not null,
  user_type text,
  action text not null,
  entity_type text,
  entity_id text,
  description text,
  ip_address text,
  device text,
  status text not null default 'success',
  created_at timestamptz default now()
);
create index if not exists idx_audit_user on public.audit_logs(user_id);
create index if not exists idx_audit_action on public.audit_logs(action);

-- app_auth_secret: never overwrite an existing secret.
create table if not exists public.app_auth_secret (
  id int primary key default 1 check (id = 1),
  secret text not null
);
insert into public.app_auth_secret (id, secret)
select 1, encode(extensions.gen_random_bytes(48), 'hex')
where not exists (select 1 from public.app_auth_secret where id = 1);
alter table public.app_auth_secret enable row level security;
revoke all on public.app_auth_secret from anon, authenticated;

-- Enable RLS on freshly created tables (no-op if already enabled).
alter table public.users enable row level security;
alter table public.exchanges enable row level security;
alter table public.audit_logs enable row level security;

-- ── 2. Column validation for existing tables (no auto-ALTER) ──
do $$
declare
  missing text[];
begin
  if not exists (select 1 from information_schema.columns
                where table_schema='public' and table_name='users' and column_name='id') then
    missing := missing || 'column public.users.id';
  end if;
  if not exists (select 1 from information_schema.columns
                where table_schema='public' and table_name='users' and column_name='full_name') then
    missing := missing || 'column public.users.full_name';
  end if;
  if not exists (select 1 from information_schema.columns
                where table_schema='public' and table_name='users' and column_name='mobile') then
    missing := missing || 'column public.users.mobile';
  end if;
  if not exists (select 1 from information_schema.columns
                where table_schema='public' and table_name='users' and column_name='username') then
    missing := missing || 'column public.users.username';
  end if;
  if not exists (select 1 from information_schema.columns
                where table_schema='public' and table_name='users' and column_name='email') then
    missing := missing || 'column public.users.email';
  end if;
  if not exists (select 1 from information_schema.columns
                where table_schema='public' and table_name='users' and column_name='password') then
    missing := missing || 'column public.users.password';
  end if;
  if not exists (select 1 from information_schema.columns
                where table_schema='public' and table_name='users' and column_name='role') then
    missing := missing || 'column public.users.role';
  end if;
  if not exists (select 1 from information_schema.columns
                where table_schema='public' and table_name='users' and column_name='status') then
    missing := missing || 'column public.users.status';
  end if;

  if not exists (select 1 from information_schema.columns
                where table_schema='public' and table_name='exchanges' and column_name='id') then
    missing := missing || 'column public.exchanges.id';
  end if;
  if not exists (select 1 from information_schema.columns
                where table_schema='public' and table_name='exchanges' and column_name='exchange_code') then
    missing := missing || 'column public.exchanges.exchange_code';
  end if;
  if not exists (select 1 from information_schema.columns
                where table_schema='public' and table_name='exchanges' and column_name='exchange_name') then
    missing := missing || 'column public.exchanges.exchange_name';
  end if;
  if not exists (select 1 from information_schema.columns
                where table_schema='public' and table_name='exchanges' and column_name='owner_user_id') then
    missing := missing || 'column public.exchanges.owner_user_id';
  end if;
  if not exists (select 1 from information_schema.columns
                where table_schema='public' and table_name='exchanges' and column_name='status') then
    missing := missing || 'column public.exchanges.status';
  end if;
  if not exists (select 1 from information_schema.columns
                where table_schema='public' and table_name='exchanges' and column_name='plan') then
    missing := missing || 'column public.exchanges.plan';
  end if;
  if not exists (select 1 from information_schema.columns
                where table_schema='public' and table_name='exchanges' and column_name='payment_status') then
    missing := missing || 'column public.exchanges.payment_status';
  end if;
  if not exists (select 1 from information_schema.columns
                where table_schema='public' and table_name='exchanges' and column_name='trial_start_date') then
    missing := missing || 'column public.exchanges.trial_start_date';
  end if;

  if not exists (select 1 from information_schema.columns
                where table_schema='public' and table_name='audit_logs' and column_name='user_id') then
    missing := missing || 'column public.audit_logs.user_id';
  end if;
  if not exists (select 1 from information_schema.columns
                where table_schema='public' and table_name='audit_logs' and column_name='user_name') then
    missing := missing || 'column public.audit_logs.user_name';
  end if;
  if not exists (select 1 from information_schema.columns
                where table_schema='public' and table_name='audit_logs' and column_name='user_type') then
    missing := missing || 'column public.audit_logs.user_type';
  end if;
  if not exists (select 1 from information_schema.columns
                where table_schema='public' and table_name='audit_logs' and column_name='action') then
    missing := missing || 'column public.audit_logs.action';
  end if;
  if not exists (select 1 from information_schema.columns
                where table_schema='public' and table_name='audit_logs' and column_name='description') then
    missing := missing || 'column public.audit_logs.description';
  end if;
  if not exists (select 1 from information_schema.columns
                where table_schema='public' and table_name='audit_logs' and column_name='status') then
    missing := missing || 'column public.audit_logs.status';
  end if;

  if missing is not null then
    raise exception 'Column validation failed — registration RPCs were NOT created. Missing/incompatible: %',
      array_to_string(missing, ', ');
  end if;
end
$$;

-- ── 3. Helper-function checks (reported, not created here) ──
do $$
declare
  missing text[];
begin
  if to_regprocedure('public.app_hash_password(text)') is null then
    missing := missing || 'function public.app_hash_password(text)';
  end if;
  if to_regprocedure('public.app_sign(jsonb)') is null then
    missing := missing || 'function public.app_sign(jsonb)';
  end if;
  if to_regprocedure('public.app_profile(bigint)') is null
     and to_regprocedure('public.app_profile(integer)') is null then
    missing := missing || 'function public.app_profile(bigint|integer)';
  end if;
  -- app_audit has 6 params (last has default); to_regprocedure needs exact sig,
  -- so check via pg_proc + pg_get_function_identity_arguments (strips defaults).
  if not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'app_audit'
    and pg_get_function_identity_arguments(p.oid) = 'bigint, text, text, text, text'
  ) then
    missing := missing || 'function public.app_audit(bigint, text, text, text, text)';
  end if;

  if missing is not null then
    raise exception 'Helper functions missing — registration RPCs were NOT created. Run supabase-app-token-auth.sql first. Missing: %',
      array_to_string(missing, ', ');
  end if;
end
$$;

-- ── 4. register_customer ──
-- Validation results are returned as JSON; runtime DB errors propagate
-- so the transaction rolls back atomically (no silent success).
create or replace function public.register_customer(
  p_full_name text, p_mobile text, p_username text, p_password text, p_email text default null
) returns jsonb
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  v_id bigint; prof jsonb; token text; auth_email text;
begin
  if coalesce(p_full_name, '') = '' or coalesce(p_mobile, '') = '' or coalesce(p_username, '') = '' or coalesce(p_password, '') = '' then
    return jsonb_build_object('success', false, 'error', 'missing_fields');
  end if;
  if length(p_password) < 8 then
    return jsonb_build_object('success', false, 'error', 'weak_password');
  end if;
  if exists (select 1 from public.users where mobile = p_mobile) then
    return jsonb_build_object('success', false, 'error', 'mobile_exists');
  end if;
  if exists (select 1 from public.users where username = p_username) then
    return jsonb_build_object('success', false, 'error', 'username_exists');
  end if;
  auth_email := case when p_email is not null and p_email <> '' then lower(trim(p_email)) else null end;
  if auth_email is not null and exists (select 1 from public.users where lower(email) = auth_email) then
    return jsonb_build_object('success', false, 'error', 'email_exists');
  end if;

  insert into public.users (full_name, mobile, username, email, password, role, status)
  values (p_full_name, p_mobile, p_username, auth_email, public.app_hash_password(p_password), 'customer', 'active')
  returning id into v_id;

  prof := public.app_profile(v_id);
  token := public.app_sign(jsonb_build_object(
    'uid', v_id::text,
    'r', prof -> 'user' ->> 'role',
    'ec', coalesce(prof -> 'user' ->> 'exchange_code', ''),
    'exp', (extract(epoch from now()) * 1000)::bigint + 43200000
  ));

  perform public.app_audit(v_id, p_full_name, 'customer', 'register', 'Customer registered (direct RPC)');

  return jsonb_build_object('success', true, 'user', prof -> 'user', 'token', token);
end $$;

-- ── 5. register_exchange ──
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
  if coalesce(p_exchange_name, '') = '' or coalesce(p_full_name, '') = '' or coalesce(p_mobile, '') = '' or coalesce(p_username, '') = '' or coalesce(p_password, '') = '' then
    return jsonb_build_object('success', false, 'error', 'missing_fields');
  end if;
  if length(p_password) < 8 then
    return jsonb_build_object('success', false, 'error', 'weak_password');
  end if;
  if exists (select 1 from public.users where mobile = p_mobile) then
    return jsonb_build_object('success', false, 'error', 'mobile_exists');
  end if;
  if exists (select 1 from public.users where username = p_username) then
    return jsonb_build_object('success', false, 'error', 'username_exists');
  end if;
  auth_email := case when p_email is not null and p_email <> '' then lower(trim(p_email)) else null end;
  if auth_email is not null and exists (select 1 from public.users where lower(email) = auth_email) then
    return jsonb_build_object('success', false, 'error', 'email_exists');
  end if;
  if p_exchange_code is not null and p_exchange_code <> '' and not exists (select 1 from public.exchanges where exchange_code = p_exchange_code) then
    return jsonb_build_object('success', false, 'error', 'exchange_code_exists');
  end if;

  insert into public.users (full_name, mobile, username, email, password, role, status)
  values (p_full_name, p_mobile, p_username, auth_email, public.app_hash_password(p_password), 'exchange', 'active')
  returning id into v_id;

  ex_code := coalesce(nullif(p_exchange_code, ''), 'EX-' || to_char(now(), 'YYMMDD') || lpad((random() * 1000)::int::text, 3, '0'));

  insert into public.exchanges (exchange_code, exchange_name, owner_user_id, status, plan, payment_status, trial_start_date)
  values (ex_code, p_exchange_name, v_id, 'active', 'free', 'trial', current_date)
  returning id into ex_id;

  prof := public.app_profile(v_id);
  token := public.app_sign(jsonb_build_object(
    'uid', v_id::text,
    'r', prof -> 'user' ->> 'role',
    'ec', coalesce(prof -> 'user' ->> 'exchange_code', ''),
    'exp', (extract(epoch from now()) * 1000)::bigint + 43200000
  ));

  perform public.app_audit(v_id, p_full_name, 'exchange', 'register', 'Exchange registered (direct RPC)');

  return jsonb_build_object('success', true, 'user', prof -> 'user', 'exchange', prof -> 'exchange', 'token', token);
end $$;

-- ── 6. Permissions ──
grant execute on function public.register_customer(text, text, text, text, text) to anon, authenticated;
grant execute on function public.register_exchange(text, text, text, text, text, text, text, text, text) to anon, authenticated;

-- ── 7. Refresh PostgREST schema cache ──
notify pgrst, 'reload schema';

-- ── 8. Final verification (exact signatures via to_regprocedure) ──
do $$
begin
  if to_regprocedure('public.register_customer(text, text, text, text, text)') is null then
    raise exception 'Verification failed: public.register_customer(text, text, text, text, text) was not created.';
  end if;
  if to_regprocedure('public.register_exchange(text, text, text, text, text, text, text, text, text)') is null then
    raise exception 'Verification failed: public.register_exchange(text, text, text, text, text, text, text, text, text) was not created.';
  end if;
  raise notice '✅ Registration RPCs created successfully and schema cache refreshed.';
end $$;
