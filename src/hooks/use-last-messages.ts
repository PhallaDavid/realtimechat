import { useEffect, useState } from 'react';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '@/src/firebase';
import { getChatId } from '@/src/lib/chat';
import { onSnapshotError } from '@/src/lib/firestore-listener';
import { getMessagePreview } from '@/src/lib/messages';
import type { LastMessagePreview } from '@/src/types';

export function useLastMessages(
  currentUserId: string | undefined,
  contactIds: string[] | undefined
): Record<string, LastMessagePreview> {
  const [lastMessages, setLastMessages] = useState<Record<string, LastMessagePreview>>({});

  useEffect(() => {
    if (!currentUserId || !contactIds?.length) {
      setLastMessages({});
      return;
    }

    const unsubs = contactIds.map((contactId) => {
      const chatId = getChatId(currentUserId, contactId);
      const q = query(
        collection(db, 'chats', chatId, 'messages'),
        orderBy('createdAt', 'desc'),
        limit(1)
      );

      return onSnapshot(
        q,
        (snap) => {
          if (snap.empty) {
            setLastMessages((prev) => {
              const next = { ...prev };
              delete next[contactId];
              return next;
            });
            return;
          }

          const data = snap.docs[0].data();
          const createdAt = data.createdAt?.toDate?.() ?? null;
          setLastMessages((prev) => ({
            ...prev,
            [contactId]: {
              text: getMessagePreview(data as Parameters<typeof getMessagePreview>[0], currentUserId),
              senderId: data.senderId as string,
              createdAt,
              type: data.type as LastMessagePreview['type'],
            },
          }));
        },
        onSnapshotError(`last message ${contactId}`)
      );
    });

    return () => unsubs.forEach((u) => u());
  }, [currentUserId, contactIds?.join(',')]);

  return lastMessages;
}
