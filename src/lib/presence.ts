import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '@/src/firebase';

export interface PresenceRecord {
  online: boolean;
  lastSeen: Date | null;
}

/** How long since last heartbeat before we treat user as offline (client-side). */
export const ONLINE_THRESHOLD_MS = 60_000;

/** Heartbeat interval while the app tab is active. */
export const PRESENCE_HEARTBEAT_MS = 25_000;

/** Re-check online/offline in the UI without waiting for Firestore. */
export const PRESENCE_UI_TICK_MS = 5_000;

export async function updateUserPresence(userId: string, online: boolean) {
  await setDoc(
    doc(db, 'presence', userId),
    { online, lastSeen: serverTimestamp() },
    { merge: true }
  );
}

export function isUserOnline(record: PresenceRecord | undefined): boolean {
  if (!record) return false;
  if (!record.online) return false;
  if (!record.lastSeen) return true;
  return Date.now() - record.lastSeen.getTime() < ONLINE_THRESHOLD_MS;
}

export function formatLastSeen(date: Date | null): string {
  if (!date) return 'Offline';
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'Last seen just now';
  if (diffMin < 60) return `Last seen ${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `Last seen ${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `Last seen ${diffDay}d ago`;
  return `Last seen ${date.toLocaleDateString()}`;
}
