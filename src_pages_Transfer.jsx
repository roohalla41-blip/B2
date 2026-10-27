import React, { useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useCustomers, useAgents, useCreateTransfer, useCurrencies } from '@/lib/useSarraaf';
import { PageHeader } from '@/components/sarraaf/Pieces';
import { Field, AmountInput, CurrencySelect } from '@/components/sarraaf/Fields';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// Transfer now uses postTransfer directly via useCreateTransfer mutation
import { toast } from '@/components/ui/use-toast';
import { Send, Loader2 } from 'lucide-react';

export default function Transfer() {
  const { direction } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const customerId = params.get('customer') || '';
  const agentId = params.get('agent') || '';
  const isSend = direction === 'send';

  const { data: customers } = useCustomers();
  const { data: agents } = useAgents();
  const { data: currencies } = useCurrencies();
  const createMut = useCreateTransfer();

  const [customer, setCustomer] = useState(customerId);
  const [senderName, setSenderName] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [destination, setDestination] = useState('');
  const [currency, setCurrency] = useState('AFN');
  const [amount, setAmount] = useState(0);
  const [rate, setRate] = useState(0);
  const [fee, setFee] = useState(0);
  const [agent, setAgent] = useState(agentId);
  const [description, setDescription] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customer || !amount) { toast({ title: 'خطا', description: 'مشتری و مبلغ الزامی است', variant: 'destructive' }); return; }
    try {
      const result = await createMut.mutateAsync({
        direction: isSend ? 'send' : 'receive',
        sender_name: senderName, sender_phone: senderPhone,
        receiver_name: receiverName, receiver_phone: receiverPhone,
        destination, amount, currency, rate, fee, description,
      });
      toast({ title: 'ثبت شد', description: `حواله ${result.transfer_number || ''} ثبت شد` });
      navigate('/transfer-book');
    } catch (err) {
      toast({ title: 'خطا', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <>
      <PageHeader title={isSend ? 'حواله ارسال' : 'حواله دریافت'} icon={Send} />
      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <Field label="مشتری" required>
          <Select value={customer} onValueChange={setCustomer}>
            <SelectTrigger><SelectValue placeholder="انتخاب مشتری" /></SelectTrigger>
            <SelectContent>
              {(customers || []).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="نام فرستنده"><Input value={senderName} onChange={e => setSenderName(e.target.value)} /></Field>
          <Field label="موبایل فرستنده"><Input value={senderPhone} onChange={e => setSenderPhone(e.target.value)} inputMode="numeric" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="نام گیرنده" required><Input value={receiverName} onChange={e => setReceiverName(e.target.value)} required /></Field>
          <Field label="موبایل گیرنده"><Input value={receiverPhone} onChange={e => setReceiverPhone(e.target.value)} inputMode="numeric" /></Field>
        </div>
        <Field label="مقصد"><Input value={destination} onChange={e => setDestination(e.target.value)} /></Field>
        <div className="grid grid-cols-3 gap-2">
          <Field label="ارز" required>
            <CurrencySelect value={currency} onChange={setCurrency} currencies={currencies} />
          </Field>
          <Field label="مبلغ" required><AmountInput value={amount} onChange={setAmount} /></Field>
          <Field label="نرخ"><AmountInput value={rate} onChange={setRate} placeholder="نرخ" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="کارمزد"><AmountInput value={fee} onChange={setFee} /></Field>
          <Field label="نماینده">
            <Select value={agent} onValueChange={setAgent}>
              <SelectTrigger><SelectValue placeholder="نماینده" /></SelectTrigger>
              <SelectContent>
                {(agents || []).map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <Field label="توضیحات"><Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} /></Field>
        <Button type="submit" className="w-full" disabled={createMut.isPending}>
          {createMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          ثبت حواله
        </Button>
      </form>
    </>
  );
}