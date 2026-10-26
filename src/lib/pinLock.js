// pinLock.js — Local PIN & biometric lock management (Base44-independent)
//
// PIN خام هرگز در localStorage یا Supabase ذخیره نمی‌شود.
// فقط هش PBKDF2 + نمک تصادفی نگهداری می‌شود.
// بیومتریک بومی در زمان اجرای فعلی (WebView Base44) در دسترس نیست؛
// قفل برنامه فقط از طریق PIN ۴ رقمی کار می‌کند.
//
// محدودیت‌ها:
// - در محیط وب/PWA، localStorage از طریق DevTools قابل دسترسی است.
//   قفل رابط کاربری مانع دسترسی بصری می‌شود اما رمزنگاری واقعی
//   توکن نشست در وب تضمین‌نشده است. برای محافظت سخت‌افزاری
//   باید از Keychain/Keystore بومی استفاده شود.
// - PIN چهاررقمی در برابر حدس آفلاین ضعیف است؛ محدودیت تلاش
//   در مرورگر به‌تنهایی قابل اتکا نیست.

const PIN_HASH_KEY = 'app_pin_hash_v1';
const PIN_SALT_KEY = 'app_pin_salt_v1';
const PIN_ATTEMPTS_KEY = 'app_pin_attempts_v1';
const PIN_LOCKOUT_KEY = 'app_pin_lockout_v1';
const LOCKED_AT_KEY = 'app_locked_at_v1';
const LAST_UNLOCK_KEY = 'app_last_unlock_v1';

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 30_000; // 30 seconds lockout
const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

// ── Web Crypto helpers ──

async function deriveHash(pin, saltBytes) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(pin),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: 100_000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );
  return Array.from(new Uint8Array(bits))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function bytesToBase64(bytes) {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function base64ToBytes(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// ── PIN management ──

export function isPinSet() {
  try {
    return !!localStorage.getItem(PIN_HASH_KEY) && !!localStorage.getItem(PIN_SALT_KEY);
  } catch {
    return false;
  }
}

export async function setPin(pin) {
  if (!/^\d{4}$/.test(pin)) {
    return { success: false, error: 'pin_must_be_4_digits' };
  }
  try {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const hash = await deriveHash(pin, salt);
    localStorage.setItem(PIN_HASH_KEY, hash);
    localStorage.setItem(PIN_SALT_KEY, bytesToBase64(salt));
    resetAttempts();
    return { success: true };
  } catch (e) {
    return { success: false, error: 'crypto_error', message: e.message };
  }
}

export function clearPin() {
  try {
    localStorage.removeItem(PIN_HASH_KEY);
    localStorage.removeItem(PIN_SALT_KEY);
    resetAttempts();
  } catch { /* ignore */ }
}

export async function verifyPin(pin) {
  if (!isPinSet()) return { success: false, error: 'pin_not_set' };
  if (!/^\d{4}$/.test(pin)) return { success: false, error: 'pin_must_be_4_digits' };

  // Check lockout
  const lockout = getLockoutUntil();
  if (lockout && Date.now() < lockout) {
    const remaining = Math.ceil((lockout - Date.now()) / 1000);
    return { success: false, error: 'locked_out', remaining };
  }

  try {
    const storedHash = localStorage.getItem(PIN_HASH_KEY);
    const saltB64 = localStorage.getItem(PIN_SALT_KEY);
    if (!storedHash || !saltB64) return { success: false, error: 'pin_not_set' };

    const salt = base64ToBytes(saltB64);
    const hash = await deriveHash(pin, salt);

    if (hash === storedHash) {
      resetAttempts();
      markUnlocked();
      return { success: true };
    }
  } catch (e) {
    return { success: false, error: 'crypto_error', message: e.message };
  }

  // Wrong PIN
  const attempts = incrementAttempts();
  if (attempts >= MAX_ATTEMPTS) {
    triggerLockout();
    return { success: false, error: 'locked_out', remaining: LOCKOUT_MS / 1000 };
  }
  return {
    success: false,
    error: 'wrong_pin',
    attemptsRemaining: MAX_ATTEMPTS - attempts,
  };
}

// ── Attempt limiting ──

function getAttempts() {
  try {
    return parseInt(localStorage.getItem(PIN_ATTEMPTS_KEY) || '0', 10);
  } catch {
    return 0;
  }
}

function incrementAttempts() {
  const n = getAttempts() + 1;
  try { localStorage.setItem(PIN_ATTEMPTS_KEY, String(n)); } catch { /* ignore */ }
  return n;
}

function resetAttempts() {
  try {
    localStorage.removeItem(PIN_ATTEMPTS_KEY);
    localStorage.removeItem(PIN_LOCKOUT_KEY);
  } catch { /* ignore */ }
}

function getLockoutUntil() {
  try {
    const v = localStorage.getItem(PIN_LOCKOUT_KEY);
    return v ? parseInt(v, 10) : 0;
  } catch {
    return 0;
  }
}

function triggerLockout() {
  try {
    localStorage.setItem(PIN_LOCKOUT_KEY, String(Date.now() + LOCKOUT_MS));
  } catch { /* ignore */ }
}

export function getLockState() {
  const pinSet = isPinSet();
  const attempts = getAttempts();
  const lockout = getLockoutUntil();
  const now = Date.now();
  const isLockedOut = lockout > now;
  const remaining = isLockedOut ? Math.ceil((lockout - now) / 1000) : 0;
  return {
    pinSet,
    isLockedOut,
    remaining,
    attemptsRemaining: Math.max(0, MAX_ATTEMPTS - attempts),
  };
}

// ── Lock state (when to show lock) ──

export function markAppHidden() {
  try {
    localStorage.setItem(LOCKED_AT_KEY, String(Date.now()));
  } catch { /* ignore */ }
}

export function markUnlocked() {
  try {
    localStorage.setItem(LAST_UNLOCK_KEY, String(Date.now()));
    localStorage.removeItem(LOCKED_AT_KEY);
  } catch { /* ignore */ }
}

export function shouldShowLock() {
  if (!isPinSet()) return false;

  const lockedAt = parseInt(localStorage.getItem(LOCKED_AT_KEY) || '0', 10);
  const lastUnlock = parseInt(localStorage.getItem(LAST_UNLOCK_KEY) || '0', 10);

  // App was hidden → lock immediately
  if (lockedAt > 0 && lockedAt > lastUnlock) return true;

  // Idle timeout: if last unlock was more than IDLE_TIMEOUT_MS ago
  if (lastUnlock > 0 && Date.now() - lastUnlock > IDLE_TIMEOUT_MS) return true;

  // Fresh app load: if PIN is set but never unlocked in this session
  if (lastUnlock === 0) return true;

  return false;
}

export function getLockoutRemaining() {
  const lockout = getLockoutUntil();
  const now = Date.now();
  if (lockout > now) return Math.ceil((lockout - now) / 1000);
  return 0;
}