import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useSandbox } from '@/components/sandbox/SandboxProvider';

const fmt = (n) => Number(n || 0).toLocaleString('fa-IR');

export function SandboxReports() {
  const { state } = useSandbox();
  const orders = state.orders;
  const completed = orders.filter(o => o.status === 'completed');
  const pending = orders.filter(o => o.status === 'pending');
  const assigned = orders.filter(o => o.status === 'assigned');
  const openDisputes = state.disputes.filter(d => d.status === 'open');
  const resolvedDisputes = state.disputes.filter(d => d.status === 'resolved');
  const totalSales = completed.reduce((s, o) => s + o.amount, 0);

  const sellers = state.sellers.map(s => {
    const sOrders = orders.filter(o => o.seller_id === s.id);
    return { ...s, orders: sOrders.length, sales: sOrders.filter(o => o.status === 'completed').reduce((a, o) => a + o.amount, 0) };
  });

  const stats = [
    { l: 'کل سفارش‌ها', v: orders.length },
    { l: 'در انتظار', v: pending.length },
    { l: 'پذیرفته شده', v: assigned.length },
    { l: 'انجام شده', v: completed.length },
    { l: 'پرونده‌های باز', v: openDisputes.length },
    { l: 'پرونده‌های حل‌شده', v: resolvedDisputes.length },
    { l: 'فروش کل (مجازی)', v: fmt(totalSales) },
    { l: 'تراکنش‌های کیف پول', v: state.wallet_ledger.length },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {stats.map(s => (
          <Card key={s.l}><CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground">{s.l}</p>
            <p className="text-lg font-bold">{s.v}</p>
          </CardContent></Card>
        ))}
      </div>

      <Card><CardContent className="p-3">
        <h4 className="text-xs font-bold mb-2">عملکرد فروشندگان</h4>
        {sellers.length === 0 ? <p className="text-xs text-muted-foreground text-center py-2">فروشنده‌ای تأیید نشده</p> : (
          <div className="space-y-1">
            {sellers.map(s => (
              <div key={s.id} className="flex items-center justify-between text-xs border-b pb-1">
                <span>{s.name} ({s.code})</span>
                <span className="text-muted-foreground">سفارش: {s.orders} — فروش: {fmt(s.sales)}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent></Card>
    </div>
  );
}