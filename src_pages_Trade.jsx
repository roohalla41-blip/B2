import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTradeData } from '@/lib/useTradeData';
import { PageHeader } from '@/components/sarraaf/Pieces';
import { Field, AmountInput, CurrencySelect, CounterAccountSelect } from '@/components/sarraaf/Fields';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import SheetSelect from '@/components/sarraaf/SheetSelect';
import { buildBuyLines, buildSellLines } from '@/lib/ledgerApi';
import { suggestRate } from '@/lib/exchange';
import { toast } from '@/components/ui/use-toast';
import { Repeat, Loader2 } from 'lucide-react';

export default function Trade() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const customerId = params.get('customer') || '';
  const modeParam = params.get('mode') || 'buy';

  const { customers, currencies, bankAccounts, agents, isLoading, error, postMut } = useTradeData();

  const [customer, setCustomer] = useState(customerId);
  const [mode, setMode] = useState(modeParam);
  const [tradeCurrency, setTradeCurrency] = useState('USD');
  const [settleCurrency, setSettleCurrency] = useState('AFN');
  const [amount, setAmount] = useState(0);
  const [rate, setRate] = useState(0);
  const [counterType, setCounterType] = useState('cash');
  const [counterId, setCounterId] = useState('');
  const [fee, setFee] = useState(0);
  const [feeCurrency, setFeeCurrency] = useState('AFN');
  const [description, setDescription] = useState('');

  const settleAmount = amount * rate;

  if (isLoading) {
    return (
      <>
        <PageHeader title="خرید / فروش" icon={Repeat} />
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader title="خرید / فروش" icon={Repeat} />
        <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
          خطا در بارگذاری داده‌ها: {error.message}
        </div>
      </>
    );
  }

  const handleSuggestRate = () => {
    const r = suggestRate(currencies || [], tradeCurrency, mode);
    if (r) setRate(r);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customer || !amount || !rate) {
      toast({ title: 'خطا', description: 'مشتری، مبلغ و نرخ الزامی است', variant: 'destructive' });
      return;
    }
    const cust = (customers || []).find(c => c.id === customer);
    const settleAmount = amount * rate;
    const lines = mode === 'buy'
      ? buildBuyLines({
          customer_id: customer, customer_name: cust?.name || '',
          currency: tradeCurrency, amount,
          paid_amount: settleAmount, paid_currency: settleCurrency,
          fee, fee_currency: feeCurrency,
        })
      : buildSellLines({
          customer_id: customer, customer_name: cust?.name || '',
          currency: tradeCurrency, amount,
          received_amount: settleAmount, received_currency: settleCurrency,
          fee, fee_currency: feeCurrency,
        });
    try {
      await postMut.mutateAsync({
        doc_type: mode,
        currency: tradeCurrency,
        amount,
        fee,
        related_type: 'customer',
        related_id: customer,
        related_name: cust?.name || '',
        description: description || (mode === 'buy' ? `خرید ${tradeCurrency}` : `فروش ${tradeCurrency}`),
        lines,
      });
      toast({ title: 'ثبت شد', description: 'معامله ثبت شد' });
      navigate(`/customers/${customer}`);
    } catch (err) {
      toast({ title: 'خطا', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <>
      <PageHeader title="خرید / فروش" icon={Repeat} />
      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant={mode === 'buy' ? 'default' : 'outline'} onClick={() => setMode('buy')}>خرید</Button>
          <Button type="button" variant={mode === 'sell' ? 'default' : 'outline'} onClick={() => setMode('sell')}>فروش</Button>
        </div>
        <Field label="مشتری" required>
          <SheetSelect
            value={customer}
            onValueChange={setCustomer}
            options={(customers || []).map(c => ({ value: c.id, label: c.name }))}
            placeholder="انتخاب مشتری"
            title="انتخاب مشتری"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="ارز معامله" required>
            <CurrencySelect value={tradeCurrency} onChange={setTradeCurrency} currencies={currencies} />
          </Field>
          <Field label="ارز تسویه">
            <CurrencySelect value={settleCurrency} onChange={setSettleCurrency} currencies={currencies} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="مقدار" required>
            <AmountInput value={amount} onChange={setAmount} />
          </Field>
          <Field label="نرخ">
            <div className="flex gap-1">
              <AmountInput value={rate} onChange={setRate} placeholder="نرخ" />
              <Button type="button" size="sm" variant="outline" onClick={handleSuggestRate}>پیشنهاد</Button>
            </div>
          </Field>
        </div>
        <div className="p-3 rounded-lg bg-muted text-sm">
          <span className="text-muted-foreground">مبلغ تسویه: </span>
          <span className="font-bold">{new Intl.NumberFormat('en-US').format(Math.round(settleAmount))} {settleCurrency}</span>
        </div>
        <Field label="حساب تسویه">
          <CounterAccountSelect value={counterId} onChange={setCounterId} bankAccounts={bankAccounts} agents={agents} type={counterType} onTypeChange={setCounterType} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="کارمزد">
            <AmountInput value={fee} onChange={setFee} />
          </Field>
          <Field label="ارز کارمزد">
            <CurrencySelect value={feeCurrency} onChange={setFeeCurrency} currencies={currencies} />
          </Field>
        </div>
        <Field label="توضیحات"><Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} /></Field>
        <Button type="submit" className="w-full" disabled={postMut.isPending}>
          {postMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Repeat className="w-4 h-4" />}
          ثبت
        </Button>
      </form>
    </>
  );
}