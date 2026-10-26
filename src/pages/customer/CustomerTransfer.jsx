import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import {
  loadWallets, loadDestinations, loadCountries, loadTransferMethods,
  loadMyRequests, calcFee, submitRequest, loadDraft, saveDraft, clearDraft,
} from '@/lib/transferMockData';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Send, Wallet, Package, AlertTriangle, RefreshCw,
  ArrowRight, Hash, Loader2, CheckCircle, XCircle,
} from 'lucide-react';
import { offlineDB } from '@/lib/offlineQueue';
import ConfirmDialog from '@/components/customer/transfer/ConfirmDialog';
import { AmountInput } from '@/components/sarraaf/Fields';
import SuccessSheet from '@/components/customer/transfer/SuccessSheet';
import TransferHistory from '@/components/customer/transfer/TransferHistory';

const WALLET_LABELS = {
  AFN: 'افغانی (AFN)',
  USD: 'دلار (USD)',
  IRT: 'تومان (IRT)',
  USDT: 'تتر (USDT)',
};

export default function CustomerTransfer() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [wallets, setWallets] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [countries, setCountries] = useState([]);
  const [methods, setMethods] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Form state
  const [walletCurrency, setWalletCurrency] = useState('AFN');
  const [amount, setAmount] = useState(0);
  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [receiverCode, setReceiverCode] = useState('');
  const [destinationType, setDestinationType] = useState('');
  const [destinationCountry, setDestinationCountry] = useState('');
  const [transferMethod, setTransferMethod] = useState('');
  const [description, setDescription] = useState('');
  const [sarraafCode, setSarraafCode] = useState('');
  const [sarraafValid, setSarraafValid] = useState(null);
  const [sarraafChecking, setSarraafChecking] = useState(false);
  const [errors, setErrors] = useState({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successRequest, setSuccessRequest] = useState(null);
  const [successOpen, setSuccessOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [wals, dests, ctries, meths] = await Promise.all([
        loadWallets(user?.id), loadDestinations(), loadCountries(), loadTransferMethods(),
      ]);
      setWallets(wals);
      setDestinations(dests);
      setCountries(ctries);
      setMethods(meths);
      const draft = loadDraft();
      if (draft) {
        if (draft.walletCurrency) setWalletCurrency(draft.walletCurrency);
        if (draft.amount) setAmount(draft.amount);
        if (draft.receiverName) setReceiverName(draft.receiverName);
        if (draft.receiverPhone) setReceiverPhone(draft.receiverPhone);
        if (draft.receiverCode) setReceiverCode(draft.receiverCode);
        if (draft.destinationType) setDestinationType(draft.destinationType);
        if (draft.destinationCountry) setDestinationCountry(draft.destinationCountry);
        if (draft.transferMethod) setTransferMethod(draft.transferMethod);
        if (draft.description) setDescription(draft.description);
      }
      // Load existing transfers
      const reqs = await loadMyRequests(user?.id || 'demo-customer');
      setTransfers(reqs);
    } catch (e) {
      setError(true);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Save draft
  useEffect(() => {
    saveDraft({
      walletCurrency, amount, receiverName, receiverPhone, receiverCode,
      destinationType, destinationCountry, transferMethod, description, sarraafCode,
    });
  }, [walletCurrency, amount, receiverName, receiverPhone, receiverCode, destinationType, destinationCountry, transferMethod, description, sarraafCode]);

  // Validate sarraaf code
  useEffect(() => {
    if (!sarraafCode || sarraafCode.trim().length < 3) {
      setSarraafValid(null);
      return;
    }
    const timer = setTimeout(async () => {
      setSarraafChecking(true);
      try {
        const profiles = await offlineDB.SarraafProfile.filter({ code: sarraafCode.trim() });
        setSarraafValid(profiles && profiles.length > 0);
      } catch {
        setSarraafValid(false);
      }
      setSarraafChecking(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [sarraafCode]);

  const selectedWallet = wallets.find((w) => w.currency === walletCurrency);
  const numAmount = parseFloat(amount) || 0;
  const fee = numAmount > 0 ? calcFee(numAmount, walletCurrency) : 0;
  const totalAmount = numAmount + fee;
  const balanceAfter = (selectedWallet?.balance || 0) - totalAmount;
  const insufficientBalance = selectedWallet && numAmount > 0 && (selectedWallet.balance || 0) < totalAmount;

  const validate = () => {
    const errs = {};
    if (!walletCurrency) errs.walletCurrency = 'کیف پول پرداخت را انتخاب کنید.';
    if (!amount || numAmount <= 0) errs.amount = 'مبلغ انتقال معتبر وارد کنید.';
    if (!receiverName?.trim()) errs.receiverName = 'نام گیرنده را وارد کنید.';
    if (receiverPhone && !/^[0-9+\-\s]{7,15}$/.test(receiverPhone.replace(/\s/g, ''))) {
      errs.receiverPhone = 'فرمت شماره موبایل معتبر نیست.';
    }
    if (!destinationType) errs.destinationType = 'مقصد را انتخاب کنید.';
    if (!sarraafCode?.trim()) errs.sarraafCode = 'کد صراف اجباری است.';
    else if (sarraafValid === false) errs.sarraafCode = 'کد صراف معتبر نیست.';
    if (insufficientBalance) errs.balance = 'موجودی کیف پول برای انجام این انتقال کافی نیست.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleOpenConfirm = () => {
    if (!validate()) return;
    setConfirmOpen(true);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const dest = destinations.find((d) => d.code === destinationType);
      const result = await submitRequest({
        user_id: user?.id || 'demo-customer',
        user_name: user?.full_name || 'مشتری',
        sarraaf_code: sarraafCode,
        receiver_name: receiverName,
        receiver_phone: receiverPhone,
        receiver_code: receiverCode,
        destination_type: destinationType,
        destination_type_name: dest?.name || '',
        destination_country: destinationCountry,
        transfer_method: transferMethod,
        currency: walletCurrency,
        wallet_currency: walletCurrency,
        amount: numAmount,
        wallet_balance: selectedWallet?.balance || 0,
        description,
      });
      setSuccessRequest(result);
      setSuccessOpen(true);
      setConfirmOpen(false);
      clearDraft();
      // Reset form
      setAmount(0);
      setReceiverName('');
      setReceiverPhone('');
      setReceiverCode('');
      setSarraafCode('');
      setDestinationType('');
      setDestinationCountry('');
      setTransferMethod('');
      setDescription('');
      // Reload transfers
      const reqs = await loadMyRequests(user?.id || 'demo-customer');
      setTransfers(reqs);
    } catch (e) {
      const msg = e?.message === 'insufficient_balance' ? 'موجودی کافی نیست'
        : e?.message === 'wallet_not_found' ? 'کیف پول یافت نشد'
        : 'خطا در ثبت انتقال';
      setErrors({ submit: msg });
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-6 w-32" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-bold text-foreground">انتقال وجه</h1>
        <Card>
          <CardContent className="p-8 text-center space-y-4">
            <p className="text-sm text-muted-foreground">دریافت اطلاعات با مشکل مواجه شد.</p>
            <Button onClick={loadData} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 ml-2" />
              تلاش مجدد
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const confirmData = {
    sender_name: user?.full_name || 'مشتری',
    receiver_name: receiverName,
    receiver_phone: receiverPhone,
    currency: walletCurrency,
    wallet_currency: walletCurrency,
    amount: numAmount,
    fee,
    total_amount: totalAmount,
    wallet_balance: selectedWallet?.balance || 0,
    balance_after: balanceAfter,
    destination_type_name: destinations.find((d) => d.code === destinationType)?.name || '',
    destination_country: destinationCountry,
    transfer_method: transferMethod,
    description,
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-foreground">انتقال وجه</h1>
          <p className="text-xs text-muted-foreground">ثبت درخواست انتقال وجه و پیگیری</p>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => navigate('/customer')}>
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Transfer Form */}
      <Card className="shadow-sm">
        <CardContent className="p-4 space-y-3">
          {/* Wallet Selection */}
          <div>
            <Label className="text-xs">کیف پول پرداخت</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-1">
              {wallets.map((w) => (
                <button
                  key={w.currency}
                  onClick={() => { setWalletCurrency(w.currency); setErrors({}); }}
                  className={`p-2.5 rounded-lg border text-center transition-all ${walletCurrency === w.currency ? 'border-primary bg-primary/5' : 'border-border'}`}
                >
                  <Wallet className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-[10px] font-bold text-foreground">{w.currency}</p>
                  <p className="text-[9px] text-muted-foreground">{(w.balance || 0).toLocaleString('fa-IR')}</p>
                </button>
              ))}
            </div>
            {errors.walletCurrency && <p className="text-[10px] text-destructive mt-1">{errors.walletCurrency}</p>}
          </div>

          {/* Amount */}
          <div>
            <Label className="text-xs">مبلغ انتقال</Label>
            <AmountInput value={amount} onChange={(v) => { setAmount(v); setErrors({}); }} placeholder="0" />
            {errors.amount && <p className="text-[10px] text-destructive mt-1">{errors.amount}</p>}
          </div>

          {/* Calculation Summary */}
          {numAmount > 0 && (
            <Card className="bg-muted/30 border-border">
              <CardContent className="p-3 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">مبلغ انتقال:</span>
                  <span className="text-foreground">{numAmount.toLocaleString('fa-IR')} {walletCurrency}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">کارمزد:</span>
                  <span className="text-foreground">{fee.toLocaleString('fa-IR')} {walletCurrency}</span>
                </div>
                <div className="flex justify-between text-xs pt-1.5 border-t border-border">
                  <span className="text-muted-foreground">مبلغ نهایی:</span>
                  <span className="font-bold text-primary">{totalAmount.toLocaleString('fa-IR')} {walletCurrency}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">موجودی کیف پول:</span>
                  <span className="text-foreground">{(selectedWallet?.balance || 0).toLocaleString('fa-IR')}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">موجودی بعد از انتقال:</span>
                  <span className={`font-medium ${balanceAfter < 0 ? 'text-destructive' : 'text-foreground'}`}>{balanceAfter.toLocaleString('fa-IR')}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sarraaf Code */}
          <div>
            <Label className="text-xs">کد صراف (اجباری)</Label>
            <div className="relative mt-1">
              <Hash className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="کد صراف مقصد را وارد کنید"
                value={sarraafCode}
                onChange={(e) => { setSarraafCode(e.target.value); setErrors({}); }}
                dir="ltr"
                className="text-sm pr-8"
              />
              {sarraafChecking && <Loader2 className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground animate-spin" />}
              {!sarraafChecking && sarraafValid === true && <CheckCircle className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-success" />}
              {!sarraafChecking && sarraafValid === false && <XCircle className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-destructive" />}
            </div>
            {errors.sarraafCode && <p className="text-[10px] text-destructive mt-1">{errors.sarraafCode}</p>}
            {sarraafValid === true && <p className="text-[10px] text-success mt-1">کد صراف تأیید شد</p>}
          </div>

          {/* Destination Type */}
          <div>
            <Label className="text-xs">مقصد</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {destinations.map((d) => (
                <button
                  key={d.code}
                  onClick={() => { setDestinationType(d.code); setErrors({}); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${destinationType === d.code ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground'}`}
                >
                  {d.name}
                </button>
              ))}
            </div>
            {errors.destinationType && <p className="text-[10px] text-destructive mt-1">{errors.destinationType}</p>}
          </div>

          {/* Receiver Info */}
          <div>
            <Label className="text-xs">نام گیرنده</Label>
            <Input
              placeholder="نام کامل گیرنده"
              value={receiverName}
              onChange={(e) => { setReceiverName(e.target.value); setErrors({}); }}
              className="text-sm mt-1"
            />
            {errors.receiverName && <p className="text-[10px] text-destructive mt-1">{errors.receiverName}</p>}
          </div>

          <div>
            <Label className="text-xs">شماره موبایل گیرنده</Label>
            <Input
              placeholder="07XXXXXXXXX"
              value={receiverPhone}
              onChange={(e) => { setReceiverPhone(e.target.value); setErrors({}); }}
              dir="ltr"
              className="text-sm mt-1"
            />
            {errors.receiverPhone && <p className="text-[10px] text-destructive mt-1">{errors.receiverPhone}</p>}
          </div>

          <div>
            <Label className="text-xs">کد مشتری / شناسه گیرنده (اختیاری)</Label>
            <Input
              placeholder="کد یا شناسه"
              value={receiverCode}
              onChange={(e) => setReceiverCode(e.target.value)}
              dir="ltr"
              className="text-sm mt-1"
            />
          </div>

          {/* Country */}
          <div>
            <Label className="text-xs">کشور / مقصد (اختیاری)</Label>
            <Select value={destinationCountry || 'none'} onValueChange={(v) => setDestinationCountry(v === 'none' ? '' : v)}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="انتخاب کنید..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">انتخاب کنید...</SelectItem>
                {countries.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Transfer Method */}
          <div>
            <Label className="text-xs">روش انتقال (اختیاری)</Label>
            <Select value={transferMethod || 'none'} onValueChange={(v) => setTransferMethod(v === 'none' ? '' : v)}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="انتخاب کنید..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">انتخاب کنید...</SelectItem>
                {methods.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div>
            <Label className="text-xs">توضیحات (اختیاری)</Label>
            <Input
              placeholder="توضیحات..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="text-sm mt-1"
            />
          </div>

          {/* Insufficient Balance */}
          {insufficientBalance && (
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="p-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                <p className="text-xs text-destructive font-medium">
                  موجودی کیف پول برای انجام این انتقال کافی نیست.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Submit */}
          <Button onClick={handleOpenConfirm} className="w-full" disabled={insufficientBalance || numAmount <= 0}>
            <Send className="w-4 h-4 ml-2" />
            ادامه و تأیید
          </Button>
        </CardContent>
      </Card>

      {/* Link to Wallet */}
      <Button variant="outline" className="w-full" onClick={() => navigate('/customer/wallet')}>
        <Wallet className="w-4 h-4 ml-2" />
        کیف پول من
      </Button>

      {/* Transfer History */}
      <TransferHistory transfers={transfers} />

      {/* Link to Orders */}
      <Button variant="outline" className="w-full" onClick={() => navigate('/customer/orders')}>
        <Package className="w-4 h-4 ml-2" />
        سفارش‌های من
      </Button>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        data={confirmData}
        onConfirm={handleSubmit}
        submitting={submitting}
      />

      {/* Success Sheet */}
      <SuccessSheet
        open={successOpen}
        onOpenChange={setSuccessOpen}
        request={successRequest}
        onGoToOrders={() => { setSuccessOpen(false); navigate('/customer/orders'); }}
      />
    </div>
  );
}