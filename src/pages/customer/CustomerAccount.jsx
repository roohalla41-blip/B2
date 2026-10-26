import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import {
  loadAccountProfile, loadAccountBalances, loadTransactions,
} from '@/lib/accountMockData';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Landmark, Wallet, Package, MessageSquare, ArrowRight,
  RefreshCw, ShieldCheck,
} from 'lucide-react';
import AccountSummary from '@/components/customer/account/AccountSummary';
import TransactionHistory from '@/components/customer/account/TransactionHistory';

const STATUS_LABELS = {
  active: { label: 'فعال', color: 'bg-success/10 text-success' },
  suspended: { label: 'معلق', color: 'bg-destructive/10 text-destructive' },
  inactive: { label: 'غیرفعال', color: 'bg-muted text-muted-foreground' },
};

export default function CustomerAccount() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [balances, setBalances] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [prof, bals, txns] = await Promise.all([
        loadAccountProfile(user), loadAccountBalances(user?.id), loadTransactions(user?.id),
      ]);
      setProfile(prof);
      setBalances(bals);
      setTransactions(txns);
    } catch (e) {
      setError(true);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-6 w-32" />
        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
        <Skeleton className="h-6 w-32" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-bold text-foreground">حساب من با صراف</h1>
        <Card>
          <CardContent className="p-8 text-center space-y-4">
            <p className="text-sm text-muted-foreground">دریافت اطلاعات با مشکل مواجه شد.</p>
            <Button onClick={loadData} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 ml-2" />
              تلاش مجدد
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const st = STATUS_LABELS[profile?.account_status] || STATUS_LABELS.active;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Landmark className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-foreground">حساب من با صراف</h1>
            <p className="text-xs text-muted-foreground">وضعیت مالی شما با صرافی</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/customer')}>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Customer & Exchange Info */}
      <Card className="shadow-sm">
        <CardContent className="p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] text-muted-foreground">نام مشتری</p>
              <p className="text-xs font-medium text-foreground">{profile?.customer_name || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">کد مشتری</p>
              <p className="text-xs font-mono text-foreground">{profile?.customer_code || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">نام صرافی</p>
              <p className="text-xs font-medium text-foreground">{profile?.exchange_name || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">کد صرافی</p>
              <p className="text-xs font-mono text-foreground">{profile?.exchange_code || '—'}</p>
            </div>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <span className="text-[10px] text-muted-foreground">وضعیت حساب:</span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-medium ${st.color}`}>
              <ShieldCheck className="w-3 h-3" />
              {st.label}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Account Summary */}
      <AccountSummary balances={balances} lastUpdated={profile?.last_updated} />

      {/* Transaction History */}
      <TransactionHistory transactions={transactions} />

      {/* Quick Links */}
      <div className="grid grid-cols-3 gap-2">
        <Button variant="outline" className="flex-col h-auto py-3 gap-1" onClick={() => navigate('/customer/wallet')}>
          <Wallet className="w-4 h-4" />
          <span className="text-[10px]">کیف پول</span>
        </Button>
        <Button variant="outline" className="flex-col h-auto py-3 gap-1" onClick={() => navigate('/customer/orders')}>
          <Package className="w-4 h-4" />
          <span className="text-[10px]">سفارش‌های من</span>
        </Button>
        <Button variant="outline" className="flex-col h-auto py-3 gap-1" onClick={() => navigate('/customer/messages')}>
          <MessageSquare className="w-4 h-4" />
          <span className="text-[10px]">پیام‌ها</span>
        </Button>
      </div>

      {/* Info Note */}
      <div className="rounded-xl bg-muted/50 p-3 text-center">
        <p className="text-[10px] text-muted-foreground">
          این اطلاعات توسط صراف شما ثبت و به‌روزرسانی می‌شود. شما فقط اطلاعات حساب خودتان را مشاهده می‌کنید.
        </p>
      </div>
    </div>
  );
}