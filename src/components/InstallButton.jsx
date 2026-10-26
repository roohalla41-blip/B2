import React, { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import { usePwaInstall } from '@/lib/usePwaInstall';
import NativeInstallOverlay from '@/components/NativeInstallOverlay';
import IosInstallGuide from '@/components/IosInstallGuide';
import AndroidInstallGuide from '@/components/AndroidInstallGuide';

/**
 * InstallButton — دکمهٔ «نصب برنامه» برای هر کاربری که برنامه را نصب نکرده است.
 * - اگر مرورگر نصب بومی بدهد: پنجرهٔ بومی + وضعیت «در حال نصب…» + تأیید با appinstalled
 * - اگر ندهد (مثل iOS Safari): راهنمای شفاف افزودن به صفحهٔ اصلی
 */
export default function InstallButton() {
  const { canInstall, installed, promptInstall, platform } = usePwaInstall();
  const [status, setStatus] = useState('idle'); // idle | prompting | installing | installed | dismissed
  const [elapsed, setElapsed] = useState(0);
  const [showGuide, setShowGuide] = useState(false);

  // شمارش ثانیه‌های سپری‌شده در حین نصب
  useEffect(() => {
    if (status !== 'installing') return;
    setElapsed(0);
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [status]);

  // رویداد appinstalled = تأیید واقعی پایان نصب
  useEffect(() => {
    if (installed && status === 'installing') setStatus('installed');
  }, [installed, status]);

  const handleClick = async () => {
    if (!canInstall) {
      setShowGuide(true);
      return;
    }
    setStatus('prompting');
    const outcome = await promptInstall();
    setStatus(outcome === 'accepted' ? 'installing' : 'dismissed');
  };

  return (
    <>
      {!installed && (
        <button
          onClick={handleClick}
          className="fixed bottom-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-[#c9a24b] text-[#17140e] text-sm font-bold px-5 py-2.5 rounded-full shadow-lg shadow-black/30 transition-transform active:scale-95 mb-[env(safe-area-inset-bottom)]"
        >
          <Download className="w-4 h-4" />
          نصب برنامه
        </button>
      )}

      <NativeInstallOverlay status={status} elapsed={elapsed} onClose={() => setStatus('idle')} />

      {showGuide && platform === 'ios' && <IosInstallGuide onClose={() => setShowGuide(false)} />}
      {showGuide && platform !== 'ios' && (
        <AndroidInstallGuide desktop={platform === 'desktop'} onClose={() => setShowGuide(false)} />
      )}
    </>
  );
}