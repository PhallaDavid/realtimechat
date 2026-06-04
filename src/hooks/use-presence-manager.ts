import { useEffect } from 'react';
import { PRESENCE_HEARTBEAT_MS, updateUserPresence } from '@/src/lib/presence';

export function usePresenceManager(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return;

    let heartbeatId: number | undefined;

    const setOnline = () => updateUserPresence(userId, true).catch(console.error);
    const setOffline = () => updateUserPresence(userId, false).catch(console.error);

    const startHeartbeat = () => {
      setOnline();
      if (heartbeatId !== undefined) window.clearInterval(heartbeatId);
      heartbeatId = window.setInterval(setOnline, PRESENCE_HEARTBEAT_MS);
    };

    const stopHeartbeat = () => {
      if (heartbeatId !== undefined) {
        window.clearInterval(heartbeatId);
        heartbeatId = undefined;
      }
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') startHeartbeat();
      else {
        stopHeartbeat();
        setOffline();
      }
    };

    startHeartbeat();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pagehide', setOffline);
    window.addEventListener('beforeunload', setOffline);

    return () => {
      stopHeartbeat();
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pagehide', setOffline);
      window.removeEventListener('beforeunload', setOffline);
      setOffline();
    };
  }, [userId]);
}
