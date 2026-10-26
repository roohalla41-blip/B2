import React, { useState, useEffect } from 'react';
import { useFeatures } from '@/lib/useSarraaf';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Plus, Lock, AlertCircle, Shield } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { AmountInput } from '@/components/sarraaf/Fields';

const PROVIDERS = [
  { value: 'bank_gateway', label: 'درگاه بانکی' },
  { value: 'stripe', label: 'Stripe' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'crypto', label: 'ارز دیجیتال' },
  { value: 'other', label: 'سایر' },
];

const STATUS_LABELS = {
  pending: 'در انتظار',
  configured: 'پیکربندی شده',
  active: 'فعال',
  disabled: 'غیرفعال',
};

const STATUS_COLORS = {
  pending: 'bg-muted text-muted-foreground',
  configured: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  disabled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export default function BankGatewayManager() {
  const { data: features } = useFeatures();
  const [gateways, setGateways] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    gateway_key: '',
    name: '',
    provider: 'bank_gateway',
    currency: 'AFN',
    merchant_id: '',
    callback_url: '',
    webhook_url: '',
    min_amount: 0,
    max_amount: 0,
    fee_percent: 0,
    fee_fixed: 0,
    test_mode: true,
    notes: '',
  });

  useEffect(() => {
    loadGateways();
  }, []);

  const loadGateways = async () => {
    setLoading(true);
    try {
      const { supabaseDB } = await import('@/lib/supabaseDB');
      const data = await supabaseDB.BankGateway.list();
      setGateways(data || []);
    } catch {
      setGateways([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.gateway_key || !form.name) {
      toast({ title: 'خطا', description: 'شناسه و نام درگاه الزامی است', variant: 'destructive' });
      return;
    }
    try {
      const { supabaseDB } = await import('@/lib/supabaseDB');
      await supabaseDB.BankGateway.create({
        ...form,
        active: false,
        status: 'configured',
      });
      toast({ title: 'موفق', description: 'تنظیمات درگاه ذخیره شد (غیرفعال)' });
      setShowForm(false);
      setForm({
        gateway_key: '', name: '', provider: 'bank_gateway', currency: 'AFN',
        merchant_id: '', callback_url: '', webhook_url: '',
        min_amount: 0, max_amount: 0, fee_percent: 0, fee_fixed: 0,
        test_mode: true, notes: '',
      });
      loadGateways();
    } catch (err) {
      toast({ title: 'خطا', description: 'خطا در ذخیره تنظیمات', variant: 'destructive' });
    }
  };

  const toggleGateway = async (gw) => {
    try {
      const { supabaseDB } = await import('@/lib/supabaseDB');
      await supabaseDB.BankGateway.update(gw.id, { active: !gw.active });
      toast({ title: 'موفق', description: gw.active ? 'درگاه غیرفعال شد' : 'درگاه فعال شد' });
      loadGateways();
    } catch {
      toast({ title: 'خطا', description: 'خطا در تغییر وضعیت', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-3">
      {/* Security notice */}
      <div className="flex items-start gap-2 p-2.5 rounded-lg bg-blue-50 dark:bg-blue-900/10 text-blue-700 dark:text-blue-400 text-xs">
        <Shield className="w-4 h-4 shrink-0 mt-0.5" />
        <p>کلیدهای محرمانه بانکی هرگز در دیتابیس ذخیره نمی‌شوند. فقط مرجع آن‌ها ثبت می‌گردد.</p>
      </div>

      {/* Existing gateways */}
      {loading ? (
        <p className="text-xs text-muted-foreground text-center py-4">در حال بارگذاری...</p>
      ) : gateways.length === 0 ? (
        <div className="text-center py-6">
          <CreditCard className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-xs text-muted-foreground">هنوز درگاهی پیکربندی نشده است</p>
        </div>
      ) : (
        <div className="space-y-2">
          {gateways.map(gw => (
            <div key={gw.id} className="flex items-center justify-between p-2.5 rounded-lg border">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium truncate">{gw.name}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${STATUS_COLORS[gw.status] || ''}`}>
                    {STATUS_LABELS[gw.status] || gw.status}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {PROVIDERS.find(p => p.value === gw.provider)?.label || gw.provider} • {gw.currency}
                  {gw.test_mode && ' • تست'}
                </p>
              </div>
              <Switch
                checked={gw.active}
                onCheckedChange={() => toggleGateway(gw)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Add gateway form */}
      {showForm ? (
        <form onSubmit={handleSave} className="space-y-2.5 p-3 rounded-lg border bg-muted/20">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">شناسه درگاه *</Label>
              <Input value={form.gateway_key} onChange={e => setForm({ ...form, gateway_key: e.target.value })} placeholder="bank_afghanistan" required className="text-xs h-8" />
            </div>
            <div>
              <Label className="text-xs">نام *</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="بانک افغانستان" required className="text-xs h-8" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">نوع درگاه</Label>
              <Select value={form.provider} onValueChange={v => setForm({ ...form, provider: v })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{PROVIDERS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">ارز</Label>
              <Select value={form.currency} onValueChange={v => setForm({ ...form, currency: v })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="AFN">AFN</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="IRT">IRT</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs">شناسه پذیرنده</Label>
            <Input value={form.merchant_id} onChange={e => setForm({ ...form, merchant_id: e.target.value })} placeholder="merchant-xxx" className="text-xs h-8" />
          </div>
          <div>
            <Label className="text-xs">آدرس بازگشت (Callback URL)</Label>
            <Input value={form.callback_url} onChange={e => setForm({ ...form, callback_url: e.target.value })} placeholder="https://..." className="text-xs h-8" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">حداقل مبلغ</Label>
              <AmountInput value={form.min_amount} onChange={v => setForm({ ...form, min_amount: v })} />
            </div>
            <div>
              <Label className="text-xs">حداکثر مبلغ</Label>
              <AmountInput value={form.max_amount} onChange={v => setForm({ ...form, max_amount: v })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">کارمزد درصدی</Label>
              <AmountInput value={form.fee_percent} onChange={v => setForm({ ...form, fee_percent: v })} />
            </div>
            <div>
              <Label className="text-xs">کارمزد ثابت</Label>
              <AmountInput value={form.fee_fixed} onChange={v => setForm({ ...form, fee_fixed: v })} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={form.test_mode} onCheckedChange={v => setForm({ ...form, test_mode: v })} />
            <Label className="text-xs">حالت آزمایشی</Label>
          </div>
          <div className="flex items-start gap-1.5 text-[10px] text-muted-foreground">
            <Lock className="w-3 h-3 mt-0.5 shrink-0" />
            <p>کلید محرمانه (Secret Key) به‌صورت امن در Secret Manager ذخیره می‌شود و در اینجا نمایش داده نمی‌شود.</p>
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="submit" size="sm" className="text-xs">ذخیره تنظیمات</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setShowForm(false)}>انصراف</Button>
          </div>
        </form>
      ) : (
        <Button size="sm" variant="outline" className="w-full" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" /> افزودن درگاه
        </Button>
      )}
    </div>
  );
}