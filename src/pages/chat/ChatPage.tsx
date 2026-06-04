import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import EmojiPicker, { Theme as EmojiPickerTheme } from 'emoji-picker-react';
import {
  ArrowLeft, Github, Loader2, Mic, MoreVertical, Paperclip, Search, Send, Smile, Square, Trash2, X,
} from 'lucide-react';
import {
  collection, deleteDoc, doc, getDocs, limit, onSnapshot, orderBy, query,
} from 'firebase/firestore';
import { db } from '@/src/firebase';
import { useAuth } from '@/src/contexts/auth-context';
import { useFriend } from '@/src/hooks/use-friend';
import { usePresence } from '@/src/hooks/use-presence';
import { DEFAULT_ABOUT } from '@/src/lib/brand';
import { getChatId } from '@/src/lib/chat';
import { addRecentChat } from '@/src/lib/recent-chats';
import { formatLastSeen, isUserOnline } from '@/src/lib/presence';
import { normalizeMessage } from '@/src/lib/messages';
import { sendChatMessage } from '@/src/lib/send-chat-message';
import { prepareMediaForMessage } from '@/src/lib/media-firestore';
import { onSnapshotError } from '@/src/lib/firestore-listener';
import { PresenceBadge } from '@/src/components/chat/PresenceBadge';
import { MessageContent } from '@/src/components/chat/MessageContent';
import { useVoiceRecorder } from '@/src/hooks/use-voice-recorder';
import type { Message } from '@/src/types';
import { useTheme } from '@/hooks/use-theme';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { MessageListSkeleton } from '@/src/components/chat/MessageListSkeleton';
import { Skeleton } from '@/components/ui/skeleton';

function InfoRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">{label}</p>
      {value !== null ? (
        <p className="text-sm">{value}</p>
      ) : (
        <p className="text-sm text-muted-foreground italic">This info is private</p>
      )}
    </div>
  );
}

type ChatOutletContext = { onViewImage: (url: string) => void };

