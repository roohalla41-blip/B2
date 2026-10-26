import React, { useMemo, useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import SheetSelect from '@/components/sarraaf/SheetSelect';
import { toEnglishDigits } from '@/lib/sarraaf';
import { DEFAULT_CURRENCIES } from '@/lib/defaultCurrencies';

export function Field({ label, required, children, className }) {
  return (
    <div className={className}>
      {label && (
        <Label className="mb-1 block">
          {label} {required && <span className="text-destructive">*</span>}
        </Label>
      )}
      {children}
    </div>
  );
}

export function AmountInput({ value, onChange, placeholder = 'مبلغ', disabled }) {
  const [display, setDisplay] = useState(value ? new Intl.NumberFormat('en-US').format(value) : '');

  useEffect(() => {
    const formatted = value ? new Intl.NumberFormat('en-US').format(value) : '';
    setDisplay(formatted);
  }, [value]);

  const handle = (e) => {
    const raw = toEnglishDigits(e.target.value).replace(/[^\d.]/g, '');
    setDisplay(raw ? new Intl.NumberFormat('en-US').format(parseFloat(raw)) : '');
    onChange(raw ? parseFloat(raw) : 0);
  };
  return (
    <Input
      type="text"
      inputMode="numeric"
      value={display}
      onChange={handle}
      placeholder={placeholder}
      disabled={disabled}
      className="text-left font-mono"
    />
  );
}

// Sort currencies: AFN first, USD second, then others by sort_order
function sortCurrencies(list) {
  return [...list].sort((a, b) => {
    if (a.code === 'AFN') return -1;
    if (b.code === 'AFN') return 1;
    if (a.code === 'USD') return -1;
    if (b.code === 'USD') return 1;
    return (a.sort_order || 0) - (b.sort_order || 0);
  });
}

export function CurrencySelect({ value, onChange, currencies, disabled }) {
  const list = sortCurrencies((currencies && currencies.length > 0 ? currencies : DEFAULT_CURRENCIES).filter(c => c.is_active !== false));
  const fiatList = list.filter(c => c.type !== 'crypto');
  const cryptoList = list.filter(c => c.type === 'crypto');

  const options = [
    ...fiatList.map(c => ({ value: c.code, label: c.symbol ? `${c.symbol} — ${c.name}` : `${c.code} — ${c.name}`, group: 'ارزهای رایج' })),
    ...cryptoList.map(c => ({ value: c.code, label: c.symbol ? `${c.symbol} — ${c.name}` : `${c.code} — ${c.name}`, group: 'دارایی‌های دیجیتال' })),
  ];

  return (
    <SheetSelect
      value={value}
      onValueChange={onChange}
      options={options}
      placeholder="انتخاب ارز"
      title="انتخاب ارز"
      disabled={disabled}
    />
  );
}

export function CounterAccountSelect({ value, onChange, bankAccounts, agents, type, onTypeChange }) {
  const accounts = useMemo(() => {
    if (type === 'bank') return bankAccounts || [];
    if (type === 'agent') return agents || [];
    return [];
  }, [type, bankAccounts, agents]);

  const typeOptions = [
    { value: 'none', label: 'هیچ' },
    { value: 'cash', label: 'صندوق' },
    { value: 'bank', label: 'بانک' },
    { value: 'agent', label: 'نماینده' },
  ];

  const accountOptions = accounts.map(a => ({
    value: a.id,
    label: `${a.bank_name || a.name}${a.holder ? ` - ${a.holder}` : ''}`,
  }));

  return (
    <div className="space-y-2">
      <SheetSelect
        value={type || 'none'}
        onValueChange={onTypeChange}
        options={typeOptions}
        placeholder="حساب مقابل"
        title="نوع حساب مقابل"
      />
      {type !== 'none' && type !== 'cash' && accountOptions.length > 0 && (
        <SheetSelect
          value={value || ''}
          onValueChange={onChange}
          options={accountOptions}
          placeholder="انتخاب حساب"
          title="انتخاب حساب"
        />
      )}
    </div>
  );
}

export function AgentSelect({ value, onChange, agents }) {
  const options = (agents || []).map(a => ({
    value: a.id,
    label: `${a.name}${a.code ? ` (${a.code})` : ''}`,
  }));

  return (
    <SheetSelect
      value={value || ''}
      onValueChange={onChange}
      options={options}
      placeholder="نماینده"
      title="انتخاب نماینده"
    />
  );
}

export function parseCounter(type, id) {
  return { counter_type: type || 'none', counter_id: id || null };
}