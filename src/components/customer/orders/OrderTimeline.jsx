import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Check } from 'lucide-react';

const STEP_ORDER = ['registered', 'review', 'approved', 'processing', 'completed'];

export default function OrderTimeline({ timeline, status }) {
  if (!timeline || timeline.length === 0) return null;

  // For rejected/cancelled, show only the done steps
  const isTerminal = status === 'rejected' || status === 'cancelled';

  return (
    <Card className="shadow-sm">
      <CardContent className="p-3">
        <p className="text-[10px] text-muted-foreground mb-3">مراحل انجام سفارش</p>
        <div className="flex items-start justify-between">
          {timeline.map((step, idx) => {
            const isLast = idx === timeline.length - 1;
            return (
              <div key={step.step} className="flex flex-col items-center flex-1 min-w-0">
                <div className="flex items-center w-full">
                  {idx > 0 && (
                    <div className={`flex-1 h-0.5 ${timeline[idx - 1].done ? 'bg-success' : 'bg-border'}`} />
                  )}
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                    step.done
                      ? (isTerminal && isLast ? 'bg-destructive text-destructive-foreground' : 'bg-success text-success-foreground')
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {step.done ? <Check className="w-3.5 h-3.5" /> : <span className="text-[9px]">{idx + 1}</span>}
                  </div>
                  {idx < timeline.length - 1 && (
                    <div className={`flex-1 h-0.5 ${step.done ? 'bg-success' : 'bg-border'}`} />
                  )}
                </div>
                <p className={`text-[9px] mt-1 text-center ${step.done ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                  {step.label}
                </p>
                {step.date && (
                  <p className="text-[8px] text-muted-foreground text-center">
                    {new Date(step.date).toLocaleDateString('fa-IR')}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}