export function ChatPage() {
  const { friendId } = useParams();
  const navigate = useNavigate();
  const { onViewImage } = useOutletContext<ChatOutletContext>();
  const { currentUser } = useAuth();
  const { friend, loading: friendLoading } = useFriend(friendId);
  const { isDark } = useTheme();

  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { isRecording, duration, startRecording, stopRecording, cancelRecording } = useVoiceRecorder();
  const presenceMap = usePresence(friendId ? [friendId] : []);
  const friendPresence = friendId ? presenceMap[friendId] : undefined;
  const friendOnline = isUserOnline(friendPresence);

  useEffect(() => {
    if (currentUser?.id && friendId) {
      addRecentChat(currentUser.id, friendId);
    }
  }, [currentUser?.id, friendId]);

  useEffect(() => {
    if (!currentUser || !friend) {
      setMessages([]);
      setMessagesLoading(false);
      return;
    }

    setMessagesLoading(true);
    const chatId = getChatId(currentUser.id, friend.id);
    const q = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(100)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        setMessages(
          snap.docs.map((d) => normalizeMessage(d.id, d.data() as Record<string, unknown>))
        );
        setMessagesLoading(false);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      },
      onSnapshotError('chat messages')
    );

    return () => unsub();
  }, [currentUser?.id, friend?.id]);

  const sendTextMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser || !friend || isUploading) return;
    const text = newMessage;
    setNewMessage('');
    setUploadError('');
    try {
      await sendChatMessage(currentUser, friend.id, { type: 'text', text });
    } catch (err) {
      console.error(err);
      setUploadError('Failed to send message. Check Firebase rules.');
      setNewMessage(text);
    }
  };

  const sendMediaFile = async (file: File, voiceDuration?: number) => {
    if (!currentUser || !friend || isUploading) return;
    setIsUploading(true);
    setUploadError('');
    try {
      const prepared = await prepareMediaForMessage(file);
      await sendChatMessage(currentUser, friend.id, {
        type: prepared.type,
        text: '',
        mediaUrl: prepared.mediaUrl,
        fileName: prepared.fileName,
        mimeType: prepared.mimeType,
        duration: voiceDuration,
      });
    } catch (err) {
      console.error(err);
      setUploadError(err instanceof Error ? err.message : 'Could not send media.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) await sendMediaFile(file);
  };

  const handleMicClick = async () => {
    if (isUploading) return;
    setUploadError('');
    if (isRecording) {
      const file = await stopRecording();
      if (file) await sendMediaFile(file, duration);
      return;
    }
    try {
      await startRecording();
    } catch {
      setUploadError('Microphone access denied or not supported.');
    }
  };

  const deleteMessage = async (messageId: string) => {
    if (!currentUser || !friend) return;
    const chatId = getChatId(currentUser.id, friend.id);
    try {
      await deleteDoc(doc(db, 'chats', chatId, 'messages', messageId));
    } catch (err) {
      console.error(err);
    }
  };

  const clearChat = async () => {
    if (!currentUser || !friend) return;
    const chatId = getChatId(currentUser.id, friend.id);
    try {
      const snap = await getDocs(query(collection(db, 'chats', chatId, 'messages')));
      await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
    } catch (err) {
      console.error(err);
    }
  };

  if (!friendId) return null;

  const chatShell = 'flex h-full min-h-0 w-full flex-col overflow-hidden bg-muted/10';

  if (friendLoading) {
    return (
      <main className={chatShell}>
        <header className="z-20 flex min-h-[calc(3.5rem+max(0.75rem,env(safe-area-inset-top,0px)))] shrink-0 items-center gap-3 border-b bg-background px-3 pb-2.5 pt-safe md:min-h-16 md:pt-0 sm:px-4">
          <Skeleton className="h-9 w-9 rounded-full md:hidden" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <MessageListSkeleton />
        </div>
        <footer className="shrink-0 border-t bg-background p-3 pb-safe">
          <Skeleton className="h-10 w-full rounded-3xl" />
        </footer>
      </main>
    );
  }

  if (!friend) {
    return (
      <main className={`${chatShell} items-center justify-center text-muted-foreground`}>
        <p className="text-sm">User not found.</p>
      </main>
    );
  }

  return (
    <main className={chatShell}>
      <header
        className="z-20 flex min-h-[calc(3.5rem+max(0.75rem,env(safe-area-inset-top,0px)))] shrink-0 cursor-pointer items-center justify-between border-b bg-background px-3 pb-2.5 pt-safe transition-colors hover:bg-muted/30 md:min-h-16 md:pt-0 sm:px-4"
        onClick={() => setShowContactInfo(true)}
      >
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={(e) => {
              e.stopPropagation();
              navigate('/app/chats');
              setShowContactInfo(false);
            }}
          >
            <ArrowLeft size={20} />
          </Button>
          <div className="relative">
            <Avatar className="h-9 w-9">
              <AvatarImage src={friend.img_link} />
              <AvatarFallback>{friend.username?.[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <PresenceBadge presence={friendPresence} className="h-2.5 w-2.5" />
          </div>
          <div>
            <p className="font-semibold text-sm leading-tight">{friend.username}</p>
            <p
              className={`text-xs ${
                friendOnline ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              {friendOnline ? 'Online' : formatLastSeen(friendPresence?.lastSeen ?? null)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon">
            <Search size={18} />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical size={18} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowContactInfo(true)}>Contact info</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={clearChat}>
                Clear chat
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4 md:px-8">
        {messagesLoading ? (
          <MessageListSkeleton />
        ) : messages.length === 0 ? (
          <div className="mt-8 flex justify-center">
            <Badge variant="secondary" className="px-4 py-1.5 text-xs font-normal">
              Messages are end-to-end encrypted
            </Badge>
          </div>
        ) : (
          <div className="space-y-2 pb-2">
            {messages.map((msg) => {
              const isMe = msg.senderId === currentUser?.id;
              return (
                <div
                  key={msg.id}
                  className={`group flex items-end gap-1.5 ${isMe ? 'justify-end' : 'justify-start'}`}
                >
                  {isMe && (
                    <button
                      type="button"
                      onClick={() => deleteMessage(msg.id)}
                      className="mb-0.5 p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive md:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm shadow-sm sm:max-w-[80%] md:max-w-[60%] ${
                      isMe
                        ? 'rounded-br-sm bg-primary text-primary-foreground'
                        : 'rounded-bl-sm border bg-card'
                    }`}
                  >
                    <MessageContent msg={msg} isMe={!!isMe} onViewImage={onViewImage} />
                    <span
                      className={`mt-1.5 ml-3 float-right text-[10px] ${
                        isMe ? 'text-primary-foreground/70' : 'text-muted-foreground'
                      }`}
                    >
                      {msg.createdAt?.toDate
                        ? msg.createdAt.toDate().toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true,
                          })
                        : '…'}
                    </span>
                  </div>
                  {!isMe && (
                    <button
                      type="button"
                      onClick={() => deleteMessage(msg.id)}
                      className="mb-0.5 p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive md:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <div ref={messagesEndRef} className="h-px shrink-0" aria-hidden />
      </div>

      <footer className="relative z-20 shrink-0 border-t bg-background p-2 pb-safe sm:p-3">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.txt,.zip"
          onChange={handleFileSelect}
        />
        {uploadError && (
          <p className="mb-2 px-1 text-xs text-destructive">{uploadError}</p>
        )}
        {isRecording && (
          <div className="mb-2 flex items-center justify-between rounded-xl bg-destructive/10 px-3 py-2">
            <span className="flex items-center gap-2 text-sm text-destructive">
              <span className="h-2 w-2 animate-pulse rounded-full bg-destructive" />
              Recording {duration}s
            </span>
            <div className="flex gap-1">
              <Button type="button" variant="ghost" size="icon-sm" onClick={cancelRecording}>
                <X size={16} />
              </Button>
              <Button type="button" variant="destructive" size="icon-sm" onClick={handleMicClick}>
                <Square size={14} fill="currentColor" />
              </Button>
            </div>
          </div>
        )}
        {showEmojiPicker && (
          <div className="absolute bottom-full left-2 z-50 mb-2 max-h-[min(50vh,320px)] overflow-hidden rounded-xl shadow-lg sm:left-4">
            <EmojiPicker
              theme={isDark ? EmojiPickerTheme.DARK : EmojiPickerTheme.LIGHT}
              width={Math.min(typeof window !== 'undefined' ? window.innerWidth - 24 : 320, 350)}
              height={320}
              onEmojiClick={(emoji) => {
                setNewMessage((p) => p + emoji.emoji);
                setShowEmojiPicker(false);
              }}
            />
          </div>
        )}
        <form onSubmit={sendTextMessage} className="flex items-center gap-1.5 sm:gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={isUploading || isRecording}
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className={showEmojiPicker ? 'text-primary' : ''}
          >
            <Smile size={20} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={isUploading || isRecording}
            onClick={() => fileInputRef.current?.click()}
          >
            {isUploading ? <Loader2 size={20} className="animate-spin" /> : <Paperclip size={20} />}
          </Button>
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={isUploading ? 'Sending…' : 'Type a message…'}
            className="h-10 min-w-0 flex-1"
            autoComplete="off"
            disabled={isUploading || isRecording}
          />
          {newMessage.trim() ? (
            <Button type="submit" size="icon" disabled={isUploading || isRecording}>
              <Send size={16} />
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={isUploading}
              className={isRecording ? 'text-destructive' : ''}
              onClick={handleMicClick}
            >
              <Mic size={20} />
            </Button>
          )}
        </form>
      </footer>

      <Sheet open={showContactInfo} onOpenChange={setShowContactInfo}>
        <SheetContent side="right" className="w-full md:w-[380px] p-0 flex flex-col">
          <SheetHeader className="px-6 py-4 border-b">
            <SheetTitle>Contact Info</SheetTitle>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <div className="flex flex-col items-center border-b px-6 py-8">
              <Avatar
                className="h-32 w-32 mb-4 cursor-pointer"
                onClick={() => onViewImage(friend.img_link)}
              >
                <AvatarImage src={friend.img_link} />
                <AvatarFallback className="text-3xl">{friend.username?.[0]}</AvatarFallback>
              </Avatar>
              <h2 className="text-xl font-semibold">{friend.username}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">{friend.email}</p>
            </div>
            <div className="p-6 space-y-5">
              <InfoRow
                label="About"
                value={
                  friend.privacy?.about !== false
                    ? friend.about || DEFAULT_ABOUT
                    : null
                }
              />
              <Separator />
              <InfoRow
                label="Email"
                value={friend.privacy?.email !== false ? friend.email : null}
              />
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">GitHub</p>
                {friend.privacy?.github !== false ? (
                  friend.github_username ? (
                    <a
                      href={`https://github.com/${friend.github_username}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline flex items-center gap-2 text-sm"
                    >
                      <Github size={15} /> {friend.github_username}
                    </a>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Not provided</p>
                  )
                ) : (
                  <p className="text-sm text-muted-foreground italic">This info is private</p>
                )}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </main>
  );
}
