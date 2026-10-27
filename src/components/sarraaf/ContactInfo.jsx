import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { getContactSettings, getContactUrl } from '@/lib/contactSettings';
import { useToast } from '@/components/ui/use-toast';
import { useLanguage } from '@/lib/i18n';
import ContactBrandIcon from './ContactBrandIcon';

export default function ContactInfo({ compact = false }) {
  const { toast } = useToast();
  const { t } = useLanguage();
  const { data: contacts, isLoading } = useQuery({
    queryKey: ['contactSettings'],
    queryFn: getContactSettings,
  });

  const visible = (contacts || []).filter(c => c.is_active && c.value && c.value.trim() !== '');

  function handleClick(type, value) {
    if (!value) {
      toast({ title: t('contact.not_set'), description: t('contact.not_set_desc') });
      return;
    }
    const url = getContactUrl(type, value);
    if (url === '#') return;
    window.open(url, '_blank');
  }

  if (isLoading || visible.length === 0) return null;

  return (
    <Card className={compact ? "shadow-none border-0 bg-transparent" : ""}>
      <CardContent className={compact ? "p-1" : "p-3"}>
        <p className={compact ? "text-[11px] font-semibold text-muted-foreground mb-1" : "text-xs font-semibold text-muted-foreground mb-2"}>{t('contact.title')}</p>
        <div className={compact ? "grid grid-cols-4 gap-1" : "grid grid-cols-4 gap-2"}>
          {visible.map((c) => {
            const translated = t(`contact.${c.type}`);
            const label = translated && translated !== `contact.${c.type}` ? translated : c.label;
            return (
              <button
                key={c.type}
                onClick={() => handleClick(c.type, c.value)}
                className={compact ? "flex flex-col items-center gap-0.5 p-1 rounded-lg border border-border/70 hover:bg-muted/50 transition-colors" : "flex flex-col items-center gap-1.5 p-2 rounded-xl border border-border hover:bg-muted/50 transition-colors"}
              >
                <ContactBrandIcon type={c.type} className={compact ? "w-6 h-6" : "w-10 h-10"} />
                <span className={compact ? "text-[9px] leading-tight text-muted-foreground" : "text-[10px] text-muted-foreground"}>{label}</span>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}