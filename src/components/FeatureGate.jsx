import React from 'react';
import { useFeatures } from '@/lib/useSarraaf';
import { isFeatureEnabled, getFeatureStatus, getFeatureMessage } from '@/lib/features';
import { Loader2, ShieldAlert } from 'lucide-react';
import UpdatingNotice from '@/components/sarraaf/UpdatingNotice';

export default function FeatureGate({ featureKey, children }) {
  const { data: features, isLoading } = useFeatures();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
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
    return <UpdatingNotice message={getFeatureMessage(features || [], featureKey)} />;
  }

  return children;
}