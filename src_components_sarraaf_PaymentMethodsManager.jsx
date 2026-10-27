import React, { useState, useEffect } from 'react';
import { createSupabaseEntity } from '@/lib/supabaseApi';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Landmark, Globe, Bitcoin, CreditCard, Save, Loader2 } from 'lucide-react';

const sbFeatures = createSupabaseEntity('FeatureSetting');
const sbAppSettings = createSupabaseEntity('AppSetting');

const PAYMENT_METHODS = [
  {
    key: 'payment_card',
    label: 'کارت به کارت',
    icon: CreditCard,
    color: 'bg-purple-500',
    fields: [
      { key: 'card_number', label: 'شماره کارت', placeholder: '۶۰۳۷-xxxx-xxxx-xxxx' },
      { key: 'holder_name', label: 'نام صاحب کارت', placeholder: 'نام و نام خانوادگی' },
      { key: 'bank_name', label: 'نام بانک', placeholder: 'مثال: بانک کابل' },
      { key: 'sheba', label: 'شماره شبا', placeholder: 'AFxx xxxx xxxx xxxx xxxx xxxx' },
      { key: 'account_number', label: 'شماره حساب', placeholder: 'شماره حساب جاری' },
      { key: 'expiry', label: 'تاریخ انقضا', placeholder: 'MM/YY' },
    ],
  },
  {
    key: 'payment_bank',
    label: 'انتقال بانکی (درگاه)',
    icon: Landmark,
    color: 'bg-blue-500',
    fields: [
      { key: 'bank_name', label: 'نام بانک', placeholder: 'مثال: بانک کابل' },
      { key: 'account_number', label: 'شماره حساب', placeholder: 'شماره حساب جاری' },
      { key: 'holder_name', label: 'نام صاحب حساب', placeholder: 'نام و نام خانوادگی' },
      { key: 'sheba', label: 'شماره شبا', placeholder: 'AFxx xxxx xxxx xxxx xxxx xxxx' },
      { key: 'branch', label: 'نام شعبه', placeholder: 'نام شعبه بانک' },
      { key: 'branch_code', label: 'کد شعبه', placeholder: 'کد شعبه بانک' },
      { key: 'swift_code', label: 'کد SWIFT', placeholder: 'کد بین‌المللی بانک' },
      { key: 'gateway_merchant_id', label: 'شناسه پذیرنده درگاه', placeholder: 'Merchant ID' },
      { key: 'gateway_terminal_id', label: 'شماره ترمینال درگاه', placeholder: 'Terminal ID' },
      { key: 'gateway_callback_url', label: 'آدرس بازگشت (Callback)', placeholder: 'https://...' },
    ],
  },
  {
    key: 'payment_paypal',
    label: 'پی‌پل',
    icon: Globe,
    color: 'bg-indigo-500',
    fields: [
      { key: 'paypal_email', label: 'ایمیل پی‌پل', placeholder: 'email@example.com' },
      { key: 'paypal_client_id', label: 'Client ID', placeholder: 'PayPal Client ID' },
      { key: 'paypal_merchant_id', label: 'Merchant ID', placeholder: 'PayPal Merchant ID' },
      { key: 'paypal_currency', label: 'ارز', placeholder: 'USD / EUR' },
    ],
  },
  {
    key: 'payment_crypto',
    label: 'ارز دیجیتال',
    icon: Bitcoin,
    color: 'bg-amber-500',
    fields: [
      { key: 'wallet_address', label: 'آدرس کیف پول', placeholder: 'آدرس کیف پول' },
      { key: 'network', label: 'شبکه', placeholder: 'TRC20 / ERC20 / BEP20' },
      { key: 'coin_type', label: 'نوع ارز', placeholder: 'USDT / BTC / ETH' },
      { key: 'qr_code', label: 'لینک QR کد', placeholder: 'QR Code URL' },
    ],
  },
];

