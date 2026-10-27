/**
 * InAppBrowserDetector — تشخیص مرورگرهای درون‌برنامه‌ای (واتساپ، تلگرام، اینستاگرام، فیسبوک، توییتر/ایکس، لینکدین، تیک‌تاک و ...)
 *
 * این مرورگرها معمولاً رویداد beforeinstallprompt را ارائه نمی‌دهند و امکان نصب PWA را محدود می‌کنند.
 * لذا باید کاربر را به مرورگر اصلی دستگاه هدایت کنیم.
 */

const INAPP_PATTERNS = [
  { pattern: /WhatsApp/i, name: 'واتساپ', key: 'whatsapp' },
  { pattern: /Telegram/i, name: 'تلگرام', key: 'telegram' },
  { pattern: /Instagram/i, name: 'اینستاگرام', key: 'instagram' },
  { pattern: /FBAN|FBAV|Facebook/i, name: 'فیسبوک', key: 'facebook' },
  { pattern: /Messenger/i, name: 'مسنجر', key: 'messenger' },
  { pattern: /Twitter|X\//i, name: 'توییتر / ایکس', key: 'twitter' },
  { pattern: /LinkedIn/i, name: 'لینکدین', key: 'linkedin' },
  { pattern: /TikTok/i, name: 'تیک‌تاک', key: 'tiktok' },
  { pattern: /Snapchat/i, name: 'اسنپ‌چت', key: 'snapchat' },
  { pattern: /Viber/i, name: 'وایبر', key: 'viber' },
  { pattern: /Line\//i, name: 'لاین', key: 'line' },
  { pattern: /MicroMessenger/i, name: 'وی‌چت', key: 'wechat' },
  { pattern: /Naver/i, name: 'نِیور', key: 'naver' },
  { pattern: /Kakao/i, name: 'کاکائو', key: 'kakao' },
];

/**
 * تشخیص می‌دهد که آیا کاربر در مرورگر داخلی یک اپ قرار دارد یا خیر.
 * @returns {{ detected: boolean, name?: string, key?: string }}
 */
export function detectInAppBrowser() {
  if (typeof navigator === 'undefined' || !navigator.userAgent) {
    return { detected: false };
  }
  const ua = navigator.userAgent;
  for (const item of INAPP_PATTERNS) {
    if (item.pattern.test(ua)) {
      return { detected: true, name: item.name, key: item.key };
    }
  }
  // برخی مرورگرهای درون‌برنامه‌ایreferrer را تنظیم می‌کنند
  if (typeof document !== 'undefined' && document.referrer) {
    const ref = document.referrer.toLowerCase();
    if (ref.includes('android-app://') || ref.includes('wa.me') || ref.includes('t.me')) {
      return { detected: true, name: 'مرورگر داخلی', key: 'generic' };
    }
  }
  return { detected: false };
}

/**
 * تلاش برای باز کردن صفحه در مرورگر بیرونی.
 * روش‌های مختلفی را امتحان می‌کند؛ اگر ناموفق باشد، فراخوانی‌کننده باید راهنمای دستی نمایش دهد.
 * @returns {Promise<boolean>} آیا هدایت با موفقیت آغاز شد؟
 */
export async function tryOpenInExternalBrowser() {
  const currentUrl = window.location.href;

  // ۱. Android Intent — مرورگر بیرونی را باز می‌کند
  if (/Android/i.test(navigator.userAgent)) {
    try {
      const intentUrl = `intent://${currentUrl.replace(/^https?:\/\//, '')}#Intent;scheme=https;action=android.intent.action.VIEW;end;`;
      window.location.href = intentUrl;
      // اندکی صبر می‌کنیم تا مرورگر بیرونی باز شود
      await new Promise((r) => setTimeout(r, 600));
      return true;
    } catch {
      // ادامه با روش بعدی
    }
  }

  // ۲. iOS — استفاده از scheme اختصاصی Chrome و سپس Safari
  if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    try {
      const chromeUrl = `googlechrome://${currentUrl.replace(/^https?:\/\//, '')}`;
      window.location.href = chromeUrl;
      await new Promise((r) => setTimeout(r, 600));
      return true;
    } catch {
      // ادامه با روش بعدی
    }
  }

  // ۳. تلاش با window.open
  try {
    const w = window.open(currentUrl, '_blank', 'noopener,noreferrer');
    if (w) {
      w.focus();
      return true;
    }
  } catch {
    // ادامه با روش بعدی
  }

  return false;
}

export default { detectInAppBrowser, tryOpenInExternalBrowser };