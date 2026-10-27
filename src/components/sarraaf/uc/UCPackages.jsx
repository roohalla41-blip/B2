import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Package, Loader2 } from 'lucide-react';
import { loadUCPackages, createUCPackage, updateUCPackage, deleteUCPackage, seedUCPackages } from '@/lib/ucApi';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/use-toast';

export default function UCPackages() {
  const qc = useQueryClient();
  const { data: packages, isLoading } = useQuery({
    queryKey: ['ucPackages'],
    queryFn: loadUCPackages,
  });
  const [showForm, setShowForm] = useState(false);
  const [editPkg, setEditPkg] = useState(null);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [form, setForm] = useState({ name: '', amount: '', price: '', original_price: '', currency: 'IRT', badge: '', image: '', display_order: 0, enabled: true });

  const openCreate = () => {
    setEditPkg(null);
    setForm({ name: '', amount: '', price: '', original_price: '', currency: 'IRT', badge: '', image: '', display_order: 0, enabled: true });
    setShowForm(true);
  };

  const openEdit = (pkg) => {
    setEditPkg(pkg);
    setForm({ name: pkg.name || '', amount: pkg.amount || '', price: pkg.price || '', original_price: pkg.original_price || '', currency: pkg.currency || 'IRT', badge: pkg.badge || '', image: pkg.image || '', display_order: pkg.display_order || 0, enabled: pkg.enabled !== false });
    setShowForm(true);
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const created = await seedUCPackages();
      if (created.length === 0) {
        toast({ title: 'بسته‌ها قبلاً ایجاد شده‌اند', description: 'تمام بسته‌های ucbama.com از قبل موجود هستند.' });
      } else {
        toast({ title: `${created.length} بسته ایجاد شد`, description: 'نرخ‌های ucbama.com با ۳٪ افزایش.' });
      }
      qc.invalidateQueries({ queryKey: ['ucPackages'] });
    } catch (err) {
      toast({ title: 'خطا در ایجاد بسته‌ها', description: err.message, variant: 'destructive' });
    }
    setSeeding(false);
  };

  const handleSave = async () => {
    if (!form.name || !form.price) {
      toast({ title: 'خطا', description: 'نام و قیمت الزامی است', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const data = {
        name: form.name,
        amount: String(form.amount),
        price: parseFloat(form.price) || 0,
        original_price: parseFloat(form.original_price) || 0,
        currency: form.currency,
        badge: form.badge,
        image: form.image,
        display_order: parseInt(form.display_order) || 0,
        enabled: form.enabled,
      };
      if (editPkg) {
        await updateUCPackage(editPkg.id, data);
        toast({ title: 'بسته به‌روزرسانی شد' });
      } else {
        await createUCPackage(data);
        toast({ title: 'بسته ایجاد شد' });
      }
      setShowForm(false);
      qc.invalidateQueries({ queryKey: ['ucPackages'] });
    } catch (err) {
      toast({ title: 'خطا', description: err.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  const handleDelete = async (pkg) => {
    if (!confirm(`حذف بسته «${pkg.name}»؟`)) return;
    try {
      await deleteUCPackage(pkg.id);
      toast({ title: 'بسته حذف شد' });
      qc.invalidateQueries({ queryKey: ['ucPackages'] });
    } catch (err) {
      toast({ title: 'خطا', description: err.message, variant: 'destructive' });
    }
  };

  const handleToggle = async (pkg) => {
    try {
      await updateUCPackage(pkg.id, { enabled: !pkg.enabled });
      qc.invalidateQueries({ queryKey: ['ucPackages'] });
    } catch (err) {
      toast({ title: 'خطا', description: err.message, variant: 'destructive' });
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-1.5"><Package className="w-4 h-4" /> بسته‌های UC</h3>
        <div className="flex gap-1">
          <Button size="sm" variant="outline" onClick={handleSeed} disabled={seeding}>
            {seeding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            بارگذاری از ucbama.com
          </Button>
          <Button size="sm" onClick={openCreate}><Plus className="w-3.5 h-3.5" /> بسته جدید</Button>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground">نرخ‌ها از ucbama.com با ۳٪ افزایش قیمت فروش محاسبه شده‌اند (ارز: تومان).</p>

      {(packages || []).length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">هنوز بسته‌ای ایجاد نشده است.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {(packages || []).map(pkg => (
            <div key={pkg.id} className="p-3 rounded-lg border space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{pkg.name}</span>
                <Switch checked={pkg.enabled !== false} onCheckedChange={() => handleToggle(pkg)} />
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
                <span>مقدار: {pkg.amount || '—'}</span>
                <span>قیمت: {Number(pkg.price || 0).toLocaleString('fa-IR')} {pkg.currency || 'AFN'}</span>
                {pkg.badge && <span>برچسب: {pkg.badge}</span>}
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => openEdit(pkg)}><Pencil className="w-3 h-3" /> ویرایش</Button>
                <Button size="sm" variant="ghost" onClick={() => handleDelete(pkg)}><Trash2 className="w-3 h-3" /> حذف</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editPkg ? 'ویرایش بسته' : 'بسته جدید'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>نام بسته *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="مثلاً ۶۰ UC" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>مقدار UC</Label><Input value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="60" dir="ltr" /></div>
              <div><Label>برچسب</Label><Input value={form.badge} onChange={e => setForm({ ...form, badge: e.target.value })} placeholder="RP" /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>قیمت *</Label><Input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="500" dir="ltr" /></div>
              <div><Label>قیمت اصلی (تخفیف)</Label><Input type="number" value={form.original_price} onChange={e => setForm({ ...form, original_price: e.target.value })} placeholder="600" dir="ltr" /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>ارز</Label><Input value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} placeholder="AFN" dir="ltr" /></div>
              <div><Label>ترتیب نمایش</Label><Input type="number" value={form.display_order} onChange={e => setForm({ ...form, display_order: e.target.value })} dir="ltr" /></div>
            </div>
            <div><Label>آدرس تصویر</Label><Input value={form.image} onChange={e => setForm({ ...form, image: e.target.value })} placeholder="https://..." dir="ltr" /></div>
            <div className="flex items-center gap-2">
              <Switch checked={form.enabled} onCheckedChange={v => setForm({ ...form, enabled: v })} />
              <Label>فعال</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>انصراف</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'ذخیره'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}