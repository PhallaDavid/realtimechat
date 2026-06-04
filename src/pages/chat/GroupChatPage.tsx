import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import EmojiPicker, { Theme as EmojiPickerTheme } from 'emoji-picker-react';
import {
  ArrowLeft, Github, Loader2, Mic, MoreVertical, Paperclip, Search, Send, Smile, Square, Trash2, X, Plus, UserMinus, LogOut, Info, Settings,
} from 'lucide-react';
import {
  collection, deleteDoc, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query, updateDoc, arrayUnion, arrayRemove, addDoc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/src/firebase';
import { useAuth } from '@/src/contexts/auth-context';
import { usePresence } from '@/src/hooks/use-presence';
import { useContacts } from '@/src/hooks/use-contacts';
import { useGroupMessages } from '@/src/hooks/use-group-messages';
import { DEFAULT_ABOUT } from '@/src/lib/brand';
import { prepareMediaForMessage } from '@/src/lib/media-firestore';
import { useVoiceRecorder } from '@/src/hooks/use-voice-recorder';
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
import { MessageContent } from '@/src/components/chat/MessageContent';
import { Skeleton } from '@/components/ui/skeleton';
import type { UserProfile, GroupChat } from '@/src/types';

type ChatOutletContext = { onViewImage: (url: string) => void };

export function GroupChatPage() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { onViewImage } = useOutletContext<ChatOutletContext>();
  const { currentUser } = useAuth();
  const { isDark } = useTheme();

  const [group, setGroup] = useState<GroupChat | null>(null);
  const [groupLoading, setGroupLoading] = useState(true);
  const [members, setMembers] = useState<UserProfile[]>([]);
  const { messages, loading: messagesLoading } = useGroupMessages(groupId);

  const [newMessage, setNewMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { isRecording, duration, startRecording, stopRecording, cancelRecording } = useVoiceRecorder();

  // Load contacts to support adding members
  const { contacts: allContacts } = useContacts(currentUser?.id, currentUser?.contacts || []);

  // Subscribe to group data
  useEffect(() => {
    if (!groupId || !currentUser) {
      setGroup(null);
      setGroupLoading(false);
      return;
    }

    setGroupLoading(true);
    const unsub = onSnapshot(
      doc(db, 'groups', groupId),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setGroup({
            id: docSnap.id,
            name: data.name || '',
            description: data.description || '',
            createdBy: data.createdBy || '',
            createdAt: data.createdAt || null,
            members: data.members || [],
            img_link: data.img_link || '',
            lastMessage: data.lastMessage,
          });
        } else {
          setGroup(null);
        }
        setGroupLoading(false);
      },
      (err) => {
        console.error('Error fetching group:', err);
        setGroup(null);
        setGroupLoading(false);
      }
    );

    return () => unsub();
  }, [groupId, currentUser?.id]);

  // Load group members profiles
  useEffect(() => {
    if (!group?.members?.length) {
      setMembers([]);
      return;
    }

    let cancelled = false;
    const fetchMembers = async () => {
      try {
        const snaps = await Promise.all(
          group.members.map((id) => getDoc(doc(db, 'users', id)))
        );
        if (cancelled) return;
        const profiles = snaps
          .filter((s) => s.exists())
          .map((s) => ({ ...s.data(), id: s.id } as UserProfile));
        setMembers(profiles);
      } catch (err) {
        console.error('Error loading group members:', err);
      }
    };

    fetchMembers();
    return () => {
      cancelled = true;
    };
  }, [group?.members?.join(',')]);

  // Scroll to bottom when messages load/change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [messages.length]);

  const sendGroupTextMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser || !groupId || isUploading) return;
    const text = newMessage;
    setNewMessage('');
    setUploadError('');
    try {
      await addDoc(collection(db, 'groups', groupId, 'messages'), {
        type: 'text',
        text,
        senderId: currentUser.id,
        senderName: currentUser.username,
        senderAvatar: currentUser.img_link,
        createdAt: serverTimestamp(),
      });

      await updateDoc(doc(db, 'groups', groupId), {
        lastMessage: {
          text,
          senderId: currentUser.id,
          senderName: currentUser.username,
          createdAt: serverTimestamp(),
          type: 'text',
        },
      });
    } catch (err) {
      console.error(err);
      setUploadError('Failed to send message.');
      setNewMessage(text);
    }
  };

  const sendGroupMediaFile = async (file: File, voiceDuration?: number) => {
    if (!currentUser || !groupId || isUploading) return;
    setIsUploading(true);
    setUploadError('');
    try {
      const prepared = await prepareMediaForMessage(file);
      await addDoc(collection(db, 'groups', groupId, 'messages'), {
        type: prepared.type,
        text: '',
        mediaUrl: prepared.mediaUrl,
        fileName: prepared.fileName,
        mimeType: prepared.mimeType,
        duration: voiceDuration,
        senderId: currentUser.id,
        senderName: currentUser.username,
        senderAvatar: currentUser.img_link,
        createdAt: serverTimestamp(),
      });

      let lastMsgText = '';
      if (prepared.type === 'image') lastMsgText = '📷 Photo';
      else if (prepared.type === 'voice') lastMsgText = '🎤 Voice message';
      else lastMsgText = `📎 ${prepared.fileName || 'File'}`;

      await updateDoc(doc(db, 'groups', groupId), {
        lastMessage: {
          text: lastMsgText,
          senderId: currentUser.id,
          senderName: currentUser.username,
          createdAt: serverTimestamp(),
          type: prepared.type,
        },
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
    if (file) await sendGroupMediaFile(file);
  };

  const handleMicClick = async () => {
    if (isUploading) return;
    setUploadError('');
    if (isRecording) {
      const file = await stopRecording();
      if (file) await sendGroupMediaFile(file, duration);
      return;
    }
    try {
      await startRecording();
    } catch {
      setUploadError('Microphone access denied or not supported.');
    }
  };

  const deleteMessage = async (messageId: string) => {
    if (!currentUser || !groupId) return;
    try {
      await updateDoc(doc(db, 'groups', groupId, 'messages', messageId), {
        deleted: true,
        text: '',
        mediaUrl: null,
        fileName: null,
        mimeType: null,
      });
    } catch (err) {
      console.error('Error deleting message:', err);
    }
  };

  const addMember = async (contact: UserProfile) => {
    if (!groupId || !currentUser) return;
    try {
      await updateDoc(doc(db, 'groups', groupId), {
        members: arrayUnion(contact.id),
      });

      const messageText = `${currentUser.username} added ${contact.username} to the group`;
      await addDoc(collection(db, 'groups', groupId, 'messages'), {
        type: 'text',
        text: messageText,
        senderId: 'system',
        senderName: 'System',
        createdAt: serverTimestamp(),
      });

      await updateDoc(doc(db, 'groups', groupId), {
        lastMessage: {
          text: messageText,
          senderId: 'system',
          senderName: 'System',
          createdAt: serverTimestamp(),
          type: 'text',
        },
      });
    } catch (err) {
      console.error('Error adding member:', err);
    }
  };

  const leaveGroup = async () => {
    if (!groupId || !currentUser || !group) return;
    try {
      const isCreator = group.createdBy === currentUser.id;
      if (isCreator && group.members.length > 1) {
        // Find next candidate for admin
        const nextAdmin = group.members.find((id) => id !== currentUser.id) || '';
        await updateDoc(doc(db, 'groups', groupId), {
          createdBy: nextAdmin,
        });
      }

      await updateDoc(doc(db, 'groups', groupId), {
        members: arrayRemove(currentUser.id),
      });

      // Write system message
      const messageText = `${currentUser.username} left the group`;
      await addDoc(collection(db, 'groups', groupId, 'messages'), {
        type: 'text',
        text: messageText,
        senderId: 'system',
        senderName: 'System',
        createdAt: serverTimestamp(),
      });

      await updateDoc(doc(db, 'groups', groupId), {
        lastMessage: {
          text: messageText,
          senderId: 'system',
          senderName: 'System',
          createdAt: serverTimestamp(),
          type: 'text',
        },
      });

      setShowGroupInfo(false);
      navigate('/app/chats');
    } catch (err) {
      console.error('Error leaving group:', err);
    }
  };

  const deleteGroup = async () => {
    if (!groupId || !group || !currentUser || group.createdBy !== currentUser.id) return;
    if (!confirm('Are you sure you want to delete this group? All chat history will be lost.')) return;
    try {
      // Clear messages first
      const snap = await getDocs(collection(db, 'groups', groupId, 'messages'));
      await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
      // Delete group doc
      await deleteDoc(doc(db, 'groups', groupId));

      setShowGroupInfo(false);
      navigate('/app/chats');
    } catch (err) {
      console.error('Error deleting group:', err);
    }
  };

  if (!groupId) return null;

  const chatShell = 'flex h-full min-h-0 w-full flex-col overflow-hidden bg-muted/10';

  if (groupLoading) {
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

  if (!group) {
    return (
      <main className={`${chatShell} items-center justify-center text-muted-foreground`}>
        <p className="text-sm">Group not found or you are not a member.</p>
      </main>
    );
  }

  // Filter contacts who are NOT members to display in "Add members" section
  const joinableContacts = allContacts.filter((contact) => !group.members.includes(contact.id));

  return (
    <main className={chatShell}>
      <header
        className="z-20 flex min-h-[calc(3.5rem+max(0.75rem,env(safe-area-inset-top,0px)))] shrink-0 cursor-pointer items-center justify-between border-b bg-background px-3 pb-2.5 pt-safe transition-colors hover:bg-muted/30 md:min-h-16 md:pt-0 sm:px-4"
        onClick={() => setShowGroupInfo(true)}
      >
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={(e) => {
              e.stopPropagation();
              navigate('/app/chats');
              setShowGroupInfo(false);
            }}
          >
            <ArrowLeft size={20} />
          </Button>
          <div className="relative">
            <Avatar className="h-9 w-9">
              <AvatarImage src={group.img_link} />
              <AvatarFallback className="bg-primary/10 text-primary font-bold">
                {group.name?.[0]?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
          </div>
          <div>
            <p className="font-semibold text-sm leading-tight truncate max-w-[200px] sm:max-w-[300px]">
              {group.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {group.members.length} members
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" onClick={() => setShowGroupInfo(true)}>
            <Info size={18} />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical size={18} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowGroupInfo(true)}>Group info</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={leaveGroup}>
                Leave group
              </DropdownMenuItem>
              {group.createdBy === currentUser?.id && (
                <DropdownMenuItem className="text-destructive" onClick={deleteGroup}>
                  Delete group
                </DropdownMenuItem>
              )}
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
              Conversation started
            </Badge>
          </div>
        ) : (
          <div className="space-y-2 pb-2">
            {messages.map((msg) => {
              const isMe = msg.senderId === currentUser?.id;
              const isSystem = msg.senderId === 'system';

              if (isSystem) {
                return (
                  <div key={msg.id} className="flex justify-center my-2.5">
                    <Badge variant="secondary" className="px-3.5 py-1 text-[11px] font-normal text-muted-foreground border-none shadow-none bg-muted/60 rounded-full">
                      {msg.text}
                    </Badge>
                  </div>
                );
              }

              const sender = members.find((m) => m.id === msg.senderId);

              return (
                <div
                  key={msg.id}
                  className={`group flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}
                >
                  {!isMe && (
                    <Avatar className="h-8 w-8 shrink-0 mb-0.5 shadow-sm border">
                      <AvatarImage src={sender?.img_link} />
                      <AvatarFallback className="text-[10px] font-medium bg-muted">
                        {(sender?.username?.[0] || msg.senderName?.[0] || '?').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  {isMe && !msg.deleted && (
                    <button
                      type="button"
                      onClick={() => deleteMessage(msg.id)}
                      className="mb-0.5 p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive md:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm shadow-sm sm:max-w-[75%] md:max-w-[60%] ${
                      isMe
                        ? 'rounded-br-sm bg-primary text-primary-foreground'
                        : 'rounded-bl-sm border bg-card text-foreground'
                    }`}
                  >
                    {!isMe && (
                      <p className="text-[11px] font-semibold text-primary mb-1 truncate leading-none">
                        {sender?.username || msg.senderName}
                      </p>
                    )}
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
        <form onSubmit={sendGroupTextMessage} className="flex items-center gap-1.5 sm:gap-2">
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

      {/* Group Details Sheet */}
      <Sheet open={showGroupInfo} onOpenChange={setShowGroupInfo}>
        <SheetContent side="right" className="w-full md:w-[380px] p-0 flex flex-col">
          <SheetHeader className="px-6 py-4 border-b">
            <SheetTitle>Group Info</SheetTitle>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {/* Header info */}
            <div className="flex flex-col items-center border-b px-6 py-8">
              <Avatar className="h-28 w-28 mb-4">
                <AvatarImage src={group.img_link} />
                <AvatarFallback className="text-4xl bg-primary/10 text-primary font-bold">
                  {group.name?.[0]?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-xl font-semibold text-center truncate max-w-full px-2">{group.name}</h2>
              <p className="text-xs text-muted-foreground mt-1">Group · {group.members.length} members</p>
            </div>

            <div className="p-6 space-y-6">
              {/* Description */}
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">Description</p>
                <p className="text-sm">
                  {group.description || <span className="italic text-muted-foreground">No description provided</span>}
                </p>
              </div>
              <Separator />

              {/* Members List */}
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
                  Members ({group.members.length})
                </p>
                <div className="space-y-3">
                  {members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={member.img_link} />
                          <AvatarFallback className="text-xs">
                            {member.username?.[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate flex items-center gap-1.5">
                            {member.username}
                            {member.id === currentUser?.id && (
                              <span className="text-[10px] text-muted-foreground font-normal bg-muted px-1.5 py-0.5 rounded">You</span>
                            )}
                            {member.id === group.createdBy && (
                              <span className="text-[10px] text-primary font-normal bg-primary/10 px-1.5 py-0.5 rounded">Owner</span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add Members Section */}
              {joinableContacts.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Add Contacts to Group</p>
                    <div className="space-y-2 max-h-[160px] overflow-y-auto border rounded-xl p-2 bg-muted/10">
                      {joinableContacts.map((contact) => (
                        <div key={contact.id} className="flex items-center justify-between p-1.5 hover:bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-2 min-w-0">
                            <Avatar className="h-7 w-7">
                              <AvatarImage src={contact.img_link} />
                              <AvatarFallback className="text-[10px]">
                                {contact.username?.[0]?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs font-medium truncate">{contact.username}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => addMember(contact)}
                            className="text-primary hover:text-primary-foreground hover:bg-primary"
                          >
                            <Plus size={14} />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <Separator />

              {/* Leave and Delete buttons */}
              <div className="space-y-2.5">
                <Button variant="outline" className="w-full text-destructive hover:bg-destructive/5" onClick={leaveGroup}>
                  <LogOut size={16} className="mr-2" />
                  Leave Group
                </Button>
                {group.createdBy === currentUser?.id && (
                  <Button variant="destructive" className="w-full" onClick={deleteGroup}>
                    <Trash2 size={16} className="mr-2" />
                    Delete Group
                  </Button>
                )}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </main>
  );
}
