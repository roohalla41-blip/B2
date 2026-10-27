import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, X } from 'lucide-react';

const DEFAULT_PASSWORD = '12345678';

export default function DefaultPasswordBanner() {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  const info = useMemo(() => {
    if (typeof window === 'undefined') return null;
    if (localStorage.getItem('default_password_alert') !== '1') return null;
    try {
      const u = JSON.parse(localStorage.getItem('auth_user') || '{}');
      const role = u.role;
      if (role !== 'exchange' && role !== 'sarraaf') return null;
      return { username: u.username || u.full_name || '', role };
    } catch {
      return null;
    }
  }, []);

  if (dismissed || !info) return null;

  return (
    <div className="mb-3 rounded-xl border border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40 p-3 flex items-start gap-3">
      <div className="shrink-0 w-9 h-9 rounded-lg bg-amber-200 dark:bg-amber-900 flex items-center justify-center">
        <ShieldAlert className="w-5 h-5 text-amber-700 dark:text-amber-300" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-amber-900 dark:text-amber-100">سیستم به‌روزرسانی شده است</p>
        <p className="text-xs text-amber-800 dark:text-amber-200 mt-0.5 leading-relaxed">
          نام کاربری شما <span className="font-bold">{info.username}</span> تأیید شد. رمز عبور فعلی شما{' '}
          <span dir="ltr" className="font-bold bg-amber-200 dark:bg-amber-900 px-1.5 py-0.5 rounded">{DEFAULT_PASSWORD}</span>{' '}
          است. لطفاً برای حفظ امنیت حساب، رمز خود را تغییر دهید.
        </p>
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => navigate('/settings')}
            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium transition-colors"
          >
            تغییر رمز عبور
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="px-3 py-1.5 rounded-lg text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-xs font-medium transition-colors"
          >
            بعداً
          </button>
        </div>
      </div>
      <button onClick={() => setDismissed(true)} className="shrink-0 text-amber-700 dark:text-amber-300 hover:text-amber-900">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}