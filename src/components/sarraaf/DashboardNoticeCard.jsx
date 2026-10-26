import React from 'react';
import { Link } from 'react-router-dom';
import { Megaphone, Coins } from 'lucide-react';

export default function DashboardNoticeCard() {
  return (
    <section className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
      <div className="h-20 bg-gradient-to-l from-primary to-indigo-800 flex items-center justify-center">
        <Coins className="w-10 h-10 text-white/80" strokeWidth={1.6} />
      </div>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Megaphone className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold">اطلاعیه مهم</h2>
        </div>
        <p className="text-xs leading-6 text-muted-foreground mb-3">
          نرخ‌ها توسط صراف در بخش «ارز و نرخ» ثبت و ویرایش می‌شوند. لطفاً پیش از انجام تراکنش، از به‌روز بودن نرخ‌ها مطمئن شوید.
        </p>
        <Link to="/currencies" className="flex items-center justify-center rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
          مشاهده نرخ‌ها
        </Link>
      </div>
    </section>
  );
}