import React, { useState, useEffect, useRef } from 'react';
import Cookies from 'js-cookie';
import {
  Send, Search, Settings, MoreVertical, Paperclip, Smile, Mic,
  ArrowLeft, Loader2, Edit2, Github, MessageSquare,
  Key, Trash2, Copy, Check, LogOut, Moon, Sun, Monitor,
  LayoutDashboard, User as UserIcon, Shield
} from 'lucide-react';
import {
  collection, addDoc, query, orderBy, onSnapshot, serverTimestamp,
  limit, doc, getDoc, setDoc, updateDoc, where, getDocs, deleteDoc, arrayUnion
} from 'firebase/firestore';
import {
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  onAuthStateChanged, signOut, updatePassword, GoogleAuthProvider,
  signInWithPopup, User
} from 'firebase/auth';
import EmojiPicker, { Theme as EmojiPickerTheme } from 'emoji-picker-react';
import { db, auth } from './firebase';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTheme, type Theme } from '@/hooks/use-theme';

// --- Interfaces ---
interface UserProfile {
  id: string;
  xyncId: string;
  username: string;
  about: string;
  github_username: string;
  img_link: string;
  email: string;
  privacy?: { about: boolean; email: boolean; github: boolean };
  contacts?: string[];
}

interface Message {
  id: string;
  text: string;
  senderId: string;
  createdAt: any;
}

const USER_STORAGE_KEY = 'xync_user_profile';

const readStoredUserProfile = (): UserProfile | null => {
  try {
    const storedUser = localStorage.getItem(USER_STORAGE_KEY);
    return storedUser ? (JSON.parse(storedUser) as UserProfile) : null;
  } catch {
    localStorage.removeItem(USER_STORAGE_KEY);
    return null;
  }
};

const storeUserProfile = (userData: UserProfile) => {
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
  Cookies.set('xync_user_id', userData.xyncId, { expires: 30 });
};

