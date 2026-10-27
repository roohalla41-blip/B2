import React, { useMemo } from 'react';
import { useBankAccounts, useAgents, useCustomers, useCurrencies, useRateSettings, useTreasuryBalances, useBankBalances, useAgentBalances, useCustomerBalances } from '@/lib/useSarraaf';
import { PageHeader, LoadingState } from '@/components/sarraaf/Pieces';
import { formatNumber } from '@/lib/sarraaf';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Scale, Printer, CheckCircle2, AlertCircle, FileSpreadsheet } from 'lucide-react';

// Convert multi-currency balances to AFN using daily rates
function toAfnTotal(balances, rateSettings, currencies) {
  let total = 0;
  for (const [cur, val] of Object.entries(balances)) {
    if (cur === 'AFN') total += val || 0;
    else if (cur === 'USD') total += (val || 0) * parseFloat(rateSettings?.usd_afn || '0');
    else if (cur === 'IRT') {
      const afnToman = parseFloat(rateSettings?.afn_toman || '0');
      total += afnToman > 0 ? (val || 0) / afnToman : 0;
    } else {
      const c = currencies?.find(x => x.code === cur);
      total += (val || 0) * (c?.daily_rate || c?.sell_rate || 0);
    }
  }
  return total;
}

const exportExcel = (label, amounts) => {
  const rows = Object.entries(amounts).map(([cur, val]) => ({ 'ارز': cur, 'مبلغ': val }));
  if (rows.length === 0) return;
  const csv = '\uFEFF' + Object.keys(rows[0]).join(',') + '\n' + rows.map(r => Object.values(r).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `balance-${label}.csv`; a.click();
  URL.revokeObjectURL(url);
};

export default function BalanceSheet() {
  const { data: treasuryData, isLoading } = useTreasuryBalances();
  const { data: bankBalancesData } = useBankBalances();
  const { data: agentBalancesData } = useAgentBalances();
  const { data: customerBalancesData } = useCustomerBalances();
  const { data: bankAccounts } = useBankAccounts();
  const { data: agents } = useAgents();
  const { data: currencies } = useCurrencies();
  const { data: rateSettings } = useRateSettings();
  const rs = rateSettings || {};
  const curs = currencies || [];

  const cash = {};
  for (const b of (treasuryData || [])) {
    cash[b.currency] = b.balance;
  }
  const totalCash = toAfnTotal(cash, rs, curs);

  const totalBanks = (bankBalancesData || []).reduce((s, b) => {
    const bal = { [b.currency]: b.current_balance || 0 };
    return s + toAfnTotal(bal, rs, curs);
  }, 0);

  const totalAgents = (agentBalancesData || []).reduce((s, a) => {
    const bal = { [a.currency || 'AFN']: a.balance || 0 };
    return s + toAfnTotal(bal, rs, curs);
  }, 0);

  // Liabilities: customer credit balances (money we owe customers)
  const customerLiabilities = useMemo(() => {
    if (!customerBalancesData) return 0;
    let total = 0;
    for (const b of customerBalancesData) {
      if ((b.net_balance || 0) > 0) {
        const creditBal = { [b.balance_currency || 'AFN']: b.net_balance };
        total += toAfnTotal(creditBal, rs, curs);
      }
    }
    return total;
  }, [customerBalancesData, rs, curs]);

  // Customer receivables (money customers owe us)
  const customerReceivables = useMemo(() => {
    if (!customerBalancesData) return 0;
    let total = 0;
    for (const b of customerBalancesData) {
      if ((b.net_balance || 0) < 0) {
        const debitBal = { [b.balance_currency || 'AFN']: Math.abs(b.net_balance) };
        total += toAfnTotal(debitBal, rs, curs);
      }
    }
    return total;
  }, [customerBalancesData, rs, curs]);

  const totalAssets = totalCash + totalBanks + totalAgents + customerReceivables;
  const totalLiabilities = customerLiabilities;
  const equity = totalAssets - totalLiabilities;
  const isBalanced = Math.abs(totalAssets - (totalLiabilities + equity)) < 1;

  const getBankTotal = (bankId) => {
    const b = (bankBalancesData || []).find(x => String(x.bank_id) === String(bankId));
    return b ? { [b.currency]: b.current_balance || 0 } : {};
  };

  const getAgentTotal = (agentId) => {
    const a = (agentBalancesData || []).find(x => String(x.agent_id) === String(agentId));
    return a ? { [a.currency || 'AFN']: a.balance || 0 } : {};
  };

  return (
    <>
      <PageHeader title="ترازنامه" icon={Scale}
        actions={
          <div className="flex gap-1">
            <Button size="sm" variant="outline" onClick={() => exportExcel('sheet', cash)}><FileSpreadsheet className="w-4 h-4" /></Button>
            <Button size="sm" variant="outline" onClick={() => window.print()}><Printer className="w-4 h-4" /></Button>
          </div>
        }
      />
      {isLoading ? <LoadingState /> : (
        <div className="space-y-4">
          <div className={`flex items-center gap-2 p-3 rounded-lg ${isBalanced ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
            {isBalanced ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span className="text-sm font-medium">{isBalanced ? 'ترازنامه متوازن است' : 'ترازنامه ناتراز است — بررسی کنید'}</span>
          </div>

          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-2 text-primary">دارایی‌ها</h3>
              <div className="space-y-1">
                <div className="flex justify-between text-sm"><span>صندوق</span><span className="font-mono">{formatNumber(totalCash)}</span></div>
                {(bankAccounts || []).map(b => {
                  const bal = getBankTotal(b.id);
                  const total = Object.values(bal).reduce((s, v) => s + (v || 0), 0);
                  return <div key={b.id} className="flex justify-between text-sm"><span>{b.bank_name}</span><span className="font-mono">{formatNumber(total)}</span></div>;
                })}
                {(agents || []).map(a => {
                  const bal = getAgentTotal(a.id);
                  const total = Object.values(bal).reduce((s, v) => s + (v || 0), 0);
                  return <div key={a.id} className="flex justify-between text-sm"><span>{a.name}</span><span className="font-mono">{formatNumber(total)}</span></div>;
                })}
                <div className="flex justify-between text-sm font-bold border-t pt-1 mt-1"><span>جمع دارایی‌ها</span><span className="font-mono">{formatNumber(totalAssets)}</span></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-2 text-destructive">بدهی‌ها</h3>
              <div className="space-y-1">
                <div className="flex justify-between text-sm"><span>بدهی به مشتریان</span><span className="font-mono">{formatNumber(customerLiabilities)}</span></div>
                <div className="flex justify-between text-sm font-bold border-t pt-1 mt-1"><span>جمع بدهی‌ها</span><span className="font-mono">{formatNumber(totalLiabilities)}</span></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-2 text-success">سرمایه و سود/زیان</h3>
              <div className="space-y-1">
                <div className="flex justify-between text-sm"><span>طلب از مشتریان</span><span className="font-mono">{formatNumber(customerReceivables)}</span></div>
                <div className="flex justify-between text-sm"><span>مانده حساب (دارایی - بدهی)</span><span className="font-mono">{formatNumber(equity)}</span></div>
                <div className="flex justify-between text-sm font-bold border-t pt-1 mt-1"><span>جمع سرمایه</span><span className="font-mono">{formatNumber(customerReceivables + equity)}</span></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex justify-between text-sm font-bold">
                <span>جمع بدهی‌ها + سرمایه</span>
                <span className="font-mono">{formatNumber(totalLiabilities + customerReceivables + equity)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold mt-1">
                <span>جمع دارایی‌ها</span>
                <span className="font-mono">{formatNumber(totalAssets)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}