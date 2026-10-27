import React from 'react';
import { Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatNumber, formatDate, TX_TYPE_LABELS } from '@/lib/sarraaf';

const TYPE_STYLES = {
  transfer_send: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
  transfer_receive: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  transfer_execute: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300',
  buy: 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300',
  sell: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  convert: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300',
  dadogereft: 'bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300',
};

const HEADERS = ['#', 'تاریخ و زمان', 'نوع تراکنش', 'مبلغ', 'ارز', 'مشتری', 'وضعیت', 'توضیحات', 'عملیات'];

function StatusBadge({ tx }) {
  const edited = tx.updated_at && tx.created_at && new Date(tx.updated_at) - new Date(tx.created_at) > 60000;
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap', edited ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300')}>
      {edited ? 'ویرایش‌شده' : 'ثبت‌شده'}
    </span>
  );
}

export default function DesktopTransactionTable({ transactions, onOpen }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-right">
        <thead className="bg-muted/50 text-muted-foreground text-xs">
          <tr>{HEADERS.map(h => <th key={h} className="font-medium px-3 py-3 whitespace-nowrap">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-border">
          {transactions.map((tx, i) => (
            <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
              <td className="px-3 py-3 text-muted-foreground tabular-nums">{formatNumber(i + 1)}</td>
              <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">{tx.created_date ? formatDate(tx.created_date, true) : '—'}</td>
              <td className="px-3 py-3 whitespace-nowrap">
                <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', TYPE_STYLES[tx.type] || 'bg-muted text-muted-foreground')}>
                  {TX_TYPE_LABELS[tx.type] || tx.type}
                </span>
              </td>
              <td className="px-3 py-3 font-semibold tabular-nums whitespace-nowrap">{formatNumber(tx.amount || 0)}</td>
              <td className="px-3 py-3" dir="ltr">{tx.currency}</td>
              <td className="px-3 py-3 max-w-32 truncate" title={tx.customer_name}>{tx.customer_name || '—'}</td>
              <td className="px-3 py-3"><StatusBadge tx={tx} /></td>
              <td className="px-3 py-3 max-w-40 truncate text-muted-foreground" title={tx.description}>{tx.description || '—'}</td>
              <td className="px-3 py-3">
                <button onClick={() => onOpen(tx)} className="inline-flex items-center gap-1 text-primary text-xs font-medium hover:underline whitespace-nowrap">
                  <Eye className="w-3.5 h-3.5" />جزئیات
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}