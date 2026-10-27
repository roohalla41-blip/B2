import React from 'react';
import { Wallet, Send, Download, ArrowRightLeft, ArrowLeftRight } from 'lucide-react';

export default function DashboardMetrics({ values }) {
  const metrics = [
    { label: 'موجودی کل', value: values.total, icon: Wallet, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-950/30', sub: 'افغانی' },
    { label: 'حواله‌های ارسالی', value: values.sent, icon: Send, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30', sub: 'عدد' },
    { label: 'حواله‌های دریافتی', value: values.received, icon: Download, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30', sub: 'عدد' },
    { label: 'تبدیل ارز', value: values.exchange, icon: ArrowRightLeft, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30', sub: 'عدد' },
    { label: 'معاملات امروز', value: values.today, icon: ArrowLeftRight, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/30', sub: 'عدد' },
  ];
  return (
    <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 mb-5">
      {metrics.map(({ label, value, icon: Icon, color, bg, sub }) => (
        <section key={label} className="min-w-0 rounded-xl border border-border bg-card p-4 shadow-card hover:shadow-card-hover transition-shadow">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
              <Icon className={`w-5 h-5 ${color}`} strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-muted-foreground">{label}</p>
              <p className="text-lg font-bold tabular-nums truncate" title={String(value)}>{value}</p>
              <p className="text-[10px] text-muted-foreground">{sub}</p>
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}