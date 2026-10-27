import React, { useState, useMemo } from 'react';
import { useTreasuryBalances, useDocuments } from '@/lib/useSarraaf';
import { PageHeader, EmptyState, LoadingState } from '@/components/sarraaf/Pieces';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatNumber } from '@/lib/sarraaf';
import { documentBaseBalances } from '@/lib/ledger';
import { Scale, Printer } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { AmountInput } from '@/components/sarraaf/Fields';

export default function Reconciliation() {
  const { data: treasuryData, isLoading } = useTreasuryBalances();
  const { data: documents } = useDocuments();
  const [physical, setPhysical] = useState({});

  const bookBalances = {};
  for (const b of (treasuryData || [])) {
    bookBalances[b.currency] = b.balance;
  }
  const currencies = Object.keys(bookBalances);

  const diffs = {};
  for (const cur of currencies) {
    const book = bookBalances[cur] || 0;
    const phys = physical[cur] || 0;
    diffs[cur] = phys - book;
  }

  const unbalanced = useMemo(() => {
    if (!documents || documents.length === 0) return [];
    const result = [];
    for (const doc of documents) {
      if (!doc.lines || doc.lines.length < 2) continue;
      const balances = documentBaseBalances(doc.lines);
      const hasImbalance = Object.values(balances).some(b => Math.abs(b.debit - b.credit) > 0.5);
      if (hasImbalance) {
        result.push({ docNo: doc.doc_number, lines: doc.lines, balances });
      }
    }
    return result;
  }, [documents]);

  return (
    <>
      <PageHeader title="مغایرت‌گیری" icon={Scale}
        actions={<Button size="sm" variant="outline" onClick={() => window.print()}><Printer className="w-4 h-4" /> چاپ</Button>}
      />
      {isLoading ? <LoadingState /> : (
        <>
          {unbalanced.length > 0 && (
            <Card className="mb-4 border-destructive">
              <CardContent className="p-4">
                <p className="text-sm font-medium text-destructive">⚠ {unbalanced.length} سند ناتراز</p>
              </CardContent>
            </Card>
          )}
          <h3 className="text-sm font-semibold mb-2">شمارش فیزیکی صندوق</h3>
          <div className="space-y-3">
            {currencies.length === 0 ? (
              <EmptyState icon={Scale} title="داده‌ای نیست" />
            ) : currencies.map(cur => (
              <div key={cur} className="grid grid-cols-3 gap-2 items-center p-3 rounded-xl border">
                <span className="text-sm font-medium">{cur}</span>
                <div>
                  <Label className="text-xs">دفتری: {formatNumber(bookBalances[cur] || 0)}</Label>
                  <AmountInput value={physical[cur] || 0} onChange={v => setPhysical({...physical, [cur]: v})} placeholder="فیزیکی" />
                </div>
                <div className={`text-sm font-bold ${(diffs[cur] || 0) === 0 ? 'text-success' : 'text-destructive'}`}>
                  مغایرت: {formatNumber(diffs[cur] || 0)}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}