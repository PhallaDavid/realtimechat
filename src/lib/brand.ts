export const APP_NAME = 'Niyey Knea';
export const APP_NAME_SHORT = 'NK';

export const DEFAULT_ABOUT = `Hey there! I am using ${APP_NAME}.`;
export const DEFAULT_USERNAME = `${APP_NAME} User`;

export const THEME_STORAGE_KEY = 'niyey-knea-theme';
export const LEGACY_THEME_STORAGE_KEY = 'Xync-theme';

export const USER_STORAGE_KEY = 'niyey-knea-user-profile';
export const LEGACY_USER_STORAGE_KEY = 'Xync_user_profile';

export const USER_ID_COOKIE = 'niyey-knea-user-id';
export const LEGACY_USER_ID_COOKIE = 'Xync_user_id';

export const RECENT_CHATS_EVENT = 'niyey-knea-recent-updated';

export function recentChatsKey(userId: string) {
  return `niyey-knea-recent-chats_${userId}`;
}

export function legacyRecentChatsKey(userId: string) {
  return `Xync_recent_chats_${userId}`;
}

export const USER_ID_LABEL = `${APP_NAME} ID`;
