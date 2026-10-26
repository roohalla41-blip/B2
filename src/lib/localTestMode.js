/**
 * حالت تست محلی (Local Test Mode)
 *
 * وقتی فعال باشد:
 * - تمام عملیات داده فقط در localStorage ذخیره می‌شوند
 * - هیچ داده‌ای به Supabase ارسال/ویرایش/حذف نمی‌شود
 * - همگام‌سازی با سرور غیرفعال می‌شود
 * - ورود فقط با کاربران محلی انجام می‌شود
 *
 * برای غیرفعال کردن (بازگشت به Supabase):
 *   localStorage.setItem('local_test_mode', 'false')
 *   سپس صفحه را بازخوانی کنید
 *
 * ساختار اصلی Supabase و دیتابیس دست‌نخورده باقی می‌ماند.
 */

const FLAG_KEY = 'local_test_mode';

export function isLocalTestMode() {
  try {
    const v = localStorage.getItem(FLAG_KEY);
    if (v === 'true') return true;
    // پیش‌فرض: غیرفعال — برنامه به Supabase متصل می‌شود
    // در صورت قطع اینترنت، داده‌ها در حافظه محلی ذخیره و پس از اتصال همگام می‌شوند
    if (v === null) {
      localStorage.setItem(FLAG_KEY, 'false');
    }
    return false;
  } catch {
    return false;
  }
}

export function enableLocalTestMode() {
  try {
    localStorage.setItem(FLAG_KEY, 'true');
  } catch {
    // ignore
  }
}

export function disableLocalTestMode() {
  try {
    localStorage.setItem(FLAG_KEY, 'false');
  } catch {
    // ignore
  }
}