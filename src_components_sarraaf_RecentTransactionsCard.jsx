import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Clock, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState, LoadingState } from '@/components/sarraaf/Pieces';
import DesktopTransactionTable from '@/components/sarraaf/DesktopTransactionTable';

export default function RecentTransactionsCard({ transactions, isLoading }) {
  const navigate = useNavigate();
  return (
    <Card className="shadow-card">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold">آخرین تراکنش‌ها</h2>
        </div>
        <Link to="/reports" className="text-xs text-primary font-medium hover:underline">مشاهده همه</Link>
      </div>
      <CardContent className="p-0">
        {isLoading ? (
          <LoadingState />
        ) : transactions.length === 0 ? (
          <EmptyState icon={FileText} title="تراکنشی ثبت نشده" description="اولین عملیات خود را انجام دهید" />
        ) : (
          <DesktopTransactionTable transactions={transactions.slice(0, 8)} onOpen={tx => navigate(`/receipt?type=tx&id=${tx.id}`)} />
        )}
      </CardContent>
    </Card>
  );
}