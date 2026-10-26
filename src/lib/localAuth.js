// Local-first authentication — saves users/exchanges in localStorage
// so the app can be tested without any Supabase connection.
//
// رمز عبور به‌صورت هش‌شده ذخیره می‌شود، نه متن ساده.

import { applyCreatorRole } from '@/lib/creatorAuth';

const USERS_KEY = 'local_users_db';
const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

// ============================================================
// ساخت حساب سازنده در localStorage حذف شد — احراز هویت سازنده
// اکنون منحصراً از طریق بک‌اند (Supabase + Secret) انجام می‌شود.
// کاربرانی که در localStorage ثبت‌شده‌اند همچنان قابل ورود هستند.
// ============================================================
try {
  if (localStorage.getItem('test_users_cleaned') !== 'true') {
    clearTestUsers();
    localStorage.setItem('test_users_cleaned', 'true');
  }
} catch {
  // ignore — localStorage may not be available in SSR
}

// ============================================================
// هش رمز عبور (همگام — برای کاربران محلی)
// برای کش امن‌تر، credentialCache.js از SHA-256 استفاده می‌کند.
// ============================================================
function hashPassword(password) {
  const salt = 'sarraf_local_v2';
  const salted = `${salt}::${password}::${salt}`;
  let hash = 5381;
  for (let i = 0; i < salted.length; i++) {
    hash = ((hash << 5) + hash) + salted.charCodeAt(i);
    hash = hash & hash;
  }
  return `lh_${Math.abs(hash).toString(36)}`;
}

function verifyPassword(password, stored) {
  if (!stored) return false;
  // فرمت جدید: هش‌شده
  if (stored.startsWith('lh_')) {
    return hashPassword(password) === stored;
  }
  // فرمت قدیمی: متن ساده (برای مهاجرت — بعد از ورود، به هش تبدیل می‌شود)
  return password === stored;
}

function getUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function genId() {
  return 'local-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function genExchangeCode() {
  // Sequential code: find highest existing EX-NNNNN and increment
  try {
    const users = getUsers();
    let max = 10000;
    for (const u of users) {
      if (u.exchange_code) {
        const m = u.exchange_code.match(/(\d+)$/);
        if (m) max = Math.max(max, parseInt(m[1]));
      }
    }
    // Also check cached SarraafProfile records
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('cache_v2_SarraafProfile_')) {
        try {
          const profiles = JSON.parse(localStorage.getItem(key) || '[]');
          for (const p of profiles) {
            if (p.code) {
              const m = p.code.match(/(\d+)$/);
              if (m) max = Math.max(max, parseInt(m[1]));
            }
          }
        } catch {}
      }
    }
    return `EX-${max + 1}`;
  } catch {
    const num = Math.floor(10000 + Math.random() * 90000);
    return `EX-${num}`;
  }
}

function makeToken(userId, role) {
  // Simple opaque token — just identifies the user locally
  return btoa(`${userId}:${role}:${Date.now()}`);
}

// Write a SarraafProfile record into the offline cache so the dashboard
// picks up the exchange name, code, and quota without any server call.
function seedSarraafProfile(user, exchange) {
  try {
    const cacheKey = `cache_v2_SarraafProfile_${exchange.exchange_code}`;
    const existing = JSON.parse(localStorage.getItem(cacheKey) || '[]');
    const profile = {
      id: user.id,
      code: exchange.exchange_code,
      user_id: user.id,
      exchange_name: exchange.exchange_name,
      name: user.full_name,
      phone: user.mobile,
      email: user.email || '',
      quota_limit: 100,
      quota_used: 0,
      plan: 'free',
      status: 'active',
      created_date: new Date().toISOString(),
      updated_date: new Date().toISOString(),
    };
    if (!existing.some(p => p.id === profile.id)) {
      existing.unshift(profile);
      localStorage.setItem(cacheKey, JSON.stringify(existing));
    }
  } catch {
    // ignore cache errors
  }
}

function publicUser(u) {
  const safe = { ...u };
  delete safe.password;
  delete safe.password_hash;
  return safe;
}

function storeSession(user, exchange) {
  // Clear any leftover preview-mode flags so real local users
  // don't see the preview badge / tour bar.
  localStorage.removeItem('preview_mode');
  localStorage.removeItem('preview_user');
  const mappedUser = applyCreatorRole({
    id: String(user.id),
    full_name: user.full_name,
    mobile: user.mobile,
    username: user.username,
    email: user.email || '',
    role: user.role,
    account_type: user.role === 'creator' ? 'admin' : user.role,
    status: user.status || 'active',
    exchange_code: exchange?.exchange_code || user.exchange_code || '',
    exchange_name: exchange?.exchange_name || user.exchange_name || '',
    isLocal: true,
  });
  // اطلاعات سازنده هرگز در localStorage ذخیره نمی‌شود
  if (mappedUser.role !== 'creator') {
    localStorage.setItem(USER_KEY, JSON.stringify(mappedUser));
  }
  localStorage.setItem(TOKEN_KEY, user._token || makeToken(user.id, mappedUser.role));
}

