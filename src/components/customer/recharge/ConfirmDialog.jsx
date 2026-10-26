import React from 'react';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit3, Send, Database } from 'lucide-react';

const SERVICE_LABELS = {
  mobile_recharge: 'شارژ موبایل',
  internet: 'بسته اینترنت',
};

const WALLET_LABELS = {
  AFN: 'افغانی (AFN)',
  USD: 'دلار (USD)',
  IRT: 'تومان (IRT)',
  USDT: 'تتر (USDT)',
};

export default function ConfirmDialog({
  open,
  onOpenChange,
  data,
  onConfirm,
  submitting,
}) {
  if (!data) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>بررسی و تأیید درخواست</SheetTitle>
          <SheetDescription>لطفاً اطلاعات درخواست خود را بررسی کنید</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 mt-4">
          <Card className="shadow-sm">
            <CardContent className="p-3 space-y-2.5">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">نوع سرویس:</span>
                <span className="font-medium text-foreground">{SERVICE_LABELS[data.service_type]}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">اپراتور:</span>
                <span className="font-medium text-foreground">{data.operator_name}</span>
              </div>
              {data.mobile && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">شماره موبایل:</span>
                  <span className="font-medium text-foreground ltr-text" dir="ltr">{data.mobile}</span>
                </div>
              )}
              {data.package_name && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">نام بسته:</span>
                  <span className="font-medium text-foreground">{data.package_name}</span>
                </div>
              )}
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">کیف پول پرداخت:</span>
                <span className="font-medium text-foreground">{WALLET_LABELS[data.wallet_currency] || data.wallet_currency}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">مبلغ:</span>
                <span className="font-bold text-primary">{(data.amount || 0).toLocaleString('fa-IR')} {data.wallet_currency}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">تاریخ و ساعت:</span>
                <span className="text-foreground text-[10px]">{new Date().toLocaleDateString('fa-IR')} • {new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              {data.description && (
                <div className="pt-2 border-t border-border">
                  <p className="text-[10px] text-muted-foreground mb-1">توضیحات:</p>
                  <p className="text-xs text-foreground">{data.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground bg-muted/50 rounded-lg p-2">
            <Database className="w-3 h-3 shrink-0" />
            حالت آزمایشی — Supabase متصل نیست
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              <Edit3 className="w-4 h-4 ml-1" />
              ویرایش
            </Button>
            <Button
              className="flex-1"
              onClick={onConfirm}
              disabled={submitting}
            >
              {submitting ? (
                'در حال ارسال...'
              ) : (
                <>
                  <Send className="w-4 h-4 ml-1" />
                  تأیید و ارسال درخواست
                </>
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}