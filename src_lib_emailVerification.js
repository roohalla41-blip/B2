// emailVerification.js — Sarraaf email verification via Supabase Auth OTP
//
// Flow:
// 1. signUpSarraaf(email, password, fullName)
//    → supabase.auth.signUp creates unverified user, Supabase sends 6-digit OTP email
// 2. verifyOtpCode(email, code)
//    → supabase.auth.verifyOtp({email, token, type:'signup'}) → session + email_confirmed_at
// 3. resendOtpCode(email)
//    → supabase.auth.resend({type:'signup', email})

import { supabase } from './supabaseClient';
import { signUpWithEmail, resendVerificationEmail } from './supabaseAuth';

const KNOWN_EMAIL_DOMAINS = [
  'gmail.com', 'googlemail.com', 'yahoo.com', 'ymail.com', 'rocketmail.com',
  'outlook.com', 'hotmail.com', 'live.com', 'msn.com',
  'icloud.com', 'me.com', 'mac.com',
  'protonmail.com', 'proton.me', 'tutanota.com',
  'aol.com', 'mail.com', 'gmx.com', 'zoho.com',
  'facebook.com', 'yandex.com', 'yandex.ru',
];

export function isRealEmailProvider(email) {
  const parts = (email || '').trim().toLowerCase().split('@');
  return parts.length === 2 && KNOWN_EMAIL_DOMAINS.includes(parts[1]);
}

export function isValidEmailFormat(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((email || '').trim());
}

// ── Step 1: Sign up with email + password → Supabase sends OTP email ──
// If the email is already registered (but unverified), Supabase returns no error
// but does NOT send a new OTP. In that case we explicitly call resend so the
// code actually reaches the inbox. This uses Supabase Auth directly — no
// Base44 Integration Credits are consumed.
export async function signUpSarraaf(email, password, fullName) {
  const trimmedEmail = (email || '').trim().toLowerCase();
  if (!isValidEmailFormat(trimmedEmail)) return { success: false, error: 'invalid_email' };
  if (!isRealEmailProvider(trimmedEmail)) return { success: false, error: 'invalid_domain' };
  if (!password || password.length < 8) return { success: false, error: 'weak_password' };

  try {
    const { data, error } = await signUpWithEmail(trimmedEmail, password, {
      full_name: fullName || '',
      role: 'exchange',
    });
    if (error) {
      return { success: false, error: mapSignUpError(error), detail: error.message };
    }

    // New signup with a session → OTP email was sent by Supabase.
    if (data?.session) return { success: true, freshly_created: true };

    // No session: either already-registered-unverified or email confirmation
    // is required. Force a resend so a code is actually delivered.
    const { error: resendError } = await resendVerificationEmail(trimmedEmail);
    if (resendError) {
      return { success: false, error: mapResendError(resendError), detail: resendError.message };
    }
    return { success: true, freshly_created: false };
  } catch (err) {
    return { success: false, error: 'request_failed', detail: err.message };
  }
}

// ── Step 2: Verify the 6-digit OTP code ──
export async function verifyOtpCode(email, code) {
  const trimmedEmail = (email || '').trim().toLowerCase();
  if (!code || String(code).length !== 6) return { success: false, error: 'invalid_code' };

  try {
    const { data, error } = await supabase.auth.verifyOtp({
      email: trimmedEmail,
      token: String(code),
      type: 'signup',
    });
    if (error) {
      return { success: false, error: mapVerifyError(error), detail: error.message };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: 'verify_failed', detail: err.message };
  }
}

// ── Resend OTP email (rate-limited by Supabase) ──
export async function resendOtpCode(email) {
  const trimmedEmail = (email || '').trim().toLowerCase();
  try {
    const { error } = await resendVerificationEmail(trimmedEmail);
    if (error) {
      return { success: false, error: mapResendError(error), detail: error.message };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: 'request_failed', detail: err.message };
  }
}

function mapSignUpError(error) {
  const msg = (error.message || '').toLowerCase();
  if (msg.includes('already') && msg.includes('registered')) return 'email_exists';
  if (msg.includes('rate') || msg.includes('too many') || msg.includes('over_email_send_rate')) return 'rate_limited';
  if (msg.includes('password')) return 'weak_password';
  if (msg.includes('not allowed') || msg.includes('disabled') || msg.includes('email provider')) return 'signup_disabled';
  if (msg.includes('network') || msg.includes('fetch')) return 'network_error';
  return 'request_failed';
}

