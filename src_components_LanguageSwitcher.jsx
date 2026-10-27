import React, { useState, useRef, useEffect } from 'react';
import { Globe, Check } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { useLanguages } from '@/lib/useLanguages';

export default function LanguageSwitcher({ compact = false, variant = 'light' }) {
  const { lang, setLang } = useLanguage();
  const { languages } = useLanguages();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = languages.find((l) => l.code === lang) || languages[0];
  const dark = variant === 'dark';

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const btnCls = dark
    ? 'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors'
    : 'flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-accent transition-colors';
  const btnStyle = dark
    ? {
        borderColor: 'rgba(201,162,75,0.5)',
        background: 'rgba(201,162,75,0.06)',
        color: '#e8c875',
      }
    : undefined;

  const menuCls = dark
    ? 'absolute end-0 mt-2 w-44 rounded-lg shadow-lg z-50 overflow-hidden'
    : 'absolute end-0 mt-2 w-44 rounded-lg border border-border bg-popover shadow-lg z-50 overflow-hidden';
  const menuStyle = dark
    ? {
        borderColor: 'rgba(201,162,75,0.4)',
        background: '#1a1d26',
        borderWidth: 1,
        borderStyle: 'solid',
      }
    : undefined;

  const itemActiveCls = dark ? 'font-semibold' : 'bg-accent/50 font-semibold';
  const itemActiveStyle = dark ? { background: 'rgba(201,162,75,0.14)' } : undefined;
  const itemHoverCls = dark ? '' : 'hover:bg-accent';
  const itemStyle = dark ? { color: '#e8c875' } : undefined;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={btnCls}
        style={btnStyle}
      >
        <Globe className="h-4 w-4" />
        <span className="text-lg leading-none">{current?.flag}</span>
        {!compact && <span className="hidden sm:inline">{current?.name}</span>}
      </button>
      {open && (
        <div className={menuCls} style={menuStyle}>
          {languages.map((l) => (
            <button
              key={l.code}
              onClick={() => {
                setLang(l.code);
                setOpen(false);
                setTimeout(() => window.location.reload(), 100);
              }}
              className={`flex items-center gap-3 w-full px-4 py-2.5 text-sm transition-colors ${itemHoverCls} ${
                lang === l.code ? itemActiveCls : ''
              }`}
              style={lang === l.code ? { ...itemStyle, ...itemActiveStyle } : itemStyle}
            >
              <span className="text-lg leading-none">{l.flag}</span>
              <span className="flex-1 text-start">{l.name}</span>
              {lang === l.code && <Check className="h-4 w-4" style={dark ? { color: '#e8c875' } : undefined} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}