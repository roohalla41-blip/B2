import React, { useState, useMemo } from 'react';
import { useTransactions, useCurrencies, useRateSettings, useCustomers, useEditTransaction, useSoftDeleteTransaction, useCreateCustomer, usePostDocument } from '@/lib/useSarraaf';
import { useAuth } from '@/lib/AuthContext';
import { PageHeader, LoadingState, EmptyState, StatusBadge } from '@/components/sarraaf/Pieces';
import { trialBalanceBase } from '@/lib/ledger';
import { formatDate, formatNumber, TX_TYPE_LABELS, todayJalali, nextDocumentNo } from '@/lib/sarraaf';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { ScrollText, Printer, FileSpreadsheet, Plus, Pencil, Trash2, ChevronDown, ChevronUp, Contact, AlertTriangle } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { AmountInput } from '@/components/sarraaf/Fields';

const CUSTOMER_SIDE_LABELS = {
  debit: 'بدهکار',
  credit: 'بستانکار',
  none: '—',
};

export default function GeneralLedger() {
  const { user } = useAuth();
  const { data: txs, isLoading } = useTransactions();
  const { data: currencies } = useCurrencies();
  const { data: rateSettings } = useRateSettings();
  const { data: customers } = useCustomers();
  const editMut = useEditTransaction();
  const deleteMut = useSoftDeleteTransaction();
  const createCustomerMut = useCreateCustomer();
  const postDocMut = usePostDocument();

  const [search, setSearch] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showDeleted, setShowDeleted] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  // Add transaction dialog
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    date: todayJalali(),
    type: 'manual',
    currency: 'AFN',
    amount: 0,
    customer_side: 'none',
    description: '',
    customer_id: '',
    customer_name: '',
    customer_phone: '',
  });

  // Edit dialog
  const [editTx, setEditTx] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editNote, setEditNote] = useState('');

  // Delete dialog
  const [deleteTx, setDeleteTx] = useState(null);
  const [deleteNote, setDeleteNote] = useState('');

  // Customer picker from contacts
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [customerForm, setCustomerForm] = useState({ name: '', phone: '', code: '', customer_type: 'permanent', notes: '' });

  const activeTxs = useMemo(() => (txs || []).filter(t => showDeleted ? true : !t.deleted), [txs, showDeleted]);

  const filtered = activeTxs.filter(t => {
    if (currencyFilter !== 'all' && t.currency !== currencyFilter) return false;
    if (typeFilter !== 'all' && t.type !== typeFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (t.description || '').toLowerCase().includes(s)
        || (t.document_no || '').toLowerCase().includes(s)
        || (t.customer_name || '').toLowerCase().includes(s)
        || (t.customer_phone || '').toLowerCase().includes(s);
    }
    return true;
  });

  const trial = txs ? trialBalanceBase(activeTxs, rateSettings || {}, currencies || []) : null;

  const exportExcel = () => {
    const rows = filtered.map(t => ({
      'تاریخ': t.date, 'شماره سند': t.document_no, 'نوع': TX_TYPE_LABELS[t.type] || t.type,
      'ارز': t.currency, 'مبلغ': t.amount, 'مشتری': t.customer_name || '', 'موبایل': t.customer_phone || '',
      'توضیحات': t.description || '', 'ویرایش‌شده': t.edited ? 'بله' : 'خیر', 'حذف‌شده': t.deleted ? 'بله' : 'خیر',
    }));
    const csv = '\uFEFF' + Object.keys(rows[0] || {}).join(',') + '\n' + rows.map(r => Object.values(r).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'general-ledger.csv'; a.click();
  };

  // ── Contact picker ──
  const pickFromContacts = async () => {
    if ('contacts' in navigator && 'select' in navigator.contacts) {
      try {
        const contacts = await navigator.contacts.select(['name', 'tel'], { multiple: false });
        if (contacts && contacts.length > 0) {
          const c = contacts[0];
          const name = (c.name && c.name[0]) || '';
          const phone = (c.tel && c.tel[0]) || '';
          setCustomerForm(prev => ({ ...prev, name, phone }));
        }
      } catch (e) {
        toast({ title: 'خطا', description: 'دسترسی به مخاطبین ناموفق بود', variant: 'destructive' });
      }
    } else {
      toast({ title: 'خطا', description: 'مرورگر شما از انتخاب مخاطب پشتیبانی نمی‌کند', variant: 'destructive' });
    }
  };

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    if (!customerForm.name) return;
    const created = await createCustomerMut.mutateAsync(customerForm);
    setAddForm(prev => ({
      ...prev,
      customer_id: created?.id || '',
      customer_name: customerForm.name,
      customer_phone: customerForm.phone,
      description: prev.description || `تحویل وجه به ${customerForm.name}${customerForm.phone ? `\nشماره موبایل: ${customerForm.phone}` : ''}`,
    }));
    setCustomerDialogOpen(false);
    setCustomerForm({ name: '', phone: '', code: '', customer_type: 'permanent', notes: '' });
    toast({ title: 'موفق', description: 'مشتری اضافه شد' });
  };

  // ── Add transaction ──
  const handleAddTx = async (e) => {
    e.preventDefault();
    const docNo = await nextDocumentNo('DV');
    const lines = [{
      date: addForm.date,
      document_no: docNo,
      type: addForm.type,
      currency: addForm.currency,
      amount: Number(addForm.amount) || 0,
      customer_side: addForm.customer_side,
      customer_id: addForm.customer_id || undefined,
      customer_name: addForm.customer_name || undefined,
      customer_phone: addForm.customer_phone || undefined,
      description: addForm.description || undefined,
    }];
    await postDocMut.mutateAsync(lines);
    setAddOpen(false);
    setAddForm({
      date: todayJalali(),
      type: 'manual',
      currency: 'AFN',
      amount: 0,
      customer_side: 'none',
      description: '',
      customer_id: '',
      customer_name: '',
      customer_phone: '',
    });
    toast({ title: 'موفق', description: 'سند ثبت شد' });
  };

  const selectExistingCustomer = (c) => {
    setAddForm(prev => ({
      ...prev,
      customer_id: c.id,
      customer_name: c.name,
      customer_phone: c.phone || '',
      description: prev.description || `تحویل وجه به ${c.name}${c.phone ? `\nشماره موبایل: ${c.phone}` : ''}`,
    }));
  };

  // ── Edit transaction ──
  const openEdit = (t) => {
    setEditTx(t);
    setEditForm({
      date: t.date || todayJalali(),
      type: t.type || 'manual',
      currency: t.currency || 'AFN',
      amount: t.amount || 0,
      customer_side: t.customer_side || 'none',
      description: t.description || '',
      customer_name: t.customer_name || '',
      customer_phone: t.customer_phone || '',
    });
    setEditNote('');
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    await editMut.mutateAsync({
      id: editTx.id,
      data: {
        date: editForm.date,
        type: editForm.type,
        currency: editForm.currency,
        amount: Number(editForm.amount) || 0,
        customer_side: editForm.customer_side,
        description: editForm.description,
        customer_name: editForm.customer_name,
        customer_phone: editForm.customer_phone,
        edit_note: editNote,
        edited_by_name: user?.full_name || '',
      },
    });
    setEditTx(null);
    toast({ title: 'موفق', description: 'سند ویرایش شد. سند اصلی در دیتابیس حفظ شده است.' });
  };

  // ── Soft-delete transaction ──
  const handleDelete = async () => {
    await deleteMut.mutateAsync({
      id: deleteTx.id,
      note: deleteNote,
      userName: user?.full_name || '',
    });
    setDeleteTx(null);
    setDeleteNote('');
    toast({ title: 'موفق', description: 'سند حذف شد. این سند به‌عنوان سند رسمی در دیتابیس باقی می‌ماند.' });
  };

  return (
    <>
      <PageHeader title="دفتر کل" icon={ScrollText}
        actions={
          <div className="flex gap-1">
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">سند جدید</span>
            </Button>
            <Button size="sm" variant="outline" onClick={exportExcel}><FileSpreadsheet className="w-4 h-4" /></Button>
            <Button size="sm" variant="outline" onClick={() => window.print()}><Printer className="w-4 h-4" /></Button>
          </div>
        }
      />

      {/* Trial balance summary */}
      {trial && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="p-3 rounded-lg bg-success/10 text-center">
            <p className="text-xs text-muted-foreground">بدهکار کل</p>
            <p className="text-lg font-bold text-success">{formatNumber(trial.totalDebit)}</p>
          </div>
          <div className="p-3 rounded-lg bg-primary/10 text-center">
            <p className="text-xs text-muted-foreground">بستانکار کل</p>
            <p className="text-lg font-bold text-primary">{formatNumber(trial.totalCredit)}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 mb-3 flex-wrap">
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="جستجو..." className="flex-1 min-w-[120px]" />
        <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
          <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">همه ارز</SelectItem><SelectItem value="AFN">AFN</SelectItem><SelectItem value="USD">USD</SelectItem><SelectItem value="IRT">IRT</SelectItem></SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">همه انواع</SelectItem>{Object.entries(TX_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
        </Select>
        <Button size="sm" variant={showDeleted ? 'default' : 'outline'} onClick={() => setShowDeleted(!showDeleted)}>
          {showDeleted ? 'نمایش همه' : 'حذف‌شده‌ها'}
        </Button>
      </div>

      {/* Transaction list with full details */}
      {isLoading ? <LoadingState /> : filtered.length === 0 ? <EmptyState icon={ScrollText} title="رکوردی نیست" /> : (
        <div className="space-y-1">
          {filtered.slice(0, 100).map(t => {
            const isExpanded = expandedId === t.id;
            return (
              <div key={t.id} className={`rounded-lg border bg-card text-sm overflow-hidden ${t.deleted ? 'opacity-50' : ''}`}>
                <div
                  className="flex items-center justify-between py-2 px-3 cursor-pointer hover:bg-muted/30"
                  onClick={() => setExpandedId(isExpanded ? null : t.id)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-medium">{TX_TYPE_LABELS[t.type] || t.type}</span>
                      {t.document_no && <span className="text-xs text-muted-foreground">• {t.document_no}</span>}
                      <span className="text-xs text-muted-foreground">{formatDate(t.date)}</span>
                      {t.edited && <StatusBadge status="pending" labels={{ pending: 'ویرایش‌شده' }} variant="warning" />}
                      {t.deleted && <StatusBadge status="cancelled" labels={{ cancelled: 'حذف‌شده' }} variant="destructive" />}
                    </div>
                    {t.customer_name && (
                      <p className="text-xs text-muted-foreground mt-0.5">مشتری: {t.customer_name}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <div className="text-left">
                      <span className="font-mono font-bold">{formatNumber(t.amount, 2)}</span>
                      <span className="text-xs text-muted-foreground mr-1">{t.currency}</span>
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </div>
                {isExpanded && (
                  <div className="px-3 pb-3 pt-1 border-t space-y-1.5 bg-muted/10">
                    {t.description && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground">توضیحات:</p>
                        <p className="text-sm whitespace-pre-line">{t.description}</p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                      {t.customer_name && <div><span className="text-muted-foreground">نام مشتری: </span>{t.customer_name}</div>}
                      {t.customer_phone && <div><span className="text-muted-foreground">موبایل: </span>{t.customer_phone}</div>}
                      {t.customer_side && t.customer_side !== 'none' && <div><span className="text-muted-foreground">سمت مشتری: </span>{CUSTOMER_SIDE_LABELS[t.customer_side]}</div>}
                      {t.counter_type && t.counter_type !== 'none' && <div><span className="text-muted-foreground">مقابل: </span>{t.counter_type}</div>}
                      {t.rate && <div><span className="text-muted-foreground">نرخ: </span>{formatNumber(t.rate, 2)}</div>}
                      {t.fee ? <div><span className="text-muted-foreground">کارمزد: </span>{formatNumber(t.fee, 2)} {t.fee_currency || ''}</div> : null}
                      {t.pair_currency && <div><span className="text-muted-foreground">ارز جفت: </span>{t.pair_currency}</div>}
                      {t.pair_amount ? <div><span className="text-muted-foreground">مبلغ جفت: </span>{formatNumber(t.pair_amount, 2)}</div> : null}
                    </div>
                    {t.edit_note && (
                      <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-2 rounded">
                        <span className="font-semibold">یادداشت ویرایش: </span>{t.edit_note}
                      </div>
                    )}
                    {t.deleted && t.delete_note && (
                      <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                        <span className="font-semibold">یادداشت حذف: </span>{t.delete_note}
                      </div>
                    )}
                    {!t.deleted && (
                      <div className="flex gap-2 pt-1">
                        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); openEdit(t); }}>
                          <Pencil className="w-3 h-3" /> ویرایش
                        </Button>
                        <Button size="sm" variant="outline" className="text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteTx(t); }}>
                          <Trash2 className="w-3 h-3" /> حذف
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add Transaction Dialog ── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>سند جدید</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddTx} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>تاریخ</Label>
                <Input value={addForm.date} onChange={e => setAddForm({ ...addForm, date: e.target.value })} required />
              </div>
              <div>
                <Label>نوع سند</Label>
                <Select value={addForm.type} onValueChange={v => setAddForm({ ...addForm, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(TX_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>ارز</Label>
                <Select value={addForm.currency} onValueChange={v => setAddForm({ ...addForm, currency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="AFN">AFN</SelectItem><SelectItem value="USD">USD</SelectItem><SelectItem value="IRT">IRT</SelectItem></SelectContent>
                </Select>
              </div>
              <div>
                <Label>مبلغ <span className="text-destructive">*</span></Label>
                <AmountInput value={addForm.amount} onChange={v => setAddForm({ ...addForm, amount: v })} />
              </div>
            </div>
            <div>
              <Label>سمت مشتری</Label>
              <Select value={addForm.customer_side} onValueChange={v => setAddForm({ ...addForm, customer_side: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  <SelectItem value="debit">بدهکار</SelectItem>
                  <SelectItem value="credit">بستانکار</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Customer section */}
            <div className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">مشتری</Label>
                <Button type="button" size="sm" variant="outline" onClick={() => setCustomerDialogOpen(true)}>
                  <Plus className="w-3 h-3" /> افزودن مشتری
                </Button>
              </div>
              {customers && customers.length > 0 && (
                <Select value={addForm.customer_id} onValueChange={(v) => {
                  const c = customers.find(c => c.id === v);
                  if (c) selectExistingCustomer(c);
                }}>
                  <SelectTrigger><SelectValue placeholder="انتخاب از مشتریان موجود" /></SelectTrigger>
                  <SelectContent>
                    {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name} {c.phone ? `• ${c.phone}` : ''}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              {addForm.customer_name && (
                <div className="text-xs bg-muted/30 rounded p-2 space-y-0.5">
                  <div><span className="text-muted-foreground">نام: </span>{addForm.customer_name}</div>
                  {addForm.customer_phone && <div><span className="text-muted-foreground">موبایل: </span>{addForm.customer_phone}</div>}
                </div>
              )}
            </div>

            <div>
              <Label>توضیحات (چند خط)</Label>
              <Textarea
                value={addForm.description}
                onChange={e => setAddForm({ ...addForm, description: e.target.value })}
                placeholder="تحویل وجه به ..."
                rows={3}
                className="resize-y"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>انصراف</Button>
              <Button type="submit" disabled={postDocMut.isPending}>ثبت سند</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Customer from Contacts Dialog ── */}
      <Dialog open={customerDialogOpen} onOpenChange={setCustomerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>افزودن مشتری</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateCustomer} className="space-y-3">
            <Button type="button" variant="outline" className="w-full" onClick={pickFromContacts}>
              <Contact className="w-4 h-4" /> انتخاب از مخاطبین
            </Button>
            <div>
              <Label>نام <span className="text-destructive">*</span></Label>
              <Input value={customerForm.name} onChange={e => setCustomerForm({ ...customerForm, name: e.target.value })} required />
            </div>
            <div>
              <Label>موبایل</Label>
              <Input value={customerForm.phone} onChange={e => setCustomerForm({ ...customerForm, phone: e.target.value })} inputMode="numeric" />
            </div>
            <div>
              <Label>کد</Label>
              <Input value={customerForm.code} onChange={e => setCustomerForm({ ...customerForm, code: e.target.value })} />
            </div>
            <div>
              <Label>نوع</Label>
              <Select value={customerForm.customer_type} onValueChange={v => setCustomerForm({ ...customerForm, customer_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="permanent">دائمی</SelectItem>
                  <SelectItem value="temporary">موقت</SelectItem>
                  <SelectItem value="misc">متفرقه</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>یادداشت</Label>
              <Input value={customerForm.notes} onChange={e => setCustomerForm({ ...customerForm, notes: e.target.value })} />
            </div>
            <p className="text-xs text-muted-foreground">فیلدهای موبایل، کد و یادداشت اختیاری هستند.</p>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCustomerDialogOpen(false)}>انصراف</Button>
              <Button type="submit" disabled={createCustomerMut.isPending}>افزودن</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog ── */}
      <Dialog open={!!editTx} onOpenChange={(v) => !v && setEditTx(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>ویرایش سند</DialogTitle>
          </DialogHeader>
          {editTx && (
            <form onSubmit={handleEdit} className="space-y-3">
              <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>این سند ویرایش خواهد شد، اما نسخه اصلی در دیتابیس حفظ می‌شود. این یک سند رسمی است و در آینده قابل مراجعه خواهد بود.</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>تاریخ</Label>
                  <Input value={editForm.date} onChange={e => setEditForm({ ...editForm, date: e.target.value })} required />
                </div>
                <div>
                  <Label>نوع</Label>
                  <Select value={editForm.type} onValueChange={v => setEditForm({ ...editForm, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(TX_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>ارز</Label>
                  <Select value={editForm.currency} onValueChange={v => setEditForm({ ...editForm, currency: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="AFN">AFN</SelectItem><SelectItem value="USD">USD</SelectItem><SelectItem value="IRT">IRT</SelectItem></SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>مبلغ</Label>
                  <AmountInput value={editForm.amount} onChange={v => setEditForm({ ...editForm, amount: v })} />
                </div>
              </div>
              <div>
                <Label>سمت مشتری</Label>
                <Select value={editForm.customer_side} onValueChange={v => setEditForm({ ...editForm, customer_side: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    <SelectItem value="debit">بدهکار</SelectItem>
                    <SelectItem value="credit">بستانکار</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>نام مشتری</Label>
                  <Input value={editForm.customer_name || ''} onChange={e => setEditForm({ ...editForm, customer_name: e.target.value })} />
                </div>
                <div>
                  <Label>موبایل</Label>
                  <Input value={editForm.customer_phone || ''} onChange={e => setEditForm({ ...editForm, customer_phone: e.target.value })} inputMode="numeric" />
                </div>
              </div>
              <div>
                <Label>توضیحات</Label>
                <Textarea value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} rows={3} className="resize-y" />
              </div>
              <div>
                <Label>یادداشت ویرایش</Label>
                <Input value={editNote} onChange={e => setEditNote(e.target.value)} placeholder="دلیل ویرایش..." />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditTx(null)}>انصراف</Button>
                <Button type="submit" disabled={editMut.isPending}>ذخیره</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete (soft-delete) Dialog ── */}
      <AlertDialog open={!!deleteTx} onOpenChange={(v) => !v && setDeleteTx(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              حذف سند
            </AlertDialogTitle>
            <AlertDialogDescription>
              این سند حذف خواهد شد، اما هرگز از دیتابیس پاک نمی‌شود. این یک سند رسمی ثبت‌شده است و در آینده قابل مراجعه خواهد بود.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Label>یادداشت حذف</Label>
            <Input value={deleteNote} onChange={e => setDeleteNote(e.target.value)} placeholder="دلیل حذف..." />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteMut.isPending}>حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}