import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomers, useCreateCustomer, useUpdateCustomer } from '@/lib/useSarraaf';
import { PageHeader, EmptyState, LoadingState, StatusBadge } from '@/components/sarraaf/Pieces';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatNumber } from '@/lib/sarraaf';
import { Plus, Search, Users, Pencil, ChevronLeft, Contact } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import DesktopCustomersTable from '@/components/sarraaf/DesktopCustomersTable';

export default function Customers() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', code: '', customer_type: 'permanent', customer_group: '', status: 'active', tazkira_id: '', notes: '' });

  const { data: customers, isLoading } = useCustomers(search);
  const createMut = useCreateCustomer();
  const updateMut = useUpdateCustomer();

  const filtered = (customers || []).filter(c => {
    if (typeFilter !== 'all' && c.customer_type !== typeFilter) return false;
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    return true;
  });

  const openCreate = () => {
    setEditId(null);
    setForm({ name: '', phone: '', code: '', customer_type: 'permanent', customer_group: '', status: 'active', tazkira_id: '', notes: '' });
    setDialogOpen(true);
  };

  const pickFromContacts = async () => {
    if ('contacts' in navigator && 'select' in navigator.contacts) {
      try {
        const contacts = await navigator.contacts.select(['name', 'tel'], { multiple: false });
        if (contacts && contacts.length > 0) {
          const c = contacts[0];
          setForm(prev => ({
            ...prev,
            name: (c.name && c.name[0]) || prev.name,
            phone: (c.tel && c.tel[0]) || prev.phone,
          }));
          toast({ title: 'موفق', description: 'اطلاعات مخاطب بارگذاری شد' });
        }
      } catch (e) {
        toast({ title: 'خطا', description: 'دسترسی به مخاطبین ناموفق بود', variant: 'destructive' });
      }
    } else {
      toast({ title: 'خطا', description: 'مرورگر شما از انتخاب مخاطب پشتیبانی نمی‌کند', variant: 'destructive' });
    }
  };

  const openEdit = (c) => {
    setEditId(c.id);
    setForm({
      name: c.name || '', phone: c.phone || '', code: c.code || '',
      customer_type: c.customer_type || 'permanent', customer_group: c.customer_group || '',
      status: c.status || 'active', tazkira_id: c.tazkira_id || '', notes: c.notes || '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        await updateMut.mutateAsync({ id: editId, data: form });
      } else {
        await createMut.mutateAsync(form);
      }
      setDialogOpen(false);
    } catch (err) {
      toast({ title: 'خطا در ثبت', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <>
      <PageHeader
        title="مشتریان"
        subtitle={`${formatNumber(filtered.length)} نفر`}
        icon={Users}
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4" />
            افزودن
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex gap-2 mb-4 md:flex-wrap md:rounded-xl md:border md:border-border md:bg-card md:p-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="جستجو نام / موبایل / کد"
            className="pr-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه انواع</SelectItem>
            <SelectItem value="permanent">دائمی</SelectItem>
            <SelectItem value="temporary">موقت</SelectItem>
            <SelectItem value="misc">متفرقه</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه</SelectItem>
            <SelectItem value="active">فعال</SelectItem>
            <SelectItem value="inactive">غیرفعال</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {isLoading ? (
        <LoadingState />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Users} title="مشتری‌ای یافت نشد" description="مشتری جدید اضافه کنید" />
      ) : (
        <>
        <DesktopCustomersTable customers={filtered} onOpen={customer => navigate(`/customers/${customer.id}`)} onEdit={openEdit} />
        <div className="md:hidden space-y-2">
          {filtered.map(c => {
            const typeLabels = { permanent: 'دائمی', temporary: 'موقت', misc: 'متفرقه' };
            const typeColors = {
              permanent: 'bg-emerald-50 text-emerald-700',
              temporary: 'bg-amber-50 text-amber-700',
              misc: 'bg-slate-100 text-slate-600',
            };
            const isActive = c.status === 'active';
            return (
              <div
                key={c.id}
                className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-200 cursor-pointer"
                onClick={() => navigate(`/customers/${c.id}`)}
              >
                <div className="flex items-center gap-3 p-3.5">
                  {/* Avatar with status dot */}
                  <div className="relative shrink-0">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center text-primary font-bold text-base ring-1 ring-primary/10">
                      {(c.name || '?').charAt(0)}
                    </div>
                    <span className={`absolute -bottom-0.5 -left-0.5 w-3.5 h-3.5 rounded-full ring-2 ring-card ${isActive ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold truncate">{c.name}</span>
                      {c.customer_type && (
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${typeColors[c.customer_type] || typeColors.misc}`}>
                          {typeLabels[c.customer_type] || c.customer_type}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {c.phone ? (
                        <span className="font-mono tracking-tight" dir="ltr">{c.phone}</span>
                      ) : (
                        <span className="text-slate-400">بدون شماره</span>
                      )}
                      {c.code && (
                        <span className="text-slate-300">|</span>
                      )}
                      {c.code && (
                        <span className="font-mono">{c.code}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      onClick={e => { e.stopPropagation(); openEdit(c); }}
                      className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
                      aria-label="ویرایش"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <ChevronLeft className="w-4 h-4 text-muted-foreground/60" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        </>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? 'ویرایش مشتری' : 'افزودن مشتری'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            {!editId && (
              <Button type="button" variant="outline" className="w-full" onClick={pickFromContacts}>
                <Contact className="w-4 h-4" /> انتخاب از مخاطبین
              </Button>
            )}
            <div>
              <Label>نام <span className="text-destructive">*</span></Label>
              <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>موبایل</Label>
                <Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} inputMode="numeric" />
              </div>
              <div>
                <Label>کد</Label>
                <Input value={form.code} onChange={e => setForm({...form, code: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>نوع</Label>
                <Select value={form.customer_type} onValueChange={v => setForm({...form, customer_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="permanent">دائمی</SelectItem>
                    <SelectItem value="temporary">موقت</SelectItem>
                    <SelectItem value="misc">متفرقه</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>وضعیت</Label>
                <Select value={form.status} onValueChange={v => setForm({...form, status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">فعال</SelectItem>
                    <SelectItem value="inactive">غیرفعال</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>گروه</Label>
              <Input value={form.customer_group} onChange={e => setForm({...form, customer_group: e.target.value})} />
            </div>
            <div>
              <Label>شماره تذکره</Label>
              <Input value={form.tazkira_id} onChange={e => setForm({...form, tazkira_id: e.target.value})} />
            </div>
            <div>
              <Label>یادداشت</Label>
              <Input value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>انصراف</Button>
              <Button type="submit" disabled={createMut.isPending || updateMut.isPending}>
                {editId ? 'ذخیره' : 'افزودن'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}