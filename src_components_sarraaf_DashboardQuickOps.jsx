import React from 'react';
import { Link } from 'react-router-dom';
import { Send, Download, BookOpen, ArrowRightLeft, Users, ShoppingBag } from 'lucide-react';

const OPS = [
  { label: 'حواله ارسال', path: '/transfers/send', icon: Send },
  { label: 'حواله دریافت', path: '/transfers/receive', icon: Download },
  { label: 'دفتر حواله', path: '/transfer-book', icon: BookOpen },
  { label: 'تبدیل ارز', path: '/convert', icon: ArrowRightLeft },
  { label: 'مشتریان', path: '/customers', icon: Users },
  { label: 'محصولات آنلاین', path: '/online-products', icon: ShoppingBag },
];

export default function DashboardQuickOps() {
  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-card lg:col-span-2 xl:col-span-1">
      <h2 className="text-sm font-semibold mb-3">عملیات سریع</h2>
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-1 gap-2">
        {OPS.map(({ label, path, icon: Icon }) => (
          <Link key={path} to={path} className="flex items-center justify-between gap-2 rounded-lg border border-primary/10 bg-primary/5 px-3.5 py-2.5 text-sm font-medium text-foreground hover:bg-primary/10 hover:border-primary/30 transition-colors">
            <span>{label}</span>
            <Icon className="w-5 h-5 text-primary shrink-0" />
          </Link>
        ))}
      </div>
    </section>
  );
}