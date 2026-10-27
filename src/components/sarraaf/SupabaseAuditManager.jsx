import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Database, ShieldCheck, Lock, KeyRound, Copy, ClipboardPaste,
  Loader2, AlertTriangle, CheckCircle2, XCircle, Clock, Trash2, Eye, FileWarning
} from 'lucide-react';
import { AUDIT_QUERIES, validateReport } from '@/lib/supabaseAuditQueries';
import { createSupabaseEntity } from '@/lib/supabaseApi';
import { useToast } from '@/components/ui/use-toast';

const TYPE_ICONS = {
  schema: Database,
  constraints: KeyRound,
  rls_status: ShieldCheck,
  policies: Lock,
  role_grants: KeyRound,
  table_counts: Database,
  functions: Database,
};

const SEVERITY_STYLES = {
  info: 'bg-blue-50 text-blue-700 border-blue-200',
  low: 'bg-slate-50 text-slate-700 border-slate-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  high: 'bg-orange-50 text-orange-700 border-orange-200',
  critical: 'bg-red-50 text-red-700 border-red-200',
};

const SEVERITY_LABELS = {
  info: 'اطلاع',
  low: 'کم',
  medium: 'متوسط',
  high: 'زیاد',
  critical: 'بحرانی',
};

export default function SupabaseAuditManager() {
  const { toast } = useToast();
  const [activeType, setActiveType] = useState('schema');
  const [pasteText, setPasteText] = useState('');
  const [saving, setSaving] = useState(false);
  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);

  const queryDef = useMemo(() => AUDIT_QUERIES[activeType], [activeType]);

  const loadReports = async () => {
    setLoadingReports(true);
    try {
      const sb = createSupabaseEntity('SupabaseAuditReport');
      const data = await sb.list('-created_at', 50);
      setReports(Array.isArray(data) ? data : []);
    } catch (err) {
      toast({ title: 'خطا در بارگذاری گزارش‌ها', description: err.message, variant: 'destructive' });
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => { loadReports(); /* eslint-disable-next-line */ }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(queryDef.sql);
      toast({ title: 'دستور کپی شد', description: 'آن را در SQL Editor سوپابیس اجرا کنید.' });
    } catch {
      toast({ title: 'کپی ناموفق', description: 'لطفاً دستور را دستی انتخاب و کپی کنید.', variant: 'destructive' });
    }
  };

  const handleImport = async () => {
    let parsed;
    try {
      parsed = JSON.parse(pasteText);
    } catch {
      toast({ title: 'فرمت نامعتبر', description: 'خروجی باید JSON معتبر باشد.', variant: 'destructive' });
      return;
    }
    const rows = Array.isArray(parsed) ? parsed : (parsed?.rows || parsed?.data);
    if (!Array.isArray(rows)) {
      toast({ title: 'فرمت نامعتبر', description: 'خروجی باید آرایه‌ای از ردیف‌ها باشد.', variant: 'destructive' });
      return;
    }
    const result = validateReport(activeType, rows);
    if (!result.valid) {
      toast({ title: 'گزارش رد شد', description: result.reason, variant: 'destructive' });
      // ذخیره به‌عنوان ردشده برای ثبت وقوع
      try {
        const sb = createSupabaseEntity('SupabaseAuditReport');
        await sb.create({
          report_type: activeType,
          summary: 'گزارش رد شد',
          raw_metadata: { row_count: rows.length },
          status: 'rejected',
          rejection_reason: result.reason,
        });
        loadReports();
      } catch (e) { /* ignore */ }
      return;
    }
    setSaving(true);
    try {
      const sb = createSupabaseEntity('SupabaseAuditReport');
      const summary = `بررسی ${queryDef.label} — ${rows.length} ردیف، ${result.findings.length} مورد شناسایی‌شده`;
      await sb.create({
        report_type: activeType,
        executed_at: new Date().toISOString(),
        summary,
        findings: result.findings,
        raw_metadata: { row_count: rows.length, sample_keys: rows[0] ? Object.keys(rows[0]) : [] },
        status: 'valid',
      });
      toast({ title: 'گزارش ذخیره شد', description: summary });
      setPasteText('');
      loadReports();
    } catch (err) {
      toast({ title: 'خطا در ذخیره', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const sb = createSupabaseEntity('SupabaseAuditReport');
      await sb.delete(id);
      toast({ title: 'گزارش حذف شد' });
      loadReports();
    } catch (err) {
      toast({ title: 'خطا', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start gap-2">
            <ShieldCheck className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold">بررسی امن سوپابیس</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                دستورهای فقط‌خواندنی را در SQL Editor سوپابیس اجرا کنید، سپس خروجی JSON را اینجا وارد کنید.
                هیچ کلید محرمانه‌ای در مرورگر قرار نمی‌گیرد و هیچ دادهٔ واقعی/PII ذخیره نمی‌شود.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-md bg-amber-50 border border-amber-200 p-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="text-xs text-amber-700">
              فقط فرادادهٔ ساختاری وارد کنید. خروجی حاوی رمز، توکن، ایمیل یا شماره رد می‌شود.
            </span>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeType} onValueChange={setActiveType}>
        <TabsList className="flex overflow-x-auto scrollbar-thin w-full gap-0.5">
          {Object.entries(AUDIT_QUERIES).map(([key, def]) => {
            const Icon = TYPE_ICONS[key] || Database;
            return (
              <TabsTrigger key={key} value={key} className="flex flex-col items-center gap-0.5 py-2 shrink-0 min-w-[72px]">
                <Icon className="w-4 h-4" />
                <span className="text-[9px]">{def.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {Object.entries(AUDIT_QUERIES).map(([key, def]) => (
          <TabsContent key={key} value={key}>
            <Card>
              <CardContent className="p-4 space-y-3">
                <div>
                  <h4 className="text-sm font-semibold">{def.label}</h4>
                  <p className="text-xs text-muted-foreground">{def.description}</p>
                </div>
                <div className="relative">
                  <pre dir="ltr" className="text-[10px] leading-relaxed bg-slate-900 text-slate-100 rounded-lg p-3 overflow-x-auto max-h-64 scrollbar-thin font-mono">
                    {def.sql}
                  </pre>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="absolute top-2 left-2 h-7 gap-1"
                    onClick={handleCopy}
                  >
                    <Copy className="w-3.5 h-3.5" />
                    کپی
                  </Button>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium flex items-center gap-1.5">
                    <ClipboardPaste className="w-3.5 h-3.5" />
                    چسباندن خروجی JSON
                  </label>
                  <textarea
                    dir="ltr"
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    placeholder='[{"table_name": "...", "column_name": "..."}]'
                    className="w-full h-32 text-[11px] font-mono rounded-md border border-input bg-transparent p-2 resize-y focus-visible:ring-1 focus-visible:ring-ring"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleImport} disabled={saving || !pasteText.trim()} className="gap-1.5">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      بررسی و ذخیره گزارش
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              گزارش‌های ذخیره‌شده
            </h4>
            <Button size="sm" variant="ghost" onClick={loadReports} disabled={loadingReports} className="h-7 gap-1">
              {loadingReports ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
              به‌روزرسانی
            </Button>
          </div>
          {reports.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">هنوز گزارشی ثبت نشده است.</p>
          ) : (
            <div className="space-y-2">
              {reports.map((r) => (
                <div key={r.id} className="rounded-lg border p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-medium">{AUDIT_QUERIES[r.report_type]?.label || r.report_type}</span>
                        {r.status === 'valid' ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 flex items-center gap-0.5">
                            <CheckCircle2 className="w-3 h-3" /> معتبر
                          </span>
                        ) : r.status === 'rejected' ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 flex items-center gap-0.5">
                            <XCircle className="w-3 h-3" /> رد شده
                          </span>
                        ) : null}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{r.summary}</p>
                      <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                        {r.created_at ? new Date(r.created_at).toLocaleString('fa-IR') : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setSelectedReport(r)}>
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDelete(r.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedReport && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold flex items-center gap-1.5">
                <FileWarning className="w-4 h-4" />
                جزئیات گزارش
              </h4>
              <Button size="sm" variant="ghost" className="h-7" onClick={() => setSelectedReport(null)}>بستن</Button>
            </div>
            <p className="text-xs text-muted-foreground">{selectedReport.summary}</p>
            {selectedReport.rejection_reason && (
              <div className="rounded-md bg-red-50 border border-red-200 p-2 text-xs text-red-700">
                {selectedReport.rejection_reason}
              </div>
            )}
            {selectedReport.findings && selectedReport.findings.length > 0 ? (
              <div className="space-y-2">
                {selectedReport.findings.map((f, i) => (
                  <div key={i} className={`rounded-md border p-2 ${SEVERITY_STYLES[f.severity] || ''}`}>
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span className="text-xs font-medium">{f.object || '—'}</span>
                      <span className="text-[10px] px-1 py-0.5 rounded-full bg-white/60">
                        {SEVERITY_LABELS[f.severity] || f.severity}
                      </span>
                    </div>
                    <p className="text-[11px] mt-1">{f.detail}</p>
                    {f.recommendation && <p className="text-[11px] mt-0.5 opacity-80">پیشنهاد: {f.recommendation}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">مورد پرخطری شناسایی نشد.</p>
            )}
            {selectedReport.raw_metadata && (
              <details className="text-[10px]">
                <summary className="cursor-pointer text-muted-foreground">فرادادهٔ خام</summary>
                <pre dir="ltr" className="mt-1 bg-slate-900 text-slate-100 rounded p-2 overflow-x-auto font-mono">
                  {JSON.stringify(selectedReport.raw_metadata, null, 2)}
                </pre>
              </details>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}