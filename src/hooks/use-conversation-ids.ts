import { useEffect, useMemo, useState } from 'react';
import { getRecentChatIds } from '@/src/lib/recent-chats';

export function useConversationIds(
  userId: string | undefined,
  contactIds: string[] | undefined
): string[] {
  const [recentTick, setRecentTick] = useState(0);

  useEffect(() => {
    const onUpdate = () => setRecentTick((t) => t + 1);
    window.addEventListener('xync-recent-updated', onUpdate);
    return () => window.removeEventListener('xync-recent-updated', onUpdate);
  }, []);

  return useMemo(() => {
    if (!userId) return [];
    const fromContacts = contactIds ?? [];
    const fromRecent = getRecentChatIds(userId);
    return [...new Set([...fromContacts, ...fromRecent])].filter((id) => id !== userId);
  }, [userId, contactIds?.join(','), recentTick]);
}
