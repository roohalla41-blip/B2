import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, ArrowDownLeft, FileText, ChevronLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { formatNumber } from '@/lib/sarraaf';

export default function TodayTxSummaryV2({ txs, isLoading }) {
  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayTxs = (txs || []).filter(t => (t.date || t.created_date || '').split('T')[0] === today);
    const sent = {};
    const received = {};
    for (const t of todayTxs) {
      const amt = Number(t.amount) || 0;
      const map = t.type === 'transfer_send' ? sent : t.type === 'transfer_receive' ? received : null;
      if (map) {
        const cur = t.currency || 'AFN';
        map[cur] = (map[cur] || 0) + amt;
      }
    }
    const top = (map) => Object.entries(map).filter(([, v]) => v !== 0).sort((a, b) => b[1] - a[1])[0] || null;
    return { count: todayTxs.length, sent: top(sent), received: top(received) };
  }, [txs]);

  if (isLoading) {
    return (
      <Card className="overflow-hidden border-0 shadow-card">
        <CardContent className="p-3 bg-muted/30 animate-pulse h-20" />
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-0 shadow-card">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm">
            <FileText className="w-4 h-4 text-white" strokeWidth={2.2} />
          </div>
          <h3 className="text-xs font-bold text-foreground">تراکنش‌های امروز</h3>
          <span className="mr-auto text-[10px] text-muted-foreground font-medium bg-muted px-1.5 py-0.5 rounded">{formatNumber(stats.count)} تراکنش</span>
          <Link to="/reports" className="flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-primary transition-colors">
            گزارش‌ها <ChevronLeft className="w-3 h-3" />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Link to="/transfer-book" className="block rounded-lg bg-rose-50 dark:bg-rose-950/30 p-2.5 border border-rose-100 dark:border-rose-900/50 hover:border-rose-300 dark:hover:border-rose-700 transition-colors">
            <div className="flex items-center gap-1 mb-1">
              <ArrowUpRight className="w-3 h-3 text-rose-500" />
              <span className="text-[10px] font-medium text-rose-600 dark:text-rose-400">ارسال</span>
            </div>
            <p className="text-sm font-bold tabular-nums text-rose-600 dark:text-rose-400">{formatNumber(stats.sent ? stats.sent[1] : 0)}</p>
            {stats.sent && <p className="text-[9px] text-rose-400 dark:text-rose-500 font-medium" dir="ltr">{stats.sent[0]}</p>}
          </Link>
          <Link to="/transfer-book" className="block rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-2.5 border border-emerald-100 dark:border-emerald-900/50 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors">
            <div className="flex items-center gap-1 mb-1">
              <ArrowDownLeft className="w-3 h-3 text-emerald-500" />
              <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">دریافت</span>
            </div>
            <p className="text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{formatNumber(stats.received ? stats.received[1] : 0)}</p>
            {stats.received && <p className="text-[9px] text-emerald-400 dark:text-emerald-500 font-medium" dir="ltr">{stats.received[0]}</p>}
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}