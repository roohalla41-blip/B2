// legacyMigration.js — مهاجرت امن رمزهای حساب‌های قدیمی به Supabase
//
// پس از ورود موفق، هش امن رمز را در Supabase ثبت می‌کند.
//   • رمز خام هرگز ذخیره نمی‌شود — فقط هش pbkdf2
//   • خطای مهاجرت به کاربر نشان داده نمی‌شود
//   • اگر ناموفق باشد، ورود مسدود نمی‌شود و در ورود بعدی تکرار می‌شود
//   • تکرارپذیر و غیرمخرب — رکورد قبلی بازنویسی/حذف نمی‌شود
//
// پیش‌نیاز: اسکریپت public/supabase-migrate-passwords.sql در Supabase اجرا شده باشد.
// اگر اجرا نشده باشد، به‌طور بی‌صدا به legacy_change_password برمی‌گردد.

import { supabase } from './supabaseClient';

// ── Base64 helpers برای هش PBKDF2 (سمت کلاینت — فقط برای ثبت‌نام) ──
function toB64(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

/**
 * هش امن رمز با PBKDF2 (۱۰۰۰۰۰ تکرار، SHA-256)
 * فقط برای ثبت‌نام کاربران محلی در Supabase استفاده می‌شود.
 */
export async function hashPasswordSecure(password) {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']);
  const hash = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, key, 256);
  return 'pbkdf2$' + toB64(salt) + '$' + toB64(new Uint8Array(hash));
}

// ============================================================
// مهاجرت رمز پس از ورود موفق Supabase
// ============================================================
/**
 * پس از ورود موفق از طریق legacy_login، رمز را به هش امن تبدیل می‌کند.
 * ابتدا legacy_migrate_password (کارآمد — فقط در صورت نیاز هش می‌کند) را امتحان می‌کند،
 * اگر در دسترس نبود، به legacy_change_password برمی‌گردد.
 *
 * @param {string} identifier — نام کاربری/موبایل/ایمیل (فقط برای لاگ)
 * @param {string} password — رمز عبور (هش می‌شود، متن ساده ذخیره نمی‌شود)
 * @param {string} token — توکن نشست از legacy_login
 * @returns {Promise<{migrated: boolean, reason?: string}>}
 */
export async function migratePasswordAfterLogin(identifier, password, token) {
  if (!token || !password) return { migrated: false, reason: 'missing_input' };

  try {
    // روش کارآمد: legacy_migrate_password (فقط در صورت نیاز هش می‌کند)
    const { data, error } = await supabase.rpc('legacy_migrate_password', {
      p_token: token,
      p_password: password,
    });

    if (!error && data) {
      if (!data.success) {
        return { migrated: false, reason: data.error || 'unknown' };
      }
      return { migrated: data.migrated === true, reason: data.reason };
    }

    // روش جایگزین: legacy_change_password (همیشه هش می‌کند — کارآمدتر نیست ولی موجود است)
    const { data: cpData, error: cpError } = await supabase.rpc('legacy_change_password', {
      p_token: token,
      p_old_password: password,
      p_new_password: password,
    });

    if (cpError || !cpData || !cpData.success) {
      return { migrated: false, reason: 'fallback_failed' };
    }

    return { migrated: true };
  } catch {
    return { migrated: false, reason: 'exception' };
  }
}

// ============================================================
// مهاجرت کاربر محلی به Supabase
// ============================================================
/**
 * پس از ورود موفق محلی، کاربر را در Supabase ثبت می‌کند.
 *   ۱. اگر کاربر در Supabase وجود دارد → ورود کن و رمز را مهاجرت بده
 *   ۲. اگر کاربر در Supabase نیست → ثبت‌نام کن
 *   ۳. اگر هر دو ناموفق شد → بی‌صدا برمی‌گردد (ورود محلی مسدود نمی‌شود)
 *
 * @param {object} localUser — کاربر از localAuth
 * @param {string} password — رمز عبور (تأییدشده توسط ورود محلی)
 * @returns {Promise<{migrated: boolean, token?: string, user?: object, exchange?: object}>}
 */
export async function tryMigrateLocalUser(localUser, password) {
  if (!localUser || !password) return { migrated: false };

  try {
    const identifier = localUser.username || localUser.mobile;
    if (!identifier) return { migrated: false, reason: 'no_identifier' };

    // ۱. بررسی: آیا کاربر در Supabase وجود دارد؟
    const { data: loginData, error: loginError } = await supabase.rpc('legacy_login', {
      p_identifier: identifier,
      p_password: password,
    });

    if (!loginError && loginData && loginData.success) {
      // کاربر در Supabase وجود دارد و رمز درست است — مهاجرت رمز (بی‌صدا)
      await migratePasswordAfterLogin(identifier, password, loginData.token);
      return {
        migrated: true,
        token: loginData.token,
        user: loginData.user,
        exchange: loginData.exchange,
      };
    }

    // ۲. کاربر در Supabase نیست — ثبت‌نام
    if (loginData && (loginData.error === 'user_not_found' || loginError)) {
      const { directRegisterCustomer, directRegisterExchange } = await import('./supabaseDirectAuth');

      if (localUser.role === 'customer') {
        const result = await directRegisterCustomer({
          full_name: localUser.full_name || localUser.name || '',
          mobile: localUser.mobile,
          username: localUser.username || localUser.mobile,
          password,
          email: localUser.email,
        });
        if (result.success) {
          return { migrated: true, token: result.token, user: result.user };
        }
        return { migrated: false, reason: result.error || 'register_failed' };
      }

      if (localUser.role === 'exchange' || localUser.role === 'sarraaf') {
        const result = await directRegisterExchange({
          exchange_name: localUser.exchange_name || localUser.full_name || '',
          full_name: localUser.full_name || localUser.name || '',
          mobile: localUser.mobile,
          username: localUser.username || localUser.mobile,
          password,
          email: localUser.email,
          exchange_code: localUser.exchange_code,
        });
        if (result.success) {
          return { migrated: true, token: result.token, user: result.user, exchange: result.exchange };
        }
        return { migrated: false, reason: result.error || 'register_failed' };
      }
    }

    return { migrated: false, reason: 'cannot_migrate' };
  } catch {
    return { migrated: false, reason: 'exception' };
  }
}

export default {
  migratePasswordAfterLogin,
  tryMigrateLocalUser,
  hashPasswordSecure,
};