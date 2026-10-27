// loginSecurity.js — مدیریت تلاش‌های ورود، OTP و امنیت احراز هویت
import { offlineDB as db } from './offlineQueue';

const ATTEMPTS_KEY = 'login_attempts';
const OTP_KEY = 'otp_codes';
const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const OTP_EXPIRY_MINUTES = 5;

// ── Login Attempts ──
function getAttempts() {
  try { return JSON.parse(localStorage.getItem(ATTEMPTS_KEY) || '{}'); } catch { return {}; }
}
function saveAttempts(data) {
  try { localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(data)); } catch { /* ignore */ }
}

export function recordLoginAttempt(identifier, success) {
  const attempts = getAttempts();
  const key = (identifier || '').trim().toLowerCase();
  const now = Date.now();

  if (!attempts[key]) {
    attempts[key] = { count: 0, last_attempt: 0, locked_until: 0 };
  }

  if (success) {
    // Reset on successful login
    attempts[key] = { count: 0, last_attempt: now, locked_until: 0 };
  } else {
    attempts[key].count += 1;
    attempts[key].last_attempt = now;
    // Lock after max attempts
    if (attempts[key].count >= MAX_ATTEMPTS) {
      attempts[key].locked_until = now + LOCKOUT_MINUTES * 60 * 1000;
    }
  }

  saveAttempts(attempts);
  return attempts[key];
}

export function isAccountLocked(identifier) {
  const attempts = getAttempts();
  const key = (identifier || '').trim().toLowerCase();
  const record = attempts[key];
  if (!record || !record.locked_until) return false;
  if (Date.now() > record.locked_until) {
    // Lock expired, reset
    delete attempts[key];
    saveAttempts(attempts);
    return false;
  }
  return true;
}

export function getLockoutRemaining(identifier) {
  const attempts = getAttempts();
  const key = (identifier || '').trim().toLowerCase();
  const record = attempts[key];
  if (!record || !record.locked_until) return 0;
  const remaining = Math.ceil((record.locked_until - Date.now()) / 1000);
  return Math.max(0, remaining);
}

export function getRemainingAttempts(identifier) {
  const attempts = getAttempts();
  const key = (identifier || '').trim().toLowerCase();
  const record = attempts[key];
  if (!record) return MAX_ATTEMPTS;
  return Math.max(0, MAX_ATTEMPTS - record.count);
}

export function clearLoginAttempts(identifier) {
  const attempts = getAttempts();
  const key = (identifier || '').trim().toLowerCase();
  delete attempts[key];
  saveAttempts(attempts);
}

// ── OTP (One-Time Password) ──
function getOtpStore() {
  try { return JSON.parse(localStorage.getItem(OTP_KEY) || '{}'); } catch { return {}; }
}
function saveOtpStore(data) {
  try { localStorage.setItem(OTP_KEY, JSON.stringify(data)); } catch { /* ignore */ }
}

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Generate and store OTP for an identifier (mobile/email)
export function generateAndStoreOtp(identifier) {
  const store = getOtpStore();
  const key = (identifier || '').trim().toLowerCase();
  const code = generateOtp();
  const expiresAt = Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000;
  store[key] = { code, expiresAt, attempts: 0 };
  saveOtpStore(store);
  return code;
}

// Verify OTP
export function verifyOtp(identifier, inputCode) {
  const store = getOtpStore();
  const key = (identifier || '').trim().toLowerCase();
  const record = store[key];
  if (!record) return { success: false, error: 'otp_not_found' };
  if (Date.now() > record.expiresAt) {
    delete store[key];
    saveOtpStore(store);
    return { success: false, error: 'otp_expired' };
  }
  record.attempts = (record.attempts || 0) + 1;
  if (record.attempts > 3) {
    delete store[key];
    saveOtpStore(store);
    return { success: false, error: 'too_many_attempts' };
  }
  if (record.code !== inputCode) {
    saveOtpStore(store);
    return { success: false, error: 'wrong_code' };
  }
  // Success — clear OTP
  delete store[key];
  saveOtpStore(store);
  return { success: true };
}

export function hasPendingOtp(identifier) {
  const store = getOtpStore();
  const key = (identifier || '').trim().toLowerCase();
  const record = store[key];
  if (!record) return false;
  return Date.now() <= record.expiresAt;
}

export function clearOtp(identifier) {
  const store = getOtpStore();
  const key = (identifier || '').trim().toLowerCase();
  delete store[key];
  saveOtpStore(store);
}

// ── Password Recovery via Mobile (OTP-based) ──
export async function initiatePasswordRecovery(identifier) {
  // Check if account is locked
  if (isAccountLocked(identifier)) {
    return { success: false, error: 'account_locked', remaining: getLockoutRemaining(identifier) };
  }

  // Generate OTP
  const otp = generateAndStoreOtp(identifier);

  // In a real system, this would send SMS/email
  // For now, we return the OTP for demo purposes
  return { success: true, otp, expires_in: OTP_EXPIRY_MINUTES };
}

export async function verifyPasswordRecoveryOtp(identifier, otpCode) {
  const result = verifyOtp(identifier, otpCode);
  if (!result.success) {
    return { success: false, error: result.error };
  }
  // OTP verified — user can now set a new password
  return { success: true, token: `recovery_${Date.now().toString(36)}` };
}

// ── Sensitive Operation OTP ──
// For operations like large transfers, deleting records, etc.
export async function requireOtpForOperation(identifier, operationType) {
  if (!identifier) return { required: false };
  const otp = generateAndStoreOtp(identifier);
  return {
    required: true,
    otp,
    operation: operationType,
    expires_in: OTP_EXPIRY_MINUTES,
  };
}

export function verifyOperationOtp(identifier, otpCode) {
  return verifyOtp(identifier, otpCode);
}

export { MAX_ATTEMPTS, LOCKOUT_MINUTES, OTP_EXPIRY_MINUTES };