import React, { useState } from 'react';
import { useAgents, useAgentBalances, useCreateAgent, useUpdateAgent } from '@/lib/useSarraaf';
import { PageHeader, EmptyState, LoadingState } from '@/components/sarraaf/Pieces';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { formatNumber } from '@/lib/sarraaf';
import { Network, Plus, Pencil, Send, Download } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Agents() {
  const { data: agents, isLoading } = useAgents();
  const { data: agentBalancesData } = useAgentBalances();
  const createMut = useCreateAgent();
  const updateMut = useUpdateAgent();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', city: '', code: '', status: 'active', notes: '' });

  const openCreate = () => { setEditId(null); setForm({ name: '', phone: '', city: '', code: '', status: 'active', notes: '' }); setDialogOpen(true); };
  const openEdit = (a) => { setEditId(a.id); setForm({ name: a.name, phone: a.phone, city: a.city, code: a.code, status: a.status, notes: a.notes }); setDialogOpen(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editId) await updateMut.mutateAsync({ id: editId, data: form });
    else await createMut.mutateAsync(form);
    setDialogOpen(false);
  };

  const getAgentBal = (agentId) => {
    const b = (agentBalancesData || []).find(x => String(x.agent_id) === String(agentId));
    return b ? { [b.currency || 'AFN']: b.balance || 0 } : {};
  };

  return (
    <>
      <PageHeader title="نمایندگی‌ها" icon={Network}
        actions={<Button size="sm" onClick={openCreate}><Plus className="w-4 h-4" /> افزودن</Button>}
      />
      {isLoading ? <LoadingState /> : (agents || []).length === 0 ? <EmptyState icon={Network} title="نماینده‌ای نیست" /> : (
        <div className="space-y-2">
          {(agents || []).map(a => {
            const bal = getAgentBal(a.id);
            return (
              <div key={a.id} className="p-3 rounded-xl border bg-card">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-sm font-bold">{a.name}</span>
                    {a.code && <span className="text-xs text-muted-foreground mr-2">{a.code}</span>}
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => openEdit(a)}><Pencil className="w-4 h-4" /></Button>
                </div>
                <div className="text-xs text-muted-foreground mb-2">
                  {a.phone && <p>موبایل: {a.phone}</p>}
                  {a.city && <p>شهر: {a.city}</p>}
                </div>
                {Object.keys(bal).length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {Object.entries(bal).map(([cur, val]) => (
                      <span key={cur} className="text-xs px-2 py-1 rounded-lg bg-muted">{formatNumber(val)} {cur}</span>
                    ))}
                  </div>
                )}
                <div className="flex gap-1 mt-2">
                  <Link to={`/transfers/send?agent=${a.id}`}><Button size="sm" variant="outline"><Send className="w-3.5 h-3.5" /> ارسال</Button></Link>
                  <Link to={`/transfers/receive?agent=${a.id}`}><Button size="sm" variant="outline"><Download className="w-3.5 h-3.5" /> دریافت</Button></Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? 'ویرایش نماینده' : 'افزودن نماینده'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div><Label>نام</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>موبایل</Label><Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
              <div><Label>کد</Label><Input value={form.code} onChange={e => setForm({...form, code: e.target.value})} /></div>
            </div>
            <div><Label>شهر</Label><Input value={form.city} onChange={e => setForm({...form, city: e.target.value})} /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>انصراف</Button>
              <Button type="submit" disabled={createMut.isPending || updateMut.isPending}>ذخیره</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}