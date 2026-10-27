import React, { useState } from 'react';
import { Shield, Lock, KeyRound, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Link } from 'react-router-dom';
import { directChangePassword } from '@/lib/directAuth';
import SettingsSection from './SettingsSection';
import PinSettingsSection from './PinSettingsSection';

export default function SecuritySection() {
  const { toast } = useToast();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setError('');
    if (!oldPassword || !newPassword || !confirmPassword) {
      setError('تمام فیلدها را پر کنید');
      return;
    }
    if (newPassword.length < 6) {
      setError('رمز جدید باید حداقل ۶ کاراکتر باشد');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('رمز جدید و تأیید آن مطابقت ندارند');
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token') || '';
      const result = await directChangePassword(token, oldPassword, newPassword);
      if (!result.success) {
        const msgs = {
          wrong_password: 'رمز فعلی اشتباه است',
          user_not_found: 'کاربر یافت نشد',
          invalid_token: 'نشست نامعتبر است — دوباره وارد شوید',
        };
        setError(msgs[result.error] || 'خطا در تغییر رمز');
        return;
      }
      toast({ title: 'رمز تغییر یافت', description: 'رمز عبور شما با موفقیت به‌روزرسانی شد' });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.message || 'خطا در تغییر رمز');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <SettingsSection
      icon={Shield}
      title="امنیت و رمز عبور"
      description="تغییر رمز عبور و امنیت حساب"
    >
      <div className="space-y-3">
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-success/5 border border-success/20">
          <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
          <p className="text-[11px] text-success font-medium">حساب شما فعال و ایمن است</p>
        </div>

        <div>
          <Label className="text-xs">رمز عبور فعلی</Label>
          <div className="relative mt-1">
            <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="password"
              value={oldPassword}
              onChange={e => setOldPassword(e.target.value)}
              className="pr-9 h-10"
              placeholder="رمز فعلی را وارد کنید"
            />
          </div>
        </div>
        <div>
          <Label className="text-xs">رمز عبور جدید</Label>
          <div className="relative mt-1">
            <KeyRound className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="pr-9 h-10"
              placeholder="رمز جدید (حداقل ۶ کاراکتر)"
            />
          </div>
        </div>
        <div>
          <Label className="text-xs">تأیید رمز عبور جدید</Label>
          <div className="relative mt-1">
            <KeyRound className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="pr-9 h-10"
              placeholder="رمز جدید را مجدد وارد کنید"
            />
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-destructive/5 border border-destructive/20">
            <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
            <p className="text-xs text-destructive">{error}</p>
          </div>
        )}

        <Button onClick={handleSave} disabled={loading} className="w-full h-10">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
          تغییر رمز عبور
        </Button>

        <div className="text-center">
          <Link to="/forgot-password" className="text-xs text-muted-foreground hover:text-primary transition-colors">
            رمز عبور را فراموش کرده‌اید؟
          </Link>
        </div>
      </div>
    </SettingsSection>

    <PinSettingsSection />
    </>
  );
}