function mapVerifyError(error) {
  const msg = (error.message || '').toLowerCase();
  if (msg.includes('expired')) return 'expired';
  if (msg.includes('invalid') || msg.includes('wrong') || msg.includes('token')) return 'wrong_code';
  if (msg.includes('attempts') || msg.includes('limit')) return 'max_attempts';
  if (msg.includes('network') || msg.includes('fetch')) return 'network_error';
  return 'verify_failed';
}

function mapResendError(error) {
  const msg = (error.message || '').toLowerCase();
  if (msg.includes('rate') || msg.includes('too many') || msg.includes('over_email_send_rate')) return 'rate_limited';
  if (msg.includes('not found') || msg.includes('no user')) return 'user_not_found';
  if (msg.includes('network') || msg.includes('fetch')) return 'network_error';
  return 'request_failed';
}

// ── Cooldown tracking (1-hour resend window) ──
export const OTP_COOLDOWN = 3600;
const SENT_AT_PREFIX = 'ev_sent_at_';

export function getResendCooldown(email) {
  try {
    const key = SENT_AT_PREFIX + (email || '').toLowerCase().trim();
    const ts = localStorage.getItem(key);
    if (!ts) return 0;
    const elapsed = Math.floor((Date.now() - parseInt(ts)) / 1000);
    return elapsed < OTP_COOLDOWN ? OTP_COOLDOWN - elapsed : 0;
  } catch { return 0; }
}

export function markCodeSent(email) {
  try {
    const key = SENT_AT_PREFIX + (email || '').toLowerCase().trim();
    localStorage.setItem(key, String(Date.now()));
  } catch { /* ignore */ }
}

// ── Error message helper ──
// Accepts a code string, or an object { error, detail } where `detail` is the
// raw Supabase message. Known codes always return their Persian message.
// For unmapped errors, the safe detail snippet is appended so the admin/user
// sees something more precise than the generic fallback.
export function getVerificationErrorMessage(error, detail) {
  const code = typeof error === 'string' ? error : (error?.error || 'request_failed');
  const raw = typeof error === 'string' ? (detail || '') : (error?.detail || detail || '');
  const map = {
    invalid_email: 'فرمت ایمیل نامعتبر است',
    invalid_domain: 'فقط ایمیل واقعی از Gmail، Yahoo، Outlook و سرویس‌های معتبر پذیرفته می‌شود',
    weak_password: 'رمز عبور باید حداقل ۸ کاراکتر باشد',
    rate_limited: 'تعداد درخواست‌ها بیش از حد مجاز است. یک ساعت بعد دوباره تلاش کنید.',
    email_exists: 'این ایمیل قبلاً ثبت شده است',
    signup_disabled: 'ثبت‌نام با این روش فعلاً غیرفعال است. با پشتیبانی تماس بگیرید.',
    verify_failed: 'کد وارد شده نامعتبر است',
    wrong_code: 'کد اشتباه است',
    max_attempts: 'تعداد تلاش‌های اشتباه بیش از حد مجاز است',
    expired: 'کد منقضی شده است. کد جدید درخواست کنید.',
    invalid_code: 'کد باید ۶ رقم باشد',
    network_error: 'خطای اتصال به سرور. اینترنت خود را بررسی کنید و دوباره تلاش کنید.',
    user_not_found: 'کاربر یافت نشد',
    request_failed: 'درخواست ناموفق بود',
  };
  const base = map[code] || 'خطا در تأیید ایمیل';
  // Append the raw detail only for unmapped failures (safe, user-facing Supabase messages)
  if (raw && (code === 'request_failed' || code === 'verify_failed' || !map[code])) {
    const snippet = String(raw).slice(0, 120);
    return `${base} (${snippet})`;
  }
  return base;
}

export default {
  isRealEmailProvider,
  isValidEmailFormat,
  signUpSarraaf,
  verifyOtpCode,
  resendOtpCode,
  getVerificationErrorMessage,
  OTP_COOLDOWN,
  getResendCooldown,
  markCodeSent,
};