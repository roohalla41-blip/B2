/**
 * pwaInstallStore — حالت نصب PWA به‌صورت سراسری.
 *
 * رویداد beforeinstallprompt فقط یک‌بار و خیلی زود (قبل از بارگذاری صفحه‌های lazy) ارسال می‌شود.
 * این ماژول در main.jsx بارگذاری می‌شود تا رویداد هرگز از دست نرود و همهٔ صفحه‌ها
 * (Welcome، Layout و ...) یک منبع واحد داشته باشند.
 */
const INSTALLED_KEY = 'pwa_installed_v2';

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

function readInstalled() {
  if (isStandalone()) {
    localStorage.setItem(INSTALLED_KEY, '1');
    return true;
  }
  // پرچم localStorage ممکن است قدیمی باشد (نصب قبلی که حذف شده).
  // فقط وضعیت واقعی standalone ملاک است؛ قبل‌از‌نصب بومی canInstall مشخص می‌کند.
  localStorage.removeItem(INSTALLED_KEY);
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
  listeners.forEach((l) => l());
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  if (isStandalone()) return;
  deferredPrompt = e;
  // مرورگر فقط وقتی برنامه نصب نیست پیشنهاد نصب می‌دهد؛ پس پرچم نصب قدیمی را پاک کن.
  localStorage.removeItem(INSTALLED_KEY);
  setState({ canInstall: true, installed: false });
});

// appinstalled تنها مرجع تأیید واقعی تکمیل نصب است.
window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  localStorage.setItem(INSTALLED_KEY, '1');
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
  const evt = deferredPrompt;
  deferredPrompt = null;
  setState({ canInstall: false });
  evt.prompt();
  try {
    const choice = await evt.userChoice;
    return choice?.outcome === 'accepted' ? 'accepted' : 'dismissed';
  } catch {
    return 'dismissed';
  }
}