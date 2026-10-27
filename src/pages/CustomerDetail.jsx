import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTransactions, useCustomers, useUpdateCustomer, useCustomerBalances } from '@/lib/useSarraaf';
import { PageHeader, BalanceCard, EmptyState, LoadingState, TransactionRow, StatusBadge } from '@/components/sarraaf/Pieces';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TX_TYPE_LABELS, CUSTOMER_TYPE_LABELS } from '@/lib/sarraaf';
import { Link } from 'react-router-dom';
import { ArrowLeftRight, TrendingUp, Send, Download, Repeat, Pencil } from 'lucide-react';

const QUICK_ACTIONS = (id) => [
  { label: 'دریافت', path: `/dadogereft?customer=${id}`, icon: ArrowLeftRight },
  { label: 'خرید', path: `/trade?customer=${id}&mode=buy`, icon: TrendingUp },
  { label: 'فروش', path: `/trade?customer=${id}&mode=sell`, icon: TrendingUp },
  { label: 'حواله ارسال', path: `/transfers/send?customer=${id}`, icon: Send },
  { label: 'حواله دریافت', path: `/transfers/receive?customer=${id}`, icon: Download },
  { label: 'تبدیل', path: `/convert?customer=${id}`, icon: Repeat },
];

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: customers } = useCustomers();
  const { data: txs, isLoading } = useTransactions({ customer_id: id });
  const { data: customerBalancesData } = useCustomerBalances();
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({});
  const updateMut = useUpdateCustomer();

  const customer = (customers || []).find(c => c.id === id);
  const custBalanceRow = (customerBalancesData || []).find(b => String(b.customer_id) === String(id));
  const balances = {};
  if (custBalanceRow) {
    balances[custBalanceRow.balance_currency || 'AFN'] = custBalanceRow.net_balance || 0;
  }

  if (!customers) return <LoadingState />;
  if (!customer) return <EmptyState title="مشتری یافت نشد" />;

  const openEdit = () => {
    setForm({
      name: customer.name || '', phone: customer.phone || '', code: customer.code || '',
      customer_type: customer.customer_type || 'permanent', status: customer.status || 'active',
      notes: customer.notes || '',
    });
    setEditOpen(true);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    await updateMut.mutateAsync({ id: customer.id, data: form });
    setEditOpen(false);
  };

  return (
    <>
      <PageHeader
        title={customer.name}
        subtitle={customer.code || ''}
        actions={
          <Button size="sm" variant="outline" onClick={openEdit}>
            <Pencil className="w-4 h-4" /> ویرایش
          </Button>
        }
      />

      {/* Info Chips */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {customer.phone && <span className="px-2 py-1 rounded-lg bg-muted text-xs">{customer.phone}</span>}
        {customer.customer_type && <span className="px-2 py-1 rounded-lg bg-muted text-xs">{CUSTOMER_TYPE_LABELS[customer.customer_type]}</span>}
        <StatusBadge status={customer.status} labels={{ active: 'فعال', inactive: 'غیرفعال' }} />
      </div>

      {/* Balances */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
        {Object.keys(balances).length === 0 ? (
          <BalanceCard label="موجودی" amounts={{ AFN: 0 }} />
        ) : (
          Object.entries(balances).map(([cur, val]) => (
            <BalanceCard key={cur} label={`موجودی ${cur}`} amounts={{ [cur]: val }} accent={val >= 0 ? 'text-success' : 'text-destructive'} />
          ))
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-6">
        {QUICK_ACTIONS(id).map(a => {
          const Icon = a.icon;
          return (
            <Link key={a.label} to={a.path} className="flex flex-col items-center gap-1 p-2 rounded-lg bg-muted/50 hover:bg-muted">
              <Icon className="w-5 h-5 text-primary" />
              <span className="text-[10px] font-medium">{a.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Transactions */}
      <h3 className="text-sm font-semibold mb-2">گردش حساب</h3>
      {isLoading ? (
        <LoadingState />
      ) : (txs || []).length === 0 ? (
        <EmptyState title="تراکنشی وجود ندارد" />
      ) : (
        <div className="space-y-1">
          {(txs || []).map(tx => (
            <TransactionRow key={tx.id} tx={tx} labels={TX_TYPE_LABELS} onClick={() => navigate(`/receipt?type=tx&id=${tx.id}`)} />
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>ویرایش مشتری</DialogTitle></DialogHeader>
          <form onSubmit={handleEdit} className="space-y-3">
            <div><Label>نام</Label><Input value={form.name || ''} onChange={e => setForm({...form, name: e.target.value})} required /></div>
            <div><Label>موبایل</Label><Input value={form.phone || ''} onChange={e => setForm({...form, phone: e.target.value})} /></div>
            <div><Label>کد</Label><Input value={form.code || ''} onChange={e => setForm({...form, code: e.target.value})} /></div>
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
            <div><Label>یادداشت</Label><Input value={form.notes || ''} onChange={e => setForm({...form, notes: e.target.value})} /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>انصراف</Button>
              <Button type="submit" disabled={updateMut.isPending}>ذخیره</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}