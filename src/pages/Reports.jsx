import React from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/sarraaf/Pieces';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, Banknote, Send, Network, TrendingUp, BookCopy, ScrollText, Scale } from 'lucide-react';

const REPORT_CARDS = [
  { label: 'تراکنش‌ها', path: '/general-ledger', icon: FileText, gradient: 'from-blue-500 to-blue-600' },
  { label: 'موجودی ارز', path: '/balance-sheet', icon: Banknote, gradient: 'from-green-500 to-green-600' },
  { label: 'حواله‌ها', path: '/transfer-book', icon: Send, gradient: 'from-orange-500 to-orange-600' },
  { label: 'نمایندگی‌ها', path: '/agents', icon: Network, gradient: 'from-cyan-500 to-cyan-600' },
  { label: 'سود و زیان', path: '/profit-loss', icon: TrendingUp, gradient: 'from-purple-500 to-purple-600' },
  { label: 'دفتر روزنامه', path: '/journal', icon: BookCopy, gradient: 'from-violet-500 to-violet-600' },
  { label: 'مغایرت‌گیری', path: '/reconciliation', icon: Scale, gradient: 'from-rose-500 to-rose-600' },
];

export default function Reports() {
  return (
    <>
      <PageHeader title="گزارش‌ها" icon={FileText} />
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {REPORT_CARDS.map(r => {
          const Icon = r.icon;
          return (
            <Link key={r.label} to={r.path}>
              <Card className="overflow-hidden hover:bg-muted/30 transition-colors">
                <CardContent className="p-4 flex flex-col md:flex-row items-center gap-2 md:gap-3">
                  <div className={`w-12 h-12 md:w-9 md:h-9 shrink-0 rounded-xl bg-gradient-to-br ${r.gradient} flex items-center justify-center`}>
                    <Icon className="w-6 h-6 md:w-5 md:h-5 text-white" />
                  </div>
                  <span className="text-sm font-medium text-center">{r.label}</span>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </>
  );
}