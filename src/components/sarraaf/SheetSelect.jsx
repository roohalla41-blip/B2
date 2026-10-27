import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { ChevronDown } from 'lucide-react';

/**
 * SheetSelect — responsive select: desktop dropdown, mobile bottom sheet (vaul Drawer).
 *
 * Props:
 *   value          — current value
 *   onValueChange  — callback(value)
 *   options        — array of { value, label, group? }
 *   placeholder    — placeholder text
 *   title          — drawer title (defaults to placeholder)
 *   disabled       — disable interaction
 */
export default function SheetSelect({ value, onValueChange, options = [], placeholder = 'انتخاب کنید', title, disabled }) {
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find(o => o.value === value)?.label || placeholder;
  const drawerTitle = title || placeholder;

  // Group options by optional `group` field
  const groups = {};
  for (const o of options) {
    const g = o.group || '';
    if (!groups[g]) groups[g] = [];
    groups[g].push(o);
  }
  const groupKeys = Object.keys(groups);

  return (
    <>
      {/* Desktop: shadcn Select popover */}
      <div className="hidden md:block">
        <Select value={value} onValueChange={onValueChange} disabled={disabled}>
          <SelectTrigger>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {groupKeys.map(gk => (
              <React.Fragment key={gk || '_default'}>
                {gk && (
                  <div className="px-2 py-1 text-[10px] font-medium text-muted-foreground pointer-events-none">{gk}</div>
                )}
                {groups[gk].map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </React.Fragment>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Mobile: vaul bottom sheet */}
      <div className="md:hidden">
        <button
          type="button"
          onClick={() => !disabled && setOpen(true)}
          disabled={disabled}
          className="h-9 w-full flex items-center justify-between rounded-md border border-input bg-transparent px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className={value ? 'truncate' : 'text-muted-foreground truncate'}>{selectedLabel}</span>
          <ChevronDown className="w-4 h-4 opacity-50 shrink-0" />
        </button>
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent>
            <DrawerHeader className="text-right">
              <DrawerTitle>{drawerTitle}</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-6 space-y-1 max-h-[50vh] overflow-y-auto scrollbar-thin">
              {groupKeys.map(gk => (
                <React.Fragment key={gk || '_default'}>
                  {gk && (
                    <div className="px-2 pt-2 pb-1 text-[10px] font-medium text-muted-foreground">{gk}</div>
                  )}
                  {groups[gk].map(o => (
                    <button
                      key={o.value}
                      onClick={() => { onValueChange(o.value); setOpen(false); }}
                      className={`w-full text-right px-4 h-11 rounded-lg text-sm transition-colors flex items-center ${
                        value === o.value ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </React.Fragment>
              ))}
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </>
  );
}