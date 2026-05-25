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

export const resolveImageUrl = (src?: string | null): string => {
  const value = String(src || '').trim();
  if (!value || value === 'null' || value === 'undefined' || value === 'N/A' || value === 'none' || value === 'NaN' || value === '[object Object]') {
    return PLACEHOLDER_SVG;
  }
  if (value.startsWith('data:')) return value;
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  if (value.startsWith('//')) return `${window.location.protocol}${value}`;

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
