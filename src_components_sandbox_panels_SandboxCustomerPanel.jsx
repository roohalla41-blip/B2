import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSandbox } from '@/components/sandbox/SandboxProvider';
import { sandboxShopData, SHOP_CATEGORIES } from '@/components/sandbox/utils';
import { useToast } from '@/components/ui/use-toast';
import { fmt, faDate } from '@/components/sandbox/utils';
import { Home, Wallet, Store, Package, UserCog, AlertTriangle } from 'lucide-react';

const STATUS_LABEL = { pending: 'در انتظار', assigned: 'پذیرفته شده', completed: 'انجام شد', disputed: 'اختلاف' };
const TOPUP_STATUS = { pending: 'در انتظار تأیید', approved: 'تأیید شد', rejected: 'رد شد' };
const NAV = [
  { v: 'home', l: 'خانه', icon: Home },
  { v: 'wallet', l: 'کیف پول', icon: Wallet },
  { v: 'shop', l: 'فروشگاه', icon: Store },
  { v: 'orders', l: 'سفارش‌ها', icon: Package },
];

export function SandboxCustomerPanel() {
  const { session, state, actions } = useSandbox();
  const { toast } = useToast();
  const [tab, setTab] = useState('home');
  const [phone, setPhone] = useState('');
  const [sellerId, setSellerId] = useState('__none__');
  const [shopCat, setShopCat] = useState('all');

  // فرم درخواست افزایش موجودی
  const [topupAmount, setTopupAmount] = useState('');
  const [topupReceipt, setTopupReceipt] = useState('');
  const [topupDesc, setTopupDesc] = useState('');
  const [showTopupForm, setShowTopupForm] = useState(false);

  // فرم درخواست فروشندگی
  const [sellerReason, setSellerReason] = useState('');
  const [showSellerForm, setShowSellerForm] = useState(false);

  // فرم اعتراض
  const [disputeForm, setDisputeForm] = useState(null); // { orderId, message }

  const acc = state.accounts.find(a => a.id === session.id);
  const myOrders = state.orders.filter(o => o.customer_id === session.id);
  const approvedSellers = state.sellers.filter(s => s.status === 'active');
  const myLedger = state.wallet_ledger.filter(l => l.user_id === session.id);
  const myTopupRequests = state.wallet_topup_requests.filter(r => r.user_id === session.id);
  const mySellerRequests = state.seller_requests.filter(r => r.user_id === session.id);
  const myDisputes = state.disputes.filter(d => d.customer_id === session.id);
  const hasPendingSellerReq = mySellerRequests.some(r => r.status === 'pending');
  const isSeller = session.role === 'seller' || state.sellers.some(s => s.id === session.id);

  const filteredServices = shopCat === 'all' ? sandboxShopData : sandboxShopData.filter(s => s.category === shopCat);

  const buy = (svc) => {
    const targetSeller = sellerId === '__none__' ? null : sellerId;
    const r = actions.createOrder({
      customer_id: session.id, customer_name: session.name,
      service_key: svc.key, phone, seller_id: targetSeller,
    });
    if (!r.ok) { toast({ title: 'خطا', description: r.error, variant: 'destructive' }); return; }
    toast({ title: 'سفارش ثبت شد', description: r.order.order_code });
  };

  const submitTopup = () => {
    const r = actions.submitTopupRequest({
      user_id: session.id, user_name: session.name,
      amount: topupAmount, receipt_ref: topupReceipt, description: topupDesc,
    });
    if (!r.ok) { toast({ title: 'خطا', description: r.error, variant: 'destructive' }); return; }
    toast({ title: 'درخواست ثبت شد', description: 'تا تأیید مدیر موجودی تغییر نمی‌کند' });
    setTopupAmount(''); setTopupReceipt(''); setTopupDesc(''); setShowTopupForm(false);
  };

  const submitSeller = () => {
    const r = actions.submitSellerRequest({
      user_id: session.id, user_name: session.name, reason: sellerReason,
    });
    if (!r.ok) { toast({ title: 'خطا', description: r.error, variant: 'destructive' }); return; }
    toast({ title: 'درخواست فروشندگی ثبت شد', description: 'تا تأیید مدیر در انتظار می‌ماند' });
    setSellerReason(''); setShowSellerForm(false);
  };

  const fileDispute = () => {
    if (!disputeForm?.orderId || !disputeForm?.message?.trim()) {
      toast({ title: 'خطا', description: 'شرح اعتراض را وارد کنید', variant: 'destructive' });
      return;
    }
    const r = actions.reportProblem(disputeForm.orderId, { id: session.id, name: session.name }, disputeForm.message);
    if (!r.ok) { toast({ title: 'خطا', description: r.error, variant: 'destructive' }); return; }
    toast({ title: 'اعتراض ثبت شد', description: 'مدیر و فروشنده آن را بررسی می‌کنند' });
    setDisputeForm(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-1 bg-card rounded-lg p-1 border">
        {NAV.map(n => {
          const Icon = n.icon;
          return (
            <button key={n.v} onClick={() => setTab(n.v)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-md transition ${tab === n.v ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>
              <Icon className="w-4 h-4" /><span className="text-[10px]">{n.l}</span>
            </button>
          );
        })}
      </div>

      {tab === 'home' && (
        <Card><CardContent className="p-4 space-y-3">
          <div className="text-center">
            <p className="text-sm font-bold">سلام {session.name}</p>
            <p className="text-xs text-muted-foreground">به پنل مشتری آزمایشی خوش آمدید</p>
          </div>
          <div className="bg-primary/5 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">موجودی شما</p>
            <p className="text-xl font-bold text-primary">{fmt(acc?.balance || 0)} <span className="text-sm">افغانی</span></p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="gap-1.5" onClick={() => setTab('shop')}><Store className="w-4 h-4" /> خرید</Button>
            <Button variant="outline" className="gap-1.5" onClick={() => setTab('wallet')}><Wallet className="w-4 h-4" /> کیف پول</Button>
          </div>
          {!isSeller && (
            <Button variant="outline" className="w-full gap-1.5" disabled={hasPendingSellerReq} onClick={() => setShowSellerForm(!showSellerForm)}>
              <UserCog className="w-4 h-4" /> {hasPendingSellerReq ? 'درخواست فروشندگی در انتظار است' : 'درخواست فروشندگی'}
            </Button>
          )}
          {showSellerForm && !isSeller && !hasPendingSellerReq && (
            <div className="border rounded-lg p-2 space-y-2">
              <Textarea className="text-xs" rows={2} placeholder="دلیل درخواست فروشندگی (اختیاری)" value={sellerReason} onChange={e => setSellerReason(e.target.value)} />
              <Button size="sm" className="w-full" onClick={submitSeller}>ارسال درخواست</Button>
            </div>
          )}
          {myDisputes.filter(d => d.status === 'open').length > 0 && (
            <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-2 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <p className="text-[10px] text-red-700 dark:text-red-400">{myDisputes.filter(d => d.status === 'open').length} اعتراض در حال بررسی</p>
            </div>
          )}
          <div className="text-xs space-y-1">
            <p className="font-bold">سفارش‌های اخیر:</p>
            {myOrders.slice(0, 3).map(o => (
              <div key={o.id} className="flex justify-between border-b pb-1">
                <span>{o.service_name}</span>
                <Badge className={o.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}>
                  {STATUS_LABEL[o.status]}
                </Badge>
              </div>
            ))}
            {myOrders.length === 0 && <p className="text-muted-foreground">سفارشی ندارید</p>}
          </div>
        </CardContent></Card>
      )}

      {tab === 'wallet' && (
        <Card><CardContent className="p-3 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold">کیف پول</span>
            <Button size="sm" onClick={() => setShowTopupForm(!showTopupForm)}>+ درخواست افزایش</Button>
          </div>
          <p className="text-lg font-bold text-primary">{fmt(acc?.balance || 0)} افغانی</p>
          <p className="text-[10px] text-muted-foreground">موجودی فقط پس از تأیید مدیر افزایش می‌یابد.</p>

          {showTopupForm && (
            <div className="border rounded-lg p-2 space-y-2">
              <Input className="h-8" type="number" placeholder="مبلغ (افغانی)" value={topupAmount} onChange={e => setTopupAmount(e.target.value)} />
              <Input className="h-8" placeholder="شماره رسید / مرجع آزمایشی" value={topupReceipt} onChange={e => setTopupReceipt(e.target.value)} />
              <Input className="h-8" placeholder="توضیحات (اختیاری)" value={topupDesc} onChange={e => setTopupDesc(e.target.value)} />
              <Button size="sm" className="w-full" onClick={submitTopup}>ارسال درخواست</Button>
            </div>
          )}

          <div className="space-y-1">
            <p className="text-xs font-bold">درخواست‌های افزایش موجودی:</p>
            {myTopupRequests.length === 0 && <p className="text-xs text-muted-foreground">درخواستی ندارید</p>}
            {myTopupRequests.slice().reverse().map(r => (
              <div key={r.id} className="border rounded-lg p-2 space-y-0.5">
                <div className="flex justify-between">
                  <span className="text-xs font-medium">{fmt(r.amount)} افغانی</span>
                  <Badge className={r.status === 'approved' ? 'bg-green-100 text-green-700' : r.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}>
                    {TOPUP_STATUS[r.status]}
                  </Badge>
                </div>
                {r.approved_amount != null && r.approved_amount !== r.amount && (
                  <p className="text-[10px] text-green-600">مبلغ تأییدشده: {fmt(r.approved_amount)} افغانی (اصلاح شد)</p>
                )}
                <p className="text-[10px] text-muted-foreground">رسید: {r.receipt_ref} — {faDate(r.created_at)}</p>
                {r.reject_reason && <p className="text-[10px] text-red-600 bg-red-50 dark:bg-red-950/30 rounded p-1">دلیل رد: {r.reject_reason}</p>}
                {r.reviewed_by && <p className="text-[10px] text-muted-foreground">بررسی‌کننده: {r.reviewed_by}</p>}
              </div>
            ))}
          </div>

          <div className="space-y-1 pt-1 border-t">
            <p className="text-xs font-bold">تراکنش‌ها:</p>
            {myLedger.length === 0 && <p className="text-xs text-muted-foreground">تراکنشی نیست</p>}
            {myLedger.slice().reverse().map(l => (
              <div key={l.id} className="!flex justify-between text-xs border-b pb-1">
                <span>{l.description}</span>
                <span className={l.type === 'credit' ? 'text-green-600' : 'text-red-600'}>
                  {l.type === 'credit' ? '+' : '-'}{fmt(l.amount)}
                </span>
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

      {tab === 'shop' && (
        <Card><CardContent className="p-3 space-y-2">
          <p className="text-xs font-bold">فروشگاه آزمایشی</p>
          <Input className="h-8" placeholder="شماره موبایل مقصد" value={phone} onChange={e => setPhone(e.target.value)} />
          <Select value={sellerId} onValueChange={setSellerId}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="فروشندهٔ مقصد (اختیاری)" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__" className="text-xs">— عمومی —</SelectItem>
              {approvedSellers.map(sl => (
                <SelectItem key={sl.id} value={sl.id} className="text-xs">{sl.name} — {sl.code}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-1 flex-wrap">
            <button onClick={() => setShopCat('all')} className={`text-[10px] px-2 py-1 rounded ${shopCat === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>همه</button>
            {SHOP_CATEGORIES.map(c => (
              <button key={c.key} onClick={() => setShopCat(c.key)} className={`text-[10px] px-2 py-1 rounded ${shopCat === c.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{c.icon} {c.label}</button>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-1.5">
            {filteredServices.map(svc => (
              <div key={svc.key} className="flex items-center justify-between border rounded-lg p-2">
                <div>
                  <p className="text-xs font-medium">{svc.name}</p>
                  <p className="text-[10px] text-muted-foreground">{fmt(svc.amount)} افغانی</p>
                </div>
                <Button size="sm" disabled={(acc?.balance || 0) < svc.amount} onClick={() => buy(svc)}>خرید</Button>
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

      {tab === 'orders' && (
        <Card><CardContent className="p-3 space-y-2">
          <p className="text-xs font-bold">سفارش‌های من</p>
          {myOrders.length === 0 && <p className="text-xs text-muted-foreground text-center py-3">سفارشی ندارید</p>}
          {myOrders.slice().reverse().map(o => {
            const orderDispute = myDisputes.find(d => d.order_id === o.id);
            return (
              <div key={o.id} className="border rounded-lg p-2 space-y-1">
                <div className="flex justify-between">
                  <span className="text-xs font-medium">{o.service_name}</span>
                  <Badge className={o.status === 'completed' ? 'bg-green-100 text-green-700' : o.status === 'assigned' ? 'bg-blue-100 text-blue-700' : o.status === 'disputed' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}>
                    {STATUS_LABEL[o.status] || o.status}
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground">{o.order_code} — {faDate(o.created_at)}</p>
                {o.seller_name && <p className="text-[10px]">فروشنده: {o.seller_name}</p>}
                <p className="text-xs font-bold">{fmt(o.amount)} افغانی</p>
                {o.status === 'completed' && !orderDispute && (
                  <div className="pt-1 border-t">
                    {disputeForm?.orderId === o.id ? (
                      <div className="space-y-1.5">
                        <Textarea className="text-xs" rows={2} placeholder="بسته را دریافت نکرده‌ام — شرح اعتراض" value={disputeForm.message || ''} onChange={e => setDisputeForm({ ...disputeForm, message: e.target.value })} />
                        <div className="flex gap-1.5">
                          <Button size="sm" variant="destructive" className="flex-1 h-7" onClick={fileDispute}>ثبت اعتراض</Button>
                          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setDisputeForm(null)}>لغو</Button>
                        </div>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" className="w-full h-7 text-red-600" onClick={() => setDisputeForm({ orderId: o.id, message: '' })}>
                        <AlertTriangle className="w-3 h-3 ml-1" /> اعتراض به تحویل
                      </Button>
                    )}
                  </div>
                )}
                {orderDispute && (
                  <div className="pt-1 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-red-600">اعتراض ثبت شده</span>
                      <Badge className={orderDispute.status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                        {orderDispute.status === 'resolved' ? 'حل شد' : 'در حال بررسی'}
                      </Badge>
                    </div>
                    {orderDispute.resolution && <p className="text-[10px] text-blue-600">نتیجه: {orderDispute.resolution} — {orderDispute.resolution_reason}</p>}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent></Card>
      )}
    </div>
  );
}