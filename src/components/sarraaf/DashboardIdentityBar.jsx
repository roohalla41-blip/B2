import React from 'react';
import { CalendarDays, Building2 } from 'lucide-react';
import { formatDate } from '@/lib/sarraaf';

export default function DashboardIdentityBar({ profile }) {
  const name = profile?.exchange_name || profile?.name;
  const code = profile?.code || profile?.exchange_code;
  return (
    <div className="flex flex-wrap items-center gap-3 mb-5">
      <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-4 py-2.5 shadow-card">
        <CalendarDays className="w-5 h-5 text-primary" />
        <div>
          <p className="text-xs text-muted-foreground leading-tight">امروز</p>
          <p className="text-sm font-semibold tabular-nums leading-tight">{formatDate(new Date().toISOString())}</p>
        </div>
      </div>
      {name && (
        <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-4 py-2.5 shadow-card min-w-0">
          <Building2 className="w-5 h-5 text-primary shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate leading-tight">{name}</p>
            {code && <p className="text-xs text-muted-foreground leading-tight" dir="ltr">کد صرافی: {code}</p>}
          </div>
        </div>
      )}
    </div>
  );
}