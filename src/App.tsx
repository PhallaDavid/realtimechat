import React, { useState, useEffect, useRef } from 'react';
import Cookies from 'js-cookie';
import { Send, Search, Settings, MoreVertical, Paperclip, Smile, Mic, ArrowLeft, LogIn, Loader2, Edit2, X, Github, Mail, MessageSquare, Key, Trash2, Copy, Check } from 'lucide-react';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, limit, doc, getDoc, setDoc, updateDoc, where, getDocs, runTransaction, deleteDoc, arrayUnion } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, updatePassword, GoogleAuthProvider, signInWithPopup, User } from 'firebase/auth';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { db, auth } from './firebase';

// --- Interfaces ---
interface UserProfile {
  id: string;
  xyncId: string;
  username: string;
  about: string;
  github_username: string;
  img_link: string;
  email: string;
  privacy?: {
    about: boolean;
    email: boolean;
    github: boolean;
  };
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
    return storedUser ? JSON.parse(storedUser) as UserProfile : null;
  } catch (err) {
    console.error('Error reading stored user profile:', err);
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
  // --- States ---
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
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [updateData, setUpdateData] = useState<Partial<UserProfile>>({});
  const [isUpdating, setIsUpdating] = useState(false);

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [contactsList, setContactsList] = useState<UserProfile[]>([]);
  const [copied, setCopied] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');

  // --- Functions ---

  const generateUniqueXyncId = async (): Promise<string> => {
    let xyncId = '';
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!isUnique && attempts < maxAttempts) {
      xyncId = Math.floor(111111111 + Math.random() * 888888889).toString();
      const q = query(collection(db, 'users'), where('xyncId', '==', xyncId));
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        isUnique = true;
      }
      attempts++;
    }
    return xyncId;
  };

  const createUserProfile = async (user: User, profileOverrides: Partial<UserProfile> = {}): Promise<UserProfile> => {
    const xyncId = await generateUniqueXyncId();
    const userData: UserProfile = {
      id: user.uid,
      xyncId,
      username: profileOverrides.username || user.displayName || name || 'Xync User',
      email: profileOverrides.email || user.email || email,
      img_link: profileOverrides.img_link || user.photoURL || photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
      about: 'Hey there! I am using Xync.',
      github_username: '',
      privacy: {
        about: true,
        email: true,
        github: true
      },
      contacts: []
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
      // 1. Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userData = await createUserProfile(user, {
        username: name,
        email,
        img_link: photoUrl
      });

      storeUserProfile(userData);
      setGeneratedId(userData.xyncId);
      setCurrentUser(userData);
      setUpdateData(userData);
    } catch (err: any) {
      console.error(err);
      setAuthError(err.message || 'Error during sign up.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsAuthenticating(true);
    setAuthError('');

    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const userData = userDoc.data() as UserProfile;
        storeUserProfile(userData);
        setCurrentUser(userData);
        setUpdateData(userData);
        return;
      }

      const userData = await createUserProfile(user);
      storeUserProfile(userData);
      setGeneratedId(userData.xyncId);
      setCurrentUser(userData);
      setUpdateData(userData);
    } catch (err: any) {
      console.error(err);
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
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data() as UserProfile;
        storeUserProfile(userData);
        setCurrentUser(userData);
        setUpdateData(userData);
      } else {
        setAuthError('User profile not found.');
      }
    } catch (err: any) {
      console.error(err);
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
      console.error("Error signing out:", err);
    }
  };

  useEffect(() => {
    let userUnsubscribe: (() => void) | null = null;

    const authUnsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Start real-time listener for the user document
        userUnsubscribe = onSnapshot(doc(db, 'users', user.uid), async (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data() as UserProfile;
            
            // Migration: If user doesn't have a xyncId, generate one
            if (!userData.xyncId) {
              const newXyncId = await generateUniqueXyncId();
              await updateDoc(doc(db, 'users', user.uid), { xyncId: newXyncId });
              userData.xyncId = newXyncId;
            }

            storeUserProfile(userData);
            setCurrentUser(userData);
            // Only set updateData if we're not currently in the middle of an update
            // or if it's the first time loading the user
            setUpdateData(prev => {
              if (Object.keys(prev).length === 0 || !showSettings) {
                return userData;
              }
              return prev;
            });
          }
        }, (err) => {
          console.error("User profile listener error:", err);
        });
      } else {
        if (userUnsubscribe) {
          userUnsubscribe();
          userUnsubscribe = null;
        }
        setCurrentUser(null);
        clearStoredUserProfile();
        setContactsList([]);
      }
    });

    return () => {
      authUnsubscribe();
      if (userUnsubscribe) userUnsubscribe();
    };
  }, [showSettings]);

  const prevContactsRef = useRef<string[]>([]);

  useEffect(() => {
    if (!currentUser?.contacts || currentUser.contacts.length === 0) {
      setContactsList([]);
      prevContactsRef.current = [];
      return;
    }
    
    // Check if contacts actually changed
    const currentContacts = currentUser.contacts;
    const prevContacts = prevContactsRef.current;
    if (currentContacts.length === prevContacts.length && currentContacts.every((id, i) => id === prevContacts[i])) {
      return;
    }
    prevContactsRef.current = currentContacts;
    
    const fetchContacts = async () => {
      try {
        const promises = currentContacts.map(id => getDoc(doc(db, 'users', id)));
        const snaps = await Promise.all(promises);
        const profiles: UserProfile[] = [];
        snaps.forEach(snap => {
          if (snap.exists()) {
            profiles.push(snap.data() as UserProfile);
          }
        });
        setContactsList(profiles);
      } catch (err) {
        console.error("Error fetching contacts:", err);
      }
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
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        setActiveFriend(querySnapshot.docs[0].data() as UserProfile);
        setSearchId('');
      } else {
        setSearchError('User not found with this ID.');
      }
    } catch (err) {
      setSearchError('Error searching for user.');
    } finally {
      setIsSearching(false);
    }
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
        privacy: updateData.privacy || currentUser.privacy || { about: true, email: true, github: true }
      };

      const userRef = doc(db, 'users', currentUser.id);
      await updateDoc(userRef, payload);

      const updatedUser = { ...currentUser, ...payload };
      storeUserProfile(updatedUser);
      setCurrentUser(updatedUser);
      setShowSettings(false);
      alert('Profile Updated Successfully!');
    } catch (err) {
      alert('Profile Update Failed.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !auth.currentUser) return;
    
    try {
      // Note: This requires the user to have recently signed in.
      // For a robust app, you might need to re-authenticate the user first.
      await updatePassword(auth.currentUser, newPassword);
      setPasswordMessage('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      setPasswordMessage(err.message || 'Error updating password. You may need to sign out and sign in again.');
    }
  };

  useEffect(() => {
    if (!currentUser || !activeFriend) return;

    const chatId = [currentUser.id, activeFriend.id].sort().join('_');

    const q = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: Message[] = [];
      snapshot.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() } as Message);
      });
      setMessages(msgs);
      
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }, (err) => {
      console.error("Firebase Error:", err);
    });

    return () => unsubscribe();
  }, [currentUser, activeFriend]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser || !activeFriend) return;

    const text = newMessage;
    setNewMessage('');
    const chatId = [currentUser.id, activeFriend.id].sort().join('_');

    try {
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        text: text,
        senderId: currentUser.id,
        createdAt: serverTimestamp()
      });

      // Add to current user's contacts if not already there
      if (!currentUser.contacts || !currentUser.contacts.includes(activeFriend.id)) {
        await updateDoc(doc(db, 'users', currentUser.id), {
          contacts: arrayUnion(activeFriend.id)
        });
      }

      // Add to recipient's contacts if not already there
      // We don't check if it's already there on the client side for the recipient to avoid extra reads, 
      // arrayUnion handles duplicates automatically in Firestore.
      await updateDoc(doc(db, 'users', activeFriend.id), {
        contacts: arrayUnion(currentUser.id)
      });
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  const deleteMessage = async (messageId: string) => {
    if (!currentUser || !activeFriend) return;
    const chatId = [currentUser.id, activeFriend.id].sort().join('_');
    try {
      await deleteDoc(doc(db, 'chats', chatId, 'messages', messageId));
    } catch (err) {
      console.error("Error deleting message:", err);
    }
  };

  const clearChat = async () => {
    if (!currentUser || !activeFriend) return;
    const chatId = [currentUser.id, activeFriend.id].sort().join('_');
    try {
      const q = query(collection(db, 'chats', chatId, 'messages'));
      const snapshot = await getDocs(q);
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      setShowChatMenu(false);
    } catch (err) {
      console.error("Error clearing chat:", err);
    }
  };

  // --- UI Renders ---

  // Login Screen (Xync Branding)
  if (!currentUser) {
    if (generatedId) {
      return (
        <div className="min-h-screen bg-[#111b21] flex flex-col items-center justify-center p-4 font-sans text-[#e9edef]">
          <div className="bg-[#202c33] p-8 rounded-2xl w-full max-w-md shadow-2xl border border-[#00a884]">
            <h2 className="text-2xl font-medium mb-4 text-center text-[#00a884]">Welcome to Xync!</h2>
            <p className="text-center text-[#aebac1] mb-6">Your account has been created successfully. Please save your auto-generated ID for future reference.</p>
            
            <div className="bg-[#111b21] p-4 rounded-lg text-center mb-8 border border-[#2a3942]">
              <span className="text-3xl font-mono tracking-widest text-white">{generatedId}</span>
            </div>

            <button
              onClick={() => {
                setGeneratedId('');
              }}
              className="w-full bg-[#00a884] hover:bg-[#029072] text-[#111b21] font-medium py-3 rounded-lg transition-colors"
            >
              I have saved my ID
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#111b21] flex flex-col items-center justify-center p-4 font-sans text-[#e9edef]">
        <div className="mb-8 flex items-center gap-3">
          <div className="w-12 h-12 bg-[#00a884] rounded-xl flex items-center justify-center transform rotate-3">
            <MessageSquare size={28} className="text-white -rotate-3" fill="currentColor" />
          </div>
          <h1 className="text-4xl font-bold tracking-wide text-white">Xync</h1>
        </div>
        
        <div className="bg-[#202c33] p-8 rounded-2xl w-full max-w-md shadow-2xl border border-[#222d34]">
          <h2 className="text-xl font-medium mb-6 text-center">
            {authMode === 'signin' ? 'Sign in to Xync Web' : 'Create an account'}
          </h2>

          <form onSubmit={authMode === 'signin' ? handleSignIn : handleSignUp} className="space-y-4">
            {authMode === 'signup' && (
              <>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter Name"
                  className="w-full bg-[#2a3942] text-[#d1d7db] rounded-lg px-4 py-3 focus:outline-none focus:ring-1 focus:ring-[#00a884] placeholder:text-[#8696a0]"
                  required
                />
                <input
                  type="url"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  placeholder="Photo URL (Optional)"
                  className="w-full bg-[#2a3942] text-[#d1d7db] rounded-lg px-4 py-3 focus:outline-none focus:ring-1 focus:ring-[#00a884] placeholder:text-[#8696a0]"
                />
              </>
            )}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter Email"
              className="w-full bg-[#2a3942] text-[#d1d7db] rounded-lg px-4 py-3 focus:outline-none focus:ring-1 focus:ring-[#00a884] placeholder:text-[#8696a0]"
              required
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter Password"
              className="w-full bg-[#2a3942] text-[#d1d7db] rounded-lg px-4 py-3 focus:outline-none focus:ring-1 focus:ring-[#00a884] placeholder:text-[#8696a0]"
              required
            />
            
            {authError && <p className="text-[#f15c6d] text-sm">{authError}</p>}
            
            <button
              type="submit"
              disabled={isAuthenticating}
              className="w-full bg-[#00a884] hover:bg-[#029072] text-[#111b21] font-medium py-3 rounded-lg transition-colors flex justify-center items-center gap-2"
            >
              {isAuthenticating ? <Loader2 className="animate-spin" size={20} /> : (authMode === 'signin' ? 'Sign In' : 'Sign Up')}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-[#2a3942]" />
            <span className="text-xs uppercase text-[#8696a0]">or</span>
            <div className="h-px flex-1 bg-[#2a3942]" />
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isAuthenticating}
            className="w-full bg-white hover:bg-[#f1f5f9] disabled:opacity-70 disabled:hover:bg-white text-[#111b21] font-medium py-3 rounded-lg transition-colors flex justify-center items-center gap-3"
          >
            {isAuthenticating ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <span className="h-5 w-5 rounded-full bg-[#4285f4] text-white text-sm font-bold flex items-center justify-center">G</span>
            )}
            Continue with Google
          </button>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setAuthMode(authMode === 'signin' ? 'signup' : 'signin');
                setAuthError('');
              }}
              className="text-[#00a884] hover:underline text-sm"
            >
              {authMode === 'signin' ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Xync Web Interface (WhatsApp Web Clone)
  return (
    <div className="h-screen w-full bg-[#111b21] flex font-sans text-[#e9edef] overflow-hidden">
      
      {/* --- Left Sidebar --- */}
      <aside className={`w-full md:w-[30%] md:min-w-[350px] md:max-w-[450px] border-r border-[#222d34] bg-[#111b21] flex flex-col transition-transform ${activeFriend ? 'hidden md:flex' : 'flex'}`}>
        
        {/* Sidebar Header */}
        <header className="h-[60px] bg-[#202c33] px-4 flex items-center justify-between flex-shrink-0">
          <img 
            src={currentUser.img_link || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.id}`} 
            alt="Profile" 
            className="w-10 h-10 rounded-full object-cover cursor-pointer"
            onClick={() => setShowSettings(true)}
          />
          <div className="flex items-center gap-4 text-[#aebac1]">
            <button onClick={() => setShowSettings(true)} className="hover:text-[#d1d7db] transition-colors"><Settings size={20} /></button>
            <button onClick={handleSignOut} className="hover:text-[#d1d7db] transition-colors" title="Sign Out"><LogIn size={20} className="transform rotate-180" /></button>
          </div>
        </header>

        {/* Search Bar */}
        <div className="p-2 bg-[#111b21] border-b border-[#222d34]">
          <form onSubmit={handleSearchFriend} className="relative flex items-center bg-[#202c33] rounded-lg px-3 py-1.5">
            <button type="submit" disabled={isSearching} className="text-[#aebac1] mr-3">
              {isSearching ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
            </button>
            <input
              type="text"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              placeholder="Search ID to start new chat"
              className="w-full bg-transparent text-sm text-[#d1d7db] focus:outline-none placeholder:text-[#8696a0]"
            />
          </form>
          {searchError && <p className="text-[#f15c6d] text-xs mt-2 px-2">{searchError}</p>}
        </div>

        {/* Chat List (Currently active friend or contacts) */}
        <div className="flex-1 overflow-y-auto bg-[#111b21]">
          {activeFriend && !contactsList.find(c => c.id === activeFriend.id) && (
            <div 
              key={activeFriend.id}
              onClick={() => setActiveFriend(activeFriend)}
              className="flex items-center px-3 py-3 hover:bg-[#202c33] cursor-pointer transition-colors bg-[#2a3942]"
            >
              <img 
                src={activeFriend.img_link || `https://api.dicebear.com/7.x/avataaars/svg?seed=${activeFriend.id}`} 
                alt="Friend" 
                className="w-12 h-12 rounded-full object-cover mr-3"
              />
              <div className="flex-1 border-b border-[#222d34] pb-3">
                <div className="flex justify-between items-center mb-1">
                  <h3 className="text-[17px] text-[#e9edef]">{activeFriend.username}</h3>
                </div>
                <p className="text-sm text-[#8696a0] truncate">{activeFriend.about || 'Hey there! I am using Xync.'}</p>
              </div>
            </div>
          )}
          {contactsList.length > 0 ? (
            contactsList.map(contact => (
              <div 
                key={contact.id}
                onClick={() => setActiveFriend(contact)}
                className={`flex items-center px-3 py-3 hover:bg-[#202c33] cursor-pointer transition-colors ${activeFriend?.id === contact.id ? 'bg-[#2a3942]' : ''}`}
              >
                <img 
                  src={contact.img_link || `https://api.dicebear.com/7.x/avataaars/svg?seed=${contact.id}`} 
                  alt="Friend" 
                  className="w-12 h-12 rounded-full object-cover mr-3"
                />
                <div className="flex-1 border-b border-[#222d34] pb-3">
                  <div className="flex justify-between items-center mb-1">
                    <h3 className="text-[17px] text-[#e9edef]">{contact.username}</h3>
                  </div>
                  <p className="text-sm text-[#8696a0] truncate">{contact.about || 'Hey there! I am using Xync.'}</p>
                </div>
              </div>
            ))
          ) : !activeFriend ? (
            <div className="h-full flex flex-col items-center justify-center text-[#8696a0] px-6 text-center">
              <p className="text-sm">Search for a user ID above to start a conversation.</p>
            </div>
          ) : null}
        </div>
      </aside>

      {/* --- Right Chat Area --- */}
      <main 
        className={`flex-1 flex flex-col bg-[#0b141a] relative ${!activeFriend ? 'hidden md:flex' : 'flex'}`}
        onClick={() => setShowChatMenu(false)}
      >
        {activeFriend ? (
          <>
            {/* Chat Header */}
            <header className="h-[60px] bg-[#202c33] px-4 flex items-center justify-between flex-shrink-0 z-10 cursor-pointer" onClick={() => setShowContactInfo(true)}>
              <div className="flex items-center gap-3">
                <button className="md:hidden text-[#aebac1] mr-1" onClick={(e) => { e.stopPropagation(); setActiveFriend(null); setShowContactInfo(false); }}>
                  <ArrowLeft size={24} />
                </button>
                <img 
                  src={activeFriend.img_link || `https://api.dicebear.com/7.x/avataaars/svg?seed=${activeFriend.id}`} 
                  alt="Friend" 
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div>
                  <h2 className="text-[16px] text-[#e9edef]">{activeFriend.username}</h2>
                  <p className="text-[13px] text-[#8696a0]">click here for contact info</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-[#aebac1] relative">
                <Search size={20} className="hover:text-[#d1d7db]" onClick={(e) => e.stopPropagation()} />
                <MoreVertical 
                  size={20} 
                  className="hover:text-[#d1d7db]" 
                  onClick={(e) => { e.stopPropagation(); setShowChatMenu(!showChatMenu); }} 
                />
                {showChatMenu && (
                  <div 
                    className="absolute top-10 right-0 bg-[#233138] rounded-lg shadow-lg py-2 w-40 z-50"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button 
                      onClick={clearChat}
                      className="w-full text-left px-4 py-2 text-[#d1d7db] hover:bg-[#182229] transition-colors"
                    >
                      Clear chat
                    </button>
                  </div>
                )}
              </div>
            </header>

            {/* Chat Background & Messages */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-2 relative" style={{ backgroundImage: 'url("https://static.whatsapp.net/rsrc.php/v3/yl/r/gi_DckOUM5a.png")', backgroundSize: 'contain', backgroundRepeat: 'repeat', opacity: 0.9 }}>
              {messages.length === 0 ? (
                <div className="flex justify-center mt-10">
                  <div className="bg-[#182229] text-[#8696a0] text-xs px-4 py-2 rounded-lg shadow-sm">
                    Messages are end-to-end encrypted. No one outside of this chat, not even Xync, can read or listen to them.
                  </div>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.senderId === currentUser.id;
                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group items-center gap-2`}>
                      {isMe && (
                        <button 
                          onClick={() => deleteMessage(msg.id)}
                          className="opacity-0 group-hover:opacity-100 text-[#8696a0] hover:text-[#f15c6d] transition-opacity p-1"
                          title="Delete message"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                      <div className={`relative max-w-[85%] md:max-w-[65%] px-3 py-1.5 text-[14.5px] shadow-sm ${isMe ? 'bg-[#005c4b] text-[#e9edef] rounded-lg rounded-tr-none' : 'bg-[#202c33] text-[#e9edef] rounded-lg rounded-tl-none'}`}>
                        <span className="break-words">{msg.text}</span>
                        <span className="text-[11px] text-[#ffffff99] float-right mt-2 ml-3">
                          {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString('en-US', { timeZone: 'Asia/Colombo', hour: '2-digit', minute: '2-digit', hour12: true }) : '...'}
                        </span>
                      </div>
                      {!isMe && (
                        <button 
                          onClick={() => deleteMessage(msg.id)}
                          className="opacity-0 group-hover:opacity-100 text-[#8696a0] hover:text-[#f15c6d] transition-opacity p-1"
                          title="Delete message"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <footer className="bg-[#202c33] px-4 py-3 flex items-center gap-3 flex-shrink-0 relative">
              {showEmojiPicker && (
                <div className="absolute bottom-16 left-4 z-50">
                  <EmojiPicker 
                    theme={Theme.DARK}
                    onEmojiClick={(emoji) => {
                      setNewMessage(prev => prev + emoji.emoji);
                      setShowEmojiPicker(false);
                    }}
                  />
                </div>
              )}
              <div className="flex items-center gap-3 text-[#aebac1]">
                <Smile 
                  size={24} 
                  className={`cursor-pointer hover:text-[#d1d7db] ${showEmojiPicker ? 'text-[#00a884]' : ''}`} 
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                />
                <Paperclip size={24} className="cursor-pointer hover:text-[#d1d7db]" />
              </div>
              <form onSubmit={sendMessage} className="flex-1 flex items-center">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message"
                  className="w-full bg-[#2a3942] text-[#d1d7db] rounded-lg px-4 py-2.5 focus:outline-none text-[15px]"
                />
              </form>
              <div className="text-[#aebac1]">
                {newMessage.trim() ? (
                  <button onClick={sendMessage} className="hover:text-[#d1d7db]"><Send size={24} /></button>
                ) : (
                  <Mic size={24} className="cursor-pointer hover:text-[#d1d7db]" />
                )}
              </div>
            </footer>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-[#8696a0] border-b-[6px] border-[#00a884]">
            <div className="w-80 h-80 bg-contain bg-no-repeat bg-center opacity-50 mb-8" style={{ backgroundImage: 'url("https://static.whatsapp.net/rsrc.php/v3/yO/r/FsWUqRoOsPu.png")' }}></div>
            <h1 className="text-3xl font-light text-[#e9edef] mb-4">Xync Web</h1>
            <p className="text-sm text-center max-w-md leading-relaxed">Send and receive messages without keeping your phone online.<br/>Use Xync on up to 4 linked devices and 1 phone at the same time.</p>
          </div>
        )}
      </main>

      {/* --- Contact Info Sidebar --- */}
      {showContactInfo && activeFriend && (
        <aside className="w-full md:w-[30%] md:min-w-[350px] md:max-w-[400px] border-l border-[#222d34] bg-[#111b21] flex flex-col animate-in slide-in-from-right duration-300 absolute md:relative z-20 h-full right-0">
          <header className="h-[60px] bg-[#202c33] flex items-center px-6 gap-6 flex-shrink-0">
            <button onClick={() => setShowContactInfo(false)} className="text-[#aebac1] hover:text-[#d1d7db] transition-colors"><X size={24} /></button>
            <h2 className="text-[16px] text-[#e9edef]">Contact info</h2>
          </header>
          
          <div className="flex-1 overflow-y-auto bg-[#111b21]">
            <div className="bg-[#111b21] py-8 flex flex-col items-center justify-center border-b border-[#222d34]">
              <img 
                src={activeFriend.img_link || `https://api.dicebear.com/7.x/avataaars/svg?seed=${activeFriend.id}`} 
                alt="Profile" 
                className="w-48 h-48 rounded-full object-cover mb-4 cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => setSelectedImage(activeFriend.img_link || `https://api.dicebear.com/7.x/avataaars/svg?seed=${activeFriend.id}`)}
              />
              <h2 className="text-2xl text-[#e9edef]">{activeFriend.username}</h2>
              <p className="text-[#8696a0] text-[15px] mt-1">{activeFriend.email}</p>
            </div>

            <div className="bg-[#111b21] mt-2 border-b border-[#222d34] p-5">
              <h3 className="text-[#8696a0] text-sm mb-2">About</h3>
              <p className="text-[#e9edef] text-[16px]">
                {activeFriend.privacy?.about !== false ? (activeFriend.about || 'Hey there! I am using Xync.') : <span className="italic text-[#8696a0]">This info is private</span>}
              </p>
            </div>

            <div className="bg-[#111b21] mt-2 border-b border-[#222d34] p-5">
              <h3 className="text-[#8696a0] text-sm mb-2">Email</h3>
              <p className="text-[#e9edef] text-[16px]">
                {activeFriend.privacy?.email !== false ? activeFriend.email : <span className="italic text-[#8696a0]">This info is private</span>}
              </p>
            </div>

            <div className="bg-[#111b21] mt-2 border-b border-[#222d34] p-5">
              <h3 className="text-[#8696a0] text-sm mb-2">GitHub</h3>
              <p className="text-[#e9edef] text-[16px]">
                {activeFriend.privacy?.github !== false ? (
                  activeFriend.github_username ? (
                    <a href={`https://github.com/${activeFriend.github_username}`} target="_blank" rel="noreferrer" className="text-[#53bdeb] hover:underline flex items-center gap-2">
                      <Github size={18} /> {activeFriend.github_username}
                    </a>
                  ) : <span className="text-[#8696a0]">Not provided</span>
                ) : <span className="italic text-[#8696a0]">This info is private</span>}
              </p>
            </div>
          </div>
        </aside>
      )}

      {/* --- Settings / Profile Modal --- */}
      {showSettings && (
        <div className="absolute inset-0 z-50 flex">
          {/* Left Panel (Settings) */}
          <div className="w-full md:w-[30%] md:min-w-[350px] md:max-w-[450px] bg-[#111b21] flex flex-col h-full border-r border-[#222d34] animate-in slide-in-from-left-full duration-300">
            <header className="h-[108px] bg-[#202c33] flex items-end px-6 pb-4 gap-6">
              <button onClick={() => setShowSettings(false)} className="text-[#d1d7db]"><ArrowLeft size={24} /></button>
              <h1 className="text-xl font-medium text-[#e9edef]">Profile</h1>
            </header>
            
            <div className="flex-1 overflow-y-auto bg-[#111b21]">
              <div className="flex justify-center py-8 flex-col items-center">
                <div className="relative group cursor-pointer mb-4" onClick={() => setSelectedImage(currentUser.img_link || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.id}`)}>
                  <img src={currentUser.img_link || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.id}`} alt="Profile" className="w-48 h-48 rounded-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Edit2 size={24} className="text-white mb-2" />
                    <span className="text-white text-xs text-center uppercase">View<br/>Profile Photo</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-center gap-2 text-[#8696a0] bg-[#202c33] px-4 py-2 rounded-full shadow-sm">
                  <span className="text-sm font-mono">ID: {currentUser.xyncId}</span>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(currentUser.xyncId);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="hover:text-[#00a884] transition-colors p-1"
                    title="Copy ID"
                  >
                    {copied ? <Check size={16} className="text-[#00a884]" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>

              <form onSubmit={handleUpdateProfile} className="px-6 space-y-6">
                <div className="bg-[#111b21]">
                  <label className="text-[#008069] text-sm mb-2 block">Your name</label>
                  <div className="flex items-center border-b border-[#00a884] py-2">
                    <input type="text" value={updateData.username || ''} onChange={(e) => setUpdateData({...updateData, username: e.target.value})} className="bg-transparent text-[#e9edef] w-full focus:outline-none text-[17px]" />
                    <Edit2 size={18} className="text-[#8696a0]" />
                  </div>
                  <p className="text-[#8696a0] text-xs mt-3">This is not your username or pin. This name will be visible to your Xync contacts.</p>
                </div>

                <div className="bg-[#111b21]">
                  <label className="text-[#008069] text-sm mb-2 block">About</label>
                  <div className="flex items-center border-b border-[#222d34] py-2 focus-within:border-[#00a884] transition-colors">
                    <input type="text" value={updateData.about || ''} onChange={(e) => setUpdateData({...updateData, about: e.target.value})} className="bg-transparent text-[#e9edef] w-full focus:outline-none text-[17px]" />
                    <Edit2 size={18} className="text-[#8696a0]" />
                  </div>
                </div>

                <div className="bg-[#111b21]">
                  <label className="text-[#008069] text-sm mb-2 block">Email</label>
                  <div className="flex items-center border-b border-[#222d34] py-2 focus-within:border-[#00a884] transition-colors">
                    <input type="email" value={updateData.email || ''} onChange={(e) => setUpdateData({...updateData, email: e.target.value})} className="bg-transparent text-[#e9edef] w-full focus:outline-none text-[17px]" />
                    <Edit2 size={18} className="text-[#8696a0]" />
                  </div>
                </div>

                <div className="bg-[#111b21]">
                  <label className="text-[#008069] text-sm mb-2 block">Photo URL</label>
                  <div className="flex items-center border-b border-[#222d34] py-2 focus-within:border-[#00a884] transition-colors">
                    <input type="url" value={updateData.img_link || ''} onChange={(e) => setUpdateData({...updateData, img_link: e.target.value})} placeholder="Paste image link here" className="bg-transparent text-[#e9edef] w-full focus:outline-none text-[17px] placeholder:text-[#8696a0]" />
                    <Edit2 size={18} className="text-[#8696a0]" />
                  </div>
                </div>

                <div className="bg-[#111b21]">
                  <label className="text-[#008069] text-sm mb-2 block">GitHub</label>
                  <div className="flex items-center border-b border-[#222d34] py-2 focus-within:border-[#00a884] transition-colors">
                    <input type="text" value={updateData.github_username || ''} onChange={(e) => setUpdateData({...updateData, github_username: e.target.value})} className="bg-transparent text-[#e9edef] w-full focus:outline-none text-[17px]" />
                    <Edit2 size={18} className="text-[#8696a0]" />
                  </div>
                </div>

                <div className="pt-4 border-t border-[#222d34]">
                  <h3 className="text-[#008069] text-sm mb-4 font-medium">Privacy Settings</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[#e9edef] text-[15px]">Show About</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={updateData.privacy?.about ?? true} onChange={(e) => setUpdateData({...updateData, privacy: {...(updateData.privacy || {about:true, email:true, github:true}), about: e.target.checked}})} />
                        <div className="w-11 h-6 bg-[#2a3942] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00a884]"></div>
                      </label>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#e9edef] text-[15px]">Show Email</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={updateData.privacy?.email ?? true} onChange={(e) => setUpdateData({...updateData, privacy: {...(updateData.privacy || {about:true, email:true, github:true}), email: e.target.checked}})} />
                        <div className="w-11 h-6 bg-[#2a3942] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00a884]"></div>
                      </label>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#e9edef] text-[15px]">Show GitHub</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={updateData.privacy?.github ?? true} onChange={(e) => setUpdateData({...updateData, privacy: {...(updateData.privacy || {about:true, email:true, github:true}), github: e.target.checked}})} />
                        <div className="w-11 h-6 bg-[#2a3942] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00a884]"></div>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="pt-6">
                  <button type="submit" disabled={isUpdating} className="w-full bg-[#00a884] hover:bg-[#029072] text-[#111b21] font-medium py-3 rounded-lg transition-colors flex justify-center items-center gap-2 shadow-md">
                    {isUpdating ? <Loader2 className="animate-spin" size={20} /> : 'Save Profile'}
                  </button>
                </div>
              </form>

              <div className="px-6 py-8 border-t border-[#222d34] mt-8">
                <h3 className="text-[#008069] text-sm mb-4 font-medium flex items-center gap-2">
                  <Key size={16} /> Change Password
                </h3>
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div className="bg-[#111b21]">
                    <div className="flex items-center border-b border-[#222d34] py-2 focus-within:border-[#00a884] transition-colors">
                      <input 
                        type="password" 
                        placeholder="Current Password"
                        value={currentPassword} 
                        onChange={(e) => setCurrentPassword(e.target.value)} 
                        className="bg-transparent text-[#e9edef] w-full focus:outline-none text-[15px] placeholder:text-[#8696a0]" 
                        required
                      />
                    </div>
                  </div>
                  <div className="bg-[#111b21]">
                    <div className="flex items-center border-b border-[#222d34] py-2 focus-within:border-[#00a884] transition-colors">
                      <input 
                        type="password" 
                        placeholder="New Password"
                        value={newPassword} 
                        onChange={(e) => setNewPassword(e.target.value)} 
                        className="bg-transparent text-[#e9edef] w-full focus:outline-none text-[15px] placeholder:text-[#8696a0]" 
                        required
                      />
                    </div>
                  </div>
                  {passwordMessage && (
                    <p className={`text-sm ${passwordMessage.includes('success') ? 'text-[#00a884]' : 'text-[#f15c6d]'}`}>
                      {passwordMessage}
                    </p>
                  )}
                  <button type="submit" className="w-full bg-[#202c33] hover:bg-[#2a3942] text-[#d1d7db] font-medium py-2.5 rounded-lg transition-colors border border-[#222d34]">
                    Update Password
                  </button>
                </form>
              </div>
            </div>
          </div>
          {/* Right overlay (click to close) */}
          <div className="hidden md:block flex-1 bg-black/50" onClick={() => setShowSettings(false)}></div>
        </div>
      )}
      {/* --- Image Modal --- */}
      {selectedImage && (
        <div 
          className="absolute inset-0 z-[60] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button 
            className="absolute top-6 right-6 text-white hover:text-gray-300 transition-colors"
            onClick={(e) => { e.stopPropagation(); setSelectedImage(null); }}
          >
            <X size={32} />
          </button>
          <img 
            src={selectedImage} 
            alt="Full size profile" 
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
