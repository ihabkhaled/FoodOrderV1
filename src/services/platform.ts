import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Network } from '@capacitor/network';
import { Preferences } from '@capacitor/preferences';
import { StatusBar, Style } from '@capacitor/status-bar';

export const initializePlatform = async (): Promise<void> => {
  if (Capacitor.isNativePlatform()) {
    await StatusBar.setStyle({ style: Style.Dark }).catch(() => undefined);
  }
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    await navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  }
};

export const impact = async (): Promise<void> => {
  if (Capacitor.isNativePlatform()) await Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined);
};

export const getNetworkStatus = async (): Promise<boolean> => (await Network.getStatus()).connected;

export const setPreference = async (key: string, value: string): Promise<void> => {
  await Preferences.set({ key, value });
};

export const getPreference = async (key: string): Promise<string | null> =>
  (await Preferences.get({ key })).value;
