import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { getTerms, saveTerms } from '@/lib/termsService';
import { ScrollText, Save, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function TermsManager() {
  const { toast } = useToast();
  const [sarraaf, setSarraaf] = useState('');
  const [customer, setCustomer] = useState('');
  const [version, setVersion] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const t = await getTerms();
      setSarraaf(t.sarraaf);
      setCustomer(t.customer);
      setVersion(t.version);
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const newVersion = await saveTerms(sarraaf, customer, version);
      setVersion(newVersion);
      toast({ title: 'قوانین ذخیره شد', description: `نسخه ${newVersion} — کاربران باید دوباره بپذیرند` });
    } catch {
      toast({ title: 'خطا در ذخیره قوانین', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          در حال بارگذاری...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <ScrollText className="w-4 h-4 text-primary shrink-0" />
          <h3 className="text-sm font-bold">قوانین و مقررات برنامه</h3>
        </div>

        <div>
          <label className="text-xs font-medium mb-1 block">قوانین صرافان</label>
          <Textarea
            value={sarraaf}
            onChange={(e) => setSarraaf(e.target.value)}
            rows={8}
            className="text-sm"
            placeholder="متن قوانین صرافان..."
          />
        </div>

        <div>
          <label className="text-xs font-medium mb-1 block">قوانین مشتریان</label>
          <Textarea
            value={customer}
            onChange={(e) => setCustomer(e.target.value)}
            rows={8}
            className="text-sm"
            placeholder="متن قوانین مشتریان..."
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">نسخه فعلی: {version}</span>
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            ذخیره قوانین
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground">
          پس از ذخیره، نسخه قوانین افزایش می‌یابد و همه کاربران باید دوباره قوانین را بپذیرند.
        </p>
      </CardContent>
    </Card>
  );
}