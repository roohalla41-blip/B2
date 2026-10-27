import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import {
  loadServices, loadPackages, loadWallets, submitRequest,
  loadDraft, saveDraft, clearDraft,
} from '@/lib/gamesMockData';
import { submitUCOrder, uploadReceipt } from '@/lib/ucApi';
import UCTopupSheet from '@/components/customer/uc/UCTopupSheet';
import { UC_ICON_URL } from '@/lib/ucApi';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Gamepad2, Wallet, Send, Package,
  AlertTriangle, RefreshCw, ArrowRight, CreditCard, Upload, Loader2, CheckCircle,
} from 'lucide-react';
import ConfirmDialog from '@/components/customer/games/ConfirmDialog';
import SuccessSheet from '@/components/customer/games/SuccessSheet';
import UCCard from '@/components/customer/games/UCCard';

export default function CustomerGames() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [services, setServices] = useState([]);
  const [packages, setPackages] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [selectedService, setSelectedService] = useState(null);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [accountInfo, setAccountInfo] = useState({});
  const [walletCurrency, setWalletCurrency] = useState('AFN');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successRequest, setSuccessRequest] = useState(null);
  const [successOpen, setSuccessOpen] = useState(false);
  const [showTopup, setShowTopup] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('wallet'); // 'wallet' | 'manual'
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptUrl, setReceiptUrl] = useState('');
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [svcs, wals] = await Promise.all([loadServices(), loadWallets(user?.id)]);
      setServices(svcs);
      setWallets(wals);
      const draft = loadDraft();
      if (draft) {
        if (draft.walletCurrency) setWalletCurrency(draft.walletCurrency);
        if (draft.description) setDescription(draft.description);
      }
    } catch (e) {
      setError(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load packages when service changes
  useEffect(() => {
    if (selectedService) {
      loadPackages(selectedService.code).then((pkgs) => {
        setPackages(pkgs);
      });
    } else {
      setPackages([]);
    }
    setSelectedPackage(null);
    setAccountInfo({});
  }, [selectedService]);

  // Save draft
  useEffect(() => {
    const draft = {
      selectedServiceCode: selectedService?.code || null,
      selectedPackageId: selectedPackage?.id || null,
      accountInfo,
      walletCurrency,
      description,
    };
    saveDraft(draft);
  }, [selectedService, selectedPackage, accountInfo, walletCurrency, description]);

  const selectedWallet = wallets.find((w) => w.currency === walletCurrency);
  const currentAmount = selectedPackage?.price || 0;
  const insufficientBalance = selectedWallet && currentAmount > 0 && (selectedWallet.balance || 0) < currentAmount;

  const validate = () => {
    const errs = {};
    if (!selectedService) errs.service = 'یک خدمت را انتخاب کنید.';
    if (!selectedPackage) errs.package = 'یک بسته/مقدار انتخاب کنید.';
    if (selectedService?.account_fields) {
      const acctErrs = {};
      selectedService.account_fields.forEach((f) => {
        if (f.required && !accountInfo[f.key]?.trim()) {
          acctErrs[f.key] = `${f.label} را وارد کنید.`;
        }
      });
      if (Object.keys(acctErrs).length > 0) errs.account = acctErrs;
    }
    if (!walletCurrency) errs.walletCurrency = 'کیف پول پرداخت را انتخاب کنید.';
    if (currentAmount <= 0) errs.amount = 'مبلغ معتبر نیست.';
    if (insufficientBalance) errs.balance = 'موجودی کیف پول برای انجام این درخواست کافی نیست.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleOpenConfirm = () => {
    if (!validate()) return;
    setConfirmOpen(true);
  };

  const isUCService = selectedService?.code === 'pubg_uc';

  const handleReceiptUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingReceipt(true);
    try {
      const url = await uploadReceipt(file, user?.id || 'demo');
      setReceiptUrl(url);
      setReceiptFile(file);
    } catch (err) {
      setErrors({ submit: err.message || 'خطا در بارگذاری رسید' });
    }
    setUploadingReceipt(false);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      if (isUCService) {
        if (paymentMethod === 'manual' && !receiptUrl) {
          setErrors({ submit: 'رسید پرداخت را بارگذاری کنید' });
          setSubmitting(false);
          return;
        }
        const result = await submitUCOrder({
          user_id: user?.id || 'demo-customer',
          user_name: user?.full_name || 'مشتری',
          product_name: selectedPackage.name,
          account_info: accountInfo,
          currency: walletCurrency,
          amount: currentAmount,
          wallet_id: selectedWallet?.id || '',
          payment_method: paymentMethod,
          receipt_url: receiptUrl,
          description,
        });
        setSuccessRequest({ ...result, request_number: result.id });
        setSuccessOpen(true);
        setConfirmOpen(false);
        clearDraft();
        setSelectedService(null);
        setSelectedPackage(null);
        setAccountInfo({});
        setDescription('');
        setReceiptUrl('');
        setReceiptFile(null);
      } else {
        const result = await submitRequest({
          user_id: user?.id || 'demo-customer',
          user_name: user?.full_name || 'مشتری',
          service_code: selectedService.code,
          service_name: selectedService.name,
          product_type: selectedService.product_type,
          package_name: selectedPackage.name,
          package_amount: selectedPackage.amount,
          account_info: accountInfo,
          wallet_currency: walletCurrency,
          amount: currentAmount,
          description,
        });
        setSuccessRequest(result);
        setSuccessOpen(true);
        setConfirmOpen(false);
        clearDraft();
        setSelectedService(null);
        setSelectedPackage(null);
        setAccountInfo({});
        setDescription('');
      }
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
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-bold text-foreground">بازی‌ها و خدمات بازی</h1>
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

  const confirmData = selectedService && selectedPackage ? {
    service_name: selectedService.name,
    product_type: selectedService.product_type,
    package_name: selectedPackage.name,
    account_info: accountInfo,
    wallet_currency: walletCurrency,
    amount: currentAmount,
    description,
  } : null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-foreground">بازی‌ها و خدمات بازی</h1>
          <p className="text-xs text-muted-foreground">UC پابجی، الماس IMO و سایر خدمات</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/customer')}>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Services Grid */}
      <div>
        <h2 className="text-sm font-bold text-foreground mb-2">خدمات بازی</h2>
        {services.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              در حال حاضر خدمتی برای نمایش وجود ندارد.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {services.map((svc) => (
              <button
                key={svc.id}
                onClick={() => { setSelectedService(svc); setErrors({}); }}
                disabled={!svc.is_active}
                className={`p-3 rounded-xl border-2 text-center transition-all disabled:opacity-40 ${
                  selectedService?.id === svc.id ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/30'
                }`}
              >
                <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${svc.color} flex items-center justify-center mx-auto mb-2 overflow-hidden`}>
                  {svc.icon_url ? (
                    <img src={svc.icon_url} alt={svc.name} loading="lazy" className="w-7 h-7 object-contain" />
                  ) : (
                    <span className="text-xl">{svc.icon}</span>
                  )}
                </div>
                <p className="text-xs font-bold text-foreground">{svc.name}</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">{svc.product_type}</p>
                {!svc.is_active && <p className="text-[8px] text-destructive mt-0.5">غیرفعال</p>}
              </button>
            ))}
          </div>
        )}
        {errors.service && <p className="text-[10px] text-destructive mt-1">{errors.service}</p>}
      </div>

      {/* Service Detail + Packages */}
      {selectedService && (
        <>
          <Card className="shadow-sm">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                {selectedService.code === 'pubg_uc' ? (
                  <img src={UC_ICON_URL} alt="UC" className="w-5 h-5 object-contain" />
                ) : (
                  <Gamepad2 className="w-4 h-4 text-primary" />
                )}
                <p className="text-sm font-bold text-foreground">{selectedService.name}</p>
                <span className={`text-[8px] px-1.5 py-0.5 rounded ${selectedService.is_active ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                  {selectedService.is_active ? 'فعال' : 'غیرفعال'}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">{selectedService.description}</p>
            </CardContent>
          </Card>

          {/* Packages — Card grid (UC style for PUBG) */}
          <div>
            <h3 className="text-sm font-bold text-foreground mb-3">
              {selectedService.code === 'pubg_uc' ? (
                <span className="flex items-center gap-1.5">
                  <img src={UC_ICON_URL} alt="UC" className="w-5 h-5 object-contain" />
                  بسته‌های UC پابجی موبایل
                </span>
              ) : selectedService.code === 'imo_diamonds' ? 'بسته‌های الماس IMO' : 'بسته‌ها'}
            </h3>
            {packages.length === 0 ? (
              <Card>
                <CardContent className="p-4 text-center text-sm text-muted-foreground">
                  بسته‌ای برای این خدمت وجود ندارد.
                </CardContent>
              </Card>
            ) : packages.some((p) => p.image) ? (
              <div className="grid grid-cols-2 gap-3">
                {packages.map((pkg) => (
                  <UCCard
                    key={pkg.id}
                    pkg={pkg}
                    selected={selectedPackage?.id === pkg.id}
                    onSelect={(p) => { setSelectedPackage(p); setErrors({}); }}
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
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
                    <p className="text-sm font-bold text-primary mt-1">{(pkg.price || 0).toLocaleString('fa-IR')} {pkg.currency}</p>
                    {!pkg.is_active && <p className="text-[8px] text-destructive mt-0.5">غیرفعال</p>}
                  </button>
                ))}
              </div>
            )}
            {errors.package && <p className="text-[10px] text-destructive mt-1">{errors.package}</p>}
          </div>

          {/* Account Info Fields — shown after package selection */}
          {selectedPackage && selectedService.account_fields && selectedService.account_fields.length > 0 && (
            <Card className="shadow-sm border-purple-200 bg-purple-50/30">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Gamepad2 className="w-4 h-4 text-purple-600" />
                  <p className="text-sm font-bold text-foreground">اطلاعات حساب بازی</p>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  برای تحویل UC به حساب شما، اطلاعات زیر را دقیق وارد کنید.
                </p>
                {selectedService.account_fields.map((f) => (
                  <div key={f.key}>
                    <Label className="text-[11px] font-medium text-foreground">{f.label}{f.required && ' *'}</Label>
                    <Input
                      placeholder={f.placeholder}
                      value={accountInfo[f.key] || ''}
                      onChange={(e) => { setAccountInfo({ ...accountInfo, [f.key]: e.target.value }); setErrors({}); }}
                      dir="ltr"
                      className="text-sm mt-1 bg-white"
                    />
                    {errors.account?.[f.key] && <p className="text-[10px] text-destructive mt-0.5">{errors.account[f.key]}</p>}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Payment Method Selection (UC only) */}
          {isUCService && selectedPackage && (
            <div>
              <Label className="text-xs">روش پرداخت</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  onClick={() => { setPaymentMethod('wallet'); setErrors({}); }}
                  className={`p-3 rounded-lg border text-center transition-all ${paymentMethod === 'wallet' ? 'border-primary bg-primary/5' : 'border-border'}`}
                >
                  <Wallet className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-[10px] font-bold">کیف پول</p>
                </button>
                <button
                  onClick={() => { setPaymentMethod('manual'); setErrors({}); }}
                  className={`p-3 rounded-lg border text-center transition-all ${paymentMethod === 'manual' ? 'border-primary bg-primary/5' : 'border-border'}`}
                >
                  <CreditCard className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-[10px] font-bold">کارت به کارت</p>
                </button>
              </div>
            </div>
          )}

          {/* Wallet Selection (only for wallet payment or non-UC) */}
          {(!isUCService || paymentMethod === 'wallet') && (
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
          )}

          {/* Manual Payment: Card-to-card with receipt upload */}
          {isUCService && paymentMethod === 'manual' && (
            <Card className="border-purple-200 bg-purple-50/30">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-purple-600" />
                  <p className="text-sm font-bold">پرداخت کارت به کارت</p>
                </div>
                <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-[11px] text-amber-800 dark:text-amber-400">
                  مبلغ {currentAmount.toLocaleString('fa-IR')} {walletCurrency} را به حساب صرافی واریز کنید، سپس تصویر رسید را بارگذاری نمایید. سفارش پس از تأیید سازنده فعال می‌شود.
                </div>
                <div>
                  <Label className="text-[11px]">رسید پرداخت *</Label>
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
                      onChange={handleReceiptUpload}
                      disabled={uploadingReceipt}
                    />
                  </label>
                  {uploadingReceipt && <p className="text-[10px] text-muted-foreground mt-1 text-center">در حال بارگذاری...</p>}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Insufficient Balance */}
          {insufficientBalance && (
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                  <p className="text-xs text-destructive font-medium">
                    موجودی کیف پول برای انجام این درخواست کافی نیست.
                  </p>
                </div>
                {selectedService?.code === 'pubg_uc' && (
                  <Button size="sm" variant="outline" className="w-full" onClick={() => setShowTopup(true)}>
                    <Wallet className="w-3.5 h-3.5 ml-1" />
                    افزایش موجودی با کارت بانکی
                  </Button>
                )}
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
        </>
      )}

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

      {/* UC Topup Sheet */}
      <UCTopupSheet
        open={showTopup}
        onOpenChange={setShowTopup}
        userId={user?.id || 'demo-customer'}
        userName={user?.full_name || 'مشتری'}
        currency={walletCurrency}
        onSubmitted={() => {
          setShowTopup(false);
          loadData();
        }}
      />
    </div>
  );
}