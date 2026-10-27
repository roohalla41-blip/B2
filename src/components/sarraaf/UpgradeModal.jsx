// UpgradeModal.jsx — Two-path upgrade: invite friends or buy paid plan
import React, { useState } from 'react';
import { usePricingPlans, useDiscountCampaign } from '@/lib/usePricing';
import { useActivatePaidPlan } from '@/lib/useAdmin';
import { useToggleReferral } from '@/lib/useSarraaf';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { formatNumber, toPersianDigits } from '@/lib/sarraaf';
import { calculateDiscountedPrice, getTimeRemaining } from '@/lib/pricingService';
import { Check, Crown, Sparkles, X, Clock, UserPlus, Gift, ArrowRight } from 'lucide-react';

const PLAN_ICONS = { basic: Crown, pro: Sparkles, special: Crown };
const PLAN_GRADIENTS = {
  basic: 'from-blue-500 to-blue-600',
  pro: 'from-purple-500 to-purple-600',
  special: 'from-amber-500 to-amber-600',
};

const VERIFIED_SARRAAF_BONUS = 100;

// Feature hints: what each section unlocks in paid plans
const FEATURE_HINTS = {
  customers: { title: 'مشتریان نامحدود', desc: 'افزودن مشتریان نامحدود به‌جای سقف رایگان' },
  transfer: { title: 'حواله نامحدود', desc: 'ثبت حواله روزانه نامحدود' },
  trade: { title: 'معاملات نامحدود', desc: 'خرید و فروش بدون محدودیت ماهانه' },
  backup: { title: 'بکاپ ابری', desc: 'بکاپ‌گیری ابری و بازیابی داده‌ها' },
  reports: { title: 'گزارش‌های پیشرفته', desc: 'گزارش‌های کامل مالی و عملیاتی' },
  chat: { title: 'چت صراف‌ها', desc: 'دسترسی به بازار نرخ و چت صراف‌با‌صراف' },
  default: { title: 'ویژگی‌های ویژه', desc: 'محدودیت‌های طرح رایگان را بردارید' },
};

function CountdownTimer({ endDate }) {
  const [time, setTime] = useState(() => getTimeRemaining(endDate));
  React.useEffect(() => {
    const t = setInterval(() => setTime(getTimeRemaining(endDate)), 1000);
    return () => clearInterval(t);
  }, [endDate]);
  if (!time || time.expired) return null;
  return (
    <div className="flex items-center gap-1 text-xs font-bold text-red-600">
      <Clock className="w-3.5 h-3.5" />
      <span>{toPersianDigits(String(time.hours).padStart(2, '0'))}:{toPersianDigits(String(time.minutes).padStart(2, '0'))}:{toPersianDigits(String(time.seconds).padStart(2, '0'))}</span>
    </div>
  );
}

