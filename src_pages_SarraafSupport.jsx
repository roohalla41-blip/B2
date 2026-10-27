import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LifeBuoy, Headphones, MessageSquare } from 'lucide-react';
import ContactInfo from '@/components/sarraaf/ContactInfo';
import SupportPanel from '@/components/sarraaf/SupportPanel';
import ReferralCard from '@/components/sarraaf/ReferralCard';
import FeedbackButton from '@/components/sarraaf/FeedbackButton';
import { useSarraafProfile, useToggleReferral } from '@/lib/useSarraaf';
import { useAuth } from '@/lib/AuthContext';

export default function SarraafSupport() {
  const { user } = useAuth();
  const { data: profile } = useSarraafProfile(user?.id);
  const toggleMut = useToggleReferral();

  const handleToggle = (enabled) => {
    if (!profile) return;
    toggleMut.mutate({ profileId: profile.id, enabled });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Headphones className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-bold">پشتیبانی آنلاین</h1>
          <p className="text-xs text-muted-foreground">درخواست پشتیبانی و تماس با تیم</p>
        </div>
      </div>

      {/* Quick Contact */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <LifeBuoy className="w-4 h-4 text-primary" />
            تماس سریع
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ContactInfo />
        </CardContent>
      </Card>

      {/* Online Support Tickets */}
      <SupportPanel />

      {/* Referral — share invite link */}
      <ReferralCard
        profile={profile}
        onToggle={handleToggle}
        loading={toggleMut.isPending}
      />

      {/* Feedback */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-xs font-semibold text-muted-foreground">بازخورد و پیشنهاد</h3>
          </div>
          <FeedbackButton />
        </CardContent>
      </Card>
    </div>
  );
}