import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  loadAfghan5Packages, loadAfghan5Url, submitAfghan5Order, loadMyAfghan5Orders,
} from '@/lib/afghan5Api';
import { createSupabaseEntity } from '@/lib/supabaseApi';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Globe, Wallet, Send, Package, ExternalLink, ArrowRight,
  AlertTriangle, RefreshCw, Loader2, CheckCircle, XCircle, Clock, Truck,
} from 'lucide-react';

const STATUS_LABELS = {
  pending: { label: 'در انتظار', color: 'bg-amber-100 text-amber-700', icon: Clock },
  approved: { label: 'در حال خرید', color: 'bg-blue-100 text-blue-700', icon: Loader2 },
  completed: { label: 'تحویل شده', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  rejected: { label: 'رد شده', color: 'bg-red-100 text-red-700', icon: XCircle },
};

function toFa(n) { return Number(n || 0).toLocaleString('fa-IR'); }
function faTime(iso) {
  if (!iso) return '';
  try { return new Date(iso).toLocaleString('fa-IR', { timeZone: 'Asia/Tehran' }); }
  catch { return iso; }
}

export default function CustomerAfghan5() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [phone, setPhone] = useState('');
  const [selectedPkg, setSelectedPkg] = useState(null);
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);

  const sbWallet = createSupabaseEntity('Wallet');

  const { data: packages, isLoading: pkgLoading } = useQuery({
    queryKey: ['afghan5Packages'],
    queryFn: loadAfghan5Packages,
  });

  const { data: urlSetting } = useQuery({
    queryKey: ['afghan5Url'],
    queryFn: loadAfghan5Url,
  });

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ['myAfghan5Orders', user?.id],
    queryFn: () => loadMyAfghan5Orders(user?.id),
    enabled: !!user?.id,
  });

  const [wallets, setWallets] = useState([]);
  const [walletCurrency, setWalletCurrency] = useState('AFN');
  const [walletLoading, setWalletLoading] = useState(true);

  const loadWallets = useCallback(async () => {
    if (!user?.id) return;
    try {
      const w = await sbWallet.filter({ user_id: user.id });
      setWallets(w || []);
    } catch { /* ignore */ }
    setWalletLoading(false);
  }, [user?.id]);

  useEffect(() => { loadWallets(); }, [loadWallets]);

  const afghan5Url = urlSetting?.value || '';
  const activePackages = (packages || []).filter(p => p.enabled !== false);
  const selectedWallet = wallets.find(w => w.currency === walletCurrency);
  const currentAmount = selectedPkg?.price || 0;
  const insufficientBalance = selectedWallet && currentAmount > 0 && (selectedWallet.balance || 0) < currentAmount;

  const validate = () => {
    const errs = {};
    if (!selectedPkg) errs.package = 'یک بسته انتخاب کنید.';
    if (!phone.trim()) errs.phone = 'شماره تلفن را وارد کنید.';
    else if (!/^[0-9+\-\s]{7,15}$/.test(phone.replace(/\s/g, ''))) errs.phone = 'فرمت شماره معتبر نیست.';
    if (insufficientBalance) errs.balance = 'موجودی کیف پول کافی نیست.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      await submitAfghan5Order({
        user_id: user.id,
        user_name: user?.full_name || 'مشتری',
        package_name: selectedPkg.name,
        package_description: selectedPkg.description || selectedPkg.amount || '',
        phone: phone.trim(),
        amount: currentAmount,
        currency: selectedPkg.currency || walletCurrency,
        description,
      });
      qc.invalidateQueries({ queryKey: ['myAfghan5Orders', user?.id] });
      qc.invalidateQueries({ queryKey: ['afghan5Wallet'] });
      setSuccessOpen(true);
      setSelectedPkg(null);
      setPhone('');
      setDescription('');
      setErrors({});
      loadWallets();
    } catch (e) {
      const msg = e?.message === 'insufficient_balance' ? 'موجودی کیف پول کافی نیست'
        : e?.message === 'wallet_not_found' ? 'کیف پول یافت نشد'
        : 'خطا در ثبت سفارش';
      setErrors({ submit: msg });
    }
    setSubmitting(false);
  };

  const isLoading = pkgLoading || walletLoading;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-10 w-full rounded-xl" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-foreground">افغان۵</h1>
          <p className="text-xs text-muted-foreground">خرید بسته با موجودی کیف پول</p>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => navigate('/customer')}>
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Afghan5 Guide Button */}
      {afghan5Url ? (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-3 flex items-center gap-2">
            <Globe className="w-4 h-4 text-blue-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground">حساب کاربری افغان۵</p>
              <p className="text-[10px] text-muted-foreground truncate" dir="ltr">{afghan5Url}</p>
            </div>
            <a href={afghan5Url} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="outline" className="gap-1">
                <ExternalLink className="w-3.5 h-3.5" />
                باز کردن
              </Button>
            </a>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <p className="text-[10px] text-amber-700">نشانی حساب افغان۵ توسط مدیر تنظیم نشده است.</p>
          </CardContent>
        </Card>
      )}

      {/* Wallet Balance */}
      <Card className="shadow-card">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">موجودی کیف پول</span>
            <div className="flex gap-1.5">
              {wallets.map(w => (
                <button
                  key={w.currency}
                  onClick={() => { setWalletCurrency(w.currency); setErrors({}); }}
                  className={`px-2 py-1 rounded-lg text-[10px] font-medium border ${walletCurrency === w.currency ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground'}`}
                >
                  {toFa(w.balance || 0)} {w.currency}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Package Grid */}
      <div>
        <h2 className="text-sm font-bold text-foreground mb-2">بسته‌های افغان۵</h2>
        {activePackages.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              در حال حاضر بسته‌ای برای نمایش وجود ندارد.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {activePackages.map(pkg => (
              <button
                key={pkg.id}
                onClick={() => { setSelectedPkg(pkg); setErrors({}); }}
                className={`p-3 rounded-xl border-2 text-right transition-all ${
                  selectedPkg?.id === pkg.id ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/30'
                }`}
              >
                <p className="text-xs font-bold text-foreground">{pkg.name}</p>
                {pkg.amount && <p className="text-[10px] text-muted-foreground mt-0.5">{pkg.amount}</p>}
                {pkg.description && <p className="text-[9px] text-muted-foreground mt-0.5 line-clamp-2">{pkg.description}</p>}
                <p className="text-sm font-bold text-primary mt-1">{toFa(pkg.price)} {pkg.currency || 'AFN'}</p>
              </button>
            ))}
          </div>
        )}
        {errors.package && <p className="text-[10px] text-destructive mt-1">{errors.package}</p>}
      </div>

      {/* Order Form */}
      {selectedPkg && (
        <>
          <Card className="shadow-sm border-primary/30">
            <CardContent className="p-3 space-y-3">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-primary" />
                <p className="text-sm font-bold text-foreground">{selectedPkg.name}</p>
              </div>
              <div>
                <Label className="text-xs">شماره تلفن مقصد *</Label>
                <Input
                  placeholder="مثال: 0700123456"
                  value={phone}
                  onChange={e => { setPhone(e.target.value); setErrors({}); }}
                  dir="ltr"
                  className="text-sm mt-1"
                />
                {errors.phone && <p className="text-[10px] text-destructive mt-0.5">{errors.phone}</p>}
              </div>
              <div>
                <Label className="text-xs">توضیحات (اختیاری)</Label>
                <Input
                  placeholder="توضیحات..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="text-sm mt-1"
                />
              </div>
            </CardContent>
          </Card>

          {/* Insufficient Balance */}
          {insufficientBalance && (
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="p-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                <p className="text-xs text-destructive font-medium">موجودی کیف پول برای این سفارش کافی نیست.</p>
              </CardContent>
            </Card>
          )}

          {/* Summary & Submit */}
          <Card className="shadow-sm border-primary/30">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">مبلغ قابل پرداخت:</span>
                <span className="font-bold text-primary">{toFa(currentAmount)} {selectedPkg.currency || walletCurrency}</span>
              </div>
              {errors.submit && <p className="text-[10px] text-destructive">{errors.submit}</p>}
              <Button onClick={handleSubmit} className="w-full" disabled={insufficientBalance || submitting}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 ml-2" />}
                ثبت سفارش
              </Button>
            </CardContent>
          </Card>
        </>
      )}

      {/* Success Message */}
      {successOpen && (
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="p-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-medium text-green-700">سفارش ثبت شد!</p>
              <p className="text-[10px] text-green-600">مبلغ از کیف پول کسر شد. وضعیت سفارش را در پایین پیگیری کنید.</p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setSuccessOpen(false)}>بستن</Button>
          </CardContent>
        </Card>
      )}

      {/* Order History */}
      <div>
        <h2 className="text-sm font-bold text-foreground mb-2">سفارش‌های من</h2>
        {ordersLoading ? (
          <div className="flex justify-center p-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : (orders || []).length === 0 ? (
          <Card>
            <CardContent className="p-4 text-center text-sm text-muted-foreground">
              سفارشی ثبت نشده است.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {(orders || []).map(order => {
              const st = STATUS_LABELS[order.status] || {};
              const StIcon = st.icon || Package;
              const fields = order.fields || {};
              return (
                <Card key={order.id} className="shadow-sm">
                  <CardContent className="p-3 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-medium">{order.product_name || 'بسته افغان۵'}</span>
                        <Badge variant="secondary" className={`mr-2 text-[9px] ${st.color}`}>
                          <StIcon className="w-2.5 h-2.5 ml-0.5" /> {st.label}
                        </Badge>
                      </div>
                      <span className="text-sm font-bold text-primary shrink-0">{toFa(order.total)} {order.currency || ''}</span>
                    </div>
                    {fields.phone && <p className="text-[10px] text-muted-foreground" dir="ltr">شماره: {fields.phone}</p>}
                    {order.tracking_no && <p className="text-[10px] text-muted-foreground" dir="ltr">پیگیری: {order.tracking_no}</p>}
                    {order.notes && <p className="text-[10px] text-muted-foreground">{order.notes}</p>}
                    <p className="text-[9px] text-muted-foreground">{faTime(order.created_date)}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Link to Orders */}
      <Button variant="outline" className="w-full" onClick={() => navigate('/customer/orders')}>
        <Package className="w-4 h-4 ml-2" />
        همه سفارش‌ها
      </Button>
    </div>
  );
}