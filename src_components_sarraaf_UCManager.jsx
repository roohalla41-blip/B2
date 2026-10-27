import React, { useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Gamepad2 } from 'lucide-react';
import UCPackages from './uc/UCPackages';
import UCTopupReview from './uc/UCTopupReview';
import UCOrderReview from './uc/UCOrderReview';
import { ensureUCService } from '@/lib/ucApi';
import { useFeatures, useToggleFeature } from '@/lib/useSarraaf';
import { useAuth } from '@/lib/AuthContext';
import { toast } from '@/components/ui/use-toast';

export default function UCManager() {
  const { user } = useAuth();
  const { data: features, refetch } = useFeatures();
  const toggleMut = useToggleFeature();

  useEffect(() => { ensureUCService().catch(() => {}); }, []);

  const ucFeature = features?.find(f => f.feature_key === 'pubg_uc');
  const ucEnabled = ucFeature ? ucFeature.enabled !== false : true;

  const handleToggle = async () => {
    if (!ucFeature) {
      // Create feature record
      try {
        const { createSupabaseEntity } = await import('@/lib/supabaseApi');
        const sb = createSupabaseEntity('FeatureSetting');
        await sb.create({
          feature_key: 'pubg_uc',
          name: 'UC پابجی موبایل',
          icon: 'Gamepad2',
          location: 'nav',
          display_order: 28,
          enabled: false,
          status: 'disabled',
        });
        if (refetch) refetch();
        toast({ title: 'بخش UC غیرفعال شد' });
      } catch (err) {
        toast({ title: 'خطا', description: err.message, variant: 'destructive' });
      }
      return;
    }
    toggleMut.mutate({ id: ucFeature.id, enabled: !ucEnabled });
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Gamepad2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">مدیریت UC پابجی موبایل</h3>
              <p className="text-[10px] text-muted-foreground">بسته‌ها، شارژ کیف پول و سفارش‌ها</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{ucEnabled ? 'فعال' : 'غیرفعال'}</span>
            <Switch checked={ucEnabled} onCheckedChange={handleToggle} />
          </div>
        </div>

        <Tabs defaultValue="packages">
          <TabsList className="w-full">
            <TabsTrigger value="packages" className="flex-1">بسته‌ها</TabsTrigger>
            <TabsTrigger value="topups" className="flex-1">شارژها</TabsTrigger>
            <TabsTrigger value="orders" className="flex-1">سفارش‌ها</TabsTrigger>
          </TabsList>
          <TabsContent value="packages" className="mt-3"><UCPackages /></TabsContent>
          <TabsContent value="topups" className="mt-3"><UCTopupReview /></TabsContent>
          <TabsContent value="orders" className="mt-3"><UCOrderReview /></TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}