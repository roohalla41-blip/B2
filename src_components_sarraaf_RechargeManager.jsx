import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { createSupabaseEntity } from '@/lib/supabaseApi';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Smartphone, Wifi, CheckCircle, XCircle, Clock, Loader2, Receipt,
  ExternalLink, Plus, Search,
} from 'lucide-react';

// ── Operators (from afghanfive.ir) ──
const OPERATORS = [
  // Afghanistan
  { key: 'awcc', name: 'بیسیم (AWCC)', country: 'afghanistan', color: 'bg-red-500' },
  { key: 'etisalat', name: 'اتصالات', country: 'afghanistan', color: 'bg-green-500' },
  { key: 'roshan', name: 'روشن', country: 'afghanistan', color: 'bg-purple-500' },
  { key: 'salam', name: 'سلام', country: 'afghanistan', color: 'bg-blue-500' },
  { key: 'atoma', name: 'ATOMA', country: 'afghanistan', color: 'bg-orange-500' },
  // Iran
  { key: 'mci', name: 'همراه اول', country: 'iran', color: 'bg-teal-500' },
  { key: 'irancell', name: 'ایرانسل', country: 'iran', color: 'bg-yellow-500' },
  { key: 'rightel', name: 'رایتل', country: 'iran', color: 'bg-pink-500' },
];

const PACKAGE_TYPES = [
  { key: 'credit', label: 'شارژ اعتباری' },
  { key: 'internet', label: 'بسته اینترنت' },
  { key: 'bundle', label: 'بسته ترکیبی' },
];

const STATUS_LABELS = {
  pending: 'در انتظار بررسی',
  completed: 'موفق',
  failed: 'ناموفق',
};

const STATUS_COLORS = {
  pending: 'bg-amber-100 text-amber-700',
  completed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
};

const SUPPLIER_LABELS = {
  not_submitted: 'ثبت نشده',
  submitted: 'ارسال شده',
  confirmed: 'تأیید شده',
  failed: 'ناموفق',
};

function toFa(n) { return Number(n || 0).toLocaleString('fa-IR'); }

