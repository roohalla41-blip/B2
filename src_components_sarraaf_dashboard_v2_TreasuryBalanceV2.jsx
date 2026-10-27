import React from 'react';
import { Banknote, ChevronLeft, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { formatNumber } from '@/lib/sarraaf';
import { cn } from '@/lib/utils';

export default function TreasuryBalanceV2({ treasuryBalances, isLoading }) {
  if (isLoading) {
    return (
      <Card className="overflow-hidden border-0 shadow-card">
        <CardContent className="p-3 bg-muted/30 animate-pulse h-24" />
      </Card>
    );
  }

  const rows = (treasuryBalances || []).filter(r => Math.abs(r.balance || 0) > 0.01);

  return (
    <Card className="overflow-hidden border-0 shadow-card">
      <CardContent className="p-0">
        <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-l from-emerald-600/10 to-transparent border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-sm">
              <Banknote className="w-4 h-4 text-white" strokeWidth={2.2} />
            </div>
            <h3 className="text-xs font-bold text-foreground">موجودی صندوق‌ها</h3>
          </div>
          <Link to="/cash" className="flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-primary transition-colors">
            مدیریت <ChevronLeft className="w-3 h-3" />
          </Link>
        </div>
        {rows.length === 0 ? (
          <Link to="/cash" className="block px-3 py-4 text-center hover:bg-muted/30 transition-colors">
            <p className="text-xs text-muted-foreground">صندوقی ثبت نشده است</p>
            <p className="text-[10px] text-primary mt-1">برای مدیریت صندوق‌ها کلیک کنید</p>
          </Link>
        ) : (
          <div className="divide-y divide-border">
            {rows.slice(0, 4).map((row, i) => {
              const isPrimary = row.currency === 'AFN' || i === 0;
              return (
                <div key={`${row.currency}-${i}`} className="flex items-center justify-between px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'w-1.5 h-8 rounded-full',
                      isPrimary ? 'bg-emerald-500' : 'bg-muted-foreground/30'
                    )} />
                    <div>
                      <p className="text-[11px] text-muted-foreground font-medium" dir="ltr">{row.currency}</p>
                      {isPrimary && <p className="text-[9px] text-emerald-600 font-medium">اصلی</p>}
                    </div>
                  </div>
                  <p className={cn(
                    'text-sm font-bold tabular-nums',
                    isPrimary ? 'text-emerald-600' : 'text-foreground'
                  )}>{formatNumber(row.balance || 0)}</p>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}