import React, { useState, useEffect } from 'react';
import { Palette, Moon, Sun, Monitor, Check } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage, LANGUAGES } from '@/lib/i18n';
import { useCurrencies } from '@/lib/useSarraaf';
import SettingsSection from './SettingsSection';
import LayoutVersionSwitcher from '@/components/sarraaf/LayoutVersionSwitcher';

const PREFS_KEY = 'sarraaf_preferences';

function loadPrefs() {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
  } catch {
    return {};
  }
}

function savePrefs(prefs) {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

const THEMES = [
  { value: 'light', label: 'روشن', icon: Sun },
  { value: 'dark', label: 'تاریک', icon: Moon },
  { value: 'system', label: 'سیستم', icon: Monitor },
];

const NUMBER_FORMATS = [
  { value: 'fa', label: 'فارسی (۱۲۳۴)' },
  { value: 'en', label: 'انگلیسی (1234)' },
];

const ROUNDING_MODES = [
  { value: 'none', label: 'بدون گرد کردن' },
  { value: 'up', label: 'گرد کردن به بالا' },
  { value: 'down', label: 'گرد کردن به پایین' },
  { value: 'nearest', label: 'نزدیک‌ترین عدد' },
];

export default function PreferencesSection() {
  const { theme, setTheme } = useTheme();
  const { lang, setLang } = useLanguage();
  const { data: currencies } = useCurrencies();
  const [prefs, setPrefs] = useState(loadPrefs);

  useEffect(() => {
    savePrefs(prefs);
  }, [prefs]);

  const update = (key, value) => setPrefs(prev => ({ ...prev, [key]: value }));

  return (
    <SettingsSection
      icon={Palette}
      title="ترجیحات نمایش و مالی"
      description="تنظیمات نمایش و رفتار برنامه"
    >
      <div className="space-y-4">
        {/* Theme */}
        <div>
          <Label className="text-xs font-medium mb-2 block">تم برنامه</Label>
          <div className="grid grid-cols-3 gap-2">
            {THEMES.map(t => {
              const Icon = t.icon;
              const active = theme === t.value;
              return (
                <button
                  key={t.value}
                  onClick={() => setTheme(t.value)}
                  className={`flex flex-col items-center gap-1.5 px-2 py-3 rounded-lg border transition-colors ${
                    active ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-[11px] font-medium">{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Language */}
        <div>
          <Label className="text-xs font-medium mb-2 block">زبان برنامه</Label>
          <div className="grid grid-cols-2 gap-2">
            {LANGUAGES.map(l => (
              <button
                key={l.code}
                onClick={() => setLang(l.code)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border transition-colors ${
                  lang === l.code
                    ? 'border-primary bg-primary/10 text-primary font-semibold'
                    : 'border-border hover:bg-muted/50'
                }`}
              >
                <span className="text-lg leading-none">{l.flag}</span>
                <span className="text-xs flex-1 text-start">{l.name}</span>
                {lang === l.code && <Check className="w-3.5 h-3.5" />}
              </button>
            ))}
          </div>
        </div>

        {/* Number format */}
        <div className="flex items-center justify-between gap-3">
          <Label className="text-xs font-medium">فرمت اعداد</Label>
          <Select value={prefs.numberFormat || 'fa'} onValueChange={v => update('numberFormat', v)}>
            <SelectTrigger className="w-36 h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {NUMBER_FORMATS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Default currency */}
        <div className="flex items-center justify-between gap-3">
          <Label className="text-xs font-medium">ارز پیش‌فرض</Label>
          <Select value={prefs.defaultCurrency || 'AFN'} onValueChange={v => update('defaultCurrency', v)}>
            <SelectTrigger className="w-36 h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(currencies || []).map(c => <SelectItem key={c.code} value={c.code}>{c.code} — {c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Rounding mode */}
        <div className="flex items-center justify-between gap-3">
          <Label className="text-xs font-medium">گرد کردن مبالغ</Label>
          <Select value={prefs.roundingMode || 'none'} onValueChange={v => update('roundingMode', v)}>
            <SelectTrigger className="w-40 h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ROUNDING_MODES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Show/hide profit-loss */}
        <div className="flex items-center justify-between gap-3 py-1">
          <div>
            <Label className="text-xs font-medium">نمایش سود و زیان</Label>
            <p className="text-[10px] text-muted-foreground">نمایش یا مخفی کردن سود و زیان در داشبورد</p>
          </div>
          <Switch
            checked={prefs.showProfitLoss !== false}
            onCheckedChange={v => update('showProfitLoss', v)}
          />
        </div>

        {/* Layout version */}
        <div className="flex items-center justify-between gap-3 py-1">
          <div>
            <Label className="text-xs font-medium">نسخهٔ چیدمان داشبورد</Label>
            <p className="text-[10px] text-muted-foreground">انتخاب بین چیدمان فعلی و نسخهٔ حرفه‌ای جدید</p>
          </div>
          <LayoutVersionSwitcher />
        </div>
      </div>
    </SettingsSection>
  );
}