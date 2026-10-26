import React from 'react';
import { X, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import SarraafLogo from '@/components/SarraafLogo';

/**
 * NativeInstallOverlay — نمایش وضعیت نصب بومی PWA
 *
 * حالت‌ها:
 *  - idle: (نمایش داده نمی‌شود)
 *  - prompting: پنجره بومی نصب باز شده، منتظر انتخاب کاربر
 *  - installing: کاربر پذیرفت، در انتظار رویداد appinstalled
 *  - installed: نصب تکمیل شد (تأیید واقعی)
 *  - dismissed: کاربر انصراف داد
 */
export default function NativeInstallOverlay({ status, elapsed, onClose }) {
  if (status === 'idle') return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/50 backdrop-blur-sm p-4 sm:items-center">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <button
            onClick={onClose}
            disabled={status === 'prompting'}
            className="p-1 text-neutral-400 hover:text-neutral-600 transition-colors disabled:opacity-30"
          >
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-bold text-neutral-900">نصب برنامه</h2>
          <span className="w-7" />
        </div>

        <div className="px-5 pb-6 pt-1 flex flex-col items-center">
          <div className="mb-4">
            <SarraafLogo size={56} />
          </div>

          {/* Prompting — منتظر انتخاب کاربر در پنجره بومی */}
          {status === 'prompting' && (
            <>
              <p className="text-sm text-neutral-500 text-center mb-4 leading-relaxed">
                لطفاً در پنجرهٔ بازشده، «نصب» را انتخاب کنید.
              </p>
              <div className="flex items-center gap-2 text-neutral-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-xs">در انتظار تأیید شما…</span>
              </div>
            </>
          )}

          {/* Installing — در حال نصب، شمارش ثانیه‌ها */}
          {status === 'installing' && (
            <>
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-indigo-50 mb-4">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              </div>
              <p className="text-base font-bold text-neutral-900 mb-1">در حال نصب…</p>
              <p className="text-sm text-neutral-500 mb-3">
                برنامه در حال نصب شدن است
              </p>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-neutral-100">
                <span className="text-2xl font-mono font-bold text-indigo-600 tabular-nums">
                  {String(elapsed).padStart(2, '0')}
                </span>
                <span className="text-sm text-neutral-400">ثانیه</span>
              </div>
            </>
          )}

          {/* Installed — نصب موفق (تأیید واقعی) */}
          {status === 'installed' && (
            <>
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-emerald-50 mb-4">
                <CheckCircle2 className="w-9 h-9 text-emerald-500" />
              </div>
              <p className="text-lg font-bold text-neutral-900 mb-1">برنامه نصب شد!</p>
              <p className="text-sm text-neutral-500 mb-5 text-center leading-relaxed">
                «حساب صراف» با موفقیت نصب شد. می‌توانید آن را از صفحهٔ اصلی باز کنید.
              </p>
              <button
                onClick={onClose}
                className="w-full h-11 rounded-xl bg-neutral-900 text-white text-sm font-bold active:scale-[0.98] transition-transform"
              >
                بستن
              </button>
            </>
          )}

          {/* Dismissed — کاربر انصراف داد */}
          {status === 'dismissed' && (
            <>
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-orange-50 mb-4">
                <AlertCircle className="w-9 h-9 text-orange-400" />
              </div>
              <p className="text-base font-bold text-neutral-900 mb-1">نصب لغو شد</p>
              <p className="text-sm text-neutral-500 mb-5 text-center leading-relaxed">
                شما از نصب انصراف دادید. هر زمان بخواهید می‌توانید دوباره تلاش کنید.
              </p>
              <button
                onClick={onClose}
                className="w-full h-11 rounded-xl bg-neutral-900 text-white text-sm font-bold active:scale-[0.98] transition-transform"
              >
                بستن
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}