import React from 'react';
import { Check } from 'lucide-react';
import { Image } from '@/components/ui/image';
import { UC_ICON_URL } from '@/lib/ucApi';

/**
 * کارت محصول بازی — UC پابجی، الماس IMO و سایر خدمات
 * بنر بنفش با نام بسته، تصویر محصول، قیمت خط‌خورده و قیمت نهایی، دکمه «انتخاب».
 */
export default function UCCard({ pkg, selected, onSelect }) {
  if (!pkg) return null;
  const original = pkg.original_price || pkg.price;
  const hasDiscount = pkg.original_price && pkg.original_price > pkg.price;
  const discountPct = hasDiscount
    ? Math.round(((pkg.original_price - pkg.price) / pkg.original_price) * 100)
    : 0;
  const badge = pkg.badge;

  return (
    <div
      className={`relative bg-white rounded-2xl shadow-md overflow-hidden transition-all duration-200 ${
        selected ? 'ring-2 ring-purple-600 ring-offset-2' : ''
      } ${!pkg.is_active ? 'opacity-50' : ''}`}
    >
      {/* Discount Badge */}
      {hasDiscount && (
        <div className="absolute top-2 left-2 z-10 bg-red-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
          {discountPct}٪ تخفیف
        </div>
      )}

      {/* Purple Banner with amount */}
      <div className="bg-gradient-to-l from-purple-700 to-purple-600 px-3 py-2 text-center">
        {badge ? (
          <span className="text-white font-extrabold text-[13px] leading-tight block">
            {badge}
          </span>
        ) : (
          <span className="text-white font-extrabold text-base leading-tight block truncate">
            {pkg.name}
          </span>
        )}
      </div>

      {/* Product Image */}
      <div className="relative flex items-center justify-center py-3 bg-gradient-to-b from-amber-50/50 to-white">
        {/* UC Badge Icon — گوشه کارت */}
        <Image
          src={UC_ICON_URL}
          alt="UC پابجی موبایل"
          fittingType="fit"
          className="absolute top-1 right-1 w-6 h-6 object-contain drop-shadow-sm"
        />
        {pkg.image ? (
          <Image
            src={pkg.image}
            alt={pkg.name}
            fittingType="fit"
            className="h-20 w-auto object-contain"
          />
        ) : (
          <Image
            src={UC_ICON_URL}
            alt={pkg.name}
            fittingType="fit"
            className="h-16 w-auto object-contain"
          />
        )}
      </div>

      {/* Title */}
      <div className="px-3 pb-1 text-center">
        <p className="text-[11px] font-bold text-gray-800 truncate">
          خرید {pkg.name}
        </p>
      </div>

      {/* Pricing — قیمت نهایی از سیستم قیمت‌گذاری */}
      <div className="px-3 pb-2 text-center space-y-0.5">
        <p className="text-sm font-extrabold text-gray-900">
          {(pkg.price || 0).toLocaleString('fa-IR')} {pkg.currency === 'AFN' ? 'افغان' : 'تومان'}
        </p>
      </div>

      {/* Select Button */}
      <div className="px-3 pb-3">
        <button
          onClick={() => pkg.is_active && onSelect?.(pkg)}
          disabled={!pkg.is_active}
          className={`w-full py-2 rounded-full text-white text-xs font-bold flex items-center justify-center gap-1 transition-all ${
            selected
              ? 'bg-gradient-to-l from-purple-800 to-purple-700'
              : 'bg-gradient-to-l from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700 active:scale-95'
          } disabled:cursor-not-allowed`}
        >
          {selected ? (
            <>
              <Check className="w-3.5 h-3.5" />
              انتخاب شد
            </>
          ) : (
            'انتخاب'
          )}
        </button>
      </div>
    </div>
  );
}