import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { getTerms, hasAcceptedTerms, acceptTerms } from '@/lib/termsService';
import { Button } from '@/components/ui/button';
import { ScrollText, Check, Loader2 } from 'lucide-react';

export default function TermsGate({ children, role }) {
  const { user } = useAuth();
  const [terms, setTerms] = useState(null);
  const [accepted, setAccepted] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const t = await getTerms();
      if (!mounted) return;
      setTerms(t);
      setAccepted(hasAcceptedTerms(user?.id, t.version));
      setChecked(true);
    })();
    return () => { mounted = false; };
  }, [user?.id]);

  const handleAccept = () => {
    acceptTerms(user?.id, terms.version);
    setAccepted(true);
  };

  if (!checked || accepted) return children;

  const text = role === 'customer' ? terms.customer : terms.sarraaf;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      <div className="flex items-center gap-2 p-4 border-b border-border">
        <ScrollText className="w-5 h-5 text-primary shrink-0" />
        <h2 className="font-bold text-sm">قوانین و مقررات</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
        <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
          {text}
        </div>
      </div>

      <div className="border-t border-border p-4 space-y-2 safe-bottom">
        <Button className="w-full h-11" onClick={handleAccept}>
          <Check className="w-4 h-4" />
          موافقم — ادامه
        </Button>
        <p className="text-xs text-center text-muted-foreground">
          با ادامه، شما قوانین و مقررات را می‌پذیرید.
        </p>
      </div>
    </div>
  );
}