const defaultBackendHost = 'http://127.0.0.1:3001';

const normalizeHost = (host: string) => host.replace(/\/+$/, '');

export const getBackendHost = (): string => {
  const envHost = String(import.meta.env.VITE_API_HOST || '').trim();
  if (envHost) return normalizeHost(envHost);

  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    if (origin.includes('localhost:5173') || origin.includes('127.0.0.1:5173')) {
      return defaultBackendHost;
    }
    if (origin.includes('localhost:3000') || origin.includes('127.0.0.1:3000')) {
      return defaultBackendHost;
    }
    return origin;
  }

  return defaultBackendHost;
};

/** Inline SVG placeholder for missing product images (no external dependency) */
const PLACEHOLDER_SVG = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect width='400' height='400' fill='%23f1f5f9'/%3E%3Ctext x='200' y='200' text-anchor='middle' dominant-baseline='central' font-family='system-ui,sans-serif' font-size='48' fill='%2394a3b8'%3E🛒%3C/text%3E%3C/svg%3E`;

const categoryImages: Record<string, string> = {
  'hai-san': 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?q=80&w=800',
  'mi-bun-pho': 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?q=80&w=800',
  'trai-cay': 'https://images.unsplash.com/photo-1528825871115-3581a5387919?q=80&w=800',
  'thit-cac-loai': 'https://images.unsplash.com/photo-1602470520998-f4a52199a3d6?q=80&w=800',
  'nuoc-sot-nuoc-cham': 'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?q=80&w=800',
  'banh-keo-do-an-vat': 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?q=80&w=800',
  'hoa-my-pham-gia-dung': 'https://images.unsplash.com/photo-1563453392212-326f5e854473?q=80&w=800',
  'rau-cu': 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?q=80&w=800',
  'trung': 'https://images.unsplash.com/photo-1582722418955-41717b414d0c?q=80&w=800',
  'sua-san-pham-sua': 'https://images.unsplash.com/photo-1563636619-e9143da7973b?q=80&w=800',
  'gia-vi-nguyen-lieu': 'https://images.unsplash.com/photo-1506368249639-73a05d6f6488?q=80&w=800',
  'cham-soc-ca-nhan': 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?q=80&w=800',
  'banh-mi-banh-ngot': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=800',
  'thuc-pham-dong-lanh': 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=800',
  'thuc-pham-an-lien': 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?q=80&w=800',
  'gao': 'https://images.unsplash.com/photo-1586201375761-83865001e31c?q=80&w=800',
  'do-uong': 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?q=80&w=800'
};

export const resolveImageUrl = (src?: string | null): string => {
  const value = String(src || '').trim();
  if (!value || value === 'null' || value === 'undefined' || value === 'N/A' || value === 'none' || value === 'NaN' || value === '[object Object]') {
    return PLACEHOLDER_SVG;
  }
  if (value.startsWith('data:')) return value;
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  if (value.startsWith('//')) return `${window.location.protocol}${value}`;

  if (value.includes('/assets/products/')) {
    const filename = value.substring(value.indexOf('/assets/products/') + '/assets/products/'.length);
    const slug = filename.split('.')[0];
    if (categoryImages[slug]) {
      return categoryImages[slug];
    }
  }

  if (value.startsWith('/uploads')) {
    return `${getBackendHost()}${value}`;
  }
  if (value.startsWith('uploads/')) {
    return `${getBackendHost()}/${value}`;
  }

  // If it is just a relative filename, assume it's in the uploads directory
  return `${getBackendHost()}/uploads/${value.replace(/^\/+/, '')}`;
};

export const fallbackProductImage = PLACEHOLDER_SVG;
