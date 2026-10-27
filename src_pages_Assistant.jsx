import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Trash2, Loader2, AlertCircle, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/AuthContext';
import {
  sendAssistantMessage,
  loadHistory,
  saveHistory,
  clearHistory,
  MODEL_STATUS,
} from '@/lib/aiChat';

const WELCOME_TEXT =
  'به دستیار هوشمند حساب صراف خوش آمدید. در این مرحله، دستیار هنوز پیکربندی نشده است؛ پس از راه‌اندازی کامل، پاسخ سؤال‌های شما دربارهٔ استفاده از برنامه ارائه خواهد شد.';

export default function Assistant() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [notConfigured, setNotConfigured] = useState(false);
  const scrollRef = useRef(null);

  // بارگذاری تاریخچه محلی هنگام نمایش صفحه
  useEffect(() => {
    setMessages(loadHistory());
  }, []);

  // ذخیره خودکار تاریخچه
  useEffect(() => {
    saveHistory(messages);
  }, [messages]);

  // اسکرول به پایین هنگام افزودن پیام
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sending]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;

    const userMsg = { role: 'user', text, ts: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setSending(true);
    setError(null);

    const result = await sendAssistantMessage(text);

    setSending(false);

    if (result.status === MODEL_STATUS.NOT_CONFIGURED) {
      setNotConfigured(true);
      const botMsg = { role: 'assistant', text: result.reply, ts: Date.now() };
      setMessages(prev => [...prev, botMsg]);
      return;
    }

    if (result.status === MODEL_STATUS.ERROR || !result.reply) {
      setError(result.error || 'خطای ناشناخته.');
      return;
    }

    setNotConfigured(false);
    const botMsg = { role: 'assistant', text: result.reply, ts: Date.now() };
    setMessages(prev => [...prev, botMsg]);
  }, [input, sending]);

  const handleClearHistory = useCallback(() => {
    if (!window.confirm('تاریخچه گفتگوی محلی پاک شود؟ این عمل فقط داده‌های این مرورگر را حذف می‌کند و بر سوابق سرور تأثیری ندارد.')) {
      return;
    }
    clearHistory();
    setMessages([]);
    setError(null);
    setNotConfigured(false);
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] md:h-[calc(100vh-3.5rem)] max-w-3xl mx-auto w-full">
      {/* هدر */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b bg-card">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold truncate">دستیار هوشمند حساب صراف</h1>
            <p className="text-[11px] text-muted-foreground truncate">
              {user?.name || user?.email || 'کاربر'}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearHistory}
          className="text-muted-foreground hover:text-destructive"
          title="پاک‌کردن تاریخچه محلی"
        >
          <Trash2 className="w-4 h-4" />
          <span className="hidden sm:inline">پاک‌کردن</span>
        </Button>
      </div>

      {/* پیام پیکربندی‌نشدن */}
      {notConfigured && (
        <div className="mx-4 mt-3 flex items-start gap-2 rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-xs text-warning-foreground/90">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-warning" />
          <span>دستیار هوشمند هنوز پیکربندی نشده است. پاسخ‌های واقعی پس از راه‌اندازی کامل ارائه می‌شود.</span>
        </div>
      )}

      {/* خطا */}
      {error && (
        <div className="mx-4 mt-3 flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/30 px-3 py-2 text-xs text-destructive">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* لیست پیام‌ها */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scrollbar-thin">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground gap-2">
            <Bot className="w-10 h-10 opacity-40" />
            <p className="text-sm max-w-xs">{WELCOME_TEXT}</p>
          </div>
        )}

        {messages.map((m, i) => (
          <MessageBubble key={i} role={m.role} text={m.text} />
        ))}

        {sending && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>در حال پردازش…</span>
          </div>
        )}
      </div>

      {/* کادر ورودی */}
      <div className="border-t bg-card px-3 py-3 safe-bottom">
        <div className="flex items-center gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="پیام خود را بنویسید…"
            disabled={sending}
            maxLength={2000}
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            size="icon"
            aria-label="ارسال"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
          تاریخچه گفتگو فقط در این مرورگر ذخیره می‌شود.
        </p>
      </div>
    </div>
  );
}

function MessageBubble({ role, text }) {
  const isUser = role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-start' : 'justify-end'}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words ${
          isUser
            ? 'bg-primary text-primary-foreground rounded-bl-sm'
            : 'bg-muted text-foreground rounded-br-sm'
        }`}
      >
        {text}
      </div>
    </div>
  );
}