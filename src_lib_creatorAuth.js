// ============================================================
// احراز هویت سازنده (Creator Auth)
// ایمیل سازنده دیگر در فرانت‌اند ذخیره نمی‌شود.
// نقش سازنده منحصراً از بک‌اند (Supabase + Secret: CREATOR_EMAIL) تعیین می‌شود.
// ============================================================

import { normalizeRole } from '@/lib/rbac';

// بررسی اینکه آیا کاربر نقش سازنده دارد یا خیر (بر اساس نقش بک‌اند)
export function isCreatorUser(user) {
  if (!user) return false;
  return user.role === 'creator';
}

// نرمال‌سازی نقش کاربر — اگر بک‌اند نقش 'creator' داده باشد،
// account_type و status را تنظیم می‌کند.
export function applyCreatorRole(user) {
  if (!user) return user;
  const normalizedRole = normalizeRole(user.role);
  if (normalizedRole === 'creator') {
    return {
      ...user,
      role: 'creator',
      account_type: 'admin',
      status: user.status || 'active',
    };
  }
  if (normalizedRole !== user.role) {
    return { ...user, role: normalizedRole };
  }
  return user;
}