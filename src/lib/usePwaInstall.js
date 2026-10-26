import { useSyncExternalStore } from 'react';
import { subscribe, getState, promptInstall } from '@/lib/pwaInstallStore';

export function isStandaloneMode() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

export function getPlatform() {
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'desktop';
}

function isSafariBrowser() {
  const ua = navigator.userAgent || '';
  const vendor = navigator.vendor || '';
  return /Safari/i.test(ua) && /Apple Computer/i.test(vendor) && !/CriOS|FxiOS|EdgiOS|Chrome|Firefox/i.test(ua);
}

/** True when running inside iOS Safari (Apple provides no native install prompt there). */
export function isIosSafari() {
  return getPlatform() === 'ios' && isSafariBrowser();
}

/**
 * usePwaInstall — وضعیت نصب PWA (منبع واحد: pwaInstallStore).
 *
 * - canInstall: مرورگر پنجرهٔ بومی نصب را در دسترس گذاشته است (beforeinstallprompt)
 * - installed: برنامه نصب شده است (حالت standalone یا رویداد appinstalled)
 * - shouldShowButton: برنامه نصب نیست؛ دکمهٔ نصب باید دیده شود
 */
export function usePwaInstall() {
  const s = useSyncExternalStore(subscribe, getState);

  return {
    canInstall: s.canInstall && !s.installed,
    installed: s.installed,
    promptInstall,
    platform: getPlatform(),
    iosSafari: isIosSafari(),
    shouldShowButton: !s.installed,
  };
}