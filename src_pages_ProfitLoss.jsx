import React, { useMemo } from 'react';
import { useTransactions, useCurrencies, useRateSettings } from '@/lib/useSarraaf';
import { PageHeader, StatCard, LoadingState, EmptyState } from '@/components/sarraaf/Pieces';
import { computeProfitDetailed } from '@/lib/ledger';
import { formatNumber, formatDate, toPersianDigits } from '@/lib/sarraaf';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, Printer, FileSpreadsheet, Coins, Percent } from 'lucide-react';

const PRINT_STYLES = `
@media print {
  body * { visibility: hidden; }
  .profit-loss-report, .profit-loss-report * { visibility: visible; }
  .profit-loss-report { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; }
  .no-print { display: none !important; }
  table { width: 100% !important; border-collapse: collapse; }
  tr { page-break-inside: avoid; }
  thead { display: table-header-group; }
}
`;

const TYPE_LABELS = {
  buy: 'خرید ارز',
  sell: 'فروش ارز',
  transfer_send: 'حواله ارسال',
  transfer_receive: 'حواله دریافت',
  convert: 'تبدیل ارز',
  dadogereft: 'دریافت/پرداخت',
  internal_transfer: 'انتقال داخلی',
  manual: 'سند دستی',
  open_balance: 'افتتاح حساب',
};

function exportProfitExcel(data) {
  const { lineItems, byType, byCurrency, totalFee, totalRateDiff, total } = data;
  const rows = [];

  // Section 1: Summary
  rows.push(['گزارش سود و زیان', '']);
  rows.push(['تاریخ تولید', new Date().toLocaleDateString('fa-IR')]);
  rows.push(['', '']);
  rows.push(['خلاصه', 'مبلغ (افغانی)']);
  rows.push(['سود کارمزدها', Math.round(totalFee)]);
  rows.push(['سود اختلاف نرخ', Math.round(totalRateDiff)]);
  rows.push(['سود کل', Math.round(total)]);
  rows.push(['', '']);

  // Section 2: By type
  rows.push(['تفکیک بر اساس نوع تراکنش', '', '']);
  rows.push(['نوع', 'کارمزد', 'اختلاف نرخ', 'تعداد']);
  for (const [type, val] of Object.entries(byType)) {
    rows.push([TYPE_LABELS[type] || type, Math.round(val.fee), Math.round(val.rateDiff), val.count]);
  }
  rows.push(['', '']);

  // Section 3: By currency
  rows.push(['تفکیک بر اساس ارز', '', '']);
  rows.push(['ارز', 'کارمزد', 'اختلاف نرخ', 'تعداد']);
  for (const [cur, val] of Object.entries(byCurrency)) {
    rows.push([cur, Math.round(val.fee), Math.round(val.rateDiff), val.count]);
  }
  rows.push(['', '']);

  // Section 4: Line items
  rows.push(['تراکنش‌های دارای سود', '', '', '', '', '', '', '']);
  rows.push(['تاریخ', 'سند', 'نوع', 'مشتری', 'ارز', 'مبلغ', 'کارمزد (AFN)', 'سود کل (AFN)']);
  for (const item of lineItems) {
    rows.push([
      formatDate(item.date),
      item.document_no,
      TYPE_LABELS[item.type] || item.type,
      item.customer_name,
      item.currency,
      Math.round(item.amount),
      Math.round(item.feeAfn),
      Math.round(item.profit),
    ]);
  }

  const csv = '\uFEFF' + rows.map(r => r.map(c => `"${c ?? ''}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `profit-loss-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ProfitLoss() {
  const { data: txs, isLoading } = useTransactions();
  const { data: currencies } = useCurrencies();
  const { data: rateSettings } = useRateSettings();

  const report = useMemo(() => {
    if (!txs) return null;
    return computeProfitDetailed(txs, rateSettings || {}, currencies || []);
  }, [txs, rateSettings, currencies]);

  return (
    <>
      <style>{PRINT_STYLES}</style>
      <PageHeader title="سود و زیان" icon={TrendingUp}
        actions={
          report && (
            <div className="flex gap-1 no-print">
              <Button size="sm" variant="outline" onClick={() => exportProfitExcel(report)}>
                <FileSpreadsheet className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => window.print()}>
                <Printer className="w-4 h-4" />
              </Button>
            </div>
          )
        }
      />
      {isLoading ? <LoadingState /> : !report ? (
        <EmptyState icon={TrendingUp} title="داده‌ای موجود نیست" />
      ) : (
        <div className="space-y-4 profit-loss-report">
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatCard label="سود کل" value={formatNumber(report.total)} sub="AFN" icon={TrendingUp} gradient="from-success to-success/80" />
            <StatCard label="سود اختلاف نرخ" value={formatNumber(report.totalRateDiff)} sub="AFN" icon={Percent} gradient="from-primary to-primary/80" />
            <StatCard label="کارمزدها" value={formatNumber(report.totalFee)} sub="AFN" icon={Coins} gradient="from-chart-2 to-chart-2/80" />
          </div>

          {/* By type */}
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-3 text-primary">تفکیک بر اساس نوع تراکنش</h3>
              <div className="space-y-1">
                {Object.entries(report.byType).map(([type, val]) => (
                  <div key={type} className="flex items-center justify-between text-sm border-b border-border/50 pb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{TYPE_LABELS[type] || type}</span>
                      <span className="text-xs text-muted-foreground">({toPersianDigits(val.count)} تراکنش)</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">کارمزد: {formatNumber(val.fee)}</span>
                      <span className="text-xs text-muted-foreground">اختلاف: {formatNumber(val.rateDiff)}</span>
                      <span className="font-bold text-success">{formatNumber(val.fee + val.rateDiff)}</span>
                    </div>
                  </div>
                ))}
                {Object.keys(report.byType).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">تراکنش سودآوری یافت نشد</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* By currency */}
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-3 text-primary">تفکیک بر اساس ارز</h3>
              <div className="space-y-1">
                {Object.entries(report.byCurrency).map(([cur, val]) => (
                  <div key={cur} className="flex items-center justify-between text-sm border-b border-border/50 pb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{cur}</span>
                      <span className="text-xs text-muted-foreground">({toPersianDigits(val.count)} تراکنش)</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">کارمزد: {formatNumber(val.fee)}</span>
                      <span className="text-xs text-muted-foreground">اختلاف: {formatNumber(val.rateDiff)}</span>
                      <span className="font-bold text-success">{formatNumber(val.fee + val.rateDiff)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top profit transactions */}
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-3 text-primary">تراکنش‌های پرسود</h3>
              <div className="space-y-1">
                {report.lineItems.slice(0, 20).map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-sm border-b border-border/50 pb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-muted-foreground">{formatDate(item.date)}</span>
                      <span className="font-medium truncate">{TYPE_LABELS[item.type] || item.type}</span>
                      {item.customer_name && <span className="text-xs text-muted-foreground truncate">— {item.customer_name}</span>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground">{item.currency} {formatNumber(item.amount)}</span>
                      <span className="font-bold text-success">{formatNumber(item.profit)} AFN</span>
                    </div>
                  </div>
                ))}
                {report.lineItems.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">تراکنش سودآوری یافت نشد</p>
                )}
              </div>
              {report.lineItems.length > 20 && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                  نمایش ۲۰ تراکنش اول از {toPersianDigits(report.lineItems.length)} تراکنش — برای لیست کامل خروجی Excel بگیرید
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}