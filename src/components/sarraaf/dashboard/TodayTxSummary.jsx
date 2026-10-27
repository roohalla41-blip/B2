import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownLeft, ArrowUpRight, FileText, ChevronLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { formatNumber } from '@/lib/sarraaf';

export default function TodayTxSummary({ txs, isLoading }) {
  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayTxs = (txs || []).filter(t => (t.date || t.created_date || '').split('T')[0] === today);

    const sent = {};
    const received = {};
    let total = 0;

    for (const t of todayTxs) {
      const amt = Number(t.amount) || 0;
      total += 1;
      const map = t.type === 'transfer_send' ? sent : t.type === 'transfer_receive' ? received : null;
      if (map) {
        const cur = t.currency || 'AFN';
        map[cur] = (map[cur] || 0) + amt;
      }
    }

    const topEntry = (map) => {
      const entries = Object.entries(map).filter(([, v]) => v !== 0).sort((a, b) => b[1] - a[1]);
      return entries[0] || null;
    };

    return {
      count: todayTxs.length,
      sent: topEntry(sent),
      received: topEntry(received),
    };
  }, [txs]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2].map(i => (
          <Card key={i} className="overflow-hidden border-0 shadow-card">
            <CardContent className="p-2.5 bg-muted/30 animate-pulse h-16" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm">
            <FileText className="w-4 h-4 text-white" strokeWidth={2.2} />
          </div>
          <h3 className="text-xs font-bold text-foreground">تراکنش‌های امروز</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground font-medium">{stats.count} تراکنش</span>
          <Link to="/reports" className="flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-primary transition-colors">
            گزارش‌ها <ChevronLeft className="w-3 h-3" />
          </Link>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Link to="/reports" className="block">
          <Card className="overflow-hidden border-0 shadow-card hover:scale-[1.02] transition-transform">
            <CardContent className="p-2.5 bg-gradient-to-br from-blue-600 to-blue-700 text-white">
              <div className="flex items-center gap-1 mb-1">
                <FileText className="w-3 h-3 text-white/70" />
                <span className="text-[9px] font-medium text-white/80">کل امروز</span>
              </div>
              <p className="text-base font-bold tabular-nums leading-tight">{formatNumber(stats.count)}</p>
            </CardContent>
          </Card>
        </Link>
        <Link to="/transfer-book" className="block">
          <Card className="overflow-hidden border-0 shadow-card hover:scale-[1.02] transition-transform">
            <CardContent className="p-2.5 bg-gradient-to-br from-rose-500 to-rose-600 text-white">
              <div className="flex items-center gap-1 mb-1">
                <ArrowUpRight className="w-3 h-3 text-white/70" />
                <span className="text-[9px] font-medium text-white/80">ارسال</span>
              </div>
              <p className="text-base font-bold tabular-nums leading-tight">
                {formatNumber(stats.sent ? stats.sent[1] : 0)}
              </p>
              {stats.sent && (
                <p className="text-[9px] text-white/60 font-medium" dir="ltr">{stats.sent[0]}</p>
              )}
            </CardContent>
          </Card>
        </Link>
        <Link to="/transfer-book" className="block">
          <Card className="overflow-hidden border-0 shadow-card hover:scale-[1.02] transition-transform">
            <CardContent className="p-2.5 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
              <div className="flex items-center gap-1 mb-1">
                <ArrowDownLeft className="w-3 h-3 text-white/70" />
                <span className="text-[9px] font-medium text-white/80">دریافت</span>
              </div>
              <p className="text-base font-bold tabular-nums leading-tight">
                {formatNumber(stats.received ? stats.received[1] : 0)}
              </p>
              {stats.received && (
                <p className="text-[9px] text-white/60 font-medium" dir="ltr">{stats.received[0]}</p>
              )}
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}