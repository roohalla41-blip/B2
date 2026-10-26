import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSandbox } from '@/components/sandbox/SandboxProvider';
import { useToast } from '@/components/ui/use-toast';

const fmt = (n) => Number(n || 0).toLocaleString('fa-IR');
const faDate = (iso) => iso ? new Date(iso).toLocaleString('fa-IR') : '-';

export function SandboxWallet() {
  const { state, actions } = useSandbox();
  const { toast } = useToast();
  const [form, setForm] = useState({ user_id: 'demo-customer', amount: '', seller_code: '', description: '', receipt_ref: '' });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = () => {
    const amt = Number(form.amount);
    if (!amt || amt <= 0) { toast({ title: 'مبلغ نامعتبر', variant: 'destructive' }); return; }
    actions.topUp({ user_id: form.user_id, amount: amt, seller_code: form.seller_code, description: form.description, receipt_ref: form.receipt_ref });
    setForm(f => ({ ...f, amount: '', description: '', receipt_ref: '' }));
    toast({ title: 'موجودی آزمایشی افزایش یافت' });
  };

  const ledger = [...state.wallet_ledger].reverse();

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Card><CardContent className="p-3 text-center">
          <p className="text-xs text-muted-foreground">مشتری</p>
          <p className="text-lg font-bold">{fmt(state.identities.customer.balance)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-xs text-muted-foreground">فروشنده</p>
          <p className="text-lg font-bold">{fmt(state.identities.seller.balance)}</p>
        </CardContent></Card>
      </div>

      <Card><CardContent className="p-4 space-y-2">
        <h3 className="text-sm font-bold">افزایش موجودی آزمایشی</h3>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">کاربر</Label>
            <select className="w-full h-9 rounded-md border border-input bg-transparent px-2 text-sm" value={form.user_id} onChange={e => set('user_id', e.target.value)}>
              <option value="demo-customer">مشتری آزمایشی</option>
              <option value="demo-seller">فروشنده آزمایشی</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">مبلغ (افغانی)</Label>
            <Input value={form.amount} onChange={e => set('amount', e.target.value)} inputMode="numeric" />
          </div>
          <div>
            <Label className="text-xs">کد فروشنده (اختیاری)</Label>
            <Input value={form.seller_code} onChange={e => set('seller_code', e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">شماره رسید (نمونه)</Label>
            <Input value={form.receipt_ref} onChange={e => set('receipt_ref', e.target.value)} />
          </div>
        </div>
        <Input placeholder="توضیحات" value={form.description} onChange={e => set('description', e.target.value)} />
        <Button size="sm" onClick={submit}>ثبت افزایش موجودی</Button>
      </CardContent></Card>

      <Card><CardContent className="p-3">
        <h4 className="text-xs font-bold mb-2">دفترکل آزمایشی</h4>
        <div className="space-y-1 max-h-64 overflow-y-auto scrollbar-thin">
          {ledger.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">تراکنشی ثبت نشده</p>}
          {ledger.map(e => (
            <div key={e.id} className="flex items-center justify-between text-xs border-b pb-1">
              <div>
                <span className={e.type === 'credit' ? 'text-green-600' : 'text-red-600'}>{e.type === 'credit' ? '+' : '-'}{fmt(e.amount)}</span>
                <span className="text-muted-foreground mr-2">{e.description}</span>
              </div>
              <span className="text-[10px] text-muted-foreground">{faDate(e.date)}</span>
            </div>
          ))}
        </div>
      </CardContent></Card>
    </div>
  );
}