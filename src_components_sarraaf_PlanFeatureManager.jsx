import React, { useState } from 'react';
import { useFeatures, useToggleFeature } from '@/lib/useSarraaf';
import { useUpdateFeaturePlan, useCreateFeature, usePlanQuotas, useCreatePlanQuota, useUpdatePlanQuota } from '@/lib/useAdmin';
import { FEATURE_CATALOG, CRITICAL_FEATURES } from '@/lib/features';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { ShieldCheck, Plus, Lock, Globe, AlertTriangle } from 'lucide-react';

export default function PlanFeatureManager() {
  const { data: features, error: featureErr } = useFeatures();
  const { data: planQuotas, error: quotaErr } = usePlanQuotas();
  const toggleMut = useToggleFeature();
  const planMut = useUpdateFeaturePlan();
  const createQuotaMut = useCreatePlanQuota();
  const updateQuotaMut = useUpdatePlanQuota();
  const createFeatureMut = useCreateFeature();

  const [showAdd, setShowAdd] = useState(false);
  const [newFeature, setNewFeature] = useState({ feature_key: '', name: '', icon: 'Settings', location: 'page' });
  const [quotaModal, setQuotaModal] = useState(null);
  const [quotaForm, setQuotaForm] = useState({ plan: 'free', feature_key: '', max_transactions: -1, max_customers: -1, max_messages: -1, max_prints: -1 });

  const handleToggle = async (f) => {
    if (CRITICAL_FEATURES.includes(f.feature_key)) return;
    const current = features?.find(fx => fx.feature_key === f.feature_key);
    if (!current) {
      try {
        await createFeatureMut.mutateAsync({
          feature_key: f.feature_key,
          name: f.name,
          icon: f.icon,
          location: f.location,
          display_order: f.display_order,
          enabled: true,
          status: f.default_status || 'active',
          free_enabled: true,
          paid_enabled: true,
        });
      } catch (err) {
        toast({ title: 'خطا', description: err.message, variant: 'destructive' });
      }
      return;
    }
    toggleMut.mutate({ id: current.id, enabled: !current.enabled });
  };

  const handlePlanToggle = async (f, field) => {
    const current = features?.find(fx => fx.feature_key === f.feature_key);
    if (!current) {
      try {
        await createFeatureMut.mutateAsync({
          feature_key: f.feature_key,
          name: f.name,
          icon: f.icon,
          location: f.location,
          display_order: f.display_order,
          enabled: true,
          status: f.default_status || 'active',
          free_enabled: field !== 'free',
          paid_enabled: field !== 'paid',
        });
      } catch (err) {
        toast({ title: 'خطا', description: err.message, variant: 'destructive' });
      }
      return;
    }
    try {
      await planMut.mutateAsync({
        id: current.id,
        free_enabled: field === 'free' ? !current.free_enabled : current.free_enabled !== false,
        paid_enabled: field === 'paid' ? !current.paid_enabled : current.paid_enabled !== false,
      });
    } catch (err) {
      toast({ title: 'خطا', description: err.message, variant: 'destructive' });
    }
  };

  const openQuotaModal = (featureKey) => {
    setQuotaForm({ plan: 'free', feature_key: featureKey, max_transactions: -1, max_customers: -1, max_messages: -1, max_prints: -1 });
    setQuotaModal(featureKey);
  };

  const handleSaveQuota = async () => {
    try {
      const existing = planQuotas?.find(q => q.plan === quotaForm.plan && q.feature_key === quotaForm.feature_key);
      if (existing) {
        await updateQuotaMut.mutateAsync({ id: existing.id, data: quotaForm });
      } else {
        await createQuotaMut.mutateAsync(quotaForm);
      }
      toast({ title: 'ذخیره شد', description: 'سهمیه به‌روزرسانی شد' });
      setQuotaModal(null);
    } catch (err) {
      toast({ title: 'خطا', description: err.message, variant: 'destructive' });
    }
  };

  const handleAddFeature = async () => {
    if (!newFeature.feature_key.trim() || !newFeature.name.trim()) {
      toast({ title: 'خطا', description: 'کلید و نام الزامی است', variant: 'destructive' });
      return;
    }
    try {
      await createFeatureMut.mutateAsync({
        ...newFeature,
        display_order: 99,
        enabled: true,
        free_enabled: true,
        paid_enabled: true,
      });
      toast({ title: 'افزوده شد', description: 'قابلیت جدید ایجاد شد' });
      setShowAdd(false);
      setNewFeature({ feature_key: '', name: '', icon: 'Settings', location: 'page' });
    } catch (err) {
      toast({ title: 'خطا', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-3">
      {/* Feature Plan Access */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              دسترسی قابلیت‌ها بر اساس نسخه
            </h3>
            <Button size="sm" variant="outline" onClick={() => setShowAdd(true)}>
              <Plus className="w-3.5 h-3.5" />
              قابلیت جدید
            </Button>
          </div>

          {(featureErr || quotaErr) && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-xs space-y-1 mb-3">
              <p className="font-bold flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> خطا در بارگذاری</p>
              {featureErr && <p>قابلیت‌ها: {featureErr.message}</p>}
              {quotaErr && <p>سهمیه‌ها: {quotaErr.message}</p>}
            </div>
          )}

          <div className="space-y-2">
            {FEATURE_CATALOG.map(f => {
              const dbFeature = features?.find(fx => fx.feature_key === f.feature_key);
              const enabled = dbFeature ? dbFeature.enabled !== false : true;
              const freeEnabled = dbFeature ? dbFeature.free_enabled !== false : true;
              const paidEnabled = dbFeature ? dbFeature.paid_enabled !== false : true;
              const isCritical = CRITICAL_FEATURES.includes(f.feature_key);
              return (
                <div key={f.feature_key} className="p-2.5 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{f.name}</span>
                    <span className="text-[9px] text-muted-foreground">{f.feature_key}</span>
                  </div>
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <Switch checked={enabled} disabled={isCritical} onCheckedChange={() => handleToggle(f)} />
                      <span className="text-[10px] text-muted-foreground">فعال کلی</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Switch checked={freeEnabled} disabled={isCritical} onCheckedChange={() => handlePlanToggle(f, 'free')} />
                      <span className="text-[10px] text-blue-600">رایگان</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Switch checked={paidEnabled} disabled={isCritical} onCheckedChange={() => handlePlanToggle(f, 'paid')} />
                      <span className="text-[10px] text-green-600">پولی</span>
                    </div>
                    <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => openQuotaModal(f.feature_key)}>
                      سهمیه
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Plan Quotas Overview */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-3">سهمیه‌های تعریف‌شده</h3>
          {!planQuotas || planQuotas.length === 0 ? (
            <p className="text-xs text-muted-foreground">سهمیه‌ای تعریف نشده. از دکمه «سهمیه» کنار هر قابلیت اضافه کنید.</p>
          ) : (
            <div className="space-y-1.5">
              {planQuotas.map(q => (
                <div key={q.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-xs">
                  <div className="flex items-center gap-2">
                    {q.plan === 'free' ? <Globe className="w-3 h-3 text-blue-600" /> : <Lock className="w-3 h-3 text-green-600" />}
                    <span>{q.feature_key}</span>
                    <span className="text-muted-foreground">{q.plan === 'free' ? 'رایگان' : 'پولی'}</span>
                  </div>
                  <div className="flex gap-2 text-[10px] text-muted-foreground">
                    <span>تراکنش: {q.max_transactions < 0 ? 'نامحدود' : q.max_transactions}</span>
                    <span>مشتری: {q.max_customers < 0 ? 'نامحدود' : q.max_customers}</span>
                    <span>پیام: {q.max_messages < 0 ? 'نامحدود' : q.max_messages}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Feature Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>قابلیت جدید</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>کلید قابلیت (انگلیسی)</Label>
              <Input value={newFeature.feature_key} onChange={e => setNewFeature({ ...newFeature, feature_key: e.target.value })} placeholder="my_feature" />
            </div>
            <div>
              <Label>نام نمایشی</Label>
              <Input value={newFeature.name} onChange={e => setNewFeature({ ...newFeature, name: e.target.value })} placeholder="نام قابلیت" />
            </div>
            <div>
              <Label>محل</Label>
              <Input value={newFeature.location} onChange={e => setNewFeature({ ...newFeature, location: e.target.value })} placeholder="nav / action / page" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>انصراف</Button>
            <Button onClick={handleAddFeature} disabled={createFeatureMut.isPending}>افزودن</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quota Dialog */}
      <Dialog open={!!quotaModal} onOpenChange={() => setQuotaModal(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>سهمیه: {quotaModal}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>پلن</Label>
              <div className="flex gap-2">
                <Button size="sm" variant={quotaForm.plan === 'free' ? 'default' : 'outline'} onClick={() => setQuotaForm({ ...quotaForm, plan: 'free' })}>رایگان</Button>
                <Button size="sm" variant={quotaForm.plan === 'paid' ? 'default' : 'outline'} onClick={() => setQuotaForm({ ...quotaForm, plan: 'paid' })}>پولی</Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>حد تراکنش (-1 = نامحدود)</Label>
                <Input type="number" value={quotaForm.max_transactions} onChange={e => setQuotaForm({ ...quotaForm, max_transactions: parseInt(e.target.value) || -1 })} />
              </div>
              <div>
                <Label>حد مشتری</Label>
                <Input type="number" value={quotaForm.max_customers} onChange={e => setQuotaForm({ ...quotaForm, max_customers: parseInt(e.target.value) || -1 })} />
              </div>
              <div>
                <Label>حد پیام</Label>
                <Input type="number" value={quotaForm.max_messages} onChange={e => setQuotaForm({ ...quotaForm, max_messages: parseInt(e.target.value) || -1 })} />
              </div>
              <div>
                <Label>حد چاپ</Label>
                <Input type="number" value={quotaForm.max_prints} onChange={e => setQuotaForm({ ...quotaForm, max_prints: parseInt(e.target.value) || -1 })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuotaModal(null)}>انصراف</Button>
            <Button onClick={handleSaveQuota} disabled={createQuotaMut.isPending || updateQuotaMut.isPending}>ذخیره</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}