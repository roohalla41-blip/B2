import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Settings as SettingsIcon, Coins, Crown,
  DatabaseBackup, ChevronLeft, FlaskConical, Store, Trash2,
  User, Shield, Palette, LayoutGrid
} from 'lucide-react';
import ReferralCard from '@/components/sarraaf/ReferralCard';
import ContactInfo from '@/components/sarraaf/ContactInfo';
import SupportPanel from '@/components/sarraaf/SupportPanel';
import FeedbackButton from '@/components/sarraaf/FeedbackButton';
import MultiExchangeManager from '@/components/sarraaf/MultiExchangeManager';
import TermsManager from '@/components/sarraaf/TermsManager';
import DeleteAccountDialog from '@/components/DeleteAccountDialog';
import ProfileSection from '@/components/sarraaf/settings/ProfileSection';
import SecuritySection from '@/components/sarraaf/settings/SecuritySection';
import PreferencesSection from '@/components/sarraaf/settings/PreferencesSection';
import SettingsSection from '@/components/sarraaf/settings/SettingsSection';
import { useSarraafProfile, useToggleReferral } from '@/lib/useSarraaf';
import { useUpgrade } from '@/lib/UpgradeContext';
import { usePaidSystemEnabled } from '@/lib/usePaidSystem';
import { useAuth } from '@/lib/AuthContext';
import { getAllowedSettingsMenu, isManagementRole } from '@/lib/rbac';

const ALL_MENU_ITEMS = [
  { label: 'مدیریت ارزها', path: '/currencies', icon: Coins, color: 'text-amber-600' },
  { label: 'محصولات آنلاین', path: '/online-products', icon: Store, color: 'text-pink-600' },
  { label: 'بکاپ و بازیابی', path: '/backup', icon: DatabaseBackup, color: 'text-violet-600' },
];

export default function Settings() {
  const { user } = useAuth();
  const { data: profile } = useSarraafProfile(user?.id);
  const toggleMut = useToggleReferral();
  const { openUpgrade } = useUpgrade();
  const { data: paidSystemEnabled } = usePaidSystemEnabled();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  const userRole = user?.role || 'user';
  const menuItems = ALL_MENU_ITEMS.filter(item =>
    getAllowedSettingsMenu(userRole).some(m => m.path === item.path)
  );

  const handleToggle = (enabled) => {
    if (!profile) return;
    toggleMut.mutate({ profileId: profile.id, enabled });
  };

  return (
    <>
      {/* Compact header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <SettingsIcon className="w-4 h-4 text-primary" />
        </div>
        <h1 className="text-base font-bold">تنظیمات</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-auto p-0.5 mb-4">
          <TabsTrigger value="profile" className="flex flex-col gap-0.5 py-2 text-[11px]">
            <User className="w-4 h-4" />
            پروفایل
          </TabsTrigger>
          <TabsTrigger value="security" className="flex flex-col gap-0.5 py-2 text-[11px]">
            <Shield className="w-4 h-4" />
            امنیت
          </TabsTrigger>
          <TabsTrigger value="prefs" className="flex flex-col gap-0.5 py-2 text-[11px]">
            <Palette className="w-4 h-4" />
            ترجیحات
          </TabsTrigger>
          <TabsTrigger value="more" className="flex flex-col gap-0.5 py-2 text-[11px]">
            <LayoutGrid className="w-4 h-4" />
            بیشتر
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="mt-0">
          <ProfileSection />
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="mt-0">
          <SecuritySection />
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="prefs" className="mt-0">
          <PreferencesSection />
        </TabsContent>

        {/* More Tab */}
        <TabsContent value="more" className="mt-0 space-y-4">
          {/* Upgrade card */}
          {paidSystemEnabled !== false && (
            <Card className="overflow-hidden border-0 shadow-sm">
              <CardContent className="p-4 bg-gradient-to-br from-primary to-indigo-600 text-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                    <Crown className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold">ارتقا به نسخه پولی</p>
                    <p className="text-xs text-white/80">امکانات بیشتر و حذف برند سازنده</p>
                  </div>
                  <button
                    onClick={() => openUpgrade()}
                    className="px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-xs font-medium transition-colors shrink-0"
                  >
                    ارتقا
                  </button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Referral card */}
          <ReferralCard
            profile={profile}
            onToggle={handleToggle}
            loading={toggleMut.isPending}
          />

          {/* Multi-exchange manager */}
          <MultiExchangeManager />

          {/* Contact links */}
          <ContactInfo />

          {/* Support panel */}
          <SupportPanel />

          {/* Management menu */}
          {menuItems.length > 0 && (
            <SettingsSection icon={SettingsIcon} title="مدیریت سیستم" description="ابزارهای مدیریتی صرافی">
              <div className="-m-4">
                {menuItems.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-3 px-4 py-3.5 hover:bg-muted/50 transition-colors ${
                        idx < menuItems.length - 1 ? 'border-b border-border' : ''
                      }`}
                    >
                      <Icon className={`w-5 h-5 shrink-0 ${item.color}`} />
                      <span className="text-sm font-medium flex-1">{item.label}</span>
                      <ChevronLeft className="w-4 h-4 text-muted-foreground shrink-0" />
                    </Link>
                  );
                })}
              </div>
            </SettingsSection>
          )}

          {/* Terms manager — admin/creator only */}
          {isManagementRole(userRole) && (
            <TermsManager />
          )}

          {/* About section */}
          <SettingsSection icon={FlaskConical} title="درباره برنامه">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">همراه ما — سامانه مدیریت عملیات صرافی</p>
              <p className="text-xs text-muted-foreground">نسخه ۱.۰.۱</p>
            </div>
            <div className="mt-3">
              <FeedbackButton />
            </div>
          </SettingsSection>

          {/* Delete Account — dangerous zone */}
          <Card className="border-destructive/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Trash2 className="w-4 h-4 text-destructive" />
                <h3 className="text-xs font-semibold text-destructive">حذف حساب کاربری</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                با حذف حساب، تمام اطلاعات پروفایل شما برای همیشه پاک می‌شود. این عملیات قابل بازگشت نیست.
              </p>
              <button
                onClick={() => setDeleteDialogOpen(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-destructive/30 text-destructive text-xs font-medium hover:bg-destructive/5 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                حذف حساب کاربری
              </button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <DeleteAccountDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      />
    </>
  );
}