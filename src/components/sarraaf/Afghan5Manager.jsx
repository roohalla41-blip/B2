import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { toast } from '@/components/ui/use-toast';
import {
  Globe, Plus, Pencil, Trash2, Package, Loader2,
  ExternalLink, Save, Check, X, Clock, Truck, Search,
} from 'lucide-react';
import {
  ensureAfghan5Service, loadAfghan5Url, saveAfghan5Url,
  loadAfghan5Packages, createAfghan5Package, updateAfghan5Package, deleteAfghan5Package,
  loadAllAfghan5Orders, approveAfghan5Order, completeAfghan5Order, rejectAfghan5Order,
  seedDefaultAfghan5Packages,
  applyDiscountToExistingPackages,
} from '@/lib/afghan5Api';

function toFa(n) { return Number(n || 0).toLocaleString('fa-IR'); }
function faTime(iso) {
  if (!iso) return '';
  try { return new Date(iso).toLocaleString('fa-IR', { timeZone: 'Asia/Tehran' }); }
  catch { return iso; }
}

const STATUS_LABELS = {
  pending: { label: 'در انتظار', color: 'bg-amber-100 text-amber-700' },
  approved: { label: 'در حال خرید', color: 'bg-blue-100 text-blue-700' },
  completed: { label: 'تحویل شده', color: 'bg-green-100 text-green-700' },
  rejected: { label: 'رد شده', color: 'bg-red-100 text-red-700' },
};

