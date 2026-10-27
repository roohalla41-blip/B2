import React from 'react';
import { Pencil, ChevronLeft } from 'lucide-react';
import { StatusBadge } from '@/components/sarraaf/Pieces';

export default function DesktopCustomersTable({ customers, onOpen, onEdit }) {
  const types = { permanent: 'دائمی', temporary: 'موقت', misc: 'متفرقه' };
  return (
    <div className="hidden md:block rounded-xl border border-border bg-card overflow-x-auto">
      <table className="w-full text-sm text-right">
        <thead className="bg-muted/50 text-xs text-muted-foreground"><tr>{['نام مشتری', 'کد', 'موبایل', 'نوع', 'وضعیت', 'عملیات'].map(label => <th key={label} className="px-4 py-3 font-medium whitespace-nowrap">{label}</th>)}</tr></thead>
        <tbody className="divide-y divide-border">
          {customers.map(customer => (
            <tr key={customer.id} className="hover:bg-muted/30">
              <td className="px-4 py-3 font-medium"><button onClick={() => onOpen(customer)} className="text-right hover:text-primary">{customer.name}</button></td>
              <td className="px-4 py-3 text-muted-foreground">{customer.code || '—'}</td>
              <td className="px-4 py-3 tabular-nums" dir="ltr">{customer.phone || '—'}</td>
              <td className="px-4 py-3 text-muted-foreground">{types[customer.customer_type] || customer.customer_type || '—'}</td>
              <td className="px-4 py-3"><StatusBadge status={customer.status} labels={{ active: 'فعال', inactive: 'غیرفعال' }} /></td>
              <td className="px-4 py-3"><div className="flex gap-2"><button onClick={() => onEdit(customer)} className="rounded-md p-1.5 hover:bg-muted text-muted-foreground" aria-label={`ویرایش ${customer.name}`}><Pencil className="w-4 h-4" /></button><button onClick={() => onOpen(customer)} className="rounded-md p-1.5 hover:bg-muted text-primary" aria-label={`جزئیات ${customer.name}`}><ChevronLeft className="w-4 h-4" /></button></div></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}