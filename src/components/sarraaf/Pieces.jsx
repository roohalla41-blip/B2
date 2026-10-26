import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, ChevronRight } from 'lucide-react';

export function PageHeader({ title, subtitle, icon: Icon, actions, children, showBack }) {
  const location = useLocation();
  const navigate = useNavigate();
  const segments = location.pathname.split('/').filter(Boolean);
  const isChildPage = segments.length > 1;
  const shouldShowBack = showBack ?? isChildPage;

  return (
    <div className="workspace-page-header flex items-center justify-between gap-3 mb-5 md:flex-wrap md:rounded-xl md:border md:border-border md:bg-card md:px-4 md:py-3">
      <div className="flex items-center gap-2.5 lg:gap-3 min-w-0">
        {shouldShowBack && (
          <button
            onClick={() => navigate(-1)}
            className="w-11 h-11 rounded-xl bg-muted hover:bg-muted/80 flex items-center justify-center shrink-0 transition-colors"
            aria-label="بازگشت"
          >
            <ChevronRight className="w-5 h-5 text-foreground" />
          </button>
        )}
        {Icon && (
          <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 lg:w-5.5 lg:h-5.5 text-primary" />
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-lg lg:text-xl font-bold text-foreground truncate leading-tight">{title}</h1>
          {subtitle && <p className="text-xs text-muted-foreground truncate mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="workspace-page-actions flex items-center gap-2 shrink-0 md:flex-wrap">{actions}</div>}
      {children}
    </div>
  );
}

export function SectionCard({ title, icon: Icon, children, className, actions }) {
  return (
    <Card className={cn('overflow-hidden shadow-card', className)}>
      {(title || Icon) && (
        <div className="flex items-center justify-between px-4 lg:px-5 py-3 lg:py-3.5 border-b bg-muted/40">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="w-4 h-4 text-primary" />}
            {title && <h3 className="text-sm lg:text-base font-semibold text-foreground">{title}</h3>}
          </div>
          {actions}
        </div>
      )}
      <CardContent className="p-4 lg:p-5">{children}</CardContent>
    </Card>
  );
}

export function StatCard({ label, value, sub, icon: Icon, gradient }) {
  return (
    <Card className="overflow-hidden border-0 shadow-card">
      <CardContent className={cn('p-3.5 lg:p-5 text-white relative', gradient && `bg-gradient-to-br ${gradient}`)}>
        <div className="flex items-start justify-between mb-1.5 lg:mb-3">
          <span className="text-[11px] lg:text-sm font-medium opacity-90 leading-tight">{label}</span>
          {Icon && (
            <div className="w-7 h-7 lg:w-9 lg:h-9 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4 lg:w-5 lg:h-5 opacity-90" />
            </div>
          )}
        </div>
        <p className="text-xl lg:text-2xl font-bold leading-tight tracking-tight">{value}</p>
        {sub && <p className="text-xs lg:text-sm opacity-75 mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export function BalanceCard({ label, amounts, accent = 'text-primary' }) {
  return (
    <Card className="overflow-hidden shadow-card">
      <CardContent className="p-4 lg:p-5">
        <p className="text-xs text-muted-foreground mb-2 font-medium">{label}</p>
        {Object.entries(amounts).length === 0 ? (
          <p className="text-sm font-semibold text-muted-foreground">۰</p>
        ) : (
          <div className="space-y-1.5 lg:space-y-2">
            {Object.entries(amounts).map(([cur, val]) => (
              <div key={cur} className="flex items-center justify-between">
                <span className={cn('text-sm lg:text-lg font-bold tabular-nums', accent)}>
                  {new Intl.NumberFormat('en-US').format(Math.round(val || 0))}
                </span>
                <span className="text-xs lg:text-sm text-muted-foreground font-medium">{cur}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function StatusBadge({ status, labels, variant }) {
  const v = variant || (status === 'active' || status === 'paid' || status === 'approved' || status === 'completed' ? 'success' : status === 'pending' || status === 'registered' ? 'warning' : status === 'cancelled' || status === 'rejected' || status === 'suspended' ? 'destructive' : 'secondary');
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium',
      v === 'success' && 'bg-success/15 text-success',
      v === 'warning' && 'bg-warning/15 text-warning',
      v === 'destructive' && 'bg-destructive/15 text-destructive',
      v === 'secondary' && 'bg-muted text-muted-foreground',
    )}>
      {labels?.[status] || status}
    </span>
  );
}

export function EditedBadge({ edited }) {
  if (!edited) return null;
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-medium">
      ویرایش‌شده
    </span>
  );
}

export function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-3">
          <Icon className="w-7 h-7 text-muted-foreground/50" />
        </div>
      )}
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      {description && <p className="text-xs text-muted-foreground/70 mt-1 max-w-[200px]">{description}</p>}
    </div>
  );
}

export function LoadingState() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );
}

export function TransactionRow({ tx, onClick, labels }) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-center justify-between gap-2 py-2.5 lg:py-3 px-3 lg:px-4 rounded-lg border border-transparent transition-all',
        onClick && 'cursor-pointer hover:bg-muted/50 hover:border-border'
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium text-foreground truncate">
              {labels?.[tx.type] || tx.type}
            </span>
            <EditedBadge edited={tx.edited} />
          </div>
          {tx.description && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">{tx.description}</p>
          )}
        </div>
      </div>
      <div className="text-left shrink-0">
        <p className="text-sm font-bold tabular-nums text-foreground">
          {new Intl.NumberFormat('en-US').format(Math.round(tx.amount || 0))}
        </p>
        <p className="text-xs text-muted-foreground">{tx.currency}</p>
      </div>
    </div>
  );
}