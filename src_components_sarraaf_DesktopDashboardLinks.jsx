import React from 'react';

const ACTIONS = ['/trade', '/dadogereft', '/transfer-book'];
const LABELS = { '/trade': 'ثبت خرید / فروش', '/dadogereft': 'ثبت دریافت / پرداخت', '/transfer-book': 'عملیات حواله' };

export default function DesktopDashboardLinks({ allLinks, renderLink }) {
  return (
    <section className="hidden md:flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3 mb-5">
      <h2 className="text-xs font-semibold text-muted-foreground ml-2">عملیات سریع</h2>
      {ACTIONS.map(path => allLinks.find(link => link.path === path)).filter(Boolean).map(link => renderLink({ ...link, label: LABELS[link.path] }, false, true))}
    </section>
  );
}