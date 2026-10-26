import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useSandbox } from '@/components/sandbox/SandboxProvider';
import { useToast } from '@/components/ui/use-toast';
import { Check, X } from 'lucide-react';

const fmt = (n) => Number(n || 0).toLocaleString('fa-IR');
const faDate = (iso) => iso ? new Date(iso).toLocaleString('fa-IR') : '-';

export function SandboxSellerRequests() {
  const { state, actions, activeRole } = useSandbox();
  const { toast } = useToast();
  const [reason, setReason] = useState('');

  const customer = state.identities.customer;
  const reqs = state.seller_requests;

  const submit = () => {
    const r = actions.submitSellerRequest({ user_id: customer.id, user_name: customer.name, reason });
    if (!r.ok) {
      toast({ title: 'ارسال نشد', description: `${r.error} (موجودی: ${fmt(r.balance)}، حداقل: ${fmt(r.required)})`, variant: 'destructive' });
      return;
    }
    setReason('');
    toast({ title: 'درخواست ثبت شد', description: 'در انتظار تأیید سازنده' });
  };

  const review = (id, decision) => {
    actions.reviewSellerRequest(id, decision, 'سازنده');
    toast({ title: decision === 'approved' ? 'درخواست تأیید شد' : 'درخواست رد شد' });
  };

  return (
    <div className="space-y-3">
      {activeRole === 'customer' ? (
        <Card><CardContent className="p-4 space-y-2">
          <h3 className="text-sm font-bold">درخواست فروشندگی (به‌عنوان مشتری)</h3>
          <p className="text-xs text-muted-foreground">حداقل موجودی لازم: {fmt(state.settings.min_credit_for_seller_request)} افغانی — موجودی فعلی: {fmt(customer.balance)}</p>
          <Textarea placeholder="دلیل درخواست فروشندگی..." value={reason} onChange={e => setReason(e.target.value)} rows={2} />
          <Button size="sm" onClick={submit}>ثبت درخواست</Button>
        </CardContent></Card>
      ) : (
        <p className="text-xs text-muted-foreground p-2">برای ثبت درخواست، از تب «هویت‌ها» وارد نقش مشتری شوید.</p>
      )}

      <div className="space-y-2">
        {reqs.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">درخواستی ثبت نشده</p>}
        {reqs.map(r => (
          <Card key={r.id}><CardContent className="p-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{r.user_name}</span>
              <Badge className={r.status === 'approved' ? 'bg-green-100 text-green-700' : r.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}>
                {r.status === 'approved' ? 'تأیید شده' : r.status === 'rejected' ? 'رد شده' : 'در انتظار'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">موجودی هنگام درخواست: {fmt(r.balance_at_request)} — {faDate(r.created_at)}</p>
            {r.reason && <p className="text-xs">{r.reason}</p>}
            {r.status === 'pending' && (
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="default" className="gap-1 h-7" onClick={() => review(r.id, 'approved')}><Check className="w-3.5 h-3.5" /> تأیید</Button>
                <Button size="sm" variant="outline" className="gap-1 h-7 text-destructive" onClick={() => review(r.id, 'rejected')}><X className="w-3.5 h-3.5" /> رد</Button>
              </div>
            )}
          </CardContent></Card>
        ))}
      </div>
    </div>
  );
}