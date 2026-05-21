import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * PromotionImageFallback — polished CSS-only visual card
 * shown when no image is uploaded for a promotion.
 *
 * Renders a gradient card with an icon + label based on the promotion type.
 * Falls back to this instead of a broken placeholder URL.
 */

interface PromotionImageFallbackProps {
  /** Promotion type / discount_type to determine visual style. */
  type?: string;
  /** Voucher type — 'product' | 'shipping'. If provided, overrides `type` for fallback lookup. */
  voucherType?: 'product' | 'shipping' | string;
  /** Optional explicit label override. */
  label?: string;
  /** className override for outer container */
  className?: string;
  /** aspect ratio class, defaults to 'aspect-video' */
  aspectRatio?: string;
}

type CardPreset = {
  gradient: string;
  icon: string;
  labelKey: string;
  fallbackLabel: string;
};

const PRESETS: Record<string, CardPreset> = {
  free_shipping: {
    gradient: 'from-cyan-500 via-teal-500 to-emerald-500',
    icon: 'local_shipping',
    labelKey: 'admin.promotions.defaultCardFreeShip',
    fallbackLabel: 'FREE SHIP',
  },
  shipping: {
    gradient: 'from-cyan-500 via-teal-500 to-emerald-500',
    icon: 'local_shipping',
    labelKey: 'admin.promotions.defaultCardFreeShip',
    fallbackLabel: 'FREE SHIP',
  },
  percent: {
    gradient: 'from-rose-500 via-red-500 to-orange-500',
    icon: 'local_offer',
    labelKey: 'admin.promotions.defaultCardSale',
    fallbackLabel: 'SALE',
  },
  percentage: {
    gradient: 'from-rose-500 via-red-500 to-orange-500',
    icon: 'local_offer',
    labelKey: 'admin.promotions.defaultCardSale',
    fallbackLabel: 'SALE',
  },
  fixed: {
    gradient: 'from-violet-500 via-purple-500 to-fuchsia-500',
    icon: 'price_check',
    labelKey: 'admin.promotions.defaultCardDiscount',
    fallbackLabel: 'GIẢM GIÁ',
  },
  fixed_amount: {
    gradient: 'from-violet-500 via-purple-500 to-fuchsia-500',
    icon: 'price_check',
    labelKey: 'admin.promotions.defaultCardDiscount',
    fallbackLabel: 'GIẢM GIÁ',
  },
  bogo: {
    gradient: 'from-amber-400 via-orange-500 to-red-500',
    icon: 'card_giftcard',
    labelKey: 'admin.promotions.defaultCardBogo',
    fallbackLabel: 'MUA 1 TẶNG 1',
  },
  points: {
    gradient: 'from-indigo-500 via-blue-500 to-sky-400',
    icon: 'stars',
    labelKey: 'admin.promotions.defaultCardPoints',
    fallbackLabel: 'NHÂN ĐIỂM',
  },
  points_multiplier: {
    gradient: 'from-indigo-500 via-blue-500 to-sky-400',
    icon: 'stars',
    labelKey: 'admin.promotions.defaultCardPoints',
    fallbackLabel: 'NHÂN ĐIỂM',
  },
  flash_deal: {
    gradient: 'from-pink-500 via-red-500 to-yellow-400',
    icon: 'bolt',
    labelKey: 'admin.promotions.defaultCardSale',
    fallbackLabel: 'FLASH SALE',
  },
};

const DEFAULT_PRESET: CardPreset = {
  gradient: 'from-red-500 via-rose-600 to-pink-600',
  icon: 'celebration',
  labelKey: 'admin.promotions.defaultCardPromo',
  fallbackLabel: 'ƯU ĐÃI',
};

export const PromotionImageFallback: React.FC<PromotionImageFallbackProps> = ({
  type,
  voucherType,
  label,
  className = '',
  aspectRatio = 'aspect-video',
}) => {
  const { t } = useTranslation();
  // If voucherType is explicitly 'shipping', use the shipping preset; otherwise use type-based lookup
  const normalizedType = voucherType === 'shipping' ? 'shipping' : (type || '').toLowerCase().replace(/[\s-]/g, '_');
  const preset = PRESETS[normalizedType] || DEFAULT_PRESET;
  const displayLabel = label || t(preset.labelKey, { defaultValue: preset.fallbackLabel });

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${preset.gradient} ${aspectRatio} flex items-center justify-center ${className}`}
    >
      {/* Decorative circles */}
      <div className="absolute -top-8 -left-8 w-32 h-32 bg-white/10 rounded-full blur-xl" />
      <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-xl" />
      <div className="absolute top-1/4 right-1/3 w-20 h-20 bg-white/5 rounded-full blur-md" />

      {/* Pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, white 10px, white 11px)`,
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-2 text-white text-center px-4">
        <span className="material-symbols-outlined text-5xl drop-shadow-lg" style={{ fontVariationSettings: "'wght' 700" }}>
          {preset.icon}
        </span>
        <span className="text-xl md:text-2xl font-black tracking-wider drop-shadow-md uppercase">
          {displayLabel}
        </span>
        <div className="h-0.5 w-12 bg-white/40 rounded-full mt-0.5" />
      </div>
    </div>
  );
};

