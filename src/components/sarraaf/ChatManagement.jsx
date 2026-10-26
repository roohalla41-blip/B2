import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useChatGroups, useCreateGroup, useUpdateGroup, useDeleteGroup, seedDefaultGroups } from '@/lib/useChat';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { Plus, Pencil, Trash2, Globe, Lock, Users, Sparkles } from 'lucide-react';

export default function ChatManagement() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: groups, isLoading } = useChatGroups();
  const createMut = useCreateGroup();
  const updateMut = useUpdateGroup();
  const deleteMut = useDeleteGroup();

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', type: 'public', rules: '' });
  const [seeded, setSeeded] = useState(false);

  // Auto-seed two default groups on first load
  useEffect(() => {
    if (seeded || !user) return;
    (async () => {
      try {
        const created = await seedDefaultGroups(user);
        if (created.length > 0) {
          qc.invalidateQueries({ queryKey: ['chatGroups'] });
          toast({ title: 'گروه‌های پیش‌فرض', description: `${created.length} گروه پیش‌فرض ایجاد شد` });
        }
      } catch {
        // ignore
      }
      setSeeded(true);
    })();
  }, [user, seeded]);

  const openCreate = () => {
    setEditId(null);
    setForm({ name: '', description: '', type: 'public', rules: '' });
    setShowForm(true);
  };

  const openEdit = (g) => {
    setEditId(g.id);
    setForm({ name: g.name, description: g.description || '', type: g.type, rules: g.rules || '' });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: 'خطا', description: 'نام گروه الزامی است', variant: 'destructive' });
      return;
    }
    try {
      if (editId) {
        await updateMut.mutateAsync({ id: editId, data: { name: form.name.trim(), description: form.description.trim(), type: form.type, rules: form.rules.trim() } });
        toast({ title: 'ویرایش شد', description: 'گروه به‌روزرسانی شد' });
      } else {
        await createMut.mutateAsync({
          name: form.name.trim(),
          description: form.description.trim(),
          type: form.type,
          rules: form.rules.trim(),
          creator_id: user.id,
          creator_name: user.full_name || user.email || 'مدیر سیستم',
          creator_managed: true,
          status: 'active',
          member_count: 1,
        });
        toast({ title: 'ایجاد شد', description: 'گروه جدید ایجاد شد' });
      }
      setShowForm(false);
    } catch (err) {
      toast({ title: 'خطا', description: err.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (g) => {
    if (!confirm(`حذف گروه «${g.name}»؟ تمام پیام‌ها و اعضا حذف می‌شوند.`)) return;
    try {
      await deleteMut.mutateAsync(g.id);
      toast({ title: 'حذف شد', description: 'گروه حذف شد' });
    } catch (err) {
      toast({ title: 'خطا', description: err.message, variant: 'destructive' });
    }
  };

  const handleReSeed = async () => {
    setSeeded(false);
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Users className="w-4 h-4" />
            مدیریت گروه‌های چت
          </h3>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={handleReSeed} title="ایجاد گروه‌های پیش‌فرض">
              <Sparkles className="w-3.5 h-3.5" />
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Plus className="w-3.5 h-3.5" />
              گروه جدید
            </Button>
          </div>
        </div>

        {isLoading ? (
          <p className="text-xs text-muted-foreground">در حال بارگذاری...</p>
        ) : !groups || groups.length === 0 ? (
          <p className="text-xs text-muted-foreground">گروهی وجود ندارد. روی «گروه جدید» بزنید.</p>
        ) : (
          <div className="space-y-2">
            {groups.map(g => (
              <div key={g.id} className="flex items-center justify-between p-2.5 rounded-lg border">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    {g.type === 'private' ? <Lock className="w-3.5 h-3.5 text-purple-600" /> : <Globe className="w-3.5 h-3.5 text-green-600" />}
                    <span className="text-sm font-medium truncate">{g.name}</span>
                  </div>
                  {g.description && <p className="text-[10px] text-muted-foreground truncate mt-0.5">{g.description}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(g)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(g)}>
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? 'ویرایش گروه' : 'گروه جدید'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>نام گروه</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="نام گروه" />
            </div>
            <div>
              <Label>توضیحات</Label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="توضیحات (اختیاری)" rows={2} />
            </div>
            <div>
              <Label>نوع گروه</Label>
              <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">عمومی</SelectItem>
                  <SelectItem value="private">خصوصی</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>قوانین (اختیاری)</Label>
              <Textarea value={form.rules} onChange={e => setForm({ ...form, rules: e.target.value })} placeholder="قوانین گروه" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>انصراف</Button>
            <Button onClick={handleSave} disabled={createMut.isPending || updateMut.isPending}>
              {createMut.isPending || updateMut.isPending ? 'در حال ذخیره...' : 'ذخیره'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}