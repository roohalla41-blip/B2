import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { UserPlus, Gift, Copy, Share2, CheckCircle2, Users } from 'lucide-react';

// هدیه پیام فقط وقتی صراف دعوت‌شده با ایمیل تأیید شود (تقلب ممکن نیست)
const VERIFIED_SARRAAF_BONUS = 100;

export default function ReferralCard({ profile, onToggle, loading }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const enabled = profile?.referral_enabled || false;
  const code = profile?.referral_code || profile?.code || '';
  const inviteCount = profile?.referral_count || 0;
  const bonusQuota = profile?.referral_bonus_quota || 0;

  const shareUrl = enabled && code
    ? `${window.location.origin}/register?ref=${code}`
    : '';

  const handleCopy = () => {
    if (!code) return;
    navigator.clipboard.writeText(shareUrl || code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: 'کپی شد', description: 'لینک دعوت کپی شد' });
  };

  const handleShare = async () => {
    if (!shareUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'دعوت به حساب صراف',
          text: 'با کد دعوت من ثبت‌نام کنید و سهمیه بیشتری بگیرید',
          url: shareUrl,
        });
      } catch (e) {
        // کاربر لغو کرد
      }
    } else {
      handleCopy();
    }
  };

  return (
    <Card className={enabled ? 'border-primary/40' : ''}>
      <CardContent className="p-4 space-y-4">
        {/* Header with toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">کد دعوت دوستان</h3>
              <p className="text-[11px] text-muted-foreground">با دعوت دوستان سهمیه پیام بگیرید</p>
            </div>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={(v) => onToggle(v)}
            disabled={loading}
          />
        </div>

        {/* When enabled */}
        {enabled ? (
          <>
            {/* Referral code */}
            <div className="p-3 rounded-lg bg-muted/50 border border-dashed border-primary/30">
              <p className="text-[10px] text-muted-foreground mb-1">کد دعوت شما</p>
              <div className="flex items-center justify-between gap-2">
                <span className="text-lg font-bold tracking-widest text-primary">{code}</span>
                <Button size="sm" variant="ghost" className="h-7 px-2" onClick={handleCopy}>
                  {copied ? <CheckCircle2 className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              {shareUrl && (
                <p className="text-[9px] text-muted-foreground mt-1 break-all">{shareUrl}</p>
              )}
            </div>

            {/* Share button */}
            <Button variant="outline" className="w-full" onClick={handleShare}>
              <Share2 className="w-4 h-4" />
              اشتراک‌گذاری لینک دعوت
            </Button>

            {/* Bonus rule — verified sarraaf referral */}
            <div className="p-3 rounded-lg bg-success/10 text-center">
              <Gift className="w-5 h-5 mx-auto text-success mb-1" />
              <p className="text-sm font-bold text-success">+{VERIFIED_SARRAAF_BONUS} پیام</p>
              <p className="text-[10px] text-muted-foreground">برای هر صراف دعوت‌شده با ایمیل تأییدشده</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-0.5">
                  <Users className="w-3 h-3 text-muted-foreground" />
                  <span className="text-lg font-bold">{inviteCount}</span>
                </div>
                <p className="text-[9px] text-muted-foreground">صرافان دعوت‌شده</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-0.5">
                  <Gift className="w-3 h-3 text-success" />
                  <span className="text-lg font-bold text-success">{bonusQuota}</span>
                </div>
                <p className="text-[9px] text-muted-foreground">پیام هدیه</p>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-2">
            <p className="text-xs text-muted-foreground">
              کد دعوت غیرفعال است. با فعال کردن، صرافان دیگر را دعوت کنید.
              برای هر صراف دعوت‌شده که با ایمیل تأیید شود،
              <span className="text-success font-bold"> +{VERIFIED_SARRAAF_BONUS} پیام </span>
              هدیه می‌گیرید — چون تأیید با ایمیل است، تقلب ممکن نیست.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}