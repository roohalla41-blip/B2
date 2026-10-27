import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import CampaignBanner from '@/components/sarraaf/CampaignBanner';
import UsageBar from '@/components/sarraaf/UsageBar';
import { DEFAULT_FREE_QUOTAS } from '@/lib/pricingService';

export default function DesktopPlanPanel({ isTrial, trialDaysRemaining, showUpgradeUI, paidSystemEnabled, openUpgrade, custCount, todayTransferCount, monthTxCount }) {
  return (
    <div className="space-y-4">
      {isTrial && (
        <Card className="overflow-hidden border-purple-200 bg-gradient-to-l from-purple-50 to-indigo-50 dark:border-purple-900 dark:from-purple-950/30 dark:to-indigo-950/30 shadow-card">
          <CardContent className="p-3.5 flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-purple-500 flex items-center justify-center shrink-0">
              <span className="text-white text-sm font-bold">★</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground">دوره آزمایشی رایگان</p>
              <p className="text-xs text-muted-foreground">{trialDaysRemaining} روز باقی‌مانده</p>
            </div>
          </CardContent>
        </Card>
      )}

      {paidSystemEnabled !== false && !isTrial && <CampaignBanner onUpgrade={() => openUpgrade()} />}

      {showUpgradeUI && (
        <Card className="shadow-card">
          <CardContent className="p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">مصرف طرح رایگان</span>
              <button onClick={() => openUpgrade('customers')} className="text-xs text-primary font-medium">ارتقا →</button>
            </div>
            <UsageBar label="مشتریان" used={custCount} limit={DEFAULT_FREE_QUOTAS.customers} />
            <UsageBar label="حواله امروز" used={todayTransferCount} limit={DEFAULT_FREE_QUOTAS.daily_transfers} />
            <UsageBar label="تراکنش ماه" used={monthTxCount} limit={DEFAULT_FREE_QUOTAS.monthly_transactions} />
          </CardContent>
        </Card>
      )}

      {showUpgradeUI && !isTrial && (
        <div className="rounded-xl border border-warning/30 bg-warning/5 p-3 flex items-center gap-2">
          <span className="text-xs text-muted-foreground flex-1">🏷️ نسخه رایگان — با ارتقا، برند سازنده حذف می‌شود</span>
          <button onClick={() => openUpgrade()} className="text-xs text-primary font-medium whitespace-nowrap">ارتقا →</button>
        </div>
      )}
    </div>
  );
}