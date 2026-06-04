export type MessageType = 'text' | 'image' | 'file' | 'voice';

export interface UserProfile {
  id: string;
  XyncId: string;
  username: string;
  about: string;
  github_username: string;
  img_link: string;
  email: string;
  privacy?: { about: boolean; email: boolean; github: boolean };
  contacts?: string[];
}

export interface Message {
  id: string;
  type?: MessageType;
  text: string;
  senderId: string;
  createdAt: { toDate?: () => Date } | null;
  mediaUrl?: string;
  fileName?: string;
  mimeType?: string;
  duration?: number;
  deleted?: boolean;
}

export interface LastMessagePreview {
  text: string;
  senderId: string;
  createdAt: Date | null;
  type?: MessageType;
}

export interface ContactPreview extends UserProfile {
  lastMessage?: LastMessagePreview;
  isOnline?: boolean;
  statusText?: string;
}

export interface GroupChat {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  createdAt: { toDate?: () => Date } | null;
  members: string[];
  img_link?: string;
  lastMessage?: {
    text: string;
    senderId: string;
    senderName: string;
    createdAt: Date | null;
    type?: MessageType;
  };
}

export interface GroupMessage extends Message {
  senderName: string;
  senderAvatar?: string;
}
