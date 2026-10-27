import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useSarraafProfile } from '@/lib/useSarraaf';
import { offlineDB } from '@/lib/offlineQueue';
import FeatureGate from '@/components/FeatureGate';
import { PageHeader, LoadingState, EmptyState } from '@/components/sarraaf/Pieces';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, MessageSquareMore, Search, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';

export default function SarraafChat() {
  const { user } = useAuth();
  const { data: profile } = useSarraafProfile(user?.id);
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const scrollRef = useRef(null);

  const loadChats = async () => {
    try {
      const all = await offlineDB.ChatGroup.filter({ type: 'sarraaf_direct' }, '-updated_date', 50);
      const mine = (all || []).filter(g => g.creator_id === user?.id || g.exchange_code === profile?.code);
      setChats(mine);
    } catch {
      setChats([]);
    }
    setLoading(false);
  };

  useEffect(() => { loadChats(); }, []);

  const openChat = async (chat) => {
    setActiveChat(chat);
    const msgs = await offlineDB.GroupMessage.filter({ group_id: chat.id, status: 'active' }, '-created_date', 100);
    setMessages((msgs || []).reverse());
  };

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim() || !activeChat) return;
    setSending(true);
    try {
      await offlineDB.GroupMessage.create({
        group_id: activeChat.id,
        sender_id: user?.id,
        sender_name: profile?.exchange_name || user?.full_name,
        sender_role: 'sarraaf',
        message: text.trim(),
        sync_status: 'pending',
        status: 'active',
      });
      setText('');
      const msgs = await offlineDB.GroupMessage.filter({ group_id: activeChat.id, status: 'active' }, '-created_date', 100);
      setMessages((msgs || []).reverse());
    } catch {
      // ignore
    }
    setSending(false);
  };

  const filteredChats = chats.filter(c => 
    !search || c.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <FeatureGate featureKey="sarraaf_chat">
      <PageHeader title="چت صراف‌ها" subtitle="پیام خصوصی با سایر صراف‌ها" icon={MessageSquareMore} />

      {activeChat ? (
        <Card className="flex flex-col" style={{ height: 'calc(100vh - 200px)' }}>
          <div className="flex items-center gap-2 p-3 border-b">
            <Button variant="ghost" size="icon" onClick={() => setActiveChat(null)}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex-1">
              <p className="text-sm font-bold">{activeChat.name}</p>
              <p className="text-xs text-muted-foreground">{activeChat.description || 'چت خصوصی'}</p>
            </div>
          </div>
          <CardContent className="flex-1 overflow-y-auto p-3 scrollbar-thin" ref={scrollRef}>
            {messages.length === 0 ? (
              <EmptyState icon={MessageSquareMore} title="پیامی نیست" description="شروع گفتگو" />
            ) : (
              <div className="space-y-3">
                {messages.map(msg => (
                  <div key={msg.id} className={`flex flex-col ${msg.sender_id === user?.id ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${msg.sender_id === user?.id ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
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
              placeholder="پیام خود را بنویسید..."
              disabled={sending}
            />
            <Button size="icon" onClick={handleSend} disabled={sending || !text.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-3">
            <div className="relative mb-3">
              <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="جستجوی چت..."
                className="pr-8"
              />
            </div>
            {loading ? (
              <LoadingState />
            ) : filteredChats.length === 0 ? (
              <EmptyState icon={MessageSquareMore} title="چتی وجود ندارد" description="از شبکه نمایندگی چت خصوصی شروع کنید" />
            ) : (
              <div className="space-y-1">
                {filteredChats.map(chat => (
                  <button
                    key={chat.id}
                    onClick={() => openChat(chat)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted transition-colors text-right"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <MessageSquareMore className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{chat.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{chat.description || 'چت خصوصی'}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </FeatureGate>
  );
}