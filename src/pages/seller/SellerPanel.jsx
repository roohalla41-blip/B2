import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Store, Clock, CheckCircle, XCircle, Loader2, Wallet } from 'lucide-react';
import { loadAvailableOrders, loadSellerOrders, acceptOrder, updateOrderStatus, checkSellerAccess } from '@/lib/sellerApi';

const ORDER_STATUS_LABELS = {
  pending: 'در انتظار',
  assigned: 'تخصیص‌یافته',
  in_progress: 'در حال انجام',
  completed: 'انجام‌شده',
  failed: 'ناموفق',
  disputed: 'در بررسی',
};

const fmtNum = (n) => Number(n || 0).toLocaleString('fa-IR');

export default function SellerPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [access, setAccess] = useState(null);
  const [availableOrders, setAvailableOrders] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(null);
  const [trackingRefs, setTrackingRefs] = useState({});

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const acc = await checkSellerAccess(user.id);
      setAccess(acc);
      if (acc.isSeller) {
        const [avail, mine] = await Promise.all([
          loadAvailableOrders(),
          loadSellerOrders(user.id),
        ]);
        setAvailableOrders(avail || []);
        setMyOrders(mine || []);
      }
    } catch (err) {
      toast({ title: 'خطا', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleAccept = async (orderId) => {
    setAccepting(orderId);
    try {
      const result = await acceptOrder(orderId, user.id, user.full_name || user.name || 'فروشنده');
      if (result.success) {
        toast({ title: 'سفارش قبول شد', description: 'سفارش به شما تخصیص یافت' });
        loadData();
      } else {
        toast({ title: 'قبول ناموفق', description: result.error === 'order_already_taken' ? 'این سفارش توسط فروشنده دیگری قبول شده است' : result.error, variant: 'destructive' });
        loadData();
      }
    } catch (err) {
      toast({ title: 'خطا', description: err.message, variant: 'destructive' });
    } finally {
      setAccepting(null);
    }
  };

  const handleStatusUpdate = async (orderId, newStatus, extra = {}) => {
    try {
      const result = await updateOrderStatus(orderId, newStatus, user.id, user.full_name || 'فروشنده', extra);
      if (result.success) {
        toast({ title: 'وضعیت به‌روزرسانی شد', description: ORDER_STATUS_LABELS[newStatus] });
        loadData();
      } else {
        toast({ title: 'خطا', description: result.error, variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'خطا', description: err.message, variant: 'destructive' });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!access?.isSeller) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center" dir="rtl">
        <Store className="w-12 h-12 text-muted-foreground mb-3" />
        <h2 className="text-lg font-bold mb-1">دسترسی فروشنده ندارید</h2>
        <p className="text-sm text-muted-foreground mb-4">
          {access?.profile ? 'پروفایل فروشنده شما هنوز تأیید نشده است.' : 'برای دسترسی به پنل فروشنده، باید توسط سازنده تأیید شوید.'}
        </p>
        <Button variant="outline" size="sm" onClick={() => navigate('/customer')}>بازگشت</Button>
      </div>
    );
  }

  const myActiveOrders = myOrders.filter(o => ['assigned', 'in_progress'].includes(o.status));
  const myCompletedOrders = myOrders.filter(o => o.status === 'completed');
  const totalCommission = myOrders.reduce((s, o) => s + (o.seller_share || 0), 0);

  return (
    <div className="space-y-4 p-4 max-w-4xl mx-auto" dir="rtl">
      <div className="flex items-center gap-2">
        <Store className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-lg font-bold">پنل فروشنده</h1>
          <p className="text-xs text-muted-foreground">{user?.full_name || user?.name}</p>
        </div>
        <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 mr-auto">آزمایشی</Badge>
      </div>

      {/* آمار */}
      <div className="grid grid-cols-3 gap-2">
        <Card><CardContent className="p-2 text-center">
          <Clock className="w-4 h-4 text-amber-600 mx-auto mb-1" />
          <p className="text-[10px] text-muted-foreground">سفارش‌های فعال</p>
          <p className="font-bold text-sm">{fmtNum(myActiveOrders.length)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-2 text-center">
          <CheckCircle className="w-4 h-4 text-green-600 mx-auto mb-1" />
          <p className="text-[10px] text-muted-foreground">انجام‌شده</p>
          <p className="font-bold text-sm">{fmtNum(myCompletedOrders.length)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-2 text-center">
          <Wallet className="w-4 h-4 text-blue-600 mx-auto mb-1" />
          <p className="text-[10px] text-muted-foreground">کمیسیون کل</p>
          <p className="font-bold text-sm">{fmtNum(totalCommission)}</p>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="available">
        <TabsList className="flex w-full">
          <TabsTrigger value="available" className="flex-1 text-xs">سفارش‌های جدید ({availableOrders.length})</TabsTrigger>
          <TabsTrigger value="mine" className="flex-1 text-xs">سفارش‌های من ({myOrders.length})</TabsTrigger>
        </TabsList>

        {/* سفارش‌های قابل قبول */}
        <TabsContent value="available" className="space-y-2">
          {availableOrders.length === 0 ? (
            <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">
              <Clock className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
              سفارش جدیدی برای قبول وجود ندارد
            </CardContent></Card>
          ) : availableOrders.map(o => (
            <Card key={o.id} className="overflow-hidden">
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-[10px] text-muted-foreground">{o.order_code}</span>
                    </div>
                    <p className="font-bold text-sm">{o.product_name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">شماره مقصد: {o.phone_number}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm font-bold text-primary">{fmtNum(o.sale_price)} {o.currency}</span>
                      <span className="text-[10px] text-muted-foreground">(کمیسیون: {fmtNum(o.seller_share)})</span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleAccept(o.id)}
                    disabled={accepting === o.id}
                    className="shrink-0"
                  >
                    {accepting === o.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'قبول سفارش'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* سفارش‌های من */}
        <TabsContent value="mine" className="space-y-2">
          {myOrders.length === 0 ? (
            <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">
              <Store className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
              هنوز سفارشی قبول نکرده‌اید
            </CardContent></Card>
          ) : myOrders.map(o => (
            <Card key={o.id}>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-muted-foreground">{o.order_code}</span>
                  <Badge variant="outline" className="text-[10px]">{ORDER_STATUS_LABELS[o.status]}</Badge>
                </div>
                <p className="font-bold text-sm">{o.product_name}</p>
                <p className="text-xs text-muted-foreground">شماره مقصد: {o.phone_number}</p>
                <div className="flex items-center justify-between text-xs">
                  <span>قیمت: <b>{fmtNum(o.sale_price)} {o.currency}</b></span>
                  <span className="text-green-600">کمیسیون: {fmtNum(o.seller_share)}</span>
                </div>

                {o.status === 'assigned' && (
                  <Button size="sm" className="w-full text-xs" onClick={() => handleStatusUpdate(o.id, 'in_progress')}>
                    شروع انجام
                  </Button>
                )}
                {o.status === 'in_progress' && (
                  <div className="space-y-2">
                    <div>
                      <Label className="text-[10px]">شماره پیگیری / مرجع (اختیاری)</Label>
                      <Input
                        value={trackingRefs[o.id] || ''}
                        onChange={e => setTrackingRefs({ ...trackingRefs, [o.id]: e.target.value })}
                        placeholder="مرجع تراکنش"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1 text-xs bg-green-600 hover:bg-green-700" onClick={() => handleStatusUpdate(o.id, 'completed', { tracking_ref: trackingRefs[o.id] })}>
                        <CheckCircle className="w-3 h-3 ml-1" />انجام شد
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1 text-xs text-red-600" onClick={() => handleStatusUpdate(o.id, 'failed', { failure_reason: 'ناموفق' })}>
                        <XCircle className="w-3 h-3 ml-1" />ناموفق
                      </Button>
                    </div>
                  </div>
                )}
                {o.status === 'completed' && o.tracking_ref && (
                  <p className="text-[10px] text-muted-foreground">مرجع: {o.tracking_ref}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}