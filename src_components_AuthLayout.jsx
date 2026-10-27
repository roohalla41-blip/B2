import React from 'react';

/**
 * AuthLayout — چیدمان مشترک و حرفه‌ای صفحات احراز هویت
 */
export default function AuthLayout({ icon: Icon, title, subtitle, footer, children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-primary/5 to-muted/30 px-4 py-8 relative overflow-hidden">
      {/* دکوراسیون محیطی */}
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-primary/[0.06] blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-5%] right-[-5%] w-[400px] h-[400px] rounded-full bg-primary/[0.04] blur-[100px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        {Icon && (
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
              <Icon className="w-7 h-7 text-primary" aria-hidden="true" />
            </div>
            {title && <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>}
            {subtitle && <p className="text-muted-foreground mt-2 text-sm">{subtitle}</p>}
          </div>
        )}
        <div className="bg-card rounded-2xl shadow-card border border-border p-8">
          {children}
        </div>
        {footer && (
          <p className="text-center text-sm text-muted-foreground mt-6">{footer}</p>
        )}
      </div>
    </div>
  );
}