import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useSandbox } from '@/components/sandbox/SandboxProvider';
import { sandboxShopData, SHOP_CATEGORIES } from '@/components/sandbox/utils';
import { useToast } from '@/components/ui/use-toast';
import { fmt, faDate } from '@/components/sandbox/utils';
import { LayoutDashboard, Package, Wallet, AlertTriangle, Store } from 'lucide-react';

const STATUS_LABEL = { pending: 'در انتظار', assigned: 'پذیرفته شده', completed: 'انجام شد', disputed: 'اختلاف' };
const DSP_STATUS = { open: 'باز', resolved: 'حل شده' };
const NAV = [
  { v: 'dashboard', l: 'داشبورد', icon: LayoutDashboard },
  { v: 'orders', l: 'سفارش‌ها', icon: Package },
  { v: 'services', l: 'خدمات', icon: Store },
  { v: 'disputes', l: 'اعتراض‌ها', icon: AlertTriangle },
  { v: 'wallet', l: 'کیف پول', icon: Wallet },
];

export function SandboxSellerPanel() {
  const { session, state, actions } = useSandbox();
  const { toast } = useToast();
  const [tab, setTab] = useState('dashboard');
  const [receiptRef, setReceiptRef] = useState('');
  const [notes, setNotes] = useState('');
  const [disputeReply, setDisputeReply] = useState(null);

  const acc = state.accounts.find(a => a.id === session.id);
  const sellerProfile = state.sellers.find(s => s.id === session.id);
  const available = state.orders.filter(o => o.status === 'pending' && (!o.target_seller_id || o.target_seller_id === session.id));
  const myOrders = state.orders.filter(o => o.seller_id === session.id);
  const myLedger = state.wallet_ledger.filter(l => l.user_id === session.id);
  const myDisputes = state.disputes.filter(d => d.seller_id === session.id);

  const accept = (id) => {
    const r = actions.acceptOrder(id, { id: session.id, name: session.name });
    if (!r.ok) { toast({ title: 'خطا', description: r.error, variant: 'destructive' }); return; }
    toast({ title: 'سفارش پذیرفته شد' });
  };

  const complete = (id) => {
    const r = actions.completeOrder(id, { id: session.id, name: session.name }, { receipt_ref: receiptRef || 'رسید نمونه', notes });
    if (!r.ok) { toast({ title: 'خطا', description: r.error, variant: 'destructive' }); return; }
    toast({ title: 'سفارش تکمیل شد' });
    setReceiptRef(''); setNotes('');
  };

  const sendDisputeReply = () => {
    if (!disputeReply?.disputeId || !disputeReply?.message?.trim()) return;
    actions.addDisputeMessage(disputeReply.disputeId, { id: session.id, name: session.name, role: 'seller' }, disputeReply.message);
    toast({ title: 'پاسخ ارسال شد' });
    setDisputeReply(null);
  };

  if (!sellerProfile) {
    return (
      <Card><CardContent className="p-4 text-center space-y-2">
        <p className="text-xs font-bold">حساب فروشنده تأیید نشده</p>
        <p className="text-xs text-muted-foreground">این حساب هنوز به‌عنوان فروشنده تأیید نشده. از پنل مدیر، درخواست فروشندگی را تأیید کنید.</p>
      </CardContent></Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-1 bg-card rounded-lg p-1 border overflow-x-auto scrollbar-thin">
        {NAV.map(n => {
          const Icon = n.icon;
          const badge = n.v === 'disputes' ? myDisputes.filter(d => d.status === 'open').length : 0;
          return (
            <button key={n.v} onClick={() => setTab(n.v)}
              className={`flex-1 min-w-[50px] flex flex-col items-center gap-0.5 py-1.5 rounded-md transition relative ${tab === n.v ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>
              <Icon className="w-4 h-4" /><span className="text-[10px]">{n.l}</span>
              {badge > 0 && <span className="absolute top-0.5 left-0.5 bg-red-500 text-white text-[8px] rounded-full w-3.5 h-3.5 flex items-center justify-center">{badge}</span>}
            </button>
          );
        })}
      </div>

      {tab === 'dashboard' && (
        <Card><CardContent className="p-3 space-y-2">
          <p className="text-sm font-bold">داشبورد فروشنده</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-muted/30 rounded-lg p-2 text-center">
              <p className="text-[10px] text-muted-foreground">سفارش‌های فعال</p>
              <p className="text-lg font-bold">{myOrders.filter(o => o.status === 'assigned').length}</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-2 text-center">
              <p className="text-[10px] text-muted-foreground">تکمیل‌شده</p>
              <p className="text-lg font-bold">{sellerProfile.total_orders}</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-2 text-center">
              <p className="text-[10px] text-muted-foreground">فروش کل</p>
              <p className="text-sm font-bold">{fmt(sellerProfile.total_sales)}</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-2 text-center">
              <p className="text-[10px] text-muted-foreground">موجودی</p>
              <p className="text-sm font-bold">{fmt(acc?.balance || 0)}</p>
            </div>
          </div>
          <div className="text-xs">
            <p className="font-bold mb-1">سفارش‌های در انتظار:</p>
            {available.length === 0 && <p className="text-muted-foreground">سفارش جدیدی نیست</p>}
            {available.slice(0, 3).map(o => (
              <div key={o.id} className="flex justify-between border-b pb-1">
                <span>{o.service_name} — {o.customer_name}</span>
                <Button size="sm" className="h-6" onClick={() => accept(o.id)}>قبول</Button>
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

      {tab === 'orders' && (
        <Card><CardContent className="p-3 space-y-2">
          <p className="text-xs font-bold">سفارش‌های من</p>
          {myOrders.length === 0 && <p className="text-xs text-muted-foreground text-center py-3">سفارشی ندارید</p>}
          {myOrders.slice().reverse().map(o => (
            <div key={o.id} className="border rounded-lg p-2 space-y-1">
              <div className="flex justify-between">
                <span className="text-xs font-medium">{o.service_name}</span>
                <Badge className={o.status === 'completed' ? 'bg-green-100 text-green-700' : o.status === 'assigned' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}>
                  {STATUS_LABEL[o.status]}
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground">{o.order_code}</p>
              <p className="text-[10px]">مشتری: {o.customer_name} — تلفن: {o.phone || '—'}</p>
              <p className="text-xs font-bold">{fmt(o.amount)} افغانی</p>
              {o.status === 'assigned' && (
                <div className="space-y-1 pt-1 border-t">
                  <Input className="h-7" placeholder="مرجع رسید" value={receiptRef} onChange={e => setReceiptRef(e.target.value)} />
                  <Input className="h-7" placeholder="یادداشت" value={notes} onChange={e => setNotes(e.target.value)} />
                  <Button size="sm" className="w-full" onClick={() => complete(o.id)}>تأیید تکمیل</Button>
                </div>
              )}
            </div>
          ))}
        </CardContent></Card>
      )}

      {tab === 'services' && (
        <Card><CardContent className="p-3 space-y-2">
          <p className="text-xs font-bold">خدمات قابل ارائه</p>
          <p className="text-[10px] text-muted-foreground">خدماتی که به‌عنوان فروشنده می‌توانید انجام دهید:</p>
          {SHOP_CATEGORIES.map(cat => (
            <div key={cat.key} className="space-y-1">
              <p className="text-[10px] font-bold text-muted-foreground">{cat.icon} {cat.label}</p>
              {sandboxShopData.filter(s => s.category === cat.key).map(svc => (
                <div key={svc.key} className="flex justify-between items-center border rounded-lg p-1.5">
                  <span className="text-[11px]">{svc.name}</span>
                  <span className="text-[10px] font-bold">{fmt(svc.amount)} افغانی</span>
                </div>
              ))}
            </div>
          ))}
        </CardContent></Card>
      )}

      {tab === 'disputes' && (
        <Card><CardContent className="p-3 space-y-2">
          <p className="text-xs font-bold">اعتراض‌های سفارش‌های من</p>
          {myDisputes.length === 0 && <p className="text-xs text-muted-foreground text-center py-3">اعتراضی نیست</p>}
          {myDisputes.map(d => (
            <div key={d.id} className="border rounded-lg p-2 space-y-1">
              <div className="flex justify-between">
                <span className="text-xs font-medium">{d.order_code}</span>
                <Badge className={d.status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                  {DSP_STATUS[d.status]}
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground">{d.service_name} — {fmt(d.amount)} افغانی</p>
              <p className="text-[10px]">مشتری: {d.customer_name}</p>
              {d.resolution && <p className="text-[10px] text-blue-600 bg-blue-50 dark:bg-blue-950/30 rounded p-1">نتیجه: {d.resolution} — {d.resolution_reason}</p>}
              {d.status === 'open' && (
                <div className="pt-1 border-t">
                  {disputeReply?.disputeId === d.id ? (
                    <div className="space-y-1.5">
                      <Textarea className="text-xs" rows={2} placeholder="پاسخ به اعتراض" value={disputeReply.message || ''} onChange={e => setDisputeReply({ ...disputeReply, message: e.target.value })} />
                      <div className="flex gap-1.5">
                        <Button size="sm" className="flex-1 h-7" onClick={sendDisputeReply}>ارسال</Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setDisputeReply(null)}>لغو</Button>
                      </div>
                    </div>
                  ) : (
                    <Button size="sm" variant="outline" className="w-full h-7" onClick={() => setDisputeReply({ disputeId: d.id, message: '' })}>پاسخ به اعتراض</Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </CardContent></Card>
      )}

      {tab === 'wallet' && (
        <Card><CardContent className="p-3 space-y-2">
          <p className="text-xs font-bold">کیف پول فروشنده</p>
          <p className="text-lg font-bold text-primary">{fmt(acc?.balance || 0)} افغانی</p>
          <div className="space-y-1">
            {myLedger.length === 0 && <p className="text-xs text-muted-foreground">تراکنشی نیست</p>}
            {myLedger.slice().reverse().map(l => (
              <div key={l.id} className="flex justify-between text-xs border-b pb-1">
                <span>{l.description}</span>
                <span className={l.type === 'credit' ? 'text-green-600' : 'text-red-600'}>
                  {l.type === 'credit' ? '+' : '-'}{fmt(l.amount)}
                </span>
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}
    </div>
  );
}