import React, { useState, useEffect, useCallback } from 'react';
import { Lock, Delete, AlertCircle, Loader2 } from 'lucide-react';
import { verifyPin, getLockoutRemaining } from '@/lib/pinLock';

export default function AppLock({ onUnlock, onForgotPin }) {
  const [entered, setEntered] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);

  // Lockout countdown
  useEffect(() => {
    const checkLockout = () => {
      const r = getLockoutRemaining();
      setLockoutRemaining(r);
      if (r === 0) setError('');
    };
    checkLockout();
    if (lockoutRemaining > 0) {
      const t = setInterval(checkLockout, 1000);
      return () => clearInterval(t);
    }
  }, [lockoutRemaining]);

  // Auto-verify when 4 digits entered
  const handlePinComplete = useCallback(async (pin) => {
    if (lockoutRemaining > 0) return;
    setLoading(true);
    setError('');
    const result = await verifyPin(pin);
    setLoading(false);

    if (result.success) {
      onUnlock();
    } else if (result.error === 'locked_out') {
      setLockoutRemaining(result.remaining);
      setEntered('');
    } else if (result.error === 'wrong_pin') {
      setError(`رمز اشتباه است — ${result.attemptsRemaining} تلاش باقی مانده`);
      setEntered('');
    } else {
      setError('خطا در بررسی رمز');
      setEntered('');
    }
  }, [lockoutRemaining, onUnlock]);

  const handleDigit = (digit) => {
    if (entered.length >= 4 || loading || lockoutRemaining > 0) return;
    const next = entered + digit;
    setEntered(next);
    if (next.length === 4) {
      setTimeout(() => handlePinComplete(next), 150);
    }
  };

  const handleDelete = () => {
    setEntered(entered.slice(0, -1));
    setError('');
  };

  const isLockedOut = lockoutRemaining > 0;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background safe-area" dir="rtl">
      <div className="w-full max-w-xs px-6 flex flex-col items-center gap-6">
        {/* Lock icon */}
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Lock className="w-8 h-8 text-primary" />
        </div>

        <div className="text-center">
          <h2 className="text-lg font-bold text-foreground">قفل برنامه</h2>
          <p className="text-xs text-muted-foreground mt-1">رمز ۴ رقمی را وارد کنید</p>
        </div>

        {/* PIN dots */}
        <div className="flex gap-3 justify-center">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-3.5 h-3.5 rounded-full transition-colors ${
                i < entered.length
                  ? 'bg-primary'
                  : 'bg-muted border border-border'
              }`}
            />
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/5 border border-destructive/20">
            <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
            <p className="text-xs text-destructive">{error}</p>
          </div>
        )}

        {/* Lockout countdown */}
        {isLockedOut && (
          <p className="text-xs text-muted-foreground">
            {lockoutRemaining} ثانیه صبر کنید
          </p>
        )}

        {/* Number pad */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[240px]">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <button
              key={d}
              onClick={() => handleDigit(d)}
              disabled={loading || isLockedOut}
              className="aspect-square rounded-xl bg-muted hover:bg-muted/70 transition-colors text-xl font-semibold text-foreground disabled:opacity-40 active:scale-95"
            >
              {d}
            </button>
          ))}
          <button
            onClick={() => handleDigit('0')}
            disabled={loading || isLockedOut}
            className="aspect-square rounded-xl bg-muted hover:bg-muted/70 transition-colors text-xl font-semibold text-foreground disabled:opacity-40 active:scale-95"
          >
            0
          </button>
          <button
            onClick={handleDelete}
            disabled={loading || entered.length === 0}
            className="aspect-square rounded-xl bg-muted hover:bg-muted/70 transition-colors flex items-center justify-center disabled:opacity-40 active:scale-95"
          >
            <Delete className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Forgot PIN */}
        <button
          onClick={onForgotPin}
          className="text-xs text-muted-foreground hover:text-primary transition-colors mt-2"
        >
          رمز را فراموش کرده‌ام
        </button>
      </div>
    </div>
  );
}