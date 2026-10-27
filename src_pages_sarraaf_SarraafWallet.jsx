import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { loadWallets, loadTransactions, loadRates } from '@/lib/walletMockData';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, RefreshCw } from 'lucide-react';
import WalletCards from '@/components/customer/wallet/WalletCards';
import WalletDetailSheet from '@/components/customer/wallet/WalletDetailSheet';
import TransactionHistory from '@/components/customer/wallet/TransactionHistory';
import AddFundsSheet from '@/components/customer/wallet/AddFundsSheet';

export default function SarraafWallet() {
  const { user } = useAuth();
  const [wallets, setWallets] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState(null);
  const [addFundsOpen, setAddFundsOpen] = useState(false);

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
    } catch {
      setError(true);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-20 w-full rounded-xl" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
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
        <h1 className="text-lg font-bold text-foreground">کیف پول</h1>
        <Card>
          <CardContent className="p-8 text-center space-y-4">
            <p className="text-sm text-muted-foreground">دریافت اطلاعات کیف پول با مشکل مواجه شد.</p>
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
      <div className="min-w-0">
        <h1 className="text-lg font-bold text-foreground">کیف پول</h1>
        <p className="text-xs text-muted-foreground truncate">
          {user?.full_name || 'صراف'}
        </p>
      </div>

      <Button onClick={() => setAddFundsOpen(true)} className="w-full">
        <Plus className="w-4 h-4 ml-2" />
        افزودن موجودی
      </Button>

      <WalletCards
        wallets={wallets}
        transactions={transactions}
        rates={rates}
        onWalletClick={setSelectedCurrency}
      />

      <WalletDetailSheet
        open={!!selectedCurrency}
        onOpenChange={(open) => !open && setSelectedCurrency(null)}
        currency={selectedCurrency}
        wallets={wallets}
        transactions={transactions}
      />

      <TransactionHistory transactions={transactions} />

      <AddFundsSheet
        open={addFundsOpen}
        onOpenChange={setAddFundsOpen}
        user={user}
      />
    </div>
  );
}