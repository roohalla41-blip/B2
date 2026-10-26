import React, { useState } from 'react';
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle,
} from '@/components/ui/drawer';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ChevronDown } from 'lucide-react';

/**
 * Responsive currency selector:
 * - Desktop: shadcn Select popover (dropdown)
 * - Mobile: vaul bottom sheet (slides up from bottom)
 *
 * `currencies` is an array of [key, label] pairs, e.g. [['AFN','افغانی'], ['USD','دلار']]
 */
export default function CurrencySheet({ value, onValueChange, currencies, label = 'واحد پول' }) {
  const [open, setOpen] = useState(false);
  const selectedLabel = currencies.find(([k]) => k === value)?.[1] || 'انتخاب کنید';

  return (
    <>
      {/* Desktop: shadcn Select popover */}
      <div className="hidden md:block">
        <Select value={value} onValueChange={onValueChange}>
          <SelectTrigger className="h-11 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {currencies.map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Mobile: vaul bottom sheet */}
      <div className="md:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="h-11 w-full flex items-center justify-between rounded-md border border-input bg-transparent px-3 text-sm"
        >
          <span>{selectedLabel}</span>
          <ChevronDown className="w-4 h-4 opacity-50" />
        </button>
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent>
            <DrawerHeader className="text-right">
              <DrawerTitle>{label}</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-6 space-y-1 max-h-[50vh] overflow-y-auto">
              {currencies.map(([k, v]) => (
                <button
                  key={k}
                  onClick={() => { onValueChange(k); setOpen(false); }}
                  className={`w-full text-right px-4 h-12 rounded-lg text-sm transition-colors flex items-center ${
                    value === k ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </>
  );
}