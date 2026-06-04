import { legacyRecentChatsKey, recentChatsKey, RECENT_CHATS_EVENT } from '@/src/lib/brand';

function readRaw(userId: string): string | null {
  const current = localStorage.getItem(recentChatsKey(userId));
  if (current) return current;
  const legacy = localStorage.getItem(legacyRecentChatsKey(userId));
  if (legacy) {
    localStorage.setItem(recentChatsKey(userId), legacy);
    localStorage.removeItem(legacyRecentChatsKey(userId));
    return legacy;
  }
  return null;
}

export function getRecentChatIds(userId: string): string[] {
  try {
    const raw = readRaw(userId);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addRecentChat(userId: string, partnerId: string) {
  if (!userId || !partnerId || userId === partnerId) return;
  const current = getRecentChatIds(userId).filter((id) => id !== partnerId);
  const next = [partnerId, ...current].slice(0, 50);
  localStorage.setItem(recentChatsKey(userId), JSON.stringify(next));
  window.dispatchEvent(new Event(RECENT_CHATS_EVENT));
}
