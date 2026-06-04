import type { FirestoreError } from 'firebase/firestore';

export function onSnapshotError(label: string) {
  return (err: FirestoreError) => {
    if (err.code === 'permission-denied') {
      console.warn(
        `[Xync] Firestore permission denied (${label}). Deploy rules: firebase deploy --only firestore:rules`
      );
      return;
    }
    console.error(`[Xync] ${label}:`, err);
  };
}
