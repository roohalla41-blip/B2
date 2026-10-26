import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { handleGoogleCallback } from '@/lib/googleAuth';
import { loadProfile, saveProfile, saveNotificationSettings } from '@/lib/profileMockData';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  User, BadgeCheck, Building2, Shield, Lock, LogOut,
  Bell, Wallet, Landmark, Package, MessageSquare, ArrowRight,
  RefreshCw, Check, AlertCircle, CheckCircle2, Settings as SettingsIcon,
} from 'lucide-react';
import { initiateGoogleLink } from '@/lib/googleAuth';
import GoogleIcon from '@/components/GoogleIcon';
import { changePassword as localChangePassword } from '@/lib/localAuth';
import { directChangePassword } from '@/lib/directAuth';

const STATUS_LABELS = {
  active: { label: 'فعال', color: 'bg-success/15 text-success' },
  suspended: { label: 'معلق', color: 'bg-destructive/15 text-destructive' },
  inactive: { label: 'غیرفعال', color: 'bg-muted text-muted-foreground' },
};

export default function CustomerProfile() {
  const navigate = useNavigate();
  const { user, logout, checkAppState } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeSection, setActiveSection] = useState('info');

  // Edit form
  const [editForm, setEditForm] = useState({});
  const [editErrors, setEditErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Password form
  const [pwForm, setPwForm] = useState({ current: '', newPass: '', confirm: '' });
  const [pwErrors, setPwErrors] = useState({});
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);

  // Notification settings
  const [notifSettings, setNotifSettings] = useState({});
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifSuccess, setNotifSuccess] = useState(false);

  // Logout confirm
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const p = await loadProfile(user);
      // Merge with real user data from auth
      const merged = {
        ...p,
        customer_name: user?.full_name || p?.customer_name || '',
        username: user?.email?.split('@')[0] || '',
        phone: user?.phone || '',
        email: user?.email || '',
        display_name: user?.full_name || '',
        account_status: 'active',
      };
      setProfile(merged);
      setEditForm({
        customer_name: merged.customer_name || '',
        phone: merged.phone || '',
        email: merged.email || '',
        display_name: merged.display_name || '',
      });
      // Load notification settings from localStorage
      try {
        const key = `notif_settings_${user?.id}`;
        const saved = JSON.parse(localStorage.getItem(key) || '{}');
        setNotifSettings({ in_app: true, orders: true, messages: true, general: false, ...saved });
      } catch {
        setNotifSettings({ in_app: true, orders: true, messages: true, general: false });
      }
    } catch (e) {
      setError(true);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Google link callback handler ──
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('google_link') !== '1') return;
    handleGoogleCallback().then((result) => {
      if (result?.linked) {
        window.history.replaceState({}, '', '/customer/profile');
        // Refresh user data
        checkAppState();
      }
    });
  }, []);

  const validateEditForm = () => {
    const errs = {};
    if (!editForm.customer_name || editForm.customer_name.trim().length < 3) {
      errs.customer_name = 'نام باید حداقل ۳ کاراکتر باشد.';
    }
    if (editForm.phone && !/^[\d\s+\-()]{7,15}$/.test(editForm.phone.trim())) {
      errs.phone = 'فرمت شماره موبایل نامعتبر است.';
    }
    if (editForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email.trim())) {
      errs.email = 'فرمت ایمیل نامعتبر است.';
    }
    setEditErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSaveProfile = async () => {
    if (!validateEditForm()) return;
    setSaving(true);
    setSaveSuccess(false);
    await saveProfile(user?.id, editForm);
    setProfile((prev) => ({ ...prev, ...editForm }));
    setSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const validatePwForm = () => {
    const errs = {};
    if (!pwForm.current) errs.current = 'رمز فعلی الزامی است.';
    if (!pwForm.newPass) errs.newPass = 'رمز جدید الزامی است.';
    if (pwForm.newPass && pwForm.newPass.length < 8) errs.newPass = 'رمز جدید باید حداقل ۸ کاراکتر باشد.';
    if (pwForm.newPass !== pwForm.confirm) errs.confirm = 'رمز جدید و تکرار آن یکسان نیستند.';
    setPwErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChangePassword = async () => {
    if (!validatePwForm()) return;
    setPwSaving(true);
    setPwSuccess(false);
    setPwErrors({});
    try {
      const isLocalUser = user?.isLocal || !!localStorage.getItem('local_users_db');
      if (isLocalUser) {
        const res = localChangePassword(pwForm.current, pwForm.newPass);
        if (!res.success) {
          const msg = res.error === 'wrong_password' ? 'رمز فعلی اشتباه است' : 'خطا در تغییر رمز عبور';
          setPwErrors({ current: msg });
          setPwSaving(false);
          return;
        }
      } else {
        const token = localStorage.getItem('auth_token');
        const res = await directChangePassword(token, pwForm.current, pwForm.newPass);
        if (!res?.success) {
          const err = res?.error;
          const msg = err === 'wrong_password' ? 'رمز فعلی اشتباه است' : 'خطا در تغییر رمز عبور';
          setPwErrors({ current: msg });
          setPwSaving(false);
          return;
        }
      }
      setPwForm({ current: '', newPass: '', confirm: '' });
      setPwSuccess(true);
      setTimeout(() => setPwSuccess(false), 3000);
    } catch (err) {
      setPwErrors({ current: 'خطا در ارتباط با سرور. مجدداً تلاش کنید.' });
    }
    setPwSaving(false);
  };

  const handleNotifToggle = async (key, value) => {
    const updated = { ...notifSettings, [key]: value };
    setNotifSettings(updated);
    setNotifSaving(true);
    setNotifSuccess(false);
    await saveNotificationSettings(user?.id, { [key]: value });
    setNotifSaving(false);
    setNotifSuccess(true);
    setTimeout(() => setNotifSuccess(false), 2000);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-bold text-foreground">پروفایل و تنظیمات</h1>
        <Card>
          <CardContent className="p-8 text-center space-y-4">
            <p className="text-sm text-muted-foreground">دریافت اطلاعات با مشکل مواجه شد.</p>
            <Button onClick={loadData} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 ml-2" />
              تلاش مجدد
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const status = STATUS_LABELS[profile.account_status] || STATUS_LABELS.inactive;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-foreground">پروفایل و تنظیمات</h1>
            <p className="text-xs text-muted-foreground">اطلاعات شخصی و تنظیمات حساب</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/customer')}>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Profile Card */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shrink-0">
              <User className="w-7 h-7 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-foreground truncate">{profile.customer_name}</p>
                <span className={`text-[8px] px-1.5 py-0.5 rounded ${status.color}`}>{status.label}</span>
              </div>
              <p className="text-[10px] text-muted-foreground">@{profile.username}</p>
              <p className="text-[10px] text-muted-foreground">کد مشتری: {profile.customer_code}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section Tabs */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-thin pb-1">
        {[
          { key: 'info', label: 'اطلاعات شخصی', icon: User },
          { key: 'security', label: 'امنیت حساب', icon: Shield },
          { key: 'notifications', label: 'اعلان‌ها', icon: Bell },
          { key: 'exchange', label: 'حساب با صرافی', icon: Building2 },
        ].map((tab) => {
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveSection(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap border transition-all flex items-center gap-1.5 ${
                activeSection === tab.key ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground'
              }`}
            >
              <TabIcon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Section: Personal Info */}
      {activeSection === 'info' && (
        <div className="space-y-3">
          <Card className="shadow-sm">
            <CardContent className="p-3 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] text-muted-foreground">کد مشتری</p>
                  <p className="text-xs font-mono text-foreground">{profile.customer_code}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">تاریخ عضویت</p>
                  <p className="text-xs text-foreground">{new Date(profile.joined_date).toLocaleDateString('fa-IR')}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">نام صرافی</p>
                  <p className="text-xs text-foreground">{profile.exchange_name}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">کد صرافی</p>
                  <p className="text-xs font-mono text-foreground">{profile.exchange_code}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-3 space-y-3">
              <div className="flex items-center gap-2">
                <SettingsIcon className="w-4 h-4 text-primary" />
                <p className="text-xs font-bold text-foreground">ویرایش اطلاعات مجاز</p>
              </div>

              <div className="space-y-2">
                <div>
                  <Label className="text-[10px] text-muted-foreground">نام کامل</Label>
                  <Input
                    value={editForm.customer_name || ''}
                    onChange={(e) => setEditForm({ ...editForm, customer_name: e.target.value })}
                    className="text-xs h-9 mt-1"
                  />
                  {editErrors.customer_name && <p className="text-[9px] text-destructive mt-0.5">{editErrors.customer_name}</p>}
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">نام نمایشی</Label>
                  <Input
                    value={editForm.display_name || ''}
                    onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
                    className="text-xs h-9 mt-1"
                  />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">شماره موبایل</Label>
                  <Input
                    value={editForm.phone || ''}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="text-xs h-9 mt-1"
                    dir="ltr"
                  />
                  {editErrors.phone && <p className="text-[9px] text-destructive mt-0.5">{editErrors.phone}</p>}
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">ایمیل</Label>
                  <Input
                    type="email"
                    value={editForm.email || ''}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="text-xs h-9 mt-1"
                    dir="ltr"
                  />
                  {editErrors.email && <p className="text-[9px] text-destructive mt-0.5">{editErrors.email}</p>}
                </div>
              </div>

              {saveSuccess && (
                <div className="flex items-center gap-1.5 text-[10px] text-success bg-success/10 rounded-lg p-2">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  اطلاعات با موفقیت در حالت آزمایشی ذخیره شد.
                </div>
              )}

              <Button onClick={handleSaveProfile} disabled={saving} className="w-full text-xs h-9">
                {saving ? <RefreshCw className="w-4 h-4 ml-1 animate-spin" /> : <Check className="w-4 h-4 ml-1" />}
                ذخیره تغییرات
              </Button>
            </CardContent>
          </Card>

          {/* Read-only Financial Summary */}
          <Card className="shadow-sm">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="w-4 h-4 text-muted-foreground" />
                <p className="text-xs font-bold text-foreground">خلاصه مالی (فقط نمایش)</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(profile.balances || []).map((b) => (
                  <div key={b.currency} className="flex items-center justify-between rounded-lg bg-muted/50 px-2 py-1.5">
                    <span className="text-[10px] text-muted-foreground">{b.label}</span>
                    <div className="text-left">
                      <p className="text-xs font-bold text-foreground">{b.amount.toLocaleString('fa-IR')}</p>
                      <p className="text-[8px] text-muted-foreground">{b.currency}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[9px] text-muted-foreground mt-2 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                موجودی‌ها فقط قابل مشاهده هستند. شارژ کیف پول توسط صرافی انجام می‌شود.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Section: Security */}
      {activeSection === 'security' && (
        <div className="space-y-3">
          <Card className="shadow-sm">
            <CardContent className="p-3 space-y-3">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-primary" />
                <p className="text-xs font-bold text-foreground">تغییر رمز عبور</p>
              </div>
              <div className="space-y-2">
                <div>
                  <Label className="text-[10px] text-muted-foreground">رمز فعلی</Label>
                  <Input
                    type="password"
                    value={pwForm.current}
                    onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })}
                    className="text-xs h-9 mt-1"
                  />
                  {pwErrors.current && <p className="text-[9px] text-destructive mt-0.5">{pwErrors.current}</p>}
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">رمز جدید</Label>
                  <Input
                    type="password"
                    value={pwForm.newPass}
                    onChange={(e) => setPwForm({ ...pwForm, newPass: e.target.value })}
                    className="text-xs h-9 mt-1"
                  />
                  {pwErrors.newPass && <p className="text-[9px] text-destructive mt-0.5">{pwErrors.newPass}</p>}
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">تکرار رمز جدید</Label>
                  <Input
                    type="password"
                    value={pwForm.confirm}
                    onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
                    className="text-xs h-9 mt-1"
                  />
                  {pwErrors.confirm && <p className="text-[9px] text-destructive mt-0.5">{pwErrors.confirm}</p>}
                </div>
              </div>
              {pwSuccess && (
                <div className="flex items-center gap-1.5 text-[10px] text-success bg-success/10 rounded-lg p-2">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  رمز عبور در حالت آزمایشی تغییر یافت.
                </div>
              )}
              <Button onClick={handleChangePassword} disabled={pwSaving} className="w-full text-xs h-9">
                {pwSaving ? <RefreshCw className="w-4 h-4 ml-1 animate-spin" /> : <Lock className="w-4 h-4 ml-1" />}
                تغییر رمز عبور
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-success" />
                <p className="text-xs font-bold text-foreground">وضعیت امنیت حساب</p>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">رمز عبور</span>
                  <span className="text-success flex items-center gap-0.5"><BadgeCheck className="w-3 h-3" /> تنظیم شده</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">تأیید موبایل</span>
                  <span className="text-success flex items-center gap-0.5"><BadgeCheck className="w-3 h-3" /> تأیید شده</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">تأیید ایمیل</span>
                  <span className="text-muted-foreground">—</span>
                </div>

                {/* Google Account Link */}
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-2">حساب گوگل</p>
                  {user?.email ? (
                    <div className="flex items-center gap-2 text-xs">
                      <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
                      <span className="text-foreground truncate" dir="ltr">{user.email}</span>
                      <span className="text-success text-[10px]">متصل</span>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full h-9 text-xs"
                      onClick={() => initiateGoogleLink(user?.mobile || '', '/customer/profile?google_link=1')}
                    >
                      <GoogleIcon className="w-4 h-4" />
                      اتصال حساب گوگل
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Logout */}
          {!showLogoutConfirm ? (
            <Button variant="destructive" className="w-full text-xs h-9" onClick={() => setShowLogoutConfirm(true)}>
              <LogOut className="w-4 h-4 ml-1" />
              خروج از حساب
            </Button>
          ) : (
            <Card className="shadow-sm border-destructive/30">
              <CardContent className="p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-destructive" />
                  <p className="text-xs font-bold text-foreground">خروج از حساب</p>
                </div>
                <p className="text-xs text-muted-foreground">آیا مطمئن هستید که می‌خواهید از حساب خارج شوید؟</p>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 text-xs h-9" onClick={() => setShowLogoutConfirm(false)}>
                    انصراف
                  </Button>
                  <Button variant="destructive" className="flex-1 text-xs h-9" onClick={handleLogout}>
                    <LogOut className="w-4 h-4 ml-1" />
                    خروج
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Section: Notification Settings */}
      {activeSection === 'notifications' && (
        <Card className="shadow-sm">
          <CardContent className="p-3 space-y-3">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" />
              <p className="text-xs font-bold text-foreground">تنظیمات اعلان‌ها</p>
            </div>
            <div className="space-y-3">
              {[
                { key: 'in_app', label: 'اعلان‌های داخل برنامه' },
                { key: 'orders', label: 'اعلان سفارش‌ها' },
                { key: 'messages', label: 'اعلان پیام‌ها' },
                { key: 'general', label: 'اعلان‌های عمومی' },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between">
                  <span className="text-xs text-foreground">{item.label}</span>
                  <Switch
                    checked={!!notifSettings[item.key]}
                    onCheckedChange={(val) => handleNotifToggle(item.key, val)}
                  />
                </div>
              ))}
            </div>
            {notifSaving && (
              <p className="text-[9px] text-muted-foreground flex items-center gap-1">
                <RefreshCw className="w-3 h-3 animate-spin" />
                در حال ذخیره...
              </p>
            )}
            {notifSuccess && (
              <div className="flex items-center gap-1.5 text-[10px] text-success bg-success/10 rounded-lg p-2">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                تنظیمات ذخیره شد.
              </div>
            )}
            <p className="text-[9px] text-muted-foreground">اعلان‌ها فقط در برنامه نمایش داده می‌شوند. Push و SMS فعال نیستند.</p>
          </CardContent>
        </Card>
      )}

      {/* Section: Exchange Link */}
      {activeSection === 'exchange' && (
        <Card className="shadow-sm">
          <CardContent className="p-3 space-y-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              <p className="text-xs font-bold text-foreground">ارتباط با صرافی</p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">نام صرافی:</span>
                <span className="text-foreground">{profile.exchange_name}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">کد صرافی:</span>
                <span className="font-mono text-foreground">{profile.exchange_code}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">وضعیت ارتباط:</span>
                <span className="text-success flex items-center gap-0.5"><BadgeCheck className="w-3 h-3" /> فعال</span>
              </div>
            </div>
            <Button variant="outline" className="w-full text-xs h-9" onClick={() => navigate('/customer/account')}>
              مشاهده جزئیات حساب
              <ArrowRight className="w-4 h-4 mr-1" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Quick Links */}
      <div className="grid grid-cols-3 gap-2">
        <Button variant="outline" className="flex-col h-auto py-3 gap-1" onClick={() => navigate('/customer/wallet')}>
          <Wallet className="w-4 h-4" />
          <span className="text-[10px]">کیف پول</span>
        </Button>
        <Button variant="outline" className="flex-col h-auto py-3 gap-1" onClick={() => navigate('/customer/account')}>
          <Landmark className="w-4 h-4" />
          <span className="text-[10px]">حساب من</span>
        </Button>
        <Button variant="outline" className="flex-col h-auto py-3 gap-1" onClick={() => navigate('/customer/orders')}>
          <Package className="w-4 h-4" />
          <span className="text-[10px]">سفارش‌ها</span>
        </Button>
        <Button variant="outline" className="flex-col h-auto py-3 gap-1" onClick={() => navigate('/customer/messages')}>
          <MessageSquare className="w-4 h-4" />
          <span className="text-[10px]">پیام‌ها</span>
        </Button>
        <Button variant="outline" className="flex-col h-auto py-3 gap-1" onClick={() => navigate('/customer/notifications')}>
          <Bell className="w-4 h-4" />
          <span className="text-[10px]">اعلان‌ها</span>
        </Button>
        <Button variant="outline" className="flex-col h-auto py-3 gap-1" onClick={() => navigate('/customer')}>
          <User className="w-4 h-4" />
          <span className="text-[10px]">خانه</span>
        </Button>
      </div>
    </div>
  );
}