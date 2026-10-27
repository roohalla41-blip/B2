import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { pingSupabase } from '@/lib/supabaseHealth';

export default function KeepaliveStatus() {
  const [result, setResult] = useState(null);
  const [pinging, setPinging] = useState(false);

  const runPing = useCallback(async () => {
    setPinging(true);
    const res = await pingSupabase();
    setResult({ ...res, at: new Date() });
    setPinging(false);
  }, []);

  useEffect(() => { runPing(); }, [runPing]);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">وضعیت Keep-Alive سرور</h3>
          </div>
          <Button variant="default" size="sm" onClick={runPing} disabled={pinging} className="gap-1.5 h-7 text-xs">
            {pinging ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />}
            {pinging ? 'در حال پینگ...' : 'پینگ دستی'}
          </Button>
        </div>

        {!result ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-3">
            <Loader2 className="w-4 h-4 animate-spin" />
            در حال بررسی اتصال به Supabase...
          </div>
        ) : (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              {result.connected ? (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
              <span className={`text-sm font-medium ${result.connected ? 'text-green-600' : 'text-red-600'}`}>
                {result.connected ? 'سرور فعال و پاسخگو' : 'پاسخ غیرعادی — بررسی کنید'}
              </span>
            </div>
            {result.error && <p className="text-[11px] text-red-500">{result.error}</p>}

            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="bg-muted/50 rounded-lg p-2.5">
                <div className="text-muted-foreground mb-0.5">آخرین پینگ</div>
                <div className="font-medium">{result.at.toLocaleTimeString('fa-IR')}</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-2.5">
                <div className="text-muted-foreground mb-0.5">کد HTTP</div>
                <div className="font-medium">{result.status || '—'}</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-2.5">
                <div className="text-muted-foreground mb-0.5">زمان پاسخ</div>
                <div className="font-medium">{result.latency} میلی‌ثانیه</div>
              </div>
            </div>

            <p className="text-[10px] text-muted-foreground leading-relaxed">
              این پینگ مستقیماً از مرورگر به Supabase ارسال می‌شود و به توابع Base44 یا Integration credits وابسته نیست.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}