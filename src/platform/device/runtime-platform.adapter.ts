import { Capacitor } from '@/packages/capacitor-core';

export const isNativeApplication = (): boolean => Capacitor.isNativePlatform();
