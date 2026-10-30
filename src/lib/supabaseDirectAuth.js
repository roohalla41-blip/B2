// supabaseDirectAuth.js — Direct Supabase RPC authentication (no Edge Function, no Base44)
//
// تمام عملیات احراز هویت از طریق RPCهای مستقیم دیتابیس انجام می‌شوند.
// هیچ وابستگی به Edge Function، Integration credits یا توابع Base44 ندارد.
//
// پیش‌نیاز: اسکریپت public/supabase-app-token-auth.sql در Supabase اجرا شده باشد.

import { supabase } from './supabaseClient';
import { getSupabaseConfig } from './supabaseConfig';
import { migratePasswordAfterLogin } from './legacyMigration';

const DEFAULT_PASSWORD = '12345678';

// ── Set the x-app-token header on all subsequent Supabase requests ──
// This is required for RLS policies that read request.headers ->> 'x-app-token'
export function setAppTokenHeader(token) {
  if (!token) return;
  try {
    const client = supabase;
    if (client && client.rest) {
      client.rest.headers = { ...client.rest.headers, 'x-app-token': token };
    }
  } catch { /* non-critical */ }
}

// ── Normalize user for frontend ──
function normalizeUser(user, exchange) {
  if (!user) return user;
  const u = { ...user };
  if (u.id !== undefined && u.id !== null) u.id = String(u.id);
  delete u.password;
  if (exchange) {
    if (!u.exchange_code) u.exchange_code = exchange.exchange_code || '';
    if (!u.exchange_name) u.exchange_name = exchange.exchange_name || '';
  }
  if (u.role === 'exchange') u.role = 'sarraaf';
  if (u.created_at) u.created_date = u.created_at;
  if (u.updated_at) u.updated_date = u.updated_at;
  return u;
}

// ============================================================
// LOGIN — calls legacy_login RPC directly (no Edge Function)
// ============================================================
export async function directLogin(identifier, password) {
  const { data, error } = await supabase.rpc('legacy_login', {
    p_identifier: identifier,
    p_password: password,
  });

  if (error) {
    return { success: false, error: 'rpc_error', message: error.message };
  }

  if (!data) {
    return { success: false, error: 'empty_response' };
  }

  if (!data.success) {
    return { success: false, error: data.error || 'unknown' };
  }

  // Set the app token header for all subsequent RLS-protected requests
  setAppTokenHeader(data.token);

  // ── مهاجرت بی‌صدا رمز به هش امن pbkdf2 ──
  // اگر رمز قدیمی (متن ساده یا هش ضعیف) باشد، به pbkdf2 تبدیل می‌شود.
  // خطای مهاجرت به کاربر نشان داده نمی‌شود و ورود را مسدود نمی‌کند.
  // در صورت ناموفق بودن، در ورود بعدی تکرار می‌شود.
  migratePasswordAfterLogin(identifier, password, data.token).catch(() => {});

  return {
    success: true,
    user: normalizeUser(data.user, data.exchange),
    token: data.token,
    is_default_password: password === DEFAULT_PASSWORD,
  };
}

// ============================================================
// CHECK LEGACY USER — calls legacy_check_user RPC (never throws)
// ============================================================
export async function checkLegacyUser(identifier) {
  try {
    const { data, error } = await supabase.rpc('legacy_check_user', {
      p_identifier: identifier,
    });
    if (error || !data) return { legacy: false };
    return data.legacy ? data : { legacy: false };
  } catch {
    return { legacy: false };
  }
}

// ============================================================
// REGISTER CUSTOMER — via direct RPC (no Supabase Auth, no email confirmation)
// ============================================================
export async function directRegisterCustomer({ full_name, mobile, username, password, email }) {
  const { data, error } = await supabase.rpc('register_customer', {
    p_full_name: full_name,
    p_mobile: mobile,
    p_username: username,
    p_password: password,
    p_email: email || null,
  });

  if (error) {
    return { success: false, error: error.message || 'rpc_error' };
  }
  if (!data) {
    return { success: false, error: 'empty_response' };
  }
  if (!data.success) {
    return { success: false, error: data.error || 'unknown' };
  }

  setAppTokenHeader(data.token);
  return { success: true, user: normalizeUser(data.user), token: data.token };
}

