import { Capacitor } from '@/packages/capacitor-core';
import { Haptics, ImpactStyle } from '@/packages/capacitor-haptics';

export const impact = async (): Promise<void> => {
  if (Capacitor.isNativePlatform())
    await Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
};
