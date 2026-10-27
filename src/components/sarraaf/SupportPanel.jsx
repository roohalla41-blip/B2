import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Send, MessageSquare, Clock } from 'lucide-react';
import { createTicket, getTickets, addTicketMessage, getTicketMessages, TICKET_CATEGORIES, TICKET_PRIORITIES, TICKET_STATUSES } from '@/lib/supportSystem';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/AuthContext';

export default function SupportPanel() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ subject: '', description: '', category: 'general', priority: 'normal' });
  const { toast } = useToast();

  useEffect(() => {
    load();
  }, [user?.id]);

  async function load() {
    if (!user?.id) return;
    setLoading(true);
    const list = await getTickets(user.id);
    setTickets(list);
    setLoading(false);
  }

  async function handleCreate() {
    if (!form.subject || !form.description) {
      toast({ title: 'خطا', description: 'موضوع و توضیحات الزامی است', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      await createTicket({
        userId: user.id,
        exchangeCode: user.exchange_code || '',
        ...form,
      });
      toast({ title: 'موفق', description: 'تیکت شما ثبت شد' });
    } catch (err) {
      const msg = String(err?.message || err || '');
      if (msg.startsWith('RATE_LIMIT:')) {
        toast({ title: 'محدودیت', description: msg.replace('RATE_LIMIT:', ''), variant: 'destructive' });
      } else {
        toast({ title: 'خطا', description: 'ثبت تیکت ناموفق بود', variant: 'destructive' });
      }
      setSubmitting(false);
      return;
    }
    setForm({ subject: '', description: '', category: 'general', priority: 'normal' });
    setShowForm(false);
    setSubmitting(false);
    load();
  }

  async function loadMessages(ticketId) {
    const msgs = await getTicketMessages(ticketId);
    setMessages(msgs);
  }

  async function handleSendMessage() {
    if (!newMessage || !selectedTicket) return;
    await addTicketMessage({
      ticketId: selectedTicket.id,
      senderId: user.id,
      senderName: user.full_name || user.email,
      message: newMessage,
    });
    setNewMessage('');
    loadMessages(selectedTicket.id);
  }

  const statusLabel = (s) => TICKET_STATUSES.find(x => x.value === s)?.label || s;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  if (selectedTicket) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">{selectedTicket.subject}</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setSelectedTicket(null)}>بستن</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-thin">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.sender_id === user.id ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-lg px-3 py-2 text-xs ${m.sender_id === user.id ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  <p className="font-medium mb-1">{m.sender_name}</p>
                  <p>{m.message}</p>
                </div>
              </div>
            ))}
            {messages.length === 0 && <p className="text-center text-xs text-muted-foreground py-4">پیامی وجود ندارد</p>}
          </div>
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="پاسخ..."
              className="h-8 text-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <Button size="icon" onClick={handleSendMessage}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            پشتیبانی
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'بستن' : 'تیکت جدید'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {showForm && (
          <div className="space-y-2 p-3 rounded-lg border border-border">
            <div>
              <Label className="text-xs">موضوع</Label>
              <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="h-8 text-sm mt-1" />
            </div>
            <div>
              <Label className="text-xs">توضیحات</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="text-sm mt-1 min-h-[60px]" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">دسته‌بندی</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger className="h-8 text-sm mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TICKET_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">اولویت</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger className="h-8 text-sm mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TICKET_PRIORITIES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleCreate} disabled={submitting} className="w-full" size="sm">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              ثبت تیکت
            </Button>
          </div>
        )}

        {tickets.length === 0 ? (
          <p className="text-center text-xs text-muted-foreground py-6">تیکتی ثبت نشده است</p>
        ) : (
          <div className="space-y-2">
            {tickets.map((t) => (
              <button
                key={t.id}
                onClick={() => { setSelectedTicket(t); loadMessages(t.id); }}
                className="w-full text-right p-2.5 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium truncate">{t.subject}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${t.status === 'open' ? 'bg-blue-100 text-blue-700' : t.status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}`}>
                    {statusLabel(t.status)}
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">{t.ticket_number}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}