export function registerExchange(data) {
  const { exchange_name, full_name, mobile, username, password, email, country, city } = data;
  if (!exchange_name || !full_name || !mobile || !username || !password) {
    return { success: false, error: 'missing_fields' };
  }

  const users = getUsers();
  if (users.some(u => u.mobile === mobile)) {
    return { success: false, error: 'mobile_exists' };
  }
  if (users.some(u => u.username === username)) {
    return { success: false, error: 'username_exists' };
  }

  const exchangeCode = genExchangeCode();
  const newUser = {
    id: genId(),
    full_name,
    mobile,
    username,
    password_hash: hashPassword(password),
    email: email && email.trim() ? email.trim() : '',
    role: 'exchange',
    status: 'active',
    exchange_code: exchangeCode,
    exchange_name: exchange_name,
    country: country || '',
    city: city || '',
  };

  newUser._token = makeToken(newUser.id, newUser.role);
  users.push(newUser);
  saveUsers(users);

  const exchange = {
    exchange_code: exchangeCode,
    exchange_name,
    country: country || '',
    city: city || '',
  };

  storeSession(newUser, exchange);
  seedSarraafProfile(newUser, exchange);
  return { success: true, user: publicUser(newUser), exchange, token: newUser._token };
}

export function registerCustomer(data) {
  const { full_name, mobile, username, password, email } = data;
  if (!full_name || !mobile || !username || !password) {
    return { success: false, error: 'missing_fields' };
  }

  const users = getUsers();
  if (users.some(u => u.mobile === mobile)) {
    return { success: false, error: 'mobile_exists' };
  }
  if (users.some(u => u.username === username)) {
    return { success: false, error: 'username_exists' };
  }

  const newUser = {
    id: genId(),
    full_name,
    mobile,
    username,
    password_hash: hashPassword(password),
    email: email && email.trim() ? email.trim() : '',
    role: 'customer',
    status: 'active',
  };

  newUser._token = makeToken(newUser.id, newUser.role);
  users.push(newUser);
  saveUsers(users);

  storeSession(newUser, null);
  return { success: true, user: publicUser(newUser), token: newUser._token };
}

export function login(identifier, password) {
  if (!identifier || !password) {
    return { success: false, error: 'missing_fields' };
  }

  const users = getUsers();
  // اگر ایمیل سازنده وارد شد، مستقیماً نقش ادمین بده
  const user = users.find(u =>
    u.username === identifier || u.mobile === identifier ||
    (u.email && u.email.toLowerCase() === identifier.toLowerCase().trim())
  );

  if (!user) {
    return { success: false, error: 'user_not_found' };
  }

  const storedHash = user.password_hash || user.password;
  if (!verifyPassword(password, storedHash)) {
    return { success: false, error: 'wrong_password' };
  }

  // مهاجرت: اگر رمز به‌صورت متن ساده ذخیره شده بود، به هش تبدیل کن
  if (!user.password_hash && user.password) {
    user.password_hash = hashPassword(password);
    delete user.password;
    saveUsers(users);
  }

  if (user.status === 'inactive' || user.status === 'suspended') {
    return { success: false, error: 'user_inactive' };
  }

  const exchange = user.exchange_code ? {
    exchange_code: user.exchange_code,
    exchange_name: user.exchange_name,
  } : null;

  storeSession(user, exchange);
  const finalUser = applyCreatorRole(publicUser(user));
  return { success: true, user: finalUser, exchange, token: user._token || makeToken(user.id, finalUser.role) };
}

export function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
  } catch {
    return null;
  }
}

export function clearTestUsers() {
  try {
    const users = getUsers();
    // تمام کاربران محلی پاک می‌شوند — اطلاعات سازنده هرگز در localStorage ذخیره نمی‌شود
    if (users.length > 0) {
      saveUsers([]);
    }
    // نشست فعلی را هم پاک می‌کنیم تا ورود تازه انجام شود
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

export function logout() {
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(TOKEN_KEY);
}

export function isAuthenticated() {
  return !!localStorage.getItem(TOKEN_KEY);
}

export function changePassword(oldPassword, newPassword) {
  const currentUser = getCurrentUser();
  if (!currentUser) return { success: false, error: 'not_logged_in' };

  const users = getUsers();
  const user = users.find(u => u.id === currentUser.id);
  if (!user) return { success: false, error: 'user_not_found' };

  const storedHash = user.password_hash || user.password;
  if (!verifyPassword(oldPassword, storedHash)) {
    return { success: false, error: 'wrong_password' };
  }

  user.password_hash = hashPassword(newPassword);
  delete user.password;
  saveUsers(users);
  return { success: true };
}