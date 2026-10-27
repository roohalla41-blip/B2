import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Loader2, RefreshCw } from 'lucide-react';
import { useListExchanges, useExtendTrial, useBulkExtendTrial } from '@/lib/useAdmin';
import { getTrialDaysRemaining, isInTrialPeriod, getPlanStatus } from '@/lib/permissions';
import { useToast } from '@/components/ui/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const PLAN_LABELS = {
  free: 'رایگان',
  basic: 'پایه',
  pro: 'حرفه‌ای',
  special: 'ویژه',
};

export default function TrialManager() {
  const { data: exchanges, isLoading, error: exErr } = useListExchanges();
  const extendMut = useExtendTrial();
  const bulkMut = useBulkExtendTrial();
  const { toast } = useToast();
  const [confirmId, setConfirmId] = useState(null);
  const [confirmBulk, setConfirmBulk] = useState(false);

  const handleExtend = async () => {
    if (!confirmId) return;
    try {
      await extendMut.mutateAsync(confirmId);
      toast({ title: 'موفق', description: 'دوره آزمایشی تمدید شد' });
    } catch (err) {
      toast({ title: 'خطا', description: err.message || 'عملیات ناموفق بود', variant: 'destructive' });
    }
    setConfirmId(null);
  };

  const handleBulkExtend = async () => {
    try {
      const res = await bulkMut.mutateAsync();
      toast({ title: 'موفق', description: `دوره آزمایشی ${res.count} صراف از امروز بازنشانی شد` });
    } catch (err) {
      toast({ title: 'خطا', description: err.message || 'عملیات ناموفق بود', variant: 'destructive' });
    }
    setConfirmBulk(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  if (exErr) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-xs space-y-1">
            <p className="font-bold">خطا در بارگذاری صراف‌ها</p>
            <p>{exErr.message}</p>
            <p className="text-[10px] mt-1">اگر جدول exchanges یا مجوز RLS در Supabase موجود نیست، این خطا نمایش داده می‌شود.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const list = exchanges || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Clock className="w-4 h-4" />
          مدیریت دوره آزمایشی صرافان
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center justify-between gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium">بازنشانی همهٔ صراف‌ها</p>
            <p className="text-[10px] text-muted-foreground">دوره آزمایشی تمام صراف‌ها را به امروز بازنشانی کن (۳۰ روز رایگان).</p>
          </div>
          <Button
            size="sm"
            variant="default"
            disabled={bulkMut.isPending || list.length === 0}
            onClick={() => setConfirmBulk(true)}
            className="shrink-0 gap-1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            بازنشانی همه
          </Button>
        </div>
        {list.length === 0 ? (
          <p className="text-center text-xs text-muted-foreground py-4">صرافی ثبت نشده است</p>
        ) : (
          list.map((ex) => {
            const daysLeft = getTrialDaysRemaining(ex);
            const inTrial = isInTrialPeriod(ex);
            const status = getPlanStatus(ex);
            const isExpired = status === 'free';
            const isPaid = status === 'paid_active' || status === 'paid_expired';
            return (
              <div key={ex.id} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{ex.exchange_name || ex.name || ex.code}</p>
                  <p className="text-[10px] text-muted-foreground">{ex.code || ex.exchange_code}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {isPaid ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700">
                        {PLAN_LABELS[ex.plan] || 'پولی'}
                      </span>
                    ) : inTrial ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">
                        {toPersian(daysLeft)} روز باقی‌مانده
                      </span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700">
                        منقضی شده
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={extendMut.isPending}
                  onClick={() => setConfirmId(ex.id)}
                  className="shrink-0 gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  تمدید
                </Button>
              </div>
            );
          })
        )}
      </CardContent>

      <AlertDialog open={!!confirmId} onOpenChange={(o) => !o && setConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تمدید دوره آزمایشی</AlertDialogTitle>
            <AlertDialogDescription>
              آیا مطمئن هستید؟ دوره آزمایشی یک‌ماهه رایگان از امروز مجدداً آغاز می‌شود.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction onClick={handleExtend} disabled={extendMut.isPending}>
              {extendMut.isPending ? 'در حال اجرا...' : 'تأیید و تمدید'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmBulk} onOpenChange={setConfirmBulk}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>بازنشانی دوره آزمایشی همهٔ صراف‌ها</AlertDialogTitle>
            <AlertDialogDescription>
              این عملیات دوره آزمایشی تمام صراف‌ها را به امروز بازنشانی می‌کند (۳۰ روز رایگان). آیا مطمئن هستید؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkExtend} disabled={bulkMut.isPending}>
              {bulkMut.isPending ? 'در حال اجرا...' : 'تأیید و بازنشانی همه'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function toPersian(n) {
  return String(n || 0).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);
}