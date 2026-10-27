import React, { useState } from 'react';
import { useAllNotifications, useSendNotification, useDeleteNotification, useAllSarraafProfiles } from '@/lib/useAdmin';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { Bell, Plus, Trash2, Send } from 'lucide-react';

const NOTIFICATION_TEMPLATES = [
  { kind: 'paid_purchase', title: 'خرید نسخه پولی', message: 'درخواست خرید نسخه پولی دریافت شد. پس از تأیید، حساب شما فعال خواهد شد.' },
  { kind: 'paid_activated', title: 'فعال شدن نسخه پولی', message: 'نسخه پولی حساب شما فعال شد. از امکانات ویژه لذت ببرید.' },
  { kind: 'paid_expired', title: 'پایان اعتبار نسخه پولی', message: 'اعتبار نسخه پولی شما به پایان رسید. حساب شما به نسخه رایگان بازگشت.' },
  { kind: 'general', title: 'اطلاعیه عمومی', message: 'اطلاعیه جدیدی از سیستم همراه ما.' },
  { kind: 'account_limitation', title: 'محدودیت حساب', message: 'حساب شما با محدودیت مواجه شده است. برای اطلاعات بیشتر با پشتیبانی تماس بگیرید.' },
  { kind: 'feature_toggle', title: 'تغییر وضعیت قابلیت', message: 'یکی از قابلیت‌های حساب شما تغییر یافت.' },
  { kind: 'app_update', title: 'آپدیت برنامه', message: 'نسخه جدید برنامه منتشر شده است. لطفاً برنامه را به‌روزرسانی کنید.' },
  { kind: 'custom', title: 'پیام سفارشی', message: '' },
];

export default function NotificationManager() {
  const { user } = useAuth();
  const { data: notifications, isLoading, error: notifErr } = useAllNotifications();
  const { data: profiles, error: profileErr } = useAllSarraafProfiles();
  const sendMut = useSendNotification();
  const deleteMut = useDeleteNotification();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ targetRole: 'all', targetUserId: '', title: '', message: '', kind: 'general', actionUrl: '', actionLabel: '' });

  const openCreate = () => {
    setForm({ targetRole: 'all', targetUserId: '', title: '', message: '', kind: 'general', actionUrl: '', actionLabel: '' });
    setShowForm(true);
  };

  const applyTemplate = (kind) => {
    const tpl = NOTIFICATION_TEMPLATES.find(t => t.kind === kind);
    if (tpl) setForm({ ...form, kind, title: tpl.title, message: tpl.message });
  };

  const handleSend = async () => {
    if (!form.title.trim() || !form.message.trim()) {
      toast({ title: 'خطا', description: 'عنوان و متن پیام الزامی است', variant: 'destructive' });
      return;
    }
    const targetProfile = profiles?.find(p => p.user_id === form.targetUserId);
    try {
      await sendMut.mutateAsync({
        targetUserId: form.targetRole === 'specific' ? form.targetUserId : '',
        targetUserName: targetProfile?.name || '',
        targetRole: form.targetRole === 'specific' ? 'sarraaf' : form.targetRole,
        title: form.title.trim(),
        message: form.message.trim(),
        kind: form.kind,
        actionUrl: form.actionUrl.trim(),
        actionLabel: form.actionLabel.trim() || (form.kind === 'app_update' ? 'دانلود آپدیت' : ''),
        sentByName: user?.full_name || user?.email || 'مدیر سیستم',
      });
      toast({ title: 'ارسال شد', description: 'پیام به کاربر ارسال شد' });
      setShowForm(false);
    } catch (err) {
      toast({ title: 'خطا', description: err.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteMut.mutateAsync(id);
      toast({ title: 'حذف شد' });
    } catch (err) {
      toast({ title: 'خطا', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Bell className="w-4 h-4" />
            پیام‌ها و اطلاع‌رسانی
          </h3>
          <Button size="sm" onClick={openCreate}>
            <Plus className="w-3.5 h-3.5" />
            پیام جدید
          </Button>
        </div>

        {notifErr && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-xs mb-2">
            <p className="font-bold">خطا در بارگذاری اعلان‌ها</p>
            <p>{notifErr.message}</p>
          </div>
        )}
        {profileErr && (
          <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 text-amber-700 text-xs mb-2">
            لیست صراف‌ها بارگذاری نشد: {profileErr.message}
          </div>
        )}
        {isLoading ? (
          <p className="text-xs text-muted-foreground">در حال بارگذاری...</p>
        ) : !notifications || notifications.length === 0 ? (
          <p className="text-xs text-muted-foreground">پیامی وجود ندارد</p>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto scrollbar-thin">
            {notifications.map(n => (
              <div key={n.id} className="p-2.5 rounded-lg border">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{n.title}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                    <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1 text-[9px] text-muted-foreground">
                      <span>گیرنده: {n.target_role === 'all' ? 'همه' : n.target_user_name || '—'}</span>
                      <span>نوع: {n.kind}</span>
                      {n.sent_by_name && <span>ارسال‌کننده: {n.sent_by_name}</span>}
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(n.id)}>
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>ارسال پیام</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>نوع پیام (قالب آماده)</Label>
              <Select value={form.kind} onValueChange={applyTemplate}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {NOTIFICATION_TEMPLATES.map(t => (
                    <SelectItem key={t.kind} value={t.kind}>{t.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>گیرنده</Label>
              <Select value={form.targetRole} onValueChange={v => setForm({ ...form, targetRole: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">همه کاربران</SelectItem>
                  <SelectItem value="sarraaf">همه صرافان</SelectItem>
                  <SelectItem value="customer">همه مشتریان</SelectItem>
                  <SelectItem value="employee">همه کارمندان</SelectItem>
                  <SelectItem value="specific">کاربر خاص</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.targetRole === 'specific' && (
              <div>
                <Label>انتخاب کاربر</Label>
                <Select value={form.targetUserId} onValueChange={v => setForm({ ...form, targetUserId: v })}>
                  <SelectTrigger><SelectValue placeholder="انتخاب کاربر" /></SelectTrigger>
                  <SelectContent>
                    {(profiles || []).map(p => (
                      <SelectItem key={p.id} value={p.user_id}>{p.name} ({p.code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>عنوان</Label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="عنوان پیام" />
            </div>
            <div>
              <Label>متن پیام</Label>
              <Textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} placeholder="متن پیام" rows={4} />
            </div>
            {form.kind === 'app_update' && (
              <div className="space-y-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <p className="text-xs font-medium text-amber-700 dark:text-amber-400">لینک آپدیت</p>
                <div>
                  <Label>آدرس دانلود</Label>
                  <Input value={form.actionUrl} onChange={e => setForm({ ...form, actionUrl: e.target.value })} placeholder="https://your-domain.com" dir="ltr" />
                </div>
                <div>
                  <Label>متن دکمه</Label>
                  <Input value={form.actionLabel} onChange={e => setForm({ ...form, actionLabel: e.target.value })} placeholder="دانلود آپدیت" />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>انصراف</Button>
            <Button onClick={handleSend} disabled={sendMut.isPending}>
              <Send className="w-3.5 h-3.5" />
              {sendMut.isPending ? 'در حال ارسال...' : 'ارسال'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}