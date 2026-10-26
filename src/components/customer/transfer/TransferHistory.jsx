import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { ChevronLeft, Calendar } from 'lucide-react';

const STATUS_LABELS = {
  new: { label: 'جدید', color: 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400' },
  pending: { label: 'در انتظار بررسی', color: 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400' },
  approved: { label: 'تأیید شده', color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/30 dark:text-cyan-400' },
  processing: { label: 'در حال انجام', color: 'bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400' },
  completed: { label: 'تکمیل شده', color: 'bg-success/15 text-success' },
  rejected: { label: 'رد شده', color: 'bg-destructive/15 text-destructive' },
  cancelled: { label: 'لغو شده', color: 'bg-muted text-muted-foreground' },
};

const CURRENCY_FILTERS = [
  { value: 'all', label: 'همه ارزها' },
  { value: 'AFN', label: 'AFN' },
  { value: 'USD', label: 'USD' },
  { value: 'IRT', label: 'تومان' },
  { value: 'USDT', label: 'USDT' },
];

const STATUS_FILTERS = [
  { value: 'all', label: 'همه وضعیت‌ها' },
  { value: 'new', label: 'جدید' },
  { value: 'pending', label: 'در انتظار بررسی' },
  { value: 'approved', label: 'تأیید شده' },
  { value: 'processing', label: 'در حال انجام' },
  { value: 'completed', label: 'تکمیل شده' },
  { value: 'rejected', label: 'رد شده' },
  { value: 'cancelled', label: 'لغو شده' },
];

export default function TransferHistory({ transfers }) {
  const [search, setSearch] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [selectedTxn, setSelectedTxn] = useState(null);

  const filtered = useMemo(() => {
    return transfers.filter((t) => {
      if (currencyFilter !== 'all' && t.currency !== currencyFilter) return false;
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (dateFrom) {
        const d = new Date(t.created_date);
        const from = new Date(dateFrom);
        from.setHours(0, 0, 0, 0);
        if (d < from) return false;
      }
      if (dateTo) {
        const d = new Date(t.created_date);
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        if (d > to) return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const haystack = `${t.tracking_number || ''} ${t.receiver_name || ''} ${t.sender_name || ''} ${t.description || ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [transfers, currencyFilter, statusFilter, search, dateFrom, dateTo]);

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-bold text-foreground">تاریخچه انتقال‌ها</h2>

      <Input
        placeholder="جستجو: شماره پیگیری، گیرنده، فرستنده..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="text-xs"
      />

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
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            {transfers.length === 0 ? 'هنوز انتقالی برای نمایش وجود ندارد.' : 'نتیجه‌ای یافت نشد'}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((t) => {
            const st = STATUS_LABELS[t.status] || STATUS_LABELS.new;
            const date = new Date(t.created_date);
            return (
              <Card key={t.id} className="shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedTxn(t)}>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${st.color}`}>
                    <ChevronLeft className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-medium text-foreground truncate">{t.receiver_name}</p>
                      <span className={`text-[8px] px-1.5 py-0.5 rounded ${st.color}`}>{st.label}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {t.tracking_number} • {date.toLocaleDateString('fa-IR')} • {date.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="text-left shrink-0">
                    <p className="text-sm font-bold text-foreground">{(t.amount || 0).toLocaleString('fa-IR')}</p>
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
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>جزئیات انتقال</SheetTitle>
            <SheetDescription>{selectedTxn?.receiver_name || ''}</SheetDescription>
          </SheetHeader>
          {selectedTxn && (
            <div className="space-y-3 mt-4">
              <Card className="shadow-sm">
                <CardContent className="p-4 text-center">
                  <p className="text-[10px] text-muted-foreground">مبلغ انتقال</p>
                  <p className="text-2xl font-bold text-foreground">{(selectedTxn.amount || 0).toLocaleString('fa-IR')}</p>
                  <p className="text-[10px] text-muted-foreground">{selectedTxn.currency}</p>
                  <span className={`inline-block mt-2 text-[9px] px-2 py-1 rounded ${(STATUS_LABELS[selectedTxn.status] || STATUS_LABELS.new).color}`}>
                    {(STATUS_LABELS[selectedTxn.status] || STATUS_LABELS.new).label}
                  </span>
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardContent className="p-3 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">شماره پیگیری:</span>
                    <span className="font-mono text-primary font-bold text-[10px]">{selectedTxn.tracking_number}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">فرستنده:</span>
                    <span className="text-foreground">{selectedTxn.sender_name}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">گیرنده:</span>
                    <span className="text-foreground">{selectedTxn.receiver_name}</span>
                  </div>
                  {selectedTxn.receiver_phone && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">موبایل گیرنده:</span>
                      <span className="text-foreground" dir="ltr">{selectedTxn.receiver_phone}</span>
                    </div>
                  )}
                  {selectedTxn.destination_country && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">کشور مقصد:</span>
                      <span className="text-foreground">{selectedTxn.destination_country}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">ارز:</span>
                    <span className="text-foreground">{selectedTxn.currency}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">مبلغ:</span>
                    <span className="text-foreground">{(selectedTxn.amount || 0).toLocaleString('fa-IR')}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">کارمزد:</span>
                    <span className="text-foreground">{(selectedTxn.fee || 0).toLocaleString('fa-IR')}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">مبلغ نهایی:</span>
                    <span className="text-foreground">{(selectedTxn.total_amount || 0).toLocaleString('fa-IR')}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">تاریخ:</span>
                    <span className="text-foreground text-[10px]">{new Date(selectedTxn.created_date).toLocaleDateString('fa-IR')}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">ساعت:</span>
                    <span className="text-foreground">{new Date(selectedTxn.created_date).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  {selectedTxn.description && (
                    <div className="pt-2 border-t border-border">
                      <p className="text-[10px] text-muted-foreground mb-1">توضیحات:</p>
                      <p className="text-xs text-foreground">{selectedTxn.description}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}