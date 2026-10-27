import React from 'react';
import { Link } from 'react-router-dom';
import { Banknote, Wallet, ChevronLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { formatNumber } from '@/lib/sarraaf';
import { useSafes } from '@/lib/useSarraaf';

export default function TreasuryBalanceCards({ treasuryBalances, isLoading }) {
  const { data: safes, isLoading: safesLoading } = useSafes();

  const loading = isLoading || safesLoading;

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-2">
        {[0, 1].map(i => (
          <Card key={i} className="overflow-hidden border-0 shadow-card">
            <CardContent className="p-3 bg-muted/30 animate-pulse h-20" />
          </Card>
        ))}
      </div>
    );
  }

  const safeList = (safes || []).filter(s => s.active !== false);
  const balanceMap = {};
  for (const row of treasuryBalances || []) {
    if (row.currency) balanceMap[row.currency] = row.balance || 0;
  }

  if (safeList.length === 0) {
    return (
      <Link to="/cash" className="block">
        <Card className="overflow-hidden border border-dashed border-border hover:border-primary/30 transition-colors">
          <CardContent className="p-4 flex items-center gap-3 text-muted-foreground">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium">صندوقی ثبت نشده است</p>
              <p className="text-xs text-muted-foreground/70">برای مدیریت صندوق‌ها کلیک کنید</p>
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  }

  const rows = safeList.map(safe => ({
    id: safe.id,
    name: safe.name,
    currency: safe.currency,
    balance: balanceMap[safe.currency] ?? safe.opening_balance ?? 0,
  }));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-sm">
            <Banknote className="w-4 h-4 text-white" strokeWidth={2.2} />
          </div>
          <h3 className="text-xs font-bold text-foreground">موجودی صندوق‌ها</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground font-medium">{rows.length} صندوق</span>
          <Link to="/cash" className="flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-primary transition-colors">
            مدیریت <ChevronLeft className="w-3 h-3" />
          </Link>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {rows.slice(0, 6).map((row, i) => {
          const isPrimary = i === 0;
          return (
            <Card
              key={`${row.id}-${i}`}
              className={`overflow-hidden border-0 shadow-card transition-transform hover:scale-[1.02] ${isPrimary ? 'ring-1 ring-emerald-500/30' : ''}`}
            >
              <CardContent className={`p-3 relative ${isPrimary ? 'bg-gradient-to-br from-emerald-600 to-emerald-700 text-white' : 'bg-card text-foreground'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[10px] font-bold tracking-wide truncate max-w-[70%] ${isPrimary ? 'text-white/80' : 'text-muted-foreground'}`}>{row.name}</span>
                  <span className={`text-[9px] font-medium ${isPrimary ? 'text-white/60' : 'text-muted-foreground/70'}`} dir="ltr">{row.currency}</span>
                </div>
                <p className="text-base font-bold tabular-nums leading-tight">{formatNumber(row.balance)}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}