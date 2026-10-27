import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useFeatures, useToggleFeature } from '@/lib/useSarraaf';
import { FEATURE_CATALOG, CRITICAL_FEATURES } from '@/lib/features';
import { PageHeader } from '@/components/sarraaf/Pieces';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Shield, Users, CreditCard, Lock, Bell, MessageSquare,
  Server, Wallet, Crown, Upload, LogOut, Download, AlertTriangle, UserCog, Clock, Eye, Mail, Smartphone, Gamepad2, Zap, Globe, Store, FlaskConical, Database, Bot
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ChatManagement from '@/components/sarraaf/ChatManagement';
import UserManagement from '@/components/sarraaf/UserManagement';
import NotificationManager from '@/components/sarraaf/NotificationManager';
import PlanFeatureManager from '@/components/sarraaf/PlanFeatureManager';
import PaidSystemToggle from '@/components/sarraaf/PaidSystemToggle';
import PlanPricingManager from '@/components/sarraaf/PlanPricingManager';
import PermissionManager from '@/components/sarraaf/PermissionManager';
import PaymentMethodsManager from '@/components/sarraaf/PaymentMethodsManager';
import SystemOverview from '@/components/sarraaf/SystemOverview';
import OrphanCustomerManager from '@/components/sarraaf/OrphanCustomerManager';
import SqlMigrationHelper from '@/components/sarraaf/SqlMigrationHelper';
import VersionManager from '@/components/sarraaf/VersionManager';
import ContactSettingsManager from '@/components/sarraaf/ContactSettingsManager';
import AppIconDownloader from '@/components/sarraaf/AppIconDownloader';
import EmergencyBackup from '@/components/sarraaf/EmergencyBackup';
import EmergencyBackupV2 from '@/components/sarraaf/EmergencyBackupV2';
import TripleBackup from '@/components/sarraaf/TripleBackup';
import KeepaliveStatus from '@/components/sarraaf/KeepaliveStatus';
import WithdrawalManagement from '@/components/sarraaf/WithdrawalManagement';
import CoCreatorManager from '@/components/sarraaf/CoCreatorManager';
import ManualVerificationManager from '@/components/sarraaf/ManualVerificationManager';
import LegacyDataMigrator from '@/components/sarraaf/LegacyDataMigrator';
import AccountRecoveryManager from '@/components/sarraaf/AccountRecoveryManager';
import TrialManager from '@/components/sarraaf/TrialManager';
import MobileLayoutPreview from '@/components/sarraaf/MobileLayoutPreview';
import { lazy } from 'react';
const Assistant = lazy(() => import('@/pages/Assistant'));
import UCManager from '@/components/sarraaf/UCManager';
import RechargeManager from '@/components/sarraaf/RechargeManager';
import Afghan5Manager from '@/components/sarraaf/Afghan5Manager';
import SellerManager from '@/components/sarraaf/SellerManager';
import SandboxPanel from '@/components/sandbox/SandboxPanel';
import SupabaseAuditManager from '@/components/sarraaf/SupabaseAuditManager';
import LiveDatabaseExplorer from '@/components/sarraaf/LiveDatabaseExplorer';
import { SandboxProvider } from '@/components/sandbox/SandboxProvider';
import { checkBuilderAccess, startBuilderSession } from '@/lib/builderAccess';
import { useToast } from '@/components/ui/use-toast';

const STATUS_LABELS = {
  active: 'فعال',
  updating: 'در حال به‌روزرسانی',
  disabled: 'غیرفعال',
};

const STATUS_COLORS = {
  active: 'bg-green-100 text-green-700',
  updating: 'bg-amber-100 text-amber-700',
  disabled: 'bg-red-100 text-red-700',
};

