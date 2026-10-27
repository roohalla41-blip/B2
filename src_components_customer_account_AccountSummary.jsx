import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react';

const STATUS_LABELS = {
  creditor: { label: 'طلبکار', color: 'bg-success/10 text-success', dot: 'bg-success' },
  debtor: { label: 'بدهکار', color: 'bg-destructive/10 text-destructive', dot: 'bg-destructive' },
  settled: { label: 'تسویه', color: 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400', dot: 'bg-blue-500' },
  no_activity: { label: 'بدون گردش', color: 'bg-muted text-muted-foreground', dot: 'bg-muted-foreground' },
};

export default function AccountSummary({ balances, lastUpdated }) {
  if (!balances || balances.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          اطلاعات مالی برای نمایش وجود ندارد.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-foreground">خلاصه وضعیت مالی</h2>
        {lastUpdated && (
          <span className="text-[10px] text-muted-foreground">
            آخرین بروزرسانی: {new Date(lastUpdated).toLocaleDateString('fa-IR')}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {balances.map((b) => {
          const st = STATUS_LABELS[b.status] || STATUS_LABELS.no_activity;
          const isPositive = (b.balance || 0) >= 0;
          return (
            <Card key={b.currency} className="shadow-sm">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Wallet className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-xs font-bold text-foreground">{b.currency}</span>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-medium ${st.color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                    {st.label}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">مانده حساب:</span>
                  <span className={`font-bold ${isPositive ? 'text-success' : 'text-destructive'}`}>
                    {(b.balance || 0).toLocaleString('fa-IR')}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="w-3 h-3 text-success shrink-0" />
                    <div>
                      <p className="text-[9px] text-muted-foreground">دریافتی</p>
                      <p className="text-[11px] font-medium text-foreground">{(b.total_in || 0).toLocaleString('fa-IR')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <TrendingDown className="w-3 h-3 text-destructive shrink-0" />
                    <div>
                      <p className="text-[9px] text-muted-foreground">پرداختی</p>
                      <p className="text-[11px] font-medium text-foreground">{(b.total_out || 0).toLocaleString('fa-IR')}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[9px] text-muted-foreground">طلبکار</p>
                    <p className="text-[11px] font-medium text-success">{(b.receivable || 0).toLocaleString('fa-IR')}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-muted-foreground">بدهکار</p>
                    <p className="text-[11px] font-medium text-destructive">{(b.payable || 0).toLocaleString('fa-IR')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}