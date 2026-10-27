import React from 'react';
import { Link } from 'react-router-dom';
import { Send, ArrowLeftRight, ChevronLeft, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { formatNumber } from '@/lib/sarraaf';
import { Loader2 } from 'lucide-react';

export default function PendingTransfersV2({ transfers, isLoading }) {
  if (isLoading) {
    return (
      <Card className="overflow-hidden border-0 shadow-card">
        <CardContent className="p-3 bg-muted/30 animate-pulse h-16" />
      </Card>
    );
  }

  const pending = (transfers || []).filter(t => t.status === 'pending' || t.status === 'registered');

  return (
    <Card className="overflow-hidden border-0 shadow-card">
      <CardContent className="p-0">
        <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-l from-orange-600/10 to-transparent border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-sm">
              <Send className="w-4 h-4 text-white" strokeWidth={2.2} />
            </div>
            <h3 className="text-xs font-bold text-foreground">حواله‌های در انتظار</h3>
            {pending.length > 0 && (
              <span className="inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full bg-orange-100 text-orange-700 text-[9px] font-bold">
                {formatNumber(pending.length)}
              </span>
            )}
          </div>
          <Link to="/transfer-book" className="flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-primary transition-colors">
            همه <ChevronLeft className="w-3 h-3" />
          </Link>
        </div>
        {pending.length === 0 ? (
          <Link to="/transfer-book" className="flex items-center gap-2 px-3 py-4 text-muted-foreground hover:bg-muted/30 transition-colors">
            <Clock className="w-4 h-4 shrink-0" />
            <p className="text-xs">حواله در انتظاری وجود ندارد</p>
            <p className="text-[10px] text-primary mr-auto">ثبت حواله</p>
          </Link>
        ) : (
          <div className="divide-y divide-border">
            {pending.slice(0, 4).map(t => {
              const isSend = t.direction === 'send';
              const name = isSend ? t.receiver_name : t.sender_name;
              return (
                <Link key={t.id} to="/transfer-book" className="flex items-center gap-2.5 px-3 py-2 hover:bg-muted/50 transition-colors">
                  <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${isSend ? 'bg-orange-100 text-orange-600' : 'bg-emerald-100 text-emerald-600'}`}>
                    {isSend ? <Send className="w-3.5 h-3.5" /> : <ArrowLeftRight className="w-3.5 h-3.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{name || 'بدون نام'}</p>
                    {t.destination && <p className="text-[10px] text-muted-foreground truncate">{t.destination}</p>}
                  </div>
                  <div className="text-left shrink-0">
                    <p className="text-sm font-bold tabular-nums text-foreground">{formatNumber(t.amount)}</p>
                    <p className="text-[9px] text-muted-foreground" dir="ltr">{t.currency}</p>
                  </div>
                  <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}