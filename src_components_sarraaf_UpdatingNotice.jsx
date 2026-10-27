import React from 'react';
import { Loader2 } from 'lucide-react';

export default function UpdatingNotice({ message }) {
  return (
    <div className="mt-6 flex items-center justify-center gap-2 py-4 px-4 rounded-xl bg-muted/50 border border-dashed border-muted-foreground/20">
      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      <p className="text-xs text-muted-foreground text-center">
        {message || 'این بخش در حال به‌روزرسانی است و به‌زودی تکمیل خواهد شد.'}
      </p>
    </div>
  );
}