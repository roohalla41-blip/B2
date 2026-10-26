import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import {
  loadOperators, loadRechargeAmounts, loadPackages, loadWallets,
} from '@/lib/rechargeMockData';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Smartphone, Wifi, Wallet, Send, Package,
  AlertTriangle, RefreshCw, ArrowRight,
} from 'lucide-react';
import ConfirmDialog from '@/components/customer/recharge/ConfirmDialog';
import { AmountInput } from '@/components/sarraaf/Fields';
import SuccessSheet from '@/components/customer/recharge/SuccessSheet';

const WALLET_LABELS = {
  AFN: 'افغانی (AFN)',
  USD: 'دلار (USD)',
  IRT: 'تومان (IRT)',
  USDT: 'تتر (USDT)',
};

const DRAFT_KEY = 'recharge_draft';

export default function CustomerRecharge() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState('mobile_recharge');
  const [operators, setOperators] = useState([]);
  const [amounts, setAmounts] = useState([]);
  const [packages, setPackages] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Mobile recharge form
  const [operator, setOperator] = useState('');
  const [mobile, setMobile] = useState('');
  const [rechargeAmount, setRechargeAmount] = useState(0);
  const [description, setDescription] = useState('');

  // Internet package selection
  const [selectedPackage, setSelectedPackage] = useState(null);

  // Shared
  const [walletCurrency, setWalletCurrency] = useState('AFN');
  const [errors, setErrors] = useState({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successRequest, setSuccessRequest] = useState(null);
  const [successOpen, setSuccessOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [ops, amts, pkgs, wals] = await Promise.all([
        loadOperators(),
        loadRechargeAmounts(),
        loadPackages(),
        loadWallets(user?.id),
      ]);
      setOperators(ops);
      setAmounts(amts);
      setPackages(pkgs);
      setWallets(wals);
      // Load draft
      try {
        const raw = localStorage.getItem(DRAFT_KEY);
        if (raw) {
          const draft = JSON.parse(raw);
          if (draft.tab) setTab(draft.tab);
          if (draft.operator) setOperator(draft.operator);
          if (draft.mobile) setMobile(draft.mobile);
          if (draft.rechargeAmount) setRechargeAmount(draft.rechargeAmount);
          if (draft.description) setDescription(draft.description);
          if (draft.walletCurrency) setWalletCurrency(draft.walletCurrency);
        }
      } catch {
        // ignore
      }
    } catch (e) {
      setError(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Save draft to localStorage (offline-friendly)
  useEffect(() => {
    const draft = { tab, operator, mobile, rechargeAmount, description, walletCurrency };
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // ignore
    }
  }, [tab, operator, mobile, rechargeAmount, description, walletCurrency]);

  const selectedWallet = wallets.find((w) => w.currency === walletCurrency);
  const currentAmount = tab === 'mobile_recharge' ? parseFloat(rechargeAmount) || 0 : selectedPackage?.price || 0;
  const insufficientBalance = selectedWallet && currentAmount > 0 && (selectedWallet.balance || 0) < currentAmount;

  const validate = () => {
    const errs = {};
    if (!operator) errs.operator = 'اپراتور را انتخاب کنید.';
    if (!mobile) {
      errs.mobile = 'شماره موبایل را وارد کنید.';
    } else if (!/^[0-9+\-\s]{7,15}$/.test(mobile.replace(/\s/g, ''))) {
      errs.mobile = 'فرمت شماره موبایل معتبر نیست.';
    }
    if (tab === 'mobile_recharge') {
      if (!rechargeAmount || parseFloat(rechargeAmount) <= 0) {
        errs.rechargeAmount = 'مبلغ شارژ معتبر وارد کنید.';
      }
    } else {
      if (!selectedPackage) errs.package = 'یک بسته اینترنت انتخاب کنید.';
    }
    if (!walletCurrency) errs.walletCurrency = 'کیف پول پرداخت را انتخاب کنید.';
    if (currentAmount <= 0) errs.amount = 'مبلغ باید بیشتر از صفر باشد.';
    if (insufficientBalance) errs.balance = 'موجودی کیف پول برای انجام این درخواست کافی نیست.';
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
      const op = operators.find((o) => o.code === operator);
      const payload = {
        user_id: user?.id || 'demo-customer',
        user_name: user?.full_name || 'مشتری',
        service_type: tab,
        operator: operator,
        operator_name: op?.name || operator,
        mobile,
        amount: currentAmount,
        package_name: selectedPackage?.name || null,
        package_volume: selectedPackage?.volume || null,
        package_duration: selectedPackage?.duration || null,
        wallet_currency: walletCurrency,
        description,
      };
      const { submitRequest } = await import('@/lib/rechargeMockData');
      const result = await submitRequest(payload);
      setSuccessRequest(result);
      setSuccessOpen(true);
      setConfirmOpen(false);
      // Clear draft
      localStorage.removeItem(DRAFT_KEY);
      // Reset form
      setOperator('');
      setMobile('');
      setRechargeAmount(0);
      setDescription('');
      setSelectedPackage(null);
    } catch (e) {
      const msg = e?.message === 'insufficient_balance' ? 'موجودی کافی نیست'
        : e?.message === 'wallet_not_found' ? 'کیف پول یافت نشد'
        : 'خطا در ثبت درخواست';
      setErrors({ submit: msg });
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <div className="flex gap-1 p-1 rounded-xl bg-muted">
          <Skeleton className="flex-1 h-10 rounded-lg" />
          <Skeleton className="flex-1 h-10 rounded-lg" />
        </div>
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-bold text-foreground">شارژ و اینترنت</h1>
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
    service_type: tab,
    operator_name: operators.find((o) => o.code === operator)?.name || operator,
    mobile,
    amount: currentAmount,
    package_name: selectedPackage?.name,
    wallet_currency: walletCurrency,
    description,
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-foreground">شارژ و اینترنت</h1>
          <p className="text-xs text-muted-foreground">شارژ موبایل و بسته اینترنت</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/customer')}>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-muted">
        <button
          onClick={() => { setTab('mobile_recharge'); setSelectedPackage(null); setErrors({}); }}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${tab === 'mobile_recharge' ? 'bg-card shadow text-foreground' : 'text-muted-foreground'}`}
        >
          <Smartphone className="w-4 h-4" />
          شارژ موبایل
        </button>
        <button
          onClick={() => { setTab('internet'); setErrors({}); }}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${tab === 'internet' ? 'bg-card shadow text-foreground' : 'text-muted-foreground'}`}
        >
          <Wifi className="w-4 h-4" />
          بسته اینترنت
        </button>
      </div>

      {/* Operator Selector */}
      <div>
        <Label className="text-xs">اپراتور</Label>
        <div className="flex flex-wrap gap-2 mt-1">
          {operators.length === 0 ? (
            <p className="text-xs text-muted-foreground">اپراتوری موجود نیست.</p>
          ) : (
            operators.map((op) => (
              <button
                key={op.code}
                onClick={() => { setOperator(op.code); setErrors({}); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${operator === op.code ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground'}`}
              >
                {op.name}
              </button>
            ))
          )}
        </div>
        {errors.operator && <p className="text-[10px] text-destructive mt-1">{errors.operator}</p>}
      </div>

      {/* Mobile Recharge Form */}
      {tab === 'mobile_recharge' && (
        <>
          <div>
            <Label className="text-xs">شماره موبایل</Label>
            <Input
              placeholder="مثال: 07XXXXXXXXX"
              value={mobile}
              onChange={(e) => { setMobile(e.target.value); setErrors({}); }}
              dir="ltr"
              className="text-sm mt-1"
            />
            {errors.mobile && <p className="text-[10px] text-destructive mt-1">{errors.mobile}</p>}
          </div>

          <div>
            <Label className="text-xs">مبلغ شارژ (افغانی)</Label>
            <AmountInput value={rechargeAmount} onChange={(v) => { setRechargeAmount(v); setErrors({}); }} placeholder="مبلغ را وارد کنید" />
            {errors.rechargeAmount && <p className="text-[10px] text-destructive mt-1">{errors.rechargeAmount}</p>}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {amounts.map((amt) => (
                <button
                  key={amt}
                  onClick={() => { setRechargeAmount(amt); setErrors({}); }}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-all ${parseFloat(rechargeAmount) === amt ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground'}`}
                >
                  {amt.toLocaleString('fa-IR')}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Internet Packages */}
      {tab === 'internet' && (
        <div>
          <h2 className="text-sm font-bold text-foreground mb-2">بسته‌های اینترنت</h2>
          {packages.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-sm text-muted-foreground">
                در حال حاضر بسته‌ای برای نمایش وجود ندارد.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {packages.map((pkg) => (
                <button
                  key={pkg.id}
                  onClick={() => { setSelectedPackage(pkg); setErrors({}); }}
                  disabled={!pkg.is_active}
                  className={`p-3 rounded-xl border-2 text-right transition-all disabled:opacity-40 ${
                    selectedPackage?.id === pkg.id ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/30'
                  }`}
                >
                  <p className="text-xs font-bold text-foreground">{pkg.name}</p>
                  <p className="text-[10px] text-muted-foreground">{pkg.operator_name}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{pkg.volume} • {pkg.duration}</p>
                  <p className="text-sm font-bold text-primary mt-1">{(pkg.price || 0).toLocaleString('fa-IR')} {pkg.currency}</p>
                  {!pkg.is_active && <p className="text-[8px] text-destructive mt-0.5">غیرفعال</p>}
                </button>
              ))}
            </div>
          )}
          {errors.package && <p className="text-[10px] text-destructive mt-1">{errors.package}</p>}
        </div>
      )}

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

      {/* Insufficient Balance Warning */}
      {insufficientBalance && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
            <p className="text-xs text-destructive font-medium">
              موجودی کیف پول برای انجام این درخواست کافی نیست.
            </p>
          </CardContent>
        </Card>
      )}

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

      {/* Summary & Submit */}
      <Card className="shadow-sm border-primary/30">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">مبلغ قابل پرداخت:</span>
            <span className="font-bold text-primary">{currentAmount.toLocaleString('fa-IR')} {walletCurrency}</span>
          </div>
          <Button onClick={handleOpenConfirm} className="w-full" disabled={insufficientBalance}>
            <Send className="w-4 h-4 ml-2" />
            ادامه و تأیید
          </Button>
        </CardContent>
      </Card>

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
        onGoToOrders={() => {
          setSuccessOpen(false);
          navigate('/customer/orders');
        }}
      />
    </div>
  );
}