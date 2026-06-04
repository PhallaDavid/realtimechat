import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/src/firebase';
import type { UserProfile } from '@/src/types';

export function useFriend(friendId: string | undefined) {
  const [friend, setFriend] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(!!friendId);

  useEffect(() => {
    if (!friendId) {
      setFriend(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    getDoc(doc(db, 'users', friendId))
      .then((snap) => {
        if (cancelled) return;
        if (!snap.exists()) {
          setFriend(null);
          return;
        }
        const data = snap.data() as UserProfile;
        setFriend({ ...data, id: data.id || snap.id });
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [friendId]);

  return { friend, loading };
}
