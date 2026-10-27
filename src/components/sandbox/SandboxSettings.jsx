import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSandbox } from '@/components/sandbox/SandboxProvider';
import { useToast } from '@/components/ui/use-toast';

const fmt = (n) => Number(n || 0).toLocaleString('fa-IR');

export function SandboxSettings() {
  const { state, actions } = useSandbox();
  const { toast } = useToast();
  const [s, setS] = useState(state.settings);

  const set = (k, v) => setS(p => ({ ...p, [k]: v }));
  const save = () => { actions.updateSettings(s); toast({ title: 'تنظیمات ذخیره شد' }); };
  const reset = () => {
    if (!confirm('تمام داده‌های آزمایشی پاک شود؟')) return;
    actions.reset(); setS({ min_credit_for_seller_request: 500, dispute_window_hours: 4, seller_credit_limit: 5000 });
    toast({ title: 'محیط آزمایش بازنشانی شد' });
  };

  return (
    <div className="space-y-3">
      <Card><CardContent className="p-4 space-y-3">
        <h3 className="text-sm font-bold">تنظیمات آزمایشی</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div>
            <Label className="text-xs">حداقل موجودی برای درخواست فروشندگی</Label>
            <Input value={s.min_credit_for_seller_request} onChange={e => set('min_credit_for_seller_request', Number(e.target.value))} inputMode="numeric" />
          </div>
          <div>
            <Label className="text-xs">ساعات مهلت پیگیری</Label>
            <Input value={s.dispute_window_hours} onChange={e => set('dispute_window_hours', Number(e.target.value))} inputMode="numeric" />
          </div>
          <div>
            <Label className="text-xs">سقف اعتبار فروشنده</Label>
            <Input value={s.seller_credit_limit} onChange={e => set('seller_credit_limit', Number(e.target.value))} inputMode="numeric" />
          </div>
        </div>
        <Button size="sm" onClick={save}>ذخیره</Button>
      </CardContent></Card>

      <Card className="border-red-200"><CardContent className="p-4 space-y-2">
        <h3 className="text-sm font-bold text-red-600">بازنشانی محیط آزمایش</h3>
        <p className="text-xs text-muted-foreground">تمام داده‌های آزمایشی (سفارش‌ها، کیف پول، پرونده‌ها) پاک می‌شود. داده‌های واقعی تحت تأثیر قرار نمی‌گیرند.</p>
        <Button size="sm" variant="destructive" onClick={reset}>پاک‌سازی کامل آزمایش</Button>
      </CardContent></Card>
    </div>
  );
}