import React from 'react';
import SupportPanel from '@/components/sarraaf/SupportPanel';
import ContactInfo from '@/components/sarraaf/ContactInfo';
import FeedbackButton from '@/components/sarraaf/FeedbackButton';
import ReferralCard from '@/components/sarraaf/ReferralCard';
import { Card, CardContent } from '@/components/ui/card';
import { LifeBuoy, UserPlus } from 'lucide-react';
import { useSarraafProfile, useToggleReferral } from '@/lib/useSarraaf';
import { useAuth } from '@/lib/AuthContext';

export default function CustomerSupport() {
  const { user } = useAuth();
  const { data: profile } = useSarraafProfile(user?.id);
  const toggleMut = useToggleReferral();

  const handleToggle = (enabled) => {
    if (!profile) return;
    toggleMut.mutate({ profileId: profile.id, enabled });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <LifeBuoy className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-bold">پشتیبانی</h1>
      </div>

      <ContactInfo />

      <SupportPanel />

      {/* Referral — share invite link */}
      <div className="flex items-center gap-2 pt-2">
        <UserPlus className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-semibold">دعوت دوستان</h2>
      </div>
      <ReferralCard
        profile={profile}
        onToggle={handleToggle}
        loading={toggleMut.isPending}
      />

      <Card>
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground mb-3">
            آیا بازخورد یا پیشنهادی دارید؟
          </p>
          <FeedbackButton />
        </CardContent>
      </Card>
    </div>
  );
}