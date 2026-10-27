import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Check, Smartphone, ChevronLeft, X, LayoutGrid } from 'lucide-react';
import { SARRAAF_PAGES, PROPOSED_BOTTOM_NAV, renderPage } from '@/components/sarraaf/preview/SarraafPagePreviews';

const PHONE_WIDTH = 340;
const PHONE_HEIGHT = 640;

function PhoneFrame({ children }) {
  return (
    <div
      className="relative bg-background rounded-[2.5rem] border-[6px] border-foreground/10 shadow-2xl overflow-hidden mx-auto"
      style={{ width: `${PHONE_WIDTH}px` }}
    >
      {/* Notch */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-foreground/12 rounded-b-2xl z-20" />
      {/* Status bar */}
      <div className="absolute top-0 inset-x-0 h-6 flex items-center justify-between px-6 z-10">
        <span className="text-[9px] font-bold text-foreground/70">۹:۴۱</span>
        <div className="flex items-center gap-1">
          <div className="w-3 h-2 rounded-sm bg-foreground/40" />
          <div className="w-4 h-2 rounded-sm border border-foreground/40" />
        </div>
      </div>
      {/* Content */}
      <div
        className="overflow-y-auto scrollbar-thin px-3 pt-8 pb-20"
        dir="rtl"
        style={{ height: `${PHONE_HEIGHT}px` }}
      >
        {children}
      </div>
      {/* Bottom nav */}
      <BottomNav />
    </div>
  );
}

function BottomNav({ activePage, setActivePage, moreOpen, setMoreOpen }) {
  return (
    <div className="absolute bottom-0 inset-x-0 bg-card/95 backdrop-blur-md border-t border-border flex items-center justify-around px-1 pt-1.5 pb-2 z-10">
      {PROPOSED_BOTTOM_NAV.map(item => {
        const Icon = item.icon;
        const active = activePage === item.key;
        return (
          <button
            key={item.key}
            onClick={() => { setActivePage(item.key); setMoreOpen(false); }}
            className={`flex flex-col items-center gap-0.5 px-1 py-0.5 rounded-lg flex-1 transition-all ${active ? 'text-primary' : 'text-muted-foreground'}`}
          >
            <Icon className="w-[18px] h-[18px]" strokeWidth={active ? 2.4 : 2} />
            <span className={`text-[9px] ${active ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
            {active && <div className="w-1 h-1 rounded-full bg-primary" />}
          </button>
        );
      })}
      {/* More button */}
      <button
        onClick={() => setMoreOpen(!moreOpen)}
        className={`flex flex-col items-center gap-0.5 px-1 py-0.5 rounded-lg flex-1 transition-all ${moreOpen ? 'text-primary' : 'text-muted-foreground'}`}
      >
        <LayoutGrid className="w-[18px] h-[18px]" strokeWidth={moreOpen ? 2.4 : 2} />
        <span className={`text-[9px] ${moreOpen ? 'font-bold' : 'font-medium'}`}>بیشتر</span>
        {moreOpen && <div className="w-1 h-1 rounded-full bg-primary" />}
      </button>
    </div>
  );
}

export default function MobileLayoutPreview() {
  const [activePage, setActivePage] = useState('dashboard');
  const [moreOpen, setMoreOpen] = useState(false);

  const activePageData = SARRAAF_PAGES.find(p => p.key === activePage);
  const groups = [...new Set(SARRAAF_PAGES.map(p => p.group))];
  const bottomKeys = new Set(PROPOSED_BOTTOM_NAV.map(b => b.key));
  const morePages = SARRAAF_PAGES.filter(p => !bottomKeys.has(p.key));

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            <Smartphone className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-bold">پیش‌نمایش موبایل — رابط حرفه‌ای صرافی</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            تجربهٔ موبایل‌محور با نوار پایین فشرده برای دسترسی سریع به عملیات روزانهٔ صرافی.
            تمام داده‌ها نمونه‌ای هستند و هیچ اتصالی به دیتابیس زنده وجود ندارد.
          </p>

          {/* Phone preview */}
          <div className="flex justify-center py-2">
            <div className="relative" style={{ width: `${PHONE_WIDTH}px` }}>
              <PhoneFrame>
                {renderPage(activePage)}
                <p className="text-[9px] text-muted-foreground text-center bg-muted/50 rounded-lg py-1.5 mt-2">
                  ⚠ دادهٔ نمونه — پیش‌نمایش بصری
                </p>
              </PhoneFrame>

              {/* More drawer — categorized */}
              {moreOpen && (
                <div className="absolute inset-0 z-30 bg-black/50 rounded-[2.5rem]" onClick={() => setMoreOpen(false)}>
                  <div
                    className="absolute bottom-20 inset-x-1 bg-card rounded-2xl shadow-2xl max-h-[420px] overflow-y-auto scrollbar-thin"
                    onClick={e => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between px-3 py-2 border-b border-border sticky top-0 bg-card rounded-t-2xl">
                      <span className="text-xs font-bold">سایر بخش‌ها</span>
                      <button onClick={() => setMoreOpen(false)} className="p-1 rounded-lg hover:bg-muted"><X className="w-4 h-4" /></button>
                    </div>
                    <div className="p-2 space-y-2">
                      {groups.map(group => (
                        <div key={group}>
                          <p className="text-[9px] font-bold text-muted-foreground px-1 mb-1">{group}</p>
                          <div className="grid grid-cols-3 gap-1">
                            {SARRAAF_PAGES.filter(p => p.group === group && !bottomKeys.has(p.key)).map(p => {
                              const Icon = p.icon;
                              const active = activePage === p.key;
                              return (
                                <button
                                  key={p.key}
                                  onClick={() => { setActivePage(p.key); setMoreOpen(false); }}
                                  className={`flex flex-col items-center gap-1 rounded-lg p-2 transition-colors ${active ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'}`}
                                >
                                  <Icon className="w-4 h-4" strokeWidth={2} />
                                  <span className="text-[9px] text-center leading-tight">{p.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Page label */}
          <p className="text-center text-xs font-medium text-muted-foreground mt-3">
            {activePageData?.label} — مسیر: {activePageData?.path}
          </p>

          {/* Structure overview */}
          <div className="mt-6 border-t border-border pt-4">
            <h4 className="text-xs font-bold text-foreground mb-2">خلاصهٔ ساختار برنامه</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-[10px]">
              {groups.map(g => (
                <div key={g} className="rounded-lg border border-border bg-muted/30 p-2">
                  <p className="font-bold text-foreground mb-1">{g}</p>
                  <ul className="space-y-0.5 text-muted-foreground">
                    {SARRAAF_PAGES.filter(p => p.group === g).map(p => (
                      <li key={p.key}>• {p.label}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">
              نوار پایین: {PROPOSED_BOTTOM_NAV.map(b => b.label).join('، ')} + دکمه «بیشتر» برای سایر صفحات.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}