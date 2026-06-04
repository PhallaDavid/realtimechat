import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updatePassword,
  type User,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  collection,
} from 'firebase/firestore';
import { auth, db } from '@/src/firebase';
import { onSnapshotError } from '@/src/lib/firestore-listener';
import type { UserProfile } from '@/src/types';
import {
  clearStoredUserProfile,
  readStoredUserProfile,
  storeUserProfile,
} from '@/src/lib/user-storage';

interface AuthContextValue {
  currentUser: UserProfile | null;
  authReady: boolean;
  generatedId: string;
  setGeneratedId: (id: string) => void;
  signUp: (email: string, password: string, name: string, photoUrl: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<string | null>;
  signInWithGoogle: () => Promise<boolean>;
  signOutUser: () => Promise<void>;
  changePassword: (newPassword: string) => Promise<string>;
  updateProfile: (payload: Partial<UserProfile>) => Promise<string>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function generateUniqueXyncId(): Promise<string> {
  let xyncId = '';
  let isUnique = false;
  let attempts = 0;
  while (!isUnique && attempts < 10) {
      xyncId = String(Math.floor(100000000 + Math.random() * 900000000));
    const q = query(collection(db, 'users'), where('xyncId', '==', xyncId));
    const snap = await getDocs(q);
    if (snap.empty) isUnique = true;
    attempts++;
  }
  return xyncId;
}

async function createUserProfile(
  user: User,
  overrides: Partial<UserProfile> = {}
): Promise<UserProfile> {
  const xyncId = await generateUniqueXyncId();
  const userData: UserProfile = {
    id: user.uid,
    xyncId,
    username: overrides.username || user.displayName || 'Xync User',
    email: overrides.email || user.email || '',
    img_link:
      overrides.img_link ||
      user.photoURL ||
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
    about: 'Hey there! I am using Xync.',
    github_username: '',
    privacy: { about: true, email: true, github: true },
    contacts: [],
  };
  await setDoc(doc(db, 'users', user.uid), userData);
  return userData;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => readStoredUserProfile());
  const [authReady, setAuthReady] = useState(false);
  const [generatedId, setGeneratedId] = useState('');

  useEffect(() => {
    let userUnsubscribe: (() => void) | null = null;
    const authUnsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        userUnsubscribe = onSnapshot(
          doc(db, 'users', user.uid),
          async (docSnap) => {
            if (docSnap.exists()) {
              const raw = docSnap.data() as UserProfile;
              const userData: UserProfile = {
                ...raw,
                id: raw.id || docSnap.id,
                contacts: raw.contacts ?? [],
              };
              if (!userData.xyncId) {
                const newXyncId = await generateUniqueXyncId();
                await updateDoc(doc(db, 'users', user.uid), { xyncId: newXyncId });
                userData.xyncId = newXyncId;
              }
              storeUserProfile(userData);
              setCurrentUser(userData);
            }
            setAuthReady(true);
          },
          onSnapshotError('users profile')
        );
      } else {
        userUnsubscribe?.();
        userUnsubscribe = null;
        setCurrentUser(null);
        clearStoredUserProfile();
        setAuthReady(true);
      }
    });
    return () => {
      authUnsubscribe();
      userUnsubscribe?.();
    };
  }, []);

  const signUp = async (email: string, password: string, name: string, photoUrl: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const userData = await createUserProfile(cred.user, {
      username: name,
      email,
      img_link: photoUrl,
    });
    storeUserProfile(userData);
    setGeneratedId(userData.xyncId);
    setCurrentUser(userData);
  };

  const signIn = async (email: string, password: string): Promise<string | null> => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const userDoc = await getDoc(doc(db, 'users', cred.user.uid));
    if (!userDoc.exists()) return 'User profile not found.';
    const raw = userDoc.data() as UserProfile;
    const userData: UserProfile = { ...raw, id: raw.id || userDoc.id, contacts: raw.contacts ?? [] };
    storeUserProfile(userData);
    setCurrentUser(userData);
    return null;
  };

  const signInWithGoogle = async (): Promise<boolean> => {
    const cred = await signInWithPopup(auth, new GoogleAuthProvider());
    const userRef = doc(db, 'users', cred.user.uid);
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
      const raw = userDoc.data() as UserProfile;
      const userData: UserProfile = { ...raw, id: raw.id || cred.user.uid, contacts: raw.contacts ?? [] };
      storeUserProfile(userData);
      setCurrentUser(userData);
      return false;
    }
    const userData = await createUserProfile(cred.user);
    storeUserProfile(userData);
    setGeneratedId(userData.xyncId);
    setCurrentUser(userData);
    return true;
  };

  const signOutUser = async () => {
    await signOut(auth);
    clearStoredUserProfile();
    setCurrentUser(null);
  };

  const changePassword = async (newPassword: string) => {
    if (!auth.currentUser) return 'Not signed in.';
    try {
      await updatePassword(auth.currentUser, newPassword);
      return 'Password updated successfully!';
    } catch (err: unknown) {
      return err instanceof Error ? err.message : 'Error updating password.';
    }
  };

  const updateProfile = async (payload: Partial<UserProfile>) => {
    if (!currentUser) return 'Not signed in.';
    try {
      await updateDoc(doc(db, 'users', currentUser.id), payload);
      const updatedUser = { ...currentUser, ...payload };
      storeUserProfile(updatedUser);
      setCurrentUser(updatedUser);
      return 'Profile updated successfully.';
    } catch {
      return 'Profile update failed. Please try again.';
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        authReady,
        generatedId,
        setGeneratedId,
        signUp,
        signIn,
        signInWithGoogle,
        signOutUser,
        changePassword,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
