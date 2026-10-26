import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSandbox } from '@/components/sandbox/SandboxProvider';
import { User, Store, LogIn, LogOut, ShieldCheck } from 'lucide-react';

const fmt = (n) => Number(n || 0).toLocaleString('fa-IR');

export function SandboxIdentities() {
  const { state, activeRole, setActiveRole } = useSandbox();
  const { identities, sellers } = state;
  const sellerProfile = sellers.find(s => s.id === identities.seller.id);

  const IdentityCard = ({ id, identity, role, icon: Icon, profile }) => {
    const active = activeRole === role;
    return (
      <Card className={active ? 'border-primary' : ''}>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon className="w-5 h-5 text-primary" />
              <span className="text-sm font-bold">{identity.name}</span>
            </div>
            {active && <Badge className="bg-primary text-primary-foreground">فعال</Badge>}
          </div>
          <div className="text-xs text-muted-foreground space-y-0.5">
            <p>نقش: {role === 'customer' ? 'مشتری' : 'فروشنده'}</p>
            <p>تلفن: {identity.phone}</p>
            <p>موجودی آزمایشی: <span className="font-bold text-foreground">{fmt(identity.balance)} افغانی</span></p>
            {role === 'seller' && profile && (
              <p>کد فروشنده: <span className="font-bold text-foreground">{profile.code}</span> — وضعیت: {profile.status === 'active' ? 'فعال' : profile.status}</p>
            )}
            {role === 'seller' && !profile && <p className="text-amber-600">هنوز فروشندهٔ تأییدشده نیست</p>}
          </div>
          <Button
            size="sm" variant={active ? 'outline' : 'default'}
            className="w-full gap-1.5"
            onClick={() => setActiveRole(active ? null : role)}
          >
            {active ? <><LogOut className="w-4 h-4" /> خروج از نقش</> : <><LogIn className="w-4 h-4" /> ورود به عنوان {role === 'customer' ? 'مشتری' : 'فروشنده'}</>}
          </Button>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-3">
      <Card><CardContent className="p-3 flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-primary" />
        <p className="text-xs">برای آزمایش گردش‌کار، یکی از هویت‌های آزمایشی را انتخاب کنید. این ورود مستقل از نشست سازندهٔ شماست و هیچ حساب واقعی را جایگزین نمی‌کند.</p>
      </CardContent></Card>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <IdentityCard id="c" identity={identities.customer} role="customer" icon={User} />
        <IdentityCard id="s" identity={identities.seller} role="seller" icon={Store} profile={sellerProfile} />
      </div>
    </div>
  );
}