export default function PaymentMethodsManager() {
  const { toast } = useToast();
  const [features, setFeatures] = useState([]);
  const [configs, setConfigs] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const feats = await sbFeatures.list('display_order', 100);
        setFeatures(feats);
        const settings = await sbAppSettings.list('-created_date', 200);
        const cfgs = {};
        for (const m of PAYMENT_METHODS) {
          const s = settings.find(sx => sx.key === `${m.key}_config`);
          try {
            cfgs[m.key] = (s?.value && typeof s.value === 'string') ? JSON.parse(s.value) : (s?.value || {});
          } catch {
            cfgs[m.key] = {};
          }
        }
        setConfigs(cfgs);
      } catch (err) {
        setLoadError(err.message || 'خطا در بارگذاری تنظیمات پرداخت');
      }
      setLoading(false);
    };
    load();
  }, []);

  const getFeature = (key) => features.find(f => f.feature_key === key);

  const toggleMethod = async (key) => {
    const f = getFeature(key);
    const newEnabled = f ? !(f.enabled !== false) : true;
    try {
      if (!f) {
        await sbFeatures.create({
          feature_key: key,
          name: PAYMENT_METHODS.find(m => m.key === key)?.label || key,
          location: 'action',
          display_order: PAYMENT_METHODS.find(m => m.key === key)?.display_order || 0,
          enabled: true,
          status: 'active',
          free_enabled: true,
          paid_enabled: true,
        });
      } else {
        await sbFeatures.update(f.id, {
          enabled: newEnabled,
          status: newEnabled ? 'active' : 'disabled',
        });
      }
      const feats = await sbFeatures.list('display_order', 100);
      setFeatures(feats);
      toast({ title: newEnabled ? 'فعال شد' : 'غیرفعال شد' });
    } catch {
      toast({ title: 'خطا', variant: 'destructive' });
    }
  };

  const updateConfig = (methodKey, fieldKey, value) => {
    setConfigs(prev => ({
      ...prev,
      [methodKey]: { ...prev[methodKey], [fieldKey]: value },
    }));
  };

  const saveConfig = async (methodKey) => {
    setSaving(methodKey);
    try {
      const settingKey = `${methodKey}_config`;
      const existing = (await sbAppSettings.list('-created_date', 200)).find(s => s.key === settingKey);
      const jsonValue = JSON.stringify(configs[methodKey] || {});
      if (existing) {
        await sbAppSettings.update(existing.id, { value: jsonValue });
      } else {
        await sbAppSettings.create({ key: settingKey, value: jsonValue });
      }
      toast({ title: 'تنظیمات ذخیره شد' });
    } catch {
      toast({ title: 'خطا در ذخیره', variant: 'destructive' });
    }
    setSaving(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
      </div>
    );
  }

  if (loadError) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-xs space-y-1">
            <p className="font-bold">خطا در بارگذاری تنظیمات پرداخت</p>
            <p>{loadError}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground mb-2">
        روش‌های پرداخت را فعال/غیرفعال کنید و اطلاعات هر روش را پر نمایید. روش غیرفعال برای کاربران به‌صورت «در حال به‌روزرسانی» نمایش داده می‌شود.
      </p>
      {PAYMENT_METHODS.map((m) => {
        const Icon = m.icon;
        const f = getFeature(m.key);
        const enabled = f ? f.enabled !== false && (f.status === 'active' || !f.status) : false;
        const cfg = configs[m.key] || {};
        return (
          <Card key={m.key}>
            <CardContent className="p-3 space-y-3">
              {/* Header */}
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg ${m.color} flex items-center justify-center shrink-0`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold">{m.label}</p>
                  <p className="text-[10px] text-muted-foreground">{enabled ? 'فعال' : 'غیرفعال'}</p>
                </div>
                <Switch checked={enabled} onCheckedChange={() => toggleMethod(m.key)} />
              </div>

              {/* Fields */}
              <div className="grid grid-cols-1 gap-2 pt-1">
                {m.fields.map((field) => (
                  <div key={field.key}>
                    <Label className="text-[10px]">{field.label}</Label>
                    <Input
                      value={cfg[field.key] || ''}
                      onChange={(e) => updateConfig(m.key, field.key, e.target.value)}
                      placeholder={field.placeholder || field.label}
                      dir="ltr"
                      className="text-xs h-8 mt-0.5"
                    />
                  </div>
                ))}
              </div>

              <Button
                size="sm"
                variant="outline"
                className="w-full h-8"
                onClick={() => saveConfig(m.key)}
                disabled={saving === m.key}
              >
                {saving === m.key ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                ذخیره تنظیمات
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}