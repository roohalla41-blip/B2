import React, { useState, useEffect } from 'react';
import SarraafLogo from '@/components/SarraafLogo';

export default function WelcomeSplash({ onDone, message = 'حساب صراف' }) {
  const [progress, setProgress] = useState(1);

  useEffect(() => {
    // Remove the HTML splash overlay so React takes over
    const el = document.getElementById('custom-splash-overlay');
    if (el) el.remove();

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => onDone?.(), 200);
          return 100;
        }
        return prev + 2;
      });
    }, 30);
    return () => clearInterval(interval);
  }, [onDone]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-muted/30 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm flex flex-col items-center gap-6">
        {/* Logo */}
        <div className="flex justify-center">
          <SarraafLogo size={100} />
        </div>

        {/* Welcome text */}
        <div className="text-center space-y-1.5">
          <h1 className="text-2xl font-bold">{message}</h1>
          <p className="text-sm text-muted-foreground">در حال بارگذاری برنامه...</p>
        </div>

        {/* Counter 1-100 */}
        <div className="w-full space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">پیشرفت</span>
            <span className="text-2xl font-bold text-primary tabular-nums">{progress}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-100 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground/50 mt-10">© {new Date().getFullYear()} حساب صراف</p>
    </div>
  );
}