import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import {
  loadMessagesProfile, loadConversations, sendMessage, markConversationRead,
} from '@/lib/messagesMockData';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  MessageSquare, Send, Search, ArrowRight, RefreshCw,
  Check, CheckCheck, AlertCircle, ChevronLeft, Wallet, Package, Landmark,
} from 'lucide-react';

const STATUS_ICONS = {
  sending: { icon: RefreshCw, color: 'text-muted-foreground', spin: true },
  sent: { icon: Check, color: 'text-muted-foreground', spin: false },
  delivered: { icon: CheckCheck, color: 'text-muted-foreground', spin: false },
  read: { icon: CheckCheck, color: 'text-primary', spin: false },
  error: { icon: AlertCircle, color: 'text-destructive', spin: false },
};

const MAX_MESSAGE_LENGTH = 500;

export default function CustomerMessages() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeConvId, setActiveConvId] = useState(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const messagesEndRef = useRef(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [prof, convs] = await Promise.all([
        loadMessagesProfile(user), loadConversations(user?.id),
      ]);
      setProfile(prof);
      setConversations(convs);
    } catch (e) {
      setError(true);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const activeConv = conversations.find((c) => c.id === activeConvId);

  useEffect(() => {
    if (activeConvId) {
      markConversationRead(activeConvId, user?.id).then(() => {
        setConversations((prev) => prev.map((c) =>
          c.id === activeConvId ? { ...c, unread_count: 0, messages: c.messages.map((m) => m.sender === 'exchange' ? { ...m, status: 'read' } : m) } : c
        ));
      });
    }
  }, [activeConvId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConv?.messages]);

  const filteredConversations = conversations.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || (c.last_message || '').toLowerCase().includes(q);
  });

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);

  const handleSend = async () => {
    if (!input.trim() || !activeConvId || sending) return;
    if (input.length > MAX_MESSAGE_LENGTH) return;
    setSending(true);
    try {
      await sendMessage(activeConvId, input.trim(), user?.full_name || profile?.customer_name || 'مشتری', user?.id);
      const updated = await loadConversations(user?.id);
      setConversations(updated);
      setInput('');
    } catch (e) {
      // error handled visually
    }
    setSending(false);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-8 w-full rounded-lg" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-bold text-foreground">پیام‌ها و پیام‌رسانی</h1>
        <Card>
          <CardContent className="p-8 text-center space-y-4">
            <p className="text-sm text-muted-foreground">دریافت اطلاعات با مشکل مواجه شد.</p>
            <Button onClick={loadData} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 ml-2" />
              تلاش مجدد
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Chat View
  if (activeConv) {
    return (
      <div className="space-y-3">
        {/* Chat Header */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setActiveConvId(null)}>
            <ArrowRight className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <MessageSquare className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground truncate">{activeConv.name}</p>
              <p className="text-[10px] text-success flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-success" />
                آنلاین
              </p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <Card className="shadow-sm flex flex-col" style={{ minHeight: 'calc(100vh - 220px)' }}>
          <CardContent className="p-3 flex-1 flex flex-col">
            <div className="flex-1 space-y-2 overflow-y-auto scrollbar-thin" style={{ maxHeight: 'calc(100vh - 280px)' }}>
              {activeConv.messages.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">گفتگو بدون پیام — اولین پیام را ارسال کنید.</p>
                </div>
              ) : (
                activeConv.messages.map((msg) => {
                  const isMine = msg.sender === 'customer';
                  const st = STATUS_ICONS[msg.status] || STATUS_ICONS.sent;
                  const StIcon = st.icon;
                  return (
                    <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-xl px-3 py-2 ${isMine ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'}`}>
                        <p className="text-xs whitespace-pre-wrap break-words">{msg.content}</p>
                        <div className={`flex items-center gap-1 mt-0.5 ${isMine ? 'justify-end' : 'justify-start'}`}>
                          <p className={`text-[8px] ${isMine ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                            {new Date(msg.timestamp).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          {isMine && <StIcon className={`w-2.5 h-2.5 ${st.color} ${st.spin ? 'animate-spin' : ''}`} />}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="flex gap-1 mt-2 pt-2 border-t border-border">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                placeholder="پیام خود را بنویسید..."
                className="text-xs h-9"
                maxLength={MAX_MESSAGE_LENGTH}
                disabled={sending}
              />
              <Button size="icon" className="h-9 w-9 shrink-0" onClick={handleSend} disabled={!input.trim() || sending}>
                {sending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
            {input.length > MAX_MESSAGE_LENGTH * 0.8 && (
              <p className="text-[9px] text-muted-foreground text-left mt-1">
                {input.length} / {MAX_MESSAGE_LENGTH}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Conversation List View
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <MessageSquare className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-foreground">پیام‌ها و پیام‌رسانی</h1>
            <p className="text-xs text-muted-foreground">ارتباط با صرافی شما</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/customer')}>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Customer Info */}
      <Card className="shadow-sm">
        <CardContent className="p-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] text-muted-foreground">نام مشتری</p>
              <p className="text-xs font-medium text-foreground">{profile?.customer_name || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">کد مشتری</p>
              <p className="text-xs font-mono text-foreground">{profile?.customer_code || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">نام صرافی</p>
              <p className="text-xs font-medium text-foreground">{profile?.exchange_name || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">پیام‌های خوانده‌نشده</p>
              <p className={`text-xs font-bold ${totalUnread > 0 ? 'text-primary' : 'text-muted-foreground'}`}>{totalUnread}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="جستجو در گفتگوها..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="text-xs pr-9"
        />
      </div>

      {/* Conversations List */}
      {filteredConversations.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            {conversations.length === 0
              ? 'هنوز گفتگویی برای شما ایجاد نشده است.'
              : 'گفتگویی با این عبارت یافت نشد'}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredConversations.map((conv) => {
            const time = new Date(conv.last_message_time);
            return (
              <Card key={conv.id} className="shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveConvId(conv.id)}>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <MessageSquare className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-foreground truncate">{conv.name}</p>
                      <span className="text-[9px] text-muted-foreground shrink-0">
                        {time.toLocaleDateString('fa-IR')} {time.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-[10px] truncate ${conv.unread_count > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                        {conv.last_message}
                      </p>
                      {conv.unread_count > 0 && (
                        <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold shrink-0">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronLeft className="w-4 h-4 text-muted-foreground shrink-0" />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Quick Links */}
      <div className="grid grid-cols-3 gap-2">
        <Button variant="outline" className="flex-col h-auto py-3 gap-1" onClick={() => navigate('/customer/wallet')}>
          <Wallet className="w-4 h-4" />
          <span className="text-[10px]">کیف پول</span>
        </Button>
        <Button variant="outline" className="flex-col h-auto py-3 gap-1" onClick={() => navigate('/customer/account')}>
          <Landmark className="w-4 h-4" />
          <span className="text-[10px]">حساب من</span>
        </Button>
        <Button variant="outline" className="flex-col h-auto py-3 gap-1" onClick={() => navigate('/customer/orders')}>
          <Package className="w-4 h-4" />
          <span className="text-[10px]">سفارش‌ها</span>
        </Button>
      </div>
    </div>
  );
}