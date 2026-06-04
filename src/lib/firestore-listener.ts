import type { FirestoreError } from 'firebase/firestore';

export function onSnapshotError(label: string) {
  return (err: FirestoreError) => {
    if (err.code === 'permission-denied') {
      console.warn(
        `[Niyey Knea] Firestore permission denied (${label}). Deploy rules: firebase deploy --only firestore:rules`
      );
      return;
    }
    console.error(`[Niyey Knea] ${label}:`, err);
  };
}
