import React from 'react';
import { X, Share, PlusSquare, Compass } from 'lucide-react';
import SarraafLogo from '@/components/SarraafLogo';

/**
 * IosInstallGuide — راهنمای نصب PWA در Safari آیفون
 * Safari روی iOS رویداد beforeinstallprompt نمی‌فرستد،
 * پس کاربر باید دستی از منوی Share «Add to Home Screen» را بزند.
 */
export default function IosInstallGuide({ onClose }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 backdrop-blur-sm p-3 sm:items-center">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <button onClick={onClose} className="p-1 text-neutral-400 hover:text-neutral-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-bold text-neutral-900">نصب روی آیفون</h2>
          <span className="w-7" />
        </div>

        <div className="px-5 pb-6 pt-1">
          <div className="flex items-center justify-center mb-4">
            <SarraafLogo size={56} />
          </div>
          <p className="text-sm text-neutral-500 text-center mb-5 leading-relaxed">
            برای نصب «حساب صراف» روی آیفون، مراحل زیر را در Safari دنبال کنید:
          </p>

          <div className="space-y-4 text-right">
            {/* Step 1 */}
            <div className="flex items-start gap-3">
              <span className="shrink-0 w-7 h-7 rounded-full bg-neutral-200 text-neutral-700 text-xs font-bold flex items-center justify-center">۱</span>
              <div className="flex-1">
                <p className="text-sm text-neutral-700 font-medium mb-1">
                  روی دکمهٔ <strong className="text-neutral-900">Share</strong> در نوار پایین Safari بزنید.
                </p>
                <div className="inline-flex items-center gap-1.5 bg-neutral-100 rounded-lg px-2.5 py-1.5">
                  <Share className="w-4 h-4 text-blue-500" />
                  <span className="text-xs text-neutral-600">Share</span>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-3">
              <span className="shrink-0 w-7 h-7 rounded-full bg-neutral-200 text-neutral-700 text-xs font-bold flex items-center justify-center">۲</span>
              <div className="flex-1">
                <p className="text-sm text-neutral-700 font-medium mb-1">
                  گزینهٔ <strong className="text-neutral-900">Add to Home Screen</strong> را انتخاب کنید.
                </p>
                <div className="inline-flex items-center gap-1.5 bg-neutral-100 rounded-lg px-2.5 py-1.5">
                  <PlusSquare className="w-4 h-4 text-neutral-600" />
                  <span className="text-xs text-neutral-600">Add to Home Screen</span>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-3">
              <span className="shrink-0 w-7 h-7 rounded-full bg-neutral-200 text-neutral-700 text-xs font-bold flex items-center justify-center">۳</span>
              <div className="flex-1">
                <p className="text-sm text-neutral-700 font-medium">
                  روی <strong className="text-neutral-900">Add</strong> بزنید. برنامه روی صفحهٔ اصلی نصب می‌شود.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full mt-6 h-11 rounded-xl bg-neutral-900 text-white text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          >
            <Compass className="w-4 h-4" />
            متوجه شدم
          </button>
        </div>
      </div>
    </div>
  );
}