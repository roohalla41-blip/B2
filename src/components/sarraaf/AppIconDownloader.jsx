import React, { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Image as ImageIcon, FileCode2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

/**
 * AppIconDownloader — آیکون برنامه (ترازوی عدالت، طلایی روی نیلی)
 * قابل دانلود به‌صورت SVG و PNG (512×512)
 */
export const APP_ICON_SVG = `<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFE873"/>
      <stop offset="50%" stop-color="#FFD700"/>
      <stop offset="100%" stop-color="#D4AF37"/>
    </linearGradient>
  </defs>
  <!-- پس‌زمینه نیلی گردگوشه -->
  <rect width="512" height="512" rx="112" fill="#002060"/>
  <!-- گره بالای ستون -->
  <circle cx="256" cy="96" r="14" fill="url(#gold)"/>
  <!-- ستون مرکزی عمودی -->
  <rect x="250" y="110" width="12" height="280" rx="4" fill="url(#gold)"/>
  <!-- پایه (پایین ستون) -->
  <path d="M200 390 L312 390 L300 410 L212 410 Z" fill="url(#gold)"/>
  <rect x="180" y="404" width="152" height="12" rx="5" fill="url(#gold)"/>
  <!-- تیر افقی بالایی -->
  <rect x="100" y="160" width="312" height="10" rx="4" fill="url(#gold)"/>
  <!-- نقطه اتصال مرکز تیر -->
  <circle cx="256" cy="165" r="8" fill="url(#gold)"/>
  <!-- ریسمان چپ -->
  <line x1="120" y1="170" x2="120" y2="210" stroke="url(#gold)" stroke-width="5"/>
  <!-- کفه چپ (نیم‌دایره) -->
  <path d="M70 210 L170 210 A50 50 0 0 1 70 210 Z" fill="none" stroke="url(#gold)" stroke-width="6" stroke-linejoin="round"/>
  <!-- ریسمان راست -->
  <line x1="392" y1="170" x2="392" y2="210" stroke="url(#gold)" stroke-width="5"/>
  <!-- کفه راست (نیم‌دایره) -->
  <path d="M342 210 L442 210 A50 50 0 0 1 342 210 Z" fill="none" stroke="url(#gold)" stroke-width="6" stroke-linejoin="round"/>
</svg>`;

export default function AppIconDownloader() {
  const { toast } = useToast();
  const canvasRef = useRef(null);
  const [rendering, setRendering] = useState(false);

  const downloadSVG = () => {
    const blob = new Blob([APP_ICON_SVG], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'app-icon.svg';
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'دانلود SVG', description: 'آیکون با فرمت SVG دانلود شد' });
  };

  const downloadPNG = (size = 512) => {
    setRendering(true);
    try {
      const img = new Image();
      const svgBlob = new Blob([APP_ICON_SVG], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, size, size);
        URL.revokeObjectURL(url);
        canvas.toBlob((blob) => {
          if (!blob) return;
          const dlUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = dlUrl;
          a.download = `app-icon-${size}.png`;
          a.click();
          URL.revokeObjectURL(dlUrl);
          setRendering(false);
          toast({ title: 'دانلود PNG', description: `آیکون ${size}×${size} دانلود شد` });
        }, 'image/png');
      };
      img.onerror = () => {
        setRendering(false);
        toast({ title: 'خطا', description: 'ساخت PNG ناموفق بود', variant: 'destructive' });
      };
      img.src = url;
    } catch (e) {
      setRendering(false);
      toast({ title: 'خطا', description: e.message || 'خطای ناشناخته', variant: 'destructive' });
    }
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">آیکون برنامه</h3>
            <p className="text-xs text-muted-foreground">آیکون رسمی برنامه برای استفاده در پنل Base44 و فروشگاه‌ها</p>
          </div>
          <Download className="w-5 h-5 text-muted-foreground" />
        </div>

        {/* پیش‌نمایش */}
        <div className="flex justify-center bg-muted/40 rounded-xl p-6">
          <div
            className="w-28 h-28 rounded-2xl shadow-lg"
            style={{ background: '#002060' }}
            dangerouslySetInnerHTML={{ __html: APP_ICON_SVG.replace('width="512" height="512"', 'width="100%" height="100%"') }}
          />
        </div>

        {/* دکمه‌های دانلود */}
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" onClick={downloadSVG} disabled={rendering} className="gap-1.5">
            <FileCode2 className="w-4 h-4" />
            SVG
          </Button>
          <Button variant="outline" size="sm" onClick={() => downloadPNG(512)} disabled={rendering} className="gap-1.5">
            <ImageIcon className="w-4 h-4" />
            PNG 512
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={() => downloadPNG(1024)} disabled={rendering} className="gap-1.5 w-full">
          <ImageIcon className="w-4 h-4" />
          PNG 1024
        </Button>

        <p className="text-[11px] text-muted-foreground/70 text-center">
          برای تغییر آیکون در Base44: تنظیمات ← App Settings ← App Icon ← Upload
        </p>
      </CardContent>
    </Card>
  );
}