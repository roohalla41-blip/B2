import React, { useState, useEffect } from 'react';
import { useRateSettings, useCreateRateSetting, useSarraafProfile } from '@/lib/useSarraaf';
import { useAuth } from '@/lib/AuthContext';
import { PageHeader } from '@/components/sarraaf/Pieces';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, User, Store, Copy, Loader2, Save } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { offlineDB } from '@/lib/offlineQueue';

const RATE_KEYS = [
  { key: 'usd_afn', label: 'نرخ دلار به افغانی' },
  { key: 'afn_toman', label: 'نرخ افغانی به تومان' },
  { key: 'large_transfer_threshold', label: 'حد نصاب حواله بزرگ' },
];

export default function MainSettings() {
  const { user } = useAuth();
  const { data: settings } = useRateSettings();
  const { data: profile } = useSarraafProfile(user?.id);
  const createMut = useCreateRateSetting();
  const [values, setValues] = useState({});
  const [profileForm, setProfileForm] = useState({});
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (settings) {
      const v = {};
      for (const rk of RATE_KEYS) v[rk.key] = settings[rk.key] || '';
      setValues(v);
    }
  }, [settings]);

  useEffect(() => {
    if (profile) {
      setProfileForm({
        exchange_name: profile.exchange_name || '',
        name: profile.name || '',
        phone: profile.phone || '',
        email: profile.email || '',
        code: profile.code || '',
      });
    }
  }, [profile]);

  const handleSave = async (key) => {
    try {
      await createMut.mutateAsync({ key, value: values[key], updated_by_name: user?.full_name || 'admin' });
      toast({ title: 'ذخیره شد' });
    } catch (err) {
      toast({ title: 'خطا', description: err.message, variant: 'destructive' });
    }
  };

  const handleSaveProfile = async () => {
    if (!profile) return;
    setSavingProfile(true);
    try {
      await offlineDB.SarraafProfile.update(profile.id, {
        exchange_name: profileForm.exchange_name,
        name: profileForm.name,
        phone: profileForm.phone,
        email: profileForm.email,
      });
      toast({ title: 'اطلاعات صرافی ذخیره شد' });
    } catch (err) {
      toast({ title: 'خطا', description: err.message, variant: 'destructive' });
    } finally {
      setSavingProfile(false);
    }
  };

  const copyCode = () => {
    if (profileForm.code) {
      navigator.clipboard?.writeText(profileForm.code);
      toast({ title: 'کُد صرافی کپی شد' });
    }
  };

  return (
    <>
      <PageHeader title="تنظیمات اصلی" subtitle="اطلاعات صرافی و نرخ‌ها" icon={Shield} />

      {/* Sarraaf Profile Info */}
      <Card className="mb-4">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-semibold">اطلاعات صرافی</h3>
          </div>

          {profile ? (
            <>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground">کُد صرافی</Label>
                  <p className="text-lg font-bold tracking-wider" dir="ltr">{profileForm.code || '—'}</p>
                </div>
                <Button size="icon" variant="ghost" onClick={copyCode} disabled={!profileForm.code}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-3">
                <div>
                  <Label>نام صرافی</Label>
                  <Input value={profileForm.exchange_name || ''} onChange={e => setProfileForm({...profileForm, exchange_name: e.target.value})} placeholder="صرافی احمدی" />
                </div>
                <div>
                  <Label>نام مسئول</Label>
                  <Input value={profileForm.name || ''} onChange={e => setProfileForm({...profileForm, name: e.target.value})} placeholder="نام و نام خانوادگی" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>تلفن</Label>
                    <Input value={profileForm.phone || ''} onChange={e => setProfileForm({...profileForm, phone: e.target.value})} placeholder="07XXXXXXXX" inputMode="numeric" />
                  </div>
                  <div>
                    <Label>ایمیل</Label>
                    <Input value={profileForm.email || ''} onChange={e => setProfileForm({...profileForm, email: e.target.value})} placeholder="email@example.com" dir="ltr" />
                  </div>
                </div>
                <Button onClick={handleSaveProfile} disabled={savingProfile} className="w-full">
                  {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  ذخیره اطلاعات صرافی
                </Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">اطلاعات صرافی یافت نشد.</p>
          )}
        </CardContent>
      </Card>

      {/* User Account Info */}
      <Card className="mb-4">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm font-semibold">حساب کاربری</h3>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <Label className="text-xs text-muted-foreground">نام</Label>
              <p className="font-medium">{user?.full_name || '—'}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">ایمیل</Label>
              <p className="font-medium truncate" dir="ltr">{user?.email || '—'}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">نقش</Label>
              <p className="font-medium">{user?.role === 'admin' ? 'مدیر' : user?.role || '—'}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">موبایل</Label>
              <p className="font-medium" dir="ltr">{user?.mobile || '—'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Base Rate Settings */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <h3 className="text-sm font-semibold">نرخ پایه ارز</h3>
          {RATE_KEYS.map(rk => (
            <div key={rk.key} className="flex items-end gap-2">
              <div className="flex-1">
                <Label>{rk.label}</Label>
                <Input
                  type="number"
                  value={values[rk.key] || ''}
                  onChange={e => setValues({...values, [rk.key]: e.target.value})}
                />
              </div>
              <Button onClick={() => handleSave(rk.key)} disabled={createMut.isPending}>
                {createMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'ذخیره'}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}