// ── Settings Tab: afghan5 display URL ──
function SettingsTab() {
  const qc = useQueryClient();
  const { data: setting, isLoading } = useQuery({
    queryKey: ['afghan5Url'],
    queryFn: loadAfghan5Url,
  });
  const [url, setUrl] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (setting) setUrl(setting.value || '');
  }, [setting]);

  const handleSave = async () => {
    if (!url.trim()) {
      toast({ title: 'نشانی را وارد کنید', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await saveAfghan5Url(url.trim());
      toast({ title: 'نشانی حساب افغان۵ ذخیره شد' });
      qc.invalidateQueries({ queryKey: ['afghan5Url'] });
    } catch (err) {
      toast({ title: 'خطا', description: err.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  if (isLoading) return <div className="flex justify-center p-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Globe className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold">نشانی نمایشی حساب افغان۵</h3>
      </div>
      <p className="text-[10px] text-muted-foreground leading-relaxed">
        نشانی حساب کاربری خود را در افغان۵ وارد کنید. این نشانی فقط برای نمایش به کاربران است و رمز عبور ذخیره نمی‌شود.
        کاربران با کلیک روی این دکمه به افغان۵ هدایت می‌شوند اما خرید از طریق موجودی کیف پول برنامه انجام می‌شود.
      </p>
      <div>
        <Label className="text-xs">نشانی حساب افغان۵</Label>
        <Input
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="https://afghanfive.ir/dashboard"
          dir="ltr"
          className="text-sm mt-1"
        />
      </div>
      <Button onClick={handleSave} disabled={saving} size="sm">
        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
        ذخیره
      </Button>
      {url && (
        <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] text-blue-600 hover:underline mr-2">
          <ExternalLink className="w-3 h-3" /> آزمایش نشانی
        </a>
      )}
    </div>
  );
}

// ── Packages Tab: CRUD ──
function PackagesTab() {
  const qc = useQueryClient();
  const { data: packages, isLoading } = useQuery({
    queryKey: ['afghan5Packages'],
    queryFn: loadAfghan5Packages,
  });
  const [showForm, setShowForm] = useState(false);
  const [editPkg, setEditPkg] = useState(null);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [discounting, setDiscounting] = useState(false);
  const [form, setForm] = useState({ name: '', price: '', currency: 'AFN', amount: '', description: '', display_order: 0, enabled: true });

  const handleDiscount = async () => {
    if (!confirm('۱۰٪ تخفیف روی قیمت همه بسته‌های موجود اعمال شود؟')) return;
    setDiscounting(true);
    try {
      const result = await applyDiscountToExistingPackages(10);
      toast({ title: 'تخفیف اعمال شد', description: `${toFa(result.updated)} بسته از ${toFa(result.total)} بسته به‌روزرسانی شد` });
      qc.invalidateQueries({ queryKey: ['afghan5Packages'] });
    } catch (err) {
      toast({ title: 'خطا', description: err.message, variant: 'destructive' });
    }
    setDiscounting(false);
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const result = await seedDefaultAfghan5Packages();
      toast({ title: 'بسته‌های پیش‌فرض اضافه شد', description: `${result.created} بسته جدید ایجاد شد` });
      qc.invalidateQueries({ queryKey: ['afghan5Packages'] });
    } catch (err) {
      toast({ title: 'خطا', description: err.message, variant: 'destructive' });
    }
    setSeeding(false);
  };

  const openCreate = () => {
    setEditPkg(null);
    setForm({ name: '', price: '', currency: 'AFN', amount: '', description: '', display_order: 0, enabled: true });
    setShowForm(true);
  };

  const openEdit = (pkg) => {
    setEditPkg(pkg);
    setForm({
      name: pkg.name || '',
      price: pkg.price || '',
      currency: pkg.currency || 'AFN',
      amount: pkg.amount || '',
      description: pkg.description || '',
      display_order: pkg.display_order || 0,
      enabled: pkg.enabled !== false,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.price) {
      toast({ title: 'خطا', description: 'نام و قیمت الزامی است', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const data = {
        name: form.name,
        price: parseFloat(form.price) || 0,
        currency: form.currency,
        amount: String(form.amount || ''),
        description: form.description,
        display_order: parseInt(form.display_order) || 0,
        enabled: form.enabled,
      };
      if (editPkg) {
        await updateAfghan5Package(editPkg.id, data);
        toast({ title: 'بسته به‌روزرسانی شد' });
      } else {
        await createAfghan5Package(data);
        toast({ title: 'بسته ایجاد شد' });
      }
      setShowForm(false);
      qc.invalidateQueries({ queryKey: ['afghan5Packages'] });
    } catch (err) {
      toast({ title: 'خطا', description: err.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  const handleDelete = async (pkg) => {
    if (!confirm(`حذف بسته «${pkg.name}»؟`)) return;
    try {
      await deleteAfghan5Package(pkg.id);
      toast({ title: 'بسته حذف شد' });
      qc.invalidateQueries({ queryKey: ['afghan5Packages'] });
    } catch (err) {
      toast({ title: 'خطا', description: err.message, variant: 'destructive' });
    }
  };

  const handleToggle = async (pkg) => {
    try {
      await updateAfghan5Package(pkg.id, { enabled: !pkg.enabled });
      qc.invalidateQueries({ queryKey: ['afghan5Packages'] });
    } catch (err) {
      toast({ title: 'خطا', description: err.message, variant: 'destructive' });
    }
  };

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-1.5"><Package className="w-4 h-4" /> بسته‌های افغان۵</h3>
        <div className="flex gap-1">
          <Button size="sm" onClick={openCreate}><Plus className="w-3.5 h-3.5" /> بسته جدید</Button>
          <Button size="sm" variant="outline" onClick={handleSeed} disabled={seeding}>
            {seeding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Package className="w-3.5 h-3.5" />}
            بسته‌های پیش‌فرض
          </Button>
          <Button size="sm" variant="outline" onClick={handleDiscount} disabled={discounting}>
            {discounting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Package className="w-3.5 h-3.5" />}
            ۱۰٪ تخفیف
          </Button>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground">قیمت‌های واقعی بازار افغانستان. دکمه «بسته‌های پیش‌فرض» بسته‌های ۵ اپراتور را با قیمت واقعی اضافه می‌کند.</p>

      {(packages || []).length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">هنوز بسته‌ای ایجاد نشده است.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {(packages || []).map(pkg => (
            <div key={pkg.id} className="p-3 rounded-lg border space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{pkg.name}</span>
                <Switch checked={pkg.enabled !== false} onCheckedChange={() => handleToggle(pkg)} />
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
                <span>قیمت: {toFa(pkg.price)} {pkg.currency || 'AFN'}</span>
                {pkg.amount && <span>مقدار: {pkg.amount}</span>}
              </div>
              {pkg.description && <p className="text-[10px] text-muted-foreground">{pkg.description}</p>}
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => openEdit(pkg)}><Pencil className="w-3 h-3" /> ویرایش</Button>
                <Button size="sm" variant="ghost" onClick={() => handleDelete(pkg)}><Trash2 className="w-3 h-3" /> حذف</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editPkg ? 'ویرایش بسته' : 'بسته جدید'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>نام بسته *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="مثلاً ۵ گیگابایت اینترنت" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>قیمت *</Label><Input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="500" dir="ltr" /></div>
              <div><Label>ارز</Label><Input value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} placeholder="AFN" dir="ltr" /></div>
            </div>
            <div><Label>مقدار / حجم</Label><Input value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="5GB" dir="ltr" /></div>
            <div><Label>توضیحات</Label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="توضیحات بسته" /></div>
            <div><Label>ترتیب نمایش</Label><Input type="number" value={form.display_order} onChange={e => setForm({ ...form, display_order: e.target.value })} dir="ltr" /></div>
            <div className="flex items-center gap-2">
              <Switch checked={form.enabled} onCheckedChange={v => setForm({ ...form, enabled: v })} />
              <Label>فعال</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>انصراف</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'ذخیره'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Orders Tab: review and fulfill ──
function OrdersTab() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: orders, isLoading } = useQuery({
    queryKey: ['afghan5Orders'],
    queryFn: loadAllAfghan5Orders,
  });
  const [processing, setProcessing] = useState(false);
  const [completingId, setCompletingId] = useState(null);
  const [trackingNo, setTrackingNo] = useState('');
  const [search, setSearch] = useState('');

  const reviewer = user?.full_name || user?.email || 'سازنده';
  const reviewerId = user?.id || '';

  const handleApprove = async (order) => {
    setProcessing(true);
    try {
      await approveAfghan5Order(order, reviewerId, reviewer);
      toast({ title: 'سفارش تأیید شد', description: 'در حال خرید از افغان۵' });
      qc.invalidateQueries({ queryKey: ['afghan5Orders'] });
    } catch (err) {
      toast({ title: 'خطا', description: err.message, variant: 'destructive' });
    }
    setProcessing(false);
  };

  const handleComplete = async (order) => {
    if (!trackingNo.trim()) {
      toast({ title: 'شماره پیگیری را وارد کنید', variant: 'destructive' });
      return;
    }
    setProcessing(true);
    try {
      await completeAfghan5Order(order, trackingNo.trim(), reviewerId, reviewer);
      toast({ title: 'سفارش تحویل داده شد' });
      setCompletingId(null);
      setTrackingNo('');
      qc.invalidateQueries({ queryKey: ['afghan5Orders'] });
    } catch (err) {
      toast({ title: 'خطا', description: err.message, variant: 'destructive' });
    }
    setProcessing(false);
  };

  const handleReject = async (order) => {
    setProcessing(true);
    try {
      await rejectAfghan5Order(order, 'رد شده توسط سازنده', reviewerId, reviewer);
      toast({ title: 'سفارش رد شد', description: 'مبلغ به کیف پول بازگردانده شد' });
      qc.invalidateQueries({ queryKey: ['afghan5Orders'] });
    } catch (err) {
      toast({ title: 'خطا', description: err.message, variant: 'destructive' });
    }
    setProcessing(false);
  };

  const filtered = (orders || []).filter(o => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (o.product_name || '').toLowerCase().includes(s) || (o.id || '').includes(s);
  });

  const pending = filtered.filter(o => o.status === 'pending');
  const active = filtered.filter(o => o.status === 'approved');
  const done = filtered.filter(o => o.status === 'completed' || o.status === 'rejected');

  const renderRow = (order) => {
    const fields = order.fields || {};
    const st = STATUS_LABELS[order.status] || {};
    return (
      <div key={order.id} className="p-3 rounded-lg border space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <span className="text-sm font-medium">{order.product_name || 'بسته افغان۵'}</span>
            <Badge variant="secondary" className={`mr-2 text-[9px] ${st.color}`}>{st.label}</Badge>
          </div>
          <span className="text-sm font-bold text-primary shrink-0">{toFa(order.total)} {order.currency || ''}</span>
        </div>
        {fields.phone && <p className="text-[10px] text-muted-foreground" dir="ltr">شماره: {fields.phone}</p>}
        {fields.package_description && <p className="text-[10px] text-muted-foreground">{fields.package_description}</p>}
        {order.tracking_no && <p className="text-[10px] text-muted-foreground" dir="ltr">پیگیری: {order.tracking_no}</p>}
        {order.notes && <p className="text-[10px] text-muted-foreground">یادداشت: {order.notes}</p>}
        {order.fulfillment_date && <p className="text-[10px] text-muted-foreground">زمان تحویل: {faTime(order.fulfillment_date)}</p>}

        {order.status === 'pending' && (
          <div className="flex gap-1">
            <Button size="sm" onClick={() => handleApprove(order)} disabled={processing}>
              <Check className="w-3 h-3" /> شروع خرید
            </Button>
            <Button size="sm" variant="ghost" onClick={() => handleReject(order)} disabled={processing}>
              <X className="w-3 h-3" /> رد و بازگشت
            </Button>
          </div>
        )}

        {order.status === 'approved' && completingId === order.id && (
          <div className="space-y-1.5 rounded-lg border p-2 bg-muted/30">
            <Label className="text-[10px]">شماره پیگیری (از افغان۵)</Label>
            <Input value={trackingNo} onChange={e => setTrackingNo(e.target.value)} placeholder="شماره پیگیری..." dir="ltr" className="text-sm h-8" />
            <div className="flex gap-1">
              <Button size="sm" onClick={() => handleComplete(order)} disabled={processing || !trackingNo.trim()}>
                <Truck className="w-3 h-3" /> تأیید تحویل
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setCompletingId(null); setTrackingNo(''); }}>انصراف</Button>
            </div>
          </div>
        )}

        {order.status === 'approved' && completingId !== order.id && (
          <Button size="sm" onClick={() => setCompletingId(order.id)}>
            <Truck className="w-3 h-3" /> ثبت تحویل
          </Button>
        )}
      </div>
    );
  };

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-1.5"><Package className="w-4 h-4" /> سفارش‌های افغان۵</h3>
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="جستجو..." value={search} onChange={e => setSearch(e.target.value)} className="pr-9 text-sm" />
      </div>
      {filtered.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">سفارشی وجود ندارد.</p>
      ) : (
        <>
          {pending.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] text-amber-600 font-medium flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> {toFa(pending.length)} در انتظار</p>
              {pending.map(renderRow)}
            </div>
          )}
          {active.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] text-blue-600 font-medium">{toFa(active.length)} در حال خرید</p>
              {active.map(renderRow)}
            </div>
          )}
          {done.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] text-muted-foreground font-medium">تکمیل‌شده</p>
              {done.slice(0, 20).map(renderRow)}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function Afghan5Manager() {
  useEffect(() => { ensureAfghan5Service().catch(() => {}); }, []);

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">مدیریت افغان۵</h3>
            <p className="text-[10px] text-muted-foreground">نشانی حساب، بسته‌ها و سفارش‌ها</p>
          </div>
        </div>
        <Tabs defaultValue="settings">
          <TabsList className="w-full">
            <TabsTrigger value="settings" className="flex-1">نشانی حساب</TabsTrigger>
            <TabsTrigger value="packages" className="flex-1">بسته‌ها</TabsTrigger>
            <TabsTrigger value="orders" className="flex-1">سفارش‌ها</TabsTrigger>
          </TabsList>
          <TabsContent value="settings" className="mt-3"><SettingsTab /></TabsContent>
          <TabsContent value="packages" className="mt-3"><PackagesTab /></TabsContent>
          <TabsContent value="orders" className="mt-3"><OrdersTab /></TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}