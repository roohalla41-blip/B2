import React from 'react';
import { Download, Send, Users, Banknote, Landmark } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/lib/sarraaf';

const STYLES = {
  bank: { icon: Landmark, accent: 'border-b-cyan-500', iconBg: 'bg-cyan-50 dark:bg-cyan-950/30', iconColor: 'text-cyan-600' },
  treasury: { icon: Banknote, accent: 'border-b-amber-500', iconBg: 'bg-amber-50 dark:bg-amber-950/30', iconColor: 'text-amber-600' },
  customers: { icon: Users, accent: 'border-b-blue-500', iconBg: 'bg-blue-50 dark:bg-blue-950/30', iconColor: 'text-blue-600' },
  sent: { icon: Send, accent: 'border-b-violet-500', iconBg: 'bg-violet-50 dark:bg-violet-950/30', iconColor: 'text-violet-600' },
  received: { icon: Download, accent: 'border-b-emerald-500', iconBg: 'bg-emerald-50 dark:bg-emerald-950/30', iconColor: 'text-emerald-600' },
};

export default function DesktopSummaryCards({ cards }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 mb-5">
      {cards.map((card, index) => {
        const s = STYLES[card.key];
        const Icon = s.icon;
        return (
          <section key={card.key} className={cn('min-w-0 rounded-xl border border-border bg-card p-4 shadow-card border-b-4', s.accent, index === 4 && 'col-span-2 lg:col-span-1')}>
            <div className="flex items-start justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', s.iconBg)}>
                <Icon className={cn('w-4 h-4', s.iconColor)} strokeWidth={2} />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="text-xl font-bold tabular-nums">{card.main.value}</span>
              {card.main.unit && <span className="text-xs text-muted-foreground">{card.main.unit}</span>}
            </div>
            {card.others.map(o => (
              <p key={o.unit} className="text-xs text-muted-foreground tabular-nums mt-0.5">{o.value} {o.unit}</p>
            ))}
            {card.footer.map(text => <p key={text} className="text-xs text-muted-foreground mt-1">{text}</p>)}
            {card.trend !== null && (
              <p className={cn('text-xs font-medium mt-1', card.trend >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                {card.trend >= 0 ? '▲' : '▼'} {formatNumber(Math.abs(card.trend))}٪ نسبت به دیروز
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
}