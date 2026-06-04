import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/src/firebase';
import { onSnapshotError } from '@/src/lib/firestore-listener';
import type { PresenceRecord } from '@/src/lib/presence';
import { PRESENCE_UI_TICK_MS } from '@/src/lib/presence';

export function usePresence(userIds: string[] | undefined): Record<string, PresenceRecord> {
  const [presence, setPresence] = useState<Record<string, PresenceRecord>>({});
  const userIdsKey = userIds?.filter(Boolean).sort().join(',') ?? '';

  useEffect(() => {
    if (!userIdsKey) {
      setPresence({});
      return;
    }

    const ids = userIdsKey.split(',');

    const unsubs = ids.map((userId) =>
      onSnapshot(
        doc(db, 'presence', userId),
        (snap) => {
          if (!snap.exists()) {
            setPresence((prev) => {
              const next = { ...prev };
              delete next[userId];
              return next;
            });
            return;
          }
          const data = snap.data();
          const lastSeen = data.lastSeen?.toDate?.() ?? null;
          setPresence((prev) => ({
            ...prev,
            [userId]: {
              online: Boolean(data.online),
              lastSeen,
            },
          }));
        },
        onSnapshotError(`presence ${userId}`)
      )
    );

    return () => unsubs.forEach((u) => u());
  }, [userIdsKey]);

  // Re-evaluate lastSeen threshold and "last seen … ago" without a new snapshot.
  useEffect(() => {
    if (!userIdsKey) return;
    const tick = window.setInterval(() => {
      setPresence((prev) => (Object.keys(prev).length ? { ...prev } : prev));
    }, PRESENCE_UI_TICK_MS);
    return () => window.clearInterval(tick);
  }, [userIdsKey]);

  return presence;
}
