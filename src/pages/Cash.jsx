import React, { useState } from 'react';
import { useTransactions, useBankAccounts, useSafes, useCreateSafe, useUpdateSafe, useCurrencies, usePostDocument } from '@/lib/useSarraaf';
import { PageHeader, BalanceCard, TransactionRow, EmptyState, LoadingState } from '@/components/sarraaf/Pieces';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CurrencySelect, AmountInput } from '@/components/sarraaf/Fields';
import { TX_TYPE_LABELS } from '@/lib/sarraaf';
import { buildTransferLines, buildOpeningBalanceLines } from '@/lib/ledgerApi';
import { useTreasuryBalances } from '@/lib/useSarraaf';
import { toast } from '@/components/ui/use-toast';
import { Banknote, ArrowRightLeft, Plus, Pencil, Loader2 } from 'lucide-react';

export default function Cash() {
  const { data: txs, isLoading } = useTransactions();
  const { data: bankAccounts } = useBankAccounts();
  const { data: safes, error: safesError } = useSafes();
  const { data: currencies } = useCurrencies();
  const postMut = usePostDocument();
  const createSafeMut = useCreateSafe();
  const updateSafeMut = useUpdateSafe();

  const [transferOpen, setTransferOpen] = useState(false);
  const [fromType, setFromType] = useState('cash');
  const [toType, setToType] = useState('bank');
  const [bankId, setBankId] = useState('');
  const [currency, setCurrency] = useState('AFN');
  const [amount, setAmount] = useState(0);
  const [description, setDescription] = useState('');

  const [safeDialogOpen, setSafeDialogOpen] = useState(false);
  const [editingSafe, setEditingSafe] = useState(null);
  const [safeForm, setSafeForm] = useState({ name: '', currency: 'AFN', opening_balance: 0 });

  const { data: treasuryBalances } = useTreasuryBalances();
  const balances = {};
  for (const b of (treasuryBalances || [])) {
    balances[b.currency] = b.balance;
  }
  const cashTxs = (txs || []).filter(t => t.counter_type === 'cash').slice(0, 20);
  const safeList = safes || [];

  const openSafeDialog = (safe = null) => {
    if (safe) {
      setEditingSafe(safe);
      setSafeForm({ name: safe.name, currency: safe.currency, opening_balance: safe.opening_balance || 0 });
    } else {
      setEditingSafe(null);
      setSafeForm({ name: '', currency: 'AFN', opening_balance: 0 });
    }
    setSafeDialogOpen(true);
  };

  const handleSaveSafe = async (e) => {
    e.preventDefault();
    if (!safeForm.name || !safeForm.currency) return;

    // بررسی محدودیت ۴ صندوق (فقط هنگام ایجاد جدید)
    if (!editingSafe && safeList.length >= 4) {
      toast({
        title: 'هشدار',
        description: 'هر صراف نهایتاً می‌تواند ۴ صندوق ایجاد کند.',
        variant: 'destructive',
      });
      return;
    }

    // بررسی ارز تکراری
    const duplicate = safeList.find(s => s.currency === safeForm.currency && s.id !== editingSafe?.id);
    if (duplicate) {
      toast({
        title: 'هشدار',
        description: `صندوقی با ارز ${safeForm.currency} قبلاً ثبت شده است. هر صندوق باید ارز منحصراً فرد داشته باشد.`,
        variant: 'destructive',
      });
      return;
    }

    try {
      if (editingSafe) {
        await updateSafeMut.mutateAsync({ id: editingSafe.id, data: safeForm });
        toast({ title: 'صندوق ویرایش شد' });
      } else {
        const order = safeList.length;
        const created = await createSafeMut.mutateAsync({ ...safeForm, display_order: order, active: true });

        // ثبت سند افتتاح حساب برای موجودی اولیه
        if (safeForm.opening_balance && safeForm.opening_balance > 0) {
          const lines = buildOpeningBalanceLines({
            customer_id: created.id,
            customer_name: safeForm.name,
            currency: safeForm.currency,
            amount: safeForm.opening_balance,
          });
          await postMut.mutateAsync({
            doc_type: 'open_balance',
            currency: safeForm.currency,
            amount: safeForm.opening_balance,
            related_type: 'safe',
            related_id: created.id,
            related_name: safeForm.name,
            description: `افتتاح صندوق ${safeForm.name}`,
            lines,
          });
        }
        toast({ title: 'صندوق ایجاد شد' });
      }
      setSafeDialogOpen(false);
    } catch (err) {
      toast({ title: 'خطا', description: err.message, variant: 'destructive' });
    }
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    if (!amount || amount <= 0) return;
    const lines = buildTransferLines({
      from_type: fromType, from_id: fromType === 'bank' ? bankId : currency,
      to_type: toType, to_id: toType === 'bank' ? bankId : currency,
      currency, amount,
    });
    try {
      await postMut.mutateAsync({
        doc_type: 'internal_transfer',
        currency,
        amount,
        description: description || 'انتقال داخلی',
        lines,
      });
      toast({ title: 'ثبت شد' });
      setTransferOpen(false);
      setAmount(0);
    } catch (err) {
      toast({ title: 'خطا', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <>
      <PageHeader title="صندوق" icon={Banknote}
        actions={
          <>
            <Button size="sm" variant="outline" onClick={() => openSafeDialog(null)}><Plus className="w-4 h-4" /> صندوق جدید</Button>
            <Button size="sm" onClick={() => setTransferOpen(true)}><ArrowRightLeft className="w-4 h-4" /> ثبت جدید</Button>
          </>
        }
      />

      {safesError && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          خطا در بارگذاری صندوق‌ها: {safesError.message}
        </div>
      )}
      {/* کارت‌های صندوق */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
        {safeList.length === 0 ? (
          Object.keys(balances).length === 0 ? (
            <BalanceCard label="صندوق" amounts={{ AFN: 0 }} />
          ) : (
            Object.entries(balances).map(([cur, val]) => (
              <BalanceCard key={cur} label={`صندوق ${cur}`} amounts={{ [cur]: val }} />
            ))
          )
        ) : (
          safeList.map(safe => {
            const bal = balances[safe.currency] ?? safe.opening_balance ?? 0;
            return (
              <div key={safe.id} className="relative group">
                <BalanceCard label={safe.name} amounts={{ [safe.currency]: bal }} />
                <button
                  onClick={() => openSafeDialog(safe)}
                  className="absolute top-2 left-2 p-1 rounded-md bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              </div>
            );
          })
        )}
      </div>

      <h3 className="text-sm font-semibold mb-2">گردش صندوق</h3>
      {isLoading ? <LoadingState /> : cashTxs.length === 0 ? <EmptyState title="تراکنشی نیست" /> : (
        <div className="space-y-1">
          {cashTxs.map(tx => <TransactionRow key={tx.id} tx={tx} labels={TX_TYPE_LABELS} />)}
        </div>
      )}

      {/* دیالوگ انتقال داخلی */}
      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>انتقال داخلی</DialogTitle></DialogHeader>
          <form onSubmit={handleTransfer} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>مبدأ</Label>
                <Select value={fromType} onValueChange={setFromType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="cash">صندوق</SelectItem><SelectItem value="bank">بانک</SelectItem></SelectContent>
                </Select>
              </div>
              <div>
                <Label>مقصد</Label>
                <Select value={toType} onValueChange={setToType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="cash">صندوق</SelectItem><SelectItem value="bank">بانک</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            {(fromType === 'bank' || toType === 'bank') && (
              <div>
                <Label>حساب بانکی</Label>
                <Select value={bankId} onValueChange={setBankId}>
                  <SelectTrigger><SelectValue placeholder="حساب" /></SelectTrigger>
                  <SelectContent>
                    {(bankAccounts || []).map(b => <SelectItem key={b.id} value={b.id}>{b.bank_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>ارز</Label>
                <CurrencySelect value={currency} onChange={setCurrency} currencies={currencies} />
              </div>
              <div><Label>مبلغ</Label><AmountInput value={amount} onChange={setAmount} /></div>
            </div>
            <div><Label>توضیحات</Label><Input value={description} onChange={e => setDescription(e.target.value)} /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setTransferOpen(false)}>پایان</Button>
              <Button type="submit" disabled={postMut.isPending}>{postMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'ثبت'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* دیالوگ افزودن/ویرایش صندوق */}
      <Dialog open={safeDialogOpen} onOpenChange={setSafeDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingSafe ? 'ویرایش صندوق' : 'صندوق جدید'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSaveSafe} className="space-y-3">
            <div><Label>نام صندوق</Label><Input value={safeForm.name} onChange={e => setSafeForm({ ...safeForm, name: e.target.value })} placeholder="صندوق اصلی" required /></div>
            <div>
              <Label>ارز</Label>
              <CurrencySelect
                value={safeForm.currency}
                onChange={v => setSafeForm({ ...safeForm, currency: v })}
                currencies={currencies}
                disabled={!!editingSafe}
              />
              {editingSafe && <p className="text-xs text-muted-foreground mt-1">ارز صندوق پس از ایجاد قابل تغییر نیست</p>}
            </div>
            <div>
              <Label>مبلغ افتتاح صندوق</Label>
              <AmountInput value={safeForm.opening_balance} onChange={v => setSafeForm({ ...safeForm, opening_balance: v })} disabled={!!editingSafe} />
              {editingSafe && <p className="text-xs text-muted-foreground mt-1">مبلغ افتتاح ثابت است و قابل تغییر نیست</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSafeDialogOpen(false)}>انصراف</Button>
              <Button type="submit" disabled={createSafeMut.isPending || updateSafeMut.isPending}>
                {(createSafeMut.isPending || updateSafeMut.isPending) ? <Loader2 className="w-4 h-4 animate-spin" /> : 'ذخیره'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}