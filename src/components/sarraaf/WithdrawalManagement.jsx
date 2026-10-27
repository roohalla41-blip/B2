import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listWithdrawals, approveWithdrawal, rejectWithdrawal } from '@/lib/customerApi';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';

const STATUS_LABELS = {
  pending: { label: 'در انتظار', variant: 'warning' },
  approved: { label: 'تأییدشده', variant: 'success' },
  rejected: { label: 'ردشده', variant: 'destructive' },
  completed: { label: 'تکمیل‌شده', variant: 'info' },
};

const METHOD_LABELS = {
  bank_transfer: 'انتقال بانکی',
  cash: 'نقدی',
  agent: 'نمایندگی',
};

export default function WithdrawalManagement() {
  const qc = useQueryClient();
  const { data: withdrawals = [], isLoading, error } = useQuery({
    queryKey: ['adminWithdrawals'],
    queryFn: listWithdrawals,
  });

  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const approveMut = useMutation({
    mutationFn: approveWithdrawal,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['adminWithdrawals'] }),
  });
  const rejectMut = useMutation({
    mutationFn: ({ id, reason }) => rejectWithdrawal(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['adminWithdrawals'] });
      setRejectingId(null);
      setRejectReason('');
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-xs space-y-1">
            <p className="font-bold">خطا در بارگذاری درخواست‌های برداشت</p>
            <p>{error.message}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const pending = withdrawals.filter(w => w.status === 'pending');
  const processed = withdrawals.filter(w => w.status !== 'pending');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Clock className="w-4 h-4 text-amber-500" />
        <h3 className="text-sm font-semibold">درخواست‌های برداشت ({pending.length} در انتظار)</h3>
      </div>

      {pending.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-4">درخواست برداشت در انتظاری وجود ندارد</p>
      )}

      {pending.map((w) => (
        <Card key={w.id} className="shadow-sm">
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold">{Number(w.amount || 0).toLocaleString()} {w.currency || 'AFN'}</p>
                <p className="text-[10px] text-muted-foreground">{METHOD_LABELS[w.method] || w.method}</p>
              </div>
              <Badge variant="warning">{STATUS_LABELS.pending?.label}</Badge>
            </div>
            {w.destination && (
              <p className="text-xs text-muted-foreground">مقصد: {w.destination}</p>
            )}
            {w.description && (
              <p className="text-xs text-muted-foreground">{w.description}</p>
            )}
            <p className="text-[10px] text-muted-foreground">کاربر: {w.user_name || w.user_id}</p>

            {rejectingId === w.id ? (
              <div className="space-y-2">
                <textarea
                  className="w-full text-xs border rounded p-2 bg-transparent"
                  placeholder="دلیل رد..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={2}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={rejectMut.isPending}
                    onClick={() => rejectMut.mutate({ id: w.id, reason: rejectReason })}
                  >
                    {rejectMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                    تأیید رد
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setRejectingId(null); setRejectReason(''); }}>
                    انصراف
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={approveMut.isPending}
                  onClick={() => approveMut.mutate(w.id)}
                >
                  {approveMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                  تأیید
                </Button>
                <Button size="sm" variant="outline" onClick={() => setRejectingId(w.id)}>
                  <XCircle className="w-3 h-3" />
                  رد
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {processed.length > 0 && (
        <>
          <h4 className="text-xs font-semibold text-muted-foreground mt-4 mb-2">پردازش‌شده‌ها</h4>
          {processed.slice(0, 10).map((w) => (
            <Card key={w.id} className="shadow-sm opacity-70">
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold">{Number(w.amount || 0).toLocaleString()} {w.currency}</p>
                  <p className="text-[10px] text-muted-foreground">{w.reviewer_name || ''}</p>
                </div>
                <Badge variant={STATUS_LABELS[w.status]?.variant || 'outline'}>
                  {STATUS_LABELS[w.status]?.label || w.status}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </>
      )}
    </div>
  );
}