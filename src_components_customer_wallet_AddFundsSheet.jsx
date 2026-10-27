import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { offlineDB } from '@/lib/offlineQueue';
import { uploadReceipt } from '@/lib/ucApi';
import {
  Landmark, Globe, Bitcoin, CreditCard, Camera, X, CheckCircle, Loader2,
  AlertCircle, Copy,
} from 'lucide-react';
import { Image } from '@/components/ui/image';
import { AmountInput } from '@/components/sarraaf/Fields';

const CURRENCIES = [
  { code: 'AFN', label: 'افغانی' },
  { code: 'USD', label: 'دلار' },
  { code: 'IRT', label: 'تومان' },
  { code: 'USDT', label: 'تتر' },
];

const METHOD_DEFS = [
  { key: 'payment_card', label: 'کارت به کارت', icon: CreditCard, color: 'bg-purple-500' },
  { key: 'payment_bank', label: 'انتقال بانکی', icon: Landmark, color: 'bg-blue-500' },
  { key: 'payment_paypal', label: 'پی‌پل', icon: Globe, color: 'bg-indigo-500' },
  { key: 'payment_crypto', label: 'ارز دیجیتال', icon: Bitcoin, color: 'bg-amber-500' },
];

export default function AddFundsSheet({ open, onOpenChange, user }) {
  const { toast } = useToast();
  const [method, setMethod] = useState(null);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('AFN');
  const [cardNumber, setCardNumber] = useState('');
  const [description, setDescription] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [methodStatuses, setMethodStatuses] = useState({});
  const [methodConfigs, setMethodConfigs] = useState({});

  useEffect(() => {
    const load = async () => {
      const statuses = {};
      const configs = {};
      try {
        const features = await offlineDB.FeatureSetting.list();
        for (const def of METHOD_DEFS) {
          const f = features.find(fx => fx.feature_key === def.key);
          statuses[def.key] = f ? (f.enabled !== false && f.status === 'active' ? 'active' : f.status || 'updating') : 'updating';
        }
        const settings = await offlineDB.AppSetting.list();
        for (const def of METHOD_DEFS) {
          const s = settings.find(sx => sx.key === `${def.key}_config`);
          configs[def.key] = (s?.value && typeof s.value === 'string') ? JSON.parse(s.value) : (s?.value || s?.data || {});
        }
      } catch {
        // default all to updating
        for (const def of METHOD_DEFS) statuses[def.key] = 'updating';
      }
      setMethodStatuses(statuses);
      setMethodConfigs(configs);
    };
    if (open) load();
  }, [open]);

  const reset = () => {
    setMethod(null);
    setAmount('');
    setCurrency('AFN');
    setCardNumber('');
    setDescription('');
    setReceiptUrl('');
    setDone(false);
  };

  const handleClose = (v) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadReceipt(file, user?.id || 'anon');
      setReceiptUrl(url);
      toast({ title: 'عکس رسید آپلود شد' });
    } catch (err) {
      toast({ title: 'خطا در آپلود عکس', description: err?.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const numAmount = parseFloat(amount) || 0;

  const validate = () => {
    if (numAmount <= 0) return 'مبلغ معتبر وارد کنید.';
    if (method === 'payment_card' && !receiptUrl) return 'عکس رسید را آپلود کنید.';
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) {
      toast({ title: err, variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const methodMap = {
        payment_card: 'card_to_card',
        payment_bank: 'bank_gateway',
        payment_paypal: 'bank_gateway',
        payment_crypto: 'bank_gateway',
      };
      await offlineDB.WalletTopupRequest.create({
        user_id: user?.id || '',
        user_name: user?.full_name || '',
        phone: user?.mobile || '',
        amount: numAmount,
        currency,
        method: methodMap[method] || 'card_to_card',
        card_number: method === 'payment_card' ? cardNumber : '',
        receipt_url: receiptUrl || '',
        description: `${METHOD_DEFS.find(m => m.key === method)?.label} — ${description}`,
        status: 'pending',
      });
      setDone(true);
      toast({ title: 'درخواست شارژ ثبت شد', description: 'تا تأیید سازنده صبر کنید.' });
    } catch {
      toast({ title: 'خطا در ثبت درخواست', variant: 'destructive' });
    }
    setSubmitting(false);
  };

  const copyText = (text) => {
    navigator.clipboard?.writeText(text);
    toast({ title: 'کپی شد' });
  };

  const activeMethods = METHOD_DEFS.filter(m => methodStatuses[m.key] === 'active');
  const updatingMethods = METHOD_DEFS.filter(m => methodStatuses[m.key] !== 'active');

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>افزودن موجودی</SheetTitle>
          <SheetDescription>روش پرداخت را انتخاب کنید</SheetDescription>
        </SheetHeader>

        {done ? (
          <div className="py-8 text-center space-y-3">
            <CheckCircle className="w-12 h-12 text-success mx-auto" />
            <p className="text-sm font-medium">درخواست شارژ ثبت شد!</p>
            <p className="text-xs text-muted-foreground">
              درخواست شما برای بررسی به سازنده ارسال شد. پس از تأیید، مبلغ به حساب شما اضافه می‌شود.
            </p>
            <Button onClick={() => handleClose(false)} className="w-full">بستن</Button>
          </div>
        ) : !method ? (
          <div className="space-y-3 pt-4">
            {/* Active methods */}
            {activeMethods.map((m) => {
              const Icon = m.icon;
              return (
                <button
                  key={m.key}
                  onClick={() => setMethod(m.key)}
                  className="w-full p-4 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all text-right flex items-center gap-3"
                >
                  <div className={`w-10 h-10 rounded-lg ${m.color} flex items-center justify-center`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold">{m.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.key === 'payment_card' && (methodConfigs[m.key]?.bank_name ? `${methodConfigs[m.key].bank_name}` : 'کارت به کارت')}
                      {m.key === 'payment_bank' && (methodConfigs[m.key]?.bank_name ? `بانک: ${methodConfigs[m.key].bank_name}` : 'انتقال به حساب بانکی')}
                      {m.key === 'payment_paypal' && (methodConfigs[m.key]?.paypal_email ? methodConfigs[m.key].paypal_email : 'پرداخت از طریق پی‌پل')}
                      {m.key === 'payment_crypto' && (methodConfigs[m.key]?.network ? `شبکه: ${methodConfigs[m.key].network}` : 'پرداخت با ارز دیجیتال')}
                    </p>
                  </div>
                </button>
              );
            })}

            {/* Updating methods */}
            {updatingMethods.length > 0 && (
              <div className="pt-2">
                <p className="text-[10px] text-muted-foreground mb-2">روش‌های در حال به‌روزرسانی:</p>
                {updatingMethods.map((m) => {
                  const Icon = m.icon;
                  return (
                    <div key={m.key} className="w-full p-4 rounded-xl border border-border opacity-50 flex items-center gap-3 mb-2">
                      <div className={`w-10 h-10 rounded-lg ${m.color} flex items-center justify-center`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold">{m.label}</p>
                        <p className="text-xs text-muted-foreground">در حال به‌روزرسانی...</p>
                      </div>
                      <AlertCircle className="w-4 h-4 text-warning" />
                    </div>
                  );
                })}
              </div>
            )}

            {activeMethods.length === 0 && (
              <div className="py-8 text-center">
                <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">فعلاً هیچ روش پرداختی فعال نیست.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4 pt-4">
            {/* Method badge */}
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
              {(() => {
                const def = METHOD_DEFS.find(m => m.key === method);
                const Icon = def?.icon;
                return Icon ? <Icon className="w-4 h-4 text-primary" /> : null;
              })()}
              <span className="text-xs font-medium">{METHOD_DEFS.find(m => m.key === method)?.label}</span>
              <button onClick={() => setMethod(null)} className="mr-auto">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Amount */}
            <div>
              <Label className="text-xs">مبلغ</Label>
              <AmountInput value={amount} onChange={setAmount} placeholder="0" />
            </div>

            {/* Currency */}
            <div>
              <Label className="text-xs">ارز</Label>
              <div className="grid grid-cols-4 gap-2 mt-1">
                {CURRENCIES.map((c) => (
                  <button key={c.code} onClick={() => setCurrency(c.code)}
                    className={`p-2 rounded-lg border text-center text-xs font-medium ${currency === c.code ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground'}`}>
                    {c.code}
                  </button>
                ))}
              </div>
            </div>

            {/* Method-specific config display */}
            {methodConfigs[method] && Object.keys(methodConfigs[method]).length > 0 && (
              <div className="rounded-lg bg-muted/50 border border-border p-3 space-y-2">
                <p className="text-[10px] text-muted-foreground mb-1">اطلاعات پرداخت:</p>
                {method === 'payment_card' && methodConfigs[method].card_number && (
                  <>
                    <InfoRow label="شماره کارت" value={methodConfigs[method].card_number} onCopy={copyText} />
                    {methodConfigs[method].holder_name && <InfoRow label="نام صاحب کارت" value={methodConfigs[method].holder_name} onCopy={copyText} />}
                    {methodConfigs[method].bank_name && <InfoRow label="نام بانک" value={methodConfigs[method].bank_name} onCopy={copyText} />}
                    {methodConfigs[method].account_number && <InfoRow label="شماره حساب" value={methodConfigs[method].account_number} onCopy={copyText} />}
                    {methodConfigs[method].sheba && <InfoRow label="شماره شبا" value={methodConfigs[method].sheba} onCopy={copyText} />}
                    {methodConfigs[method].expiry && <InfoRow label="تاریخ انقضا" value={methodConfigs[method].expiry} onCopy={copyText} />}
                  </>
                )}
                {method === 'payment_bank' && methodConfigs[method].bank_name && (
                  <>
                    <InfoRow label="بانک" value={methodConfigs[method].bank_name} onCopy={copyText} />
                    {methodConfigs[method].account_number && <InfoRow label="شماره حساب" value={methodConfigs[method].account_number} onCopy={copyText} />}
                    {methodConfigs[method].holder_name && <InfoRow label="نام صاحب" value={methodConfigs[method].holder_name} onCopy={copyText} />}
                  </>
                )}
                {method === 'payment_paypal' && methodConfigs[method].paypal_email && (
                  <InfoRow label="ایمیل پی‌پل" value={methodConfigs[method].paypal_email} onCopy={copyText} />
                )}
                {method === 'payment_crypto' && (
                  <>
                    {methodConfigs[method].wallet_address && <InfoRow label="آدرس کیف پول" value={methodConfigs[method].wallet_address} onCopy={copyText} />}
                    {methodConfigs[method].network && <InfoRow label="شبکه" value={methodConfigs[method].network} onCopy={copyText} />}
                  </>
                )}
              </div>
            )}

            {/* Card-to-card specific */}
            {method === 'payment_card' && (
              <div>
                <Label className="text-xs">شماره کارت (اختیاری)</Label>
                <Input placeholder="****-****-****-****" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} dir="ltr" className="text-sm mt-1" />
              </div>
            )}

            {/* Receipt upload — available for all payment methods */}
            <div>
              <Label className="text-xs">عکس رسید {method === 'payment_card' ? '(الزامی)' : '(اختیاری)'}</Label>
              {receiptUrl ? (
                <div className="relative mt-1">
                  <Image src={receiptUrl} alt="رسید" fittingType="fit" className="w-full h-40 object-contain rounded-lg border" />
                  <button onClick={() => setReceiptUrl('')} className="absolute top-1 right-1 p-1 rounded-full bg-destructive text-destructive-foreground">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <label className="mt-1 flex flex-col items-center justify-center gap-2 p-6 rounded-lg border-2 border-dashed border-border cursor-pointer hover:border-primary transition-colors">
                  {uploading ? <Loader2 className="w-6 h-6 text-primary animate-spin" /> : <Camera className="w-6 h-6 text-muted-foreground" />}
                  <span className="text-xs text-muted-foreground">{uploading ? 'در حال آپلود...' : 'عکس رسید را انتخاب کنید'}</span>
                  <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
                </label>
              )}
            </div>

            {/* Description */}
            <div>
              <Label className="text-xs">توضیحات (اختیاری)</Label>
              <Input placeholder="توضیحات..." value={description} onChange={(e) => setDescription(e.target.value)} className="text-sm mt-1" />
            </div>

            <div className="rounded-lg bg-warning/5 border border-warning/30 p-3">
              <p className="text-xs text-muted-foreground">
                پس از ارسال درخواست، سازنده رسید/پرداخت شما را بررسی کرده و مبلغ را به حساب شما اضافه می‌کند.
              </p>
            </div>

            <Button onClick={handleSubmit} className="w-full" disabled={submitting || uploading || numAmount <= 0}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              ثبت درخواست شارژ
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function InfoRow({ label, value, onCopy }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground w-20 shrink-0">{label}:</span>
      <span className="text-xs font-medium flex-1 truncate" dir="ltr">{value}</span>
      <button onClick={() => onCopy(value)} className="p-1 rounded hover:bg-muted shrink-0">
        <Copy className="w-3 h-3 text-muted-foreground" />
      </button>
    </div>
  );
}