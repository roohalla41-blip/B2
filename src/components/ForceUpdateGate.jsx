import React, { useState, useEffect } from 'react';
import { getCurrentVersionInfo, APP_VERSION, isOutdated } from '@/lib/versionManager';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Download, Loader2, RefreshCw } from 'lucide-react';

export default function ForceUpdateGate({ children }) {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const v = await getCurrentVersionInfo();
        if (!mounted) return;
        setInfo(v);
      } catch {
        // If we can't check, don't block the user
        if (!mounted) return;
        setInfo(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return (
      <div className="fixed inset-0 z-[60] bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  // Block only if: mandatory flag is set AND published version is newer than app version
  const mustUpdate = info?.is_mandatory && isOutdated(APP_VERSION, info.version);

  if (!mustUpdate) return children;

  return (
    <div className="fixed inset-0 z-[60] bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b border-border bg-destructive/5">
        <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
        <h2 className="font-bold text-sm text-destructive">آپدیت اجباری برنامه</h2>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="flex flex-col items-center text-center gap-3 pt-4">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <h3 className="font-bold text-base">برنامه باید به‌روزرسانی شود</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            نسخه جدیدی از برنامه منتشر شده است که نصب آن الزامی است.
            برای ادامه استفاده از حساب کاربری، لطفاً برنامه را به‌روزرسانی کنید.
          </p>
        </div>

        {/* Version info */}
        <div className="rounded-lg border border-border p-3 space-y-2 bg-muted/30">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">نسخه فعلی شما:</span>
            <span className="font-mono font-semibold">{APP_VERSION}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">نسخه جدید:</span>
            <span className="font-mono font-semibold text-success">{info?.version}</span>
          </div>
        </div>

        {/* Release notes */}
        {info?.release_notes && (
          <div className="rounded-lg border border-border p-3 space-y-2">
            <h4 className="text-xs font-semibold flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" />
              تغییرات نسخه جدید:
            </h4>
            <div className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {info.release_notes}
            </div>
          </div>
        )}
      </div>

      {/* Footer — download button, no bypass */}
      <div className="p-4 border-t border-border space-y-2">
        {info?.download_url ? (
          <Button
            className="w-full"
            size="lg"
            onClick={() => {
              if (info.download_url) {
                window.open(info.download_url, '_blank');
              }
            }}
          >
            <Download className="w-4 h-4" />
            دانلود نسخه جدید
          </Button>
        ) : (
          <div className="w-full text-center text-xs text-muted-foreground p-3 rounded-lg bg-muted/50">
            لطفاً از فروشگاه برنامه‌ها (Google Play / App Store) آپدیت را دریافت کنید.
          </div>
        )}
        <p className="text-[10px] text-center text-muted-foreground">
          تا زمان نصب نسخه جدید، دسترسی به حساب کاربری مسدود است.
        </p>
      </div>
    </div>
  );
}