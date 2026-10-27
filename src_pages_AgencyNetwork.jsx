import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useSarraafProfile } from '@/lib/useSarraaf';
import { createSupabaseEntity } from '@/lib/supabaseApi';
import { PageHeader, EmptyState, LoadingState, StatusBadge } from '@/components/sarraaf/Pieces';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { Share2, Plus, Copy } from 'lucide-react';

const sbAgencyLink = createSupabaseEntity('AgencyLink');

export default function AgencyNetwork() {
  const { user } = useAuth();
  const { data: profile, isLoading } = useSarraafProfile(user?.id);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [links, setLinks] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ target_code: '', city: '', request_note: '' });

  const loadLinks = async () => {
    if (!user) return;
    try {
      const all = await sbAgencyLink.list('-created_date', 500);
      const filtered = all.filter(l =>
        l.requester_user_id === user.id || l.target_code === profile?.code
      );
      setLinks(filtered);
    } catch (err) {
      console.error('Failed to load agency links:', err.message);
    }
  };

  useEffect(() => {
    if (user && profile) loadLinks();
  }, [user, profile?.id]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!profile || !form.target_code) return;
    setSubmitting(true);
    try {
      await sbAgencyLink.create({
        requester_profile_id: profile.id,
        requester_user_id: user.id,
        requester_code: profile.code,
        requester_name: profile.name,
        requester_exchange_name: profile.exchange_name,
        requester_phone: profile.phone,
        target_code: form.target_code,
        status: 'pending',
        city: form.city,
        request_note: form.request_note,
      });
      toast({ title: 'درخواست نمایندگی ارسال شد' });
      setDialogOpen(false);
      setForm({ target_code: '', city: '', request_note: '' });
      loadLinks();
    } catch (err) {
      toast({ title: 'خطا', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (link) => {
    try {
      await sbAgencyLink.update(link.id, { status: 'active', target_name: profile?.name });
      toast({ title: 'نمایندگی تأیید شد' });
      loadLinks();
    } catch (err) {
      toast({ title: 'خطا', description: err.message, variant: 'destructive' });
    }
  };

  const handleReject = async (link) => {
    try {
      await sbAgencyLink.update(link.id, { status: 'rejected' });
      toast({ title: 'درخواست رد شد' });
      loadLinks();
    } catch (err) {
      toast({ title: 'خطا', description: err.message, variant: 'destructive' });
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(profile?.code || '');
    toast({ title: 'کد کپی شد' });
  };

  if (isLoading) return <LoadingState />;

  return (
    <>
      <PageHeader title="شبکه نمایندگی" icon={Share2}
        actions={<Button size="sm" onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4" /> افزودن</Button>}
      />
      <div className="p-3 rounded-xl border bg-card mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">کد نمایندگی شما</p>
          <p className="text-lg font-bold">{profile?.code || '—'}</p>
        </div>
        <Button size="icon" variant="outline" onClick={copyCode}><Copy className="w-4 h-4" /></Button>
      </div>

      <h3 className="text-sm font-semibold mb-2">درخواست‌ها و اتصالات</h3>
      {links.length === 0 ? <EmptyState icon={Share2} title="اتصالی نیست" description="هنوز درخواست نمایندگی‌ای وجود ندارد" /> : (
        <div className="space-y-2">
          {links.map(l => {
            const isIncoming = l.target_code === profile?.code;
            const displayName = isIncoming ? l.requester_name : l.target_code;
            return (
              <div key={l.id} className="p-3 rounded-xl border bg-card">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <span className="text-sm font-medium block truncate">{displayName || 'نامشخص'}</span>
                    {isIncoming && l.requester_exchange_name && (
                      <span className="text-xs text-muted-foreground">{l.requester_exchange_name}</span>
                    )}
                  </div>
                  <StatusBadge status={l.status} labels={{ pending: 'در انتظار', active: 'فعال', rejected: 'رد شده' }} />
                </div>
                {l.city && <p className="text-xs text-muted-foreground mt-1">شهر: {l.city}</p>}
                {l.request_note && <p className="text-xs text-muted-foreground mt-0.5">پیام: {l.request_note}</p>}
                {isIncoming && l.status === 'pending' && (
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" onClick={() => handleApprove(l)}>تأیید</Button>
                    <Button size="sm" variant="outline" onClick={() => handleReject(l)}>رد</Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>افزودن نمایندگی</DialogTitle></DialogHeader>
          <form onSubmit={handleAdd} className="space-y-3">
            <div><Label>کد صرافی مقصد</Label><Input value={form.target_code} onChange={e => setForm({...form, target_code: e.target.value})} required /></div>
            <div><Label>شهر</Label><Input value={form.city} onChange={e => setForm({...form, city: e.target.value})} /></div>
            <div><Label>پیام</Label><Input value={form.request_note} onChange={e => setForm({...form, request_note: e.target.value})} /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>انصراف</Button>
              <Button type="submit" disabled={submitting}>{submitting ? 'در حال ارسال...' : 'ارسال درخواست'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}