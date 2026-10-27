import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { Calendar, X, ChevronLeft, ArrowDownUp, Wallet, Package, Database } from 'lucide-react';

const STATUS_LABELS = {
  completed: { label: 'تکمیل شده', color: 'bg-success/15 text-success' },
  pending: { label: 'در انتظار', color: 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400' },
  processing: { label: 'در حال انجام', color: 'bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400' },
  rejected: { label: 'رد شده', color: 'bg-destructive/15 text-destructive' },
  cancelled: { label: 'لغو شده', color: 'bg-muted text-muted-foreground' },
};

const TYPE_ICONS = {
  receive: '↓', pay: '↑', transfer: '⇄', buy_currency: '₿', sell_currency: '₿',
  convert: '⇄', topup: '+', withdraw: '-', adjustment: '↻', fee: '%', other: '•',
};

const CURRENCY_FILTERS = [
  { value: 'all', label: 'همه ارزها' },
  { value: 'AFN', label: 'AFN' },
  { value: 'USD', label: 'USD' },
  { value: 'IRT', label: 'تومان' },
  { value: 'USDT', label: 'USDT' },
];

const TYPE_FILTERS = [
  { value: 'all', label: 'همه نوع‌ها' },
  { value: 'receive', label: 'دریافت' },
  { value: 'pay', label: 'پرداخت' },
  { value: 'transfer', label: 'انتقال' },
  { value: 'buy_currency', label: 'خرید ارز' },
  { value: 'sell_currency', label: 'فروش ارز' },
  { value: 'convert', label: 'تبدیل ارز' },
  { value: 'topup', label: 'شارژ کیف پول' },
  { value: 'withdraw', label: 'برداشت' },
  { value: 'adjustment', label: 'اصلاح حساب' },
  { value: 'fee', label: 'کارمزد' },
  { value: 'other', label: 'سایر' },
];

const STATUS_FILTERS = [
  { value: 'all', label: 'همه وضعیت‌ها' },
  { value: 'completed', label: 'تکمیل شده' },
  { value: 'pending', label: 'در انتظار' },
  { value: 'processing', label: 'در حال انجام' },
  { value: 'rejected', label: 'رد شده' },
  { value: 'cancelled', label: 'لغو شده' },
];

const DIRECTION_FILTERS = [
  { value: 'all', label: 'دریافت و پرداخت' },
  { value: 'in', label: 'دریافت' },
  { value: 'out', label: 'پرداخت' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'جدیدترین' },
  { value: 'oldest', label: 'قدیمی‌ترین' },
  { value: 'highest', label: 'بیشترین مبلغ' },
  { value: 'lowest', label: 'کمترین مبلغ' },
];

export default function TransactionHistory({ transactions }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [directionFilter, setDirectionFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [sortBy, setSortBy] = useState('newest');
  const [selectedTxn, setSelectedTxn] = useState(null);

  const filtered = useMemo(() => {
    const result = transactions.filter((t) => {
      if (currencyFilter !== 'all' && t.currency !== currencyFilter) return false;
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (directionFilter !== 'all' && t.direction !== directionFilter) return false;
      if (dateFrom) {
        const d = new Date(t.date);
        const from = new Date(dateFrom);
        from.setHours(0, 0, 0, 0);
        if (d < from) return false;
      }
      if (dateTo) {
        const d = new Date(t.date);
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        if (d > to) return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const haystack = `${t.id || ''} ${t.doc_no || ''} ${t.description || ''} ${t.type_label || ''} ${t.sender_name || ''} ${t.receiver_name || ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    return result.sort((a, b) => {
      switch (sortBy) {
        case 'oldest': return new Date(a.date) - new Date(b.date);
        case 'highest': return (b.amount || 0) - (a.amount || 0);
        case 'lowest': return (a.amount || 0) - (b.amount || 0);
        default: return new Date(b.date) - new Date(a.date);
      }
    });
  }, [transactions, currencyFilter, typeFilter, statusFilter, directionFilter, search, dateFrom, dateTo, sortBy]);

  const hasActiveFilters = search || currencyFilter !== 'all' || typeFilter !== 'all' || statusFilter !== 'all' || directionFilter !== 'all' || dateFrom || dateTo;

  const clearAllFilters = () => {
    setSearch('');
    setCurrencyFilter('all');
    setTypeFilter('all');
    setStatusFilter('all');
    setDirectionFilter('all');
    setDateFrom('');
    setDateTo('');
    setShowDateFilter(false);
  };

  // Financial summary from filtered transactions
  const summary = useMemo(() => {
    let totalIn = 0, totalOut = 0, totalTransfer = 0;
    filtered.forEach((t) => {
      if (t.type === 'transfer') {
        totalTransfer += (t.amount || 0);
      }
      if (t.direction === 'in') {
        totalIn += (t.amount || 0);
      } else {
        totalOut += (t.amount || 0);
      }
    });
    return { totalIn, totalOut, totalTransfer, count: filtered.length };
  }, [filtered]);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-foreground">گردش حساب</h2>
        <span className="text-[10px] text-muted-foreground">{summary.count} تراکنش</span>
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-2 gap-2">
        <Card className="shadow-sm">
          <CardContent className="p-2.5">
            <p className="text-[9px] text-muted-foreground">مجموع دریافت</p>
            <p className="text-sm font-bold text-success">{summary.totalIn.toLocaleString('fa-IR')}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-2.5">
            <p className="text-[9px] text-muted-foreground">مجموع پرداخت</p>
            <p className="text-sm font-bold text-destructive">{summary.totalOut.toLocaleString('fa-IR')}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-2.5">
            <p className="text-[9px] text-muted-foreground">مجموع انتقال</p>
            <p className="text-sm font-bold text-primary">{summary.totalTransfer.toLocaleString('fa-IR')}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-2.5">
            <p className="text-[9px] text-muted-foreground">تعداد تراکنش‌ها</p>
            <p className="text-sm font-bold text-foreground">{summary.count.toLocaleString('fa-IR')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Mock Mode Banner */}
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground bg-muted/50 rounded-lg p-2">
        <Database className="w-3 h-3 shrink-0" />
        حالت آزمایشی — Supabase متصل نیست
      </div>

      {/* Search */}
      <Input
        placeholder="جستجو: شماره تراکنش، شماره سند، نوع، شرح، فرستنده، گیرنده..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="text-xs"
      />

      {/* Sort */}
      <div className="flex items-center gap-1.5">
        <ArrowDownUp className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <div className="flex gap-1.5 overflow-x-auto scrollbar-thin pb-1">
          {SORT_OPTIONS.map((s) => (
            <button
              key={s.value}
              onClick={() => setSortBy(s.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap border transition-all ${
                sortBy === s.value ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
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
          {DIRECTION_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setDirectionFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap border transition-all ${
                directionFilter === f.value ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {hasActiveFilters && (
        <button onClick={clearAllFilters} className="text-[10px] text-destructive flex items-center gap-1">
          <X className="w-3 h-3" />
          پاک کردن فیلترها
        </button>
      )}

      {/* Transaction List */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center space-y-3">
            {transactions.length === 0 ? (
              <>
                <p className="text-sm text-muted-foreground">هنوز تراکنشی برای نمایش وجود ندارد.</p>
                <Button variant="outline" size="sm" onClick={() => navigate('/customer')}>
                  بازگشت به صفحه اصلی
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">نتیجه‌ای برای جستجوی شما پیدا نشد.</p>
                <Button variant="outline" size="sm" onClick={clearAllFilters}>
                  <X className="w-3.5 h-3.5 ml-1" />
                  پاک کردن جستجو
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((t) => {
            const st = STATUS_LABELS[t.status] || STATUS_LABELS.completed;
            const date = new Date(t.date);
            const icon = TYPE_ICONS[t.type] || '•';
            const isPositive = t.direction === 'in';
            return (
              <Card key={t.id} className="shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedTxn(t)}>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-sm font-bold ${isPositive ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                    {icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-medium text-foreground truncate">{t.type_label}</p>
                      <span className={`text-[8px] px-1.5 py-0.5 rounded ${st.color}`}>{st.label}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {t.id} • {t.doc_no} • {date.toLocaleDateString('fa-IR')} • {date.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="text-left shrink-0">
                    <p className={`text-sm font-bold ${isPositive ? 'text-success' : 'text-destructive'}`}>
                      {isPositive ? '+' : '-'}{(t.amount || 0).toLocaleString('fa-IR')}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{t.currency}</p>
                  </div>
                  <ChevronLeft className="w-4 h-4 text-muted-foreground shrink-0" />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detail Sheet */}
      <Sheet open={!!selectedTxn} onOpenChange={(open) => !open && setSelectedTxn(null)}>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>جزئیات تراکنش</SheetTitle>
            <SheetDescription>{selectedTxn?.type_label || ''}</SheetDescription>
          </SheetHeader>
          {selectedTxn && (
            <div className="space-y-3 mt-4">
              <Card className="shadow-sm">
                <CardContent className="p-4 text-center">
                  <p className="text-[10px] text-muted-foreground">مبلغ عملیات</p>
                  <p className="text-2xl font-bold text-foreground">{(selectedTxn.amount || 0).toLocaleString('fa-IR')}</p>
                  <p className="text-[10px] text-muted-foreground">{selectedTxn.currency}</p>
                  <span className={`inline-block mt-2 text-[9px] px-2 py-1 rounded ${(STATUS_LABELS[selectedTxn.status] || STATUS_LABELS.completed).color}`}>
                    {(STATUS_LABELS[selectedTxn.status] || STATUS_LABELS.completed).label}
                  </span>
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardContent className="p-3 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">شماره تراکنش:</span>
                    <span className="font-mono text-primary font-bold text-[10px]">{selectedTxn.id}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">شماره سند:</span>
                    <span className="font-mono text-foreground text-[10px]">{selectedTxn.doc_no}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">تاریخ:</span>
                    <span className="text-foreground text-[10px]">{new Date(selectedTxn.date).toLocaleDateString('fa-IR')}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">ساعت:</span>
                    <span className="text-foreground">{new Date(selectedTxn.date).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">نوع عملیات:</span>
                    <span className="text-foreground">{selectedTxn.type_label}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">ارز:</span>
                    <span className="text-foreground">{selectedTxn.currency}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">مبلغ:</span>
                    <span className="text-foreground">{(selectedTxn.amount || 0).toLocaleString('fa-IR')}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">مانده قبل:</span>
                    <span className="text-foreground">{(selectedTxn.balance_before || 0).toLocaleString('fa-IR')}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">مانده بعد:</span>
                    <span className="text-foreground">{(selectedTxn.balance_after || 0).toLocaleString('fa-IR')}</span>
                  </div>
                  {selectedTxn.sender_name && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">فرستنده:</span>
                      <span className="text-foreground">{selectedTxn.sender_name}</span>
                    </div>
                  )}
                  {selectedTxn.receiver_name && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">گیرنده:</span>
                      <span className="text-foreground">{selectedTxn.receiver_name}</span>
                    </div>
                  )}
                  {selectedTxn.description && (
                    <div className="pt-2 border-t border-border">
                      <p className="text-[10px] text-muted-foreground mb-1">توضیحات:</p>
                      <p className="text-xs text-foreground">{selectedTxn.description}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Related Links */}
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="flex-col h-auto py-2.5 gap-1" onClick={() => navigate('/customer/wallet')}>
                  <Wallet className="w-4 h-4" />
                  <span className="text-[10px]">کیف پول</span>
                </Button>
                {selectedTxn.order_id ? (
                  <Button variant="outline" className="flex-col h-auto py-2.5 gap-1" onClick={() => navigate('/customer/orders')}>
                    <Package className="w-4 h-4" />
                    <span className="text-[10px]">سفارش {selectedTxn.order_id}</span>
                  </Button>
                ) : (
                  <Button variant="outline" className="flex-col h-auto py-2.5 gap-1" onClick={() => navigate('/customer/account')}>
                    <Package className="w-4 h-4" />
                    <span className="text-[10px]">حساب صرافی</span>
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground bg-muted/50 rounded-lg p-2">
                <Database className="w-3 h-3 shrink-0" />
                حالت آزمایشی — Supabase متصل نیست
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}