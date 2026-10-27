import React, { useState, useEffect, useCallback } from 'react';
import { createSupabaseEntity } from '@/lib/supabaseApi';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Trash2, Plus, Shield, UserCog, Clock } from 'lucide-react';

const sbBuilderAccess = createSupabaseEntity('BuilderAccess');

const ALL_TABS = [
  { key: 'system', label: 'سیستم' },
  { key: 'features', label: 'بخش‌ها' },
  { key: 'users', label: 'کاربران' },
  { key: 'perms', label: 'مجوزها' },
  { key: 'plans', label: 'پلن‌ها' },
  { key: 'pricing', label: 'قیمت‌گذاری' },
  { key: 'notif', label: 'اعلان‌ها' },
  { key: 'chat', label: 'چت' },
  { key: 'payments', label: 'پرداخت' },
  { key: 'withdrawals', label: 'برداشت‌ها' },
  { key: 'version', label: 'نسخه' },
  { key: 'backup', label: 'پشتیبان' },
  { key: 'backup_v2', label: 'پشتیبان v2' },
];

export default function CoCreatorManager() {
  const { toast } = useToast();
  const [accessList, setAccessList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', notes: '', allowed_tabs: ['system', 'features', 'users'] });

  const loadAccess = useCallback(async () => {
    setLoading(true);
    try {
      const list = await sbBuilderAccess.list();
      setAccessList(list || []);
    } catch {
      toast({ title: 'خطا', description: 'بارگذاری لیست کمک‌سازنده‌ها ناموفق بود', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadAccess(); }, [loadAccess]);

  const handleAdd = async () => {
    if (!form.name.trim()) {
      toast({ title: 'خطا', description: 'نام الزامی است', variant: 'destructive' });
      return;
    }
    if (!form.email.trim() && !form.phone.trim()) {
      toast({ title: 'خطا', description: 'حداقل ایمیل یا شماره الزامی است', variant: 'destructive' });
      return;
    }
    try {
      await sbBuilderAccess.create({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        allowed_tabs: form.allowed_tabs,
        status: 'active',
        notes: form.notes.trim(),
      });
      toast({ title: 'افزوده شد', description: 'دسترسی کمک‌سازنده ثبت شد' });
      setShowForm(false);
      setForm({ name: '', email: '', phone: '', notes: '', allowed_tabs: ['system', 'features', 'users'] });
      loadAccess();
    } catch (err) {
      toast({ title: 'خطا', description: err.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id) => {
    try {
      await sbBuilderAccess.delete(id);
      toast({ title: 'حذف شد', description: 'دسترسی کمک‌سازنده حذف شد' });
      loadAccess();
    } catch (err) {
      toast({ title: 'خطا', description: err.message, variant: 'destructive' });
    }
  };

  const toggleTab = (tabKey) => {
    setForm(prev => ({
      ...prev,
      allowed_tabs: prev.allowed_tabs.includes(tabKey)
        ? prev.allowed_tabs.filter(t => t !== tabKey)
        : [...prev.allowed_tabs, tabKey],
    }));
  };

  const toggleStatus = async (item) => {
    try {
      await sbBuilderAccess.update(item.id, { status: item.status === 'active' ? 'suspended' : 'active' });
      loadAccess();
    } catch (err) {
      toast({ title: 'خطا', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCog className="w-5 h-5 text-primary" />
            <div>
              <h3 className="text-sm font-bold">مدیریت کمک‌سازنده‌ها</h3>
              <p className="text-[10px] text-muted-foreground">دسترسی پنل سازنده برای ایمیل/شماره مشخص</p>
            </div>
          </div>
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus className="w-4 h-4" />
            افزودن
          </Button>
        </div>

        {/* Auto-logout notice */}
        <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[10px]">
          <Clock className="w-3.5 h-3.5 shrink-0" />
          خروج خودکار: پس از ۳۰ دقیقه بی‌فعالیتی در پنل سازنده، نشست به‌صورت خودکار پایان می‌یابد.
        </div>

        {/* Add Form */}
        {showForm && (
          <div className="space-y-3 p-3 rounded-xl border bg-muted/30">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">نام</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="نام کمک‌سازنده" className="h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs">ایمیل</Label>
                <Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" className="h-8 text-sm" dir="ltr" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">شماره موبایل</Label>
                <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="07xx..." className="h-8 text-sm" dir="ltr" />
              </div>
              <div>
                <Label className="text-xs">یادداشت</Label>
                <Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="اختیاری" className="h-8 text-sm" />
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1 block">تب‌های مجاز</Label>
              <div className="flex flex-wrap gap-1">
                {ALL_TABS.map(tab => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => toggleTab(tab.key)}
                    className={`text-[10px] px-2 py-1 rounded-full border transition-colors ${
                      form.allowed_tabs.includes(tab.key)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background text-muted-foreground border-border'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd}>ثبت دسترسی</Button>
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>انصراف</Button>
            </div>
          </div>
        )}

        {/* List */}
        {loading ? (
          <p className="text-xs text-muted-foreground text-center py-4">در حال بارگذاری...</p>
        ) : accessList.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">هیچ کمک‌سازنده‌ای ثبت نشده است</p>
        ) : (
          <div className="space-y-2">
            {accessList.map(item => (
              <div key={item.id} className="flex items-center justify-between p-2.5 rounded-lg border">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${item.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {item.status === 'active' ? 'فعال' : 'معلق'}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate" dir="ltr">
                    {item.email || '—'} | {item.phone || '—'}
                  </p>
                  <div className="flex flex-wrap gap-0.5 mt-1">
                    {(item.allowed_tabs || []).map(t => {
                      const tab = ALL_TABS.find(x => x.key === t);
                      return tab ? <span key={t} className="text-[8px] px-1 py-0.5 rounded bg-primary/10 text-primary">{tab.label}</span> : null;
                    })}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Switch checked={item.status === 'active'} onCheckedChange={() => toggleStatus(item)} />
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(item.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}