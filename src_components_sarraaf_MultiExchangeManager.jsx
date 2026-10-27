import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Link2, Users } from 'lucide-react';
import { getUserExchanges, requestJoinExchange } from '@/lib/multiExchange';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/AuthContext';

export default function MultiExchangeManager() {
  const { user } = useAuth();
  const [exchanges, setExchanges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (user?.id) load();
  }, [user?.id]);

  async function load() {
    setLoading(true);
    const list = await getUserExchanges(user.id);
    setExchanges(list);
    setLoading(false);
  }

  async function handleJoin() {
    if (!joinCode) {
      toast({ title: 'خطا', description: 'کد صرافی را وارد کنید', variant: 'destructive' });
      return;
    }
    setJoining(true);
    const res = await requestJoinExchange({
      userId: user.id,
      userName: user.full_name || user.email,
      exchangeCode: joinCode,
      role: 'employee',
    });
    if (res.success) {
      toast({ title: 'موفق', description: 'درخواست شما ثبت شد و در انتظار تأیید است' });
      setJoinCode('');
      setShowJoin(false);
      load();
    } else {
      toast({ title: 'خطا', description: res.error === 'exchange_not_found' ? 'صرافی یافت نشد' : 'قبلاً متصل شده‌اید', variant: 'destructive' });
    }
    setJoining(false);
  }

  const primary = exchanges.find(e => e.status === 'active') || exchanges[0];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Link2 className="w-4 h-4" />
            صرافی‌های متصل
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => setShowJoin(!showJoin)}>
            {showJoin ? 'بستن' : 'اتصال به صرافی'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {showJoin && (
          <div className="flex gap-2 p-3 rounded-lg border border-border">
            <Input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="کد صرافی (مثلاً EX-10001)"
              className="h-8 text-sm"
            />
            <Button size="sm" onClick={handleJoin} disabled={joining}>
              {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : 'اتصال'}
            </Button>
          </div>
        )}

        {exchanges.length === 0 ? (
          <p className="text-center text-xs text-muted-foreground py-4">صرافی متصل نیست</p>
        ) : (
          <div className="space-y-2">
            {exchanges.map((ex) => (
              <div key={ex.id} className="flex items-center gap-2 p-2 rounded-lg border border-border">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{ex.exchange_name || ex.exchange_code}</p>
                  <p className="text-[10px] text-muted-foreground">{ex.role === 'admin' ? 'مدیر' : 'کارمند'} — {ex.exchange_code}</p>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${ex.status === 'active' ? 'bg-green-100 text-green-700' : ex.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                  {ex.status === 'active' ? 'فعال' : ex.status === 'pending' ? 'در انتظار' : 'مسدود'}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}