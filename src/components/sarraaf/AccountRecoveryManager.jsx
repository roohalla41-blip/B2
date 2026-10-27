import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Database, RefreshCw, Users, ShieldCheck, AlertTriangle,
  CheckCircle2, XCircle, Loader2, KeyRound, Crown,
} from 'lucide-react';
import { getRecoveryStatus, previewRecovery, migrateUsers, linkCreator } from '@/lib/recoveryRpc';

const ROLE_LABELS = {
  creator: 'سازنده',
  admin: 'مدیر',
  sarraaf: 'صراف',
  exchange: 'صراف',
  employee: 'کارمند',
  customer: 'مشتری',
  unknown: 'نامشخص',
};

const ROLE_COLORS = {
  creator: 'bg-amber-100 text-amber-700',
  admin: 'bg-purple-100 text-purple-700',
  sarraaf: 'bg-blue-100 text-blue-700',
  exchange: 'bg-blue-100 text-blue-700',
  employee: 'bg-cyan-100 text-cyan-700',
  customer: 'bg-green-100 text-green-700',
  unknown: 'bg-gray-100 text-gray-700',
};

const ERROR_MESSAGES = {
  creator_not_found: 'حساب با این ایمیل یافت نشد. ابتدا رکورد کاربر را در دیتابیس ایجاد کنید.',
  wrong_password: 'رمز عبور اشتباه است.',
  missing_fields: 'لطفاً ایمیل و رمز عبور را وارد کنید.',
};

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border p-3 bg-muted/30">
      <div className={`p-1.5 rounded-md ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-[11px] text-muted-foreground leading-tight">{label}</p>
        <p className="text-lg font-bold leading-tight">{value}</p>
      </div>
    </div>
  );
}

export default function AccountRecoveryManager() {
  const [loading, setLoading] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [status, setStatus] = useState(null);
  const [rpcError, setRpcError] = useState(null);
  const [migrationResult, setMigrationResult] = useState(null);

  // Creator linking
  const [creatorEmail, setCreatorEmail] = useState('');
  const [creatorPassword, setCreatorPassword] = useState('');
  const [linkingCreator, setLinkingCreator] = useState(false);
  const [creatorResult, setCreatorResult] = useState(null);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setRpcError(null);
    const res = await getRecoveryStatus();
    if (res.success) {
      setStatus(res.stats);
    } else {
      setStatus(null);
      setRpcError(res.error || 'unknown');
    }
    setLoading(false);
  }, []);

  React.useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const handleMigrate = async (dryRun = false) => {
    setMigrating(true);
    setMigrationResult(null);
    setRpcError(null);
    const res = dryRun ? await previewRecovery() : await migrateUsers();
    if (res.success) {
      setMigrationResult(res);
      if (!dryRun) fetchStatus();
    } else {
      setRpcError(res.error || 'unknown');
    }
    setMigrating(false);
  };

  const handleLinkCreator = async () => {
    if (!creatorEmail || !creatorPassword) return;
    setLinkingCreator(true);
    setCreatorResult(null);
    setRpcError(null);
    const res = await linkCreator(creatorEmail, creatorPassword);
    if (res.success) {
      setCreatorResult(res);
    } else {
      setCreatorResult({ success: false, error: res.error || 'unknown' });
    }
    setLinkingCreator(false);
  };

  return (
    <Card className="border-amber-200/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Database className="w-5 h-5 text-amber-600" />
          بازیابی حساب‌ها و داده‌های قدیمی
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          بازگرداندن همهٔ کاربران قدیمی (صراف، سازنده، مشتری) به اتصال امن، با حفظ رمزهای فعلی.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {rpcError && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">خطای ارتباط با دیتابیس</p>
              <p className="mt-0.5">
                {rpcError === 'function not found' || rpcError?.includes('Could not find')
                  ? 'RPCهای بازیابی هنوز مستقر نشده‌اند. اسکریپت public/supabase-recovery-rpc.sql را در Supabase اجرا کنید.'
                  : rpcError}
              </p>
            </div>
          </div>
        )}

        {/* Status section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">وضعیت اتصال حساب‌ها</h4>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchStatus}
              disabled={loading}
              className="h-7 text-xs gap-1.5"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              بررسی وضعیت
            </Button>
          </div>

          {status && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <StatCard icon={Users} label="کل کاربران" value={status.total} color="bg-blue-50 text-blue-600" />
                <StatCard icon={CheckCircle2} label="رمز هش‌شده" value={status.hashed} color="bg-green-50 text-green-600" />
                <StatCard icon={AlertTriangle} label="رمز متن‌ساده" value={status.plaintext} color="bg-amber-50 text-amber-600" />
                <StatCard icon={Database} label="صرافی‌ها" value={status.exchanges} color="bg-purple-50 text-purple-600" />
              </div>

              {status.by_role && Object.keys(status.by_role).length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">تفکیک بر اساس نقش:</p>
                  {Object.entries(status.by_role).map(([role, counts]) => (
                    <div key={role} className="flex items-center justify-between text-xs">
                      <Badge variant="outline" className={ROLE_COLORS[role] || ROLE_COLORS.unknown}>
                        {ROLE_LABELS[role] || role}
                      </Badge>
                      <span className="text-muted-foreground">
                        کل: {counts.total} | هش‌شده: {counts.hashed} | متن‌ساده: {counts.plaintext}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {!status && !rpcError && !loading && (
            <p className="text-xs text-muted-foreground text-center py-4">
              برای مشاهدهٔ وضعیت، «بررسی وضعیت» را بزنید.
            </p>
          )}
        </div>

        <Separator />

        {/* Migration section */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">بازیابی حساب‌های قدیمی</h4>
          <p className="text-xs text-muted-foreground">
            این عملیات رمزهای متن‌سادهٔ قدیمی را به هش امن (pbkdf2) تبدیل می‌کند. محتوای رمز تغییر نمی‌کند،
            فقط هش می‌شود. عملیات قابل تکرار است و رکوردهای تکراری ایجاد نمی‌کند.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleMigrate(true)}
              disabled={migrating}
              className="h-8 text-xs gap-1.5"
            >
              {migrating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Users className="w-3.5 h-3.5" />}
              پیش‌نمایش (بدون تغییر)
            </Button>
            <Button
              size="sm"
              onClick={() => handleMigrate(false)}
              disabled={migrating}
              className="h-8 text-xs gap-1.5"
            >
              {migrating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
              شروع بازیابی
            </Button>
          </div>

          {migrationResult && (
            <div className="rounded-lg border p-3 text-xs space-y-2">
              {migrationResult.dry_run ? (
                <>
                  <p className="font-semibold">{migrationResult.count} کاربر برای بازیابی یافت شد.</p>
                  {migrationResult.users && migrationResult.users.length > 0 && (
                    <div className="max-h-40 overflow-auto space-y-1">
                      {migrationResult.users.map((u) => (
                        <div key={u.id} className="flex items-center justify-between text-[11px] py-0.5">
                          <span>{u.username || u.email}</span>
                          <Badge variant="outline" className="text-[9px]">
                            {ROLE_LABELS[u.role] || u.role}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                  {migrationResult.count === 0 && (
                    <p className="text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      همهٔ رمزها هش‌شده‌اند؛ نیازی به بازیابی نیست.
                    </p>
                  )}
                </>
              ) : migrationResult.success ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-green-600 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    بازیابی انجام شد
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="font-bold text-green-600">{migrationResult.results?.migrated || 0}</p>
                      <p className="text-[10px] text-muted-foreground">هش شد</p>
                    </div>
                    <div>
                      <p className="font-bold text-blue-600">{migrationResult.results?.already_existed || 0}</p>
                      <p className="text-[10px] text-muted-foreground">از قبل هش‌شده</p>
                    </div>
                    <div>
                      <p className="font-bold text-red-600">{migrationResult.results?.failed || 0}</p>
                      <p className="text-[10px] text-muted-foreground">ناموفق</p>
                    </div>
                  </div>
                  {migrationResult.results?.errors?.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <p className="text-red-600 font-medium">خطاها:</p>
                      {migrationResult.results.errors.slice(0, 10).map((e, i) => (
                        <div key={i} className="text-[10px] text-red-500 flex gap-1">
                          <XCircle className="w-3 h-3 shrink-0" />
                          <span>{e.username || e.user_id}: {e.error}</span>
                        </div>
                      ))}
                      {migrationResult.results.errors.length > 10 && (
                        <p className="text-[10px] text-muted-foreground">
                          و {migrationResult.results.errors.length - 10} خطای دیگر...
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-red-600">{migrationResult.error || 'خطای ناشناخته'}</p>
              )}
            </div>
          )}
        </div>

        <Separator />

        {/* Creator linking section */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-1.5">
            <Crown className="w-4 h-4 text-amber-600" />
            پیوند حساب سازنده
          </h4>
          <p className="text-xs text-muted-foreground">
            حساب سازنده با ایمیل و رمز عبور تأیید می‌شود و دسترسی کامل سازنده دریافت می‌کند.
            رمز عبور در جایی ذخیره یا نمایش داده نمی‌شود.
          </p>
          <div className="space-y-2">
            <div>
              <Label className="text-xs">ایمیل سازنده</Label>
              <Input
                type="email"
                value={creatorEmail}
                onChange={(e) => setCreatorEmail(e.target.value)}
                placeholder="example@gmail.com"
                className="h-8 text-sm"
                dir="ltr"
              />
            </div>
            <div>
              <Label className="text-xs">رمز عبور</Label>
              <Input
                type="password"
                value={creatorPassword}
                onChange={(e) => setCreatorPassword(e.target.value)}
                placeholder="••••••••"
                className="h-8 text-sm"
                dir="ltr"
              />
            </div>
            <Button
              size="sm"
              onClick={handleLinkCreator}
              disabled={linkingCreator || !creatorEmail || !creatorPassword}
              className="h-8 text-xs gap-1.5 w-full"
            >
              {linkingCreator ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
              پیوند حساب سازنده
            </Button>
          </div>

          {creatorResult && (
            <div className="rounded-lg border p-3 text-xs">
              {creatorResult.success ? (
                <div className="flex items-center gap-1.5 text-green-600 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {creatorResult.message === 'creator_created'
                    ? 'حساب سازنده ایجاد و متصل شد.'
                    : 'حساب سازنده با موفقیت متصل شد.'}
                  {creatorResult.email && <span className="text-muted-foreground">({creatorResult.email})</span>}
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-red-600">
                  <XCircle className="w-3.5 h-3.5" />
                  {ERROR_MESSAGES[creatorResult.error] || creatorResult.error || 'خطای ناشناخته'}
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}