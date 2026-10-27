import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSandbox } from '@/components/sandbox/SandboxProvider';
import { fmt, faDate } from '@/components/sandbox/utils';
import { LayoutDashboard, Users, Receipt, Settings } from 'lucide-react';

const NAV = [
  { v: 'dashboard', l: 'داشبورد', icon: LayoutDashboard },
  { v: 'orders', l: 'سفارش‌ها', icon: Receipt },
  { v: 'customers', l: 'مشتریان', icon: Users },
  { v: 'settings', l: 'تنظیمات', icon: Settings },
];

const STATUS_LABEL = { pending: 'در انتظار', assigned: 'پذیرفته شده', completed: 'انجام شد', disputed: 'اختلاف' };

export function SandboxSarraafPanel() {
  const { session, state, actions } = useSandbox();
  const [tab, setTab] = useState('dashboard');

  const allOrders = state.orders;
  const customers = state.accounts.filter(a => a.role === 'customer');
  const totalSales = allOrders.filter(o => o.status === 'completed').reduce((s, o) => s + o.amount, 0);
  const pendingOrders = allOrders.filter(o => o.status === 'pending').length;

  return (
    <div className="space-y-3">
      <div className="flex gap-1 bg-card rounded-lg p-1 border overflow-x-auto scrollbar-thin">
        {NAV.map(n => {
          const Icon = n.icon;
          return (
            <button key={n.v} onClick={() => setTab(n.v)}
              className={`flex-1 min-w-[60px] flex flex-col items-center gap-0.5 py-1.5 rounded-md transition ${tab === n.v ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>
              <Icon className="w-4 h-4" /><span className="text-[10px]">{n.l}</span>
            </button>
          );
        })}
      </div>

      {tab === 'dashboard' && (
        <Card><CardContent className="p-3 space-y-2">
          <p className="text-sm font-bold">داشبورد صراف</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-muted/30 rounded-lg p-2 text-center">
              <p className="text-[10px] text-muted-foreground">کل سفارش‌ها</p>
              <p className="text-lg font-bold">{allOrders.length}</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-2 text-center">
              <p className="text-[10px] text-muted-foreground">در انتظار</p>
              <p className="text-lg font-bold">{pendingOrders}</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-2 text-center">
              <p className="text-[10px] text-muted-foreground">فروش کل</p>
              <p className="text-sm font-bold">{fmt(totalSales)}</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-2 text-center">
              <p className="text-[10px] text-muted-foreground">مشتریان</p>
              <p className="text-lg font-bold">{customers.length}</p>
            </div>
          </div>
        </CardContent></Card>
      )}

      {tab === 'orders' && (
        <Card><CardContent className="p-3 space-y-2">
          <p className="text-xs font-bold">همهٔ سفارش‌ها</p>
          {allOrders.length === 0 && <p className="text-xs text-muted-foreground text-center py-3">سفارشی نیست</p>}
          {allOrders.slice().reverse().map(o => (
            <div key={o.id} className="border rounded-lg p-2 space-y-1">
              <div className="flex justify-between">
                <span className="text-xs font-medium">{o.service_name}</span>
                <Badge className={o.status === 'completed' ? 'bg-green-100 text-green-700' : o.status === 'assigned' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}>
                  {STATUS_LABEL[o.status]}
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground">{o.order_code} — {faDate(o.created_at)}</p>
              <p className="text-[10px]">مشتری: {o.customer_name} — فروشنده: {o.seller_name || '—'}</p>
              <p className="text-xs font-bold">{fmt(o.amount)} افغانی</p>
            </div>
          ))}
        </CardContent></Card>
      )}

      {tab === 'customers' && (
        <Card><CardContent className="p-3 space-y-2">
          <p className="text-xs font-bold">مشتریان</p>
          {customers.length === 0 && <p className="text-xs text-muted-foreground text-center py-3">مشتری‌ای نیست</p>}
          {customers.map(c => (
            <div key={c.id} className="border rounded-lg p-2 flex justify-between items-center">
              <div>
                <p className="text-xs font-medium">{c.name}</p>
                <p className="text-[10px] text-muted-foreground">{c.username} — {c.phone || '—'}</p>
              </div>
              <span className="text-xs font-bold">{fmt(c.balance)} افغانی</span>
            </div>
          ))}
        </CardContent></Card>
      )}

      {tab === 'settings' && (
        <Card><CardContent className="p-3 space-y-2">
          <p className="text-xs font-bold">تنظیمات آزمایشی</p>
          <div className="text-xs space-y-1">
            <p>حداقل موجودی برای درخواست فروشندگی: <span className="font-bold">{fmt(state.settings.min_credit_for_seller_request)}</span></p>
            <p>سقف اعتبار فروشنده: <span className="font-bold">{fmt(state.settings.seller_credit_limit)}</span></p>
            <p>مدت زمان اعتراض: <span className="font-bold">{state.settings.dispute_window_hours} ساعت</span></p>
          </div>
          <Button size="sm" variant="outline" className="w-full" onClick={() => { actions.reset(); }}>
            بازنشانی کامل محیط
          </Button>
        </CardContent></Card>
      )}
    </div>
  );
}