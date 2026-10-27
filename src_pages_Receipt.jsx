import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTransactions, useTransfers } from '@/lib/useSarraaf';
import { PageHeader, LoadingState } from '@/components/sarraaf/Pieces';
import { Button } from '@/components/ui/button';
import { formatDate, formatNumber, TX_TYPE_LABELS, TRANSFER_STATUS_LABELS } from '@/lib/sarraaf';
import { Receipt as ReceiptIcon, Printer, Coins } from 'lucide-react';

export default function Receipt() {
  const [params] = useSearchParams();
  const type = params.get('type');
  const id = params.get('id');
  const { data: txs, isLoading: txLoading } = useTransactions();
  const { data: transfers, isLoading: transferLoading } = useTransfers();
  const [data, setData] = useState(null);
  const [checked, setChecked] = useState(false);

  const isTxLoading = type === 'tx' ? txLoading : transferLoading;

  useEffect(() => {
    if (type === 'tx' && txs) {
      setData(txs.find(t => t.id === id) || null);
      setChecked(true);
    } else if (type === 'transfer' && transfers) {
      setData(transfers.find(t => t.id === id) || null);
      setChecked(true);
    } else if (type && id && !isTxLoading && txs === undefined && transfers === undefined) {
      setChecked(true);
    }
  }, [type, id, txs, transfers, isTxLoading]);

  const loading = isTxLoading || (!checked && !!id);
  const notFound = (checked && !data) || !type || !id;

  if (loading) return <LoadingState />;
  if (notFound) {
    return (
      <>
        <PageHeader title="رسید" icon={ReceiptIcon}
          actions={<Button size="sm" variant="outline" onClick={() => window.history.back()}>بازگشت</Button>}
        />
        <div className="max-w-md mx-auto p-8 text-center border rounded-xl bg-card">
          <ReceiptIcon className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">رسید یافت نشد</p>
          <p className="text-xs text-muted-foreground/70 mt-1">رسید مورد نظر وجود ندارد یا حذف شده است.</p>
          <Button size="sm" variant="outline" className="mt-4" onClick={() => window.history.back()}>بازگشت</Button>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="رسید" icon={ReceiptIcon}
        actions={<Button size="sm" variant="outline" onClick={() => window.print()}><Printer className="w-4 h-4" /> چاپ</Button>}
      />
      <div className="max-w-md mx-auto p-4 border rounded-xl bg-card space-y-3">
        {type === 'tx' ? (
          <>
            <div className="text-center pb-3 border-b">
              <div className="inline-flex w-12 h-12 rounded-xl bg-primary items-center justify-center mb-2">
                <Coins className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="text-sm font-bold">رسید تراکنش</h3>
            </div>
            <Row label="نوع" value={TX_TYPE_LABELS[data.type] || data.type} />
            <Row label="تاریخ" value={formatDate(data.date)} />
            <Row label="شماره سند" value={data.document_no || '—'} />
            <Row label="مبلغ" value={`${formatNumber(data.amount, 2)} ${data.currency}`} />
            {data.description && <Row label="توضیحات" value={data.description} />}
          </>
        ) : (
          <>
            <div className="text-center pb-3 border-b">
              <div className="inline-flex w-12 h-12 rounded-xl bg-primary items-center justify-center mb-2">
                <Coins className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="text-sm font-bold">رسید حواله</h3>
            </div>
            <Row label="شماره حواله" value={data.transfer_no || '—'} />
            <Row label="نوع" value={data.direction === 'send' ? 'ارسال' : 'دریافت'} />
            <Row label="گیرنده" value={data.receiver_name || '—'} />
            <Row label="موبایل گیرنده" value={data.receiver_phone || '—'} />
            <Row label="مبلغ" value={`${formatNumber(data.amount)} ${data.currency}`} />
            <Row label="وضعیت" value={TRANSFER_STATUS_LABELS[data.status] || data.status} />
            <Row label="تاریخ" value={formatDate(data.created_date)} />
          </>
        )}
      </div>
    </>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}