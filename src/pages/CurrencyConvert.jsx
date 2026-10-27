import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useCustomers, useCurrencies, useCustomerBalances, usePostDocument } from '@/lib/useSarraaf';
import { PageHeader } from '@/components/sarraaf/Pieces';
import { Field, AmountInput, CurrencySelect } from '@/components/sarraaf/Fields';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { buildConversionLines } from '@/lib/ledgerApi';
import { formatNumber } from '@/lib/sarraaf';
import { toast } from '@/components/ui/use-toast';
import { ArrowRightLeft, Loader2 } from 'lucide-react';

export default function CurrencyConvert() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const customerId = params.get('customer') || '';
  const { data: customers } = useCustomers();
  const { data: currencies } = useCurrencies();
  const { data: customerBalancesData } = useCustomerBalances();
  const postMut = usePostDocument();

  const [customer, setCustomer] = useState(customerId);
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [fromAmount, setFromAmount] = useState(0);
  const [toCurrency, setToCurrency] = useState('AFN');
  const [toAmount, setToAmount] = useState(0);
  const [rate, setRate] = useState(0);

  const custBalRow = (customerBalancesData || []).find(b => String(b.customer_id) === String(customer));
  const balances = custBalRow ? { [custBalRow.balance_currency || 'AFN']: custBalRow.net_balance || 0 } : {};

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customer || !fromAmount || !toAmount || !rate) {
      toast({ title: 'خطا', description: 'تمام فیلدها الزامی است', variant: 'destructive' });
      return;
    }
    const lines = buildConversionLines({ from_currency: fromCurrency, from_amount: fromAmount, to_currency: toCurrency, to_amount: toAmount, rate });
    try {
      await postMut.mutateAsync({
        doc_type: 'convert',
        currency: fromCurrency,
        amount: fromAmount,
        related_type: 'customer',
        related_id: customer,
        description: `تبدیل ${fromCurrency} به ${toCurrency}`,
        lines,
      });
      toast({ title: 'ثبت شد' });
      navigate(`/customers/${customer}`);
    } catch (err) {
      toast({ title: 'خطا', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <>
      <PageHeader title="تبدیل ارز" icon={ArrowRightLeft} />
      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <Field label="مشتری" required>
          <Select value={customer} onValueChange={setCustomer}>
            <SelectTrigger><SelectValue placeholder="انتخاب مشتری" /></SelectTrigger>
            <SelectContent>
              {(customers || []).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        {Object.keys(balances).length > 0 && (
          <div className="p-3 rounded-lg bg-muted text-xs space-y-1">
            <p className="font-medium">موجودی:</p>
            {Object.entries(balances).map(([cur, val]) => (
              <p key={cur}>{cur}: {formatNumber(val)}</p>
            ))}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="از ارز" required>
            <CurrencySelect value={fromCurrency} onChange={setFromCurrency} currencies={currencies} />
          </Field>
          <Field label="به ارز" required>
            <CurrencySelect value={toCurrency} onChange={setToCurrency} currencies={currencies} />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Field label="مقدار" required><AmountInput value={fromAmount} onChange={setFromAmount} /></Field>
          <Field label="نرخ" required><AmountInput value={rate} onChange={setRate} placeholder="نرخ" /></Field>
          <Field label="مبلغ تبدیل"><AmountInput value={toAmount} onChange={setToAmount} /></Field>
        </div>
        <Button type="submit" className="w-full" disabled={postMut.isPending}>
          {postMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRightLeft className="w-4 h-4" />}
          ثبت تبدیل
        </Button>
      </form>
    </>
  );
}