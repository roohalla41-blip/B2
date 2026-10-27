import React, { useState, useEffect } from 'react';
import { useFeatures } from '@/lib/useSarraaf';
import { isFeatureUpdating } from '@/lib/features';
import { PageHeader } from '@/components/sarraaf/Pieces';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, AlertCircle, Settings as SettingsIcon, Lock } from 'lucide-react';
import BankGatewayManager from '@/components/sarraaf/BankGatewayManager';

export default function PaymentGateway() {
  const { data: features } = useFeatures();
  const isUpdating = isFeatureUpdating(features, 'payment_gateway');
  const [showManager, setShowManager] = useState(false);

  return (
    <>
      <PageHeader title="درگاه پرداخت بانکی" icon={CreditCard} />

      {/* Status banner */}
      <Card className="mb-4 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-1">
              درگاه بانکی در حال راه‌اندازی
            </h3>
            <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
              این بخش در حال توسعه است. اتصال به درگاه بانکی واقعی به‌زودی فعال خواهد شد.
              در حال حاضر امکان پرداخت آنلاین از طریق درگاه بانکی در دسترس نیست.
            </p>
            <Badge variant="outline" className="mt-2 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700">
              وضعیت: در حال به‌روزرسانی
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Feature info cards */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Lock className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
            <p className="text-xs font-medium">امنیت بانکی</p>
            <p className="text-[10px] text-muted-foreground mt-1">رمزنگاری SSL و احراز هویت دو مرحله‌ای</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CreditCard className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
            <p className="text-xs font-medium">پرداخت آنلاین</p>
            <p className="text-[10px] text-muted-foreground mt-1">شارژ کیف پول و پرداخت سفارشات</p>
          </CardContent>
        </Card>
      </div>

      {/* Admin gateway management (admin/creator only) */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold">پیکربندی درگاه‌ها</h3>
              <p className="text-xs text-muted-foreground">مدیریت تنظیمات درگاه‌های پرداخت (برای فعال‌سازی آینده)</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setShowManager(!showManager)}>
              <SettingsIcon className="w-4 h-4" />
              <span className="text-xs mr-1">{showManager ? 'بستن' : 'مدیریت'}</span>
            </Button>
          </div>
          {showManager && <BankGatewayManager />}
        </CardContent>
      </Card>
    </>
  );
}