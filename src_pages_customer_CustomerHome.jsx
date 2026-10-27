import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { offlineDB as db } from '@/lib/offlineQueue';
import { Card, CardContent } from '@/components/ui/card';
import { Wallet, Smartphone, Gamepad2, Send, Landmark, Package, MessageSquare, ArrowLeft, Globe } from 'lucide-react';

const SECTIONS = [
  { path: '/customer/wallet', label: 'کیف پول من', desc: 'موجودی و تاریخچه تراکنش‌ها', icon: Wallet, color: 'from-blue-500 to-blue-600' },
  { path: '/customer/recharge', label: 'شارژ و اینترنت', desc: 'شارژ سیم‌کارت و بسته اینترنت', icon: Smartphone, color: 'from-green-500 to-green-600' },
  { path: '/customer/afghan5', label: 'افغان۵', desc: 'خرید بسته از افغان۵', icon: Globe, color: 'from-cyan-500 to-cyan-600' },
  { path: '/customer/games', label: 'بازی‌ها', desc: 'UC پابجی، جم کلش و...', icon: Gamepad2, color: 'from-violet-500 to-violet-600' },
  { path: '/customer/transfer', label: 'ارسال پول / حواله', desc: 'ثبت درخواست ارسال پول', icon: Send, color: 'from-orange-500 to-orange-600' },
  { path: '/customer/account', label: 'حساب من با صراف', desc: 'طلب، بدهی و مانده حساب', icon: Landmark, color: 'from-cyan-500 to-cyan-600' },
  { path: '/customer/orders', label: 'سفارش‌ها و درخواست‌ها', desc: 'پیگیری سفارش‌ها', icon: Package, color: 'from-rose-500 to-rose-600' },
  { path: '/customer/messages', label: 'ارتباط و پیام‌ها', desc: 'چت با صراف و پیام‌ها', icon: MessageSquare, color: 'from-indigo-500 to-indigo-600' },
];

export default function CustomerHome() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [wallets, setWallets] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      try {
        const w = await db.Wallet.list();
        setWallets(w.filter(x => x.user_id === user.id));
        const go = await db.OnlineOrder.list();
        setOrders(go.filter(x => x.created_by_id === user.id));
      } catch {
        // ignore
      }
      setLoading(false);
    };
    loadData();
  }, [user]);

  const totalBalance = wallets.reduce((sum, w) => sum + (w.balance || 0), 0);
  const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'processing').length;

  return (
    <div className="space-y-5">
      {/* Welcome */}
      <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-5 text-primary-foreground shadow-card">
        <h1 className="text-xl font-bold">سلام {user?.full_name?.split(' ')[0] || 'کاربر'} 👋</h1>
        <p className="text-sm text-primary-foreground/80 mt-1">به پنل مشتری حساب صراف خوش آمدید</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-2.5">
        <Card className="shadow-card border-0">
          <CardContent className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium opacity-90">موجودی کیف پول</span>
              <Wallet className="w-4 h-4 opacity-80" />
            </div>
            <p className="text-lg font-bold tabular-nums">{totalBalance.toLocaleString()}</p>
            <p className="text-[10px] opacity-75 mt-0.5">مجموع</p>
          </CardContent>
        </Card>
        <Card className="shadow-card border-0">
          <CardContent className="p-4 bg-gradient-to-br from-rose-500 to-rose-600 text-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium opacity-90">سفارش‌های فعال</span>
              <Package className="w-4 h-4 opacity-80" />
            </div>
            <p className="text-lg font-bold tabular-nums">{pendingOrders}</p>
            <p className="text-[10px] opacity-75 mt-0.5">در حال انجام</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Sections */}
      <div>
        <h2 className="text-sm font-bold text-foreground mb-3">امکانات</h2>
        <div className="grid grid-cols-3 gap-2.5">
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.path}
                onClick={() => navigate(section.path)}
                className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-card-hover transition-all text-center group"
              >
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${section.color} flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform`}>
                  <Icon className="w-6 h-6 text-white" strokeWidth={2.2} />
                </div>
                <span className="text-[11px] font-bold text-foreground leading-tight">{section.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}