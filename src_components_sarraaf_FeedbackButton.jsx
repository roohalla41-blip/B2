import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Star, MessageSquarePlus } from 'lucide-react';
import { submitFeedback } from '@/lib/supportSystem';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/AuthContext';

export default function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState('suggestion');
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  async function handleSubmit() {
    if (!message) {
      toast({ title: 'خطا', description: 'پیام خود را وارد کنید', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    await submitFeedback({
      userId: user?.id || '',
      exchangeCode: user?.exchange_code || '',
      type,
      message,
      rating,
    });
    toast({ title: 'ممنون!', description: 'بازخورد شما ثبت شد' });
    setMessage('');
    setRating(0);
    setType('suggestion');
    setOpen(false);
    setSubmitting(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <MessageSquarePlus className="w-4 h-4" />
          ثبت بازخورد
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>بازخورد شما</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Select value={type} onValueChange={setType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="suggestion">پیشنهاد</SelectItem>
              <SelectItem value="bug">گزارش باگ</SelectItem>
              <SelectItem value="rating">امتیاز و نظر</SelectItem>
            </SelectContent>
          </Select>

          {type === 'rating' && (
            <div className="flex items-center gap-1 justify-center">
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} onClick={() => setRating(n)}>
                  <Star className={`w-6 h-6 ${n <= rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'}`} />
                </button>
              ))}
            </div>
          )}

          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="پیام خود را بنویسید..."
            className="min-h-[80px]"
          />

          <Button onClick={handleSubmit} disabled={submitting} className="w-full">
            ارسال
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}