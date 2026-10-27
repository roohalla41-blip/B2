import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/sarraaf/Pieces';
import { formatDate, formatNumber, TRANSFER_STATUS_LABELS } from '@/lib/sarraaf';

export default function DesktopTransferTable({ transfers, onExecute }) {
  return (
    <div className="hidden md:block overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full text-right text-sm">
        <thead className="bg-muted/50 text-muted-foreground text-xs"><tr>{['شماره / نوع', 'گیرنده', 'مبلغ / ارز', 'تاریخ', 'وضعیت', 'عملیات'].map(label => <th key={label} className="px-4 py-3 font-medium whitespace-nowrap">{label}</th>)}</tr></thead>
        <tbody className="divide-y divide-border">
          {transfers.map(transfer => (
            <tr key={transfer.id} className="hover:bg-muted/30">
              <td className="px-4 py-3"><p className="font-medium">{transfer.transfer_no}</p><p className="text-xs text-muted-foreground mt-1">{transfer.direction === 'send' ? 'ارسال' : 'دریافت'}</p></td>
              <td className="px-4 py-3"><p>{transfer.receiver_name}</p><p className="text-xs text-muted-foreground mt-1" dir="ltr">{transfer.receiver_phone}</p></td>
              <td className="px-4 py-3 font-semibold tabular-nums whitespace-nowrap">{formatNumber(transfer.amount)} <span className="text-xs font-normal text-muted-foreground">{transfer.currency}</span></td>
              <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{formatDate(transfer.created_date)}</td>
              <td className="px-4 py-3"><StatusBadge status={transfer.status} labels={TRANSFER_STATUS_LABELS} /></td>
              <td className="px-4 py-3"><div className="flex items-center gap-2">{transfer.status !== 'paid' && transfer.status !== 'cancelled' && <Button size="sm" onClick={() => onExecute(transfer)}><CheckCircle className="w-3.5 h-3.5" />اجرا</Button>}<Button asChild size="sm" variant="outline"><Link to={`/receipt?type=transfer&id=${transfer.id}`}>رسید</Link></Button></div></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}