import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { callSupabase } from '@/lib/supabaseApi';
import { Users, UserPlus, RefreshCw, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

function toFaNum(n) {
  return Number(n || 0).toLocaleString('fa-IR');
}

export default function OrphanCustomerManager() {
  const [orphans, setOrphans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [assigning, setAssigning] = useState(null);
  const [selectedExchange, setSelectedExchange] = useState({});
  const [exchanges, setExchanges] = useState([]);
  const [toast, setToast] = useState(null);

  const loadOrphans = useCallback(async () => {
    setLoading(true);
    try {
      const res = await callSupabase('listOrphanCustomers');
      if (res?.success) {
        setOrphans(res.orphans || []);
      } else {
        setOrphans([]);
      }
    } catch {
      setOrphans([]);
    }
    setLoading(false);
  }, []);

  const loadExchanges = useCallback(async () => {
    try {
      const res = await callSupabase('listExchanges');
      if (res?.success) {
        setExchanges(res.exchanges || []);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    loadOrphans();
    loadExchanges();
  }, [refreshKey, loadOrphans, loadExchanges]);

  const handleAssign = async (orphanId) => {
    const exCode = selectedExchange[orphanId];
    if (!exCode) {
      setToast({ type: 'error', msg: 'لطفاً ابتدا یک صرافی انتخاب کنید.' });
      setTimeout(() => setToast(null), 3000);
      return;
    }
    setAssigning(orphanId);
    try {
      const res = await callSupabase('assignCustomerToExchange', {
        user_id: orphanId,
        exchange_code: exCode,
      });
      if (res?.success) {
        setToast({ type: 'success', msg: 'مشتری با موفقیت به صرافی متصل شد.' });
        setOrphans(prev => prev.filter(o => o.id !== orphanId));
        setSelectedExchange(prev => {
          const next = { ...prev };
          delete next[orphanId];
          return next;
        });
      } else {
        setToast({ type: 'error', msg: res?.error || 'خطا در اتصال مشتری.' });
      }
    } catch (e) {
      setToast({ type: 'error', msg: e.message || 'خطای شبکه.' });
    }
    setAssigning(null);
    setTimeout(() => setToast(null), 4000);
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-500" />
            <h4 className="text-sm font-bold">مشتریان بدون صرافی (یتیم)</h4>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
              {toFaNum(orphans.length)} نفر
            </span>
            <button
              onClick={() => setRefreshKey(k => k + 1)}
              disabled={loading}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              به‌روزرسانی
            </button>
          </div>
        </div>

        {toast && (
          <div className={`flex items-center gap-2 p-2 rounded-lg text-xs ${
            toast.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {toast.msg}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : orphans.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">همه مشتریان به صرافی متصل هستند.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto scrollbar-thin">
            {orphans.map(orphan => (
              <div key={orphan.id} className="flex flex-col gap-2 p-3 rounded-lg border bg-muted/20">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{orphan.full_name || orphan.username || 'نامشخص'}</p>
                    <p className="text-xs text-muted-foreground" dir="ltr">{orphan.mobile || orphan.email || orphan.username}</p>
                  </div>
                  {orphan.created_at && (
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {new Date(orphan.created_at).toLocaleDateString('fa-IR')}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedExchange[orphan.id] || ''}
                    onChange={(e) => setSelectedExchange(prev => ({ ...prev, [orphan.id]: e.target.value }))}
                    className="flex-1 h-8 rounded-md border border-input bg-transparent px-2 text-xs"
                  >
                    <option value="">انتخاب صرافی...</option>
                    {exchanges.map(ex => (
                      <option key={ex.id} value={ex.exchange_code}>
                        {ex.exchange_name} ({ex.exchange_code})
                      </option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    onClick={() => handleAssign(orphan.id)}
                    disabled={assigning === orphan.id}
                    className="h-8 px-3"
                  >
                    {assigning === orphan.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                    اتصال
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}