/**
 * PromotionImageDisplay — composite component that:
 *  - Shows the actual uploaded image if `imageUrl` is provided
 *  - Shows the CSS fallback card otherwise
 */
interface PromotionImageDisplayProps {
  imageUrl?: string | null;
  type?: string;
  /** Voucher type for fallback card. Overrides type for fallback selection when no image. */
  voucherType?: 'product' | 'shipping' | string;
  alt?: string;
  className?: string;
  aspectRatio?: string;
  fallbackLabel?: string;
}

export const PromotionImageDisplay: React.FC<PromotionImageDisplayProps> = ({
  imageUrl,
  type,
  voucherType,
  alt = 'Promotion',
  className = '',
  aspectRatio = 'aspect-video',
  fallbackLabel,
}) => {
  const [imageFailed, setImageFailed] = useState(false);
  const hasImage = !!(imageUrl && imageUrl.trim().length > 0 &&
    (imageUrl.startsWith('http') || imageUrl.startsWith('/') || imageUrl.startsWith('data:image/')) &&
    !imageUrl.includes('placeholder') &&
    !imageUrl.includes('unsplash.com'));
  const showImage = hasImage && !imageFailed;

  return (
    <div className={`relative overflow-hidden ${aspectRatio} ${className}`}>
      <PromotionImageFallback
        type={type}
        voucherType={voucherType}
        label={fallbackLabel}
        className="promo-image-fallback w-full h-full"
        aspectRatio=""
      />
      {showImage && (
        <img
          src={imageUrl!}
          alt={alt}
          className="absolute inset-0 w-full h-full object-cover"
          onError={() => setImageFailed(true)}
        />
      )}
    </div>
  );
};

/**
 * InlineVoucherBadge — compact version for list-card left panels.
 * Shows uploaded image or a colored icon+text block.
 */
export const InlineVoucherBadge: React.FC<{
  imageUrl?: string | null;
  voucherType?: 'product' | 'shipping' | string;
  type?: string;
  className?: string;
}> = ({ imageUrl, voucherType, type, className = '' }) => {
  const { t } = useTranslation();
  const hasImage = !!(imageUrl && imageUrl.trim().length > 0 &&
    (imageUrl.startsWith('http') || imageUrl.startsWith('/') || imageUrl.startsWith('data:image/')) &&
    !imageUrl.includes('placeholder') &&
    !imageUrl.includes('unsplash.com'));
  const isShipping = voucherType === 'shipping' || type === 'free_shipping';
  const shippingLabel = t('promotions.freeShipLabel', { defaultValue: 'FREE\nSHIP' });
  const discountLabel = t('promotions.discountLabel', { defaultValue: 'GIẢM\nGIÁ' });

  if (hasImage) {
    return (
      <div className={`w-36 h-full overflow-hidden flex-shrink-0 ${className}`}>
        <img
          src={imageUrl!}
          alt="Voucher"
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            const sibling = target.nextElementSibling as HTMLElement;
            if (sibling) sibling.style.display = 'flex';
          }}
        />
        {/* Fallback sibling (hidden by default) */}
        <div
          className={`w-full h-full flex-col items-center justify-center text-white p-3 ${isShipping ? 'bg-teal-500' : 'bg-lotteRed'}`}
          style={{ display: 'none' }}
        >
          <span className="material-symbols-outlined text-4xl mb-1 opacity-90">
            {isShipping ? 'local_shipping' : 'card_giftcard'}
          </span>
          <span className="font-black text-center leading-tight text-sm">
            {isShipping ? shippingLabel : discountLabel}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-36 h-full flex flex-col items-center justify-center relative p-3 text-white border-r border-dashed flex-shrink-0 ${isShipping ? 'bg-teal-500 border-teal-200' : 'bg-lotteRed border-red-200'} ${className}`}>
      <span className="material-symbols-outlined text-4xl mb-1 opacity-90">
        {isShipping ? 'local_shipping' : 'card_giftcard'}
      </span>
      <span className="font-black text-center leading-tight text-sm">
        {isShipping ? shippingLabel : discountLabel}
      </span>
      {/* Zigzag cutouts */}
      <div className="absolute top-0 bottom-0 -right-1.5 w-3 overflow-hidden flex flex-col text-white opacity-20">
        {Array(8).fill(0).map((_, i) => (
          <div key={i} className="h-4 w-4 bg-white rounded-full -ml-2 -mt-1"></div>
        ))}
      </div>
    </div>
  );
};

export default PromotionImageDisplay;
