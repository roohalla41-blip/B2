import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function SettingsSection({ icon: Icon, title, description, children, className, action }) {
  return (
    <Card className={cn('overflow-hidden shadow-card', className)}>
      <CardContent className="p-0">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          {Icon && (
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Icon className="w-5 h-5 text-primary" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold">{title}</h3>
            {description && <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>}
          </div>
          {action}
        </div>
        <div className="p-4">{children}</div>
      </CardContent>
    </Card>
  );
}