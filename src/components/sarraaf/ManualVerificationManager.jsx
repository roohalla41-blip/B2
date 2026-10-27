// ManualVerificationManager.jsx — Manage manual email verification requests
// مستقیماً از طریق کلاینت Supabase (بدون Base44).

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { approveManualVerification } from '@/lib/manualVerification';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Loader2, Mail, Phone, User, Building2, Clock } from 'lucide-react';

const TABLE = 'manual_verification_requests';

const STATUS_LABELS = {
  pending: 'در انتظار',
  approved: 'تأیید شده',
  rejected: 'رد شده',
};

const STATUS_COLORS = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

function normalizeRow(row) {
  if (!row) return row;
  const r = { ...row };
  if (r.id !== undefined && r.id !== null) r.id = String(r.id);
  if (r.created_at) r.created_date = r.created_at;
  return r;
}

export default function ManualVerificationManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [filter, setFilter] = useState('pending');

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from(TABLE).select('*');
      if (filter !== 'all') {
        query = query.eq('status', filter);
      }
      const { data, error } = await query.order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      setRequests((data || []).map(normalizeRow));
    } catch (err) {
      toast({ title: 'خطا', description: err.message || 'بارگذاری ناموفق بود', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [filter, toast]);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  const handleApprove = async (req) => {
    setProcessingId(req.id);
    try {
      // 1. Mark email as verified via Edge Function
      const approveRes = await approveManualVerification(req.email, user?.full_name, user?.id);
      if (!approveRes?.success) {
        throw new Error(approveRes?.error || 'تأیید ایمیل ناموفق بود');
      }

      // 2. Update request status
      const { error } = await supabase
        .from(TABLE)
        .update({
          status: 'approved',
          reviewer_id: user?.id || '',
          reviewer_name: user?.full_name || '',
          review_date: new Date().toISOString(),
        })
        .eq('id', req.id);
      if (error) throw error;

      toast({ title: 'تأیید شد', description: `ایمیل ${req.email} به‌صورت دستی معتبر شد` });
      loadRequests();
    } catch (err) {
      toast({ title: 'خطا', description: err.message || 'عملیات ناموفق بود', variant: 'destructive' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (req) => {
    setProcessingId(req.id);
    try {
      const { error } = await supabase
        .from(TABLE)
        .update({
          status: 'rejected',
          reviewer_id: user?.id || '',
          reviewer_name: user?.full_name || '',
          review_date: new Date().toISOString(),
        })
        .eq('id', req.id);
      if (error) throw error;
      toast({ title: 'رد شد', description: `درخواست ${req.email} رد شد` });
      loadRequests();
    } catch (err) {
      toast({ title: 'خطا', description: err.message || 'عملیات ناموفق بود', variant: 'destructive' });
    } finally {
      setProcessingId(null);
    }
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold">درخواست‌های تأیید دستی ایمیل</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              کاربرانی که کد تأیید ایمیل را دریافت نکرده‌اند و درخواست تأیید دستی ثبت کرده‌اند.
            </p>
          </div>
          {pendingCount > 0 && (
            <Badge className="bg-amber-100 text-amber-700">{pendingCount} در انتظار</Badge>
          )}
        </div>

        <div className="flex gap-1 mb-4">
          {['pending', 'approved', 'rejected', 'all'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                filter === f
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {f === 'all' ? 'همه' : STATUS_LABELS[f]}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            درخواستی یافت نشد
          </div>
        ) : (
          <div className="space-y-2">
            {requests.map(req => (
              <div key={req.id} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 text-sm font-medium">
                      <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate">{req.email}</span>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      {req.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {req.phone}
                        </span>
                      )}
                      {req.username && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {req.username}
                        </span>
                      )}
                      {req.exchange_name && (
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {req.exchange_name}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {req.created_date ? new Date(req.created_date).toLocaleDateString('fa-IR') : ''}
                      </span>
                    </div>
                    {req.reason && (
                      <p className="text-xs text-muted-foreground/80 bg-muted/50 rounded p-1.5 mt-1">
                        {req.reason}
                      </p>
                    )}
                    {req.reviewer_name && req.status !== 'pending' && (
                      <p className="text-[10px] text-muted-foreground/60">
                        بررسی‌کننده: {req.reviewer_name} — {req.review_date && new Date(req.review_date).toLocaleDateString('fa-IR')}
                      </p>
                    )}
                  </div>
                  <Badge className={STATUS_COLORS[req.status]}>
                    {STATUS_LABELS[req.status]}
                  </Badge>
                </div>

                {req.status === 'pending' && (
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      onClick={() => handleApprove(req)}
                      disabled={processingId === req.id}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      {processingId === req.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                      تأیید ایمیل
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReject(req)}
                      disabled={processingId === req.id}
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      رد
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}