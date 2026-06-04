import React, { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MessageSquare, Users } from 'lucide-react';
import { useAuth } from '@/src/contexts/auth-context';
import { useContacts } from '@/src/hooks/use-contacts';
import { useConversationIds } from '@/src/hooks/use-conversation-ids';
import { usePresence } from '@/src/hooks/use-presence';
import { addRecentChat } from '@/src/lib/recent-chats';
import { formatLastSeen, isUserOnline } from '@/src/lib/presence';
import type { ContactPreview, UserProfile } from '@/src/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ContactRow } from '@/src/components/chat/ContactRow';
import { ContactListSkeleton } from '@/src/components/chat/ContactListSkeleton';

interface ConversationListProps {
  variant: 'chats' | 'contacts';
  ephemeralFriend?: UserProfile | null;
}

export function ConversationList({ variant, ephemeralFriend }: ConversationListProps) {
  const { currentUser } = useAuth();
  const { friendId } = useParams();
  const navigate = useNavigate();

  const conversationIds = useConversationIds(currentUser?.id, currentUser?.contacts);
  const { contacts, loading } = useContacts(currentUser?.id, conversationIds);

  const presenceUserIds = useMemo(() => {
    const ids = [...conversationIds];
    if (ephemeralFriend?.id && !ids.includes(ephemeralFriend.id)) ids.push(ephemeralFriend.id);
    return ids;
  }, [conversationIds, ephemeralFriend?.id]);

  const presenceMap = usePresence(presenceUserIds);

  const contactsWithStatus = useMemo(
    () =>
      contacts.map((contact) => {
        const presence = presenceMap[contact.id];
        const online = isUserOnline(presence);
        return {
          ...contact,
          isOnline: online,
          statusText: online ? 'Online' : formatLastSeen(presence?.lastSeen ?? null),
        };
      }),
    [contacts, presenceMap]
  );

  if (!currentUser) return null;

  const openChat = (contact: ContactPreview | UserProfile) => {
    addRecentChat(currentUser.id, contact.id);
    navigate(`/app/chat/${contact.id}`);
  };

  const showEphemeral =
    ephemeralFriend && !contactsWithStatus.find((c) => c.id === ephemeralFriend.id);
  const listCount = contactsWithStatus.length + (showEphemeral ? 1 : 0);
  const title = variant === 'chats' ? 'Chats' : 'Contacts';
  const Icon = variant === 'chats' ? MessageSquare : Users;

  return (
    <>
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h2>
        {!loading && <span className="text-xs text-muted-foreground">{listCount}</span>}
      </div>

      <ScrollArea className="min-h-0 flex-1">
        {loading ? (
          <ContactListSkeleton />
        ) : (
          <>
            {showEphemeral && ephemeralFriend && (
              <ContactRow
                contact={{
                  ...ephemeralFriend,
                  id: ephemeralFriend.id,
                  isOnline: isUserOnline(presenceMap[ephemeralFriend.id]),
                  statusText: isUserOnline(presenceMap[ephemeralFriend.id])
                    ? 'Online'
                    : formatLastSeen(presenceMap[ephemeralFriend.id]?.lastSeen ?? null),
                }}
                currentUserId={currentUser.id}
                isActive={friendId === ephemeralFriend.id}
                presence={presenceMap[ephemeralFriend.id]}
                onClick={() => openChat(ephemeralFriend)}
              />
            )}
            {contactsWithStatus.map((contact) => (
              <React.Fragment key={contact.id}>
                <ContactRow
                  contact={contact}
                  currentUserId={currentUser.id}
                  isActive={friendId === contact.id}
                  presence={presenceMap[contact.id]}
                  onClick={() => openChat(contact)}
                />
              </React.Fragment>
            ))}
            {!loading && listCount === 0 && (
              <div className="flex h-48 flex-col items-center justify-center px-6 text-center text-muted-foreground">
                <Icon size={36} className="mb-3 opacity-30" />
                <p className="text-sm font-medium text-foreground/80">
                  {variant === 'chats' ? 'No conversations yet' : 'No contacts yet'}
                </p>
                <p className="mt-1 text-xs">Use Search to find someone by Xync ID</p>
              </div>
            )}
          </>
        )}
      </ScrollArea>
    </>
  );
}
