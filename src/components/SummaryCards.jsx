import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useLanguage } from '@/lib/i18n';
import { offlineDB } from '@/lib/offlineQueue';
import { Card, CardContent } from '@/components/ui/card';
import { Wallet, TrendingUp, Send, Users, Loader2 } from 'lucide-react';

const DEFAULT_CURRENCIES = ['AFN', 'USD', 'IRR', 'TMN', 'KLD', 'EUR'];

export default function SummaryCards() {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [treasury, setTreasury] = useState({});
  const [todayProfit, setTodayProfit] = useState(0);
  const [todayTransfers, setTodayTransfers] = useState(0);
  const [customers, setCustomers] = useState(0);

  useEffect(() => {
    const code = user?.exchange_code;
    if (!code) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const today = new Date();
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
        const [txs, transfers, custs] = await Promise.all([
          offlineDB.list('Transaction').catch(() => []),
          offlineDB.list('Transfer').catch(() => []),
          offlineDB.list('Customer').catch(() => []),
        ]);
        if (cancelled) return;
        const bal = {};
        (txs || []).forEach(t => {
          const c = t.currency || 'AFN';
          bal[c] = (bal[c] || 0) + (t.amount || 0);
        });
        const todayTrans = (transfers || []).filter(t => t.created_date && new Date(t.created_date) >= todayStart).length;
        const profit = (txs || []).filter(t => t.type === 'trade' && t.created_date && new Date(t.created_date) >= todayStart)
          .reduce((s, t) => s + ((t.sell_amount - t.buy_amount) || 0), 0);
        setTreasury(bal);
        setTodayProfit(profit);
        setTodayTransfers(todayTrans);
        setCustomers((custs || []).length);
      } catch {
        // ignore — values stay at defaults
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user?.exchange_code]);

  const treasuryTotal = Object.values(treasury).reduce((s, v) => s + (v || 0), 0);

  const cards = [
    {
      icon: Wallet,
      label: t('treasury.current_balance'),
      value: loading ? null : `${formatNum(treasuryTotal)}`,
      sub: loading ? '' : `${Object.keys(treasury).length || DEFAULT_CURRENCIES.length} ${t('common.currency')}`,
      gradient: 'from-success to-success/80',
    },
    {
      icon: TrendingUp,
      label: lang === 'english' ? "Today's Profit" : 'سود امروز',
      value: loading ? null : `${formatNum(todayProfit)}`,
      sub: '',
      gradient: 'from-primary to-primary/80',
    },
    {
      icon: Send,
      label: lang === 'english' ? "Today's Transfers" : 'حواله امروز',
      value: loading ? null : `${todayTransfers}`,
      sub: '',
      gradient: 'from-chart-2 to-chart-2/80',
    },
    {
      icon: Users,
      label: t('menu.customers'),
      value: loading ? null : `${customers}`,
      sub: '',
      gradient: 'from-warning to-warning/80',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:gap-4">
      {cards.map((c, i) => {
        const Icon = c.icon;
        return (
          <Card key={i} className="overflow-hidden border-0 shadow-sm">
            <CardContent className={`p-4 lg:p-6 bg-gradient-to-br ${c.gradient} text-white`}>
              <div className="flex items-center justify-between mb-2 lg:mb-3">
                <span className="text-xs lg:text-sm font-medium opacity-90">{c.label}</span>
                <Icon className="w-4 h-4 lg:w-5 lg:h-5 opacity-80" />
              </div>
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin opacity-70" />
              ) : (
                <>
                  <p className="text-2xl lg:text-3xl font-bold leading-tight">{c.value}</p>
                  {c.sub && <p className="text-xs lg:text-sm opacity-75 mt-0.5">{c.sub}</p>}
                </>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function formatNum(n) {
  return new Intl.NumberFormat('en-US').format(Math.round(n || 0));
}