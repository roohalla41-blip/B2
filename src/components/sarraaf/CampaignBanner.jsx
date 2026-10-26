// CampaignBanner.jsx — Countdown banner shown on dashboard when discount is active
import React, { useState, useEffect } from 'react';
import { useDiscountCampaign } from '@/lib/usePricing';
import { getTimeRemaining } from '@/lib/pricingService';
import { toPersianDigits } from '@/lib/sarraaf';
import { Clock, X } from 'lucide-react';

export default function CampaignBanner({ onUpgrade }) {
  const { data: campaign } = useDiscountCampaign();
  const [time, setTime] = useState(() => getTimeRemaining(campaign?.end_date));
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!campaign?.end_date) return;
    setTime(getTimeRemaining(campaign.end_date));
    const t = setInterval(() => setTime(getTimeRemaining(campaign.end_date)), 1000);
    return () => clearInterval(t);
  }, [campaign?.end_date]);

  if (!campaign || campaign.expired || !campaign.active || dismissed) return null;

  return (
    <div className="rounded-xl bg-gradient-to-r from-red-500 to-orange-500 text-white p-3 mb-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1">
          <p className="text-sm font-bold">🎉 تخفیف {toPersianDigits(campaign.percent)}٪ ویژه!</p>
          <p className="text-[10px] opacity-90 mt-0.5">روی تمام پلن‌های پولی — فرصت محدود</p>
        </div>
        <div className="flex items-center gap-2">
          {time && !time.expired && (
            <div className="flex items-center gap-1 text-sm font-bold bg-white/20 rounded-lg px-2 py-1">
              <Clock className="w-3.5 h-3.5" />
              <span>
                {toPersianDigits(String(time.hours).padStart(2, '0'))}:{toPersianDigits(String(time.minutes).padStart(2, '0'))}:{toPersianDigits(String(time.seconds).padStart(2, '0'))}
              </span>
            </div>
          )}
          <button
            onClick={onUpgrade}
            className="bg-white text-red-600 text-xs font-bold rounded-lg px-3 py-1.5 hover:bg-white/90 transition-colors"
          >
            ارتقا
          </button>
          <button onClick={() => setDismissed(true)} className="p-1 hover:bg-white/20 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}