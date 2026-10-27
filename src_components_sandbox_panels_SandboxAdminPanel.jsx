import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useSandbox } from '@/components/sandbox/SandboxProvider';
import { useToast } from '@/components/ui/use-toast';
import { fmt, faDate } from '@/components/sandbox/utils';
import { LayoutDashboard, Users, Store, AlertTriangle, Wallet } from 'lucide-react';

const NAV = [
  { v: 'dashboard', l: 'داشبورد', icon: LayoutDashboard },
  { v: 'topups', l: 'شارژ کیف پول', icon: Wallet },
  { v: 'sellers', l: 'فروشندگان', icon: Store },
  { v: 'requests', l: 'فروشندگی', icon: Users },
  { v: 'disputes', l: 'اختلافات', icon: AlertTriangle },
];

const REQ_STATUS = { pending: 'در انتظار', approved: 'تأیید شده', rejected: 'رد شده' };
const DSP_STATUS = { open: 'باز', resolved: 'حل شده' };
const DSP_RESOLUTION = { refund: 'بازگشت وجه', closed: 'تأیید فروشنده', reassigned: 'ارجاع مجدد' };

export function SandboxAdminPanel() {
  const { session, state, actions } = useSandbox();
  const { toast } = useToast();
  const [tab, setTab] = useState('dashboard');

  // وضعیت بازبینی شارژ
  const [topupReview, setTopupReview] = useState(null); // { id, correctedAmount, rejectReason }
  // وضعیت بازبینی فروشندگی
  const [sellerReview, setSellerReview] = useState(null); // { id, rejectReason }
  // وضعیت حل اختلاف
  const [disputeReview, setDisputeReview] = useState(null); // { id, resolution, reason }

  const accounts = state.accounts;
  const sellers = state.sellers;
  const requests = state.seller_requests;
  const topupRequests = state.wallet_topup_requests;
  const disputes = state.disputes;
  const totalOrders = state.orders.length;
  const totalSales = state.orders.filter(o => o.status === 'completed').reduce((s, o) => s + o.amount, 0);
  const pendingTopups = topupRequests.filter(r => r.status === 'pending').length;
  const pendingReqs = requests.filter(r => r.status === 'pending').length;
  const openDisputes = disputes.filter(d => d.status === 'open').length;

  const approveTopup = (id) => {
    const opts = {};
    if (topupReview?.correctedAmount) opts.corrected_amount = topupReview.correctedAmount;
    const r = actions.reviewTopupRequest(id, 'approved', session.name, opts);
    if (!r.ok) { toast({ title: 'خطا', description: r.error, variant: 'destructive' }); return; }
    toast({ title: 'درخواست شارژ تأیید شد' });
    setTopupReview(null);
  };

  const rejectTopup = (id) => {
    const opts = { reject_reason: topupReview?.rejectReason || '' };
    const r = actions.reviewTopupRequest(id, 'rejected', session.name, opts);
    if (!r.ok) { toast({ title: 'خطا', description: r.error, variant: 'destructive' }); return; }
    toast({ title: 'درخواست شارژ رد شد' });
    setTopupReview(null);
  };

  const approveReq = (id) => {
    const r = actions.reviewSellerRequest(id, 'approved', session.name);
    if (!r.ok) { toast({ title: 'خطا', description: r.error, variant: 'destructive' }); return; }
    toast({ title: 'درخواست فروشندگی تأیید شد' });
    setSellerReview(null);
  };

  const rejectReq = (id) => {
    const opts = { reject_reason: sellerReview?.rejectReason || '' };
    const r = actions.reviewSellerRequest(id, 'rejected', session.name, opts);
    if (!r.ok) { toast({ title: 'خطا', description: r.error, variant: 'destructive' }); return; }
    toast({ title: 'درخواست فروشندگی رد شد' });
    setSellerReview(null);
  };

  const resolveDispute = (id) => {
    const resolution = disputeReview?.resolution || 'refund';
    const reason = disputeReview?.reason || '';
    const r = actions.resolveDispute(id, resolution, reason, session.name);
    if (!r.ok) { toast({ title: 'خطا', description: r.error, variant: 'destructive' }); return; }
    toast({ title: 'اختلاف حل شد' });
    setDisputeReview(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-1 bg-card rounded-lg p-1 border overflow-x-auto scrollbar-thin">
        {NAV.map(n => {
          const Icon = n.icon;
          const badge = n.v === 'topups' ? pendingTopups : n.v === 'requests' ? pendingReqs : n.v === 'disputes' ? openDisputes : 0;
          return (
            <button key={n.v} onClick={() => setTab(n.v)}
              className={`flex-1 min-w-[60px] flex flex-col items-center gap-0.5 py-1.5 rounded-md transition relative ${tab === n.v ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>
              <Icon className="w-4 h-4" /><span className="text-[10px]">{n.l}</span>
              {badge > 0 && <span className="absolute top-0.5 left-0.5 bg-red-500 text-white text-[8px] rounded-full w-3.5 h-3.5 flex items-center justify-center">{badge}</span>}
            </button>
          );
        })}
      </div>

      {tab === 'dashboard' && (
        <Card><CardContent className="p-3 space-y-2">
          <p className="text-sm font-bold">داشبورد مدیر</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-muted/30 rounded-lg p-2 text-center">
              <p className="text-[10px] text-muted-foreground">حساب‌ها</p>
              <p className="text-lg font-bold">{accounts.length}</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-2 text-center">
              <p className="text-[10px] text-muted-foreground">فروشندگان</p>
              <p className="text-lg font-bold">{sellers.length}</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-2 text-center">
              <p className="text-[10px] text-muted-foreground">سفارش‌ها</p>
              <p className="text-lg font-bold">{totalOrders}</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-2 text-center">
              <p className="text-[10px] text-muted-foreground">فروش کل</p>
              <p className="text-sm font-bold">{fmt(totalSales)}</p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-2 text-center">
              <p className="text-[10px] text-muted-foreground">شارژ در انتظار</p>
              <p className="text-lg font-bold text-amber-600">{pendingTopups}</p>
            </div>
            <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-2 text-center">
              <p className="text-[10px] text-muted-foreground">اختلافات باز</p>
              <p className="text-lg font-bold text-red-600">{openDisputes}</p>
            </div>
          </div>
        </CardContent></Card>
      )}

      {tab === 'topups' && (
        <Card><CardContent className="p-3 space-y-2">
          <p className="text-xs font-bold">درخواست‌های شارژ کیف پول {pendingTopups > 0 && <Badge className="bg-amber-100 text-amber-700 ml-1">{pendingTopups} در انتظار</Badge>}</p>
          {topupRequests.length === 0 && <p className="text-xs text-muted-foreground text-center py-3">درخواستی نیست</p>}
          {topupRequests.slice().reverse().map(r => (
            <div key={r.id} className="border rounded-lg p-2 space-y-1">
              <div className="flex justify-between">
                <span className="text-xs font-medium">{r.user_name}</span>
                <Badge className={r.status === 'approved' ? 'bg-green-100 text-green-700' : r.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}>
                  {r.status === 'approved' ? 'تأیید شد' : r.status === 'rejected' ? 'رد شد' : 'در انتظار'}
                </Badge>
              </div>
              <div className="flex justify-between text-xs">
                <span>مبلغ درخواستی: <b>{fmt(r.amount)} افغانی</b></span>
                {r.approved_amount != null && r.approved_amount !== r.amount && (
                  <span>مبلغ تأییدشده: <b className="text-green-600">{fmt(r.approved_amount)}</b></span>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground">رسید: {r.receipt_ref} — {faDate(r.created_at)}</p>
              {r.description && <p className="text-[10px]">توضیحات مشتری: {r.description}</p>}
              {r.reject_reason && <p className="text-[10px] text-red-600 bg-red-50 dark:bg-red-950/30 rounded p-1">دلیل رد: {r.reject_reason}</p>}
              {r.reviewed_by && <p className="text-[10px] text-muted-foreground">بررسی‌کننده: {r.reviewed_by}</p>}
              {r.status === 'pending' && (
                <div className="space-y-1.5 pt-1 border-t">
                  {topupReview?.id === r.id ? (
                    <>
                      <Input className="h-8 text-xs" type="number" placeholder="اصلاح مبلغ (اختیاری)" value={topupReview.correctedAmount || ''} onChange={e => setTopupReview({ ...topupReview, correctedAmount: e.target.value })} />
                      <Textarea className="text-xs" rows={2} placeholder="دلیل رد (برای رد درخواست)" value={topupReview.rejectReason || ''} onChange={e => setTopupReview({ ...topupReview, rejectReason: e.target.value })} />
                      <div className="flex gap-1.5">
                        <Button size="sm" className="flex-1 h-7" onClick={() => approveTopup(r.id)}>تأیید و شارژ</Button>
                        <Button size="sm" variant="destructive" className="flex-1 h-7" onClick={() => rejectTopup(r.id)}>رد درخواست</Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setTopupReview(null)}>لغو</Button>
                      </div>
                    </>
                  ) : (
                    <Button size="sm" variant="outline" className="w-full h-7" onClick={() => setTopupReview({ id: r.id, correctedAmount: '', rejectReason: '' })}>بررسی درخواست</Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </CardContent></Card>
      )}

      {tab === 'sellers' && (
        <Card><CardContent className="p-3 space-y-2">
          <p className="text-xs font-bold">فروشندگان</p>
          {sellers.length === 0 && <p className="text-xs text-muted-foreground text-center py-3">فروشنده‌ای نیست</p>}
          {sellers.map(s => (
            <div key={s.id} className="border rounded-lg p-2 flex justify-between items-center">
              <div>
                <p className="text-xs font-medium">{s.name} — کد {s.code}</p>
                <p className="text-[10px] text-muted-foreground">سفارش‌ها: {s.total_orders} — فروش: {fmt(s.total_sales)}</p>
              </div>
              <Badge className={s.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                {s.status === 'active' ? 'فعال' : s.status}
              </Badge>
            </div>
          ))}
        </CardContent></Card>
      )}

      {tab === 'requests' && (
        <Card><CardContent className="p-3 space-y-2">
          <p className="text-xs font-bold">درخواست‌های فروشندگی</p>
          {requests.length === 0 && <p className="text-xs text-muted-foreground text-center py-3">درخواستی نیست</p>}
          {requests.map(r => (
            <div key={r.id} className="border rounded-lg p-2 space-y-1">
              <div className="flex justify-between">
                <span className="text-xs font-medium">{r.user_name}</span>
                <Badge className={r.status === 'approved' ? 'bg-green-100 text-green-700' : r.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}>
                  {REQ_STATUS[r.status]}
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground">موجودی: {fmt(r.balance_at_request)} — {faDate(r.created_at)}</p>
              {r.reason && <p className="text-[10px]">دلیل درخواست: {r.reason}</p>}
              {r.reject_reason && <p className="text-[10px] text-red-600 bg-red-50 dark:bg-red-950/30 rounded p-1">دلیل رد: {r.reject_reason}</p>}
              {r.reviewed_by && <p className="text-[10px] text-muted-foreground">بررسی‌کننده: {r.reviewed_by}</p>}
              {r.status === 'pending' && (
                <div className="space-y-1.5 pt-1 border-t">
                  {sellerReview?.id === r.id ? (
                    <>
                      <Textarea className="text-xs" rows={2} placeholder="دلیل رد (برای رد درخواست)" value={sellerReview.rejectReason || ''} onChange={e => setSellerReview({ ...sellerReview, rejectReason: e.target.value })} />
                      <div className="flex gap-1.5">
                        <Button size="sm" className="flex-1 h-7" onClick={() => approveReq(r.id)}>تأیید</Button>
                        <Button size="sm" variant="destructive" className="flex-1 h-7" onClick={() => rejectReq(r.id)}>رد</Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setSellerReview(null)}>لغو</Button>
                      </div>
                    </>
                  ) : (
                    <Button size="sm" variant="outline" className="w-full h-7" onClick={() => setSellerReview({ id: r.id, rejectReason: '' })}>بررسی درخواست</Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </CardContent></Card>
      )}

      {tab === 'disputes' && (
        <Card><CardContent className="p-3 space-y-2">
          <p className="text-xs font-bold">اختلافات</p>
          {disputes.length === 0 && <p className="text-xs text-muted-foreground text-center py-3">اختلافی نیست</p>}
          {disputes.map(d => (
            <div key={d.id} className="border rounded-lg p-2 space-y-1">
              <div className="flex justify-between">
                <span className="text-xs font-medium">{d.order_code}</span>
                <Badge className={d.status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                  {DSP_STATUS[d.status]}
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground">{d.service_name} — {fmt(d.amount)} افغانی</p>
              <p className="text-[10px]">مشتری: {d.customer_name} — فروشنده: {d.seller_name || '—'}</p>
              {d.resolution && <p className="text-[10px] text-blue-600 bg-blue-50 dark:bg-blue-950/30 rounded p-1">نتیجه: {DSP_RESOLUTION[d.resolution] || d.resolution} — {d.resolution_reason}</p>}
              {d.resolved_by && <p className="text-[10px] text-muted-foreground">حل‌کننده: {d.resolved_by}</p>}
              {d.status === 'open' && (
                <div className="space-y-1.5 pt-1 border-t">
                  {disputeReview?.id === d.id ? (
                    <>
                      <Textarea className="text-xs" rows={2} placeholder="دلیل تصمیم" value={disputeReview.reason || ''} onChange={e => setDisputeReview({ ...disputeReview, reason: e.target.value })} />
                      <div className="flex gap-1.5">
                        <Button size="sm" variant="secondary" className="flex-1 h-7" onClick={() => setDisputeReview({ ...disputeReview, resolution: 'refund' })}>بازگشت وجه</Button>
                        <Button size="sm" variant="outline" className="flex-1 h-7" onClick={() => setDisputeReview({ ...disputeReview, resolution: 'closed' })}>تأیید فروشنده</Button>
                        <Button size="sm" className="flex-1 h-7" onClick={() => resolveDispute(d.id)}>ثبت</Button>
                      </div>
                      <p className="text-[10px] text-muted-foreground text-center">انتخاب نوع تصمیم، سپس ثبت</p>
                    </>
                  ) : (
                    <Button size="sm" variant="outline" className="w-full h-7" onClick={() => setDisputeReview({ id: d.id, resolution: 'refund', reason: '' })}>بررسی و حل</Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </CardContent></Card>
      )}
    </div>
  );
}