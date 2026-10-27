import React from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Wallet, ShoppingBag, Send, Users, MessageSquare, Coins } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function CustomerPanel() {
  const { user, logout } = useAuth();

  const MENU = [
    { label: 'کیف پول', icon: Wallet, action: () => {} },
    { label: 'محصولات', icon: ShoppingBag, action: () => {} },
    { label: 'حواله', icon: Send, action: () => {} },
    { label: 'چت و گروه‌ها', icon: MessageSquare, path: '/customer/chat' },
    { label: 'صراف‌های من', icon: Users, action: () => {} },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-background border-b">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Coins className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="text-sm font-bold">حساب مشتری</span>
        </div>
        <button onClick={() => logout()} className="text-xs text-muted-foreground">خروج</button>
      </header>

      <main className="max-w-md mx-auto p-4">
        <div className="text-center mb-6">
          <p className="text-sm text-muted-foreground">خوش آمدید</p>
          <p className="text-lg font-bold">{user?.full_name || user?.email}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          {MENU.map((item, i) => {
            const Icon = item.icon;
            if (item.path) {
              return (
                <Link key={i} to={item.path} className="flex flex-col items-center gap-2 p-4 rounded-xl border bg-card hover:bg-muted/30 transition-colors">
                  <Icon className="w-8 h-8 text-primary" />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              );
            }
            return (
              <button key={i} onClick={item.action} className="flex flex-col items-center gap-2 p-4 rounded-xl border bg-card hover:bg-muted/30 transition-colors">
                <Icon className="w-8 h-8 text-primary" />
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>

        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">پنل مشتری — نسخه اولیه</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}