// گروه‌بندی تب‌ها بر اساس نقش
const TAB_GROUPS = [
  {
    label: 'سیستم',
    icon: Server,
    value: 'system',
    description: 'نمای کلی، اتصال و آمار',
  },
  {
    label: 'بخش‌ها',
    icon: Shield,
    value: 'features',
    description: 'مدیریت فعال‌سازی بخش‌ها',
  },
  {
    label: 'کاربران',
    icon: Users,
    value: 'users',
    description: 'مدیریت کاربران و دسترسی‌ها',
  },
  {
    label: 'مجوزها',
    icon: Lock,
    value: 'perms',
    description: 'مجوزهای نقش‌ها',
  },
  {
    label: 'پلن‌ها',
    icon: Crown,
    value: 'plans',
    description: 'سهمیه و امکانات پلن',
  },
  {
    label: 'قیمت‌گذاری',
    icon: CreditCard,
    value: 'pricing',
    description: 'قیمت پلن‌ها',
  },
  {
    label: 'اعلان‌ها',
    icon: Bell,
    value: 'notif',
    description: 'مدیریت اعلان‌ها',
  },
  {
    label: 'چت',
    icon: MessageSquare,
    value: 'chat',
    description: 'مدیریت چت و گروه‌ها',
  },
  {
    label: 'پرداخت',
    icon: Wallet,
    value: 'payments',
    description: 'روش‌های پرداخت',
  },
  {
    label: 'برداشت‌ها',
    icon: CreditCard,
    value: 'withdrawals',
    description: 'تأیید/رد برداشت کیف پول',
  },
  {
    label: 'نسخه',
    icon: Upload,
    value: 'version',
    description: 'مدیریت نسخه برنامه',
  },
  {
    label: 'پشتیبان',
    icon: Download,
    value: 'backup',
    description: 'پشتیبان اضطراری پروژه',
  },
  {
    label: 'پشتیبان v2',
    icon: AlertTriangle,
    value: 'backup_v2',
    description: 'نسخه اضطراری کامل (۲۸ بخش)',
  },
  {
    label: 'سه گانه',
    icon: Download,
    value: 'triple_backup',
    description: 'PDF + ZIP + Supabase',
  },
  {
    label: 'کمک‌سازنده',
    icon: UserCog,
    value: 'co_creators',
    description: 'مدیریت دسترسی کمک‌سازنده‌ها',
  },
  {
    label: 'تأیید ایمیل',
    icon: Mail,
    value: 'email_verify',
    description: 'درخواست‌های تأیید دستی ایمیل',
  },
  {
    label: 'آزمایش',
    icon: Clock,
    value: 'trial',
    description: 'مدیریت دوره آزمایشی صرافان',
  },
  {
    label: 'چیدمان موبایل',
    icon: Smartphone,
    value: 'layout_preview',
    description: 'پیش‌نمایش چیدمان موبایل',
  },
  {
    label: 'هوش مثنوی',
    icon: Bot,
    value: 'masnavi_ai',
    description: 'دستیار هوشمند آزمایشی',
  },
  {
    label: 'UC پابجی',
    icon: Gamepad2,
    value: 'uc_manager',
    description: 'مدیریت UC پابجی موبایل',
  },
  {
    label: 'شارژ و بسته',
    icon: Zap,
    value: 'recharge',
    description: 'خرید شارژ و بسته اینترنت (افغان۵)',
  },
  {
    label: 'افغان۵',
    icon: Globe,
    value: 'afghan5',
    description: 'مدیریت حساب و بسته‌های افغان۵',
  },
  {
    label: 'فروشندگان',
    icon: Store,
    value: 'sellers',
    description: 'مدیریت فروشندگان و سفارش‌ها',
  },
  {
    label: 'آزمایش فروش',
    icon: FlaskConical,
    value: 'sandbox',
    description: 'محیط آزمایشی محلی فروش شارژ و خدمات',
  },
  {
    label: 'بررسی سوپابیس',
    icon: Database,
    value: 'supabase_audit',
    description: 'گزارش امن ساختار و RLS سوپابیس',
  },
  {
    label: 'دیتابیس زنده',
    icon: Database,
    value: 'db_explorer',
    description: 'مرور و مدیریت زنده ردیف‌های جدول‌ها',
  },
];

