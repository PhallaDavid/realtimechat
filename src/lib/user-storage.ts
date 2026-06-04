import Cookies from 'js-cookie';
import type { UserProfile } from '@/src/types';
import {
  LEGACY_USER_ID_COOKIE,
  LEGACY_USER_STORAGE_KEY,
  USER_ID_COOKIE,
  USER_STORAGE_KEY,
} from '@/src/lib/brand';

export { USER_STORAGE_KEY };

export const readStoredUserProfile = (): UserProfile | null => {
  try {
    let storedUser = localStorage.getItem(USER_STORAGE_KEY);
    if (!storedUser) {
      storedUser = localStorage.getItem(LEGACY_USER_STORAGE_KEY);
      if (storedUser) {
        localStorage.setItem(USER_STORAGE_KEY, storedUser);
        localStorage.removeItem(LEGACY_USER_STORAGE_KEY);
      }
    }
    return storedUser ? (JSON.parse(storedUser) as UserProfile) : null;
  } catch {
    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem(LEGACY_USER_STORAGE_KEY);
    return null;
  }
};

export const storeUserProfile = (userData: UserProfile) => {
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
  Cookies.set(USER_ID_COOKIE, userData.XyncId, { expires: 30 });
  Cookies.remove(LEGACY_USER_ID_COOKIE);
};

export const clearStoredUserProfile = () => {
  localStorage.removeItem(USER_STORAGE_KEY);
  localStorage.removeItem(LEGACY_USER_STORAGE_KEY);
  Cookies.remove(USER_ID_COOKIE);
  Cookies.remove(LEGACY_USER_ID_COOKIE);
};
