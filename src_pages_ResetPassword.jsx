import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updatePassword as supabaseUpdatePassword, isAuthenticated as supabaseIsAuthenticated } from '@/lib/supabaseAuth';
import { Lock, Loader2, AlertTriangle } from 'lucide-react';
import AuthLayout from '@/components/AuthLayout';

export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    supabaseIsAuthenticated().then(authed => {
      setHasSession(authed);
      setCheckingSession(false);
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError('رمز عبور و تکرار آن یکسان نیستند');
      return;
    }
    if (newPassword.length < 8) {
      setError('رمز عبور باید حداقل ۸ کاراکتر باشد');
      return;
    }
    setLoading(true);
    try {
      await supabaseUpdatePassword(newPassword);
      window.location.href = '/login';
    } catch (err) {
      setError(err.message || 'خطا در بازنشانی رمز عبور');
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <AuthLayout
        icon={Loader2}
        title="بررسی نشست"
        subtitle="در حال بررسی لینک بازنشانی..."
      >
        <div className="flex justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AuthLayout>
    );
  }

  if (!hasSession) {
    return (
      <AuthLayout
        icon={AlertTriangle}
        title="لینک نامعتبر"
        subtitle="لینک بازنشانی رمز عبور نامعتبر یا منقضی است"
        footer={
          <Link to="/forgot-password" className="text-primary font-medium hover:text-primary/80">
            درخواست لینک جدید
          </Link>
        }
      >
        <p className="text-sm text-muted-foreground text-center">
          لینکی که استفاده کردید نامعتبر است یا منقضی شده است. لطفاً از طریق فراموشی رمز عبور، لینک جدیدی دریافت کنید.
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      icon={Lock}
      title="رمز عبور جدید"
      subtitle="رمز عبور جدید خود را وارد کنید"
    >
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">رمز عبور جدید</Label>
          <div className="relative">
            <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="pr-9 h-11"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">تکرار رمز عبور</Label>
          <div className="relative">
            <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="confirm"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="pr-9 h-11"
              required
            />
          </div>
        </div>
        <Button type="submit" className="w-full h-11" disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {loading ? 'در حال بازنشانی...' : 'بازنشانی رمز عبور'}
        </Button>
      </form>
    </AuthLayout>
  );
}