export default function BuilderPanel() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { data: features, refetch } = useFeatures();
  const toggleMut = useToggleFeature();
  const [autoLogoutWarning, setAutoLogoutWarning] = useState(false);
  const { toast } = useToast();

  // ── Determine builder access level ──
  const accessInfo = useMemo(() => checkBuilderAccess(user), [user]);
  const isFullCreator = user?.role === 'creator' || user?.role === 'admin';
  const allowedTabs = accessInfo?.allowed_tabs === 'all' ? null : (accessInfo?.allowed_tabs || []);

  // ── Auto-logout after 30 min inactivity ──
  useEffect(() => {
    const cleanup = startBuilderSession(() => {
      setAutoLogoutWarning(true);
      setTimeout(() => logout(true), 2000);
    });
    return cleanup;
  }, [logout]);

  const handleToggle = async (f) => {
    if (CRITICAL_FEATURES.includes(f.feature_key)) return;
    const current = features?.find(fx => fx.feature_key === f.feature_key);
    if (!current) {
      // Record doesn't exist yet — create it
      try {
        const { createSupabaseEntity } = await import('@/lib/supabaseApi');
        const sbFeatures = createSupabaseEntity('FeatureSetting');
        await sbFeatures.create({
          feature_key: f.feature_key,
          name: f.name,
          icon: f.icon,
          location: f.location,
          display_order: f.display_order,
          enabled: true,
          status: f.default_status || 'active',
        });
        if (refetch) refetch();
        toast({ title: 'بخش فعال شد', description: f.name });
      } catch (err) {
        toast({ title: 'خطا', description: err.message || 'عملیات ناموفق بود', variant: 'destructive' });
      }
      return;
    }
    toggleMut.mutate({ id: current.id, enabled: !current.enabled });
  };

  const handleStatusChange = async (featureKey, newStatus) => {
    const current = features?.find(fx => fx.feature_key === featureKey);
    if (CRITICAL_FEATURES.includes(featureKey)) return;
    try {
      const { createSupabaseEntity } = await import('@/lib/supabaseApi');
      const sbFeatures = createSupabaseEntity('FeatureSetting');
      if (!current) {
        // Record doesn't exist yet — create it with the new status
        const f = FEATURE_CATALOG.find(fx => fx.feature_key === featureKey);
        await sbFeatures.create({
          feature_key: featureKey,
          name: f?.name || featureKey,
          icon: f?.icon,
          location: f?.location,
          display_order: f?.display_order,
          enabled: newStatus !== 'disabled',
          status: newStatus,
        });
      } else {
        await sbFeatures.update(current.id, {
          status: newStatus,
          enabled: newStatus !== 'disabled',
        });
      }
      if (refetch) refetch();
      toast({ title: 'وضعیت بخش به‌روزرسانی شد', description: `${featureKey}: ${STATUS_LABELS[newStatus]}` });
    } catch (err) {
      toast({ title: 'خطا', description: err.message || 'عملیات ناموفق بود', variant: 'destructive' });
    }
  };

  if (autoLogoutWarning) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background gap-3 p-6">
        <Clock className="w-12 h-12 text-amber-500 animate-pulse" />
        <h2 className="text-lg font-bold">خروج خودکار</h2>
        <p className="text-sm text-muted-foreground text-center">
          به دلیل ۳۰ دقیقه بی‌فعالیتی در پنل سازنده، نشست شما به‌صورت خودکار پایان می‌یابد.
        </p>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="پنل سازنده حساب صراف"
        subtitle={isFullCreator ? user?.full_name : `کمک‌سازنده: ${accessInfo?.name || user?.full_name || ''}`}
        icon={Shield}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/dashboard')}
            className="gap-1.5"
          >
            <Eye className="w-4 h-4" />
            پیش‌نمایش برنامه
          </Button>
        }
      />

      <Tabs defaultValue="system">
        <TabsList className="flex overflow-x-auto scrollbar-thin w-full gap-0.5 justify-start sm:justify-around">
          {TAB_GROUPS.filter(group => {
            if (isFullCreator) return true;
            if (group.value === 'co_creators') return false; // co-creators can't manage other co-creators
            if (!allowedTabs) return true;
            return allowedTabs.includes(group.value);
          }).map(group => {
            const Icon = group.icon;
            return (
              <TabsTrigger key={group.value} value={group.value} className="flex flex-col items-center gap-0.5 py-2 shrink-0 min-w-[64px]">
                <Icon className="w-4 h-4" />
                <span className="text-[9px]">{group.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* سیستم — نمای کلی، اتصال، آمار */}
        <TabsContent value="system">
          <div className="space-y-4">
            <AccountRecoveryManager />
            <KeepaliveStatus />
            <SystemOverview />
            <OrphanCustomerManager />
            <LegacyDataMigrator />
            <SqlMigrationHelper />
          </div>
        </TabsContent>

        {/* بخش‌ها */}
        <TabsContent value="features">
          <Card><CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-1">مدیریت بخش‌ها</h3>
            <p className="text-xs text-muted-foreground mb-4">هر بخش را می‌توانید فعال، در حال به‌روزرسانی یا غیرفعال کنید.</p>
            <div className="space-y-2">
              {FEATURE_CATALOG.map(f => {
                const dbFeature = features?.find(fx => fx.feature_key === f.feature_key);
                const enabled = dbFeature ? dbFeature.enabled !== false : true;
                const status = dbFeature?.status || (f.default_status || 'active');
                const isCritical = CRITICAL_FEATURES.includes(f.feature_key);
                return (
                  <div key={f.feature_key} className="flex items-center justify-between p-2.5 rounded-lg border">
                    <div className="flex-1">
                      <span className="text-sm font-medium">{f.name}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full mr-2 ${STATUS_COLORS[status]}`}>
                        {STATUS_LABELS[status]}
                      </span>
                      {isCritical && <span className="text-[10px] text-muted-foreground mr-2">(حیاتی)</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      {!isCritical && (
                        <Select value={status} onValueChange={(v) => handleStatusChange(f.feature_key, v)}>
                          <SelectTrigger className="text-xs h-7 w-28"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">فعال</SelectItem>
                            <SelectItem value="updating">به‌روزرسانی</SelectItem>
                            <SelectItem value="disabled">غیرفعال</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                      <Switch
                        checked={enabled}
                        disabled={isCritical}
                        onCheckedChange={() => handleToggle(f)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent></Card>
        </TabsContent>

        {/* کاربران */}
        <TabsContent value="users"><UserManagement /></TabsContent>

        {/* مجوزها */}
        <TabsContent value="perms"><PermissionManager /></TabsContent>

        {/* پلن‌ها */}
        <TabsContent value="plans">
          <div className="space-y-4">
            <PaidSystemToggle />
            <PlanFeatureManager />
          </div>
        </TabsContent>

        {/* قیمت‌گذاری */}
        <TabsContent value="pricing"><PlanPricingManager /></TabsContent>

        {/* اعلان‌ها */}
        <TabsContent value="notif"><NotificationManager /></TabsContent>

        {/* چت */}
        <TabsContent value="chat"><ChatManagement /></TabsContent>

        {/* پرداخت */}
        <TabsContent value="payments"><PaymentMethodsManager /></TabsContent>

        {/* برداشت‌ها */}
        <TabsContent value="withdrawals"><WithdrawalManagement /></TabsContent>

        {/* نسخه */}
        <TabsContent value="version">
          <div className="space-y-4">
            <AppIconDownloader />
            <VersionManager />
            <ContactSettingsManager />
          </div>
        </TabsContent>

        {/* پشتیبان اضطراری */}
        <TabsContent value="backup">
          <EmergencyBackup />
        </TabsContent>

        {/* پشتیبان اضطراری v2 — Snapshot کامل وضعیت پروژه */}
        <TabsContent value="backup_v2">
          <EmergencyBackupV2 />
        </TabsContent>

        {/* پشتیبان سه‌گانه — PDF + ZIP + Supabase */}
        <TabsContent value="triple_backup">
          <TripleBackup />
        </TabsContent>

        {/* کمک‌سازنده‌ها — فقط سازنده اصلی */}
        {isFullCreator && (
          <TabsContent value="co_creators">
            <CoCreatorManager />
          </TabsContent>
        )}

        {/* تأیید دستی ایمیل */}
        <TabsContent value="email_verify">
          <ManualVerificationManager />
        </TabsContent>

        {/* مدیریت دوره آزمایشی */}
        <TabsContent value="trial">
          <TrialManager />
        </TabsContent>

        {/* پیش‌نمایش چیدمان موبایل */}
        <TabsContent value="layout_preview">
          <MobileLayoutPreview />
        </TabsContent>

        {/* هوش مثنوی — دستیار هوشمند آزمایشی */}
        <TabsContent value="masnavi_ai">
          <React.Suspense fallback={<div className="flex items-center justify-center min-h-[40vh]"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
            <Assistant />
          </React.Suspense>
        </TabsContent>

        {/* مدیریت UC پابجی موبایل */}
        <TabsContent value="uc_manager">
          <UCManager />
        </TabsContent>

        {/* شارژ و بسته اینترنت — افغان۵ */}
        <TabsContent value="recharge">
          <RechargeManager />
        </TabsContent>

        {/* مدیریت افغان۵ — نشانی حساب، بسته‌ها و سفارش‌ها */}
        <TabsContent value="afghan5">
          <Afghan5Manager />
        </TabsContent>

        {/* مدیریت فروشندگان — نقش‌ها، سفارش‌ها، قیمت‌گذاری */}
        <TabsContent value="sellers">
          <SellerManager />
        </TabsContent>

        {/* محیط آزمایشی فروش شارژ و خدمات دیجیتال — فقط سازندهٔ اصلی */}
        {isFullCreator && (
          <TabsContent value="sandbox">
            <SandboxProvider>
              <SandboxPanel />
            </SandboxProvider>
          </TabsContent>
        )}

        {/* بررسی امن سوپابیس — فقط سازنده/مدیر */}
        {isFullCreator && (
          <TabsContent value="supabase_audit">
            <SupabaseAuditManager />
          </TabsContent>
        )}

        {/* دیتابیس زنده — فقط سازندهٔ اصلی */}
        {isFullCreator && (
          <TabsContent value="db_explorer">
            <LiveDatabaseExplorer />
          </TabsContent>
        )}

      </Tabs>
    </>
  );
}