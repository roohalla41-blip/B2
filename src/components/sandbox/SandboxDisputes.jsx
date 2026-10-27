import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useSandbox } from '@/components/sandbox/SandboxProvider';
import { useToast } from '@/components/ui/use-toast';
import { faDate, fmt, disputeWindowEnd, isWindowExpired } from '@/components/sandbox/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const DISPUTE_STATUS = { open: 'باز', resolved: 'حل‌شده' };
const RESOLUTIONS = [
  { v: 'resolved', l: 'حل‌شده' },
  { v: 'unresolved', l: 'تأیید نشدن ادعا' },
  { v: 'need_more_docs', l: 'نیازمند مدارک بیشتر' },
  { v: 'escalate', l: 'ارجاع برای بررسی بیشتر' },
];

export function SandboxDisputes() {
  const { state, actions, activeRole } = useSandbox();
  const { toast } = useToast();
  const [msg, setMsg] = useState('');
  const [active, setActive] = useState(null);
  const [resolution, setResolution] = useState('resolved');
  const [reason, setReason] = useState('');

  const customer = state.identities.customer;
  const completedOrders = state.orders.filter(o => o.status === 'completed' && o.customer_id === customer.id);

  const report = (order) => {
    if (!msg.trim()) { toast({ title: 'پیام خالی است', variant: 'destructive' }); return; }
    const r = actions.reportProblem(order.id, customer, msg);
    if (!r.ok) { toast({ title: 'خطا', description: r.error, variant: 'destructive' }); return; }
    setMsg(''); toast({ title: 'پروندهٔ پیگیری باز شد' });
  };

  const sendMessage = (disputeId, sender) => {
    if (!msg.trim()) return;
    actions.addDisputeMessage(disputeId, sender, msg);
    setMsg('');
  };

  const resolve = (disputeId) => {
    actions.resolveDispute(disputeId, resolution, reason, 'سازنده');
    setReason(''); toast({ title: 'تصمیم ثبت شد' });
  };

  const activeDispute = active ? state.disputes.find(d => d.id === active) : null;
  const disputeMsgs = activeDispute ? state.dispute_messages.filter(m => m.dispute_id === activeDispute.id) : [];
  const disputeEvents = activeDispute ? state.dispute_events.filter(e => e.dispute_id === activeDispute.id) : [];

  return (
    <div className="space-y-3">
      {/* مشتری: گزارش مشکل */}
      {activeRole === 'customer' && (
        <Card><CardContent className="p-3 space-y-2">
          <h4 className="text-xs font-bold">گزارش مشکل برای سفارش‌های انجام‌شده</h4>
          {completedOrders.length === 0 && <p className="text-xs text-muted-foreground">سفارش انجام‌شده‌ای ندارید</p>}
          {completedOrders.map(o => {
            const end = disputeWindowEnd(o.completed_at, state.settings.dispute_window_hours);
            const expired = isWindowExpired(o.completed_at, state.settings.dispute_window_hours);
            return (
              <div key={o.id} className="border rounded-lg p-2 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{o.service_name}</span>
                  <span className="text-[10px] text-muted-foreground">{o.order_code}</span>
                </div>
                <p className="text-[10px] text-muted-foreground">انجام شد: {faDate(o.completed_at)} — پایان مهلت ۴ ساعته: {faDate(end)} {expired && '(منقضی)'}</p>
                <Textarea className="text-xs" rows={2} placeholder="مشکل خود را توضیح دهید..." value={msg} onChange={e => setMsg(e.target.value)} />
                <Button size="sm" variant="destructive" className="h-7" onClick={() => report(o)}>شارژ من هنوز فعال نشده</Button>
              </div>
            );
          })}
        </CardContent></Card>
      )}

      {/* لیست پرونده‌ها */}
      <Card><CardContent className="p-3">
        <h4 className="text-xs font-bold mb-2">پرونده‌های پیگیری</h4>
        <div className="space-y-1">
          {state.disputes.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">پرونده‌ای وجود ندارد</p>}
          {state.disputes.map(d => (
            <button key={d.id} onClick={() => setActive(d.id)} className={`w-full text-right border rounded-lg p-2 ${active === d.id ? 'border-primary' : ''}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">{d.order_code} — {d.service_name}</span>
                <Badge className={d.status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>{DISPUTE_STATUS[d.status]}</Badge>
              </div>
              <p className="text-[10px] text-muted-foreground">فروشنده: {d.seller_name} ({d.seller_code}) — {fmt(d.amount)} افغانی</p>
            </button>
          ))}
        </div>
      </CardContent></Card>

      {/* اتاق پیگیری */}
      {activeDispute && (
        <Card><CardContent className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold">اتاق پیگیری — {activeDispute.order_code}</h4>
            <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setActive(null)}>بستن</Button>
          </div>
          <div className="text-[11px] text-muted-foreground space-y-0.5">
            <p>مشتری: {activeDispute.customer_name}</p>
            <p>فروشنده: {activeDispute.seller_name} ({activeDispute.seller_code})</p>
            <p>خدمت: {activeDispute.service_name} — مبلغ: {fmt(activeDispute.amount)}</p>
            <p>زمان باز شدن: {faDate(activeDispute.created_at)}</p>
          </div>

          {/* پیام‌ها */}
          <div className="border rounded-lg p-2 max-h-40 overflow-y-auto scrollbar-thin space-y-1">
            {disputeMsgs.length === 0 && <p className="text-[11px] text-muted-foreground text-center">پیامی نیست</p>}
            {disputeMsgs.map(m => (
              <div key={m.id} className="text-xs">
                <span className="font-medium">{m.sender_name}</span> <span className="text-[10px] text-muted-foreground">({m.sender_role})</span>:
                <p className="pr-3">{m.message}</p>
              </div>
            ))}
          </div>

          {/* افزودن پیام سازنده */}
          <Textarea className="text-xs" rows={2} placeholder="پیام / نظر..." value={msg} onChange={e => setMsg(e.target.value)} />
          <Button size="sm" variant="outline" className="h-7" onClick={() => sendMessage(activeDispute.id, { id: 'creator', name: 'سازنده', role: 'creator' })}>ثبت پیام</Button>

          {/* تاریخچه رویدادها */}
          <div className="text-[11px] text-muted-foreground">
            <p className="font-bold mb-1">تاریخچه:</p>
            {disputeEvents.map(ev => (
              <p key={ev.id}>• {ev.details} — {faDate(ev.created_at)} ({ev.actor})</p>
            ))}
          </div>

          {/* تصمیم نهایی سازنده */}
          {activeDispute.status === 'open' && (
            <div className="border-t pt-2 space-y-1">
              <p className="text-xs font-bold">تصمیم نهایی (سازنده):</p>
              <Select value={resolution} onValueChange={setResolution}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RESOLUTIONS.map(r => <SelectItem key={r.v} value={r.v}>{r.l}</SelectItem>)}
                </SelectContent>
              </Select>
              <Textarea className="text-xs" rows={2} placeholder="دلیل تصمیم" value={reason} onChange={e => setReason(e.target.value)} />
              <Button size="sm" className="h-7" onClick={() => resolve(activeDispute.id)}>ثبت تصمیم</Button>
            </div>
          )}
          {activeDispute.status === 'resolved' && (
            <div className="border-t pt-2 text-xs">
              <p className="font-bold">تصمیم نهایی: {activeDispute.resolution}</p>
              <p className="text-muted-foreground">دلیل: {activeDispute.resolution_reason}</p>
              <p className="text-[10px] text-muted-foreground">توسط: {activeDispute.resolved_by} — {faDate(activeDispute.resolved_at)}</p>
            </div>
          )}
        </CardContent></Card>
      )}
    </div>
  );
}