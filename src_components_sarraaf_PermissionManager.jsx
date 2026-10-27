import React, { useState } from 'react';
import { useAllPermissions, useAllSarraafProfiles, useUpdatePermission, useCreatePermission } from '@/lib/useAdmin';
import { useAuth } from '@/lib/AuthContext';
import { FEATURE_CATALOG } from '@/lib/features';
import { ROLE_HIERARCHY } from '@/lib/permissions';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { Lock, Plus, AlertTriangle } from 'lucide-react';

const PERMISSION_ACTIONS = [
  { key: 'can_view', label: 'مشاهده' },
  { key: 'can_create', label: 'ایجاد' },
  { key: 'can_edit', label: 'ویرایش' },
  { key: 'can_delete', label: 'حذف' },
  { key: 'can_print', label: 'چاپ' },
  { key: 'can_report', label: 'گزارش' },
  { key: 'can_settings', label: 'تنظیمات' },
];

export default function PermissionManager() {
  const { user } = useAuth();
  const { data: profiles, error: profileErr } = useAllSarraafProfiles();
  const { data: permissions, isLoading, error: permErr } = useAllPermissions();
  const updateMut = useUpdatePermission();
  const createMut = useCreatePermission();

  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedSection, setSelectedSection] = useState('dashboard');

  const myRole = user?.role || 'admin';
  const myLevel = ROLE_HIERARCHY[myRole] || 0;

  const userPerms = (permissions || []).filter(p => p.user_id === selectedUserId);

  const handleToggle = async (perm, actionKey) => {
    if (!perm) return;
    try {
      await updateMut.mutateAsync({
        id: perm.id,
        data: { [actionKey]: !perm[actionKey] },
      });
    } catch (err) {
      toast({ title: 'خطا', description: err.message, variant: 'destructive' });
    }
  };

  const handleAddPermission = async (section) => {
    if (!selectedUserId) {
      toast({ title: 'خطا', description: 'ابتدا کاربر را انتخاب کنید', variant: 'destructive' });
      return;
    }
    const profile = profiles?.find(p => p.user_id === selectedUserId);
    try {
      await createMut.mutateAsync({
        user_id: selectedUserId,
        user_name: profile?.name || '',
        role: profile?.plan ? 'sarraaf' : 'customer',
        section,
        can_view: true,
        can_create: false,
        can_edit: false,
        can_delete: false,
        can_print: false,
        can_report: false,
        can_settings: false,
      });
      toast({ title: 'افزوده شد', description: 'دسترسی برای بخش ایجاد شد' });
    } catch (err) {
      toast({ title: 'خطا', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Lock className="w-4 h-4" />
          سطح دسترسی و مجوزها
        </h3>

        {(profileErr || permErr) && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-xs space-y-1 mb-3">
            <p className="font-bold flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> خطا در بارگذاری داده‌ها</p>
            {profileErr && <p>صراف‌ها: {profileErr.message}</p>}
            {permErr && <p>مجوزها: {permErr.message}</p>}
          </div>
        )}

        <div className="flex gap-2 mb-3">
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger className="flex-1"><SelectValue placeholder="انتخاب کاربر" /></SelectTrigger>
            <SelectContent>
              {(profiles || []).map(p => (
                <SelectItem key={p.id} value={p.user_id}>{p.name} ({p.code})</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedSection} onValueChange={setSelectedSection}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              {FEATURE_CATALOG.map(f => (
                <SelectItem key={f.feature_key} value={f.feature_key}>{f.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => handleAddPermission(selectedSection)}>
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>

        {!selectedUserId ? (
          <p className="text-xs text-muted-foreground">یک کاربر انتخاب کنید</p>
        ) : userPerms.length === 0 ? (
          <p className="text-xs text-muted-foreground">هیچ دسترسی برای این کاربر تعریف نشده. با دکمه + اضافه کنید.</p>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto scrollbar-thin">
            {userPerms.map(perm => (
              <div key={perm.id} className="p-2.5 rounded-lg border">
                <p className="text-xs font-medium mb-2">{perm.section}</p>
                <div className="grid grid-cols-4 gap-2">
                  {PERMISSION_ACTIONS.map(action => (
                    <div key={action.key} className="flex items-center gap-1">
                      <Switch
                        checked={perm[action.key] === true}
                        onCheckedChange={() => handleToggle(perm, action.key)}
                      />
                      <span className="text-[10px] text-muted-foreground">{action.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}