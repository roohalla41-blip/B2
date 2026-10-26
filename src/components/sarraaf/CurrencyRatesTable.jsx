import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Coins, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/lib/sarraaf';
import { getRateHistory } from '@/lib/rateHistory';

function ChangeCell({ entry }) {
  const old = Number(entry?.old_sell_rate) || 0;
  const diff = Number(entry?.sell_diff) || 0;
  if (!old || !diff) return <span className="text-muted-foreground">—</span>;
  const pct = (diff / old) * 100;
  return (
    <span className={cn('text-xs font-medium tabular-nums', pct > 0 ? 'text-emerald-600' : 'text-red-600')}>
      {pct > 0 ? '▲' : '▼'} {formatNumber(Math.abs(pct), 2)}٪
    </span>
  );
}

export default function CurrencyRatesTable({ currencies, isLoading }) {
  const active = (currencies || []).filter(c => c.is_active !== false);
  const { data: history } = useQuery({ queryKey: ['rateHistory', 'all'], queryFn: () => getRateHistory(null, 200) });
  const lastChange = useMemo(() => {
    const map = {};
    for (const h of history || []) if (!map[h.currency]) map[h.currency] = h;
    return map;
  }, [history]);

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center">
            <Coins className="w-4 h-4 text-amber-600" />
          </div>
          <h2 className="text-sm font-semibold">نرخ ارز</h2>
        </div>
        <Link to="/currencies" className="text-xs text-primary font-medium hover:underline">مشاهده همه</Link>
      </div>
      {isLoading ? (
        <div className="h-40 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : active.length === 0 ? (
        <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">نرخی ثبت نشده است</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="text-xs text-muted-foreground border-b border-border">
              <tr>
                <th className="font-medium py-2 px-2">ارز</th>
                <th className="font-medium py-2 px-2">خرید</th>
                <th className="font-medium py-2 px-2">فروش</th>
                <th className="font-medium py-2 px-2">تغییر</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {active.map(c => (
                <tr key={c.code} className="hover:bg-muted/30">
                  <td className="py-2 px-2">
                    <span className="font-medium">{c.name}</span>
                    <span className="text-xs text-muted-foreground mr-1.5" dir="ltr">({c.code})</span>
                  </td>
                  <td className="py-2 px-2 tabular-nums">{c.buy_rate ? formatNumber(c.buy_rate) : '—'}</td>
                  <td className="py-2 px-2 tabular-nums">{c.sell_rate ? formatNumber(c.sell_rate) : '—'}</td>
                  <td className="py-2 px-2"><ChangeCell entry={lastChange[c.code]} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}