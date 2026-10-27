import React from 'react';
import { Globe, Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage, LANGUAGES } from '@/lib/i18n';

export default function LanguageSettings() {
  const { lang, setLang } = useLanguage();

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Globe className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-bold">زبان برنامه</h3>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => setLang(l.code)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-colors ${
                lang === l.code
                  ? 'border-primary bg-primary/10 text-primary font-semibold'
                  : 'border-border hover:bg-muted/50'
              }`}
            >
              <span className="text-xl leading-none">{l.flag}</span>
              <span className="text-sm flex-1 text-start">{l.name}</span>
              {lang === l.code && <Check className="w-4 h-4" />}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}