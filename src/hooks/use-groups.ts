import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/src/firebase';
import { onSnapshotError } from '@/src/lib/firestore-listener';
import type { GroupChat } from '@/src/types';

export function useGroups(userId: string | undefined) {
  const [groups, setGroups] = useState<GroupChat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setGroups([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, 'groups'),
      where('members', 'array-contains', userId)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: GroupChat[] = [];
        snap.forEach((doc) => {
          const data = doc.data();
          list.push({
            id: doc.id,
            name: data.name || '',
            description: data.description || '',
            createdBy: data.createdBy || '',
            createdAt: data.createdAt || null,
            members: data.members || [],
            img_link: data.img_link || '',
            lastMessage: data.lastMessage
              ? {
                  text: data.lastMessage.text || '',
                  senderId: data.lastMessage.senderId || '',
                  senderName: data.lastMessage.senderName || '',
                  createdAt: data.lastMessage.createdAt?.toDate
                    ? data.lastMessage.createdAt.toDate()
                    : null,
                  type: data.lastMessage.type,
                }
              : undefined,
          });
        });
        setGroups(list);
        setLoading(false);
      },
      (err) => {
        onSnapshotError('groups')(err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [userId]);

  return { groups, loading };
}
