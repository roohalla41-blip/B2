import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { offlineDB } from '@/lib/offlineQueue';
import { creatorCreateExchange } from '@/lib/directAuth';
import { generateUniqueInviteCode } from '@/lib/referralSystem';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { Gift, Copy, Plus, Store } from 'lucide-react';

const SETTING_KEY = 'standalone_invite_codes';

export default function InviteCodeManager() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateExchange, setShowCreateExchange] = useState(false);
  const [generatedCode, setGeneratedCode] = useState(null);
  const [exForm, setExForm] = useState({
    exchange_name: '',
    full_name: '',
    mobile: '',
    username: '',
    password: '',
    exchange_code: '',
    email: '',
  });
  const [creating, setCreating] = useState(false);

  // Load standalone invite codes from AppSetting
  useEffect(() => {
    loadCodes();
  }, []);

  const loadCodes = async () => {
    try {
      const settings = await offlineDB.AppSetting.filter({ key: SETTING_KEY });
      if (settings && settings.length > 0 && settings[0].data) {
        setCodes(settings[0].data);
      }
    } catch {
      // ignore
    }
  };

  const saveCodes = async (newCodes) => {
    const settings = await offlineDB.AppSetting.filter({ key: SETTING_KEY });
    if (settings && settings.length > 0) {
      await offlineDB.AppSetting.update(settings[0].id, { data: newCodes });
    } else {
      await offlineDB.AppSetting.create({ key: SETTING_KEY, value: 'invite_codes', data: newCodes });
    }
    setCodes(newCodes);
  };

  const handleGenerateCode = async () => {
    setLoading(true);
    try {
      const code = await generateUniqueInviteCode('SR');
      const entry = {
        code,
        created_at: new Date().toISOString(),
        created_by: user?.full_name || user?.email || 'مدیر سیستم',
        used: false,
      };
      const newCodes = [entry, ...codes];
      await saveCodes(newCodes);
      setGeneratedCode(code);
      toast({ title: 'کد دعوت تولید شد', description: code });
    } catch (err) {
      toast({ title: 'خطا', description: err.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  const handleCopy = (code) => {
    try {
      navigator.clipboard.writeText(code);
      toast({ title: 'کپی شد', description: code });
    } catch {
      toast({ title: 'خطا', description: 'کپی ناموفق بود', variant: 'destructive' });
    }
  };

  const handleCreateExchange = async () => {
    const { exchange_name, full_name, mobile, username, password, exchange_code, email } = exForm;
    if (!exchange_name || !full_name || !mobile || !username || !password) {
      toast({ title: 'خطا', description: 'نام صرافی، نام مسئول، موبایل، نام کاربری و رمز عبور الزامی هستند', variant: 'destructive' });
      return;
    }
    setCreating(true);
    try {
      const res = await creatorCreateExchange({
        exchange_name,
        full_name,
        mobile,
        username,
        password,
        email,
        exchange_code,
      });
      if (!res?.success) {
        const errMap = {
          unauthorized: 'دسترسی غیرمجاز — ابتدا به‌عنوان سازنده وارد شوید',
          mobile_exists: 'این شماره موبایل قبلاً ثبت شده است',
          username_exists: 'این نام کاربری قبلاً ثبت شده است',
          email_exists: 'این ایمیل قبلاً ثبت شده است',
          missing_fields: 'نام صرافی، نام مسئول، موبایل، نام کاربری و رمز عبور الزامی هستند',
        };
        toast({ title: 'خطا', description: errMap[res?.error] || res?.error || 'ایجاد صراف ناموفق بود', variant: 'destructive' });
        setCreating(false);
        return;
      }

      const finalCode = res.exchange?.exchange_code || exchange_code;
      const inviteCode = res.exchange?.referral_code || await generateUniqueInviteCode('SR');

      await offlineDB.SarraafProfile.create({
        code: finalCode,
        user_id: String(res.user?.id || ''),
        email: res.user?.email || email || '',
        exchange_name,
        name: full_name,
        phone: mobile,
        plan: 'free',
        quota_limit: 100,
        quota_used: 0,
        payment_status: 'none',
        status: 'active',
        last_login: new Date().toISOString(),
        referral_enabled: true,
        referral_code: inviteCode,
      });

      qc.invalidateQueries({ queryKey: ['allSarraafProfiles'] });
      toast({
        title: 'صراف ایجاد شد',
        description: `کد صرافی: ${finalCode} — کد دعوت: ${inviteCode}`,
      });
      setShowCreateExchange(false);
      setExForm({ exchange_name: '', full_name: '', mobile: '', username: '', password: '', exchange_code: '', email: '' });
    } catch (err) {
      toast({ title: 'خطا', description: err.message, variant: 'destructive' });
    }
    setCreating(false);
  };

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Gift className="w-4 h-4" />
            کدهای دعوت
          </h3>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" onClick={handleGenerateCode} disabled={loading}>
              <Gift className="w-3.5 h-3.5" />
              تولید کد دعوت
            </Button>
            <Button size="sm" onClick={() => setShowCreateExchange(true)}>
              <Store className="w-3.5 h-3.5" />
              صراف جدید
            </Button>
          </div>
        </div>

        {codes.length === 0 ? (
          <p className="text-xs text-muted-foreground">کد دعوتی تولید نشده است.</p>
        ) : (
          <div className="space-y-1.5">
            {codes.map((c, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-lg border">
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-mono font-medium">{c.code}</span>
                  {c.used && <span className="text-[10px] text-muted-foreground mr-2">(استفاده شده)</span>}
                </div>
                <Button size="sm" variant="ghost" onClick={() => handleCopy(c.code)}>
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Create Exchange Dialog */}
      <Dialog open={showCreateExchange} onOpenChange={setShowCreateExchange}>
        <DialogContent>
          <DialogHeader><DialogTitle>صراف جدید</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>نام صرافی</Label>
              <Input value={exForm.exchange_name} onChange={e => setExForm({ ...exForm, exchange_name: e.target.value })} placeholder="نام صرافی" />
            </div>
            <div>
              <Label>نام مسئول</Label>
              <Input value={exForm.full_name} onChange={e => setExForm({ ...exForm, full_name: e.target.value })} placeholder="نام و نام خانوادگی" />
            </div>
            <div>
              <Label>موبایل</Label>
              <Input value={exForm.mobile} onChange={e => setExForm({ ...exForm, mobile: e.target.value })} placeholder="07xxxxxxxxx" />
            </div>
            <div>
              <Label>نام کاربری</Label>
              <Input value={exForm.username} onChange={e => setExForm({ ...exForm, username: e.target.value })} placeholder="نام کاربری" />
            </div>
            <div>
              <Label>رمز عبور</Label>
              <Input type="password" value={exForm.password} onChange={e => setExForm({ ...exForm, password: e.target.value })} placeholder="رمز عبور" />
            </div>
            <div>
              <Label>کد صرافی</Label>
              <Input value={exForm.exchange_code} onChange={e => setExForm({ ...exForm, exchange_code: e.target.value })} placeholder="خالی = خودکار تولید می‌شود" />
            </div>
            <div>
              <Label>ایمیل صراف (اختیاری)</Label>
              <Input
                type="email"
                value={exForm.email}
                onChange={e => setExForm({ ...exForm, email: e.target.value })}
                placeholder="email@gmail.com"
              />
            </div>
            <p className="text-xs text-muted-foreground bg-primary/5 p-2 rounded-lg">
              این حساب بدون نیاز به تأیید ایمیل ایجاد می‌شود. اگر کد صرافی خالی باشد، به‌صورت خودکار تولید می‌شود.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateExchange(false)}>انصراف</Button>
            <Button onClick={handleCreateExchange} disabled={creating}>
              {creating ? 'در حال ایجاد...' : 'ایجاد صراف'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}