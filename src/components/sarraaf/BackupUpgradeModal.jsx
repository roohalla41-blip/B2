import React from 'react';
import { useActivateBackupAddon } from '@/lib/useBackup';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Shield, CheckCircle2, Loader2 } from 'lucide-react';

const FEATURES = [
  'بکاپ خودکار روزانه',
  'نگه‌داری ابری امن تا ۳۰ نسخه',
  'بازیابی داده‌ها با یک کلیک',
  'تاریخچه کامل بکاپ‌ها',
  'محافظت از داده‌ها در صورت خرابی دستگاه',
];

export default function BackupUpgradeModal({ open, onClose, userId, userName }) {
  const { toast } = useToast();
  const activateMut = useActivateBackupAddon();

  const handlePurchase = async () => {
    try {
      await activateMut.mutateAsync({ userId, userName, durationMonths: 12 });
      toast({
        title: 'بکاپ پولی فعال شد',
        description: 'بکاپ خودکار روزانه برای شما فعال شد',
      });
      onClose();
    } catch (e) {
      toast({ title: 'خطا', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            نسخه پولی بکاپ
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-sm text-muted-foreground">
            با تهیه نسخه پولی بکاپ، اطلاعات شما هرگز از دست نمی‌رود.
          </p>
          <div className="space-y-2">
            {FEATURES.map((f, i) => (
              <div key={i} className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                <span className="text-sm">{f}</span>
              </div>
            ))}
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-primary">۱,۰۰۰ افغانی</p>
            <p className="text-xs text-muted-foreground mt-1">سالانه / ۱۲ ماه</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>انصراف</Button>
          <Button onClick={handlePurchase} disabled={activateMut.isPending}>
            {activateMut.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> در حال فعال‌سازی...</>
            ) : (
              <><Shield className="w-4 h-4" /> خرید و فعال‌سازی</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}