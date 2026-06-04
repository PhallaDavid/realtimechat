import type { Message, MessageType } from '@/src/types';

export function getMessageType(msg: Partial<Message>): MessageType {
  if (msg.type) return msg.type;
  if (msg.mediaUrl) {
    if (msg.mimeType?.startsWith('image/')) return 'image';
    if (msg.mimeType?.startsWith('audio/')) return 'voice';
    return 'file';
  }
  return 'text';
}

export function getMessagePreview(msg: Partial<Message>, currentUserId?: string): string {
  const type = getMessageType(msg);
  const prefix = msg.senderId === currentUserId ? 'You: ' : '';

  switch (type) {
    case 'image':
      return `${prefix}${msg.text?.trim() ? msg.text : '📷 Photo'}`;
    case 'voice':
      return `${prefix}🎤 Voice message`;
    case 'file':
      return `${prefix}📎 ${msg.fileName || 'File'}`;
    default:
      return `${prefix}${msg.text || ''}`;
  }
}

export function normalizeMessage(id: string, data: Record<string, unknown>): Message {
  return {
    id,
    type: (data.type as MessageType) || getMessageType(data as Partial<Message>),
    text: (data.text as string) || '',
    senderId: data.senderId as string,
    createdAt: data.createdAt as Message['createdAt'],
    mediaUrl: data.mediaUrl as string | undefined,
    fileName: data.fileName as string | undefined,
    mimeType: data.mimeType as string | undefined,
    duration: data.duration as number | undefined,
    deleted: (data.deleted as boolean) || false,
  };
}
