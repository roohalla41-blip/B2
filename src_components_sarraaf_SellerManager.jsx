import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Store, CheckCircle, XCircle, Clock, AlertTriangle, TrendingUp, DollarSign } from 'lucide-react';
import {
  loadSellerProfiles, updateSellerStatus, createSellerProfile,
  loadAllOrders, loadPricingSettings, savePricingSettings, releaseOrder,
  DEFAULT_MARKUP,
} from '@/lib/sellerApi';

const STATUS_LABELS = {
  pending: 'در انتظار تأیید',
  approved: 'تأییدشده',
  suspended: 'غیرفعال',
};

const STATUS_COLORS = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  suspended: 'bg-red-100 text-red-700',
};

const ORDER_STATUS_LABELS = {
  pending: 'در انتظار فروشنده',
  assigned: 'تخصیص‌یافته',
  in_progress: 'در حال انجام',
  completed: 'انجام‌شده',
  failed: 'ناموفق',
  disputed: 'در بررسی',
};

const fmtNum = (n) => Number(n || 0).toLocaleString('fa-IR');

export default function SellerManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profiles, setProfiles] = useState([]);
  const [orders, setOrders] = useState([]);
  const [pricing, setPricing] = useState(DEFAULT_MARKUP);
  const [loading, setLoading] = useState(true);
  const [newSeller, setNewSeller] = useState({ user_id: '', user_name: '', phone: '' });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [p, o, s] = await Promise.all([
        loadSellerProfiles(),
        loadAllOrders(),
        loadPricingSettings(),
      ]);
      setProfiles(p || []);
      setOrders(o || []);
      setPricing(s || DEFAULT_MARKUP);
    } catch (err) {
      toast({ title: 'خطا', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleStatusChange = async (id, status) => {
    try {
      await updateSellerStatus(id, status);
      toast({ title: 'وضعیت به‌روزرسانی شد', description: STATUS_LABELS[status] });
      loadData();
    } catch (err) {
      toast({ title: 'خطا', description: err.message, variant: 'destructive' });
    }
  };

  const handleCreateSeller = async () => {
    if (!newSeller.user_id || !newSeller.user_name) {
      toast({ title: 'خطا', description: 'شناسه و نام کاربر الزامی است', variant: 'destructive' });
      return;
    }
    try {
      await createSellerProfile({ ...newSeller, status: 'pending', commission_rate: 50 });
      toast({ title: 'فروشنده اضافه شد' });
      setNewSeller({ user_id: '', user_name: '', phone: '' });
      loadData();
    } catch (err) {
      toast({ title: 'خطا', description: err.message, variant: 'destructive' });
    }
  };

  const handleReleaseOrder = async (orderId, reason) => {
    try {
      await releaseOrder(orderId, user?.id || '', user?.full_name || 'سازنده', reason || 'آزادسازی توسط سازنده');
      toast({ title: 'سفارش آزاد شد' });
      loadData();
    } catch (err) {
      toast({ title: 'خطا', description: err.message, variant: 'destructive' });
    }
  };

  const handleSavePricing = async () => {
    try {
      await savePricingSettings(pricing);
      toast({ title: 'تنظیمات قیمت‌گذاری ذخیره شد' });
    } catch (err) {
      toast({ title: 'خطا', description: err.message, variant: 'destructive' });
    }
  };

  const totalSales = profiles.reduce((s, p) => s + (p.total_sales || 0), 0);
  const totalOrders = profiles.reduce((s, p) => s + (p.total_orders || 0), 0);
  const pendingOrders = orders.filter(o => o.status === 'pending').length;
  const activeOrders = orders.filter(o => ['assigned', 'in_progress'].includes(o.status)).length;

  if (loading) {
    return <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Store className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold">مدیریت فروشندگان</h2>
        <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">آزمایشی</Badge>
        <Button variant="outline" size="sm" className="mr-auto text-xs h-7 gap-1" onClick={() => window.open('/seller', '_blank')}>
          <Store className="w-3.5 h-3.5" />پیش‌نمایش پنل فروشنده
        </Button>
      </div>

      {/* آمار */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-3 flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <div><p className="text-xs text-muted-foreground">فروشندگان</p><p className="font-bold text-sm">{fmtNum(profiles.length)}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-3 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-600" />
          <div><p className="text-xs text-muted-foreground">مجموع فروش</p><p className="font-bold text-sm">{fmtNum(totalSales)} افغانی</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-3 flex items-center gap-2">
          <Clock className="w-5 h-5 text-amber-600" />
          <div><p className="text-xs text-muted-foreground">سفارش‌های در انتظار</p><p className="font-bold text-sm">{fmtNum(pendingOrders)}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-3 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-blue-600" />
          <div><p className="text-xs text-muted-foreground">سفارش‌های فعال</p><p className="font-bold text-sm">{fmtNum(activeOrders)}</p></div>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="sellers">
        <TabsList className="flex overflow-x-auto scrollbar-thin w-full gap-0.5">
          <TabsTrigger value="sellers" className="flex items-center gap-1 text-xs shrink-0"><Users className="w-3.5 h-3.5" />فروشندگان</TabsTrigger>
          <TabsTrigger value="pricing" className="flex items-center gap-1 text-xs shrink-0"><DollarSign className="w-3.5 h-3.5" />قیمت‌گذاری</TabsTrigger>
          <TabsTrigger value="orders" className="flex items-center gap-1 text-xs shrink-0"><Clock className="w-3.5 h-3.5" />سفارش‌ها</TabsTrigger>
        </TabsList>

        {/* لیست فروشندگان */}
        <TabsContent value="sellers" className="space-y-3">
          {/* افزودن فروشنده جدید */}
          <Card><CardContent className="p-3 space-y-2">
            <h3 className="text-sm font-semibold">افزودن فروشنده جدید</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div><Label className="text-xs">شناسه کاربر</Label><Input value={newSeller.user_id} onChange={e => setNewSeller({ ...newSeller, user_id: e.target.value })} placeholder="مثلاً demo-seller-3" className="text-xs h-8" /></div>
              <div><Label className="text-xs">نام</Label><Input value={newSeller.user_name} onChange={e => setNewSeller({ ...newSeller, user_name: e.target.value })} placeholder="نام فروشنده" className="text-xs h-8" /></div>
              <div><Label className="text-xs">شماره تماس</Label><Input value={newSeller.phone} onChange={e => setNewSeller({ ...newSeller, phone: e.target.value })} placeholder="07xxxxxxxxx" className="text-xs h-8" /></div>
            </div>
            <Button size="sm" onClick={handleCreateSeller} className="text-xs h-8">افزودن</Button>
          </CardContent></Card>

          {/* جدول فروشندگان */}
          <Card><CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="text-right p-2 font-medium">نام</th>
                    <th className="text-right p-2 font-medium">شناسه</th>
                    <th className="text-right p-2 font-medium">تماس</th>
                    <th className="text-right p-2 font-medium">وضعیت</th>
                    <th className="text-right p-2 font-medium">سفارش‌ها</th>
                    <th className="text-right p-2 font-medium">فروش</th>
                    <th className="text-right p-2 font-medium">کمیسیون</th>
                    <th className="text-right p-2 font-medium">عملیات</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.length === 0 ? (
                    <tr><td colSpan={8} className="text-center p-4 text-muted-foreground">هیچ فروشنده‌ای ثبت نشده است</td></tr>
                  ) : profiles.map(p => (
                    <tr key={p.id} className="border-b border-border">
                      <td className="p-2 font-medium">{p.user_name}</td>
                      <td className="p-2 text-muted-foreground">{p.user_id}</td>
                      <td className="p-2">{p.phone || '-'}</td>
                      <td className="p-2"><span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${STATUS_COLORS[p.status]}`}>{STATUS_LABELS[p.status]}</span></td>
                      <td className="p-2">{fmtNum(p.total_orders)}</td>
                      <td className="p-2">{fmtNum(p.total_sales)}</td>
                      <td className="p-2">{fmtNum(p.total_commission)}</td>
                      <td className="p-2">
                        <div className="flex gap-1">
                          {p.status !== 'approved' && (
                            <Button size="sm" variant="outline" className="h-6 px-2 text-[10px] gap-0.5" onClick={() => handleStatusChange(p.id, 'approved')}>
                              <CheckCircle className="w-3 h-3" />تأیید
                            </Button>
                          )}
                          {p.status === 'approved' && (
                            <Button size="sm" variant="outline" className="h-6 px-2 text-[10px] gap-0.5 text-red-600" onClick={() => handleStatusChange(p.id, 'suspended')}>
                              <XCircle className="w-3 h-3" />تعلیق
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent></Card>
        </TabsContent>

        {/* تنظیمات قیمت‌گذاری */}
        <TabsContent value="pricing">
          <Card><CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold">تنظیمات قیمت‌گذاری و تقسیم سود</h3>
            </div>
            <p className="text-xs text-muted-foreground">قیمت پایه از API افغان۵ دریافت می‌شود (فعلاً آزمایشی). افزایش قیمت و تقسیم سود قابل تنظیم است.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">مبلغ افزایش قیمت (افغانی)</Label>
                <Input type="number" value={pricing.amount} onChange={e => setPricing({ ...pricing, amount: Number(e.target.value) })} className="h-8" />
              </div>
              <div>
                <Label className="text-xs">درصد افزایش قیمت</Label>
                <Input type="number" value={pricing.percent} onChange={e => setPricing({ ...pricing, percent: Number(e.target.value) })} className="h-8" />
              </div>
              <div>
                <Label className="text-xs">سهم سازنده (٪)</Label>
                <Input type="number" value={pricing.creator_share_percent} onChange={e => setPricing({ ...pricing, creator_share_percent: Number(e.target.value) })} className="h-8" />
              </div>
              <div>
                <Label className="text-xs">سهم فروشنده (٪)</Label>
                <Input type="number" value={pricing.seller_share_percent} onChange={e => setPricing({ ...pricing, seller_share_percent: Number(e.target.value) })} className="h-8" />
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
              <AlertTriangle className="w-4 h-4 inline ml-1" />
              نمونه: قیمت پایه ۲۳۰، افزایش ۱۰ افغانی → قیمت فروش ۲۴۰. سهم سازنده: ۵ افغانی، سهم فروشنده: ۵ افغانی (۵۰-۵۰).
            </div>
            <Button size="sm" onClick={handleSavePricing}>ذخیره تنظیمات</Button>
          </CardContent></Card>
        </TabsContent>

        {/* سفارش‌ها */}
        <TabsContent value="orders">
          <Card><CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="text-right p-2 font-medium">کد سفارش</th>
                    <th className="text-right p-2 font-medium">مشتری</th>
                    <th className="text-right p-2 font-medium">محصول</th>
                    <th className="text-right p-2 font-medium">شماره مقصد</th>
                    <th className="text-right p-2 font-medium">قیمت</th>
                    <th className="text-right p-2 font-medium">فروشنده</th>
                    <th className="text-right p-2 font-medium">وضعیت</th>
                    <th className="text-right p-2 font-medium">عملیات</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr><td colSpan={8} className="text-center p-4 text-muted-foreground">سفارشی ثبت نشده است</td></tr>
                  ) : orders.slice(0, 50).map(o => (
                    <tr key={o.id} className="border-b border-border">
                      <td className="p-2 font-mono text-[10px]">{o.order_code}</td>
                      <td className="p-2">{o.customer_name || o.customer_id}</td>
                      <td className="p-2">{o.product_name}</td>
                      <td className="p-2">{o.phone_number}</td>
                      <td className="p-2">{fmtNum(o.sale_price)}</td>
                      <td className="p-2">{o.seller_name || '-'}</td>
                      <td className="p-2"><span className="text-[10px]">{ORDER_STATUS_LABELS[o.status] || o.status}</span></td>
                      <td className="p-2">
                        {o.status === 'assigned' && (
                          <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]" onClick={() => handleReleaseOrder(o.id, prompt('دلیل آزادسازی؟') || '')}>
                            آزادسازی
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}