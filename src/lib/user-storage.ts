import Cookies from 'js-cookie';
import type { UserProfile } from '@/src/types';

export const USER_STORAGE_KEY = 'xync_user_profile';

export const readStoredUserProfile = (): UserProfile | null => {
  try {
    const storedUser = localStorage.getItem(USER_STORAGE_KEY);
    return storedUser ? (JSON.parse(storedUser) as UserProfile) : null;
  } catch {
    localStorage.removeItem(USER_STORAGE_KEY);
    return null;
  }
};

export const storeUserProfile = (userData: UserProfile) => {
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
  Cookies.set('xync_user_id', userData.xyncId, { expires: 30 });
};

export const clearStoredUserProfile = () => {
  localStorage.removeItem(USER_STORAGE_KEY);
  Cookies.remove('xync_user_id');
};
