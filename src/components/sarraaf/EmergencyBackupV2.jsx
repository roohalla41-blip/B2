import React, { useState } from 'react';
import { Download, FileText, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { generateEmergencyBackupPdfV2 } from '@/lib/emergencyBackupPdfV2';

export default function EmergencyBackupV2() {
  const [generating, setGenerating] = useState(false);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');
    setFileName('');
    try {
      // Small delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 100));
      const name = generateEmergencyBackupPdfV2();
      setFileName(name);
    } catch (e) {
      setError(e.message || 'خطا در تولید PDF');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-2">
          <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
        </div>
        <h2 className="text-2xl font-bold">پشتیبان اضطراری — نسخه ۰۱ (ساختار A)</h2>
        <p className="text-muted-foreground text-sm">
          Snapshot کامل از وضعیت فعلی پروژه «حساب صراف» — نقطه بازگشت قبل از پیاده‌سازی ساختار B
        </p>
      </div>

      {/* Status Alert */}
      <Alert variant="default" className="border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
        <Clock className="w-4 h-4 text-amber-600" />
        <AlertTitle className="text-amber-700 dark:text-amber-400">پروژه در حال توسعه</AlertTitle>
        <AlertDescription className="text-amber-700 dark:text-amber-300 text-sm">
          این پروژه هنوز کامل و نهایی نشده است. این سند فقط Snapshot اضطراری از وضعیت فعلی است.
          هر زمان بخش‌های جدیدی به پروژه اضافه شد، باید نسخه جدیدی از این سند تولید شود.
        </AlertDescription>
      </Alert>

      {/* PDF Contents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="w-5 h-5" />
            محتوای PDF (۲۸ بخش)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div>۱. مشخصات و نسخه پروژه</div>
            <div>۲. تاریخ و ساعت تولید</div>
            <div>۳. وضعیت فعلی و میزان تکمیل</div>
            <div>۴. پشته فناوری و وابستگی‌ها</div>
            <div>۵. معماری سیستم</div>
            <div>۶. ساختار پوشه‌ها</div>
            <div>۷. مسیرهای React Router</div>
            <div>۸. وضعیت Backend</div>
            <div>۹. وضعیت API Layer</div>
            <div>۱۰. ساختار Supabase</div>
            <div>۱۱. Entity Schemaها</div>
            <div>۱۲. Double-entry Ledger</div>
            <div>۱۳. مدل امنیتی</div>
            <div>۱۴. وضعیت پنل Creator</div>
            <div>۱۵. وضعیت پنل Customer</div>
            <div>۱۶. وضعیت سیستم چت</div>
            <div>۱۷. وضعیت i18n</div>
            <div>۱۸. وابستگی‌های Base44</div>
            <div>۱۹. تمام تناقض‌ها (۱۰ مورد)</div>
            <div>۲۰. فایل‌های کامل</div>
            <div>۲۱. فایل‌های ناقص (خلاصه)</div>
            <div>۲۲. فایل‌های مشاهده‌نشده</div>
            <div>۲۳. موارد حیاتی مفقود</div>
            <div>۲۴. موارد Backup داده‌ها</div>
            <div>۲۵. تفاوت بازسازی و بازیابی</div>
            <div>۲۶. موارد پیش از Migration</div>
            <div>۲۷. دستورالعمل استفاده</div>
            <div>۲۸. Prompt بازسازی اضطراری</div>
          </div>
        </CardContent>
      </Card>

      {/* Key Warnings */}
      <Card className="border-red-200 dark:border-red-900">
        <CardContent className="pt-6 space-y-3">
          <div className="flex items-start gap-2 text-sm">
            <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
            <span>این PDF فقط مستندات و ساختار پروژه است و جایگزین Backup واقعی دیتابیس، Supabase Auth، Storage و داده‌های کاربران نیست.</span>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
            <span>۱۰ تناقض شناسایی‌شده در PDF ثبت شده‌اند و هیچ‌کدام حل یا انتخاب نشده‌اند.</span>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
            <span>فایل‌های ناقص و مشاهده‌نشده با وضعیت «ناقص/مفقود» ثبت شده‌اند.</span>
          </div>
        </CardContent>
      </Card>

      {/* Generate Button */}
      <div className="flex flex-col items-center gap-4">
        <Button
          onClick={handleGenerate}
          disabled={generating}
          size="lg"
          className="w-full sm:w-auto min-w-[280px]"
        >
          {generating ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              در حال تولید PDF...
            </>
          ) : (
            <>
              <Download className="w-5 h-5" />
              ایجاد و دانلود PDF اضطراری
            </>
          )}
        </Button>

        {error && (
          <Alert variant="destructive" className="w-full">
            <AlertTriangle className="w-4 h-4" />
            <AlertTitle>خطا</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {fileName && (
          <Alert className="w-full border-green-300 bg-green-50 dark:bg-green-950/30 dark:border-green-800">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <AlertTitle className="text-green-700 dark:text-green-400">PDF با موفقیت تولید شد</AlertTitle>
            <AlertDescription className="text-green-700 dark:text-green-300">
              فایل <strong>{fileName}</strong> دانلود شد.
              <br />
              <span className="text-xs">اگر دانلود خودکار نشد، فایل را از پنجره دانلود مرورگر بررسی کنید.</span>
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Info */}
      <p className="text-center text-xs text-muted-foreground">
        نام فایل: sarraaf-emergency-backup-v01-YYYY-MM-DD-HHMM.pdf
        <br />
        این سند شامل ۲۸ بخش کامل از وضعیت فعلی پروژه است.
      </p>
    </div>
  );
}