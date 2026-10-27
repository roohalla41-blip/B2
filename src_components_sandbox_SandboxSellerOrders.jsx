import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useSandbox } from '@/components/sandbox/SandboxProvider';
import { useToast } from '@/components/ui/use-toast';
import { faDate, fmt } from '@/components/sandbox/utils';

const STATUS_LABEL = { pending: 'در انتظار', assigned: 'پذیرفته شده', completed: 'انجام شد' };

export function SandboxSellerOrders() {
  const { state, actions, activeRole } = useSandbox();
  const { toast } = useToast();
  const seller = state.identities.seller;
  const [extra, setExtra] = useState({});

  const available = state.orders.filter(o => o.status === 'pending' && (!o.target_seller_id || o.target_seller_id === seller.id));
  const mine = state.orders.filter(o => o.seller_id === seller.id);

  const accept = (id) => {
    const r = actions.acceptOrder(id, seller);
    toast({ title: r.ok ? 'سفارش پذیرفته شد' : 'خطا', description: r.ok ? '' : r.error, variant: r.ok ? 'default' : 'destructive' });
  };

  const complete = (id) => {
    const e = extra[id] || { receipt_ref: '', notes: '' };
    const r = actions.completeOrder(id, seller, { receipt_ref: e.receipt_ref, notes: e.notes });
    toast({ title: r.ok ? 'انجام ثبت شد' : 'خطا', description: r.ok ? '' : r.error, variant: r.ok ? 'default' : 'destructive' });
    setExtra(s => { const c = { ...s }; delete c[id]; return c; });
  };

  if (activeRole !== 'seller') {
    return <p className="text-xs text-muted-foreground p-2">برای مدیریت سفارش‌ها، از تب «هویت‌ها» وارد نقش فروشنده شوید.</p>;
  }

  const sellerProfile = state.sellers.find(s => s.id === seller.id);

  return (
    <div className="space-y-3">
      <Card><CardContent className="p-3">
        <p className="text-xs">فروشنده: <b>{seller.name}</b>{sellerProfile ? ` — کد ${sellerProfile.code}` : ' (تأیید نشده)'}</p>
      </CardContent></Card>

      <Card><CardContent className="p-3">
        <h4 className="text-xs font-bold mb-2">سفارش‌های در دسترس</h4>
        <div className="space-y-1">
          {available.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">سفارش در دسترسی نیست</p>}
          {available.map(o => (
            <div key={o.id} className="flex items-center justify-between text-xs border-b pb-1">
              <div><span className="font-medium">{o.service_name}</span> — {fmt(o.amount)} — {o.order_code}</div>
              <Button size="sm" className="h-7" onClick={() => accept(o.id)}>قبول</Button>
            </div>
          ))}
        </div>
      </CardContent></Card>

      <Card><CardContent className="p-3">
        <h4 className="text-xs font-bold mb-2">سفارش‌های من</h4>
        <div className="space-y-2">
          {mine.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">سفارشی پذیرفته نشده</p>}
          {mine.map(o => (
            <div key={o.id} className="border rounded-lg p-2 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{o.service_name}</span>
                <Badge className={o.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}>{STATUS_LABEL[o.status]}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{o.order_code} — {fmt(o.amount)} افغانی — مشتری: {o.customer_name}</p>
              {o.accepted_at && <p className="text-[10px] text-muted-foreground">قبول شده: {faDate(o.accepted_at)}</p>}
              {o.status === 'assigned' && (
                <div className="space-y-1 pt-1">
                  <Input className="h-8" placeholder="مرجع رسید (نمونه)" value={(extra[o.id] || {}).receipt_ref || ''} onChange={e => setExtra(s => ({ ...s, [o.id]: { ...(s[o.id] || {}), receipt_ref: e.target.value } }))} />
                  <Textarea className="text-xs" rows={2} placeholder="توضیحات انجام" value={(extra[o.id] || {}).notes || ''} onChange={e => setExtra(s => ({ ...s, [o.id]: { ...(s[o.id] || {}), notes: e.target.value } }))} />
                  <Button size="sm" className="h-7" onClick={() => complete(o.id)}>تأیید انجام</Button>
                </div>
              )}
              {o.completed_at && <p className="text-[10px] text-muted-foreground">انجام شد: {faDate(o.completed_at)}</p>}
              {o.status === 'completed' && (
                <p className="text-[10px] text-primary">رسیدها در تب «فروشگاه» (نقش مشتری) قابل مشاهده است</p>
              )}
            </div>
          ))}
        </div>
      </CardContent></Card>
    </div>
  );
}