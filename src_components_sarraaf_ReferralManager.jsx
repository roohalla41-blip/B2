import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { getReferralConfig, updateReferralConfig } from '@/lib/referralSystem';
import { offlineDB } from '@/lib/offlineQueue';
import { formatDate } from '@/lib/sarraaf';
import { UserPlus, Gift, Settings, Loader2, Users, CheckCircle2, XCircle, Clock, Award } from 'lucide-react';

const STATUS_ICONS = {
  pending: { icon: Clock, color: 'text-amber-500', label: 'در انتظار' },
  verified: { icon: CheckCircle2, color: 'text-blue-500', label: 'تأییدشده' },
  completed: { icon: CheckCircle2, color: 'text-green-500', label: 'تکمیل‌شده' },
  rewarded: { icon: Award, color: 'text-green-600', label: 'پاداش‌داده‌شده' },
  cancelled: { icon: XCircle, color: 'text-red-500', label: 'لغوشده' },
};

const REWARD_TYPE_LABELS = {
  quota: 'سهمیه پیام',
  credit: 'اعتبار',
  points: 'امتیاز',
  none: 'بدون پاداش',
};

const CONDITION_LABELS = {
  email_verified: 'تأیید ایمیل دعوت‌شده',
  registration: 'فقط ثبت‌نام',
  first_transaction: 'اولین تراکنش دعوت‌شده',
};

export default function ReferralManager() {
  const { toast } = useToast();
  const [config, setConfig] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    try {
      const cfg = await getReferralConfig();
      setConfig(cfg);
      const refs = await offlineDB.Referral.list('-created_date', 200);
      setHistory(refs || []);
    } catch {
      // ignore
    }
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateReferralConfig(config);
      toast({ title: 'ذخیره شد', description: 'تنظیمات سیستم دعوت به‌روزرسانی شد' });
    } catch (err) {
      toast({ title: 'خطا', description: err.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  if (loading || !config) {
    return (
      <Card><CardContent className="p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </CardContent></Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Configuration Card */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold">تنظیمات سیستم دعوت</h3>
          </div>

          {/* Enable/Disable */}
          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div>
              <p className="text-sm font-medium">فعال‌سازی سیستم دعوت</p>
              <p className="text-xs text-muted-foreground">فعال یا غیرفعال کردن قابلیت دعوت کاربران</p>
            </div>
            <Switch
              checked={config.enabled}
              onCheckedChange={(v) => setConfig({ ...config, enabled: v })}
            />
          </div>

          {config.enabled && (
            <>
              {/* Reward type */}
              <div>
                <Label>نوع پاداش</Label>
                <Select
                  value={config.reward_type}
                  onValueChange={(v) => setConfig({ ...config, reward_type: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quota">سهمیه پیام</SelectItem>
                    <SelectItem value="credit">اعتبار حساب</SelectItem>
                    <SelectItem value="points">امتیاز</SelectItem>
                    <SelectItem value="none">بدون پاداش</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Reward amount */}
              <div>
                <Label>مقدار پاداش</Label>
                <Input
                  type="number"
                  value={config.reward_amount}
                  onChange={(e) => setConfig({ ...config, reward_amount: parseInt(e.target.value) || 0 })}
                />
                <p className="text-[10px] text-muted-foreground mt-1">مقدار پاداش برای هر دعوت موفق</p>
              </div>

              {/* Condition */}
              <div>
                <Label>شرط دریافت پاداش</Label>
                <Select
                  value={config.condition}
                  onValueChange={(v) => setConfig({ ...config, condition: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="registration">فقط ثبت‌نام</SelectItem>
                    <SelectItem value="email_verified">تأیید ایمیل دعوت‌شده</SelectItem>
                    <SelectItem value="first_transaction">اولین تراکنش دعوت‌شده</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground mt-1">پاداش پس از تحقق این شرط به دعوت‌کننده داده می‌شود</p>
              </div>

              {/* Max referrals */}
              <div>
                <Label>حداکثر دعوت برای هر کاربر</Label>
                <Input
                  type="number"
                  value={config.max_referrals_per_user}
                  onChange={(e) => setConfig({ ...config, max_referrals_per_user: parseInt(e.target.value) || 0 })}
                />
                <p className="text-[10px] text-muted-foreground mt-1">0 = نامحدود</p>
              </div>

              {/* Anti-abuse toggles */}
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2.5 rounded-lg border">
                  <div>
                    <p className="text-sm font-medium">جلوگیری از دعوت خود</p>
                    <p className="text-[10px] text-muted-foreground">کاربر نتواند با کد خودش ثبت‌نام کند</p>
                  </div>
                  <Switch
                    checked={config.prevent_self_referral}
                    onCheckedChange={(v) => setConfig({ ...config, prevent_self_referral: v })}
                  />
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg border">
                  <div>
                    <p className="text-sm font-medium">جلوگیری از دعوت تکراری</p>
                    <p className="text-[10px] text-muted-foreground">هر کاربر فقط یک بار دعوت شود</p>
                  </div>
                  <Switch
                    checked={config.prevent_duplicate_invitee}
                    onCheckedChange={(v) => setConfig({ ...config, prevent_duplicate_invitee: v })}
                  />
                </div>
              </div>

              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'ذخیره تنظیمات'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Referral History */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold">سابقه دعوت‌ها</h3>
            <span className="text-xs text-muted-foreground">({history.length})</span>
          </div>

          {history.length === 0 ? (
            <div className="text-center py-6">
              <UserPlus className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">هنوز دعوتی ثبت نشده است</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin">
              {history.map((r) => {
                const si = STATUS_ICONS[r.status] || STATUS_ICONS.pending;
                const SIcon = si.icon;
                return (
                  <div key={r.id} className="flex items-center justify-between p-2.5 rounded-lg border text-xs">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <SIcon className={`w-3.5 h-3.5 ${si.color}`} />
                        <span className="font-medium truncate">{r.invitee_name || '—'}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {r.inviter_name || '—'} → {r.invitee_type === 'customer' ? 'مشتری' : 'صراف'}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{formatDate(r.created_date)}</p>
                    </div>
                    <div className="text-left shrink-0">
                      <span className={`text-[10px] font-medium ${si.color}`}>{si.label}</span>
                      {r.reward_given && (
                        <p className="text-[10px] text-green-600">
                          <Gift className="w-3 h-3 inline" /> {r.reward_amount} {REWARD_TYPE_LABELS[r.reward_type]}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}