import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useWallets } from '@/lib/useCustomer';
import { createWithdrawalRequest as serverCreateWithdrawal } from '@/lib/customerApi';
import { WITHDRAWAL_METHODS } from '@/lib/walletWithdrawal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, ArrowDownToLine, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { AmountInput } from '@/components/sarraaf/Fields';

export default function CustomerWithdraw() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: wallets = [], isLoading } = useWallets();
  const [amount, setAmount] = useState(0);
  const [walletId, setWalletId] = useState('');
  const [method, setMethod] = useState('bank_transfer');
  const [destination, setDestination] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (wallets.length > 0 && !walletId) {
      setWalletId(wallets[0].id);
    }
  }, [wallets, walletId]);

  async function handleSubmit() {
    const amt = parseFloat(amount) || 0;
    if (!amt || amt <= 0) {
      toast({ title: 'خطا', description: 'مبلغ معتبر وارد کنید', variant: 'destructive' });
      return;
    }
    if (!walletId) {
      toast({ title: 'خطا', description: 'کیف پول انتخاب کنید', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      await serverCreateWithdrawal({
        walletId,
        amount: amt,
        method,
        destination,
        description,
      });
      toast({ title: 'موفق', description: 'درخواست برداشت ثبت شد و در انتظار تأیید است' });
      navigate('/customer/wallet');
    } catch (err) {
      toast({ title: 'خطا', description: err.message, variant: 'destructive' });
    }
    setSubmitting(false);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const selectedWallet = wallets.find(w => w.id === walletId);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate('/customer/wallet')}>
          <ArrowRight className="w-4 h-4" />
        </Button>
        <h1 className="text-lg font-bold">برداشت از کیف پول</h1>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div>
            <Label className="text-xs">کیف پول</Label>
            <Select value={walletId} onValueChange={setWalletId}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="انتخاب کیف پول" /></SelectTrigger>
              <SelectContent>
                {wallets.map(w => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.currency} — موجودی: {w.balance || 0}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedWallet && (
            <div className="p-2 rounded-lg bg-muted/50 text-xs text-muted-foreground">
              موجودی قابل برداشت: {selectedWallet.balance || 0} {selectedWallet.currency}
            </div>
          )}

          <div>
            <Label className="text-xs">مبلغ برداشت</Label>
            <AmountInput value={amount} onChange={setAmount} placeholder="0" />
          </div>

          <div>
            <Label className="text-xs">روش برداشت</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {WITHDRAWAL_METHODS.map(m => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">مقصد (شماره حساب / نام نمایندگی)</Label>
            <Input
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="مثلاً: حساب بانکی یا کد نمایندگی"
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-xs">توضیحات (اختیاری)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 min-h-[60px]"
            />
          </div>

          <Button onClick={handleSubmit} disabled={submitting} className="w-full">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowDownToLine className="w-4 h-4" />}
            ثبت درخواست برداشت
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}