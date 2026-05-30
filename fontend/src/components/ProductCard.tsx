import React from 'react';
import { useTranslation } from 'react-i18next';
import type { NormalizedShopProduct } from '../types/product';
import { resolveImageUrl, fallbackProductImage } from '../utils/imageUrl';
import { HotDealCountdown } from './HotDealCountdown/HotDealCountdown';

interface ProductCardProps {
  product: NormalizedShopProduct;
  isWished?: boolean;
  loading?: boolean;
  onClick?: (product: NormalizedShopProduct) => void;
  onAddToCart?: (product: NormalizedShopProduct) => void;
  onToggleWishlist?: (product: NormalizedShopProduct) => void;
}

const ProductCardSkeleton: React.FC = () => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 animate-pulse h-full flex flex-col">
      <div className="aspect-square rounded-xl bg-slate-200" />
      <div className="mt-3 h-4 rounded bg-slate-200" />
      <div className="mt-2 h-4 w-3/4 rounded bg-slate-200" />
      <div className="mt-3 h-5 w-1/2 rounded bg-slate-200" />
      <div className="mt-auto pt-3 h-9 rounded-xl bg-slate-200" />
    </div>
  );
};

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  isWished = false,
  loading = false,
  onClick,
  onAddToCart,
  onToggleWishlist,
}) => {
  const { t } = useTranslation();
  if (loading) return <ProductCardSkeleton />;

  const safeName = product.name || t('common.product');
  const safePrice = Number(product.effective_price !== undefined ? product.effective_price : product.price) || 0;
  const safeOriginal = Number(product.original_price) || 0;
  const safeDiscount = Number(product.discount_percent) || 0;
  const safeRating = Number(product.rating) || 0;
  const safeStock = Math.max(0, Number(product.stock) || 0);
  const isOutOfStock = Boolean(product.isOutOfStock || safeStock <= 0);
  const isHotDeal = product.pricing_source === 'HOT_DEAL' || !!product.active_hot_deal;
  const showDiscount = safeDiscount > 0 || (safeOriginal > safePrice && safeOriginal > 0);

  return (
    <article
      className="group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg sm:p-4"
      onClick={() => onClick?.(product)}
    >
      <div className="absolute left-3 top-3 z-20 flex flex-col gap-1">
        {isHotDeal && (
          <span className="rounded bg-amber-500 px-2 py-0.5 text-[10px] font-bold uppercase text-white shadow-sm flex items-center gap-0.5 animate-pulse">
            <span className="material-symbols-outlined text-[10px]">local_fire_department</span>
            {product.active_hot_deal?.badge_text || 'Hot Deal'}
          </span>
        )}
        {showDiscount && !isHotDeal && (
          <span className="rounded bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
            -{safeDiscount}%
          </span>
        )}
        {isOutOfStock && (
          <span className="rounded bg-slate-700 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
            {t('common.outOfStock')}
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleWishlist?.(product);
        }}
        className="absolute right-3 top-3 z-20 rounded-full bg-white/90 p-1.5 shadow"
        aria-label="toggle-favorite"
      >
        <span className={`material-symbols-outlined text-[18px] ${isWished ? 'text-red-500' : 'text-slate-400'}`}>
          {isWished ? 'favorite' : 'favorite_border'}
        </span>
      </button>

      <div className="relative w-full aspect-square overflow-hidden rounded-xl bg-slate-100">
        <img
          src={resolveImageUrl(product.image)}
          alt={safeName}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = fallbackProductImage;
          }}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
      </div>

      <div className="flex flex-1 flex-col pt-3">
        {isHotDeal && product.active_hot_deal?.end_date && (
          <div className="mb-2 px-2 py-1 bg-red-50 rounded-lg border border-red-100">
            <HotDealCountdown endDate={product.active_hot_deal.end_date} />
          </div>
        )}
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 line-clamp-1">{product.categoryShop || t('common.other')}</p>
        <h3 className="mt-1 min-h-10 text-sm font-semibold leading-5 text-slate-900 line-clamp-2">{safeName}</h3>

        <div className="mt-2 flex items-center gap-1 text-xs text-amber-500">
          <span className="material-symbols-outlined text-[14px]">star</span>
          <span className="font-semibold text-slate-700">{safeRating.toFixed(1)}</span>
          <span className="ml-1 text-slate-500">{t('common.stock')}: {safeStock}</span>
        </div>

        <div className="mt-3 flex items-end gap-2">
          <span className="text-lg font-extrabold text-primary">{safePrice.toLocaleString('vi-VN')}d</span>
          {safeOriginal > safePrice && (
            <span className="text-xs text-slate-400 line-through">{safeOriginal.toLocaleString('vi-VN')}d</span>
          )}
        </div>

        <button
          type="button"
          disabled={isOutOfStock}
          onClick={(e) => {
            e.stopPropagation();
            onAddToCart?.(product);
          }}
          className="mt-auto rounded-xl bg-primary px-3 py-2 text-sm font-bold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isOutOfStock ? t('common.outOfStock') : t('common.addToCart')}
        </button>
      </div>
    </article>
  );
};

export default ProductCard;
