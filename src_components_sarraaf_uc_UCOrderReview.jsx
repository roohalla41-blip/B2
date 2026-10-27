import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Package, Loader2, Clock, Truck, CreditCard, Wallet, ExternalLink } from 'lucide-react';
import { loadAllUCOrders, approveUCOrder, rejectUCOrder, completeUCOrder } from '@/lib/ucApi';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { toast } from '@/components/ui/use-toast';

function toFa(n) { return Number(n || 0).toLocaleString('fa-IR'); }
function faTime(iso) {
  if (!iso) return '';
  try { return new Date(iso).toLocaleString('fa-IR', { timeZone: 'Asia/Tehran' }); }
  catch { return iso; }
}

export default function UCOrderReview() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: orders, isLoading } = useQuery({
    queryKey: ['ucOrders'],
    queryFn: loadAllUCOrders,
  });
  const [processing, setProcessing] = useState(false);
  const [rejectingId, setRejectingId] = useState(null);

  const reviewer = user?.full_name || user?.email || 'سازنده';
  const reviewerId = user?.id || '';

  const pending = (orders || []).filter(o => o.status === 'pending');
  const active = (orders || []).filter(o => o.status === 'approved');
  const done = (orders || []).filter(o => o.status === 'completed' || o.status === 'rejected');

  const handleApprove = async (order) => {
    setProcessing(true);
    try {
      await approveUCOrder(order, reviewerId, reviewer);
      const method = order.payment_method === 'card_to_card' ? 'پرداخت دستی' : 'کسر از کیف پول';
      toast({ title: 'سفارش تأیید شد', description: `${method} — اعلان برای مشتری ارسال شد` });
      qc.invalidateQueries({ queryKey: ['ucOrders'] });
    } catch (err) {
      toast({ title: 'خطا', description: err.message, variant: 'destructive' });
    }
    setProcessing(false);
  };

  const handleReject = async (order) => {
    setProcessing(true);
    try {
      await rejectUCOrder(order, 'رد شده توسط سازنده', reviewerId, reviewer);
      toast({ title: 'سفارش رد شد', description: 'اعلان برای مشتری ارسال شد' });
      setRejectingId(null);
      qc.invalidateQueries({ queryKey: ['ucOrders'] });
    } catch (err) {
      toast({ title: 'خطا', description: err.message, variant: 'destructive' });
    }
    setProcessing(false);
  };

  const handleComplete = async (order) => {
    setProcessing(true);
    try {
      await completeUCOrder(order, reviewerId, reviewer);
      toast({ title: 'سفارش تحویل داده شد', description: 'اعلان موفقیت برای مشتری ارسال شد' });
      qc.invalidateQueries({ queryKey: ['ucOrders'] });
    } catch (err) {
      toast({ title: 'خطا', description: err.message, variant: 'destructive' });
    }
    setProcessing(false);
  };

  const renderRow = (order) => {
    const fields = order.fields || {};
    const isManual = order.payment_method === 'card_to_card';
    return (
      <div key={order.id} className="p-3 rounded-lg border space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <span className="text-sm font-medium">{order.product_name || 'UC'}</span>
            <Badge variant="outline" className="mr-2 text-[10px]">{order.currency || 'IRT'}</Badge>
            {isManual ? (
              <Badge variant="secondary" className="mr-2 text-[10px] bg-purple-100 text-purple-700"><CreditCard className="w-2.5 h-2.5" /> پرداخت دستی</Badge>
            ) : (
              <Badge variant="secondary" className="mr-2 text-[10px] bg-blue-100 text-blue-700"><Wallet className="w-2.5 h-2.5" /> کیف پول</Badge>
            )}
            {order.status === 'pending' && <Badge variant="secondary" className="mr-2 text-[10px] bg-amber-100 text-amber-700"><Clock className="w-2.5 h-2.5" /> در انتظار</Badge>}
            {order.status === 'approved' && <Badge variant="secondary" className="mr-2 text-[10px] bg-blue-100 text-blue-700"><Check className="w-2.5 h-2.5" /> تأیید شد</Badge>}
            {order.status === 'completed' && <Badge variant="secondary" className="mr-2 text-[10px] bg-green-100 text-green-700"><Truck className="w-2.5 h-2.5" /> تحویل شد</Badge>}
            {order.status === 'rejected' && <Badge variant="secondary" className="mr-2 text-[10px] bg-red-100 text-red-700"><X className="w-2.5 h-2.5" /> رد شد</Badge>}
          </div>
          <span className="text-sm font-bold text-primary shrink-0">{toFa(order.total)}</span>
        </div>
        {Object.keys(fields).length > 0 && (
          <div className="text-[10px] text-muted-foreground space-y-0.5 bg-muted/30 rounded p-2">
            {Object.entries(fields).map(([k, v]) => (
              <div key={k}><span className="font-medium">{k}:</span> {String(v)}</div>
            ))}
          </div>
        )}
        {isManual && order.receipt_url && (
          <a href={order.receipt_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] text-blue-600 hover:underline">
            <ExternalLink className="w-3 h-3" /> مشاهده رسید پرداخت
          </a>
        )}
        {order.notes && <p className="text-[10px] text-muted-foreground">توضیحات: {order.notes}</p>}
        {order.fulfillment_date && <p className="text-[10px] text-muted-foreground">زمان تحویل: {faTime(order.fulfillment_date)}</p>}
        {order.status === 'pending' && (
          <div className="flex gap-1">
            <Button size="sm" onClick={() => handleApprove(order)} disabled={processing}>
              <Check className="w-3 h-3" /> {isManual ? 'تأیید پرداخت' : 'تأیید و کسر از کیف پول'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setRejectingId(order.id)}>
              <X className="w-3 h-3" /> رد
            </Button>
          </div>
        )}
        {rejectingId === order.id && (
          <div className="flex gap-1">
            <Button size="sm" variant="destructive" onClick={() => handleReject(order)} disabled={processing}>تأیید رد</Button>
            <Button size="sm" variant="ghost" onClick={() => setRejectingId(null)}>انصراف</Button>
          </div>
        )}
        {order.status === 'approved' && (
          <Button size="sm" onClick={() => handleComplete(order)} disabled={processing}>
            <Truck className="w-3 h-3" /> علامت‌گذاری به‌عنوان تحویل‌شده
          </Button>
        )}
      </div>
    );
  };

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-1.5"><Package className="w-4 h-4" /> سفارش‌های UC</h3>
      {pending.length === 0 && active.length === 0 && done.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">سفارشی وجود ندارد.</p>
      ) : (
        <>
          {pending.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] text-amber-600 font-medium">{toFa(pending.length)} در انتظار</p>
              {pending.map(renderRow)}
            </div>
          )}
          {active.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] text-blue-600 font-medium">{toFa(active.length)} تأییدشده (منتظر تحویل)</p>
              {active.map(renderRow)}
            </div>
          )}
          {done.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] text-muted-foreground font-medium">تکمیل‌شده</p>
              {done.slice(0, 20).map(renderRow)}
            </div>
          )}
        </>
      )}
    </div>
  );
}