import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { loadOrdersProfile, loadOrders } from '@/lib/ordersMockData';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Package, Wallet, Landmark, MessageSquare, ArrowRight,
  RefreshCw, Search, X, Calendar, ChevronLeft,
} from 'lucide-react';
import OrderDetail from '@/components/customer/orders/OrderDetail';

const STATUS_LABELS = {
  pending: { label: 'در انتظار', color: 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400' },
  approved: { label: 'تأیید شده', color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/30 dark:text-cyan-400' },
  completed: { label: 'تکمیل شده', color: 'bg-success/15 text-success' },
  rejected: { label: 'رد شده', color: 'bg-destructive/15 text-destructive' },
  cancelled: { label: 'لغو شده', color: 'bg-muted text-muted-foreground' },
};

const STATUS_FILTERS = [
  { value: 'all', label: 'همه وضعیت‌ها' },
  { value: 'pending', label: 'در انتظار' },
  { value: 'approved', label: 'تأیید شده' },
  { value: 'completed', label: 'تکمیل شده' },
  { value: 'rejected', label: 'رد شده' },
  { value: 'cancelled', label: 'لغو شده' },
];

const TYPE_FILTERS = [
  { value: 'all', label: 'همه نوع‌ها' },
  { value: 'mobile_recharge', label: 'شارژ موبایل' },
  { value: 'internet_package', label: 'بسته اینترنت' },
  { value: 'game_service', label: 'خدمات بازی' },
  { value: 'transfer', label: 'انتقال وجه' },
  { value: 'currency_buy', label: 'خرید ارز' },
  { value: 'currency_convert', label: 'تبدیل ارز' },
];

const CURRENCY_FILTERS = [
  { value: 'all', label: 'همه ارزها' },
  { value: 'AFN', label: 'AFN' },
  { value: 'USD', label: 'USD' },
  { value: 'IRT', label: 'تومان' },
  { value: 'USDT', label: 'USDT' },
];

export default function CustomerOrders() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [currencyFilter, setCurrencyFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [prof, ords] = await Promise.all([loadOrdersProfile(user), loadOrders(user?.id)]);
      setProfile(prof);
      setOrders(ords);
    } catch (e) {
      setError(true);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      if (typeFilter !== 'all' && o.service_type !== typeFilter) return false;
      if (currencyFilter !== 'all' && o.currency !== currencyFilter) return false;
      if (dateFrom) {
        const d = new Date(o.created_date);
        const from = new Date(dateFrom);
        from.setHours(0, 0, 0, 0);
        if (d < from) return false;
      }
      if (dateTo) {
        const d = new Date(o.created_date);
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        if (d > to) return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const haystack = `${o.id || ''} ${o.tracking_number || ''} ${o.title || ''} ${o.service_type_label || ''} ${o.description || ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [orders, statusFilter, typeFilter, currencyFilter, search, dateFrom, dateTo]);

  const hasActiveFilters = search || statusFilter !== 'all' || typeFilter !== 'all' || currencyFilter !== 'all' || dateFrom || dateTo;

  const clearAllFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setTypeFilter('all');
    setCurrencyFilter('all');
    setDateFrom('');
    setDateTo('');
    setShowDateFilter(false);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-8 w-full rounded-lg" />
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-bold text-foreground">سفارش‌های من</h1>
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Package className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-foreground">سفارش‌های من</h1>
            <p className="text-xs text-muted-foreground">پیگیری سفارش‌های ثبت‌شده برای شما</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => navigate('/customer')}>
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Customer Info */}
      <Card className="shadow-sm">
        <CardContent className="p-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] text-muted-foreground">نام مشتری</p>
              <p className="text-xs font-medium text-foreground">{profile?.customer_name || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">کد مشتری</p>
              <p className="text-xs font-mono text-foreground">{profile?.customer_code || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">نام صرافی</p>
              <p className="text-xs font-medium text-foreground">{profile?.exchange_name || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">تعداد سفارش‌ها</p>
              <p className="text-xs font-bold text-primary">{orders.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="جستجو: شماره سفارش، پیگیری، عنوان..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="text-xs pr-9"
        />
      </div>

      {/* Date Filter Toggle */}
      <button
        onClick={() => setShowDateFilter(!showDateFilter)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
          showDateFilter || dateFrom || dateTo ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground'
        }`}
      >
        <Calendar className="w-3.5 h-3.5" />
        بازه زمانی
      </button>
      {showDateFilter && (
        <div className="flex items-center gap-2">
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="text-xs" />
          <span className="text-[10px] text-muted-foreground">تا</span>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="text-xs" />
        </div>
      )}

      {/* Filter Chips */}
      <div className="space-y-2">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-thin pb-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap border transition-all ${
                statusFilter === f.value ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-thin pb-1">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setTypeFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap border transition-all ${
                typeFilter === f.value ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-thin pb-1">
          {CURRENCY_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setCurrencyFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap border transition-all ${
                currencyFilter === f.value ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <button onClick={clearAllFilters} className="text-[10px] text-destructive flex items-center gap-1">
          <X className="w-3 h-3" />
          پاک کردن فیلترها
        </button>
      )}

      {/* Orders List */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            {orders.length === 0
              ? 'هنوز سفارشی برای شما ثبت نشده است.'
              : 'سفارشی با این فیلترها یافت نشد'}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((order) => {
            const st = STATUS_LABELS[order.status] || STATUS_LABELS.new;
            const date = new Date(order.created_date);
            return (
              <Card key={order.id} className="shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedOrder(order)}>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Package className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-medium text-foreground truncate">{order.title}</p>
                      <span className={`text-[8px] px-1.5 py-0.5 rounded ${st.color}`}>{st.label}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {order.id} • {order.service_type_label} • {date.toLocaleDateString('fa-IR')}
                    </p>
                  </div>
                  <div className="text-left shrink-0">
                    <p className="text-sm font-bold text-foreground">{(order.amount || 0).toLocaleString('fa-IR')}</p>
                    <p className="text-[10px] text-muted-foreground">{order.currency}</p>
                  </div>
                  <ChevronLeft className="w-4 h-4 text-muted-foreground shrink-0" />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Quick Links */}
      <div className="grid grid-cols-3 gap-2">
        <Button variant="outline" className="flex-col h-auto py-3 gap-1" onClick={() => navigate('/customer/wallet')}>
          <Wallet className="w-4 h-4" />
          <span className="text-[10px]">کیف پول</span>
        </Button>
        <Button variant="outline" className="flex-col h-auto py-3 gap-1" onClick={() => navigate('/customer/account')}>
          <Landmark className="w-4 h-4" />
          <span className="text-[10px]">حساب من</span>
        </Button>
        <Button variant="outline" className="flex-col h-auto py-3 gap-1" onClick={() => navigate('/customer/messages')}>
          <MessageSquare className="w-4 h-4" />
          <span className="text-[10px]">پیام‌ها</span>
        </Button>
      </div>

      {/* Order Detail Sheet */}
      <OrderDetail
        open={!!selectedOrder}
        onOpenChange={(open) => !open && setSelectedOrder(null)}
        order={selectedOrder}
      />
    </div>
  );
}