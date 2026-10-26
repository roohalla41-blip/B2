import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Database, Wallet, MessageSquare, CheckCircle2, XCircle, Clock, XOctagon } from 'lucide-react';
import OrderTimeline from './OrderTimeline';

const STATUS_LABELS = {
  new: { label: 'جدید', color: 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400' },
  review: { label: 'در حال بررسی', color: 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400' },
  approved: { label: 'تأیید شده', color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/30 dark:text-cyan-400' },
  processing: { label: 'در حال انجام', color: 'bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400' },
  completed: { label: 'تکمیل شده', color: 'bg-success/15 text-success' },
  rejected: { label: 'رد شده', color: 'bg-destructive/15 text-destructive' },
  cancelled: { label: 'لغو شده', color: 'bg-muted text-muted-foreground' },
};

const STATUS_MESSAGES = {
  new: { text: 'سفارش شما ثبت شده و در انتظار بررسی است.', icon: Clock, color: 'text-blue-600 dark:text-blue-400' },
  review: { text: 'سفارش شما در حال بررسی است.', icon: Clock, color: 'text-amber-600 dark:text-amber-400' },
  approved: { text: 'سفارش شما تأیید شده و در حال آماده‌سازی است.', icon: CheckCircle2, color: 'text-cyan-600 dark:text-cyan-400' },
  processing: { text: 'سفارش شما در حال انجام است.', icon: Clock, color: 'text-purple-600 dark:text-purple-400' },
  completed: { text: 'این سفارش با موفقیت تکمیل شده است.', icon: CheckCircle2, color: 'text-success' },
  rejected: { text: 'این سفارش رد شده است.', icon: XCircle, color: 'text-destructive' },
  cancelled: { text: 'این سفارش لغو شده است.', icon: XOctagon, color: 'text-muted-foreground' },
};

export default function OrderDetail({ open, onOpenChange, order }) {
  const navigate = useNavigate();
  if (!order) return null;
  const st = STATUS_LABELS[order.status] || STATUS_LABELS.new;
  const sm = STATUS_MESSAGES[order.status] || STATUS_MESSAGES.new;
  const StatusMsgIcon = sm.icon;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>جزئیات سفارش</SheetTitle>
          <SheetDescription>{order.title}</SheetDescription>
        </SheetHeader>

        <div className="space-y-3 mt-4">
          {/* Amount & Status */}
          <Card className="shadow-sm">
            <CardContent className="p-4 text-center">
              <p className="text-[10px] text-muted-foreground">مبلغ سفارش</p>
              <p className="text-2xl font-bold text-foreground">{(order.amount || 0).toLocaleString('fa-IR')}</p>
              <p className="text-[10px] text-muted-foreground">{order.currency}</p>
              <span className={`inline-block mt-2 text-[9px] px-2 py-1 rounded ${st.color}`}>
                {st.label}
              </span>
            </CardContent>
          </Card>

          {/* Special Status Message */}
          <div className={`flex items-center gap-2 rounded-lg p-3 bg-muted/50 ${sm.color}`}>
            <StatusMsgIcon className="w-4 h-4 shrink-0" />
            <p className="text-xs font-medium">{sm.text}</p>
          </div>

          {/* Timeline */}
          <OrderTimeline timeline={order.timeline} status={order.status} />

          {/* Details */}
          <Card className="shadow-sm">
            <CardContent className="p-3 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">شماره سفارش:</span>
                <span className="font-mono text-primary font-bold text-[10px]">{order.id}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">شماره پیگیری:</span>
                <span className="font-mono text-foreground text-[10px]">{order.tracking_number}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">عنوان:</span>
                <span className="text-foreground">{order.title}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">نوع خدمت:</span>
                <span className="text-foreground">{order.service_type_label}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">ایجادکننده:</span>
                <span className="text-foreground">{order.created_by_name}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">مشتری:</span>
                <span className="text-foreground">{order.customer_name}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">تاریخ ایجاد:</span>
                <span className="text-foreground text-[10px]">{new Date(order.created_date).toLocaleDateString('fa-IR')} • {new Date(order.created_date).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">آخرین بروزرسانی:</span>
                <span className="text-foreground text-[10px]">{new Date(order.last_updated).toLocaleDateString('fa-IR')} • {new Date(order.last_updated).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">مبلغ:</span>
                <span className="text-foreground">{(order.amount || 0).toLocaleString('fa-IR')} {order.currency}</span>
              </div>
              {order.fee != null && order.fee > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">کارمزد:</span>
                  <span className="text-foreground">{(order.fee || 0).toLocaleString('fa-IR')} {order.currency}</span>
                </div>
              )}
              <div className="flex justify-between text-xs pt-2 border-t border-border">
                <span className="text-muted-foreground">مبلغ نهایی:</span>
                <span className="font-bold text-primary">{(order.total_amount || 0).toLocaleString('fa-IR')} {order.currency}</span>
              </div>
              {order.description && (
                <div className="pt-2 border-t border-border">
                  <p className="text-[10px] text-muted-foreground mb-1">توضیحات:</p>
                  <p className="text-xs text-foreground">{order.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Related Links */}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="flex-col h-auto py-2.5 gap-1" onClick={() => navigate('/customer/wallet')}>
              <Wallet className="w-4 h-4" />
              <span className="text-[10px]">کیف پول</span>
            </Button>
            <Button variant="outline" className="flex-col h-auto py-2.5 gap-1" onClick={() => navigate('/customer/messages')}>
              <MessageSquare className="w-4 h-4" />
              <span className="text-[10px]">پیام‌ها</span>
            </Button>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground bg-muted/50 rounded-lg p-2">
            <Database className="w-3 h-3 shrink-0" />
            حالت آزمایشی — Supabase متصل نیست
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}