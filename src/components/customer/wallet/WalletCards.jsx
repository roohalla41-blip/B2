import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Banknote, DollarSign, Coins, Bitcoin, ChevronLeft } from 'lucide-react';

const CURRENCIES = [
  { code: 'AFN', name: 'افغانی', symbol: '؋', Icon: Banknote, gradient: 'from-blue-500 to-blue-600' },
  { code: 'USD', name: 'دلار آمریکا', symbol: '$', Icon: DollarSign, gradient: 'from-green-500 to-green-600' },
  { code: 'IRT', name: 'تومان', symbol: 'ت', Icon: Coins, gradient: 'from-amber-500 to-amber-600' },
  { code: 'USDT', name: 'تتر', symbol: '₮', Icon: Bitcoin, gradient: 'from-teal-500 to-teal-600' },
];

const WALLET_STATUS = {
  active: { label: 'فعال', color: 'bg-success/10 text-success' },
  inactive: { label: 'غیرفعال', color: 'bg-muted text-muted-foreground' },
};

function isCredit(t) {
  return ['receive', 'recharge', 'buy', 'correction'].includes(t.type);
}

export default function WalletCards({ wallets, transactions, rates, onWalletClick }) {
  const getWallet = (code) => wallets.find((w) => w.currency === code);
  const getLastTxn = (code) => transactions.find((t) => t.currency === code);

  const calculateTotal = () => {
    if (!rates || rates.length === 0) return null;
    const rateMap = {};
    rates.forEach((r) => { rateMap[r.currency] = r; });
    let total = 0;
    for (const w of wallets) {
      if (w.currency === 'AFN') {
        total += w.balance || 0;
      } else {
        const rate = rateMap[w.currency];
        if (!rate) return null;
        total += (w.balance || 0) * (rate.sell_rate || rate.buy_rate || 1);
      }
    }
    return total;
  };

  const totalValue = calculateTotal();

  return (
    <div className="space-y-3">
      {/* Summary Card */}
      <Card className="shadow-md border-primary/20">
        <CardContent className="p-4">
          <p className="text-[10px] text-muted-foreground mb-1">مجموع ارزش دارایی‌ها</p>
          {totalValue !== null ? (
            <p className="text-xl font-bold text-foreground">
              {Math.round(totalValue).toLocaleString('fa-IR')}{' '}
              <span className="text-xs text-muted-foreground">افغانی</span>
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              برای محاسبه مجموع ارزش، نرخ تبدیل کافی موجود نیست
            </p>
          )}
        </CardContent>
      </Card>

      {/* Currency Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {CURRENCIES.map((curr) => {
          const wallet = getWallet(curr.code);
          const lastTxn = getLastTxn(curr.code);
          const Icon = curr.Icon;
          const status = wallet ? (WALLET_STATUS[wallet.status] || WALLET_STATUS.active) : null;
          return (
            <button
              key={curr.code}
              onClick={() => onWalletClick(curr.code)}
              className="text-right"
            >
              <Card className="shadow-sm hover:shadow-md transition-shadow h-full">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${curr.gradient} flex items-center justify-center`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    {status && (
                      <span className={`text-[8px] px-1.5 py-0.5 rounded ${status.color}`}>
                        {status.label}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">{curr.name}</p>
                  {wallet ? (
                    <>
                      <p className="text-base font-bold text-foreground truncate">
                        {(wallet.balance || 0).toLocaleString('fa-IR')}
                      </p>
                      <p className="text-[9px] text-muted-foreground">
                        {curr.symbol} {curr.code}
                      </p>
                      {lastTxn && (
                        <p className={`text-[9px] mt-1 ${isCredit(lastTxn) ? 'text-success' : 'text-destructive'}`}>
                          {isCredit(lastTxn) ? '+' : '-'}
                          {(lastTxn.amount || 0).toLocaleString('fa-IR')}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-[10px] text-muted-foreground leading-tight">
                      هنوز کیف پولی برای این ارز ثبت نشده است
                    </p>
                  )}
                  <div className="flex items-center justify-end gap-0.5 mt-2 pt-2 border-t border-border">
                    <span className="text-[9px] text-primary font-medium">مشاهده جزئیات</span>
                    <ChevronLeft className="w-3 h-3 text-primary" />
                  </div>
                </CardContent>
              </Card>
            </button>
          );
        })}
      </div>
    </div>
  );
}