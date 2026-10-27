/**
 * کش امن اعتبارنامه‌ها برای ورود آفلاین
 *
 * پس از یک ورود موفق آنلاین، اعتبارنامه‌ها (به‌صورت هش‌شده) روی دستگاه ذخیره می‌شوند
 * تا کاربر بتواند در صورت قطع اینترنت روی همان دستگاه وارد شود.
 *
 * رمز عبور هرگز به‌صورت متن ساده ذخیره نمی‌شود — از SHA-256 با salt تصادفی استفاده می‌شود.
 */

const CREDENTIAL_CACHE_KEY = 'offline_credential_cache';

// ============================================================
// هش امن رمز عبور با SHA-256 + salt (async)
// ============================================================
async function hashPassword(password, salt) {
  // استفاده از SubtleCrypto اگر در دسترس باشد (مرورگرهای مدرن و WebView)
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(`${salt}::${password}`);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return 'sha256:' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // fall through to fallback
    }
  }
  // Fallback: هش همگام (بهتر از متن ساده)
  let hash = 5381;
  const salted = `${salt}::${password}::v2`;
  for (let i = 0; i < salted.length; i++) {
    hash = ((hash << 5) + hash) + salted.charCodeAt(i);
    hash = hash & hash;
  }
  return 'h_' + Math.abs(hash).toString(36);
}

function genSalt() {
  return Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
}

// ============================================================
// مدیریت کش
// ============================================================
function getCache() {
  try {
    return JSON.parse(localStorage.getItem(CREDENTIAL_CACHE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveCache(cache) {
  try {
    localStorage.setItem(CREDENTIAL_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // storage full — ignore
  }
}

function matchEntry(cache, identifier) {
  const id = identifier.trim().toLowerCase();
  return cache.find(c =>
    c.identifier === id ||
    c.mobile === identifier.trim() ||
    (c.username && c.username.toLowerCase() === id)
  ) || null;
}

// ============================================================
// API عمومی
// ============================================================

/**
 * پس از ورود موفق آنلاین، اعتبارنامه‌ها را برای استفاده آفلاین کش کن.
 * @param {string} identifier - نام کاربری/موبایل/ایمیل
 * @param {string} password - رمز عبور (هش می‌شود، متن ساده ذخیره نمی‌شود)
 * @param {object} userData - اطلاعات کاربر برگشتی از سرور
 */
export async function cacheCredentialsForOffline(identifier, password, userData) {
  const cache = getCache();
  const salt = genSalt();
  const passwordHash = await hashPassword(password, salt);

  // حذف رکورد قبلی برای این شناسه
  const filtered = cache.filter(c =>
    c.identifier !== identifier.trim().toLowerCase() &&
    c.mobile !== identifier.trim()
  );

  filtered.push({
    identifier: identifier.trim().toLowerCase(),
    mobile: userData.mobile || identifier.trim(),
    username: userData.username || '',
    user_id: String(userData.id || ''),
    full_name: userData.full_name || userData.name || '',
    role: userData.role || 'exchange',
    account_type: userData.account_type || (userData.role === 'creator' ? 'admin' : userData.role),
    exchange_code: userData.exchange_code || '',
    exchange_name: userData.exchange_name || '',
    salt,
    password_hash: passwordHash,
    cached_at: new Date().toISOString(),
  });

  saveCache(filtered);
}

/**
 * تلاش برای ورود آفلاین — فقط با اعتبارنامه‌های کش‌شده روی همین دستگاه.
 * @returns {Promise<{success: boolean, user?: object, error?: string}>}
 */
export async function offlineLogin(identifier, password) {
  const cache = getCache();
  const entry = matchEntry(cache, identifier);

  if (!entry) {
    return { success: false, error: 'user_not_found' };
  }

  const passwordHash = await hashPassword(password, entry.salt);
  if (passwordHash !== entry.password_hash) {
    return { success: false, error: 'wrong_password' };
  }

  const user = {
    id: entry.user_id,
    full_name: entry.full_name,
    name: entry.full_name,
    mobile: entry.mobile,
    username: entry.username,
    role: entry.role,
    account_type: entry.account_type,
    status: 'active',
    exchange_code: entry.exchange_code,
    exchange_name: entry.exchange_name,
    isOffline: true,
  };

  return { success: true, user };
}

/**
 * بررسی اینکه آیا کاربری با این شناسه قبلاً روی دستگاه وارد شده یا خیر.
 */
export function findCachedUser(identifier) {
  const cache = getCache();
  return matchEntry(cache, identifier);
}

/**
 * آیا هیچ اعتبارنامه‌ای کش شده است؟
 */
export function hasCachedCredentials() {
  return getCache().length > 0;
}