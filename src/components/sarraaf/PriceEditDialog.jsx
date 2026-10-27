import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import CurrencySheet from '@/components/CurrencySheet';
import { computeFinalPrice } from '@/lib/pricingService';

const CURRENCY_LABELS = {
  AFN: 'افغانی',
  IRT: 'تومان',
  USD: 'دلار',
};

/**
 * دیالوگ ویرایش قیمت محصول — با پیش‌نمایش زنده قیمت نهایی.
 * فقط یکی از حالت‌های «افزایش درصدی» یا «کاهش درصدی» قابل انتخاب است.
 */
export default function PriceEditDialog({ product, onSave, onClose }) {
  const [form, setForm] = useState({
    name: '',
    category: '',
    service_name: '',
    product_type: '',
    base_price: 0,
    currency: 'AFN',
    pricing_mode: 'markup',
    pricing_percent: 0,
    is_active: true,
    description: '',
  });

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name || '',
        category: product.category || '',
        service_name: product.service_name || '',
        product_type: product.product_type || '',
        base_price: product.base_price || 0,
        currency: product.currency || 'AFN',
        pricing_mode: product.pricing_mode || 'markup',
        pricing_percent: product.pricing_percent || 0,
        is_active: product.is_active !== false,
        description: product.description || '',
      });
    }
  }, [product]);

  if (!product) return null;

  const finalPrice = computeFinalPrice(
    Number(form.base_price) || 0,
    form.pricing_mode,
    Number(form.pricing_percent) || 0
  );

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSave = () => {
    onSave(product.id, {
      name: form.name,
      base_price: Number(form.base_price) || 0,
      currency: form.currency,
      pricing_mode: form.pricing_mode,
      pricing_percent: Number(form.pricing_percent) || 0,
      is_active: form.is_active,
      description: form.description,
    });
  };

  const sign = form.pricing_mode === 'markup' ? '+' : '-';

  return (
    <Dialog open={!!product} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>ویرایش قیمت محصول</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto scrollbar-thin pl-1">
          <div>
            <Label className="text-xs">نام محصول</Label>
            <Input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              className="mt-1 h-9"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">دسته‌بندی</Label>
              <Input
                value={form.category}
                disabled
                className="mt-1 h-9 bg-muted text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">نوع محصول</Label>
              <Input
                value={form.product_type}
                onChange={(e) => set('product_type', e.target.value)}
                className="mt-1 h-9 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">قیمت پایه (خرید)</Label>
              <Input
                type="number"
                value={form.base_price}
                onChange={(e) => set('base_price', e.target.value)}
                className="mt-1 h-9"
              />
            </div>
            <div>
              <Label className="text-xs">واحد پول</Label>
              <div className="mt-1">
                <CurrencySheet
                  value={form.currency}
                  onValueChange={(v) => set('currency', v)}
                  currencies={Object.entries(CURRENCY_LABELS)}
                />
              </div>
            </div>
          </div>

          {/* روش قیمت‌گذاری — فقط یکی */}
          <div>
            <Label className="text-xs">روش قیمت‌گذاری</Label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <button
                type="button"
                onClick={() => set('pricing_mode', 'markup')}
                className={`py-2 rounded-md text-xs font-medium border transition ${
                  form.pricing_mode === 'markup'
                    ? 'bg-green-600 text-white border-green-600'
                    : 'bg-white text-gray-600 border-gray-300'
                }`}
              >
                افزایش درصدی (+)
              </button>
              <button
                type="button"
                onClick={() => set('pricing_mode', 'discount')}
                className={`py-2 rounded-md text-xs font-medium border transition ${
                  form.pricing_mode === 'discount'
                    ? 'bg-red-600 text-white border-red-600'
                    : 'bg-white text-gray-600 border-gray-300'
                }`}
              >
                کاهش درصدی (−)
              </button>
            </div>
          </div>

          <div>
            <Label className="text-xs">
              درصد {form.pricing_mode === 'markup' ? 'افزایش' : 'کاهش'} (٪)
            </Label>
            <Input
              type="number"
              min="0"
              max="100"
              value={form.pricing_percent}
              onChange={(e) => set('pricing_percent', e.target.value)}
              className="mt-1 h-9"
            />
          </div>

          {/* پیش‌نمایش قیمت نهایی */}
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 space-y-1">
            <p className="text-[11px] text-blue-700 font-medium">پیش‌نمایش قیمت</p>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">قیمت پایه:</span>
              <span className="font-semibold">
                {(Number(form.base_price) || 0).toLocaleString('fa-IR')} {CURRENCY_LABELS[form.currency] || ''}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">درصد تغییر:</span>
              <span className={`font-semibold ${form.pricing_mode === 'markup' ? 'text-green-600' : 'text-red-600'}`}>
                {sign}{Number(form.pricing_percent) || 0}٪
              </span>
            </div>
            <div className="flex items-center justify-between text-sm pt-1 border-t border-blue-200">
              <span className="text-gray-700 font-medium">قیمت نهایی فروش:</span>
              <span className="font-extrabold text-blue-800">
                {finalPrice.toLocaleString('fa-IR')} {CURRENCY_LABELS[form.currency] || ''}
              </span>
            </div>
          </div>

          <div>
            <Label className="text-xs">توضیحات (اختیاری)</Label>
            <Input
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              className="mt-1 h-9 text-xs"
              placeholder="یادداشت داخلی..."
            />
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-xs">وضعیت محصول</Label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">{form.is_active ? 'فعال' : 'غیرفعال'}</span>
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => set('is_active', v)}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>انصراف</Button>
          <Button size="sm" onClick={handleSave}>ذخیره</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}