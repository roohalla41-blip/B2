import React from 'react';
import { BellRing } from 'lucide-react';

export default function LegacyUserNotice({ info }) {
  if (!info) return null;
  return (
    <div
      role="status"
      className="mb-4 rounded-2xl border border-amber-400/40 bg-amber-500/10 p-4 text-right"
    >
      <div className="flex items-center gap-2 mb-2">
        <BellRing className="w-5 h-5 text-amber-300 shrink-0" />
        <p className="text-sm font-bold text-amber-200">این سیستم به‌روزرسانی شده است</p>
      </div>
      <p className="text-xs leading-relaxed text-amber-100/90">
        نام کاربری شما <span className="font-bold text-amber-200">{info.username}</span> تأیید شد.
        رمز عبور شما این است:
      </p>
      <p
        dir="ltr"
        className="mt-2 rounded-lg bg-black/30 border border-amber-400/30 py-2 text-center text-lg font-bold tracking-widest text-amber-200 select-all"
      >
        {info.default_password}
      </p>
      <p className="mt-2 text-[11px] leading-relaxed text-amber-100/70">
        با همین رمز وارد شوید و سپس از تنظیمات، رمز عبور خود را تغییر دهید.
      </p>
    </div>
  );
}