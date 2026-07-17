import { Network } from '@/packages/capacitor-network';

export const getNetworkStatus = async (): Promise<boolean> => {
  const status = await Network.getStatus();
  return status.connected;
};

/** Synchronous browser connectivity fallback. */
export const isNavigatorOnline = (): boolean => navigator.onLine;

/** Notifies the listener whenever browser connectivity flips; returns cleanup. */
export const subscribeToOnlineChange = (listener: () => void): (() => void) => {
  window.addEventListener('online', listener);
  window.addEventListener('offline', listener);
  return () => {
    window.removeEventListener('online', listener);
    window.removeEventListener('offline', listener);
  };
};
