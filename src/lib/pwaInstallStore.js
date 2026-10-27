/**
 * pwaInstallStore — حالت نصب PWA به‌صورت سراسری.
 *
 * رویداد beforeinstallprompt فقط یک‌بار و خیلی زود (قبل از بارگذاری صفحه‌های lazy) ارسال می‌شود.
 * این ماژول در main.jsx بارگذاری می‌شود تا رویداد هرگز از دست نرود و همهٔ صفحه‌ها
 * (Welcome، Layout و ...) یک منبع واحد داشته باشند.
 *
 * نکتهٔ مهم: دسترسی به localStorage در بعضی WebViewها و حالت‌های حریم خصوصی ممکن است خطا بدهد.
 * این ماژول هنگام import شدن اجرا می‌شود؛ پس خطای storage نباید جلوی راه‌اندازی کل برنامه را بگیرد.
 */
const INSTALLED_KEY = 'pwa_installed_v2';

function safeStorageSet(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage is optional; app startup must still work if it is blocked.
  }
}

function safeStorageRemove(key) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Storage is optional; app startup must still work if it is blocked.
  }
}

function isStandalone() {
  try {
    return (
      (typeof window.matchMedia === 'function' &&
        window.matchMedia('(display-mode: standalone)').matches) ||
      window.navigator.standalone === true
    );
  } catch {
    return false;
  }
}

function readInstalled() {
  if (isStandalone()) {
    safeStorageSet(INSTALLED_KEY, '1');
    return true;
  }
  // پرچم localStorage ممکن است قدیمی باشد (نصب قبلی که حذف شده).
  // فقط وضعیت واقعی standalone ملاک است؛ قبل‌از‌نصب بومی canInstall مشخص می‌کند.
  safeStorageRemove(INSTALLED_KEY);
  return false;
}

// رویداد beforeinstallprompt ممکن است قبل از بارگذاری این ماژول اجرا شده باشد.
// در این حالت اسکریپت اولیهٔ index.html آن را روی window ذخیره کرده است.
let deferredPrompt = window.__pwaDeferredPrompt || null;
let state = { canInstall: !!deferredPrompt, installed: readInstalled() };
if (window.__pwaDeferredPrompt) {
  window.__pwaDeferredPrompt = null;
}
const listeners = new Set();

function setState(next) {
  state = { ...state, ...next };
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // One subscriber must not break the shared install store.
    }
  });
}

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  if (isStandalone()) return;
  deferredPrompt = event;
  // مرورگر فقط وقتی برنامه نصب نیست پیشنهاد نصب می‌دهد؛ پس پرچم نصب قدیمی را پاک کن.
  safeStorageRemove(INSTALLED_KEY);
  setState({ canInstall: true, installed: false });
});

// appinstalled تنها مرجع تأیید واقعی تکمیل نصب است.
window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  safeStorageSet(INSTALLED_KEY, '1');
  setState({ canInstall: false, installed: true });
});

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getState() {
  return state;
}

/**
 * پنجرهٔ بومی نصب را باز می‌کند.
 * @returns {Promise<'accepted'|'dismissed'|'unavailable'>}
 */
export async function promptInstall() {
  if (!deferredPrompt) return 'unavailable';
  const event = deferredPrompt;
  deferredPrompt = null;
  setState({ canInstall: false });
  try {
    await event.prompt();
    const choice = await event.userChoice;
    return choice?.outcome === 'accepted' ? 'accepted' : 'dismissed';
  } catch {
    return 'dismissed';
  }
}
