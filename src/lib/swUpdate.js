// کنترل‌کنندهٔ به‌روزرسانی Service Worker
// - هنگام بارگذاری و بازگشت اینترنت، نسخهٔ جدید SW را بررسی می‌کند.
// - پس از آماده‌شدن نسخهٔ جدید، آن را فعال و صفحه را یک‌بار بازخوانی می‌کند.
// - هیچ دادهٔ کاربر، کوکی یا پایگاه‌داده‌ای پاک نمی‌شود.

let reloading = false;

export function setupSWUpdate() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  if (import.meta.env.DEV) return;

  // ثبت SW در صورت نبود (محل ثبت اصلی در index.html است؛ این فقط تضمین می‌کند)
  navigator.serviceWorker.register('/sw.js').catch(() => {});

  // وقتی SW جدیدی کنترل را به‌دست می‌گیرد، یک‌بار صفحه بازخوانی می‌شود
  // تا منابع نسخهٔ جدید بارگذاری شوند.
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return;
    reloading = true;
    window.location.reload();
  });

  // هنگام بازگشت اینترنت، بررسی به‌روزرسانی انجام می‌شود
  window.addEventListener('online', () => {
    navigator.serviceWorker.getRegistration?.().then((reg) => reg?.update?.());
  });
}