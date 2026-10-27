import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSandbox } from '@/components/sandbox/SandboxProvider';
import { useToast } from '@/components/ui/use-toast';
import { UserPlus, LogIn, Trash2, User, Store, Shield, Building2 } from 'lucide-react';

const ROLE_LABELS = {
  customer: 'مشتری', seller: 'فروشنده', sarraaf: 'صراف', admin: 'مدیر',
};
const ROLE_ICONS = {
  customer: User, seller: Store, sarraaf: Building2, admin: Shield,
};
const ROLE_COLORS = {
  customer: 'bg-blue-100 text-blue-700', seller: 'bg-green-100 text-green-700',
  sarraaf: 'bg-purple-100 text-purple-700', admin: 'bg-amber-100 text-amber-700',
};
const fmt = (n) => Number(n || 0).toLocaleString('fa-IR');

export function SandboxAccounts() {
  const { state, session, actions } = useSandbox();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', role: 'customer', name: '', phone: '' });

  const create = () => {
    if (!form.username || !form.password) {
      toast({ title: 'خطا', description: 'نام کاربری و رمز عبور الزامی است', variant: 'destructive' });
      return;
    }
    const r = actions.createAccount(form);
    if (!r.ok) { toast({ title: 'خطا', description: r.error, variant: 'destructive' }); return; }
    toast({ title: 'حساب ساخته شد', description: `${ROLE_LABELS[form.role]} — ${form.username}` });
    setForm({ username: '', password: '', role: 'customer', name: '', phone: '' });
    setShowForm(false);
  };

  const login = (acc) => {
    const r = actions.login(acc.username, acc.password);
    if (!r.ok) { toast({ title: 'خطا', description: r.error, variant: 'destructive' }); return; }
    toast({ title: 'ورود آزمایشی', description: `${ROLE_LABELS[acc.role]} — ${acc.name}` });
  };

  const del = (acc) => {
    actions.deleteAccount(acc.id);
    toast({ title: 'حساب حذف شد' });
  };

  return (
    <div className="space-y-3">
      <Card><CardContent className="p-3 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold">حساب‌های آزمایشی</p>
          <p className="text-[11px] text-muted-foreground">برای هر نقش حساب بسازید و مانند کاربر واقعی وارد شوید.</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setShowForm(!showForm)}>
          <UserPlus className="w-4 h-4" /> حساب جدید
        </Button>
      </CardContent></Card>

      {showForm && (
        <Card className="border-primary/30"><CardContent className="p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Input className="h-8" placeholder="نام کاربری" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} />
            <Input className="h-8" type="password" placeholder="رمز عبور" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
            <Input className="h-8" placeholder="نام نمایشی" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <Input className="h-8" placeholder="تلفن" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
          </div>
          <Select value={form.role} onValueChange={v => setForm({ ...form, role: v })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(ROLE_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button size="sm" className="flex-1" onClick={create}>ساخت حساب</Button>
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>انصراف</Button>
          </div>
        </CardContent></Card>
      )}

      {state.accounts.length === 0 && !showForm && (
        <Card><CardContent className="p-6 text-center text-xs text-muted-foreground">
          هنوز حسابی ساخته نشده. روی «حساب جدید» بزنید.
        </CardContent></Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {state.accounts.map(acc => {
          const Icon = ROLE_ICONS[acc.role] || User;
          const isSession = session?.id === acc.id;
          return (
            <Card key={acc.id} className={isSession ? 'border-primary' : ''}>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-primary" />
                    <span className="text-sm font-bold">{acc.name}</span>
                  </div>
                  <Badge className={ROLE_COLORS[acc.role]}>{ROLE_LABELS[acc.role]}</Badge>
                </div>
                <div className="text-xs text-muted-foreground space-y-0.5">
                  <p>نام کاربری: <span className="font-medium text-foreground">{acc.username}</span></p>
                  <p>تلفن: {acc.phone || '—'}</p>
                  <p>موجودی: <span className="font-bold text-foreground">{fmt(acc.balance)} افغانی</span></p>
                </div>
                <div className="flex gap-1.5">
                  <Button size="sm" className="flex-1 gap-1" disabled={isSession} onClick={() => login(acc)}>
                    <LogIn className="w-3.5 h-3.5" /> {isSession ? 'وارد شده' : 'ورود'}
                  </Button>
                  <Button size="sm" variant="outline" className="px-2" onClick={() => del(acc)}>
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}