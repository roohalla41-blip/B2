import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle2, XCircle, Database, UserPlus, AlertCircle, ExternalLink } from 'lucide-react';
import { callSupabase } from '@/lib/supabaseApi';

const IDLE = 'idle';
const LOADING = 'loading';
const SUCCESS = 'success';
const ERROR = 'error';

export default function SetupDatabase() {
  const [connStatus, setConnStatus] = useState(IDLE);
  const [connMsg, setConnMsg] = useState('');
  const [adminStatus, setAdminStatus] = useState(IDLE);
  const [adminMsg, setAdminMsg] = useState('');

  const testConnection = async () => {
    setConnStatus(LOADING);
    setConnMsg('');
    try {
      const res = await callSupabase('test');
      if (res?.connected) {
        setConnStatus(SUCCESS);
        setConnMsg('اتصال موفق — دیتابیس در دسترس است');
      } else {
        setConnStatus(ERROR);
        setConnMsg(res?.error || 'خطای اتصال');
      }
    } catch (e) {
      setConnStatus(ERROR);
      setConnMsg(e.message || 'خطای ناشناخته');
    }
  };

  const bootstrapAdmin = async () => {
    setAdminStatus(LOADING);
    setAdminMsg('');
    try {
      const res = await callSupabase('bootstrapAdmin');
      if (res?.success) {
        setAdminStatus(SUCCESS);
        setAdminMsg(res.message || 'حساب سازنده ایجاد شد');
      } else {
        setAdminStatus(ERROR);
        setAdminMsg(res?.error || 'خطا در ایجاد حساب');
      }
    } catch (e) {
      setAdminStatus(ERROR);
      setAdminMsg(e.message || 'خطای ناشناخته');
    }
  };

  const StatusIcon = ({ status }) => {
    if (status === LOADING) return <Loader2 className="w-4 h-4 animate-spin" />;
    if (status === SUCCESS) return <CheckCircle2 className="w-4 h-4 text-success" />;
    if (status === ERROR) return <XCircle className="w-4 h-4 text-destructive" />;
    return null;
  };

  return (
    <div className="min-h-screen bg-background p-4" dir="rtl">
      <div className="max-w-2xl mx-auto space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Database className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">راه‌اندازی دیتابیس</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">مراحل زیر را به ترتیب انجام دهید</p>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Step 1: SQL Schema */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold">۱</span>
              <h3 className="font-semibold">اجرای اسکریپت SQL در Supabase</h3>
            </div>
            <div className="space-y-2 rounded-lg bg-muted p-3 text-sm">
              <p className="font-medium">مراحل:</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>وارد <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-primary underline inline-flex items-center gap-0.5">Supabase Dashboard <ExternalLink className="w-3 h-3" /></a> شوید</li>
                <li>به بخش <strong>SQL Editor → New Query</strong> بروید</li>
                <li>محتوای فایل <code className="bg-background px-1 rounded">base44/shared/supabase_schema.sql</code> را کپی کنید</li>
                <li>دکمه <strong>Run</strong> را بزنید</li>
              </ol>
            </div>
            <div className="flex items-start gap-2 rounded-lg bg-info/10 p-3 text-xs text-info">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p>این اسکریپت غیرمخرب است (CREATE TABLE IF NOT EXISTS) و می‌توانید چند بار اجرا کنید. هیچ داده‌ای حذف نمی‌شود.</p>
            </div>
          </CardContent>
        </Card>

        {/* Step 2: Test Connection */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold">۲</span>
              <h3 className="font-semibold">تست اتصال به دیتابیس</h3>
            </div>
            <p className="text-sm text-muted-foreground">بررسی می‌کند که جداول ساخته شده‌اند و Supabase در دسترس است.</p>
            <Button
              onClick={testConnection}
              disabled={connStatus === LOADING}
              className="w-full"
              variant={connStatus === SUCCESS ? 'outline' : 'default'}
            >
              {connStatus === LOADING ? <Loader2 className="w-4 h-4 animate-spin" /> :
               connStatus === SUCCESS ? <CheckCircle2 className="w-4 h-4 text-success" /> :
               connStatus === ERROR ? <XCircle className="w-4 h-4 text-destructive" /> :
               <Database className="w-4 h-4" />}
              تست اتصال
            </Button>
            {connMsg && (
              <p className={`text-sm ${connStatus === SUCCESS ? 'text-success' : 'text-destructive'}`}>{connMsg}</p>
            )}
          </CardContent>
        </Card>

        {/* Step 3: Bootstrap Admin */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold">۳</span>
              <h3 className="font-semibold">ایجاد حساب سازنده</h3>
            </div>
            <p className="text-sm text-muted-foreground">حساب سازنده با نام کاربری creator و رمز admin123 ایجاد می‌شود.</p>
            <Button
              onClick={bootstrapAdmin}
              disabled={adminStatus === LOADING || connStatus !== SUCCESS}
              className="w-full"
              variant={adminStatus === SUCCESS ? 'outline' : 'default'}
            >
              {adminStatus === LOADING ? <Loader2 className="w-4 h-4 animate-spin" /> :
               adminStatus === SUCCESS ? <CheckCircle2 className="w-4 h-4 text-success" /> :
               adminStatus === ERROR ? <XCircle className="w-4 h-4 text-destructive" /> :
               <UserPlus className="w-4 h-4" />}
              ایجاد حساب سازنده
            </Button>
            {adminMsg && (
              <p className={`text-sm ${adminStatus === SUCCESS ? 'text-success' : 'text-destructive'}`}>{adminMsg}</p>
            )}
            {connStatus !== SUCCESS && (
              <p className="text-xs text-muted-foreground">ابتدا تست اتصال را با موفقیت انجام دهید.</p>
            )}
          </CardContent>
        </Card>

        {/* Summary */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm">
              {connStatus === SUCCESS && adminStatus === SUCCESS ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-success" />
                  <span className="text-success font-medium">راه‌اندازی کامل شد! می‌توانید وارد شوید.</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5 text-muted-foreground" />
                  <span className="text-muted-foreground">مراحل بالا را به ترتیب تکمیل کنید.</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}