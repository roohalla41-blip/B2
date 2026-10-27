import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCustomers, useBankAccounts, useAgents, usePostDocument, useCurrencies } from '@/lib/useSarraaf';
import { useAuth } from '@/lib/AuthContext';
import { PageHeader } from '@/components/sarraaf/Pieces';
import { Field, AmountInput, CurrencySelect, CounterAccountSelect } from '@/components/sarraaf/Fields';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { buildDadogereftLines } from '@/lib/ledgerApi';
import { toast } from '@/components/ui/use-toast';
import { ArrowLeftRight, Loader2 } from 'lucide-react';

export default function Dadogereft() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user } = useAuth();
  const customerId = params.get('customer') || '';

  const { data: customers } = useCustomers();
  const { data: currencies } = useCurrencies();
  const { data: bankAccounts } = useBankAccounts();
  const { data: agents } = useAgents();
  const postMut = usePostDocument();

  const [customer, setCustomer] = useState(customerId);
  const [type, setType] = useState('receive');
  const [currency, setCurrency] = useState('AFN');
  const [amount, setAmount] = useState(0);
  const [counterType, setCounterType] = useState('cash');
  const [counterId, setCounterId] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customer || !amount || amount <= 0) {
      toast({ title: 'خطا', description: 'مشتری و مبلغ الزامی است', variant: 'destructive' });
      return;
    }
    const cust = (customers || []).find(c => c.id === customer);
    const lines = buildDadogereftLines({
      customer_id: customer,
      customer_name: cust?.name || '',
      direction: type,
      currency,
      amount,
      counter_type: counterType,
      counter_id: counterId,
    });
    try {
      await postMut.mutateAsync({
        doc_type: 'dadogereft',
        currency,
        amount,
        related_type: 'customer',
        related_id: customer,
        related_name: cust?.name || '',
        description: description || (type === 'receive' ? 'دریافت از مشتری' : 'پرداخت به مشتری'),
        lines,
      });
      toast({ title: 'ثبت شد', description: 'عملیات با موفقیت ثبت شد' });
      navigate(`/customers/${customer}`);
    } catch (err) {
      toast({ title: 'خطا', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <>
      <PageHeader title="داد و گرفت" subtitle="دریافت / پرداخت" icon={ArrowLeftRight} />

      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <Field label="مشتری" required>
          <Select value={customer} onValueChange={setCustomer}>
            <SelectTrigger><SelectValue placeholder="انتخاب مشتری" /></SelectTrigger>
            <SelectContent>
              {(customers || []).map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name} {c.phone ? `— ${c.phone}` : ''}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="نوع عملیات" required>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="receive">دریافت از مشتری</SelectItem>
              <SelectItem value="pay">پرداخت به مشتری</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="ارز" required>
            <CurrencySelect value={currency} onChange={setCurrency} currencies={currencies} />
          </Field>
          <Field label="مبلغ" required>
            <AmountInput value={amount} onChange={setAmount} />
          </Field>
        </div>

        <Field label="حساب مقابل">
          <CounterAccountSelect
            value={counterId}
            onChange={setCounterId}
            bankAccounts={bankAccounts}
            agents={agents}
            type={counterType}
            onTypeChange={setCounterType}
          />
        </Field>

        <Field label="توضیحات">
          <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} />
        </Field>

        <Button type="submit" className="w-full" disabled={postMut.isPending}>
          {postMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowLeftRight className="w-4 h-4" />}
          ثبت
        </Button>
      </form>
    </>
  );
}