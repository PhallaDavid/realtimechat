import { useEffect, useState } from 'react';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '@/src/firebase';
import { onSnapshotError } from '@/src/lib/firestore-listener';
import { normalizeMessage } from '@/src/lib/messages';
import type { GroupMessage } from '@/src/types';

export function useGroupMessages(groupId: string | undefined) {
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, 'groups', groupId, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(100)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        setMessages(
          snap.docs.map((d) => {
            const data = d.data();
            const normalized = normalizeMessage(d.id, data as Record<string, unknown>);
            return {
              ...normalized,
              senderName: (data.senderName as string) || 'Unknown',
              senderAvatar: (data.senderAvatar as string) || '',
            } as GroupMessage;
          })
        );
        setLoading(false);
      },
      (err) => {
        onSnapshotError(`group messages for ${groupId}`)(err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [groupId]);

  return { messages, loading };
}
