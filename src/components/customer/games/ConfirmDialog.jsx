import React from 'react';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit3, Send, Database } from 'lucide-react';

const WALLET_LABELS = {
  AFN: 'افغانی (AFN)',
  USD: 'دلار (USD)',
  IRT: 'تومان (IRT)',
  USDT: 'تتر (USDT)',
};

export default function ConfirmDialog({
  open, onOpenChange, data, onConfirm, submitting,
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
                <span className="text-muted-foreground">نام بازی/خدمت:</span>
                <span className="font-medium text-foreground">{data.service_name}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">نوع محصول:</span>
                <span className="font-medium text-foreground">{data.product_type}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">بسته/مقدار:</span>
                <span className="font-medium text-foreground">{data.package_name}</span>
              </div>
              {data.account_info && Object.keys(data.account_info).length > 0 && (
                <div className="pt-2 border-t border-border">
                  <p className="text-[10px] text-muted-foreground mb-1">اطلاعات حساب بازی:</p>
                  {Object.entries(data.account_info).map(([key, val]) => (
                    <div key={key} className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">{key}:</span>
                      <span className="text-foreground text-[10px]" dir="ltr">{val}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-between text-xs pt-2 border-t border-border">
                <span className="text-muted-foreground">کیف پول پرداخت:</span>
                <span className="font-medium text-foreground">{WALLET_LABELS[data.wallet_currency] || data.wallet_currency}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">مبلغ:</span>
                <span className="font-bold text-primary">{(data.amount || 0).toLocaleString('fa-IR')} {data.wallet_currency}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">تاریخ و ساعت:</span>
                <span className="text-foreground text-[10px]">
                  {new Date().toLocaleDateString('fa-IR')} • {new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
                </span>
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
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={submitting}>
              <Edit3 className="w-4 h-4 ml-1" />
              ویرایش
            </Button>
            <Button className="flex-1" onClick={onConfirm} disabled={submitting}>
              {submitting ? 'در حال ارسال...' : (<><Send className="w-4 h-4 ml-1" />تأیید و ارسال درخواست</>)}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}