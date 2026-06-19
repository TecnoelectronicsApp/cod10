export type AuthRole = 'customer' | 'admin' | 'rider';

const KEYS = {
  customer: 'fd-token',
  customerId: 'fd-user-id',
  admin: 'fd-admin',
  rider: 'fd-rider-token',
  riderId: 'fd-rider-id',
} as const;

export function getToken(role: AuthRole): string | null {
  if (typeof window === 'undefined') return null;
  if (role === 'customer') return localStorage.getItem(KEYS.customer);
  if (role === 'admin') {
    const raw = localStorage.getItem(KEYS.admin);
    if (!raw) return null;
    try {
      return JSON.parse(raw).token;
    } catch {
      return null;
    }
  }
  return localStorage.getItem(KEYS.rider);
}

export function getUserId(role: 'customer' | 'rider'): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(role === 'customer' ? KEYS.customerId : KEYS.riderId);
}

export function saveCustomerAuth(userId: string, token: string) {
  localStorage.setItem(KEYS.customer, token);
  localStorage.setItem(KEYS.customerId, userId);
}

export function saveAdminAuth(data: { userId: string; token: string; name: string; email: string }) {
  localStorage.setItem(KEYS.admin, JSON.stringify(data));
}

export function saveRiderAuth(userId: string, token: string) {
  localStorage.setItem(KEYS.rider, token);
  localStorage.setItem(KEYS.riderId, userId);
}

export function clearAuth(role: AuthRole) {
  if (role === 'customer') {
    localStorage.removeItem(KEYS.customer);
    localStorage.removeItem(KEYS.customerId);
  } else if (role === 'admin') {
    localStorage.removeItem(KEYS.admin);
  } else {
    localStorage.removeItem(KEYS.rider);
    localStorage.removeItem(KEYS.riderId);
  }
}
