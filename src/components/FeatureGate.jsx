import React from 'react';
import { useFeatures } from '@/lib/useSarraaf';
import { isFeatureEnabled, getFeatureStatus } from '@/lib/features';
import { Loader2, ShieldAlert, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import UpdatingNotice from '@/components/sarraaf/UpdatingNotice';

export default function FeatureGate({ featureKey, children }) {
  const { data: features, isLoading, isError, error, refetch, isFetching } = useFeatures();

  if (isLoading || isFetching && !features) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12" role="status" aria-live="polite">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">در حال دریافت تنظیمات بخش…</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-center" role="alert">
        <ShieldAlert className="w-10 h-10 text-destructive" />
        <p className="font-semibold">اتصال تنظیمات این بخش ناموفق بود</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          {error?.message || 'پاسخی از سرویس دریافت نشد. اتصال اینترنت و تنظیمات Supabase را بررسی کنید.'}
        </p>
        <Button onClick={() => refetch()} disabled={isFetching} className="gap-2">
          {isFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          تلاش دوباره
        </Button>
      </div>
    );
  }

  const status = getFeatureStatus(features || [], featureKey);

  if (!isFeatureEnabled(features || [], featureKey) || status === 'disabled') {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <ShieldAlert className="w-12 h-12 text-muted-foreground/40 mb-3" />
        <p className="text-base font-semibold">این بخش غیرفعال است</p>
        <p className="text-sm text-muted-foreground mt-1">
          برای فعال‌سازی، با مدیر سیستم تماس بگیرید
        </p>
      </div>
    );
  }

  if (status === 'updating') {
    const f = features?.find(fx => fx.feature_key === featureKey);
    return (
      <div>
        {children}
        <UpdatingNotice message={f?.message} />
      </div>
    );
  }

  return children;
}