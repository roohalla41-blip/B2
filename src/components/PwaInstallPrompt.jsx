import React, { useState, useEffect } from 'react';
import { Download, ChevronLeft, X, ExternalLink, Chrome as ChromeIcon, Compass } from 'lucide-react';
import SarraafLogo from '@/components/SarraafLogo';
import { detectInAppBrowser, tryOpenInExternalBrowser } from '@/lib/inAppBrowserDetector';
import { usePwaInstall } from '@/lib/usePwaInstall';

const INAPP_DISMISS_KEY = 'pwa_inapp_dismiss_v1';

function getPlatform() {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'desktop';
}

export default function PwaInstallPrompt({ showInstallPrompt = true }) {
  const [show, setShow] = useState(false);
  const [mode, setMode] = useState('install'); // 'install' | 'inapp'
  const [inAppInfo, setInAppInfo] = useState(null);
  const [redirecting, setRedirecting] = useState(false);
  const { canInstall, promptInstall } = usePwaInstall();

  useEffect(() => {
    // 1. Check in-app browser first
    const inApp = detectInAppBrowser();
    if (inApp.detected && !localStorage.getItem(INAPP_DISMISS_KEY)) {
      setInAppInfo(inApp);
      setMode('inapp');
      const t = setTimeout(() => setShow(true), 800);

      (async () => {
        const ok = await tryOpenInExternalBrowser();
        setRedirecting(ok);
      })();

      return () => clearTimeout(t);
    }

    // 2. Auto-show install prompt after login (only when enabled)
    if (!showInstallPrompt) return;
    if (canInstall) {
      setMode('install');
      const t = setTimeout(() => setShow(true), 1500);
      return () => clearTimeout(t);
    }
  }, [showInstallPrompt, canInstall]);

  const handleClose = () => {
    if (mode === 'inapp') {
      localStorage.setItem(INAPP_DISMISS_KEY, '1');
    }
    setShow(false);
  };

  const handleOpenExternal = async () => {
    setRedirecting(true);
    await tryOpenInExternalBrowser();
    setRedirecting(false);
  };

  if (!show) return null;

  const platform = getPlatform();

  // ── In-App Browser Banner ──
  if (mode === 'inapp') {
    return (
      <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4 sm:items-center">
        <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-[pgm-rise_0.3s_ease]">
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <button onClick={handleClose} className="p-1 text-neutral-400 hover:text-neutral-600 transition-colors">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold text-neutral-900">باز کردن در مرورگر</h2>
            <span className="w-7" />
          </div>

          <div className="px-5 pb-5 pt-1">
            <div className="flex items-center justify-center mb-4">
              <SarraafLogo size={56} />
            </div>
            <p className="text-sm text-neutral-500 text-center mb-4 leading-relaxed">
              شما در مرورگر داخلی {inAppInfo?.name} هستید. برای تجربهٔ بهتر و نصب برنامه، لطفاً در مرورگر اصلی دستگاه باز کنید.
            </p>

            {/* Open in external browser button */}
            <button
              onClick={handleOpenExternal}
              disabled={redirecting}
              className="flex items-center justify-between w-full bg-neutral-50 hover:bg-neutral-100 transition-colors rounded-2xl px-4 py-4 text-right border border-neutral-100 disabled:opacity-60"
            >
              <ChevronLeft className="w-5 h-5 text-neutral-400" />
              <div className="flex items-center gap-3">
                <span className="text-base font-bold text-neutral-900">
                  {redirecting ? 'در حال باز کردن...' : 'باز کردن در مرورگر'}
                </span>
                <div className="w-10 h-10 rounded-full bg-[#FF6D00] flex items-center justify-center shadow-md shadow-orange-200">
                  {platform === 'ios' ? <Compass className="w-5 h-5 text-white" strokeWidth={2.5} /> : <ChromeIcon className="w-5 h-5 text-white" strokeWidth={2.5} />}
                </div>
              </div>
            </button>

            {/* Manual guide */}
            <div className="mt-4 pt-4 border-t border-neutral-100">
              <p className="text-xs text-neutral-400 mb-3 text-center">اگر به‌صورت خودکار باز نشد، مراحل زیر را دنبال کنید:</p>
              <ManualOpenExternalGuide platform={platform} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Install Prompt (native + manual) ──
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4 sm:items-center">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-[pgm-rise_0.3s_ease]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <button onClick={handleClose} className="p-1 text-neutral-400 hover:text-neutral-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-bold text-neutral-900">نصب برنامه</h2>
          <span className="w-7" />
        </div>

        {/* Brand + install action */}
        <div className="px-5 pb-5 pt-1">
          <div className="flex items-center justify-center mb-4">
            <SarraafLogo size={56} />
          </div>
          <p className="text-sm text-neutral-500 text-center mb-4 leading-relaxed">
            حساب صراف را روی دستگاه خود نصب کنید تا دسترسی سریع‌تر و تجربه‌ی بهتری داشته باشید
          </p>

          {/* Native install row */}
          {canInstall ? (
            <button
              onClick={promptInstall}
              className="flex items-center justify-between w-full bg-neutral-50 hover:bg-neutral-100 transition-colors rounded-2xl px-4 py-4 text-right border border-neutral-100"
            >
              <ChevronLeft className="w-5 h-5 text-neutral-400" />
              <div className="flex items-center gap-3">
                <span className="text-base font-bold text-neutral-900">نصب</span>
                <div className="w-10 h-10 rounded-full bg-[#FF6D00] flex items-center justify-center shadow-md shadow-orange-200">
                  <Download className="w-5 h-5 text-white" strokeWidth={2.5} />
                </div>
              </div>
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/**
 * راهنمای باز کردن لینک در مرورگر بیرونی به‌صورت دستی
 */
function ManualOpenExternalGuide({ platform }) {
  if (platform === 'ios') {
    return (
      <div className="space-y-3 text-right">
        <div className="flex items-start gap-3">
          <span className="shrink-0 w-6 h-6 rounded-full bg-neutral-200 text-neutral-700 text-xs font-bold flex items-center justify-center">۱</span>
          <p className="text-sm text-neutral-600 leading-relaxed">
            روی آیکون <strong className="text-neutral-900">اشتراک‌گذاری</strong> (مربع با فلش رو به بالا) ضربه بزنید.
          </p>
        </div>
        <div className="flex items-start gap-3">
          <span className="shrink-0 w-6 h-6 rounded-full bg-neutral-200 text-neutral-700 text-xs font-bold flex items-center justify-center">۲</span>
          <p className="text-sm text-neutral-600 leading-relaxed">
            گزینهٔ <strong className="text-neutral-900">Open in Safari</strong> («باز کردن در سافاری») را انتخاب کنید.
          </p>
        </div>
      </div>
    );
  }

  if (platform === 'android') {
    return (
      <div className="space-y-3 text-right">
        <div className="flex items-start gap-3">
          <span className="shrink-0 w-6 h-6 rounded-full bg-neutral-200 text-neutral-700 text-xs font-bold flex items-center justify-center">۱</span>
          <p className="text-sm text-neutral-600 leading-relaxed">
            روی منوی مرورگر (آیکون سه‌نقطه) ضربه بزنید.
          </p>
        </div>
        <div className="flex items-start gap-3">
          <span className="shrink-0 w-6 h-6 rounded-full bg-neutral-200 text-neutral-700 text-xs font-bold flex items-center justify-center">۲</span>
          <p className="text-sm text-neutral-600 leading-relaxed">
            گزینهٔ <strong className="text-neutral-900">Open in Chrome</strong> («باز کردن در کروم») یا <strong className="text-neutral-900">Open in browser</strong> را انتخاب کنید.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 text-right">
      <div className="flex items-start gap-3">
        <span className="shrink-0 w-6 h-6 rounded-full bg-neutral-200 text-neutral-700 text-xs font-bold flex items-center justify-center">۱</span>
        <p className="text-sm text-neutral-600 leading-relaxed">
          لینک را کپی کنید و در مرورگر اصلی (Chrome، Firefox یا Edge) باز کنید.
        </p>
      </div>
    </div>
  );
}