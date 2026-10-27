import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSandbox } from '@/components/sandbox/SandboxProvider';
import { SandboxAccounts } from '@/components/sandbox/SandboxAccounts';
import { SandboxExperience } from '@/components/sandbox/SandboxExperience';
import { SandboxIdentities } from '@/components/sandbox/SandboxIdentities';
import { SandboxSellerRequests } from '@/components/sandbox/SandboxSellerRequests';
import { SandboxWallet } from '@/components/sandbox/SandboxWallet';
import { SandboxShop } from '@/components/sandbox/SandboxShop';
import { SandboxSellerOrders } from '@/components/sandbox/SandboxSellerOrders';
import { SandboxDisputes } from '@/components/sandbox/SandboxDisputes';
import { SandboxReports } from '@/components/sandbox/SandboxReports';
import { SandboxSettings } from '@/components/sandbox/SandboxSettings';
import { FlaskConical, Lock } from 'lucide-react';

export default function SandboxPanel() {
  const { canAccess, session } = useSandbox();
  const [tab, setTab] = useState('accounts');

  if (!canAccess) {
    return (
      <Card><CardContent className="p-6 text-center space-y-2">
        <Lock className="w-8 h-8 mx-auto text-muted-foreground" />
        <h3 className="text-sm font-bold">دسترسی محدود</h3>
        <p className="text-xs text-muted-foreground">این بخش فقط برای حساب سازندهٔ اصلی قابل دسترسی است.</p>
      </CardContent></Card>
    );
  }

  // اگر نشست آزمایشی فعال است، پنل کامل نقش را نشان بده
  if (session) {
    return <SandboxExperience />;
  }

  const SUB = [
    { v: 'accounts', l: 'حساب‌ها' },
    { v: 'identities', l: 'هویت‌های سریع' },
    { v: 'requests', l: 'درخواست‌ها' },
    { v: 'wallet', l: 'کیف پول' },
    { v: 'shop', l: 'فروشگاه' },
    { v: 'orders', l: 'سفارش‌ها' },
    { v: 'disputes', l: 'پیگیری' },
    { v: 'reports', l: 'گزارش' },
    { v: 'settings', l: 'تنظیمات' },
  ];

  return (
    <div className="space-y-3">
      <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
        <CardContent className="p-3 flex items-center gap-2">
          <FlaskConical className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <p className="text-xs font-bold text-amber-800 dark:text-amber-300">محیط آزمایشی — کاملاً محلی</p>
            <p className="text-[11px] text-amber-700 dark:text-amber-400">حساب بسازید، وارد شوید و پنل کامل نقش را آزمایش کنید. داده‌ها فقط در این مرورگر هستند.</p>
          </div>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex overflow-x-auto scrollbar-thin w-full gap-0.5 justify-start">
          {SUB.map(s => (
            <TabsTrigger key={s.v} value={s.v} className="shrink-0 text-xs px-3">{s.l}</TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="accounts"><SandboxAccounts /></TabsContent>
        <TabsContent value="identities"><SandboxIdentities /></TabsContent>
        <TabsContent value="requests"><SandboxSellerRequests /></TabsContent>
        <TabsContent value="wallet"><SandboxWallet /></TabsContent>
        <TabsContent value="shop"><SandboxShop /></TabsContent>
        <TabsContent value="orders"><SandboxSellerOrders /></TabsContent>
        <TabsContent value="disputes"><SandboxDisputes /></TabsContent>
        <TabsContent value="reports"><SandboxReports /></TabsContent>
        <TabsContent value="settings"><SandboxSettings /></TabsContent>
      </Tabs>
    </div>
  );
}