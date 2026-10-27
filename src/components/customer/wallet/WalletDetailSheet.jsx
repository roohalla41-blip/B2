import React from 'react';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { Card, CardContent } from '@/components/ui/card';
import {
  TrendingUp, TrendingDown, ArrowLeftRight, ShoppingCart, Tag, RefreshCw, Wallet as WalletIcon,
} from 'lucide-react';

const CURRENCY_NAMES = { AFN: 'افغانی', USD: 'دلار آمریکا', IRT: 'تومان', USDT: 'تتر' };
const CURRENCY_SYMBOLS = { AFN: '؋', USD: '$', IRT: 'ت', USDT: '₮' };

function isCredit(t) {
  return ['receive', 'recharge', 'buy', 'correction'].includes(t.type);
}

const SUMMARY_ITEMS = [
  { type: 'receive', label: 'دریافت‌ها', Icon: TrendingUp, color: 'text-success', bg: 'bg-success/10' },
  { type: 'pay', label: 'پرداخت‌ها', Icon: TrendingDown, color: 'text-destructive', bg: 'bg-destructive/10' },
  { type: 'transfer', label: 'انتقال‌ها', Icon: ArrowLeftRight, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-950/30' },
  { type: 'buy', label: 'خریدها', Icon: ShoppingCart, color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-950/30' },
  { type: 'sell', label: 'فروش‌ها', Icon: Tag, color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-950/30' },
  { type: 'convert', label: 'تبدیل‌ها', Icon: RefreshCw, color: 'text-cyan-500', bg: 'bg-cyan-100 dark:bg-cyan-950/30' },
];

export default function WalletDetailSheet({ open, onOpenChange, currency, wallets, transactions }) {
  const wallet = currency ? wallets.find((w) => w.currency === currency) : null;
  const currencyTxns = currency ? transactions.filter((t) => t.currency === currency) : [];

  const currencyName = currency ? CURRENCY_NAMES[currency] || currency : '';
  const currencySymbol = currency ? CURRENCY_SYMBOLS[currency] || '' : '';

  const sumByType = (type) =>
    currencyTxns.filter((t) => t.type === type).reduce((s, t) => s + (t.amount || 0), 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>جزئیات کیف پول {currencyName}</SheetTitle>
          <SheetDescription>موجودی و گردش {currencyName}</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 mt-4">
          {/* Current Balance */}
          <Card className="shadow-sm">
            <CardContent className="p-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-2">
                <WalletIcon className="w-6 h-6 text-primary" />
              </div>
              <p className="text-[10px] text-muted-foreground">موجودی فعلی</p>
              <p className="text-2xl font-bold text-foreground">
                {wallet ? (wallet.balance || 0).toLocaleString('fa-IR') : '0'}
              </p>
              <p className="text-[10px] text-muted-foreground">{currencySymbol} {currency}</p>
            </CardContent>
          </Card>

          {/* Summary Grid */}
          <div className="grid grid-cols-3 gap-2">
            {SUMMARY_ITEMS.map((item) => {
              const Icon = item.Icon;
              return (
                <Card key={item.type} className="shadow-sm">
                  <CardContent className="p-2.5 text-center">
                    <div className={`w-7 h-7 rounded-lg ${item.bg} flex items-center justify-center mx-auto mb-1`}>
                      <Icon className={`w-4 h-4 ${item.color}`} />
                    </div>
                    <p className="text-[8px] text-muted-foreground">{item.label}</p>
                    <p className={`text-xs font-bold ${item.color}`}>
                      {sumByType(item.type).toLocaleString('fa-IR')}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Recent Transactions */}
          <div>
            <h3 className="text-sm font-bold text-foreground mb-2">آخرین تراکنش‌ها</h3>
            {currencyTxns.length === 0 ? (
              <Card>
                <CardContent className="p-4 text-center text-sm text-muted-foreground">
                  تراکنشی برای این ارز ثبت نشده است.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {currencyTxns.slice(0, 10).map((t) => {
                  const credit = isCredit(t);
                  return (
                    <Card key={t.id} className="shadow-sm">
                      <CardContent className="p-3 flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${credit ? 'bg-success/10' : 'bg-destructive/10'}`}>
                          {credit ? <TrendingUp className="w-4 h-4 text-success" /> : <TrendingDown className="w-4 h-4 text-destructive" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{t.description || 'تراکنش'}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(t.created_date).toLocaleDateString('fa-IR')}
                          </p>
                        </div>
                        <p className={`text-sm font-bold shrink-0 ${credit ? 'text-success' : 'text-destructive'}`}>
                          {credit ? '+' : '-'}{(t.amount || 0).toLocaleString('fa-IR')}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}