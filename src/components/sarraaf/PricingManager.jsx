import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';
import {
  getAllProducts, seedProducts, updateProduct, deleteProduct,
  toggleProductActive, getChangeHistory, addProduct, getCategories,
} from '@/lib/pricingService';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Tag, Plus, Search, Pencil, Trash2, History, TrendingUp, TrendingDown, Package,
} from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import CurrencySheet from '@/components/CurrencySheet';
import PriceEditDialog from './PriceEditDialog';

const CURRENCY_LABELS = { AFN: 'افغانی', IRT: 'تومان', USD: 'دلار' };

/**
 * مدیریت قیمت خدمات و محصولات دیجیتال — پنل سازنده
 * سازنده می‌تواند قیمت پایه، درصد افزایش/کاهش و وضعیت هر محصول را مدیریت کند.
 * قیمت نهایی به‌صورت خودکار محاسبه و در پنل مشتری نمایش داده می‌شود.
 */
export default function PricingManager() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [editProduct, setEditProduct] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [historyProduct, setHistoryProduct] = useState(null);

  const refresh = useCallback(() => {
    seedProducts();
    setProducts(getAllProducts());
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const categories = getCategories();

  const filtered = products.filter((p) => {
    const matchSearch = !search || p.name.includes(search) || (p.service_name || '').includes(search);
    const matchCat = filterCat === 'all' || p.category === filterCat;
    return matchSearch && matchCat;
  });

  const handleSave = (id, data) => {
    updateProduct(id, data, user?.full_name || 'سازنده');
    setEditProduct(null);
    refresh();
  };

  const handleToggle = (id) => {
    toggleProductActive(id, user?.full_name || 'سازنده');
    refresh();
  };

  const handleDelete = (id) => {
    if (confirm('آیا از حذف این محصول مطمئن هستید؟')) {
      deleteProduct(id);
      refresh();
    }
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-bold">مدیریت قیمت خدمات و محصولات</h3>
          </div>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4" />
            افزودن محصول جدید
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[120px]">
            <Search className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجوی محصول..."
              className="pr-8 h-9 text-sm"
            />
          </div>
          {/* Desktop: Select popover */}
          <div className="hidden md:block">
            <Select
              value={filterCat}
              onValueChange={(v) => setFilterCat(v)}
            >
              <SelectTrigger className="h-11 w-[140px] text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه دسته‌ها</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.key} value={c.key}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Mobile: vaul bottom sheet */}
          <div className="md:hidden">
            <CurrencySheet
              value={filterCat === 'all' ? '' : filterCat}
              onValueChange={(v) => setFilterCat(v)}
              currencies={[['all', 'همه دسته‌ها'], ...categories.map(c => [c.key, c.name])]}
              label="دسته‌بندی"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-muted p-2">
            <p className="text-xs text-muted-foreground">کل محصولات</p>
            <p className="text-lg font-bold">{products.length.toLocaleString('fa-IR')}</p>
          </div>
          <div className="rounded-lg bg-green-50 p-2">
            <p className="text-xs text-green-600">فعال</p>
            <p className="text-lg font-bold text-green-700">
              {products.filter((p) => p.is_active).length.toLocaleString('fa-IR')}
            </p>
          </div>
          <div className="rounded-lg bg-amber-50 p-2">
            <p className="text-xs text-amber-600">غیرفعال</p>
            <p className="text-lg font-bold text-amber-700">
              {products.filter((p) => !p.is_active).length.toLocaleString('fa-IR')}
            </p>
          </div>
        </div>

        {/* Product List */}
        <div className="space-y-2">
          {filtered.length === 0 && (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
              محصولی یافت نشد
            </div>
          )}
          {filtered.map((p) => (
            <div
              key={p.id}
              className={`rounded-lg border p-3 ${p.is_active ? 'bg-white' : 'bg-gray-50 opacity-60'}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold truncate">{p.name}</span>
                    <span className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                      {p.category_name}
                    </span>
                    {p.pricing_mode === 'markup' ? (
                      <span className="text-xs text-green-600 flex items-center gap-0.5">
                        <TrendingUp className="w-3 h-3" /> +{p.pricing_percent}٪
                      </span>
                    ) : (
                      <span className="text-xs text-red-600 flex items-center gap-0.5">
                        <TrendingDown className="w-3 h-3" /> −{p.pricing_percent}٪
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <span>پایه: {(p.base_price || 0).toLocaleString('fa-IR')}</span>
                    <span>→</span>
                    <span className="font-bold text-blue-700">
                      {(p.final_price || 0).toLocaleString('fa-IR')} {CURRENCY_LABELS[p.currency] || ''}
                    </span>
                  </div>
                  {p.description && (
                    <p className="text-xs text-gray-400 mt-1 truncate">{p.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Switch
                    checked={p.is_active}
                    onCheckedChange={() => handleToggle(p.id)}
                  />
                  <Button
                    variant="ghost" size="icon" className="h-7 w-7"
                    onClick={() => setHistoryProduct(p)}
                    title="سابقه تغییرات"
                  >
                    <History className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost" size="icon" className="h-7 w-7"
                    onClick={() => setEditProduct(p)}
                    title="ویرایش قیمت"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost" size="icon" className="h-7 w-7 text-red-500"
                    onClick={() => handleDelete(p.id)}
                    title="حذف"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>

      {/* Edit Dialog */}
      {editProduct && (
        <PriceEditDialog
          product={editProduct}
          onSave={handleSave}
          onClose={() => setEditProduct(null)}
        />
      )}

      {/* Add Product Dialog */}
      {addOpen && (
        <AddProductDialog
          onClose={() => setAddOpen(false)}
          onAdd={(data) => {
            addProduct(data);
            setAddOpen(false);
            refresh();
          }}
        />
      )}

      {/* History Dialog */}
      {historyProduct && (
        <HistoryDialog
          product={historyProduct}
          onClose={() => setHistoryProduct(null)}
        />
      )}
    </Card>
  );
}

// ── دیالوگ افزودن محصول جدید ──
function AddProductDialog({ onClose, onAdd }) {
  const [form, setForm] = useState({
    name: '',
    category: 'custom',
    category_name: 'سایر',
    service_name: '',
    product_type: 'Service',
    base_price: 0,
    currency: 'AFN',
    pricing_mode: 'markup',
    pricing_percent: 0,
    is_active: true,
    description: '',
  });

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>افزودن محصول جدید</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto scrollbar-thin pl-1">
          <div>
            <Label className="text-xs">نام محصول</Label>
            <Input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              className="mt-1 h-9"
              placeholder="مثال: بسته اینترنت جدید"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">دسته‌بندی</Label>
              <Input
                value={form.category_name}
                onChange={(e) => {
                  set('category_name', e.target.value);
                  set('category', e.target.value);
                }}
                className="mt-1 h-9 text-xs"
                placeholder="مثال: بازی‌ها"
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
              <Label className="text-xs">قیمت پایه</Label>
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
                افزایش درصدی
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
                کاهش درصدی
              </button>
            </div>
          </div>
          <div>
            <Label className="text-xs">درصد (٪)</Label>
            <Input
              type="number"
              min="0"
              max="100"
              value={form.pricing_percent}
              onChange={(e) => set('pricing_percent', e.target.value)}
              className="mt-1 h-9"
            />
          </div>
          <div>
            <Label className="text-xs">توضیحات (اختیاری)</Label>
            <Input
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              className="mt-1 h-9 text-xs"
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>انصراف</Button>
          <Button
            size="sm"
            onClick={() => onAdd(form)}
            disabled={!form.name}
          >
            افزودن محصول
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── دیالوگ سابقه تغییرات ──
function HistoryDialog({ product, onClose }) {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    setHistory(getChangeHistory(product.id));
  }, [product.id]);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>سابقه تغییرات قیمت</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 max-h-[60vh] overflow-y-auto scrollbar-thin">
          <p className="text-sm font-medium">{product.name}</p>
          {history.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-6">
              تغییراتی ثبت نشده است
            </p>
          ) : (
            history.map((h) => (
              <div key={h.id} className="rounded-lg border p-2 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">
                    {new Date(h.timestamp).toLocaleString('fa-IR')}
                  </span>
                  <span className="text-xs text-muted-foreground">{h.changed_by}</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-gray-500">قیمت:</span>
                  <span className="line-through text-gray-400">
                    {(h.old_final_price || 0).toLocaleString('fa-IR')}
                  </span>
                  <span>→</span>
                  <span className="font-bold text-blue-700">
                    {(h.new_final_price || 0).toLocaleString('fa-IR')}
                  </span>
                </div>
                <div className="text-xs text-gray-400">
                  درصد: {h.old_percent}٪ ({h.old_mode === 'markup' ? 'افزایش' : 'کاهش'})
                  → {h.new_percent}٪ ({h.new_mode === 'markup' ? 'افزایش' : 'کاهش'})
                </div>
              </div>
            ))
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>بستن</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}