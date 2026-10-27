/**
 * ماژول احراز هویت آفلاین
 * — ثبت‌نام آفلاین در localStorage
 * — ورود آفلاین با حساب‌های محلی
 * — همگام‌سازی خودکار هنگام آنلاین شدن
 */

const OFFLINE_USERS_KEY = 'offline_users';
const OFFLINE_SYNC_QUEUE = 'offline_sync_queue';

// ============================================================
// هش ساده رمز عبور (برای ذخیره آفلاین)
// ============================================================
function hashPassword(password) {
  let hash = 0;
  const salted = `sarraf_salt_${password}_v1`;
  for (let i = 0; i < salted.length; i++) {
    const char = salted.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `h_${Math.abs(hash).toString(36)}`;
}

function verifyPassword(password, storedHash) {
  return hashPassword(password) === storedHash;
}

// ============================================================
// مدیریت کاربران آفلاین
// ============================================================
function getOfflineUsers() {
  try {
    const raw = localStorage.getItem(OFFLINE_USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveOfflineUsers(users) {
  try {
    localStorage.setItem(OFFLINE_USERS_KEY, JSON.stringify(users));
  } catch {
    // ignore
  }
}

export function findOfflineUser(identifier) {
  const users = getOfflineUsers();
  const id = identifier.trim().toLowerCase();
  return users.find(
    (u) => u.mobile === identifier.trim() || (u.username && u.username.toLowerCase() === id)
  );
}

// ============================================================
// ثبت‌نام آفلاین
// ============================================================
export function registerOffline({ full_name, mobile, password }) {
  const users = getOfflineUsers();

  // بررسی تکراری نبودن
  if (users.find((u) => u.mobile === mobile.trim())) {
    return { success: false, error: 'mobile_exists' };
  }

  const newUser = {
    id: `offline_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    full_name: full_name.trim(),
    mobile: mobile.trim(),
    username: mobile.trim(),
    role: 'customer',
    account_type: 'customer',
    status: 'active',
    password_hash: hashPassword(password),
    exchange_code: '',
    exchange_name: '',
    isOffline: true,
    created_offline_at: new Date().toISOString(),
  };

  users.push(newUser);
  saveOfflineUsers(users);

  // افزودن به صف همگام‌سازی
  addToSyncQueue({
    type: 'register',
    payload: { full_name: newUser.full_name, mobile: newUser.mobile, password },
    offline_user_id: newUser.id,
  });

  return { success: true, user: newUser };
}

// ============================================================
// ورود آفلاین
// ============================================================
export function loginOffline(identifier, password) {
  const user = findOfflineUser(identifier);
  if (!user) {
    return { success: false, error: 'user_not_found' };
  }
  if (user.status !== 'active') {
    return { success: false, error: 'user_inactive' };
  }
  if (!verifyPassword(password, user.password_hash)) {
    return { success: false, error: 'wrong_password' };
  }

  // بدون رمز عبور
  const { password_hash, ...safeUser } = user;
  // اگر ایمیل سازنده است، نقش ادمین بده
  if (safeUser.email && safeUser.email.toLowerCase() === 'roohalla41@gmail.com') {
    safeUser.role = 'admin';
    safeUser.account_type = 'admin';
  }
  return { success: true, user: safeUser };
}

// ============================================================
// صف همگام‌سازی
// ============================================================
function getSyncQueue() {
  try {
    const raw = localStorage.getItem(OFFLINE_SYNC_QUEUE);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSyncQueue(queue) {
  try {
    localStorage.setItem(OFFLINE_SYNC_QUEUE, JSON.stringify(queue));
  } catch {
    // ignore
  }
}

function addToSyncQueue(item) {
  const queue = getSyncQueue();
  queue.push({ ...item, attempts: 0, added_at: new Date().toISOString() });
  saveSyncQueue(queue);
}

// ============================================================
// همگام‌سازی کاربران آفلاین با سرور
// ============================================================
export async function syncOfflineUsers(invokeFn) {
  const queue = getSyncQueue();
  if (queue.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;
  const remaining = [];

  for (const item of queue) {
    try {
      if (item.type === 'register') {
        const res = await invokeFn('supabase', {
          action: 'registerCustomer',
          full_name: item.payload.full_name,
          mobile: item.payload.mobile,
          password: item.payload.password,
        });

        if (res.data?.success) {
          // کاربر آفلاین را به‌روزرسانی کن — دیگر آفلاین نیست
          const users = getOfflineUsers();
          const idx = users.findIndex((u) => u.id === item.offline_user_id);
          if (idx !== -1) {
            users[idx].isOffline = false;
            users[idx].synced_at = new Date().toISOString();
            users[idx].server_id = res.data.user?.id;
            saveOfflineUsers(users);
          }
          synced++;
        } else {
          // اگر موبایل قبلاً در سرور ثبت شده، کاربر را همگام‌شده بفرض کن
          if (res.data?.error === 'mobile_exists') {
            const users = getOfflineUsers();
            const idx = users.findIndex((u) => u.id === item.offline_user_id);
            if (idx !== -1) {
              users[idx].isOffline = false;
              users[idx].synced_at = new Date().toISOString();
              saveOfflineUsers(users);
            }
            synced++;
          } else {
            item.attempts = (item.attempts || 0) + 1;
            if (item.attempts < 5) remaining.push(item);
            failed++;
          }
        }
      }
    } catch {
      item.attempts = (item.attempts || 0) + 1;
      if (item.attempts < 5) remaining.push(item);
      failed++;
    }
  }

  saveSyncQueue(remaining);
  return { synced, failed };
}

// ============================================================
// بررسی وضعیت اتصال
// ============================================================
export function hasOfflineUsers() {
  return getOfflineUsers().length > 0;
}

export function hasPendingSync() {
  return getSyncQueue().length > 0;
}