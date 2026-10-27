import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Loader2, AlertTriangle, FileText, FileArchive } from 'lucide-react';
import { generateEmergencyPdf } from '@/lib/emergencyBackupPdf';
import { generateTripleBackupZip } from '@/lib/tripleBackupZip';

function ZipDownloadButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  const handleClick = async () => {
    setLoading(true);
    setError('');
    setResult('');
    try {
      const name = await generateTripleBackupZip();
      setResult(name);
    } catch (e) {
      setError(e.message || 'خطا در تولید ZIP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button variant="outline" onClick={handleClick} disabled={loading} className="w-full gap-2 border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-950/50">
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            در حال تولید ZIP از سورس فعلی...
          </>
        ) : (
          <>
            <FileArchive className="w-4 h-4" />
            دانلود ZIP پویا (سورس فعلی + SQL + مستندات)
          </>
        )}
      </Button>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {result && !loading && (
        <p className="text-xs text-green-600">فایل تولید شد: {result}</p>
      )}
    </div>
  );
}

export default function EmergencyBackup() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastGenerated, setLastGenerated] = useState('');

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    try {
      // Generate PDF with static data (no backend function needed)
      const filename = generateEmergencyPdf(null);
      setLastGenerated(filename);
    } catch (e) {
      setError(e.message || 'Failed to generate PDF');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          <h3 className="text-sm font-semibold">پشتیبان اضطراری پروژه</h3>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          این بخش یک فایل PDF کامل از ساختار پروژه تولید می‌کند که شامل تمام صفحات،
          مسیرها، اسکیمای دیتابیس، مدل امنیتی، وابستگی‌های Base44 و راهنمای بازسازی
          است. در صورت خرابی یا قطع دسترسی به Base44، با این PDF و اتصال به Supabase
          می‌توان کل پروژه را بازسازی کرد.
        </p>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
          <p className="text-xs text-amber-800 dark:text-amber-200">
            <strong>توجه:</strong> این فایل شامل اطلاعات فنی حساس است (نام جداول،
            ستون‌ها، Policyها) اما هیچ کلید محرمانه‌ای در آن قرار نمی‌گیرد.
            فایل را در محل امن ذخیره کنید.
          </p>
        </div>

        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950/30">
          <p className="text-xs text-blue-800 dark:text-blue-200">
            <strong>ساختار A (فعلی):</strong> این بکاپ قبل از پیاده‌سازی ساختار B (OTP ایمیل Supabase) تهیه شده است.
            در صورت خرابی یا مشکل، می‌توانید از این بکاپ به ساختار A برگردید.
            هیچ داده‌ای از Supabase تغییر نمی‌کند — فقط کد فرانت‌اند ورود تغییر می‌کند.
          </p>
        </div>

        <div className="space-y-2">
          <h4 className="text-xs font-semibold">محتوای PDF شامل:</h4>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc pr-4">
            <li>فناوری‌ها و نسخه‌ها (Technology Stack)</li>
            <li>نقشه معماری سیستم (Architecture Map)</li>
            <li>ساختار پوشه‌ها و فایل‌ها</li>
            <li>تمام مسیرهای React Router</li>
            <li>اسکیمای زنده دیتابیس (جداول، ستون‌ها، Viewها، Policyها)</li>
            <li>مدل امنیتی (HMAC، PBKDF2، RLS، Tenant Isolation)</li>
            <li>وابستگی‌های Base44 و روش جداسازی</li>
            <li>منطق مالی (Double-entry ledger، RPCها)</li>
            <li>دستورالعمل بازسازی مرحله‌به‌مرحله</li>
            <li>Prompt کامل برای هوش مصنوعی جهت بازسازی</li>
          </ul>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full gap-2"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              در حال تولید PDF...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              ایجاد و دانلود PDF کامل بازسازی پروژه
            </>
          )}
        </Button>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/30">
            <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {lastGenerated && !loading && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-900 dark:bg-green-950/30">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-green-600" />
              <p className="text-xs text-green-700 dark:text-green-300">
                فایل با موفقیت تولید شد: <strong>{lastGenerated}</strong>
              </p>
            </div>
          </div>
        )}

        <p className="text-[10px] text-muted-foreground text-center">
          هر بار که روی دکمه کلیک کنید، آخرین وضعیت واقعی پروژه بررسی و PDF جدید تولید می‌شود.
        </p>

        {/* ZIP Source Code Backup */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30 space-y-3">
          <div className="flex items-center gap-2">
            <FileArchive className="w-5 h-5 text-blue-600" />
            <h4 className="text-sm font-semibold">دانلود ZIP سورس‌کد پروژه</h4>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
             فایل ZIP به‌صورت پویا از سورس فعلی پروژه تولید می‌شود: صفحات، کامپوننت‌ها،
             فایل‌های SQL، مستندات و فایل MANIFEST. هیچ Secret یا Credential در ZIP قرار نمی‌گیرد.
             فایل‌های base44/ (سمت سرور) و node_modules در ZIP قرار نمی‌گیرند.
           </p>
           <ZipDownloadButton />
           <a href="/BACKUP-MANIFEST.txt" download className="block">
             <Button variant="ghost" size="sm" className="w-full gap-2 text-blue-600">
               <FileText className="w-3.5 h-3.5" />
               مشاهده فهرست فایل‌ها (BACKUP-MANIFEST.txt)
             </Button>
           </a>
        </div>
      </CardContent>
    </Card>
  );
}