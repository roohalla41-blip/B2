// PaidSystemToggle.jsx — Builder control to enable/disable the entire paid plan system
import React from 'react';
import { usePaidSystemEnabled, useTogglePaidSystem } from '@/lib/usePaidSystem';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Crown, Gift } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function PaidSystemToggle() {
  const { data: enabled } = usePaidSystemEnabled();
  const toggleMut = useTogglePaidSystem();
  const { toast } = useToast();

  const handleToggle = (checked) => {
    toggleMut.mutate(checked, {
      onSuccess: () => {
        toast({
          title: checked ? 'سیستم پولی فعال شد' : 'سیستم پولی غیرفعال شد',
          description: checked
            ? 'محدودیت‌های پلن رایگان اعمال می‌شود.'
            : 'تمام کاربران دسترسی کامل و نامحدود دارند.',
        });
      },
      onError: (err) => {
        toast({
          title: 'خطا',
          description: err?.message || 'عملیات ناموفق بود',
          variant: 'destructive',
        });
      },
    });
  };

  const isEnabled = enabled !== false;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isEnabled ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'}`}>
              {isEnabled ? <Crown className="w-5 h-5" /> : <Gift className="w-5 h-5" />}
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold">سیستم پلن پولی</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isEnabled
                  ? 'محدودیت‌های پلن رایگان فعال است. کاربران رایگان محدودیت دارند و برای دسترسی کامل باید ارتقا دهند.'
                  : 'تمام کاربران (رایگان و پولی) دسترسی کامل و نامحدود به همه بخش‌ها دارند. هیچ محدودیتی وجود ندارد.'}
              </p>
              <div className="mt-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isEnabled ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                  {isEnabled ? 'فعال' : 'غیرفعال — دسترسی کامل برای همه'}
                </span>
              </div>
            </div>
          </div>
          <Switch
            checked={isEnabled}
            onCheckedChange={handleToggle}
            disabled={toggleMut.isPending}
          />
        </div>
      </CardContent>
    </Card>
  );
}