import React, { useState, useEffect, useRef } from 'react';
import { User, ChevronDown, ChevronUp, Loader2, Save, Lock, Camera, Image as ImageIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useSarraafProfile, useUpdateSarraafProfile } from '@/lib/useSarraaf';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { callSupabase } from '@/lib/supabaseApi';
import SettingsSection from './SettingsSection';

export default function ProfileSection() {
  const { user } = useAuth();
  const { data: profile } = useSarraafProfile(user?.id);
  const updateMut = useUpdateSarraafProfile();
  const { toast } = useToast();
  const fileInputRef = useRef(null);
  const [showAddress, setShowAddress] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [form, setForm] = useState({
    exchange_name: '',
    full_name: '',
    mobile: '',
    email: '',
    country: '',
    city: '',
    logo: '',
  });

  useEffect(() => {
    if (profile || user) {
      setForm({
        exchange_name: profile?.exchange_name || '',
        full_name: user?.full_name || '',
        mobile: profile?.phone || user?.mobile || '',
        email: user?.email || '',
        country: profile?.country || '',
        city: profile?.city || '',
        logo: profile?.logo || '',
      });
    }
  }, [profile, user]);

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      // Upload directly to Supabase Storage (no Base44 integration)
      const fileExt = file.name.split('.').pop();
      const fileName = `logos/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('public')
        .upload(fileName, file, { contentType: file.type || 'image/jpeg' });
      if (uploadError) throw new Error(uploadError.message || 'upload_failed');
      const { data: urlData } = supabase.storage.from('public').getPublicUrl(fileName);
      const file_url = urlData?.publicUrl;
      if (!file_url) throw new Error('no_url_returned');
      setForm(prev => ({ ...prev, logo: file_url }));
      if (profile?.id) {
        await updateMut.mutateAsync({ profileId: profile.id, data: { logo: file_url } });
      }
      toast({ title: 'لوگو آپلود شد', description: 'لوگوی صرافی به‌روزرسانی شد' });
    } catch (err) {
      toast({ title: 'خطا', description: err.message || 'آپلود لوگو ناموفق بود', variant: 'destructive' });
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (profile?.id) {
        await updateMut.mutateAsync({
          profileId: profile.id,
          data: {
            exchange_name: form.exchange_name,
            phone: form.mobile,
            country: form.country,
            city: form.city,
          },
        });
      }
      if (user?.id && user.id !== 'creator') {
        await supabase.from('users').update({
          full_name: form.full_name,
        }).eq('id', user.id);
      }
      toast({ title: 'ذخیره شد', description: 'پروفایل شما به‌روزرسانی شد' });
    } catch (err) {
      toast({ title: 'خطا', description: err.message || 'ذخیره ناموفق بود', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsSection
      icon={User}
      title="پروفایل و هویت"
      description="اطلاعات صرافی و نماینده"
    >
      <div className="space-y-3">
        {/* Logo upload */}
        <div className="flex items-center gap-4 pb-3 border-b border-border">
          <div className="relative shrink-0">
            <div className="w-16 h-16 rounded-xl border-2 border-border overflow-hidden flex items-center justify-center bg-muted/30">
              {form.logo ? (
                <img src={form.logo} alt="logo" className="w-full h-full object-cover" />
              ) : (
                <ImageIcon className="w-6 h-6 text-muted-foreground" />
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingLogo}
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {uploadingLogo ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
            </button>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium">لوگوی صرافی</p>
            <p className="text-[10px] text-muted-foreground">برای آپلود لوگو روی دوربین کلیک کنید</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleLogoUpload}
            className="hidden"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">نام صرافی</Label>
            <Input
              value={form.exchange_name}
              onChange={e => setForm({ ...form, exchange_name: e.target.value })}
              className="h-10 mt-1"
              placeholder="نام صرافی"
            />
          </div>
          <div>
            <Label className="text-xs">نام نماینده</Label>
            <Input
              value={form.full_name}
              onChange={e => setForm({ ...form, full_name: e.target.value })}
              className="h-10 mt-1"
              placeholder="نام و نام خانوادگی"
            />
          </div>
        </div>

        {/* Read-only critical fields: mobile & email */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">موبایل</Label>
            <div className="flex items-center gap-2 px-3 h-10 mt-1 rounded-md border border-input bg-muted/40">
              <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-sm text-muted-foreground truncate" dir="ltr">{form.mobile || '—'}</span>
            </div>
          </div>
          <div>
            <Label className="text-xs">ایمیل</Label>
            <div className="flex items-center gap-2 px-3 h-10 mt-1 rounded-md border border-input bg-muted/40">
              <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-sm text-muted-foreground truncate" dir="ltr">{form.email || '—'}</span>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowAddress(!showAddress)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors py-1"
        >
          {showAddress ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          آدرس و موقعیت
        </button>
        {showAddress && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">کشور</Label>
              <Input
                value={form.country}
                onChange={e => setForm({ ...form, country: e.target.value })}
                className="h-10 mt-1"
                placeholder="کشور"
              />
            </div>
            <div>
              <Label className="text-xs">شهر</Label>
              <Input
                value={form.city}
                onChange={e => setForm({ ...form, city: e.target.value })}
                className="h-10 mt-1"
                placeholder="شهر"
              />
            </div>
          </div>
        )}

        <Button onClick={handleSave} disabled={saving} className="w-full h-10">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          ذخیره تغییرات
        </Button>
      </div>
    </SettingsSection>
  );
}