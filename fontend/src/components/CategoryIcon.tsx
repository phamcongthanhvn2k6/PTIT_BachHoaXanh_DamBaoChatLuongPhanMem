import React from 'react';
import { resolveImageUrl } from '../utils/imageUrl';

const LUCIDE_TO_MATERIAL_MAP: Record<string, string> = {
  'leaf': 'eco',
  'apple': 'nutrition',
  'flame': 'whatshot',
  'fish': 'set_meal',
  'milk': 'local_cafe',
  'cupcake': 'cake',
  'clock': 'schedule',
  'soup': 'soup_kitchen',
  'wine': 'wine_bar',
  'chefhat': 'restaurant',
  'croissant': 'bakery_dining',
  'cookie': 'cookie',
  'carrot': 'spa',
  'beer': 'sports_bar',
  'coffee': 'local_cafe',
  'droplet': 'water_drop',
  'icecream': 'icecream',
  'pizza': 'local_pizza',
  'egg': 'egg',
  'eggalt': 'egg_alt',
  'utensils': 'restaurant',
  'store': 'storefront',
  'shoppingbag': 'shopping_bag',
  'shoppingcart': 'shopping_cart',
  'gift': 'featured_seasonal_and_gifts',
  'tag': 'local_offer',
  'percent': 'percent',
  'ticket': 'local_activity',
  'award': 'military_tech',
  'sparkles': 'auto_awesome',
  'heart': 'favorite',
  'user': 'person',
  'home': 'home',
  'settings': 'settings',
  'search': 'search',
  'menu': 'menu',
  'bell': 'notifications',
  'trash': 'delete',
  'edit': 'edit',
  'plus': 'add',
  'minus': 'remove',
  'check': 'check',
  'x': 'close',
  'chevronleft': 'chevron_left',
  'chevronright': 'chevron_right',
  'chevrondown': 'expand_more',
  'chevronup': 'expand_less',
  'arrowleft': 'arrow_back',
  'arrowright': 'arrow_forward',
  'info': 'info',
  'helpcircle': 'help',
  'alertcircle': 'error',
  'checkcircle': 'check_circle',
  'xcircle': 'cancel',
  'shield': 'security',
  'lock': 'lock',
  'unlock': 'lock_open',
  'eye': 'visibility',
  'eyeoff': 'visibility_off',
  'mail': 'mail',
  'phone': 'call',
  'mappin': 'location_on',
  'map': 'map',
  'calendar': 'calendar_month',
  'camera': 'photo_camera',
  'image': 'image',
  'video': 'videocam',
  'file': 'description',
  'folder': 'folder',
  'download': 'download',
  'upload': 'upload',
  'share': 'share',
  'refresh': 'refresh',
  'externallink': 'open_in_new',
  'link': 'link',
  'globe': 'public',
  'wifi': 'wifi',
  'database': 'database',
  'server': 'dns',
  'terminal': 'terminal',
  'code': 'code',
  'book': 'book',
  'bookmark': 'bookmark',
  'paperclip': 'attachment',
  'send': 'send',
  'messagesquare': 'chat_bubble',
  'volumeup': 'volume_up',
  'volumeoff': 'volume_off',
  'sun': 'light_mode',
  'moon': 'dark_mode',
  'cloud': 'cloud',
  'wind': 'air',
  'umbrella': 'beach_access',
  'mousepointer': 'mouse',
  'sliders': 'tune',
  'grid': 'grid_view',
  'list': 'list',
  'activity': 'pulse',
  'barchart': 'bar_chart',
  'piechart': 'pie_chart',
  'dollarsign': 'attach_money',
};

interface CategoryIconProps {
  category: any;
  className?: string;
  iconClass?: string;
  size?: number;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({
  category,
  className = '',
  iconClass = 'material-symbols-outlined',
  size,
}) => {
  if (!category) return null;

  const type = category.icon_type || 'material_icon';
  const customStyle: React.CSSProperties = size ? { fontSize: `${size}px` } : {};

  // Normalize name resolution
  const resolveIconName = (name: string) => {
    const raw = (name || '').trim();
    const normalizedKey = raw.toLowerCase().replace(/[^a-z0-9]/g, '');
    return LUCIDE_TO_MATERIAL_MAP[normalizedKey] || raw;
  };

  const fallbackIconName = resolveIconName(category.icon || 'category');

  if (type === 'image' && (category.icon_url || category.image)) {
    const src = category.icon_url || category.image;
    const resolvedSrc = resolveImageUrl(src);
    return (
      <div className="inline-flex items-center justify-center">
        <img
          src={resolvedSrc}
          alt={category.name}
          className={`object-contain ${className}`}
          style={size ? { width: `${size}px`, height: `${size}px` } : { width: '2rem', height: '2rem' }}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            const fallback = e.currentTarget.parentElement?.querySelector('.category-fallback-icon');
            if (fallback) {
              (fallback as HTMLElement).style.display = 'inline-block';
            }
          }}
        />
        <span
          className={`category-fallback-icon ${iconClass} ${className}`}
          style={{ ...customStyle, display: 'none' }}
        >
          {fallbackIconName}
        </span>
      </div>
    );
  }

  if (type === 'emoji' && category.icon_emoji) {
    return (
      <span
        className={`select-none inline-block leading-none ${className}`}
        style={size ? { fontSize: `${size}px` } : { fontSize: '1.75rem' }}
      >
        {category.icon_emoji}
      </span>
    );
  }

  // Fallback to material_icon
  const iconName = resolveIconName(category.icon_name || category.icon || 'category');
  return (
    <span
      className={`${iconClass} ${className}`}
      style={customStyle}
    >
      {iconName}
    </span>
  );
};
