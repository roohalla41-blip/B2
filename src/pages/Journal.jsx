import React from 'react';
import { useTransactions, useCurrencies, useRateSettings } from '@/lib/useSarraaf';
import { PageHeader, LoadingState, EmptyState } from '@/components/sarraaf/Pieces';
import { groupByDocument, documentBaseBalances } from '@/lib/ledger';
import { formatDate, formatNumber, TX_TYPE_LABELS } from '@/lib/sarraaf';
import { Card, CardContent } from '@/components/ui/card';
import { BookCopy, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Journal() {
  const { data: txs, isLoading } = useTransactions();
  const { data: currencies } = useCurrencies();
  const { data: rateSettings } = useRateSettings();

  const groups = txs ? groupByDocument(txs) : {};
  const groupEntries = Object.entries(groups).sort((a, b) => {
    const da = a[1][0]?.date || '';
    const db = b[1][0]?.date || '';
    return db.localeCompare(da);
  });

  return (
    <>
      <PageHeader title="دفتر روزنامه" icon={BookCopy}
        actions={<Button size="sm" variant="outline" onClick={() => window.print()}><Printer className="w-4 h-4" /> چاپ</Button>}
      />
      {isLoading ? <LoadingState /> : groupEntries.length === 0 ? <EmptyState icon={BookCopy} title="سندی وجود ندارد" /> : (
        <div className="space-y-3">
          {groupEntries.map(([docNo, lines]) => {
            const bal = documentBaseBalances(lines);
            const isBalanced = Object.values(bal).every(b => Math.abs(b.debit - b.credit) < 1);
            return (
              <Card key={docNo}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold">{docNo}</span>
                    <span className="text-xs text-muted-foreground">{formatDate(lines[0]?.date)}</span>
                  </div>
                  <div className="space-y-1">
                    {lines.map((l, i) => (
                      <div key={i} className="flex items-center justify-between text-xs py-1 border-b last:border-0">
                        <span className="truncate flex-1">{l.description || TX_TYPE_LABELS[l.type] || l.type}</span>
                        <span className="font-mono text-left">{formatNumber(l.amount, 2)} {l.currency}</span>
                      </div>
                    ))}
                  </div>
                  <div className={`text-xs mt-2 font-medium ${isBalanced ? 'text-success' : 'text-destructive'}`}>
                    {isBalanced ? '✓ تراز' : '✗ ناتراز'}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}