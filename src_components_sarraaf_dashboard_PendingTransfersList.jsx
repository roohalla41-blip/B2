import React from 'react';
import { Link } from 'react-router-dom';
import { Send, ArrowLeftRight, ChevronLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { formatNumber } from '@/lib/sarraaf';
import { Loader2 } from 'lucide-react';

export default function PendingTransfersList({ transfers, isLoading }) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const pending = (transfers || []).filter(
    t => t.status === 'pending' || t.status === 'registered'
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-sm">
            <Send className="w-4 h-4 text-white" strokeWidth={2.2} />
          </div>
          <h3 className="text-xs font-bold text-foreground">حواله‌های در انتظار</h3>
        </div>
        <div className="flex items-center gap-2">
          {pending.length > 0 && (
            <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold">
              {formatNumber(pending.length)}
            </span>
          )}
          <Link to="/transfer-book" className="flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-primary transition-colors">
            همه <ChevronLeft className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {pending.length === 0 ? (
        <Link to="/transfer-book" className="block">
          <Card className="overflow-hidden border border-dashed border-border hover:border-primary/30 transition-colors">
            <CardContent className="p-4 flex items-center gap-3 text-muted-foreground">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium">حواله در انتظاری وجود ندارد</p>
                <p className="text-xs text-muted-foreground/70">برای ثبت حواله جدید کلیک کنید</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      ) : (
        <div className="space-y-1.5">
          {pending.slice(0, 5).map(t => {
            const isSend = t.direction === 'send';
            const name = isSend ? t.receiver_name : t.sender_name;
            const phone = isSend ? t.receiver_phone : t.sender_phone;
            return (
              <Link
                key={t.id}
                to={`/transfer-book`}
                className="block"
              >
                <Card className="overflow-hidden shadow-card border border-border hover:border-primary/30 transition-colors">
                  <CardContent className="p-2.5 flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isSend ? 'bg-orange-100 text-orange-600' : 'bg-emerald-100 text-emerald-600'}`}>
                      {isSend ? <Send className="w-4 h-4" /> : <ArrowLeftRight className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium text-foreground truncate">{name || 'بدون نام'}</p>
                        {t.destination && (
                          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{t.destination}</span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate" dir="ltr">{phone || '—'}</p>
                    </div>
                    <div className="text-left shrink-0 flex items-center gap-1">
                      <div>
                        <p className="text-sm font-bold tabular-nums text-foreground">{formatNumber(t.amount)}</p>
                        <p className="text-[10px] text-muted-foreground" dir="ltr">{t.currency}</p>
                      </div>
                      <ChevronLeft className="w-4 h-4 text-muted-foreground shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
          {pending.length > 5 && (
            <Link to="/transfer-book" className="block text-center text-xs text-primary font-medium py-2 hover:underline">
              مشاهده همه ({formatNumber(pending.length)})
            </Link>
          )}
        </div>
      )}
    </div>
  );
}