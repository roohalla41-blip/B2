import React from 'react';
import DashboardQuickOps from '@/components/sarraaf/DashboardQuickOps';
import DashboardNoticeCard from '@/components/sarraaf/DashboardNoticeCard';
import QuickConverter from '@/components/sarraaf/QuickConverter';

export default function DesktopSidePanel({ currencies }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-1 gap-4 content-start">
      <DashboardQuickOps />
      <DashboardNoticeCard />
      <QuickConverter currencies={currencies} />
    </div>
  );
}