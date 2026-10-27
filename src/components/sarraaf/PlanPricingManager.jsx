// PlanPricingManager.jsx — Builder panel for managing plan prices and discount campaigns
import React, { useState, useEffect } from 'react';
import { usePricingPlans, useUpdatePlan, useDiscountCampaign, useStartCampaign, useStopCampaign } from '@/lib/usePricing';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { CreditCard, Percent, Clock, Play, Square, Save } from 'lucide-react';

const CURRENCY_LABELS = { AFN: 'افغانی', IRT: 'تومان', USD: 'دلار' };

export default function PlanPricingManager() {
  const { data: plans, isLoading } = usePricingPlans();
  const { data: campaign } = useDiscountCampaign();
  const updateMut = useUpdatePlan();
  const startMut = useStartCampaign();
  const stopMut = useStopCampaign();
  const [editing, setEditing] = useState({});

  useEffect(() => {
    if (plans) {
      const obj = {};
      plans.forEach(p => {
        obj[p.id] = { price: p.price, name: p.name, description: p.description || '' };
      });
      setEditing(obj);
    }
  }, [plans]);

  const handleSave = (plan) => {
    const edits = editing[plan.id];
    if (!edits) return;
    updateMut.mutate(
      { id: plan.id, data: { price: Number(edits.price), name: edits.name, description: edits.description } },
      {
        onSuccess: () => toast({ title: 'ذخیره شد', description: `قیمت پلن ${plan.name} به‌روزرسانی شد` }),
        onError: (e) => toast({ title: 'خطا', description: e.message, variant: 'destructive' }),
      }
    );
  };

  const handleStartCampaign = () => {
    startMut.mutate(
      { percent: 30, durationHours: 48 },
      {
        onSuccess: () => toast({ title: 'کمپین فعال شد', description: 'تخفیف ۳۰٪ برای ۴۸ ساعت روی همه پلن‌ها' }),
        onError: (e) => toast({ title: 'خطا', description: e.message, variant: 'destructive' }),
      }
    );
  };

  const handleStopCampaign = () => {
    stopMut.mutate(
      {},
      {
        onSuccess: () => toast({ title: 'کمپین متوقف شد' }),
        onError: (e) => toast({ title: 'خطا', description: e.message, variant: 'destructive' }),
      }
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4 text-center text-sm text-muted-foreground">در حال بارگذاری...</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Discount Campaign */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Percent className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold">کمپین تخفیف</h3>
            </div>
            {campaign && !campaign.expired && campaign.active ? (
              <Button size="sm" variant="destructive" onClick={handleStopCampaign} disabled={stopMut.isPending}>
                <Square className="w-3.5 h-3.5" />
                توقف کمپین
              </Button>
            ) : (
              <Button size="sm" onClick={handleStartCampaign} disabled={startMut.isPending}>
                <Play className="w-3.5 h-3.5" />
                شروع کمپین ۴۸ ساعته
              </Button>
            )}
          </div>

          {campaign && !campaign.expired && campaign.active ? (
            <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-xs space-y-1">
              <div className="flex items-center gap-2 font-medium text-green-700">
                <Clock className="w-3.5 h-3.5" />
                تخفیف {campaign.percent}٪ فعال روی همه پلن‌های پولی
              </div>
              <p className="text-green-600">
                شروع: {new Date(campaign.start_date).toLocaleString('fa-IR')}
              </p>
              <p className="text-green-600">
                پایان: {new Date(campaign.end_date).toLocaleString('fa-IR')}
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              با شروع کمپین، تخفیف ۳۰٪ به‌مدت ۴۸ ساعت روی تمام پلن‌های پولی اعمال می‌شود و اعلانی برای همه صرافان ارسال می‌گردد.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Plan Pricing */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">قیمت‌گذاری پلن‌ها</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            قیمت پلن‌ها را ویرایش کنید — تغییرات فوراً برای صرافان نمایش داده می‌شود.
          </p>

          <div className="space-y-2">
            {(plans || []).map(plan => {
              const edits = editing[plan.id] || {};
              return (
                <div key={plan.id} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold">{plan.name}</span>
                    <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                      {plan.plan_key}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10px]">نام پلن</Label>
                      <Input
                        value={edits.name || ''}
                        onChange={e => setEditing(s => ({ ...s, [plan.id]: { ...s[plan.id], name: e.target.value } }))}
                        className="h-8 text-sm mt-0.5"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px]">قیمت ({CURRENCY_LABELS[plan.currency] || 'افغانی'})</Label>
                      <Input
                        type="number"
                        value={edits.price ?? 0}
                        onChange={e => setEditing(s => ({ ...s, [plan.id]: { ...s[plan.id], price: e.target.value } }))}
                        className="h-8 text-sm mt-0.5"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-[10px]">توضیحات</Label>
                    <Input
                      value={edits.description || ''}
                      onChange={e => setEditing(s => ({ ...s, [plan.id]: { ...s[plan.id], description: e.target.value } }))}
                      className="h-8 text-xs mt-0.5"
                    />
                  </div>
                  <Button size="sm" className="w-full" onClick={() => handleSave(plan)} disabled={updateMut.isPending}>
                    <Save className="w-3.5 h-3.5" />
                    ذخیره
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}