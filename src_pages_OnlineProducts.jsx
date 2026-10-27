import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { PageHeader } from '@/components/sarraaf/Pieces';
import { Card, CardContent } from '@/components/ui/card';
import { offlineDB } from '@/lib/offlineQueue';
import {
  Wallet, Smartphone, Gamepad2, ShoppingBag, Package,
} from 'lucide-react';

const PRODUCT_SECTIONS = [
  { path: '/online-products/wallet', label: 'کیف پول', desc: 'ایجاد و مدیریت کیف پول', icon: Wallet, color: 'bg-blue-500' },
  { path: '/online-products/recharge', label: 'شارژ و اینترنت', desc: 'شارژ سیم‌کارت و بسته اینترنت', icon: Smartphone, color: 'bg-green-500' },
  { path: '/online-products/games', label: 'بازی‌ها', desc: 'UC پابجی، جم کلش و...', icon: Gamepad2, color: 'bg-purple-500' },
];

export default function OnlineProducts() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [wallets, setWallets] = useState([]);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const w = await offlineDB.Wallet.list();
        setWallets(w || []);
        const o = await offlineDB.OnlineOrder.list();
        setOrders(o || []);
      } catch {
        // ignore
      }
    };
    load();
  }, []);

  const totalBalance = wallets.reduce((s, w) => s + (w.balance || 0), 0);
  const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'processing' || o.status === 'new').length;

  return (
    <>
      <PageHeader title="محصولات آنلاین" subtitle="خدمات دیجیتال و مالی" icon={ShoppingBag} />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                <Wallet className="w-4 h-4 text-blue-500" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground">موجودی کیف پول‌ها</p>
                <p className="text-sm font-bold truncate">{totalBalance.toLocaleString()} <span className="text-[10px] text-muted-foreground">مجموع</span></p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center shrink-0">
                <Package className="w-4 h-4 text-rose-500" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground">سفارش‌های فعال</p>
                <p className="text-sm font-bold truncate">{pendingOrders} <span className="text-[10px] text-muted-foreground">در حال انجام</span></p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Product Grid */}
      <div>
        <h2 className="text-sm font-bold text-foreground mb-3">امکانات</h2>
        <div className="grid grid-cols-3 gap-3">
          {PRODUCT_SECTIONS.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.path}
                onClick={() => navigate(section.path)}
                className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border bg-card hover:border-primary/40 hover:shadow-md transition-all text-center"
              >
                <div className={`w-12 h-12 rounded-2xl ${section.color} flex items-center justify-center shadow-sm`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-[11px] font-bold text-foreground leading-tight">{section.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}