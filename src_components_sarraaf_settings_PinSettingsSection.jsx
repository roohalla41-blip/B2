import React, { useState, useEffect } from 'react';
import { Lock, Loader2, CheckCircle2, AlertCircle, Shield } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import SettingsSection from './SettingsSection';
import {
  isPinSet,
  setPin,
  clearPin,
  verifyPin,
} from '@/lib/pinLock';

export default function PinSettingsSection() {
  const { toast } = useToast();
  const [pinEnabled, setPinEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Setup/change PIN state
  const [showSetup, setShowSetup] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  // Change PIN state
  const [showChange, setShowChange] = useState(false);
  const [currentPin, setCurrentPin] = useState('');
  const [changedPin, setChangedPin] = useState('');
  const [changedConfirm, setChangedConfirm] = useState('');

  useEffect(() => {
    setPinEnabled(isPinSet());
  }, []);

  const refreshState = () => {
    setPinEnabled(isPinSet());
  };

  // ── Enable PIN ──
  const handleEnablePin = async () => {
    setError('');
    if (!/^\d{4}$/.test(newPin)) {
      setError('رمز باید ۴ رقم باشد');
      return;
    }
    if (newPin !== confirmPin) {
      setError('رمز و تأیید آن مطابقت ندارند');
      return;
    }
    setLoading(true);
    const result = await setPin(newPin);
    setLoading(false);
    if (result.success) {
      toast({ title: 'قفل فعال شد', description: 'رمز برنامه با موفقیت تنظیم شد' });
      setNewPin('');
      setConfirmPin('');
      setShowSetup(false);
      refreshState();
    } else {
      setError('خطا در تنظیم رمز');
    }
  };

  // ── Disable PIN ──
  const handleDisablePin = () => {
    clearPin();
    refreshState();
    toast({ title: 'قفل غیرفعال شد', description: 'رمز برنامه حذف شد' });
  };

  // ── Change PIN ──
  const handleChangePin = async () => {
    setError('');
    if (!/^\d{4}$/.test(currentPin)) {
      setError('رمز فعلی را صحیح وارد کنید');
      return;
    }
    if (!/^\d{4}$/.test(changedPin)) {
      setError('رمز جدید باید ۴ رقم باشد');
      return;
    }
    if (changedPin !== changedConfirm) {
      setError('رمز جدید و تأیید آن مطابقت ندارند');
      return;
    }
    setLoading(true);
    const verify = await verifyPin(currentPin);
    if (!verify.success) {
      setLoading(false);
      setError(verify.error === 'locked_out' ? 'تلاش‌های زیادی — بعداً تلاش کنید' : 'رمز فعلی اشتباه است');
      return;
    }
    const result = await setPin(changedPin);
    setLoading(false);
    if (result.success) {
      toast({ title: 'رمز تغییر یافت', description: 'رمز جدید برنامه تنظیم شد' });
      setCurrentPin('');
      setChangedPin('');
      setChangedConfirm('');
      setShowChange(false);
      refreshState();
    } else {
      setError('خطا در تنظیم رمز جدید');
    }
  };

  return (
    <SettingsSection
      icon={Shield}
      title="قفل برنامه"
      description="قفل اختیاری با رمز ۴ رقمی و اثر انگشت"
    >
      <div className="space-y-4">
        {/* Data loss warning */}
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-warning/5 border border-warning/20">
          <AlertCircle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
          <p className="text-[11px] text-warning leading-relaxed">
            با پاک‌کردن داده‌های برنامه یا حذف آن، ممکن است اطلاعات ذخیره‌شده فقط روی این گوشی،
            از جمله داده‌های همگام‌نشده، از بین بروند و قابل‌بازیابی نباشند. اطلاعات ثبت‌شده و
            تأییدشده در حساب کاربری شما جداگانه باقی می‌مانند. برای بازیابی حساب به نام کاربری و رمز
            عبور نیاز دارید.
          </p>
        </div>

        {/* PIN status */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-2">
            {pinEnabled ? (
              <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
            ) : (
              <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
            )}
            <span className="text-xs font-medium">
              {pinEnabled ? 'قفل PIN فعال است' : 'قفل PIN غیرفعال است'}
            </span>
          </div>
          {pinEnabled && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDisablePin}
              className="text-destructive text-xs h-7"
            >
              غیرفعال‌سازی
            </Button>
          )}
        </div>

        {/* Enable PIN flow */}
        {!pinEnabled && !showSetup && (
          <Button onClick={() => setShowSetup(true)} variant="outline" className="w-full h-10">
            <Lock className="w-4 h-4" />
            فعال‌سازی قفل PIN
          </Button>
        )}

        {showSetup && (
          <div className="space-y-3 p-3 rounded-lg border border-border">
            <div>
              <Label className="text-xs">رمز ۴ رقمی جدید</Label>
              <Input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                className="mt-1 h-10 tracking-widest text-center"
                placeholder="••••"
              />
            </div>
            <div>
              <Label className="text-xs">تأیید رمز</Label>
              <Input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                className="mt-1 h-10 tracking-widest text-center"
                placeholder="••••"
              />
            </div>
            {error && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-destructive/5 border border-destructive/20">
                <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                <p className="text-xs text-destructive">{error}</p>
              </div>
            )}
            <div className="flex gap-2">
              <Button onClick={handleEnablePin} disabled={loading} className="flex-1 h-9">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                تنظیم رمز
              </Button>
              <Button
                variant="ghost"
                onClick={() => { setShowSetup(false); setNewPin(''); setConfirmPin(''); setError(''); }}
                className="h-9"
              >
                انصراف
              </Button>
            </div>
          </div>
        )}

        {/* Change PIN */}
        {pinEnabled && !showChange && (
          <Button onClick={() => setShowChange(true)} variant="outline" className="w-full h-10">
            <Lock className="w-4 h-4" />
            تغییر رمز
          </Button>
        )}

        {showChange && (
          <div className="space-y-3 p-3 rounded-lg border border-border">
            <div>
              <Label className="text-xs">رمز فعلی</Label>
              <Input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
                className="mt-1 h-10 tracking-widest text-center"
                placeholder="••••"
              />
            </div>
            <div>
              <Label className="text-xs">رمز جدید</Label>
              <Input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={changedPin}
                onChange={(e) => setChangedPin(e.target.value.replace(/\D/g, ''))}
                className="mt-1 h-10 tracking-widest text-center"
                placeholder="••••"
              />
            </div>
            <div>
              <Label className="text-xs">تأیید رمز جدید</Label>
              <Input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={changedConfirm}
                onChange={(e) => setChangedConfirm(e.target.value.replace(/\D/g, ''))}
                className="mt-1 h-10 tracking-widest text-center"
                placeholder="••••"
              />
            </div>
            {error && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-destructive/5 border border-destructive/20">
                <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                <p className="text-xs text-destructive">{error}</p>
              </div>
            )}
            <div className="flex gap-2">
              <Button onClick={handleChangePin} disabled={loading} className="flex-1 h-9">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                تغییر رمز
              </Button>
              <Button
                variant="ghost"
                onClick={() => { setShowChange(false); setCurrentPin(''); setChangedPin(''); setChangedConfirm(''); setError(''); }}
                className="h-9"
              >
                انصراف
              </Button>
            </div>
          </div>
        )}

      </div>
    </SettingsSection>
  );
}