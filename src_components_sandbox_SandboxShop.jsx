import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSandbox } from '@/components/sandbox/SandboxProvider';
import { DEFAULT_SERVICES } from '@/lib/sandboxStore';
import { useToast } from '@/components/ui/use-toast';
import { fmt, faDate } from '@/components/sandbox/utils';
import { Receipt as ReceiptIcon } from 'lucide-react';

const STATUS_LABEL = {
  pending: 'در انتظار', assigned: 'پذیرفته شده', completed: 'انجام شد', disputed: 'اختلاف',
};

export function SandboxShop() {
  const { state, actions, activeRole } = useSandbox();
  const { toast } = useToast();
  const [phone, setPhone] = useState('');
  const [sellerId, setSellerId] = useState('__none__');
  const [receiptOrder, setReceiptOrder] = useState(null);

  const customer = state.identities.customer;
  const myOrders = state.orders.filter(o => o.customer_id === customer.id);
  const approvedSellers = state.sellers.filter(s => s.status === 'active');

  const buy = (svc) => {
    const targetSeller = sellerId === '__none__' ? null : sellerId;
    const r = actions.createOrder({ customer_id: customer.id, customer_name: customer.name, service_key: svc.key, phone, seller_id: targetSeller });
    if (!r.ok) { toast({ title: 'خطا', description: r.error, variant: 'destructive' }); return; }
    toast({ title: 'سفارش ثبت شد', description: `${r.order.order_code}${targetSeller ? ' — ارجاع به فروشنده' : ''}` });
  };

  if (activeRole !== 'customer') {
    return <p className="text-xs text-muted-foreground p-2">برای خرید، از تب «هویت‌ها» وارد نقش مشتری شوید.</p>;
  }

  return (
    <div className="space-y-3">
      <Card><CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs">موجودی مشتری: <b>{fmt(customer.balance)}</b> افغانی</span>
        </div>
        <div className="flex flex-col gap-1.5">
          <Input className="h-8" placeholder="شماره موبایل مقصد" value={phone} onChange={e => setPhone(e.target.value)} />
          <Select value={sellerId} onValueChange={setSellerId}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="فروشندهٔ مقصد (اختیاری)" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__" className="text-xs">— بدون انتخاب (عمومی) —</SelectItem>
              {approvedSellers.map(sl => (
                <SelectItem key={sl.id} value={sl.id} className="text-xs">{sl.name} — کد {sl.code}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {approvedSellers.length === 0 && <p className="text-[10px] text-amber-600">هنوز فروشندهٔ تأییدشده‌ای وجود ندارد. ابتدا از تب «درخواست‌ها» یک درخواست فروشندگی تأیید کنید.</p>}
        </div>
      </CardContent></Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {DEFAULT_SERVICES.map(svc => (
          <Card key={svc.key}><CardContent className="p-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{svc.name}</p>
              <p className="text-xs text-muted-foreground">{fmt(svc.amount)} افغانی</p>
            </div>
            <Button size="sm" disabled={customer.balance < svc.amount} onClick={() => buy(svc)}>خرید</Button>
          </CardContent></Card>
        ))}
      </div>

      <Card><CardContent className="p-3">
        <h4 className="text-xs font-bold mb-2">سفارش‌های من</h4>
        <div className="space-y-1">
          {myOrders.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">سفارشی ندارید</p>}
          {myOrders.map(o => (
            <div key={o.id} className="flex items-center justify-between text-xs border-b pb-1">
              <div>
                <span className="font-medium">{o.service_name}</span>
                <span className="text-muted-foreground mr-2">{o.order_code}</span>
                {o.seller_name && <span className="text-muted-foreground mr-2">— {o.seller_name}</span>}
              </div>
              <div className="flex items-center gap-1.5">
                <Badge className={o.status === 'completed' ? 'bg-green-100 text-green-700' : o.status === 'assigned' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}>
                  {STATUS_LABEL[o.status] || o.status}
                </Badge>
                {o.status === 'completed' && (
                  <Button size="sm" variant="outline" className="h-6 px-2 gap-1" onClick={() => setReceiptOrder(o)}>
                    <ReceiptIcon className="w-3 h-3" /> رسید
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent></Card>

      {receiptOrder && (
        <SandboxReceiptView order={receiptOrder} customer={customer} onClose={() => setReceiptOrder(null)} />
      )}
    </div>
  );
}

// ── نمایش هر دو رسید: پرداخت مشتری + سفارش نهایی ──
function SandboxReceiptView({ order, customer, onClose }) {
  const paymentEntry = null; // در آینده قابل توسعه
  return (
    <Card className="border-primary/30"><CardContent className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold">رسیدهای آزمایشی — {order.order_code}</h3>
        <Button size="sm" variant="ghost" className="h-7" onClick={onClose}>بستن</Button>
      </div>

      {/* رسید پرداخت مشتری */}
      <div className="border rounded-lg p-3 space-y-1.5 bg-muted/30">
        <div className="flex items-center gap-1.5 pb-1 border-b">
          <ReceiptIcon className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold">رسید پرداخت مشتری</span>
        </div>
        <ReceiptRow label="کد سفارش" value={order.order_code} />
        <ReceiptRow label="مشتری" value={customer.name} />
        <ReceiptRow label="تلفن" value={customer.phone} />
        <ReceiptRow label="خدمت" value={order.service_name} />
        <ReceiptRow label="مبلغ" value={`${fmt(order.amount)} افغانی`} />
        <ReceiptRow label="روش پرداخت" value="کیف پول آزمایشی" />
        <ReceiptRow label="تاریخ" value={faDate(order.created_at)} />
        <ReceiptRow label="وضعیت" value="پرداخت شده ✓" />
      </div>

      {/* رسید سفارش نهایی */}
      <div className="border rounded-lg p-3 space-y-1.5 bg-muted/30">
        <div className="flex items-center gap-1.5 pb-1 border-b">
          <ReceiptIcon className="w-4 h-4 text-success" />
          <span className="text-xs font-bold">رسید سفارش نهایی</span>
        </div>
        <ReceiptRow label="کد سفارش" value={order.order_code} />
        <ReceiptRow label="مشتری" value={order.customer_name} />
        <ReceiptRow label="فروشنده" value={order.seller_name ? `${order.seller_name} (${order.seller_code})` : '—'} />
        <ReceiptRow label="خدمت" value={order.service_name} />
        <ReceiptRow label="مبلغ" value={`${fmt(order.amount)} افغانی`} />
        <ReceiptRow label="تاریخ ثبت" value={faDate(order.created_at)} />
        <ReceiptRow label="تاریخ پذیرش" value={faDate(order.accepted_at)} />
        <ReceiptRow label="تاریخ تکمیل" value={faDate(order.completed_at)} />
        <ReceiptRow label="مرجع رسید" value={order.receipt_ref || '—'} />
        <ReceiptRow label="یادداشت فروشنده" value={order.seller_notes || '—'} />
        <ReceiptRow label="وضعیت نهایی" value="تکمیل شد ✓" />
      </div>

      <p className="text-[10px] text-muted-foreground text-center">این رسیدها صرفاً آزمایشی هستند و هیچ ارزش واقعی ندارند.</p>
    </CardContent></Card>
  );
}

function ReceiptRow({ label, value }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}