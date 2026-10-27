import React, { useState, useCallback } from 'react';
import { Shield, Database, AlertTriangle, CheckCircle, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createSnapshot, compareSnapshots, verifyConnection, getMigrationStatus, previewMigration } from '@/lib/dataSafety';

export default function DataSafetyAudit() {
  const [loading, setLoading] = useState(null);
  const [connStatus, setConnStatus] = useState(null);
  const [snapshot, setSnapshot] = useState(null);
  const [migrationStatus, setMigrationStatus] = useState(null);
  const [migrationPreview, setMigrationPreview] = useState(null);
  const [error, setError] = useState(null);

  const handleCheckConnection = useCallback(async () => {
    setLoading('conn');
    setError(null);
    const res = await verifyConnection();
    setConnStatus(res);
    setLoading(null);
  }, []);

  const handleCreateSnapshot = useCallback(async () => {
    setLoading('snapshot');
    setError(null);
    const res = await createSnapshot();
    if (res.configOk) {
      setSnapshot(res);
    } else {
      setError('خطا در ایجاد تصویر لحظه‌ای');
    }
    setLoading(null);
  }, []);

  const handleMigrationStatus = useCallback(async () => {
    setLoading('migration');
    setError(null);
    const res = await getMigrationStatus();
    setMigrationStatus(res);
    setLoading(null);
  }, []);

  const handlePreviewMigration = useCallback(async () => {
    setLoading('preview');
    setError(null);
    const res = await previewMigration();
    setMigrationPreview(res);
    setLoading(null);
  }, []);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">ایمنی داده و یکپارچگی</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                بررسی سلامت داده‌ها قبل از هر مهاجرت — همهٔ عملیات فقط خواندنی هستند
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Connection Check */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm">۱. بررسی اتصال دیتابیس</h3>
          </div>
          <Button onClick={handleCheckConnection} disabled={loading === 'conn'} size="sm" className="w-full">
            {loading === 'conn' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
            بررسی اتصال
          </Button>
          {connStatus && (
            <div className={`flex items-center gap-2 text-sm ${connStatus.ok ? 'text-success' : 'text-destructive'}`}>
              {connStatus.ok ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              <span>{connStatus.ok ? 'اتصال موفق' : connStatus.error || 'خطای اتصال'}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Snapshot */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm">۲. تصویر لحظه‌ای داده‌ها (فقط خواندنی)</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            تعداد رکوردها و جمع‌های مالی را بدون تغییر داده ثبت می‌کند. قبل از مهاجرت انجام دهید.
          </p>
          <Button onClick={handleCreateSnapshot} disabled={loading === 'snapshot'} size="sm" className="w-full">
            {loading === 'snapshot' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            ایجاد تصویر لحظه‌ای
          </Button>
          {snapshot && (
            <div className="space-y-2 mt-2">
              <div className="text-xs text-muted-foreground">
                زمان: {new Date(snapshot.timestamp).toLocaleString('fa-IR')}
              </div>
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-right p-2">جدول</th>
                      <th className="text-right p-2">تعداد رکوردها</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshot.tables.map((t, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2 font-mono">{t.table}</td>
                        <td className="p-2">
                          {t.count !== null ? (
                            <span className={t.error ? 'text-destructive' : ''}>{t.count.toLocaleString('fa-IR')}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                          {t.error && <span className="text-destructive text-[10px] block">{t.error}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {snapshot.financialTotals && (
                <div className="rounded-lg bg-muted/50 p-2 text-xs space-y-1">
                  <div className="font-medium">جمع‌های مالی:</div>
                  <div>اسناد: {snapshot.financialTotals.documents?.total?.toLocaleString('fa-IR') || '—'}</div>
                  <div>کیف پول‌ها: {snapshot.financialTotals.wallets?.total?.toLocaleString('fa-IR') || '—'}</div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Migration Status */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warning" />
            <h3 className="font-semibold text-sm">۳. وضعیت مهاجرت کاربران قدیمی</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            بررسی تعداد کاربرانی که هنوز نیاز به مهاجرت رمز دارند.
          </p>
          <div className="flex gap-2">
            <Button onClick={handleMigrationStatus} disabled={loading === 'migration'} size="sm" variant="outline">
              {loading === 'migration' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
              وضعیت
            </Button>
            <Button onClick={handlePreviewMigration} disabled={loading === 'preview'} size="sm" variant="outline">
              {loading === 'preview' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              پیش‌نمایش (Dry-Run)
            </Button>
          </div>
          {migrationStatus && (
            <div className={`text-sm ${migrationStatus.ok ? 'text-foreground' : 'text-destructive'}`}>
              {migrationStatus.ok ? JSON.stringify(migrationStatus.status, null, 2) : migrationStatus.error}
            </div>
          )}
          {migrationPreview && (
            <div className={`text-sm ${migrationPreview.ok ? 'text-foreground' : 'text-destructive'}`}>
              {migrationPreview.ok ? JSON.stringify(migrationPreview.preview, null, 2) : migrationPreview.error}
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="rounded-lg bg-warning/10 border border-warning/30 p-3 text-xs text-warning-foreground/90">
        <strong>تذکر مهم:</strong> هیچ‌یک از این عملیات داده‌ها را تغییر نمی‌دهند. برای مهاجرت واقعی، ابتدا از دیتابیس
        پشتیبان بگیرید و تصویر لحظه‌ای قبل و بعد را مقایسه کنید.
      </div>
    </div>
  );
}