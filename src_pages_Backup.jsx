import React, { useRef, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useBackupHistory, useCreateBackup, useRestoreBackup, useBackupAddon, useBackupLimit, useLocalBackups, useCreateLocalBackup, useRestoreLocalBackup, useDeleteLocalBackup } from '@/lib/useBackup';
import { FREE_MONTHLY_LIMIT } from '@/lib/backupService';
import { Smartphone, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Database, Download, Upload, Shield, Clock, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { useUpgrade } from '@/lib/UpgradeContext';
import { usePaidSystemEnabled } from '@/lib/usePaidSystem';

export default function Backup() {
  const { user } = useAuth();
  const userId = user?.id;
  const userName = user?.full_name || user?.email || '';
  const { toast } = useToast();
  const fileInputRef = useRef(null);
  const { openUpgrade } = useUpgrade();
  const { data: paidSystemEnabled } = usePaidSystemEnabled();
  const [restoreConfirm, setRestoreConfirm] = useState(null);
  const [localWarning, setLocalWarning] = useState(false);
  const [localRestoreConfirm, setLocalRestoreConfirm] = useState(null);

  const { data: history, isLoading: historyLoading } = useBackupHistory(userId);
  const { data: hasAddon } = useBackupAddon(userId);
  const { data: backupLimit } = useBackupLimit(userId, hasAddon);
  const createMut = useCreateBackup();
  const restoreMut = useRestoreBackup();
  const { data: localBackups } = useLocalBackups();
  const localCreateMut = useCreateLocalBackup();
  const localRestoreMut = useRestoreLocalBackup();
  const localDeleteMut = useDeleteLocalBackup();

  const canBackupNow = backupLimit?.allowed !== false;
  const remainingBackups = backupLimit?.remaining ?? 0;

  const handleManualBackup = async () => {
    if (!canBackupNow) {
      toast({
        title: 'محدودیت بکاپ',
        description: `سقف ماهانه ${FREE_MONTHLY_LIMIT} بکاپ رایگان تکمیل شده. برای بکاپ نامحدود، نسخه پولی را تهیه کنید.`,
        variant: 'destructive',
      });
      return;
    }
    try {
      const result = await createMut.mutateAsync({ userId, userName });
      toast({
        title: 'بکاپ گرفته شد',
        description: `${Object.values(result.counts).reduce((a, b) => a + b, 0)} رکورد دانلود شد (Excel + PDF)`,
      });
    } catch (e) {
      toast({ title: 'خطا در بکاپ', description: e.message, variant: 'destructive' });
    }
  };

  const handleLocalBackup = async () => {
    setLocalWarning(false);
    try {
      const result = await localCreateMut.mutateAsync({ userId, userName });
      toast({
        title: 'بکاپ محلی ذخیره شد',
        description: `${Object.values(result.counts).reduce((a, b) => a + b, 0)} رکورد در حافظه گوشی ذخیره شد`,
      });
    } catch (e) {
      toast({ title: 'خطا در بکاپ محلی', description: e.message, variant: 'destructive' });
    }
  };

  const handleLocalRestore = async () => {
    if (!localRestoreConfirm) return;
    try {
      const counts = await localRestoreMut.mutateAsync({ backupId: localRestoreConfirm, userId, userName });
      toast({
        title: 'بازیابی انجام شد',
        description: `${Object.values(counts).reduce((a, b) => a + b, 0)} رکورد بازگردانی شد`,
      });
    } catch (e) {
      toast({ title: 'خطا در بازیابی', description: e.message, variant: 'destructive' });
    }
    setLocalRestoreConfirm(null);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoreConfirm(file);
    e.target.value = '';
  };

  const handleRestore = async () => {
    if (!restoreConfirm) return;
    try {
      const counts = await restoreMut.mutateAsync({ file: restoreConfirm, userId, userName });
      toast({
        title: 'بازیابی انجام شد',
        description: `${Object.values(counts).reduce((a, b) => a + b, 0)} رکورد بازگردانی شد`,
      });
    } catch (e) {
      toast({ title: 'خطا در بازیابی', description: e.message, variant: 'destructive' });
    }
    setRestoreConfirm(null);
  };

  return (
    <div className="space-y-4 pb-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Database className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-bold">بکاپ و بازیابی</h1>
      </div>

      {/* Plan status */}
      <Card className={hasAddon ? 'border-success' : 'border-warning/50'}>
        <CardContent className="p-4 flex items-start gap-3">
          {hasAddon ? (
            <CheckCircle2 className="w-5 h-5 text-success mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-warning mt-0.5" />
          )}
          <div className="flex-1">
            <p className="text-sm font-bold">
              {hasAddon ? 'نسخه پولی بکاپ فعال است' : 'نسخه رایگان - بکاپ دستی فقط'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {hasAddon
                ? 'بکاپ خودکار روزانه و بازیابی برای شما فعال است'
                : 'برای بکاپ خودکار روزانه و بازیابی، نسخه پولی بکاپ را تهیه کنید'}
            </p>
            {!hasAddon && paidSystemEnabled !== false && (
              <Button size="sm" className="mt-2" onClick={() => openUpgrade('backup')}>
                <Shield className="w-4 h-4" />
                ارتقا به بکاپ پولی
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="grid grid-cols-1 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <Download className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm font-bold">بکاپ دستی</p>
                <p className="text-xs text-muted-foreground">دانلود فایل Excel (CSV) و PDF خلاصه</p>
              </div>
            </div>
            {!hasAddon && (
              <div className="mb-2 px-2 py-1.5 rounded-lg bg-warning/10 text-xs text-warning font-medium text-center">
                {canBackupNow
                  ? `${remainingBackups} بکاپ رایگان این ماه باقی مانده (از ${FREE_MONTHLY_LIMIT})`
                  : `سقف ماهانه ${FREE_MONTHLY_LIMIT} بکاپ رایگان تکمیل شد`}
              </div>
            )}
            <Button
              className="w-full"
              onClick={handleManualBackup}
              disabled={createMut.isPending || !canBackupNow}
            >
              {createMut.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> در حال بکاپ...</>
              ) : (
                <><Database className="w-4 h-4" /> بکاپ بگیر</>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className={hasAddon ? '' : 'opacity-60'}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <Upload className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm font-bold">بازیابی (Restore)</p>
                <p className="text-xs text-muted-foreground">
                  {hasAddon ? 'بازگردانی داده‌ها از فایل بکاپ' : 'مخصوص نسخه پولی بکاپ'}
                </p>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.json"
              className="hidden"
              onChange={handleFileSelect}
            />
            <Button
              variant="outline"
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
              disabled={!hasAddon || restoreMut.isPending}
            >
              {restoreMut.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> در حال بازیابی...</>
              ) : (
                <><Upload className="w-4 h-4" /> انتخاب فایل بکاپ</>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Local backup — when free limit exhausted */}
      {!hasAddon && !canBackupNow && (
        <Card className="border-warning/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <Smartphone className="w-5 h-5 text-warning" />
              <div>
                <p className="text-sm font-bold">بکاپ محلی (حافظه گوشی)</p>
                <p className="text-xs text-muted-foreground">ذخیره در حافظه گوشی — بدون ارسال به سرور</p>
              </div>
            </div>
            <div className="mb-2 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive leading-relaxed">
              <AlertTriangle className="w-4 h-4 inline-block ml-1" />
              هشدار مهم: بکاپ محلی فقط در همین گوشی ذخیره می‌شود. اگر گوشی گم شود، خراب شود یا برنامه پاک شود، تمام اطلاعات بکاپ از بین می‌رود و قابل بازیابی نیست. مسئولیت حفظ داده‌ها کاملاً بر عهده خود شماست.
            </div>
            <Button
              variant="outline"
              className="w-full border-warning text-warning hover:bg-warning/10"
              onClick={() => setLocalWarning(true)}
              disabled={localCreateMut.isPending}
            >
              {localCreateMut.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> در حال بکاپ...</>
              ) : (
                <><Smartphone className="w-4 h-4" /> بکاپ محلی بگیر</>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Local backups history */}
      {localBackups && localBackups.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-warning" />
              بکاپ‌های محلی (حافظه گوشی)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {localBackups.map(rec => (
                <div key={rec.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-warning" />
                    <div>
                      <p className="text-xs font-medium">بکاپ محلی</p>
                      <p className="text-[10px] text-muted-foreground">
                        {rec.created_date ? new Date(rec.created_date).toLocaleDateString('fa-IR') : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-left">
                      <p className="text-[10px] text-muted-foreground">
                        {rec.size_bytes ? `${(rec.size_bytes / 1024).toFixed(0)} KB` : ''}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {rec.record_counts ? Object.values(rec.record_counts).reduce((a, b) => a + b, 0) : 0} رکورد
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-primary"
                      onClick={() => setLocalRestoreConfirm(rec.id)}
                      disabled={!hasAddon}
                      title={hasAddon ? 'بازیابی' : 'مخصوص نسخه پولی'}
                    >
                      <Upload className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-destructive"
                      onClick={() => localDeleteMut.mutate(rec.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            {!hasAddon && (
              <p className="text-[10px] text-muted-foreground mt-2 text-center">
                بازیابی بکاپ محلی فقط برای نسخه پولی بکاپ فعال است
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* History */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="w-4 h-4" />
            تاریخچه بکاپ‌ها
          </CardTitle>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <p className="text-xs text-muted-foreground text-center py-4">در حال بارگذاری...</p>
          ) : !history || history.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">هنوز بکاپی ثبت نشده است</p>
          ) : (
            <div className="space-y-2">
              {history.map(rec => (
                <div key={rec.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <div className={
                      rec.type === 'manual' ? 'w-2 h-2 rounded-full bg-primary' :
                      rec.type === 'auto' ? 'w-2 h-2 rounded-full bg-success' :
                      'w-2 h-2 rounded-full bg-warning'
                    } />
                    <div>
                      <p className="text-xs font-medium">
                        {rec.type === 'manual' ? 'دستی' : rec.type === 'auto' ? 'خودکار' : 'بازیابی'}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {rec.created_date ? new Date(rec.created_date).toLocaleDateString('fa-IR') : ''}
                      </p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] text-muted-foreground">
                      {rec.size_bytes ? `${(rec.size_bytes / 1024).toFixed(0)} KB` : ''}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {rec.record_counts ? Object.values(rec.record_counts).reduce((a, b) => a + b, 0) : 0} رکورد
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Restore Confirm Dialog */}
      <Dialog open={!!restoreConfirm} onOpenChange={(o) => !o && setRestoreConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تأیید بازیابی</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            آیا مطمئنید که می‌خواهید داده‌ها از فایل «{restoreConfirm?.name}» بازیابی شود؟
            <br />
            <span className="text-destructive font-medium">داده‌های فعلی شما با داده‌های بکاپ جایگزین/ادغام خواهد شد.</span>
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreConfirm(null)}>انصراف</Button>
            <Button onClick={handleRestore} disabled={restoreMut.isPending}>
              {restoreMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'بازیابی کن'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Local Backup Warning Dialog */}
      <Dialog open={localWarning} onOpenChange={setLocalWarning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              هشدار مهم — مسئولیت شما
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm leading-relaxed">
              بکاپ محلی فقط در حافظه همین گوشی ذخیره می‌شود و به سرور ارسال نمی‌شود.
              <br /><br />
              <strong className="text-destructive">در صورت موارد زیر، اطلاعات شما برای همیشه از دست می‌رود:</strong>
              <ul className="list-disc pr-5 mt-2 space-y-1 text-xs">
                <li>گم شدن یا دزدیده شدن گوشی</li>
                <li>خراب شدن یا شکستن گوشی</li>
                <li>پاک کردن برنامه یا داده‌های برنامه</li>
                <li>ریست فکتوری کردن گوشی</li>
              </ul>
              <br />
              مسئولیت حفظ و نگه‌داری بکاپ محلی کاملاً بر عهده خود شماست. برای محافظت کامل، نسخه پولی بکاپ را تهیه کنید تا بکاپ‌ها به‌صورت خودکار در فضای ابری ذخیره شوند.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLocalWarning(false)}>انصراف</Button>
            <Button onClick={handleLocalBackup} disabled={localCreateMut.isPending}>
              {localCreateMut.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> در حال بکاپ...</>
              ) : (
                'متوجه شدم، بکاپ بگیر'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Local Restore Confirm Dialog */}
      <Dialog open={!!localRestoreConfirm} onOpenChange={(o) => !o && setLocalRestoreConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تأیید بازیابی از حافظه محلی</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            <span className="text-destructive font-medium">داده‌های فعلی شما با داده‌های بکاپ محلی جایگزین/ادغام خواهد شد.</span>
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLocalRestoreConfirm(null)}>انصراف</Button>
            <Button onClick={handleLocalRestore} disabled={localRestoreMut.isPending}>
              {localRestoreMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'بازیابی کن'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}