const clearStoredUserProfile = () => {
  localStorage.removeItem(USER_STORAGE_KEY);
  Cookies.remove('xync_user_id');
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => readStoredUserProfile());
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState('');
  const [generatedId, setGeneratedId] = useState('');

  const [searchId, setSearchId] = useState('');
  const [activeFriend, setActiveFriend] = useState<UserProfile | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [showSettings, setShowSettings] = useState(false);
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [updateData, setUpdateData] = useState<Partial<UserProfile>>({});
  const [isUpdating, setIsUpdating] = useState(false);

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [contactsList, setContactsList] = useState<UserProfile[]>([]);
  const [copied, setCopied] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [profileSaveMessage, setProfileSaveMessage] = useState('');
  const { theme, setTheme, isDark } = useTheme();

  const generateUniqueXyncId = async (): Promise<string> => {
    let xyncId = '';
    let isUnique = false;
    let attempts = 0;
    while (!isUnique && attempts < 10) {
      xyncId = Math.floor(111111111 + Math.random() * 888888889).toString();
      const q = query(collection(db, 'users'), where('xyncId', '==', xyncId));
      const snap = await getDocs(q);
      if (snap.empty) isUnique = true;
      attempts++;
    }
    return xyncId;
  };

  const createUserProfile = async (user: User, overrides: Partial<UserProfile> = {}): Promise<UserProfile> => {
    const xyncId = await generateUniqueXyncId();
    const userData: UserProfile = {
      id: user.uid,
      xyncId,
      username: overrides.username || user.displayName || name || 'Xync User',
      email: overrides.email || user.email || email,
      img_link: overrides.img_link || user.photoURL || photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
      about: 'Hey there! I am using Xync.',
      github_username: '',
      privacy: { about: true, email: true, github: true },
      contacts: [],
    };
    await setDoc(doc(db, 'users', user.uid), userData);
    return userData;
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !name) return;
    setIsAuthenticating(true);
    setAuthError('');
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const userData = await createUserProfile(cred.user, { username: name, email, img_link: photoUrl });
      storeUserProfile(userData);
      setGeneratedId(userData.xyncId);
      setCurrentUser(userData);
      setUpdateData(userData);
    } catch (err: any) {
      setAuthError(err.message || 'Error during sign up.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsAuthenticating(true);
    setAuthError('');
    try {
      const cred = await signInWithPopup(auth, new GoogleAuthProvider());
      const userRef = doc(db, 'users', cred.user.uid);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const userData = userDoc.data() as UserProfile;
        storeUserProfile(userData);
        setCurrentUser(userData);
        setUpdateData(userData);
        return;
      }
      const userData = await createUserProfile(cred.user);
      storeUserProfile(userData);
      setGeneratedId(userData.xyncId);
      setCurrentUser(userData);
      setUpdateData(userData);
    } catch (err: any) {
      setAuthError(err.message || 'Error signing in with Google.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsAuthenticating(true);
    setAuthError('');
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const userDoc = await getDoc(doc(db, 'users', cred.user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data() as UserProfile;
        storeUserProfile(userData);
        setCurrentUser(userData);
        setUpdateData(userData);
      } else {
        setAuthError('User profile not found.');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Invalid email or password.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      clearStoredUserProfile();
      setCurrentUser(null);
      setActiveFriend(null);
      setMessages([]);
      setShowSettings(false);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    let userUnsubscribe: (() => void) | null = null;
    const authUnsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        userUnsubscribe = onSnapshot(doc(db, 'users', user.uid), async (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data() as UserProfile;
            if (!userData.xyncId) {
              const newXyncId = await generateUniqueXyncId();
              await updateDoc(doc(db, 'users', user.uid), { xyncId: newXyncId });
              userData.xyncId = newXyncId;
            }
            storeUserProfile(userData);
            setCurrentUser(userData);
            setUpdateData((prev) => (Object.keys(prev).length === 0 || !showSettings ? userData : prev));
          }
        });
      } else {
        userUnsubscribe?.();
        userUnsubscribe = null;
        setCurrentUser(null);
        clearStoredUserProfile();
        setContactsList([]);
      }
    });
    return () => { authUnsubscribe(); userUnsubscribe?.(); };
  }, [showSettings]);

  const prevContactsRef = useRef<string[]>([]);
  useEffect(() => {
    if (!currentUser?.contacts || currentUser.contacts.length === 0) {
      setContactsList([]);
      prevContactsRef.current = [];
      return;
    }
    const curr = currentUser.contacts;
    const prev = prevContactsRef.current;
    if (curr.length === prev.length && curr.every((id, i) => id === prev[i])) return;
    prevContactsRef.current = curr;
    const fetchContacts = async () => {
      try {
        const snaps = await Promise.all(curr.map((id) => getDoc(doc(db, 'users', id))));
        setContactsList(snaps.filter((s) => s.exists()).map((s) => s.data() as UserProfile));
      } catch (err) { console.error(err); }
    };
    fetchContacts();
  }, [currentUser?.contacts]);

  const handleSearchFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchId.trim() || searchId === currentUser?.xyncId) return;
    setIsSearching(true);
    setSearchError('');
    try {
      const q = query(collection(db, 'users'), where('xyncId', '==', searchId.trim()));
      const snap = await getDocs(q);
      if (!snap.empty) {
        setActiveFriend(snap.docs[0].data() as UserProfile);
        setSearchId('');
      } else {
        setSearchError('No user found with this ID.');
      }
    } catch { setSearchError('Error searching for user.'); }
    finally { setIsSearching(false); }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setIsUpdating(true);
    try {
      const payload = {
        username: updateData.username || currentUser.username,
        about: updateData.about || currentUser.about,
        github_username: updateData.github_username || currentUser.github_username,
        img_link: updateData.img_link || currentUser.img_link,
        email: updateData.email || currentUser.email,
        privacy: updateData.privacy || currentUser.privacy || { about: true, email: true, github: true },
      };
      await updateDoc(doc(db, 'users', currentUser.id), payload);
      const updatedUser = { ...currentUser, ...payload };
      storeUserProfile(updatedUser);
      setCurrentUser(updatedUser);
      setProfileSaveMessage('Profile updated successfully.');
    } catch {
      setProfileSaveMessage('Profile update failed. Please try again.');
    }
    finally { setIsUpdating(false); }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    try {
      await updatePassword(auth.currentUser, newPassword);
      setPasswordMessage('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      setPasswordMessage(err.message || 'Error updating password.');
    }
  };

  useEffect(() => {
    if (showSettings && currentUser) {
      setUpdateData({ ...currentUser });
      setProfileSaveMessage('');
      setPasswordMessage('');
    }
  }, [showSettings, currentUser?.id]);

  useEffect(() => {
    if (!currentUser || !activeFriend) return;
    const chatId = [currentUser.id, activeFriend.id].sort().join('_');
    const q = query(collection(db, 'chats', chatId, 'messages'), orderBy('createdAt', 'asc'), limit(100));
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Message)));
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });
    return () => unsub();
  }, [currentUser, activeFriend]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser || !activeFriend) return;
    const text = newMessage;
    setNewMessage('');
    const chatId = [currentUser.id, activeFriend.id].sort().join('_');
    try {
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        text, senderId: currentUser.id, createdAt: serverTimestamp(),
      });
      if (!currentUser.contacts?.includes(activeFriend.id))
        await updateDoc(doc(db, 'users', currentUser.id), { contacts: arrayUnion(activeFriend.id) });
      await updateDoc(doc(db, 'users', activeFriend.id), { contacts: arrayUnion(currentUser.id) });
    } catch (err) { console.error(err); }
  };

  const deleteMessage = async (messageId: string) => {
    if (!currentUser || !activeFriend) return;
    const chatId = [currentUser.id, activeFriend.id].sort().join('_');
    try { await deleteDoc(doc(db, 'chats', chatId, 'messages', messageId)); } catch (err) { console.error(err); }
  };

  const clearChat = async () => {
    if (!currentUser || !activeFriend) return;
    const chatId = [currentUser.id, activeFriend.id].sort().join('_');
    try {
      const snap = await getDocs(query(collection(db, 'chats', chatId, 'messages')));
      await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
    } catch (err) { console.error(err); }
  };

  // ─── AUTH SCREENS ───────────────────────────────────────────────────────────

  if (!currentUser) {
    if (generatedId) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4 relative">
          <AuthThemeToggle theme={theme} setTheme={setTheme} />
          <Card className="w-full max-w-md shadow-lg">
            <CardContent className="p-8 space-y-6 text-center">
              <div className="flex justify-center">
                <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center">
                  <MessageSquare size={28} className="text-primary-foreground" fill="currentColor" />
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-semibold">Welcome to Xync!</h2>
                <p className="text-muted-foreground text-sm mt-2">
                  Your account is ready. Save this ID — you'll need it to connect with others.
                </p>
              </div>
              <div className="bg-muted rounded-xl p-5 border">
                <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Your Xync ID</p>
                <span className="text-3xl font-mono tracking-widest font-bold">{generatedId}</span>
              </div>
              <Button className="w-full" onClick={() => setGeneratedId('')}>
                I've saved my ID
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative">
        <AuthThemeToggle theme={theme} setTheme={setTheme} />
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center">
            <MessageSquare size={26} className="text-primary-foreground" fill="currentColor" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Xync</h1>
        </div>

        <Card className="w-full max-w-md shadow-lg">
          <CardContent className="p-8 space-y-5">
            <h2 className="text-xl font-semibold text-center">
              {authMode === 'signin' ? 'Sign in to your account' : 'Create an account'}
            </h2>

            <form onSubmit={authMode === 'signin' ? handleSignIn : handleSignUp} className="space-y-4">
              {authMode === 'signup' && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="photo">Photo URL <span className="text-muted-foreground font-normal">(optional)</span></Label>
                    <Input id="photo" type="url" placeholder="https://..." value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} />
                  </div>
                </>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>

              {authError && (
                <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{authError}</p>
              )}

              <Button type="submit" disabled={isAuthenticating} className="w-full">
                {isAuthenticating ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
                {authMode === 'signin' ? 'Sign In' : 'Sign Up'}
              </Button>
            </form>

            <div className="flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground uppercase">or</span>
              <Separator className="flex-1" />
            </div>

            <Button variant="outline" disabled={isAuthenticating} onClick={handleGoogleSignIn} className="w-full gap-2">
              {isAuthenticating
                ? <Loader2 className="animate-spin" size={16} />
                : <span className="w-5 h-5 rounded-full bg-[#4285f4] text-white text-xs font-bold flex items-center justify-center">G</span>}
              Continue with Google
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              {authMode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
              <button
                type="button"
                className="text-primary hover:underline font-medium"
                onClick={() => { setAuthMode(authMode === 'signin' ? 'signup' : 'signin'); setAuthError(''); }}
              >
                {authMode === 'signin' ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── MAIN APP ───────────────────────────────────────────────────────────────

  return (
    <TooltipProvider>
      <div className="h-screen w-full bg-background flex font-sans overflow-hidden">

        {/* ── Sidebar ── */}
        <aside className={`w-full md:w-[340px] md:min-w-[300px] md:max-w-[400px] border-r bg-background flex flex-col ${activeFriend ? 'hidden md:flex' : 'flex'}`}>

          {/* Sidebar Header */}
          <div className="h-16 px-4 flex items-center justify-between border-b bg-muted/30">
            <div className="flex items-center gap-2">
              <Avatar className="h-9 w-9 cursor-pointer" onClick={() => setShowSettings(true)}>
                <AvatarImage src={currentUser.img_link} />
                <AvatarFallback>{currentUser.username?.[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="font-semibold text-sm">{currentUser.username}</span>
            </div>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setTheme(isDark ? 'light' : 'dark')}
                    aria-label="Toggle dark mode"
                  >
                    {isDark ? <Sun size={18} /> : <Moon size={18} />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isDark ? 'Light mode' : 'Dark mode'}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={() => setShowSettings(true)}>
                    <Settings size={18} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Dashboard</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={handleSignOut}>
                    <LogOut size={18} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Sign Out</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Search */}
          <div className="p-3 border-b">
            <form onSubmit={handleSearchFriend} className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchId}
                  onChange={(e) => setSearchId(e.target.value)}
                  placeholder="Search by Xync ID…"
                  className="pl-9 h-9 text-sm"
                />
              </div>
              <Button type="submit" size="sm" variant="secondary" disabled={isSearching} className="h-9 px-3">
                {isSearching ? <Loader2 size={14} className="animate-spin" /> : 'Go'}
              </Button>
            </form>
            {searchError && <p className="text-xs text-destructive mt-1.5 px-1">{searchError}</p>}
          </div>

          {/* Contact list */}
          <ScrollArea className="flex-1">
            {activeFriend && !contactsList.find((c) => c.id === activeFriend.id) && (
              <ContactRow
                contact={activeFriend}
                isActive={true}
                onClick={() => setActiveFriend(activeFriend)}
              />
            )}
            {contactsList.length > 0 ? (
              contactsList.map((contact) => (
                <React.Fragment key={contact.id}>
                  <ContactRow
                    contact={contact}
                    isActive={activeFriend?.id === contact.id}
                    onClick={() => setActiveFriend(contact)}
                  />
                </React.Fragment>
              ))
            ) : !activeFriend ? (
              <div className="flex flex-col items-center justify-center h-48 text-center px-6 text-muted-foreground">
                <MessageSquare size={36} className="mb-3 opacity-30" />
                <p className="text-sm">Search a Xync ID above to start chatting</p>
              </div>
            ) : null}
          </ScrollArea>
        </aside>

        {/* ── Chat Area ── */}
        <main className={`flex-1 flex flex-col bg-muted/10 relative ${!activeFriend ? 'hidden md:flex' : 'flex'}`}>
          {activeFriend ? (
            <>
              {/* Chat Header */}
              <div
                className="h-16 px-4 flex items-center justify-between border-b bg-background cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => setShowContactInfo(true)}
              >
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden"
                    onClick={(e) => { e.stopPropagation(); setActiveFriend(null); setShowContactInfo(false); }}
                  >
                    <ArrowLeft size={20} />
                  </Button>
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={activeFriend.img_link} />
                    <AvatarFallback>{activeFriend.username?.[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-sm leading-tight">{activeFriend.username}</p>
                    <p className="text-xs text-muted-foreground">Click for contact info</p>
                  </div>
                </div>

                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon"><Search size={18} /></Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon"><MoreVertical size={18} /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setShowContactInfo(true)}>Contact info</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={clearChat}>Clear chat</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4 md:px-8">
                {messages.length === 0 ? (
                  <div className="flex justify-center mt-8">
                    <Badge variant="secondary" className="text-xs px-4 py-1.5 font-normal">
                      Messages are end-to-end encrypted
                    </Badge>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {messages.map((msg) => {
                      const isMe = msg.senderId === currentUser.id;
                      return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group items-end gap-1.5`}>
                          {isMe && (
                            <button
                              onClick={() => deleteMessage(msg.id)}
                              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity p-1 mb-0.5"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                          <div className={`max-w-[80%] md:max-w-[60%] px-3.5 py-2 rounded-2xl text-sm shadow-sm ${
                            isMe
                              ? 'bg-primary text-primary-foreground rounded-br-sm'
                              : 'bg-card border rounded-bl-sm'
                          }`}>
                            <span className="break-words">{msg.text}</span>
                            <span className={`text-[10px] float-right mt-1.5 ml-3 ${isMe ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                              {msg.createdAt?.toDate
                                ? msg.createdAt.toDate().toLocaleTimeString('en-US', {
                                    hour: '2-digit', minute: '2-digit', hour12: true,
                                  })
                                : '…'}
                            </span>
                          </div>
                          {!isMe && (
                            <button
                              onClick={() => deleteMessage(msg.id)}
                              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity p-1 mb-0.5"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                <div ref={messagesEndRef} />
              </ScrollArea>

              {/* Input */}
              <div className="p-3 border-t bg-background relative">
                {showEmojiPicker && (
                  <div className="absolute bottom-16 left-4 z-50">
                    <EmojiPicker
                      theme={isDark ? EmojiPickerTheme.DARK : EmojiPickerTheme.LIGHT}
                      onEmojiClick={(emoji) => {
                        setNewMessage((p) => p + emoji.emoji);
                        setShowEmojiPicker(false);
                      }}
                    />
                  </div>
                )}
                <form onSubmit={sendMessage} className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className={showEmojiPicker ? 'text-primary' : ''}
                  >
                    <Smile size={20} />
                  </Button>
                  <Button type="button" variant="ghost" size="icon">
                    <Paperclip size={20} />
                  </Button>
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message…"
                    className="flex-1 h-10"
                    autoComplete="off"
                  />
                  {newMessage.trim() ? (
                    <Button type="submit" size="icon">
                      <Send size={16} />
                    </Button>
                  ) : (
                    <Button type="button" variant="ghost" size="icon">
                      <Mic size={20} />
                    </Button>
                  )}
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-6">
                <MessageSquare size={44} className="opacity-30" />
              </div>
              <h2 className="text-2xl font-light mb-2">Xync Web</h2>
              <p className="text-sm text-center max-w-xs leading-relaxed">
                Search for a contact by Xync ID to start a conversation.
              </p>
            </div>
          )}
        </main>

        {/* ── Contact Info Sheet ── */}
        <Sheet open={showContactInfo && !!activeFriend} onOpenChange={setShowContactInfo}>
          <SheetContent side="right" className="w-full md:w-[380px] p-0 flex flex-col">
            <SheetHeader className="px-6 py-4 border-b">
              <SheetTitle>Contact Info</SheetTitle>
            </SheetHeader>
            {activeFriend && (
              <ScrollArea className="flex-1">
                <div className="py-8 flex flex-col items-center border-b px-6">
                  <Avatar
                    className="h-32 w-32 mb-4 cursor-pointer"
                    onClick={() => setSelectedImage(activeFriend.img_link)}
                  >
                    <AvatarImage src={activeFriend.img_link} />
                    <AvatarFallback className="text-3xl">{activeFriend.username?.[0]}</AvatarFallback>
                  </Avatar>
                  <h2 className="text-xl font-semibold">{activeFriend.username}</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">{activeFriend.email}</p>
                </div>

                <div className="p-6 space-y-5">
                  <InfoRow label="About" value={
                    activeFriend.privacy?.about !== false
                      ? activeFriend.about || 'Hey there! I am using Xync.'
                      : null
                  } />
                  <Separator />
                  <InfoRow label="Email" value={
                    activeFriend.privacy?.email !== false ? activeFriend.email : null
                  } />
                  <Separator />
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">GitHub</p>
                    {activeFriend.privacy?.github !== false ? (
                      activeFriend.github_username ? (
                        <a
                          href={`https://github.com/${activeFriend.github_username}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline flex items-center gap-2 text-sm"
                        >
                          <Github size={15} /> {activeFriend.github_username}
                        </a>
                      ) : <p className="text-sm text-muted-foreground italic">Not provided</p>
                    ) : <p className="text-sm text-muted-foreground italic">This info is private</p>}
                  </div>
                </div>
              </ScrollArea>
            )}
          </SheetContent>
        </Sheet>

        {/* ── Settings Dashboard ── */}
        <Sheet open={showSettings} onOpenChange={setShowSettings}>
          <SheetContent side="left" className="w-full sm:max-w-md p-0 flex flex-col gap-0">
            <SheetHeader className="px-6 py-5 border-b bg-muted/30 shrink-0">
              <div className="flex items-center gap-3 pr-8">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                  <LayoutDashboard size={20} />
                </div>
                <div>
                  <SheetTitle>Dashboard</SheetTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">Manage your account & preferences</p>
                </div>
              </div>
            </SheetHeader>

            <Tabs defaultValue="overview" className="flex flex-1 flex-col min-h-0 gap-0">
              <div className="px-4 pt-4 pb-2 border-b shrink-0">
                <TabsList className="w-full">
                  <TabsTrigger value="overview" className="gap-1.5">
                    <LayoutDashboard size={14} />
                    <span className="sr-only sm:not-sr-only sm:inline">Overview</span>
                  </TabsTrigger>
                  <TabsTrigger value="profile" className="gap-1.5">
                    <UserIcon size={14} />
                    <span className="sr-only sm:not-sr-only sm:inline">Profile</span>
                  </TabsTrigger>
                  <TabsTrigger value="security" className="gap-1.5">
                    <Shield size={14} />
                    <span className="sr-only sm:not-sr-only sm:inline">Security</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              <ScrollArea className="flex-1">
                <TabsContent value="overview" className="mt-0 px-4 py-5 space-y-4">
                  <div className="flex flex-col items-center text-center pb-2">
                    <div
                      className="relative group cursor-pointer mb-3"
                      onClick={() => setSelectedImage(currentUser.img_link)}
                    >
                      <Avatar className="h-24 w-24 ring-2 ring-border">
                        <AvatarImage src={currentUser.img_link} />
                        <AvatarFallback className="text-2xl">{currentUser.username?.[0]}</AvatarFallback>
                      </Avatar>
                      <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Edit2 size={18} className="text-white" />
                      </div>
                    </div>
                    <p className="font-semibold">{currentUser.username}</p>
                    <p className="text-sm text-muted-foreground line-clamp-2 max-w-[260px]">
                      {currentUser.about || 'Hey there! I am using Xync.'}
                    </p>
                  </div>

                  <Card size="sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Your Xync ID</CardTitle>
                      <CardDescription>Share this ID so others can find you</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center justify-between gap-2 rounded-2xl bg-muted px-4 py-3">
                        <span className="font-mono text-lg font-semibold tracking-wider">{currentUser.xyncId}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => {
                            navigator.clipboard.writeText(currentUser.xyncId);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                          }}
                        >
                          {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="grid grid-cols-2 gap-3">
                    <Card size="sm" className="py-4">
                      <CardContent className="pt-0 text-center">
                        <p className="text-2xl font-semibold">{contactsList.length}</p>
                        <p className="text-xs text-muted-foreground mt-1">Contacts</p>
                      </CardContent>
                    </Card>
                    <Card size="sm" className="py-4">
                      <CardContent className="pt-0 text-center">
                        <p className="text-2xl font-semibold">{isDark ? 'Dark' : 'Light'}</p>
                        <p className="text-xs text-muted-foreground mt-1">Theme</p>
                      </CardContent>
                    </Card>
                  </div>

                  <Card size="sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        {isDark ? <Moon size={15} /> : <Sun size={15} />}
                        Appearance
                      </CardTitle>
                      <CardDescription>Choose light, dark, or match your system</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <ThemeSelector theme={theme} setTheme={setTheme} />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="profile" className="mt-0 px-4 py-5">
                  <form onSubmit={handleUpdateProfile} className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium flex items-center gap-2 mb-1">
                        <UserIcon size={15} className="text-muted-foreground" />
                        Edit Profile
                      </h3>
                      <p className="text-xs text-muted-foreground">Update how others see you on Xync</p>
                    </div>

                    {[
                      { id: 'u-name', label: 'Display Name', key: 'username', type: 'text', placeholder: 'Your name' },
                      { id: 'u-about', label: 'About', key: 'about', type: 'text', placeholder: 'A short bio…' },
                      { id: 'u-email', label: 'Email', key: 'email', type: 'email', placeholder: 'you@example.com' },
                      { id: 'u-photo', label: 'Photo URL', key: 'img_link', type: 'url', placeholder: 'https://…' },
                      { id: 'u-github', label: 'GitHub Username', key: 'github_username', type: 'text', placeholder: 'username' },
                    ].map(({ id, label, key, type, placeholder }) => (
                      <div key={id} className="space-y-1.5">
                        <Label htmlFor={id}>{label}</Label>
                        <Input
                          id={id}
                          type={type}
                          placeholder={placeholder}
                          value={(updateData as Record<string, string>)[key] || ''}
                          onChange={(e) => setUpdateData({ ...updateData, [key]: e.target.value })}
                        />
                      </div>
                    ))}

                    <Separator />
                    <div>
                      <p className="text-sm font-medium mb-3">Privacy</p>
                      <div className="space-y-3">
                        {(['about', 'email', 'github'] as const).map((field) => (
                          <div key={field} className="flex items-center justify-between">
                            <Label htmlFor={`priv-${field}`} className="capitalize font-normal">
                              Show {field}
                            </Label>
                            <Switch
                              id={`priv-${field}`}
                              checked={updateData.privacy?.[field] ?? true}
                              onCheckedChange={(v) =>
                                setUpdateData({
                                  ...updateData,
                                  privacy: {
                                    ...(updateData.privacy || { about: true, email: true, github: true }),
                                    [field]: v,
                                  },
                                })
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {profileSaveMessage && (
                      <p
                        className={`text-sm ${profileSaveMessage.includes('success') ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}
                      >
                        {profileSaveMessage}
                      </p>
                    )}

                    <Button type="submit" disabled={isUpdating} className="w-full">
                      {isUpdating ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
                      Save Profile
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="security" className="mt-0 px-4 py-5 space-y-6">
                  <div>
                    <h3 className="text-sm font-medium flex items-center gap-2 mb-1">
                      <Key size={15} className="text-muted-foreground" />
                      Change Password
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Use a strong password you do not use elsewhere
                    </p>
                  </div>

                  <form onSubmit={handleChangePassword} className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="current-pw">Current password</Label>
                      <Input
                        id="current-pw"
                        type="password"
                        placeholder="Current password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="new-pw">New password</Label>
                      <Input
                        id="new-pw"
                        type="password"
                        placeholder="New password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                      />
                    </div>
                    {passwordMessage && (
                      <p
                        className={`text-sm ${passwordMessage.includes('success') ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}
                      >
                        {passwordMessage}
                      </p>
                    )}
                    <Button type="submit" variant="outline" className="w-full">
                      Update Password
                    </Button>
                  </form>

                  <Separator />

                  <Card size="sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        {isDark ? <Moon size={15} /> : <Sun size={15} />}
                        Appearance
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <ThemeSelector theme={theme} setTheme={setTheme} />
                    </CardContent>
                  </Card>
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </SheetContent>
        </Sheet>

        {/* ── Image Modal ── */}
        <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
          <DialogContent className="max-w-lg p-2 bg-black border-none">
            {selectedImage && (
              <img src={selectedImage} alt="Profile" className="w-full h-auto rounded-lg object-contain" />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}

// ─── Helper Components ──────────────────────────────────────────────────────

function ContactRow({ contact, isActive, onClick }: { contact: UserProfile; isActive: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center px-3 py-3 gap-3 hover:bg-muted/50 transition-colors text-left ${isActive ? 'bg-muted' : ''}`}
    >
      <Avatar className="h-11 w-11 flex-shrink-0">
        <AvatarImage src={contact.img_link} />
        <AvatarFallback>{contact.username?.[0]?.toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0 border-b pb-3">
        <p className="font-medium text-sm truncate">{contact.username}</p>
        <p className="text-xs text-muted-foreground truncate">{contact.about || 'Hey there! I am using Xync.'}</p>
      </div>
    </button>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">{label}</p>
      {value !== null
        ? <p className="text-sm">{value}</p>
        : <p className="text-sm text-muted-foreground italic">This info is private</p>}
    </div>
  );
}

function ThemeSelector({ theme, setTheme }: { theme: Theme; setTheme: (t: Theme) => void }) {
  const options: { value: Theme; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: 'Light', icon: <Sun size={16} /> },
    { value: 'dark', label: 'Dark', icon: <Moon size={16} /> },
    { value: 'system', label: 'System', icon: <Monitor size={16} /> },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {options.map((opt) => (
        <Button
          key={opt.value}
          type="button"
          variant={theme === opt.value ? 'default' : 'outline'}
          className="flex h-auto flex-col gap-1.5 py-3"
          onClick={() => setTheme(opt.value)}
        >
          {opt.icon}
          <span className="text-xs">{opt.label}</span>
        </Button>
      ))}
    </div>
  );
}

function AuthThemeToggle({ theme, setTheme }: { theme: Theme; setTheme: (t: Theme) => void }) {
  const cycleTheme = () => {
    const order: Theme[] = ['light', 'dark', 'system'];
    const next = order[(order.indexOf(theme) + 1) % order.length];
    setTheme(next);
  };

  const icon =
    theme === 'dark' ? <Moon size={18} /> : theme === 'light' ? <Sun size={18} /> : <Monitor size={18} />;

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="absolute top-4 right-4"
      onClick={cycleTheme}
      aria-label="Toggle theme"
    >
      {icon}
    </Button>
  );
}