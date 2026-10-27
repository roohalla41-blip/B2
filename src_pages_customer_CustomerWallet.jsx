import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { loadWallets, loadTransactions, loadRates } from '@/lib/walletMockData';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, Landmark, Wifi, WifiOff, RefreshCw, Plus, ArrowDownToLine } from 'lucide-react';
import WalletCards from '@/components/customer/wallet/WalletCards';
import WalletDetailSheet from '@/components/customer/wallet/WalletDetailSheet';
import TransactionHistory from '@/components/customer/wallet/TransactionHistory';
import AddFundsSheet from '@/components/customer/wallet/AddFundsSheet';

export default function CustomerWallet() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [wallets, setWallets] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState(null);
  const [addFundsOpen, setAddFundsOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(false);
    try {
      const [w, t, r] = await Promise.all([
        loadWallets(user.id),
        loadTransactions(user.id),
        loadRates(),
      ]);
      setWallets(w);
      setTransactions(t);
      setRates(r);
    } catch (e) {
      setError(true);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);



  useEffect(() => {
    const updateOnline = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);
    return () => {
      window.removeEventListener('online', updateOnline);
      window.removeEventListener('offline', updateOnline);
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-9 w-9 rounded-lg" />
        </div>
        <Skeleton className="h-20 w-full rounded-xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-6 w-32" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-lg font-bold text-foreground">کیف پول من</h1>
          <p className="text-xs text-muted-foreground">موجودی و گردش کیف پول</p>
        </div>
        <Card>
          <CardContent className="p-8 text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              دریافت اطلاعات کیف پول با مشکل مواجه شد.
            </p>
            <Button onClick={loadData} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 ml-2" />
              تلاش مجدد
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-foreground">کیف پول من</h1>
          <p className="text-xs text-muted-foreground truncate">
            {user?.full_name || 'مشتری'}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-medium ${
              isOnline ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
            }`}
          >
            {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {isOnline ? 'آنلاین' : 'آفلاین'}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => navigate('/customer')}
          >
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Add Funds / Withdraw Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <Button onClick={() => setAddFundsOpen(true)}>
          <Plus className="w-4 h-4 ml-2" />
          افزودن موجودی
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate('/customer/withdraw')}
        >
          <ArrowDownToLine className="w-4 h-4 ml-2" />
          برداشت
        </Button>
      </div>

      {/* Wallet Cards */}
      <WalletCards
        wallets={wallets}
        transactions={transactions}
        rates={rates}
        onWalletClick={setSelectedCurrency}
      />

      {/* Wallet Detail Sheet */}
      <WalletDetailSheet
        open={!!selectedCurrency}
        onOpenChange={(open) => !open && setSelectedCurrency(null)}
        currency={selectedCurrency}
        wallets={wallets}
        transactions={transactions}
      />

      {/* Transaction History */}
      <TransactionHistory transactions={transactions} />

      {/* Link to Account */}
      <Button
        variant="outline"
        className="w-full"
        onClick={() => navigate('/customer/account')}
      >
        <Landmark className="w-4 h-4 ml-2" />
        مشاهده حساب من با صراف
      </Button>

      {/* Add Funds Sheet */}
      <AddFundsSheet
        open={addFundsOpen}
        onOpenChange={setAddFundsOpen}
        user={user}
      />
    </div>
  );
}