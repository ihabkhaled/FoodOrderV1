import { Capacitor } from '@/packages/capacitor-core';

export const isNativeApplication = (): boolean => Capacitor.isNativePlatform();

/** Coarse runtime family for diagnostics context; never a device fingerprint. */
export const runtimePlatformName = (): 'web' | 'android' | 'ios' => {
  const platform = Capacitor.getPlatform();
  if (platform === 'android' || platform === 'ios') return platform;
  return 'web';
};
