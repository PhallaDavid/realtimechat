import React, { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MessageSquare, Users } from 'lucide-react';
import { doc, updateDoc, arrayRemove, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/src/firebase';
import { useAuth } from '@/src/contexts/auth-context';
import { useContacts } from '@/src/hooks/use-contacts';
import { useConversationIds } from '@/src/hooks/use-conversation-ids';
import { usePresence } from '@/src/hooks/use-presence';
import { useGroups } from '@/src/hooks/use-groups';
import { addRecentChat, getRecentChatIds } from '@/src/lib/recent-chats';
import { formatLastSeen, isUserOnline } from '@/src/lib/presence';
import type { ContactPreview, UserProfile, GroupChat } from '@/src/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ContactRow } from '@/src/components/chat/ContactRow';
import { GroupRow } from '@/src/components/chat/GroupRow';
import { USER_ID_LABEL, RECENT_CHATS_EVENT, recentChatsKey } from '@/src/lib/brand';
import { ContactListSkeleton } from '@/src/components/chat/ContactListSkeleton';

interface ConversationListProps {
  variant: 'chats' | 'contacts';
  ephemeralFriend?: UserProfile | null;
}

export function ConversationList({ variant, ephemeralFriend }: ConversationListProps) {
  const { currentUser } = useAuth();
  const { friendId, groupId } = useParams();
  const navigate = useNavigate();

  const conversationIds = useConversationIds(currentUser?.id, currentUser?.contacts);
  const { contacts, loading } = useContacts(currentUser?.id, conversationIds);
  const { groups, loading: groupsLoading } = useGroups(currentUser?.id);

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

  const combinedList = useMemo(() => {
    if (variant !== 'chats') return [];
    const items: Array<
      | { type: 'dm'; id: string; timestamp: number; data: ContactPreview }
      | { type: 'group'; id: string; timestamp: number; data: GroupChat }
    > = [];

    contactsWithStatus.forEach((contact) => {
      const ts = contact.lastMessage?.createdAt?.getTime() ?? 0;
      items.push({ type: 'dm', id: contact.id, timestamp: ts, data: contact });
    });

    groups.forEach((group) => {
      const ts = group.lastMessage?.createdAt?.getTime() ?? 0;
      items.push({ type: 'group', id: group.id, timestamp: ts, data: group });
    });

    return items.sort((a, b) => b.timestamp - a.timestamp);
  }, [variant, contactsWithStatus, groups]);

  if (!currentUser) return null;

  const openChat = (contact: ContactPreview | UserProfile) => {
    addRecentChat(currentUser.id, contact.id);
    navigate(`/app/chat/${contact.id}`);
  };

  const openGroupChat = (group: GroupChat) => {
    navigate(`/app/group/${group.id}`);
  };

  const deleteConversation = async (itemId: string, type: 'dm' | 'group') => {
    if (!currentUser) return;
    if (type === 'dm') {
      // 1. Remove from local storage recent chats
      const current = getRecentChatIds(currentUser.id).filter((id) => id !== itemId);
      localStorage.setItem(recentChatsKey(currentUser.id), JSON.stringify(current));
      window.dispatchEvent(new Event(RECENT_CHATS_EVENT));

      // 2. Remove from contacts in Firestore if present
      if (currentUser.contacts?.includes(itemId)) {
        try {
          await updateDoc(doc(db, 'users', currentUser.id), {
            contacts: arrayRemove(itemId),
          });
        } catch (e) {
          console.error('Error removing contact:', e);
        }
      }
    } else {
      // For groups: leave the group
      if (!confirm('Are you sure you want to leave this group?')) return;
      try {
        await updateDoc(doc(db, 'groups', itemId), {
          members: arrayRemove(currentUser.id),
        });

        // Write system message
        const messageText = `${currentUser.username} left the group`;
        await addDoc(collection(db, 'groups', itemId, 'messages'), {
          type: 'text',
          text: messageText,
          senderId: 'system',
          senderName: 'System',
          createdAt: serverTimestamp(),
        });

        // Update last message in group doc
        await updateDoc(doc(db, 'groups', itemId), {
          lastMessage: {
            text: messageText,
            senderId: 'system',
            senderName: 'System',
            createdAt: serverTimestamp(),
            type: 'text',
          },
        });
      } catch (e) {
        console.error('Error leaving group:', e);
      }
    }

    // If deleting the currently active chat/group, navigate to app chats empty page
    if (friendId === itemId || groupId === itemId) {
      navigate('/app/chats');
    }
  };

  const showEphemeral =
    ephemeralFriend && !contactsWithStatus.find((c) => c.id === ephemeralFriend.id);
  const listCount = contactsWithStatus.length + (showEphemeral ? 1 : 0);
  const title = variant === 'chats' ? 'Chats' : 'Contacts';
  const Icon = variant === 'chats' ? MessageSquare : Users;

  return (
    <>
      {/* <div className="flex items-center justify-between border-b px-4 py-2.5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h2>
        {!loading && <span className="text-xs text-muted-foreground">{listCount}</span>}
      </div> */}

      <ScrollArea className="min-h-0 flex-1">
        {loading || (variant === 'chats' && groupsLoading) ? (
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
             {variant === 'chats' ? (
              combinedList.map((item) => {
                if (item.type === 'dm') {
                  const contact = item.data;
                  return (
                    <React.Fragment key={contact.id}>
                      <ContactRow
                        contact={contact}
                        currentUserId={currentUser.id}
                        isActive={friendId === contact.id}
                        presence={presenceMap[contact.id]}
                        onClick={() => openChat(contact)}
                        onDelete={() => deleteConversation(contact.id, 'dm')}
                      />
                    </React.Fragment>
                  );
                } else {
                  const group = item.data;
                  return (
                    <React.Fragment key={group.id}>
                      <GroupRow
                        group={group}
                        isActive={groupId === group.id}
                        onClick={() => openGroupChat(group)}
                        onDelete={() => deleteConversation(group.id, 'group')}
                      />
                    </React.Fragment>
                  );
                }
              })
            ) : (
              contactsWithStatus.map((contact) => (
                <React.Fragment key={contact.id}>
                  <ContactRow
                    contact={contact}
                    currentUserId={currentUser.id}
                    isActive={friendId === contact.id}
                    presence={presenceMap[contact.id]}
                    onClick={() => openChat(contact)}
                    onDelete={() => deleteConversation(contact.id, 'dm')}
                  />
                </React.Fragment>
              ))
            )}
            {!loading && listCount === 0 && (
              <div className="flex h-48 flex-col items-center justify-center px-6 text-center text-muted-foreground">
                <Icon size={36} className="mb-3 opacity-30" />
                <p className="text-sm font-medium text-foreground/80">
                  {variant === 'chats' ? 'No conversations yet' : 'No contacts yet'}
                </p>
                <p className="mt-1 text-xs">Use Search to find someone by {USER_ID_LABEL}</p>
              </div>
            )}
          </>
        )}
      </ScrollArea>
    </>
  );
}
