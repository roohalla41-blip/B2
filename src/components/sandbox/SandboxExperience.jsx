import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSandbox } from '@/components/sandbox/SandboxProvider';
import { SandboxCustomerPanel } from '@/components/sandbox/panels/SandboxCustomerPanel';
import { SandboxSellerPanel } from '@/components/sandbox/panels/SandboxSellerPanel';
import { SandboxSarraafPanel } from '@/components/sandbox/panels/SandboxSarraafPanel';
import { SandboxAdminPanel } from '@/components/sandbox/panels/SandboxAdminPanel';
import { LogOut, FlaskConical } from 'lucide-react';

const ROLE_LABELS = {
  customer: 'مشتری', seller: 'فروشنده', sarraaf: 'صراف', admin: 'مدیر',
};

export function SandboxExperience() {
  const { session, actions } = useSandbox();

  if (!session) return null;

  const handleLogout = () => actions.logout();

  const Panel = {
    customer: SandboxCustomerPanel,
    seller: SandboxSellerPanel,
    sarraaf: SandboxSarraafPanel,
    admin: SandboxAdminPanel,
  }[session.role];

  return (
    <div className="space-y-3">
      {/* نوار بالایی — نشان‌دهندهٔ حالت آزمایشی */}
      <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
        <CardContent className="p-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-amber-600 shrink-0" />
            <div>
              <p className="text-xs font-bold text-amber-800 dark:text-amber-300">
                {session.name} — {ROLE_LABELS[session.role]}
              </p>
              <p className="text-[10px] text-amber-700 dark:text-amber-400">حالت آزمایشی • داده‌ها محلی هستند</p>
            </div>
          </div>
          <Button size="sm" variant="outline" className="gap-1 h-7" onClick={handleLogout}>
            <LogOut className="w-3.5 h-3.5" /> خروج
          </Button>
        </CardContent>
      </Card>

      {Panel ? <Panel /> : <p className="text-xs text-muted-foreground">پنل این نقش هنوز پیاده‌سازی نشده.</p>}
    </div>
  );
}