// ============================================================
// REGISTER EXCHANGE — via direct RPC (no Supabase Auth, no email confirmation)
// ============================================================
export async function directRegisterExchange({ exchange_name, full_name, mobile, username, password, email, country, city, exchange_code }) {
  const { data, error } = await supabase.rpc('register_exchange', {
    p_exchange_name: exchange_name,
    p_full_name: full_name,
    p_mobile: mobile,
    p_username: username,
    p_password: password,
    p_email: email || null,
    p_country: country || null,
    p_city: city || null,
    p_exchange_code: exchange_code || null,
  });

  if (error) {
    return { success: false, error: error.message || 'rpc_error' };
  }
  if (!data) {
    return { success: false, error: 'empty_response' };
  }
  if (!data.success) {
    return { success: false, error: data.error || 'unknown' };
  }

  setAppTokenHeader(data.token);
  return { success: true, user: normalizeUser(data.user, data.exchange), exchange: data.exchange, token: data.token };
}

// ── CREATOR CREATE EXCHANGE ──
export async function creatorCreateExchange({ exchange_name, full_name, mobile, username, password, email, country, city, exchange_code }) {
  const result = await directRegisterExchange({ exchange_name, full_name, mobile, username, password, email, country, city, exchange_code });
  return result;
}

// ── GOOGLE LOGIN ──
export async function directGoogleLogin(googleEmail, googleName) {
  return { success: false, error: 'use_google_auth_module' };
}

// ── LINK GOOGLE ACCOUNT ──
export async function directLinkGoogleAccount(mobile, googleEmail) {
  return { success: false, error: 'not_implemented' };
}

// ============================================================
// GET ME — verify session token via legacy_verify RPC
// ============================================================
export async function directGetMe(token) {
  if (!token) return null;

  const { data, error } = await supabase.rpc('legacy_verify', {
    p_token: token,
  });

  if (error || !data || !data.success) {
    return null;
  }

  // Set the app token header for all subsequent RLS-protected requests
  setAppTokenHeader(token);

  return normalizeUser(data.user, data.exchange);
}

// ============================================================
// CHANGE PASSWORD — via legacy_change_password RPC
// ============================================================
export async function directChangePassword(token, oldPassword, newPassword) {
  const { data, error } = await supabase.rpc('legacy_change_password', {
    p_token: token,
    p_old_password: oldPassword,
    p_new_password: newPassword,
  });

  if (error) {
    return { success: false, error: 'rpc_error', message: error.message };
  }

  if (!data) {
    return { success: false, error: 'empty_response' };
  }

  if (!data.success) {
    return { success: false, error: data.error || 'unknown' };
  }

  return { success: true };
}

// ============================================================
// RECOVERY — migration status, bulk migrate, link creator
// ============================================================
export async function getMigrationStatus() {
  const { data, error } = await supabase.rpc('recovery_get_status');
  if (error) return { success: false, error: error.message };
  return data || { success: false, error: 'empty_response' };
}

export async function migrateAllUsers(dryRun = false) {
  if (dryRun) {
    const { data, error } = await supabase.rpc('recovery_preview_migrate');
    if (error) return { success: false, error: error.message };
    return data || { success: false, error: 'empty_response' };
  }

  const { data, error } = await supabase.rpc('recovery_migrate_users');
  if (error) return { success: false, error: error.message };
  return data || { success: false, error: 'empty_response' };
}

export async function linkCreator(email, password) {
  const { data, error } = await supabase.rpc('recovery_link_creator', {
    p_email: email,
    p_password: password,
  });
  if (error) return { success: false, error: error.message };
  return data || { success: false, error: 'empty_response' };
}

export default {
  directLogin,
  checkLegacyUser,
  directRegisterCustomer,
  directRegisterExchange,
  creatorCreateExchange,
  directGoogleLogin,
  directLinkGoogleAccount,
  directGetMe,
  directChangePassword,
  getMigrationStatus,
  migrateAllUsers,
  linkCreator,
  setAppTokenHeader,
};