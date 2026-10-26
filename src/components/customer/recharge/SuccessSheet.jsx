import React from 'react';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Package, Database } from 'lucide-react';

const STATUS_LABELS = {
  new: { label: 'جدید', color: 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400' },
  pending: { label: 'در انتظار بررسی', color: 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400' },
  approved: { label: 'تأیید شده', color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/30 dark:text-cyan-400' },
  processing: { label: 'در حال انجام', color: 'bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400' },
  completed: { label: 'تکمیل شده', color: 'bg-success/15 text-success' },
  rejected: { label: 'رد شده', color: 'bg-destructive/15 text-destructive' },
  cancelled: { label: 'لغو شده', color: 'bg-muted text-muted-foreground' },
};

const SERVICE_LABELS = {
  mobile_recharge: 'شارژ موبایل',
  internet: 'بسته اینترنت',
};

export default function SuccessSheet({ open, onOpenChange, request, onGoToOrders }) {
  if (!request) return null;
  const st = STATUS_LABELS[request.status] || STATUS_LABELS.new;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>نتیجه ثبت درخواست</SheetTitle>
          <SheetDescription>درخواست شما ثبت شد</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 mt-4">
          {/* Success Icon */}
          <Card className="shadow-sm border-success/30">
            <CardContent className="p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-7 h-7 text-success" />
              </div>
              <p className="text-sm font-bold text-foreground mb-1">
                درخواست شما با موفقیت ثبت شد و در انتظار بررسی است.
              </p>
              <span className={`inline-block mt-2 text-[9px] px-2 py-1 rounded ${st.color}`}>
                {st.label}
              </span>
            </CardContent>
          </Card>

          {/* Request Details */}
          <Card className="shadow-sm">
            <CardContent className="p-3 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">شماره درخواست:</span>
                <span className="font-mono text-primary font-bold text-[10px]">{request.request_number}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">نوع سرویس:</span>
                <span className="text-foreground">{SERVICE_LABELS[request.service_type]}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">اپراتور:</span>
                <span className="text-foreground">{request.operator_name}</span>
              </div>
              {request.mobile && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">شماره موبایل:</span>
                  <span className="text-foreground" dir="ltr">{request.mobile}</span>
                </div>
              )}
              {request.package_name && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">بسته:</span>
                  <span className="text-foreground">{request.package_name}</span>
                </div>
              )}
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">مبلغ:</span>
                <span className="font-bold text-foreground">{(request.amount || 0).toLocaleString('fa-IR')} {request.wallet_currency}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">تاریخ:</span>
                <span className="text-foreground text-[10px]">{new Date(request.created_date).toLocaleDateString('fa-IR')}</span>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground bg-muted/50 rounded-lg p-2">
            <Database className="w-3 h-3 shrink-0" />
            حالت آزمایشی — Supabase متصل نیست
          </div>

          <Button className="w-full" onClick={onGoToOrders}>
            <Package className="w-4 h-4 ml-2" />
            مشاهده سفارش‌های من
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}