import React, { useState } from 'react';
import { useCurrencies, useCreateCurrency, useUpdateCurrency } from '@/lib/useSarraaf';
import { PageHeader, EmptyState, LoadingState } from '@/components/sarraaf/Pieces';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import SheetSelect from '@/components/sarraaf/SheetSelect';
import { formatNumber } from '@/lib/sarraaf';
import { recordRateChange } from '@/lib/rateHistory';
import { useAuth } from '@/lib/AuthContext';
import { toast } from '@/components/ui/use-toast';
import { AmountInput } from '@/components/sarraaf/Fields';
import { Coins, Plus, Pencil, Loader2 } from 'lucide-react';

// Sort: AFN first, USD second, then by sort_order
function sortCurrencies(list) {
  return [...list].sort((a, b) => {
    if (a.code === 'AFN') return -1;
    if (b.code === 'AFN') return 1;
    if (a.code === 'USD') return -1;
    if (b.code === 'USD') return 1;
    return (a.sort_order || 0) - (b.sort_order || 0);
  });
}

export default function Currencies() {
  const { data: currencies, isLoading } = useCurrencies();
  const createMut = useCreateCurrency();
  const updateMut = useUpdateCurrency();
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ code: '', name: '', symbol: '', type: 'fiat', buy_rate: 0, sell_rate: 0, daily_rate: 0, decimals: 2, sort_order: 0 });

  const sorted = sortCurrencies(currencies || []);

  const openCreate = () => {
    setEditId(null);
    setForm({ code: '', name: '', symbol: '', type: 'fiat', buy_rate: 0, sell_rate: 0, daily_rate: 0, decimals: 2, sort_order: 0 });
    setDialogOpen(true);
  };

  const openEdit = (c) => {
    setEditId(c.id);
    setForm({ code: c.code || '', name: c.name || '', symbol: c.symbol || '', type: c.type || 'fiat', buy_rate: c.buy_rate || 0, sell_rate: c.sell_rate || 0, daily_rate: c.daily_rate || 0, decimals: c.decimals || 2, sort_order: c.sort_order || 0 });
    setDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        // Record rate change for history
        const existing = currencies?.find(c => c.id === editId);
        if (existing) {
          const oldBuy = existing.buy_rate || 0;
          const oldSell = existing.sell_rate || 0;
          if (oldBuy !== form.buy_rate || oldSell !== form.sell_rate) {
            await recordRateChange({
              currency: form.code,
              oldBuyRate: oldBuy,
              oldSellRate: oldSell,
              newBuyRate: form.buy_rate,
              newSellRate: form.sell_rate,
              changedBy: user?.full_name || user?.email || '—',
            });
          }
        }
        await updateMut.mutateAsync({ id: editId, data: form });
      } else {
        await createMut.mutateAsync({ ...form, is_active: true, is_system: false });
      }
      setDialogOpen(false);
    } catch (err) {
      toast({ title: 'خطا', description: err.message, variant: 'destructive' });
    }
  };

  const handleToggleActive = async (c) => {
    if (c.is_system) return; // System currencies can't be disabled
    try {
      await updateMut.mutateAsync({ id: c.id, data: { is_active: !c.is_active } });
    } catch (err) {
      toast({ title: 'خطا', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <>
      <PageHeader title="ارز و نرخ" subtitle="مدیریت ارزهای سیستم" icon={Coins}
        actions={<Button size="sm" onClick={openCreate}><Plus className="w-4 h-4" /> افزودن ارز</Button>}
      />

      {isLoading ? <LoadingState /> : sorted.length === 0 ? <EmptyState icon={Coins} title="ارزی تعریف نشده" /> : (
        <div className="space-y-2">
          {sorted.map(c => (
            <div key={c.id} className={`flex items-center justify-between p-3 rounded-xl border bg-card ${!c.is_active ? 'opacity-50' : ''}`}>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">{c.symbol || c.code}</div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium">{c.name}</p>
                    {c.is_system && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">سیستم</span>}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${c.type === 'crypto' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                      {c.type === 'crypto' ? 'دیجیتال' : 'رایج'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{c.code}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-left">
                  <p className="text-xs text-muted-foreground">خرید: {formatNumber(c.buy_rate, 2)}</p>
                  <p className="text-xs text-muted-foreground">فروش: {formatNumber(c.sell_rate, 2)}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Switch
                    checked={c.is_active !== false}
                    onCheckedChange={() => handleToggleActive(c)}
                    disabled={c.is_system}
                  />
                  <Button size="icon" variant="ghost" onClick={() => openEdit(c)}><Pencil className="w-4 h-4" /></Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground mt-3">
        افغانی (AFN) و دلار (USD) ارزهای پایه سیستم هستند و نمی‌توان آن‌ها را غیرفعال کرد. ارزهای غیرفعال در فرم‌های جدید نمایش داده نمی‌شوند ولی معاملات قبلی آن‌ها حفظ می‌شود.
      </p>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? 'ویرایش ارز' : 'افزودن ارز'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div><Label>کد</Label><Input value={form.code} onChange={e => setForm({...form, code: e.target.value})} placeholder="USD" required /></div>
              <div><Label>نام</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="دلر آمریکا" required /></div>
            </div>
            <div><Label>نماد</Label><Input value={form.symbol} onChange={e => setForm({...form, symbol: e.target.value})} placeholder="$" /></div>
            <div>
              <Label>نوع</Label>
              <SheetSelect
                value={form.type}
                onValueChange={v => setForm({ ...form, type: v })}
                options={[
                  { value: 'fiat', label: 'ارز رایج' },
                  { value: 'crypto', label: 'دارایی دیجیتال' },
                ]}
                placeholder="انتخاب نوع"
                title="نوع ارز"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>نرخ خرید</Label><AmountInput value={form.buy_rate} onChange={v => setForm({...form, buy_rate: v})} /></div>
              <div><Label>نرخ فروش</Label><AmountInput value={form.sell_rate} onChange={v => setForm({...form, sell_rate: v})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>نرخ روز</Label><AmountInput value={form.daily_rate} onChange={v => setForm({...form, daily_rate: v})} /></div>
              <div><Label>اعشار</Label><Input type="number" value={form.decimals} onChange={e => setForm({...form, decimals: parseInt(e.target.value) || 2})} /></div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>انصراف</Button>
              <Button type="submit" disabled={createMut.isPending || updateMut.isPending}>{(createMut.isPending || updateMut.isPending) ? <Loader2 className="w-4 h-4 animate-spin" /> : 'ذخیره'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}