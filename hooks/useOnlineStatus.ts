import { useState, useEffect } from 'react';

/**
 * A custom React hook that tracks the browser's online status.
 * It uses the 'online' and 'offline' window events to provide a reactive
 * boolean state indicating the current connectivity.
 * @returns `true` if the browser is online, `false` otherwise.
 */
export const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
};