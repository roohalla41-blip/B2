import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import SarraafLogo from '@/components/SarraafLogo';
import AuthLayout from '@/components/AuthLayout';
import { resetPassword as supabaseResetPassword } from '@/lib/supabaseAuth';
import { Mail, ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await supabaseResetPassword(email);
    } catch {
      // ignore — always show generic success
    }
    setSent(true);
    setLoading(false);
  };

  return (
    <AuthLayout
      icon={Mail}
      title="فراموشی رمز عبور"
      subtitle="حساب صراف — سامانه تخصصی مدیریت صرافی"
    >
      <div className="flex justify-center mb-6">
        <SarraafLogo size={56} />
      </div>

      {sent ? (
        <div className="space-y-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-success/10 border border-success/20 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-success" />
          </div>
          <p className="text-sm text-muted-foreground">
            اگر ایمیل وارد شده در سیستم موجود باشد، لینک بازنشانی رمز عبور ارسال شد.
          </p>
          <Link to="/login">
            <Button className="w-full h-11">
              <ArrowLeft className="w-4 h-4" />
              بازگشت به ورود
            </Button>
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>ایمیل</Label>
            <div className="relative mt-1">
              <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="pr-9 h-11"
                required
              />
            </div>
          </div>
          <Button type="submit" className="w-full h-11" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
            {loading ? 'در حال ارسال...' : 'ارسال لینک بازنشانی'}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}