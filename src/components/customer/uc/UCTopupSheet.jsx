import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Loader2, CheckCircle } from 'lucide-react';
import { submitUCTopup, uploadReceipt } from '@/lib/ucApi';
import { toast } from '@/components/ui/use-toast';

export default function UCTopupSheet({ open, onOpenChange, userId, userName, currency, onSubmitted }) {
  const [amount, setAmount] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptUrl, setReceiptUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadReceipt(file, userId);
      setReceiptUrl(url);
      setReceiptFile(file);
      toast({ title: 'رسید بارگذاری شد' });
    } catch (err) {
      toast({ title: 'خطا در بارگذاری رسید', description: err.message, variant: 'destructive' });
    }
    setUploading(false);
  };

  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast({ title: 'خطا', description: 'مبلغ را وارد کنید', variant: 'destructive' });
      return;
    }
    if (!receiptUrl) {
      toast({ title: 'خطا', description: 'رسید پرداخت را بارگذاری کنید', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      await submitUCTopup({
        user_id: userId,
        user_name: userName,
        amount: parseFloat(amount),
        currency: currency || 'AFN',
        receipt_url: receiptUrl,
        sender_name: userName,
        card_last4: cardNumber ? cardNumber.replace(/\s/g, '').slice(-4) : '',
        description: `افزایش موجودی کیف پول ${currency || 'AFN'}`,
      });
      toast({ title: 'درخواست ثبت شد', description: 'پس از تأیید سازنده، موجودی شما افزایش می‌یابد.' });
      setAmount('');
      setCardNumber('');
      setReceiptFile(null);
      setReceiptUrl('');
      onSubmitted?.();
    } catch (err) {
      toast({ title: 'خطا', description: err.message, variant: 'destructive' });
    }
    setSubmitting(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>افزایش موجودی کیف پول ({currency || 'AFN'})</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 p-4">
          <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-[11px] text-amber-800 dark:text-amber-400">
            مبلغ را به حساب صرافی واریز کنید، سپس تصویر رسید را بارگذاری نمایید. پس از تأیید سازنده، موجودی کیف پول شما افزایش می‌یابد.
          </div>
          <div>
            <Label>مبلغ ({currency || 'AFN'})</Label>
            <Input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="مبلغ را وارد کنید"
              dir="ltr"
              className="mt-1"
            />
          </div>
          <div>
            <Label>شماره کارت پرداخت‌کننده (اختیاری)</Label>
            <Input
              value={cardNumber}
              onChange={e => setCardNumber(e.target.value)}
              placeholder="**** **** ****"
              dir="ltr"
              className="mt-1"
            />
          </div>
          <div>
            <Label>رسید پرداخت *</Label>
            <label className="block mt-1 cursor-pointer">
              <div className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${receiptUrl ? 'border-green-400 bg-green-50/50' : 'border-border hover:border-primary/50'}`}>
                {receiptFile ? (
                  <div className="space-y-1">
                    <CheckCircle className="w-5 h-5 mx-auto text-green-500" />
                    <p className="text-xs text-muted-foreground truncate">{receiptFile.name}</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Upload className="w-5 h-5 mx-auto text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">تصویر رسید را انتخاب کنید</p>
                  </div>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
                disabled={uploading}
              />
            </label>
            {uploading && <p className="text-[10px] text-muted-foreground mt-1 text-center">در حال بارگذاری...</p>}
          </div>
        </div>
        <SheetFooter>
          <Button onClick={handleSubmit} disabled={submitting || uploading || !receiptUrl} className="w-full">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'ثبت درخواست شارژ'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}