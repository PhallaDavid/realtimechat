import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/src/firebase';
import type { ContactPreview, UserProfile } from '@/src/types';
import { useLastMessages } from '@/src/hooks/use-last-messages';

function normalizeProfile(snap: { id: string; exists: () => boolean; data: () => unknown }): UserProfile {
  const data = snap.data() as UserProfile;
  return { ...data, id: data.id || snap.id };
}

export function useContacts(
  currentUserId: string | undefined,
  conversationIds: string[]
) {
  const [contacts, setContacts] = useState<ContactPreview[]>([]);
  const [loading, setLoading] = useState(false);

  const lastMessages = useLastMessages(currentUserId, conversationIds);

  useEffect(() => {
    if (!currentUserId || conversationIds.length === 0) {
      setContacts([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const fetchContacts = async () => {
      try {
        const snaps = await Promise.all(
          conversationIds.map((id) => getDoc(doc(db, 'users', id)))
        );
        if (cancelled) return;
        const profiles = snaps
          .filter((s) => s.exists())
          .map((s) => normalizeProfile(s));
        setContacts(profiles);
      } catch (err) {
        console.error(err);
        if (!cancelled) setContacts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchContacts();
    return () => {
      cancelled = true;
    };
  }, [currentUserId, conversationIds.join(',')]);

  const contactsWithPreview: ContactPreview[] = contacts
    .map((contact) => ({
      ...contact,
      lastMessage: lastMessages[contact.id],
    }))
    .sort((a, b) => {
      const aTime = a.lastMessage?.createdAt?.getTime() ?? 0;
      const bTime = b.lastMessage?.createdAt?.getTime() ?? 0;
      return bTime - aTime;
    });

  return { contacts: contactsWithPreview, loading };
}
