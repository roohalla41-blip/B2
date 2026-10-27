import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Database, Copy, Check, FileText, Download, Play, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { callSupabase } from '@/lib/supabaseApi';

const FEATURE_SETTINGS_SQL = `-- ============================================================
-- feature_settings — Missing columns (enables feature toggle from Builder Panel)
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- Idempotent — safe to run multiple times
-- ============================================================
ALTER TABLE feature_settings ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE feature_settings ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE feature_settings ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT FALSE;
ALTER TABLE feature_settings ADD COLUMN IF NOT EXISTS free_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE feature_settings ADD COLUMN IF NOT EXISTS paid_enabled BOOLEAN DEFAULT TRUE;`;

const FULL_MIGRATION_URL = '/supabase-missing-columns.sql';

export default function SqlMigrationHelper() {
  const [copied, setCopied] = useState(false);
  const [runStatus, setRunStatus] = useState('idle'); // idle | loading | success | error
  const [runMsg, setRunMsg] = useState('');

  const copyFeatureSql = async () => {
    try {
      await navigator.clipboard.writeText(FEATURE_SETTINGS_SQL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const downloadFullSql = () => {
    const link = document.createElement('a');
    link.href = FULL_MIGRATION_URL;
    link.download = 'supabase-missing-columns.sql';
    link.click();
  };

  const runMigration = async () => {
    setRunStatus('loading');
    setRunMsg('');
    try {
      const result = await callSupabase('runMigration');
      if (result.success) {
        setRunStatus('success');
        setRunMsg(`${result.success_count || 0} دستور با موفقیت اجرا شد${result.error_count > 0 ? ` (${result.error_count} خطا)` : ''}`);
      } else {
        setRunStatus('error');
        setRunMsg(result.error || 'خطای ناشناخته');
      }
    } catch (err) {
      setRunStatus('error');
      setRunMsg(err.message || 'خطا در اجرای migration');
    }
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-primary" />
          <h4 className="text-sm font-bold">اسکریپت مهاجرت دیتابیس</h4>
        </div>
        <p className="text-xs text-muted-foreground">
          برای فعال‌سازی قابلیت روشن/خاموش کردن بخش‌ها از پنل سازنده، اسکریپت زیر را در
          Supabase SQL Editor اجرا کنید.
        </p>

        {/* Run Migration Button */}
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Play className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium">اجرای خودکار Migration</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            ستون‌های مفقودی (paid_end_date، plan، quota و...) به صورت خودکار به جداول اضافه می‌شود.
          </p>
          <Button
            size="sm"
            onClick={runMigration}
            disabled={runStatus === 'loading'}
            className="w-full"
          >
            {runStatus === 'loading' ? <Loader2 className="w-3 h-3 animate-spin" /> :
             runStatus === 'success' ? <CheckCircle2 className="w-3 h-3" /> :
             runStatus === 'error' ? <AlertCircle className="w-3 h-3" /> :
             <Play className="w-3 h-3" />}
            {runStatus === 'loading' ? 'در حال اجرا...' : 'اجرای Migration'}
          </Button>
          {runMsg && (
            <p className={`text-[11px] ${runStatus === 'success' ? 'text-success' : 'text-destructive'}`}>
              {runMsg}
            </p>
          )}
        </div>

        <div className="relative">
          <pre className="text-[10px] bg-muted rounded-lg p-3 overflow-x-auto max-h-48 scrollbar-thin" dir="ltr">
{FEATURE_SETTINGS_SQL}
          </pre>
          <Button
            size="sm"
            variant="secondary"
            onClick={copyFeatureSql}
            className="absolute top-2 left-2 h-7 px-2 text-xs gap-1"
          >
            {copied ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
            {copied ? 'کپی شد' : 'کپی'}
          </Button>
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">اسکریپت کامل مهاجرت (۲۸ جدول)</span>
          </div>
          <Button size="sm" variant="outline" onClick={downloadFullSql} className="h-7 text-xs gap-1">
            <Download className="w-3 h-3" />
            دانلود
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}