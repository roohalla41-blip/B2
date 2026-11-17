import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ImagePlus, Trash2, Copy, ExternalLink, RefreshCw, Images, Loader2 } from 'lucide-react';

const TABLE = 'layout_hex_references';
const BUCKET = 'layout-hex-references';
const MAX_BYTES = 8 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export default function LayoutHexLibrary() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [title, setTitle] = useState('');
  const [file, setFile] = useState(null);
  const [localPreview, setLocalPreview] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error: queryError } = await supabase
        .from(TABLE)
        .select('id, hex_code, title, storage_path, image_url, created_at')
        .order('id', { ascending: true });
      if (queryError) throw queryError;
      setItems(data || []);
    } catch (err) {
      setError(err?.message || 'بارگذاری کتابخانه HEX ناموفق بود.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  useEffect(() => {
    if (!file) {
      setLocalPreview('');
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setLocalPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const chooseFile = (nextFile) => {
    setMessage('');
    setError('');
    if (!nextFile) {
      setFile(null);
      return;
    }
    if (!ACCEPTED_TYPES.includes(nextFile.type)) {
      setError('فقط عکس‌های JPG، PNG، WEBP یا GIF پذیرفته می‌شوند.');
      return;
    }
    if (nextFile.size > MAX_BYTES) {
      setError('حجم عکس نباید بیشتر از ۸ مگابایت باشد.');
      return;
    }
    setFile(nextFile);
  };

  const uploadImage = async (event) => {
    event.preventDefault();
    if (!file || uploading) return;
    setUploading(true);
    setError('');
    setMessage('');
    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `references/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${extension}`;
    try {
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      });
      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const { error: insertError } = await supabase.from(TABLE).insert({
        title: title.trim() || null,
        storage_path: path,
        image_url: publicData.publicUrl,
        created_by: user?.id ? Number(user.id) : null,
      });
      if (insertError) {
        await supabase.storage.from(BUCKET).remove([path]);
        throw insertError;
      }

      setFile(null);
      setTitle('');
      setMessage('عکس با شماره HEX جدید ذخیره شد.');
      await loadItems();
    } catch (err) {
      setError(err?.message || 'ذخیره عکس انجام نشد. دسترسی سازنده و اتصال را بررسی کنید.');
    } finally {
      setUploading(false);
    }
  };

  const deleteItem = async (item) => {
    if (!window.confirm(`عکس ${item.hex_code} حذف شود؟`)) return;
    setDeletingId(item.id);
    setError('');
    setMessage('');
    try {
      const { error: storageError } = await supabase.storage.from(BUCKET).remove([item.storage_path]);
      if (storageError) throw storageError;
      const { error: rowError } = await supabase.from(TABLE).delete().eq('id', item.id);
      if (rowError) throw rowError;
      setItems(current => current.filter(entry => entry.id !== item.id));
      setMessage(`${item.hex_code} حذف شد.`);
    } catch (err) {
      setError(err?.message || 'حذف عکس ناموفق بود.');
    } finally {
      setDeletingId(null);
    }
  };

  const copyUrl = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      setMessage('آدرس اینترنتی عکس کپی شد.');
    } catch {
      setError('کپی خودکار ممکن نشد؛ آدرس را از پیوند عکس باز کنید.');
    }
  };

  return (
    <div className="space-y-4" dir="rtl">
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Images className="h-5 w-5 text-primary" />
            <div>
              <h3 className="font-bold text-sm">۲۲ · آزمایشگاه چیدمان — کتابخانه تصاویر HEX</h3>
              <p className="text-xs text-muted-foreground mt-1">عکس‌های مرجع را ذخیره کن تا بعداً با شماره HEX یا آدرس اینترنتی به هوش مصنوعی بدهی.</p>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs leading-6">
            هر عکس یک شماره یکتا مانند <strong>HEX-001</strong> می‌گیرد. عکس‌ها در فضای ابری ذخیره می‌شوند و از دستگاه‌های دیگر هم قابل مشاهده‌اند. این بخش به‌تنهایی هیچ تغییری در چیدمان برنامه ایجاد نمی‌کند.
          </div>
          <form onSubmit={uploadImage} className="space-y-3">
            <div>
              <label className="text-xs font-medium block mb-1.5">نام یا توضیح کوتاه (اختیاری)</label>
              <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="مثلاً چیدمان حرفه‌ای داشبورد موبایل" maxLength={120} />
            </div>
            <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border p-5 cursor-pointer hover:border-primary/60 transition-colors">
              <ImagePlus className="h-7 w-7 text-primary" />
              <span className="text-sm font-semibold">{file ? file.name : 'انتخاب عکس از گوشی یا لپ‌تاپ'}</span>
              <span className="text-[11px] text-muted-foreground">JPG · PNG · WEBP · GIF — حداکثر ۸ مگابایت</span>
              <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => chooseFile(event.target.files?.[0] || null)} />
            </label>
            {localPreview && (
              <div className="rounded-xl overflow-hidden border border-border bg-muted/20">
                <img src={localPreview} alt="پیش‌نمایش عکس انتخاب‌شده" className="w-full max-h-72 object-contain" />
                <div className="p-2 flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">پیش‌نمایش قبل از ذخیره</span>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setFile(null)}>لغو انتخاب</Button>
                </div>
              </div>
            )}
            <Button type="submit" className="w-full gap-2" disabled={!file || uploading}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
              {uploading ? 'در حال ذخیره عکس...' : 'ذخیره عکس و دریافت شماره HEX'}
            </Button>
          </form>
          {message && <p className="text-xs text-emerald-600" role="status">{message}</p>}
          {error && <p className="text-xs text-destructive break-words" role="alert">{error}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div>
              <h4 className="font-bold text-sm">تصاویر ذخیره‌شده</h4>
              <p className="text-xs text-muted-foreground">{items.length} تصویر در کتابخانه</p>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={loadItems} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> تازه‌سازی
            </Button>
          </div>
          {loading ? (
            <div className="py-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : items.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">هنوز عکسی ذخیره نشده است. اولین عکس مرجع خودت را اضافه کن.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {items.map(item => (
                <div key={item.id} className="overflow-hidden rounded-xl border border-border bg-card">
                  <a href={item.image_url} target="_blank" rel="noreferrer" className="block bg-muted/30">
                    <img src={item.image_url} alt={item.title || item.hex_code} loading="lazy" className="w-full h-44 object-contain" />
                  </a>
                  <div className="p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-sm tracking-wide">{item.hex_code}</span>
                      <span className="text-[10px] text-muted-foreground">{item.created_at ? new Date(item.created_at).toLocaleDateString('fa-IR') : ''}</span>
                    </div>
                    {item.title && <p className="text-xs text-muted-foreground line-clamp-2">{item.title}</p>}
                    <div className="flex gap-2">
                      <Button type="button" size="sm" variant="outline" className="flex-1 gap-1" onClick={() => copyUrl(item.image_url)}>
                        <Copy className="h-3.5 w-3.5" /> کپی آدرس
                      </Button>
                      <Button type="button" size="sm" variant="outline" className="gap-1" onClick={() => window.open(item.image_url, '_blank', 'noopener,noreferrer')}>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                      <Button type="button" size="sm" variant="destructive" className="gap-1" onClick={() => deleteItem(item)} disabled={deletingId === item.id}>
                        {deletingId === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
