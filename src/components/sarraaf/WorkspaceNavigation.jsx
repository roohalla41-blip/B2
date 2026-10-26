import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const GROUPS = [
  ['داشبورد', ['dashboard', 'customers', 'trade', 'dadogereft', 'cash', 'bank', 'receipt']],
  ['حواله', ['transfer_send', 'transfer_receive', 'transfer_book']],
  ['مالی و حسابداری', ['reports', 'profit_loss', 'debtors', 'journal', 'general_ledger', 'balance_sheet', 'reconciliation']],
  ['بازار و نرخ', ['currencies', 'sarraaf_market', 'convert']],
  ['امکانات کسب‌وکار', ['agents', 'agency_network', 'online_products', 'payment_gateway', 'sarraaf_chat', 'chat_groups']],
  ['سیستم', ['settings', 'backup', 'support']],
];

export default function WorkspaceNavigation({ items }) {
  const { pathname } = useLocation();
  const activePath = items.filter(item => pathname === item.path || pathname.startsWith(item.path + '/')).sort((a, b) => b.path.length - a.path.length)[0]?.path;
  return (
    <nav aria-label="منوی اصلی صراف" className="flex-1 min-h-0 overflow-y-auto scrollbar-thin px-2 py-3 space-y-1">
      {GROUPS.map(([title, keys], index) => {
        const entries = keys.map(key => items.find(item => item.featureKey === key)).filter(Boolean);
        if (!entries.length) return null;
        const isDefaultOpen = index === 0 || entries.some(item => item.path === activePath);
        return (
          <details key={title} open={isDefaultOpen} className="group">
            <summary className="flex items-center justify-between gap-2 list-none cursor-pointer rounded-md px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-400 hover:text-slate-200 transition-colors [&::-webkit-details-marker]:hidden">
              {title}
              <ChevronDown className="w-3.5 h-3.5 shrink-0 text-slate-500 group-open:rotate-180 transition-transform" />
            </summary>
            <div className="space-y-0.5 mt-0.5">
              {entries.map(item => {
                const Icon = item.icon;
                const active = item.path === activePath;
                return (
                  <Link
                    key={item.featureKey}
                    to={item.path}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                      active
                        ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                        : 'text-slate-300 hover:bg-slate-700/60 hover:text-white'
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" strokeWidth={1.8} />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </details>
        );
      })}
    </nav>
  );
}