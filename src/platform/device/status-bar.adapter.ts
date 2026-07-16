import { Capacitor } from '@/packages/capacitor-core';
import { StatusBar, Style } from '@/packages/capacitor-status-bar';

/** Native status-bar styling applied during platform initialization. */
export const styleNativeStatusBar = async (): Promise<void> => {
  if (Capacitor.isNativePlatform()) {
    await StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
  }
};
