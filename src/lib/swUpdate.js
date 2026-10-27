// کنترل‌کنندهٔ به‌روزرسانی Service Worker
// مسیر ثبت باید با مسیر استقرار برنامه در GitHub Pages سازگار باشد.

let reloading = false;

export function setupSWUpdate() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  if (import.meta.env.DEV) return;

  const serviceWorkerUrl = `${import.meta.env.BASE_URL}sw.js`;
  navigator.serviceWorker.register(serviceWorkerUrl).catch(() => {});

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return;
    reloading = true;
    window.location.reload();
  });

  window.addEventListener('online', () => {
    navigator.serviceWorker.getRegistration?.(serviceWorkerUrl).then((reg) => reg?.update?.());
  });
}
