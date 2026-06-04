import { addDoc, arrayUnion, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/src/firebase';
import { getChatId } from '@/src/lib/chat';
import type { MessageType, UserProfile } from '@/src/types';

export async function ensureMutualContact(currentUser: UserProfile, friendId: string) {
  if (!currentUser.contacts?.includes(friendId)) {
    await updateDoc(doc(db, 'users', currentUser.id), { contacts: arrayUnion(friendId) });
  }
  await updateDoc(doc(db, 'users', friendId), { contacts: arrayUnion(currentUser.id) });
}

export async function sendChatMessage(
  currentUser: UserProfile,
  friendId: string,
  payload: {
    type: MessageType;
    text?: string;
    mediaUrl?: string;
    fileName?: string;
    mimeType?: string;
    duration?: number;
  }
) {
  const chatId = getChatId(currentUser.id, friendId);
  await addDoc(collection(db, 'chats', chatId, 'messages'), {
    type: payload.type,
    text: payload.text ?? '',
    senderId: currentUser.id,
    createdAt: serverTimestamp(),
    ...(payload.mediaUrl ? { mediaUrl: payload.mediaUrl } : {}),
    ...(payload.fileName ? { fileName: payload.fileName } : {}),
    ...(payload.mimeType ? { mimeType: payload.mimeType } : {}),
    ...(payload.duration != null ? { duration: payload.duration } : {}),
  });
  await ensureMutualContact(currentUser, friendId);
}