export default function RechargeManager() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [completingId, setCompletingId] = useState(null);
  const [trackingNo, setTrackingNo] = useState('');

  // ── Form state ──
  const [operator, setOperator] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [packageType, setPackageType] = useState('credit');
  const [packageName, setPackageName] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('AFN');

  const sb = createSupabaseEntity('RechargeOrder');

  const { data: orders, isLoading } = useQuery({
    queryKey: ['rechargeOrders'],
    queryFn: async () => await sb.list('-id', 500),
  });

  const resetForm = () => {
    setOperator('');
    setPhoneNumber('');
    setPackageType('credit');
    setPackageName('');
    setAmount('');
    setCurrency('AFN');
  };

  const handleSubmit = async () => {
    if (!operator || !phoneNumber || !amount) {
      toast({ title: 'اطلاعات ناقص است', variant: 'destructive' });
      return;
    }
    const op = OPERATORS.find(o => o.key === operator);
    setSubmitting(true);
    try {
      await sb.create({
        operator_key: op.key,
        operator_name: op.name,
        operator_country: op.country,
        phone_number: phoneNumber,
        package_type: packageType,
        package_name: packageName,
        amount: parseFloat(amount) || 0,
        currency,
        status: 'pending',
        supplier_status: 'not_submitted',
      });
      toast({ title: 'سفارش ثبت شد', description: 'وضعیت: در انتظار بررسی' });
      resetForm();
      setShowForm(false);
      qc.invalidateQueries({ queryKey: ['rechargeOrders'] });
    } catch (err) {
      toast({ title: 'خطا در ثبت سفارش', description: err?.message, variant: 'destructive' });
    }
    setSubmitting(false);
  };

  const handleComplete = async (order) => {
    if (!trackingNo.trim()) {
      toast({ title: 'شماره پیگیری را وارد کنید', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      await sb.update(order.id, {
        status: 'completed',
        supplier_status: 'confirmed',
        tracking_number: trackingNo,
        receipt_data: {
          phone_number: order.phone_number,
          operator_name: order.operator_name,
          package_name: order.package_name || PACKAGE_TYPES.find(p => p.key === order.package_type)?.label || '',
          amount: order.amount,
          currency: order.currency,
          tracking_number: trackingNo,
          status: 'موفق',
          date: new Date().toISOString(),
        },
      });
      toast({ title: 'سفارش تأیید شد', description: 'فیش خرید صادر شد' });
      setCompletingId(null);
      setTrackingNo('');
      qc.invalidateQueries({ queryKey: ['rechargeOrders'] });
    } catch (err) {
      toast({ title: 'خطا', description: err?.message, variant: 'destructive' });
    }
    setSubmitting(false);
  };

  const handleFail = async (order) => {
    setSubmitting(true);
    try {
      await sb.update(order.id, {
        status: 'failed',
        supplier_status: 'failed',
      });
      toast({ title: 'سفارش ناموفق علامت‌گذاری شد' });
      qc.invalidateQueries({ queryKey: ['rechargeOrders'] });
    } catch (err) {
      toast({ title: 'خطا', description: err?.message, variant: 'destructive' });
    }
    setSubmitting(false);
  };

  const filtered = (orders || []).filter(o => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (o.phone_number || '').includes(s) || (o.operator_name || '').toLowerCase().includes(s);
  });

  const pending = filtered.filter(o => o.status === 'pending');
  const completed = filtered.filter(o => o.status === 'completed');
  const failed = filtered.filter(o => o.status === 'failed');

  return (
    <div className="space-y-4">
      <Card><CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold">شارژ و بسته اینترنت</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              ثبت سفارش دستی — خرید از افغان۵
            </p>
          </div>
          <Button size="sm" onClick={() => { setShowForm(!showForm); if (showForm) resetForm(); }}>
            {showForm ? 'انصراف' : <><Plus className="w-3 h-3" /> سفارش جدید</>}
          </Button>
        </div>

        {/* Info banner */}
        <div className="rounded-lg bg-info/5 border border-info/30 p-2.5 mb-3">
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            این بخش سفارش‌ها را در برنامه شما ثبت می‌کند. پس از ثبت، سفارش را به‌صورت دستی در{' '}
            <a href="https://afghanfive.ir/dashboard" target="_blank" rel="noopener noreferrer" className="text-info font-medium underline inline-flex items-center gap-0.5">
              afghanfive.ir <ExternalLink className="w-2.5 h-2.5" />
            </a>{' '}
            انجام دهید. پس از تأیید، شماره پیگیری را وارد کنید تا فیش خرید صادر شود.
          </p>
        </div>

        {/* New order form */}
        {showForm && (
          <div className="space-y-3 rounded-lg border p-3 bg-muted/30">
            {/* Operator selection */}
            <div>
              <Label className="text-xs mb-1.5 block">انتخاب اپراتور</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {OPERATORS.map(op => (
                  <button
                    key={op.key}
                    onClick={() => setOperator(op.key)}
                    className={`p-2 rounded-lg border text-center text-[10px] font-medium transition-all ${operator === op.key ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:border-primary/40'}`}
                  >
                    <div className={`w-7 h-7 rounded-full ${op.color} mx-auto mb-1`} />
                    {op.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Phone number */}
            <div>
              <Label className="text-xs">شماره تلفن</Label>
              <Input
                placeholder="مثال: 0700123456"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                dir="ltr"
                className="text-sm mt-1"
              />
            </div>

            {/* Package type */}
            <div>
              <Label className="text-xs mb-1.5 block">نوع بسته</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {PACKAGE_TYPES.map(pt => (
                  <button
                    key={pt.key}
                    onClick={() => setPackageType(pt.key)}
                    className={`p-2 rounded-lg border text-[10px] font-medium ${packageType === pt.key ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground'}`}
                  >
                    {pt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Package name + amount */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">نام بسته (اختیاری)</Label>
                <Input
                  placeholder="مثال: 5GB اینترنت"
                  value={packageName}
                  onChange={(e) => setPackageName(e.target.value)}
                  className="text-sm mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">مبلغ</Label>
                <Input
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  dir="ltr"
                  className="text-sm mt-1"
                />
              </div>
            </div>

            {/* Currency */}
            <div>
              <Label className="text-xs mb-1.5 block">ارز</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {['AFN', 'USD', 'IRT'].map(c => (
                  <button
                    key={c}
                    onClick={() => setCurrency(c)}
                    className={`p-2 rounded-lg border text-[10px] font-medium ${currency === c ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground'}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <Button onClick={handleSubmit} className="w-full" disabled={submitting || !operator || !phoneNumber || !amount}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              ثبت سفارش
            </Button>
          </div>
        )}
      </CardContent></Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="جستجو بر اساس شماره یا اپراتور..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pr-9 text-sm"
        />
      </div>

      {/* Orders list */}
      {isLoading ? (
        <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-3">
          {pending.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] text-amber-600 font-medium flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" /> {toFa(pending.length)} در انتظار بررسی
              </p>
              {pending.map(order => (
                <OrderRow
                  key={order.id}
                  order={order}
                  completingId={completingId}
                  trackingNo={trackingNo}
                  setTrackingNo={setTrackingNo}
                  setCompletingId={setCompletingId}
                  onComplete={() => handleComplete(order)}
                  onFail={() => handleFail(order)}
                  submitting={submitting}
                />
              ))}
            </div>
          )}

          {completed.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] text-green-600 font-medium flex items-center gap-1">
                <CheckCircle className="w-2.5 h-2.5" /> موفق
              </p>
              {completed.slice(0, 20).map(order => (
                <OrderRow key={order.id} order={order} />
              ))}
            </div>
          )}

          {failed.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] text-red-600 font-medium flex items-center gap-1">
                <XCircle className="w-2.5 h-2.5" /> ناموفق
              </p>
              {failed.slice(0, 10).map(order => (
                <OrderRow key={order.id} order={order} />
              ))}
            </div>
          )}

          {filtered.length === 0 && (
            <div className="py-8 text-center">
              <Smartphone className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-xs text-muted-foreground">سفارشی ثبت نشده است.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Order row ──
function OrderRow({ order, completingId, trackingNo, setTrackingNo, setCompletingId, onComplete, onFail, submitting }) {
  const [showReceipt, setShowReceipt] = useState(false);
  const op = OPERATORS.find(o => o.key === order.operator_key);

  return (
    <div className="p-3 rounded-lg border space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 flex items-center gap-2">
          {op && <div className={`w-7 h-7 rounded-full ${op.color} shrink-0`} />}
          <div className="min-w-0">
            <span className="text-sm font-medium">{order.operator_name || '—'}</span>
            <p className="text-[10px] text-muted-foreground" dir="ltr">{order.phone_number}</p>
          </div>
        </div>
        <div className="text-left shrink-0">
          <span className="text-sm font-bold text-primary">{toFa(order.amount)}</span>
          <Badge variant="outline" className="mr-1 text-[9px]">{order.currency || 'AFN'}</Badge>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
        {order.package_name && <span>بسته: {order.package_name}</span>}
        {order.package_type && <span>نوع: {PACKAGE_TYPES.find(p => p.key === order.package_type)?.label || order.package_type}</span>}
        {order.tracking_number && <span dir="ltr">پیگیری: {order.tracking_number}</span>}
        {order.supplier_status && <span>افغان۵: {SUPPLIER_LABELS[order.supplier_status] || order.supplier_status}</span>}
      </div>

      <div className="flex items-center gap-1.5">
        <Badge variant="secondary" className={`text-[9px] ${STATUS_COLORS[order.status]}`}>
          {STATUS_LABELS[order.status]}
        </Badge>
        {order.status === 'completed' && (
          <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => setShowReceipt(!showReceipt)}>
            <Receipt className="w-3 h-3" /> فیش خرید
          </Button>
        )}
      </div>

      {/* Receipt display */}
      {showReceipt && order.status === 'completed' && order.receipt_data && (
        <div className="rounded-lg border-2 border-dashed border-primary/30 p-3 bg-primary/5 space-y-1.5">
          <div className="flex items-center justify-center gap-1 mb-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-xs font-bold text-green-700">فیش خرید موفق</span>
          </div>
          <ReceiptRow label="شماره تلفن" value={order.receipt_data.phone_number} ltr />
          <ReceiptRow label="اپراتور" value={order.receipt_data.operator_name} />
          <ReceiptRow label="نوع بسته" value={order.receipt_data.package_name} />
          <ReceiptRow label="مبلغ" value={`${toFa(order.receipt_data.amount)} ${order.receipt_data.currency || ''}`} />
          <ReceiptRow label="شماره پیگیری" value={order.receipt_data.tracking_number} ltr />
          <ReceiptRow label="وضعیت" value="موفق" />
          <ReceiptRow label="تاریخ" value={new Date(order.receipt_data.date || order.created_date).toLocaleString('fa-IR', { timeZone: 'Asia/Tehran' })} />
        </div>
      )}

      {/* Complete order (pending → completed) */}
      {order.status === 'pending' && completingId === order.id && (
        <div className="space-y-1.5 rounded-lg border p-2 bg-muted/30">
          <Label className="text-[10px]">شماره پیگیری (از افغان۵)</Label>
          <Input
            value={trackingNo}
            onChange={(e) => setTrackingNo(e.target.value)}
            placeholder="شماره پیگیری..."
            dir="ltr"
            className="text-sm h-8"
          />
          <div className="flex gap-1">
            <Button size="sm" onClick={onComplete} disabled={submitting || !trackingNo.trim()}>
              <CheckCircle className="w-3 h-3" /> تأیید خرید
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setCompletingId(null); setTrackingNo(''); }}>انصراف</Button>
          </div>
        </div>
      )}

      {/* Action buttons for pending orders */}
      {order.status === 'pending' && completingId !== order.id && (
        <div className="flex gap-1">
          <Button size="sm" onClick={() => setCompletingId(order.id)}>
            <CheckCircle className="w-3 h-3" /> تأیید خرید
          </Button>
          <Button size="sm" variant="ghost" onClick={onFail} disabled={submitting}>
            <XCircle className="w-3 h-3" /> ناموفق
          </Button>
        </div>
      )}
    </div>
  );
}

function ReceiptRow({ label, value, ltr }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[10px] text-muted-foreground">{label}:</span>
      <span className="text-[10px] font-medium" dir={ltr ? 'ltr' : 'rtl'}>{value || '—'}</span>
    </div>
  );
}