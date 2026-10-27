import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Check, X, Image as ImageIcon, Loader2, Clock } from 'lucide-react';
import { loadAllTopupRequests, approveTopup, rejectTopup } from '@/lib/ucApi';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { toast } from '@/components/ui/use-toast';

function toFa(n) { return Number(n || 0).toLocaleString('fa-IR'); }

export default function UCTopupReview() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: requests, isLoading } = useQuery({
    queryKey: ['ucTopupRequests'],
    queryFn: loadAllTopupRequests,
  });
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [signedUrls, setSignedUrls] = useState({});

  const pending = (requests || []).filter(r => r.status === 'pending');
  const reviewed = (requests || []).filter(r => r.status !== 'pending');

  const handleApprove = async (req) => {
    setProcessing(true);
    try {
      await approveTopup(req, user?.id || '', user?.full_name || user?.email || 'سازنده');
      toast({ title: 'شارژ تأیید شد', description: `${toFa(req.amount)} ${req.currency} به کیف پول افزوده شد` });
      qc.invalidateQueries({ queryKey: ['ucTopupRequests'] });
    } catch (err) {
      toast({ title: 'خطا', description: err.message, variant: 'destructive' });
    }
    setProcessing(false);
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast({ title: 'خطا', description: 'دلیل رد را وارد کنید', variant: 'destructive' });
      return;
    }
    setProcessing(true);
    try {
      await rejectTopup(rejectingId, rejectReason, user?.id || '', user?.full_name || user?.email || 'سازنده');
      toast({ title: 'درخواست رد شد' });
      setRejectingId(null);
      setRejectReason('');
      qc.invalidateQueries({ queryKey: ['ucTopupRequests'] });
    } catch (err) {
      toast({ title: 'خطا', description: err.message, variant: 'destructive' });
    }
    setProcessing(false);
  };

  const handleViewReceipt = (url) => {
    if (!url) return;
    window.open(url, '_blank');
  };

  const renderRow = (req) => (
    <div key={req.id} className="p-3 rounded-lg border space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <span className="text-sm font-medium">{req.user_name || '—'}</span>
          <Badge variant="outline" className="mr-2 text-[10px]">{req.currency || 'AFN'}</Badge>
          {req.status === 'pending' && <Badge variant="secondary" className="mr-2 text-[10px] bg-amber-100 text-amber-700"><Clock className="w-2.5 h-2.5" /> در انتظار</Badge>}
          {req.status === 'approved' && <Badge variant="secondary" className="mr-2 text-[10px] bg-green-100 text-green-700"><Check className="w-2.5 h-2.5" /> تأیید شد</Badge>}
          {req.status === 'rejected' && <Badge variant="secondary" className="mr-2 text-[10px] bg-red-100 text-red-700"><X className="w-2.5 h-2.5" /> رد شد</Badge>}
        </div>
        <span className="text-sm font-bold text-primary shrink-0">{toFa(req.amount)}</span>
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
        {req.sender_name && <span>پرداخت‌کننده: {req.sender_name}</span>}
        {req.card_last4 && <span>کارت: ****{req.card_last4}</span>}
        {req.review_date && <span>بررسی: {new Date(req.review_date).toLocaleDateString('fa-IR')}</span>}
      </div>
      {req.reject_reason && <p className="text-[10px] text-red-600">دلیل رد: {req.reject_reason}</p>}
      {req.receipt_url && (
        <Button size="sm" variant="outline" onClick={() => handleViewReceipt(req.receipt_url)}>
          <ImageIcon className="w-3 h-3" /> مشاهده رسید
        </Button>
      )}
      {req.status === 'pending' && (
        <div className="flex gap-1">
          <Button size="sm" onClick={() => handleApprove(req)} disabled={processing}>
            <Check className="w-3 h-3" /> تأیید و شارژ
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { setRejectingId(req.id); setRejectReason(''); }}>
            <X className="w-3 h-3" /> رد
          </Button>
        </div>
      )}
      {rejectingId === req.id && (
        <div className="space-y-1.5">
          <Input value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="دلیل رد درخواست..." />
          <div className="flex gap-1">
            <Button size="sm" variant="destructive" onClick={handleReject} disabled={processing}>تأیید رد</Button>
            <Button size="sm" variant="ghost" onClick={() => setRejectingId(null)}>انصراف</Button>
          </div>
        </div>
      )}
    </div>
  );

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">درخواست‌های شارژ کیف پول</h3>
      {pending.length === 0 && reviewed.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">درخواستی وجود ندارد.</p>
      ) : (
        <>
          {pending.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] text-amber-600 font-medium">{toFa(pending.length)} در انتظار بررسی</p>
              {pending.map(renderRow)}
            </div>
          )}
          {reviewed.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] text-muted-foreground font-medium">بررسی‌شده</p>
              {reviewed.slice(0, 20).map(renderRow)}
            </div>
          )}
        </>
      )}
    </div>
  );
}