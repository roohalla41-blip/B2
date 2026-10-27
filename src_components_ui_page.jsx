import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2, Inbox } from 'lucide-react';

export function PageHeader({ title, subtitle, icon: Icon, actions }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        {Icon && (
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 text-primary" />
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold text-foreground truncate">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground truncate">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

export function LoadingState({ text, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 gap-2', className)}>
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      {text && <p className="text-sm text-muted-foreground">{text}</p>}
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, text, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-10 gap-2', className)}>
      <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
        <Icon className="w-7 h-7 text-muted-foreground/60" />
      </div>
      {text && <p className="text-sm text-muted-foreground text-center">{text}</p>}
    </div>
  );
}

export function StatCard({ label, value, icon: Icon, color = 'primary', sub }) {
  const colorMap = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    destructive: 'bg-destructive/10 text-destructive',
  };
  return (
    <div className="rounded-xl border bg-card p-4">
      {Icon && (
        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center mb-2', colorMap[color])}>
          <Icon className="w-4 h-4" />
        </div>
      )}
      <p className="text-xl font-bold text-foreground">{value}</p>
      {label && <p className="text-xs text-muted-foreground mt-0.5">{label}</p>}
      {sub && <p className="text-xs text-muted-foreground/80 mt-0.5">{sub}</p>}
    </div>
  );
}

export function ListItem({ icon: Icon, iconColor = 'primary', title, subtitle, badge, amount, amountColor, onClick, children }) {
  const colorMap = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    destructive: 'bg-destructive/10 text-destructive',
  };
  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border',
        onClick && 'cursor-pointer hover:bg-muted transition-colors'
      )}
      onClick={onClick}
    >
      {Icon && (
        <div className={cn('w-9 h-9 rounded-full flex items-center justify-center shrink-0', colorMap[iconColor])}>
          <Icon className="w-4 h-4" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        {title && <p className="text-sm font-medium text-foreground truncate">{title}</p>}
        {subtitle && <p className="text-xs text-muted-foreground truncate mt-0.5">{subtitle}</p>}
        {children}
      </div>
      {(amount !== undefined || badge) && (
        <div className="text-end shrink-0 space-y-1">
          {amount !== undefined && (
            <p className={cn('text-sm font-bold', amountColor)} dir="ltr">{amount}</p>
          )}
          {badge}
        </div>
      )}
    </div>
  );
}