import React, { useState } from 'react';
import { useBankAccounts, useCreateBankAccount, useCurrencies, useBankBalances, useTransactions } from '@/lib/useSarraaf';
import { PageHeader, BalanceCard, TransactionRow, LoadingState } from '@/components/sarraaf/Pieces';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { CurrencySelect } from '@/components/sarraaf/Fields';
import { TX_TYPE_LABELS } from '@/lib/sarraaf';
import { Landmark, Plus, Loader2 } from 'lucide-react';

export default function Bank() {
  const { data: txs, isLoading } = useTransactions();
  const { data: bankAccounts } = useBankAccounts();
  const { data: currencies } = useCurrencies();
  const { data: bankBalancesData } = useBankBalances();
  const createMut = useCreateBankAccount();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ bank_name: '', holder: '', card_number: '', account_number: '', currency: 'AFN', branch: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await createMut.mutateAsync(form);
    setDialogOpen(false);
    setForm({ bank_name: '', holder: '', card_number: '', account_number: '', currency: 'AFN', branch: '' });
  };

  const getBankBalance = (bankId) => {
    const b = (bankBalancesData || []).find(x => String(x.bank_id) === String(bankId));
    return b ? { [b.currency]: b.current_balance || 0 } : {};
  };

  return (
    <>
      <PageHeader title="بانک" icon={Landmark}
        actions={<Button size="sm" onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4" /> حساب جدید</Button>}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-4">
        {(bankAccounts || []).length === 0 ? (
          <BalanceCard label="حساب بانکی" amounts={{ AFN: 0 }} />
        ) : (
          (bankAccounts || []).map(b => {
            const bal = getBankBalance(b.id);
            return <BalanceCard key={b.id} label={`${b.bank_name} - ${b.currency}`} amounts={bal} />;
          })
        )}
      </div>
      {isLoading ? <LoadingState /> : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-1 lg:gap-2">
          {(txs || []).filter(t => t.counter_type === 'bank').slice(0, 20).map(tx => (
            <TransactionRow key={tx.id} tx={tx} labels={TX_TYPE_LABELS} />
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>حساب بانکی جدید</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div><Label>نام بانک</Label><Input value={form.bank_name} onChange={e => setForm({...form, bank_name: e.target.value})} required /></div>
            <div><Label>دارنده</Label><Input value={form.holder} onChange={e => setForm({...form, holder: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>شماره کارت</Label><Input value={form.card_number} onChange={e => setForm({...form, card_number: e.target.value})} inputMode="numeric" /></div>
              <div><Label>شماره حساب</Label><Input value={form.account_number} onChange={e => setForm({...form, account_number: e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>ارز</Label>
                <CurrencySelect value={form.currency} onChange={v => setForm({...form, currency: v})} currencies={currencies} />
              </div>
              <div><Label>شعبه</Label><Input value={form.branch} onChange={e => setForm({...form, branch: e.target.value})} /></div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>انصراف</Button>
              <Button type="submit" disabled={createMut.isPending}>{createMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'افزودن'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}