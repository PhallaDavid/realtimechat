const key = (userId: string) => `xync_recent_chats_${userId}`;

export function getRecentChatIds(userId: string): string[] {
  try {
    const raw = localStorage.getItem(key(userId));
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
  localStorage.setItem(key(userId), JSON.stringify(next));
  window.dispatchEvent(new Event('xync-recent-updated'));
}
