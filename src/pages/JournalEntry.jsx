import React, { useState } from 'react';
import { useCustomers, useBankAccounts, useAgents, usePostDocument } from '@/lib/useSarraaf';
import { PageHeader } from '@/components/sarraaf/Pieces';
import { AmountInput } from '@/components/sarraaf/Fields';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { buildManualVoucher } from '@/lib/ledger';
import { toast } from '@/components/ui/use-toast';
import { BookCopy, Plus, Trash2, Loader2 } from 'lucide-react';

export default function JournalEntry() {
  const { data: customers } = useCustomers();
  const { data: bankAccounts } = useBankAccounts();
  const { data: agents } = useAgents();
  const postMut = usePostDocument();

  const [lines, setLines] = useState([
    { account_type: 'cash', counter_id: '', currency: 'AFN', amount: 0, side: 'debit', description: '' },
    { account_type: 'cash', counter_id: '', currency: 'AFN', amount: 0, side: 'credit', description: '' },
  ]);

  const updateLine = (i, field, value) => {
    const next = [...lines];
    next[i] = { ...next[i], [field]: value };
    setLines(next);
  };

  const addLine = () => setLines([...lines, { account_type: 'cash', counter_id: '', currency: 'AFN', amount: 0, side: 'debit', description: '' }]);
  const removeLine = (i) => setLines(lines.filter((_, idx) => idx !== i));

  const balances = {};
  lines.forEach(l => {
    const cur = l.currency;
    if (!balances[cur]) balances[cur] = { debit: 0, credit: 0 };
    if (l.side === 'debit') balances[cur].debit += l.amount || 0;
    else balances[cur].credit += l.amount || 0;
  });
  const isBalanced = Object.values(balances).every(b => Math.abs(b.debit - b.credit) < 1);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (lines.length < 2) { toast({ title: 'خطا', description: 'حداقل ۲ خط لازم است', variant: 'destructive' }); return; }
    if (!isBalanced) { toast({ title: 'خطا', description: 'سند ناتراز است', variant: 'destructive' }); return; }
    const built = buildManualVoucher(lines);
    try {
      await postMut.mutateAsync(built);
      toast({ title: 'ثبت شد' });
    } catch (err) {
      toast({ title: 'خطا', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <>
      <PageHeader title="سند دستی" icon={BookCopy} />
      <form onSubmit={handleSubmit} className="space-y-3">
        {lines.map((line, i) => (
          <div key={i} className="p-3 rounded-xl border space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">خط {i + 1}</span>
              {lines.length > 2 && <Button type="button" size="icon" variant="ghost" onClick={() => removeLine(i)}><Trash2 className="w-4 h-4 text-destructive" /></Button>}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Select value={line.account_type} onValueChange={v => updateLine(i, 'account_type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">صندوق</SelectItem>
                  <SelectItem value="bank">بانک</SelectItem>
                  <SelectItem value="agent">نماینده</SelectItem>
                  <SelectItem value="customer">مشتری</SelectItem>
                </SelectContent>
              </Select>
              <Select value={line.currency} onValueChange={v => updateLine(i, 'currency', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="AFN">AFN</SelectItem><SelectItem value="USD">USD</SelectItem><SelectItem value="IRT">IRT</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Select value={line.side} onValueChange={v => updateLine(i, 'side', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="debit">بدهکار</SelectItem><SelectItem value="credit">بستانکار</SelectItem></SelectContent>
              </Select>
              <AmountInput value={line.amount} onChange={v => updateLine(i, 'amount', v)} />
            </div>
            <Input value={line.description} onChange={e => updateLine(i, 'description', e.target.value)} placeholder="توضیحات" />
          </div>
        ))}
        <Button type="button" variant="outline" className="w-full" onClick={addLine}><Plus className="w-4 h-4" /> افزودن خط</Button>
        <div className={`text-sm text-center font-medium ${isBalanced ? 'text-success' : 'text-destructive'}`}>
          {isBalanced ? '✓ سند تراز است' : '✗ سند ناتراز است'}
        </div>
        <Button type="submit" className="w-full" disabled={postMut.isPending || !isBalanced}>
          {postMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'ثبت سند'}
        </Button>
      </form>
    </>
  );
}