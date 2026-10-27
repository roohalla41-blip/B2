import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useChatGroups, useGroupMessages, useIsGroupMember,
  useJoinGroup, useSendMessage, useMessageCooldown,
} from '@/lib/useChat';
import { useAuth } from '@/lib/AuthContext';
import { formatCooldown } from '@/lib/chat';
import { PageHeader, EmptyState, LoadingState } from '@/components/sarraaf/Pieces';
import GroupCard from '@/components/chat/GroupCard';
import MessageBubble from '@/components/chat/MessageBubble';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { useRateSettings } from '@/lib/useSarraaf';
import { offlineDB } from '@/lib/offlineQueue';
import { Send, Users, Globe, ArrowRight } from 'lucide-react';

function useLastMessages(groups) {
  const [result, setResult] = useState({});
  useEffect(() => {
    if (!groups || groups.length === 0) { setResult({}); return; }
    let cancelled = false;
    (async () => {
      const map = {};
      for (const g of groups) {
        const list = await offlineDB.GroupMessage.filter({ group_id: g.id });
        if (!cancelled && list && list.length > 0) {
          const active = list.filter(m => m.status !== 'deleted');
          active.sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0));
          if (active[0]) map[g.id] = active[0];
        }
      }
      if (!cancelled) setResult(map);
    })();
    return () => { cancelled = true; };
  }, [JSON.stringify(groups?.map(g => g.id))]);
  return result;
}

export default function CustomerChat() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: groups, isLoading } = useChatGroups('public');
  const { data: rateSettings } = useRateSettings();
  const lastMessages = useLastMessages(groups || []);

  // If a groupId is in URL, show chat room
  const urlParams = new URLSearchParams(window.location.search);
  const activeGroupId = urlParams.get('group');

  if (activeGroupId) {
    return <CustomerChatRoom groupId={activeGroupId} />;
  }

  return (
    <>
      <PageHeader title="چت و گروه‌ها" icon={Users} actions={<Button size="sm" variant="ghost" onClick={() => navigate('/customer')}><ArrowRight className="w-4 h-4" /> بازگشت</Button>} />

      <div className="mb-4 p-3 rounded-xl bg-green-50 border border-green-200 text-green-800 text-xs">
        شما به‌عنوان مشتری می‌توانید در گروه‌های عمومی شرکت کنید. گروه‌های خصوصی صرافان برای مشتریان قابل مشاهده نیست.
      </div>

      {isLoading ? <LoadingState /> : !groups || groups.length === 0 ? (
        <EmptyState icon={Globe} title="گروه عمومی وجود ندارد" description="گروه‌های عمومی به‌زودی فعال می‌شوند" />
      ) : (
        <div className="space-y-2">
          {groups.map(g => (
            <GroupCard
              key={g.id}
              group={g}
              lastMessage={lastMessages[g.id]}
              to={`/customer/chat?group=${g.id}`}
            />
          ))}
        </div>
      )}
    </>
  );
}

function CustomerChatRoom({ groupId }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: messages, isLoading: msgLoading } = useGroupMessages(groupId);
  const { data: isMember } = useIsGroupMember(groupId, user?.id);
  const joinMut = useJoinGroup();
  const sendMut = useSendMessage();
  const { data: rateSettings } = useRateSettings();
  const [message, setMessage] = useState('');
  const messagesEndRef = React.useRef(null);

  const ttlKey = rateSettings?.chat_message_ttl || 'never';

  // Rate limiting — customers: 5 minutes between messages
  const cooldownRemaining = useMessageCooldown(groupId, user?.id, 'customer', null);
  const isRateLimited = cooldownRemaining > 0;

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleJoin = async () => {
    const group = { id: groupId, name: '', type: 'public' };
    try {
      await joinMut.mutateAsync({ group, user, userRole: 'customer', profile: null });
      toast({ title: 'پیوستید', description: 'به گروه عمومی پیوستید' });
    } catch (err) {
      toast({ title: 'خطا', description: err.message, variant: 'destructive' });
    }
  };

  const handleSend = async () => {
    if (!message.trim()) return;
    if (!isMember) {
      toast({ title: 'خطا', description: 'ابتدا به گروه بپیوندید', variant: 'destructive' });
      return;
    }
    try {
      await sendMut.mutateAsync({
        group: { id: groupId, name: '', type: 'public' },
        user,
        userRole: 'customer',
        profile: null,
        message: message.trim(),
        ttlKey,
      });
      setMessage('');
    } catch (err) {
      if (err.message?.startsWith('rate_limited:')) {
        const seconds = parseInt(err.message.split(':')[1]) || 0;
        toast({ title: 'محدودیت ارسال', description: `لطفاً ${formatCooldown(seconds)} صبر کنید`, variant: 'destructive' });
      } else {
        toast({ title: 'خطا', description: err.message, variant: 'destructive' });
      }
    }
  };

  return (
    <>
      <PageHeader title="گروه عمومی" icon={Globe} actions={<Button size="sm" variant="ghost" onClick={() => navigate('/customer/chat')}><ArrowRight className="w-4 h-4" /> بازگشت</Button>} />

      {!isMember && (
        <div className="mb-4">
          <Button className="w-full" onClick={handleJoin} disabled={joinMut.isPending}>
            پیوستن به گروه
          </Button>
        </div>
      )}

      <div className="space-y-2 mb-20">
        {msgLoading ? <LoadingState /> : !messages || messages.length === 0 ? (
          <EmptyState icon={Send} title="پیامی نیست" description="اولین پیام را ارسال کنید" />
        ) : (
          messages.map(msg => (
            <MessageBubble key={msg.id} message={msg} showActions={isMember} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {isMember && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-background border-t p-3">
          {isRateLimited && (
            <div className="max-w-5xl mx-auto mb-2 text-center text-xs text-amber-600 bg-amber-50 rounded-lg py-1">
              ⏳ لطفاً {formatCooldown(cooldownRemaining)} برای ارسال پیام بعدی صبر کنید
            </div>
          )}
          <div className="max-w-5xl mx-auto flex items-center gap-2">
            <Input
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSend(); } }}
              placeholder={isRateLimited ? 'در حال انتظار...' : 'پیام خود را بنویسید...'}
              className="flex-1"
              disabled={isRateLimited}
            />
            <Button size="icon" onClick={handleSend} disabled={sendMut.isPending || !message.trim() || isRateLimited}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}