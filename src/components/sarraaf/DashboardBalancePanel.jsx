import React from 'react';
import { formatNumber } from '@/lib/sarraaf';
import { LoadingState } from '@/components/sarraaf/Pieces';

export default function DashboardBalancePanel({ title, icon: Icon, rows, isLoading, bank = false }) {
  return (
    <section className="rounded-xl border border-border bg-card min-w-0">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3"><Icon className="w-5 h-5 text-muted-foreground" /><h2 className="text-sm font-semibold">{title}</h2></div>
      {isLoading ? <LoadingState /> : !rows?.length ? <p className="p-5 text-sm text-muted-foreground">موجودی ثبت‌شده‌ای موجود نیست</p> : (
        <div className="max-h-56 overflow-y-auto scrollbar-thin divide-y divide-border">
          {rows.map((row, index) => (
            <div key={row.id || `${row.currency}-${row.bank_id || index}`} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <div className="min-w-0"><span className="font-medium" dir="ltr">{row.currency}</span>{bank && (row.bank_name || row.bank_id) && <p className="text-xs text-muted-foreground truncate mt-1">{row.bank_name || `حساب ${row.bank_id}`}</p>}</div>
              <span className="font-semibold tabular-nums" dir="ltr">{formatNumber(bank ? row.current_balance : row.balance)}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}