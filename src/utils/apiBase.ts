export const API_HOST_STORAGE_KEY = 'b33t_api_host';
export const DEFAULT_LAN_API_HOST = 'http://192.168.1.100:3000';

export function isCapacitorNative(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean((window as any).Capacitor?.isNativePlatform?.());
}

export function getApiHost(): string {
  if (typeof window === 'undefined') return DEFAULT_LAN_API_HOST;
  const saved = (localStorage.getItem(API_HOST_STORAGE_KEY) || '').trim().replace(/\/+$/, '');
  return saved || DEFAULT_LAN_API_HOST;
}

export function setApiHost(host: string): void {
  if (typeof window === 'undefined') return;
  const cleaned = host.trim().replace(/\/+$/, '');
  if (cleaned) {
    localStorage.setItem(API_HOST_STORAGE_KEY, cleaned);
  } else {
    localStorage.removeItem(API_HOST_STORAGE_KEY);
  }
}

export function getApiBase(): string {
  if (typeof window === 'undefined') return '';
  if (isCapacitorNative()) {
    return getApiHost();
  }
  if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
    return '';
  }
  return getApiHost();
}

export function setApiBase(url: string): void {
  setApiHost(url);
}

export function apiUrl(path: string): string {
  if (!path.startsWith('/')) return path;
  const base = getApiBase();
  return base ? `${base}${path}` : path;
}
