import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { verifyOtpCode, resendOtpCode, getVerificationErrorMessage, OTP_COOLDOWN, getResendCooldown, markCodeSent } from '@/lib/emailVerification';
import { ShieldCheck, Loader2, Clock, KeyRound, CheckCircle2, RefreshCw } from 'lucide-react';

function formatCountdown(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * EmailVerificationStep — OTP verification step (post-signUp).
 * Shown after supabase.auth.signUp sends the 6-digit code.
 *
 * Props:
 *   email      — the email that was signed up with
 *   onVerified — callback when OTP verification succeeds
 *   disabled   — disable all interactions (e.g. during form submit)
 */
export default function EmailVerificationStep({ email, onVerified, disabled }) {
  const [status, setStatus] = useState('code_sent'); // code_sent | verifying | verified | error
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [retryAfter, setRetryAfter] = useState(() => getResendCooldown(email));
  const timerRef = useRef(null);

  // Countdown timer
  useEffect(() => {
    if (retryAfter > 0) {
      timerRef.current = setInterval(() => {
        setRetryAfter(prev => {
          if (prev <= 1) { clearInterval(timerRef.current); return 0; }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const canVerify = code.length === 6 && status !== 'verifying' && !disabled;
  const canResend = retryAfter === 0 && status !== 'verifying' && !disabled;

  const handleVerify = async () => {
    setError('');
    setStatus('verifying');
    try {
      const result = await verifyOtpCode(email, code);
      if (!result.success) {
        setStatus('code_sent');
        setError(getVerificationErrorMessage(result.error, result.detail));
        return;
      }
      setStatus('verified');
      onVerified && onVerified(email);
    } catch (err) {
      setStatus('code_sent');
      setError(err.message || 'خطا در تأیید کد');
    }
  };

  const handleResend = async () => {
    setError('');
    try {
      const result = await resendOtpCode(email);
      if (!result.success) {
        setError(getVerificationErrorMessage(result.error, result.detail));
        return;
      }
      markCodeSent(email);
      setRetryAfter(OTP_COOLDOWN);
      timerRef.current = setInterval(() => {
        setRetryAfter(prev => {
          if (prev <= 1) { clearInterval(timerRef.current); return 0; }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      setError(err.message || 'خطا در ارسال مجدد کد');
    }
  };

  if (status === 'verified') {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 border border-success/20 text-success text-sm">
        <CheckCircle2 className="w-4 h-4 shrink-0" />
        <span>ایمیل شما تأیید شد</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-center space-y-1">
        <div className="flex justify-center">
          <KeyRound className="w-8 h-8 text-primary" />
        </div>
        <p className="text-sm font-medium text-foreground">تأیید کد ۶ رقمی</p>
        <p className="text-xs text-muted-foreground">
          درخواست کد تأیید برای <span className="font-medium text-foreground">{email}</span> ثبت شد. اگر تا چند دقیقه ایمیل نیامد، پوشه هرزنامه را بررسی کنید یا «ارسال مجدد کد» را بزنید.
        </p>
      </div>

      <div className="flex gap-2">
        <Input
          value={code}
          onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="------"
          className="text-center tracking-[0.5em] font-mono text-base"
          inputMode="numeric"
          maxLength={6}
          disabled={disabled}
          onKeyDown={e => { if (e.key === 'Enter' && canVerify) handleVerify(); }}
        />
        <Button
          type="button"
          size="sm"
          onClick={handleVerify}
          disabled={!canVerify}
          className="shrink-0"
        >
          {status === 'verifying' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
          تأیید
        </Button>
      </div>

      {error && <p className="text-xs text-destructive text-center">{error}</p>}

      <div className="flex items-center justify-center gap-2">
        {retryAfter > 0 ? (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            <span>ارسال مجدد کد: {formatCountdown(retryAfter)}</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            disabled={!canResend}
            className="flex items-center gap-1.5 text-xs text-primary hover:underline disabled:opacity-50"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            ارسال مجدد کد
          </button>
        )}
      </div>
    </div>
  );
}