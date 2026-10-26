import React, { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Trash2, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { createSupabaseEntity } from '@/lib/supabaseApi';
import { useToast } from '@/components/ui/use-toast';

/**
 * DeleteAccountDialog — double-confirmation modal for account deletion.
 *
 * Step 1: Warning + ask user to type "DELETE" to confirm.
 * Step 2: Final confirmation button.
 *
 * Triggers deletion of user profile records (SarraafProfile / Customer).
 * Does NOT delete Supabase Auth user — that must be done via Supabase dashboard
 * or a backend function with service role.
 */
export default function DeleteAccountDialog({ open, onClose }) {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const canConfirm = confirmText.trim().toUpperCase() === 'DELETE';

  const handleDelete = async () => {
    if (!canConfirm || deleting) return;
    setDeleting(true);
    try {
      // Delete profile records based on role
      const role = user?.role || 'user';
      if (role === 'customer') {
        const Customer = createSupabaseEntity('Customer');
        await Customer.deleteMany({ user_id: String(user.id) });
      } else {
        const SarraafProfile = createSupabaseEntity('SarraafProfile');
        await SarraafProfile.deleteMany({ user_id: String(user.id) });
      }

      toast({
        title: 'حساب حذف شد',
        description: 'اطلاعات پروفایل شما با موفقیت حذف شد.',
      });

      // Logout and redirect
      await logout();
      window.location.href = '/';
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'خطا',
        description: e.message || 'حذف حساب با خطا مواجه شد.',
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleClose = () => {
    setConfirmText('');
    setDeleting(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            حذف حساب کاربری
          </DialogTitle>
          <DialogDescription className="text-right">
            این عملیات قابل بازگشت نیست. تمام اطلاعات پروفایل شما برای همیشه حذف خواهد شد.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-1">
            <p className="text-xs font-medium text-destructive">هشدار:</p>
            <ul className="text-xs text-muted-foreground space-y-0.5 list-disc pr-4">
              <li>پروفایل و اطلاعات مرتبط حذف می‌شود</li>
              <li>سابقه تراکنش‌ها ممکن است برای گزارش‌گیری باقی بماند</li>
              <li>حساب احراز هویت (Auth) باید جداگانه حذف شود</li>
            </ul>
          </div>

          <div>
            <Label className="text-xs">
              برای تأیید، کلمه <strong className="text-destructive">DELETE</strong> را وارد کنید:
            </Label>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="mt-1 h-9"
              placeholder="DELETE"
              dir="ltr"
              disabled={deleting}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={handleClose} disabled={deleting}>
            انصراف
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={!canConfirm || deleting}
          >
            {deleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                در حال حذف...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                حذف دائمی حساب
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}