export default function UpgradeModal({ open, onClose, profile, featureHint }) {
  const { data: plans } = usePricingPlans();
  const { data: campaign } = useDiscountCampaign();
  const activateMut = useActivatePaidPlan();
  const toggleMut = useToggleReferral();
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [tab, setTab] = useState('paths'); // 'paths' | 'plans' | 'referral'

  const hint = FEATURE_HINTS[featureHint] || FEATURE_HINTS.default;

  const handleUpgrade = (plan) => {
    setSelectedPlan(plan.plan_key);
    const startDate = new Date().toISOString().split('T')[0];
    const endDate = new Date(Date.now() + plan.duration_months * 30 * 24 * 3600 * 1000).toISOString().split('T')[0];
    activateMut.mutate(
      { profile, plan: plan.plan_key, startDate, endDate, confirmedByName: profile?.name || 'صراف' },
      { onSuccess: () => onClose() }
    );
  };

  const handleToggleReferral = (enabled) => {
    toggleMut.mutate({ profileId: profile.id, enabled });
  };

  const referralEnabled = profile?.referral_enabled || false;
  const referralCode = profile?.referral_code || profile?.code || '';
  const shareUrl = referralEnabled && referralCode
    ? `${window.location.origin}/register?ref=${referralCode}`
    : '';

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>ارتقای حساب</span>
            <button onClick={onClose} className="p-1 rounded hover:bg-muted">
              <X className="w-4 h-4" />
            </button>
          </DialogTitle>
        </DialogHeader>

        {/* Feature hint banner */}
        {featureHint && (
          <div className="rounded-lg bg-primary/10 border border-primary/20 p-3 text-center">
            <p className="text-sm font-bold text-primary">{hint.title}</p>
            <p className="text-[11px] text-muted-foreground">{hint.desc}</p>
          </div>
        )}

        {/* Paths view */}
        {tab === 'paths' && (
          <div className="space-y-3">
            <button
              onClick={() => setTab('plans')}
              className="w-full text-right rounded-xl border-2 border-border p-4 hover:border-primary transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                  <Crown className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold">ارتقا به نسخه پولی</p>
                  <p className="text-[11px] text-muted-foreground">پلن‌های پایه، حرفه‌ای و ویژه</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground rotate-180" />
              </div>
            </button>

            <button
              onClick={() => setTab('referral')}
              className="w-full text-right rounded-xl border-2 border-border p-4 hover:border-success transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold">دعوت دوستان صراف</p>
                  <p className="text-[11px] text-muted-foreground">برای هر صراف تأییدشده +{VERIFIED_SARRAAF_BONUS} پیام</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground rotate-180" />
              </div>
            </button>
          </div>
        )}

        {/* Paid plans view */}
        {tab === 'plans' && (
          <div className="space-y-2">
            <button onClick={() => setTab('paths')} className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
              <ArrowRight className="w-3 h-3" /> بازگشت
            </button>

            {campaign && !campaign.expired && campaign.active && (
              <div className="rounded-lg bg-gradient-to-r from-red-500 to-orange-500 text-white p-3 text-center space-y-1">
                <p className="text-sm font-bold">🎉 تخفیف {toPersianDigits(campaign.percent)}٪ ویژه!</p>
                <p className="text-[10px] opacity-90">روی تمام پلن‌های پولی</p>
                <CountdownTimer endDate={campaign.end_date} />
              </div>
            )}

            {(plans || []).map(plan => {
              const Icon = PLAN_ICONS[plan.plan_key] || Crown;
              const pricing = calculateDiscountedPrice(plan.price, campaign);
              const isSelected = selectedPlan === plan.plan_key;
              return (
                <div key={plan.id} className={`rounded-xl border-2 p-3 transition-all ${isSelected ? 'border-primary shadow-md' : 'border-border'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${PLAN_GRADIENTS[plan.plan_key] || 'from-blue-500 to-blue-600'} flex items-center justify-center`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold">{plan.name}</p>
                      {plan.description && <p className="text-[10px] text-muted-foreground">{plan.description}</p>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    {pricing.discounted ? (
                      <>
                        <span className="text-lg font-bold text-primary">{formatNumber(pricing.final)}</span>
                        <span className="text-sm text-muted-foreground line-through">{formatNumber(plan.price)}</span>
                        <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-bold">{toPersianDigits(pricing.percent)}٪ تخفیف</span>
                      </>
                    ) : (
                      <span className="text-lg font-bold text-primary">{formatNumber(plan.price)}</span>
                    )}
                    <span className="text-xs text-muted-foreground">افغانی / ماه</span>
                  </div>

                  <ul className="space-y-1 mb-3">
                    {(plan.features || []).map((feat, i) => (
                      <li key={i} className="flex items-center gap-1.5 text-[11px]">
                        <Check className="w-3 h-3 text-green-600 shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>

                  <Button className="w-full" size="sm" disabled={activateMut.isPending && isSelected} onClick={() => handleUpgrade(plan)}>
                    {activateMut.isPending && isSelected ? 'در حال فعال‌سازی...' : `ارتقا به ${plan.name}`}
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {/* Referral view */}
        {tab === 'referral' && (
          <div className="space-y-3">
            <button onClick={() => setTab('paths')} className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
              <ArrowRight className="w-3 h-3" /> بازگشت
            </button>

            <div className="rounded-xl border-2 border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">فعال‌سازی دعوت</span>
                <button
                  onClick={() => handleToggleReferral(!referralEnabled)}
                  disabled={toggleMut.isPending}
                  className={`relative w-11 h-6 rounded-full transition-colors ${referralEnabled ? 'bg-success' : 'bg-muted'}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${referralEnabled ? 'right-0.5' : 'right-5'}`} />
                </button>
              </div>

              {referralEnabled ? (
                <>
                  <div className="rounded-lg bg-muted p-3 text-center">
                    <p className="text-[10px] text-muted-foreground mb-1">کد دعوت شما</p>
                    <p className="text-lg font-bold tracking-wider text-primary">{referralCode}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="p-2 rounded-lg bg-muted">
                      <p className="text-base font-bold">{profile?.referral_count || 0}</p>
                      <p className="text-[9px] text-muted-foreground">صرافان دعوت‌شده</p>
                    </div>
                    <div className="p-2 rounded-lg bg-muted">
                      <p className="text-base font-bold text-success">{profile?.referral_bonus_quota || 0}</p>
                      <p className="text-[9px] text-muted-foreground">پیام هدیه</p>
                    </div>
                  </div>
                  {shareUrl && (
                    <Button
                      className="w-full"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard?.writeText(shareUrl);
                      }}
                    >
                      <Gift className="w-4 h-4" /> کپی لینک دعوت
                    </Button>
                  )}
                </>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-2">
                  با فعال کردن، صرافان دیگر را دعوت کنید. برای هر صراف دعوت‌شده با ایمیل تأییدشده،
                  <span className="text-success font-bold"> +{VERIFIED_SARRAAF_BONUS} پیام </span>
                  هدیه می‌گیرید.
                </p>
              )}
            </div>
          </div>
        )}

        <p className="text-[10px] text-center text-muted-foreground mt-2">
          پس از ارتقا یا دعوت، سهمیه شما به‌صورت خودکار به‌روزرسانی می‌شود.
        </p>
      </DialogContent>
    </Dialog>
  );
}