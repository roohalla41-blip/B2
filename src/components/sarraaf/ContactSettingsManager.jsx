import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Save, Phone, Mail, Globe, MessageCircle, Send, Instagram, Facebook } from 'lucide-react';
import { getContactSettings, saveContactSettings } from '@/lib/contactSettings';

const ICON_MAP = { Phone, Mail, Globe, MessageCircle, Send, Instagram, Facebook };

export default function ContactSettingsManager() {
  const { toast } = useToast();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const list = await getContactSettings();
      setContacts(list);
    } catch (err) {
      console.error('[ContactSettings] load error:', err);
      toast({ variant: 'destructive', title: 'خطا', description: 'بارگذاری تنظیمات ارتباطات ناموفق بود' });
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await saveContactSettings(contacts);
      toast({ title: 'ذخیره شد', description: 'اطلاعات ارتباطی با موفقیت ذخیره شد' });
    } catch (err) {
      console.error('[ContactSettings] save error:', err);
      toast({ variant: 'destructive', title: 'خطا در ذخیره', description: err?.message || 'ذخیره ناموفق بود' });
    } finally {
      setSaving(false);
    }
  }

  function updateField(idx, field, value) {
    const updated = [...contacts];
    updated[idx] = { ...updated[idx], [field]: value };
    setContacts(updated);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">ارتباطات با ما</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {contacts.map((c, idx) => {
          const Icon = ICON_MAP[c.icon] || Phone;
          return (
            <div key={c.type} className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <Input
                  placeholder={c.label}
                  value={c.value}
                  onChange={(e) => updateField(idx, 'value', e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <Switch
                checked={c.is_active}
                onCheckedChange={(v) => updateField(idx, 'is_active', v)}
              />
            </div>
          );
        })}
        <Button onClick={handleSave} disabled={saving} className="w-full" size="sm">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          ذخیره
        </Button>
      </CardContent>
    </Card>
  );
}