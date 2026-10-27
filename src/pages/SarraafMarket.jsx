import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useSarraafProfile } from '@/lib/useSarraaf';
import { offlineDB } from '@/lib/offlineQueue';
import FeatureGate from '@/components/FeatureGate';
import { PageHeader, LoadingState, EmptyState } from '@/components/sarraaf/Pieces';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Store, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

export default function SarraafMarket() {
  const { user } = useAuth();
  const { data: profile } = useSarraafProfile(user?.id);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  const loadMessages = async () => {
    try {
      const all = await offlineDB.ChatGroup.list();
      let market = all.find(g => g.type === 'sarraaf_market' && g.status === 'active');
      if (!market) {
        market = await offlineDB.ChatGroup.create({
          name: 'بازار نرخ صراف‌ها',
          type: 'sarraaf_market',
          status: 'active',
          description: 'کانال عمومی برای اشتراک نرخ ارز',
          creator_id: user?.id,
          creator_name: profile?.exchange_name || user?.full_name,
        });
      }
      const msgs = await offlineDB.GroupMessage.filter({ group_id: market.id, status: 'active' }, '-created_date', 100);
      setMessages((msgs || []).reverse());
    } catch {
      setMessages([]);
    }
    setLoading(false);
  };

  useEffect(() => { loadMessages(); }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      const all = await offlineDB.ChatGroup.list();
      const market = all.find(g => g.type === 'sarraaf_market');
      if (!market) return;
      await offlineDB.GroupMessage.create({
        group_id: market.id,
        sender_id: user?.id,
        sender_name: profile?.exchange_name || user?.full_name,
        sender_role: 'sarraaf',
        message: text.trim(),
        sync_status: 'pending',
        status: 'active',
      });
      setText('');
      await loadMessages();
    } catch {
      // ignore
    }
    setSending(false);
  };

  return (
    <FeatureGate featureKey="sarraaf_market">
      <PageHeader title="بازار نرخ صراف‌ها" subtitle="کانال عمومی اشتراک نرخ" icon={Store} />

      {loading ? (
        <LoadingState />
      ) : (
        <Card className="flex flex-col" style={{ height: 'calc(100vh - 200px)' }}>
          <CardContent className="flex-1 overflow-y-auto p-3 scrollbar-thin" ref={scrollRef}>
            {messages.length === 0 ? (
              <EmptyState icon={TrendingUp} title="پیامی ثبت نشده" description="اولین نرخ امروز را اشتراک بگذارید" />
            ) : (
              <div className="space-y-3">
                {messages.map(msg => (
                  <div key={msg.id} className={`flex flex-col ${msg.sender_id === user?.id ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${msg.sender_id === user?.id ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                      {msg.sender_id !== user?.id && (
                        <p className="text-xs font-bold mb-0.5 opacity-80">{msg.sender_name}</p>
                      )}
                      <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                      <p className="text-[10px] opacity-60 mt-1">
                        {msg.created_date ? format(new Date(msg.created_date), 'HH:mm') : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
          <div className="border-t p-2 flex items-center gap-2">
            <Input
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="نرخ یا پیام خود را بنویسید..."
              disabled={sending}
            />
            <Button size="icon" onClick={handleSend} disabled={sending || !text.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      )}
    </FeatureGate>
  );
}