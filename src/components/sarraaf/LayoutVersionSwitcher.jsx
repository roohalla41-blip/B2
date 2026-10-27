import React from 'react';
import { Layers, RotateCcw, Check } from 'lucide-react';
import { useLayoutVersion } from '@/lib/LayoutVersionContext';
import { cn } from '@/lib/utils';

export default function LayoutVersionSwitcher({ className }) {
  const { isV2, switchToV1, switchToV2 } = useLayoutVersion();

  return (
    <div className={cn('flex items-center gap-1 p-1 rounded-lg bg-muted', className)}>
      <button
        onClick={switchToV1}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors',
          !isV2 ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <RotateCcw className="w-3 h-3" />
        نسخهٔ فعلی
      </button>
      <button
        onClick={switchToV2}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors',
          isV2 ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <Layers className="w-3 h-3" />
        نسخهٔ حرفه‌ای
        {isV2 && <Check className="w-3 h-3 text-emerald-500" />}
      </button>
    </div>
  );
}