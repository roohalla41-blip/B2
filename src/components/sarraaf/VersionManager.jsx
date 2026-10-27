import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Loader2, Upload, AlertTriangle, CheckCircle } from 'lucide-react';
import { getCurrentVersionInfo, publishVersion, APP_VERSION } from '@/lib/versionManager';
import { useToast } from '@/components/ui/use-toast';

export default function VersionManager() {
  const [versionInfo, setVersionInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [form, setForm] = useState({ version: '', releaseNotes: '', downloadUrl: '', isMandatory: false });
  const { toast } = useToast();

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const info = await getCurrentVersionInfo();
    setVersionInfo(info);
    setForm({
      version: info.version || '',
      releaseNotes: info.release_notes || '',
      downloadUrl: info.download_url || '',
      isMandatory: info.is_mandatory || false,
    });
    setLoading(false);
  }

  async function handlePublish() {
    if (!form.version) {
      toast({ title: 'خطا', description: 'شماره نسخه الزامی است', variant: 'destructive' });
      return;
    }
    setPublishing(true);
    try {
      await publishVersion({
        version: form.version,
        releaseNotes: form.releaseNotes,
        downloadUrl: form.downloadUrl,
        isMandatory: form.isMandatory,
      });
      toast({ title: 'موفق', description: 'نسخه جدید منتشر شد و به کاربران اطلاع داده شد' });
      load();
    } catch {
      toast({ title: 'خطا', description: 'انتشار نسخه ناموفق بود', variant: 'destructive' });
    }
    setPublishing(false);
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
        <CardTitle className="text-sm flex items-center gap-2">
          <Upload className="w-4 h-4" />
          مدیریت نسخه برنامه
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
          {versionInfo?.version === APP_VERSION ? (
            <CheckCircle className="w-4 h-4 text-green-600" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          )}
          <span className="text-xs">
            نسخه فعلی دستگاه: {APP_VERSION} — نسخه منتشرشده: {versionInfo?.version || '—'}
          </span>
        </div>

        <div>
          <Label className="text-xs">شماره نسخه جدید</Label>
          <Input
            value={form.version}
            onChange={(e) => setForm({ ...form, version: e.target.value })}
            placeholder="1.0.1"
            className="h-8 text-sm mt-1"
          />
        </div>

        <div>
          <Label className="text-xs">یادداشت انتشار</Label>
          <Textarea
            value={form.releaseNotes}
            onChange={(e) => setForm({ ...form, releaseNotes: e.target.value })}
            placeholder="تغییرات و بهبودهای نسخه جدید..."
            className="text-sm mt-1 min-h-[60px]"
          />
        </div>

        <div>
          <Label className="text-xs">لینک دانلود</Label>
          <Input
            value={form.downloadUrl}
            onChange={(e) => setForm({ ...form, downloadUrl: e.target.value })}
            placeholder="https://..."
            className="h-8 text-sm mt-1"
          />
        </div>

        <div className="flex items-center gap-2">
          <Switch
            checked={form.isMandatory}
            onCheckedChange={(v) => setForm({ ...form, isMandatory: v })}
          />
          <Label className="text-xs">آپدیت اجباری</Label>
        </div>

        <Button onClick={handlePublish} disabled={publishing} className="w-full" size="sm">
          {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          انتشار نسخه جدید
        </Button>
      </CardContent>
    </Card>
  );
}