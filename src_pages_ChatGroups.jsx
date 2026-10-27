import React, { useState, useEffect } from 'react';
import { useChatGroups, useCreateGroup, useDeleteGroup, useUpdateGroup, useMessageReports } from '@/lib/useChat';
import { useSarraafProfile } from '@/lib/useSarraaf';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { canCreatePrivateGroup, canAccessPrivateGroups, getSarraafTier, canCreateGroup, getMaxGroups, getMaxMembers } from '@/lib/chat';
import { PageHeader, EmptyState, LoadingState } from '@/components/sarraaf/Pieces';
import GroupCard from '@/components/chat/GroupCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import { Users, Plus, Lock, Globe, ShieldAlert, Crown, Shield, Trash2, Edit2 } from 'lucide-react';

export default function ChatGroups() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: profile } = useSarraafProfile(user?.id);
  const { data: groups, isLoading } = useChatGroups();
  const { data: reports } = useMessageReports();
  const createMut = useCreateGroup();
  const deleteMut = useDeleteGroup();
  const updateMut = useUpdateGroup();
  const [showCreate, setShowCreate] = useState(false);
  const [editGroup, setEditGroup] = useState(null);
  const [deleteGroup, setDeleteGroup] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', type: 'public', rules: '' });

  const isSystemAdmin = user?.role === 'creator' || user?.role === 'admin';
  const tier = isSystemAdmin ? 'paid' : getSarraafTier(profile);
  const canPrivate = canCreatePrivateGroup(profile, user?.role);
  const canAccessPrivate = canAccessPrivateGroups(profile, user?.role);
  const canCreate = canCreateGroup(profile, user?.role);
  const maxGroups = getMaxGroups(profile, user?.role);
  const maxMembers = getMaxMembers(profile, user?.role);

  const allGroups = groups || [];
  const publicGroups = allGroups.filter(g => g.type === 'public' && !g.creator_managed);
  const privateGroups = allGroups.filter(g => g.type === 'private' && !g.creator_managed);
  const systemGroups = allGroups.filter(g => g.creator_managed === true);
  const myGroups = allGroups.filter(g => g.creator_id === user?.id);

  // Check group creation limit
  const myGroupCount = myGroups.length;
  const reachedLimit = !isSystemAdmin && myGroupCount >= maxGroups;

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast({ title: 'خطا', description: 'نام گروه الزامی است', variant: 'destructive' });
      return;
    }
    if (!canCreate) {
      toast({ title: 'دسترسی محدود', description: 'ایجاد گروه فقط برای پلن‌های پولی (پایه و بالاتر) مجاز است. لطفاً اشتراک خود را ارتقا دهید.', variant: 'destructive' });
      return;
    }
    if (reachedLimit) {
      toast({ title: 'سقف گروه‌ها', description: `شما در پلن فعلی نهایتاً ${maxGroups} گروه می‌توانید ایجاد کنید. برای گروه بیشتر، به نسخه بالاتر ارتقا دهید.`, variant: 'destructive' });
      return;
    }
    if (form.type === 'private' && !canPrivate) {
      toast({ title: 'دسترسی محدود', description: 'ایجاد گروه خصوصی فقط برای صرافان نسخه پولی مجاز است', variant: 'destructive' });
      return;
    }
    try {
      await createMut.mutateAsync({
        name: form.name.trim(),
        description: form.description.trim(),
        type: form.type,
        rules: form.rules.trim(),
        creator_id: user.id,
        creator_name: user.full_name || user.email,
        exchange_code: profile?.code || '',
        creator_managed: isSystemAdmin,
        status: 'active',
        member_count: 1,
      });
      toast({ title: 'گروه ایجاد شد', description: 'گروه جدید با موفقیت ایجاد شد' });
      setShowCreate(false);
      setForm({ name: '', description: '', type: 'public', rules: '' });
    } catch (err) {
      toast({ title: 'خطا', description: err.message, variant: 'destructive' });
    }
  };

  const handleEdit = (g) => {
    setEditGroup(g);
    setForm({ name: g.name, description: g.description || '', type: g.type, rules: g.rules || '' });
  };

  const handleSaveEdit = async () => {
    if (!editGroup || !form.name.trim()) return;
    try {
      await updateMut.mutateAsync({ id: editGroup.id, data: { name: form.name.trim(), description: form.description.trim(), rules: form.rules.trim() } });
      toast({ title: 'ویرایش شد', description: 'گروه با موفقیت ویرایش شد' });
      setEditGroup(null);
      setForm({ name: '', description: '', type: 'public', rules: '' });
    } catch (err) {
      toast({ title: 'خطا', description: err.message, variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!deleteGroup) return;
    try {
      await deleteMut.mutateAsync(deleteGroup.id);
      toast({ title: 'حذف شد', description: 'گروه و تمام اعضا و پیام‌های آن حذف شد' });
      setDeleteGroup(null);
    } catch (err) {
      toast({ title: 'خطا', description: err.message, variant: 'destructive' });
    }
  };

  const canManageGroup = (g) => g.creator_id === user?.id || isSystemAdmin;

  return (
    <>
      <PageHeader title="چت و گروه‌ها" icon={Users} />

      {/* Subscription Status Banner */}
      {tier === 'trial' && (
        <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          نسخه رایگان — برای ساخت گروه، نسخه پولی (پایه و بالاتر) را تهیه کنید.
        </div>
      )}
      {tier === 'expired' && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          اشتراک منقضی شده — برای استفاده از امکانات صرافی، اشتراک خود را تمدید کنید.
        </div>
      )}
      {tier === 'paid' && (
        <div className="mb-4 p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs flex items-center gap-2">
          <Crown className="w-4 h-4 shrink-0" />
          صراف تأییدشده — سقف {maxGroups} گروه و {maxMembers.toLocaleString('fa-IR')} عضو در هر گروه.
        </div>
      )}
      {tier === 'basic' && (
        <div className="mb-4 p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs flex items-center gap-2">
          <Crown className="w-4 h-4 shrink-0" />
          پلن پایه — سقف {maxGroups} گروه و {maxMembers.toLocaleString('fa-IR')} عضو در هر گروه.
        </div>
      )}

      {/* Group count indicator for sarraaf */}
      {canCreate && !isSystemAdmin && (
        <div className="mb-3 text-xs text-muted-foreground text-center">
          گروه‌های شما: {myGroupCount} از {maxGroups}
        </div>
      )}

      {/* Action Bar */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-muted-foreground">
          {reports?.length > 0 ? `گزارش‌های در انتظار: ${reports.length}` : ''}
        </span>
        {canCreate ? (
          <Button size="sm" onClick={() => setShowCreate(true)} disabled={reachedLimit}>
            <Plus className="w-4 h-4" />
            ایجاد گروه
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={() => navigate('/settings')}>
            <Crown className="w-4 h-4" />
            ارتقا به پولی
          </Button>
        )}
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-4">
          <TabsTrigger value="all">همه</TabsTrigger>
          <TabsTrigger value="public">عمومی</TabsTrigger>
          <TabsTrigger value="private">خصوصی</TabsTrigger>
          <TabsTrigger value="my">گروه‌های من</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-2">
          {isLoading ? <LoadingState /> : allGroups.length === 0 ? (
            <EmptyState icon={Users} title="گروهی وجود ندارد" description="اولین گروه را ایجاد کنید" />
          ) : (
            allGroups.map(g => (
              <div key={g.id} className="relative group">
                <GroupCard group={g} to={`/chat/group/${g.id}`} />
                {canManageGroup(g) && (
                  <div className="absolute top-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="icon" variant="ghost" className="h-7 w-7 bg-background/80" onClick={(e) => { e.preventDefault(); handleEdit(g); }}>
                      <Edit2 className="w-3 h-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 bg-background/80 text-destructive" onClick={(e) => { e.preventDefault(); setDeleteGroup(g); }}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="public" className="space-y-2">
          {isLoading ? <LoadingState /> : publicGroups.length === 0 ? (
            <EmptyState icon={Globe} title="گروه عمومی وجود ندارد" description="اولین گروه عمومی را ایجاد کنید" />
          ) : (
            publicGroups.map(g => (
              <div key={g.id} className="relative group">
                <GroupCard group={g} to={`/chat/group/${g.id}`} />
                {canManageGroup(g) && (
                  <div className="absolute top-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="icon" variant="ghost" className="h-7 w-7 bg-background/80" onClick={(e) => { e.preventDefault(); handleEdit(g); }}>
                      <Edit2 className="w-3 h-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 bg-background/80 text-destructive" onClick={(e) => { e.preventDefault(); setDeleteGroup(g); }}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="private" className="space-y-2">
          {!canAccessPrivate ? (
            <EmptyState icon={Lock} title="دسترسی محدود" description="گروه‌های خصوصی فقط برای صرافان نسخه پولی و اشتراک فعال قابل مشاهده است" />
          ) : isLoading ? <LoadingState /> : privateGroups.length === 0 ? (
            <EmptyState icon={Lock} title="گروه خصوصی وجود ندارد" description="گروه خصوصی صرافان ایجاد کنید" />
          ) : (
            privateGroups.map(g => (
              <div key={g.id} className="relative group">
                <GroupCard group={g} to={`/chat/group/${g.id}`} />
                {canManageGroup(g) && (
                  <div className="absolute top-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="icon" variant="ghost" className="h-7 w-7 bg-background/80" onClick={(e) => { e.preventDefault(); handleEdit(g); }}>
                      <Edit2 className="w-3 h-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 bg-background/80 text-destructive" onClick={(e) => { e.preventDefault(); setDeleteGroup(g); }}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="my" className="space-y-2">
          {isLoading ? <LoadingState /> : myGroups.length === 0 ? (
            <EmptyState icon={Users} title="گروهی نساخته‌اید" description="گروه جدید ایجاد کنید" />
          ) : (
            myGroups.map(g => (
              <div key={g.id} className="relative group">
                <GroupCard group={g} to={`/chat/group/${g.id}`} />
                <div className="absolute top-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="icon" variant="ghost" className="h-7 w-7 bg-background/80" onClick={(e) => { e.preventDefault(); handleEdit(g); }}>
                    <Edit2 className="w-3 h-3" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 bg-background/80 text-destructive" onClick={(e) => { e.preventDefault(); setDeleteGroup(g); }}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Create Group Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>ایجاد گروه جدید</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>نام گروه</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="نام گروه" />
            </div>
            <div>
              <Label>توضیحات</Label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="توضیحات گروه (اختیاری)" rows={2} />
            </div>
            <div>
              <Label>نوع گروه</Label>
              <Select
                value={form.type}
                onValueChange={(v) => {
                  if (v === 'private' && !canPrivate) {
                    toast({ title: 'دسترسی محدود', description: 'ایجاد گروه خصوصی فقط برای صرافان نسخه پولی مجاز است', variant: 'destructive' });
                    return;
                  }
                  setForm({ ...form, type: v });
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">عمومی — مشتریان و صرافان</SelectItem>
                  <SelectItem value="private" disabled={!canPrivate}>خصوصی — فقط صرافان</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.type === 'private' && (
              <div>
                <Label>قوانین گروه (اختیاری)</Label>
                <Textarea value={form.rules} onChange={e => setForm({ ...form, rules: e.target.value })} placeholder="قوانین گروه" rows={3} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>انصراف</Button>
            <Button onClick={handleCreate} disabled={createMut.isPending}>
              {createMut.isPending ? 'در حال ایجاد...' : 'ایجاد گروه'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Group Dialog */}
      <Dialog open={!!editGroup} onOpenChange={() => setEditGroup(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>ویرایش گروه</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>نام گروه</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>توضیحات</Label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>
            <div>
              <Label>قوانین گروه</Label>
              <Textarea value={form.rules} onChange={e => setForm({ ...form, rules: e.target.value })} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditGroup(null)}>انصراف</Button>
            <Button onClick={handleSaveEdit} disabled={updateMut.isPending}>
              {updateMut.isPending ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Group Confirmation */}
      <Dialog open={!!deleteGroup} onOpenChange={() => setDeleteGroup(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>حذف گروه</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            آیا از حذف گروه «{deleteGroup?.name}» مطمئن هستید؟ تمام اعضا و پیام‌های این گروه حذف خواهند شد.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteGroup(null)}>انصراف</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMut.isPending}>
              {deleteMut.isPending ? 'در حال حذف...' : 'حذف گروه'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}