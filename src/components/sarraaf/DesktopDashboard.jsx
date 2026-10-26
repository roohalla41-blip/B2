import React from 'react';
import { buildSummaryCards } from '@/lib/dashboardStats';
import DashboardIdentityBar from '@/components/sarraaf/DashboardIdentityBar';
import DesktopSummaryCards from '@/components/sarraaf/DesktopSummaryCards';
import CurrencyRatesTable from '@/components/sarraaf/CurrencyRatesTable';
import DashboardCharts from '@/components/sarraaf/DashboardCharts';
import RecentTransactionsCard from '@/components/sarraaf/RecentTransactionsCard';
import DesktopSidePanel from '@/components/sarraaf/DesktopSidePanel';
import DesktopPlanPanel from '@/components/sarraaf/DesktopPlanPanel';

export default function DesktopDashboard({ profile, currencies, curLoading, txs, txLoading, customers, custLoading, treasuryBalances, treasuryLoading, bankBalances, bankLoading, debtorCount, plan }) {
  const cards = buildSummaryCards({
    txs, customers, treasuryBalances, bankBalances, debtorCount, currencies,
    loading: { bank: bankLoading, treasury: treasuryLoading, customers: custLoading, sent: txLoading, received: txLoading },
  });

  return (
    <div>
      <DashboardIdentityBar profile={profile} />
      <DesktopSummaryCards cards={cards} />
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_300px] gap-5">
        <div className="space-y-5 min-w-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <CurrencyRatesTable currencies={currencies} isLoading={curLoading} />
            <DashboardCharts type="line" transactions={txs} isLoading={txLoading} />
          </div>
          <RecentTransactionsCard transactions={txs || []} isLoading={txLoading} />
        </div>
        <div className="space-y-4 min-w-0">
          <DesktopSidePanel currencies={currencies} />
          <DesktopPlanPanel {...plan} />
        </div>
      </div>
    </div>
  );
}