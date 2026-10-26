// offlineLimits.js — Central offline queue limit configuration
//
// محدودیت ذخیره اطلاعات آفلاین:
// - نسخه رایگان: ۲۰ مورد (قابل تنظیم توسط ادمین از پنل سازنده)
// - نسخه پولی: نامحدود
// - مقدار محدودیت از PlanQuota خوانده می‌شود (feature_key = 'offline_sync')
// - هیچ جای دیگری این مقدار هاردکد نشده است.

export const DEFAULT_FREE_OFFLINE_LIMIT = 20;
const QUOTA_CACHE_PREFIX = 'cache_v2_PlanQuota';
const PROFILE_CACHE_PREFIX = 'cache_v2_SarraafProfile_';
const QUEUE_KEY = 'pending_writes_v2';

// ── Read current profile from localStorage cache (sync) ──
function readProfileFromCache() {
  try {
    const raw = localStorage.getItem('auth_user');
    if (!raw) return null;
    const user = JSON.parse(raw);
    const tenantKey = user?.exchange_code || '';
    const key = tenantKey ? `${PROFILE_CACHE_PREFIX}${tenantKey}` : PROFILE_CACHE_PREFIX;
    const profiles = JSON.parse(localStorage.getItem(key) || '[]');
    if (!profiles || profiles.length === 0) return null;
    return profiles.find(p => p.user_id === user.id) || profiles[0] || null;
  } catch {
    return null;
  }
}

// ── Read PlanQuota records from localStorage cache (sync) ──
function readPlanQuotasFromCache() {
  const results = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(QUOTA_CACHE_PREFIX)) {
        try {
          const items = JSON.parse(localStorage.getItem(key) || '[]');
          if (Array.isArray(items)) results.push(...items);
        } catch {}
      }
    }
  } catch {}
  return results;
}

// ── Read pending count directly from localStorage (sync, no circular dep) ──
function getPendingCountSync() {
  try {
    const q = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    return Array.isArray(q) ? q.length : 0;
  } catch {
    return 0;
  }
}

// ── Is the user on a paid plan? ──
export function isPaidUser(profile) {
  if (!profile) return false;
  const plan = profile.plan || 'free';
  if (plan === 'free') return false;
  const paidEnd = profile.paid_end_date || profile.quota_end_date;
  if (paidEnd && new Date(paidEnd) < new Date()) return false;
  return true;
}

// ── Get the offline queue limit for a profile ──
// Returns -1 for unlimited (paid), or a positive number for free
export function getOfflineQueueLimit(profile) {
  if (!profile) return DEFAULT_FREE_OFFLINE_LIMIT;
  if (isPaidUser(profile)) return -1; // unlimited
  // Free user — check PlanQuota config
  const quotas = readPlanQuotasFromCache();
  const q = quotas.find(qx => qx.plan === 'free' && qx.feature_key === 'offline_sync');
  if (q && typeof q.max_custom === 'number' && q.max_custom > 0) return q.max_custom;
  return DEFAULT_FREE_OFFLINE_LIMIT;
}

// ── Is the offline queue at capacity? ──
export function isOfflineQueueFull() {
  const profile = readProfileFromCache();
  const limit = getOfflineQueueLimit(profile);
  if (limit < 0) return false; // unlimited
  return getPendingCountSync() >= limit;
}

// ── Remaining slots in the offline queue ──
export function getOfflineQueueRemaining() {
  const profile = readProfileFromCache();
  const limit = getOfflineQueueLimit(profile);
  if (limit < 0) return Infinity;
  return Math.max(0, limit - getPendingCountSync());
}

// ── Get current pending count (sync) ──
export function getOfflinePendingCount() {
  return getPendingCountSync();
}