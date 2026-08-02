import { LocalNotifications } from '@/packages/capacitor-local-notifications';

import {
  queryWebNotificationPermission,
  requestWebNotificationPermission,
} from '../browser/web-notification.adapter';
import { isNativeApplication } from './runtime-platform.adapter';

export type NotificationPermissionState =
  | 'granted'
  | 'denied'
  | 'prompt'
  | 'unsupported';

/**
 * Current OS notification permission. Never throws: an unavailable plugin or
 * API resolves to 'unsupported' so the caller can degrade quietly.
 */
export const queryNotificationPermission =
  async (): Promise<NotificationPermissionState> => {
    if (!isNativeApplication()) return queryWebNotificationPermission();
    try {
      const status = await LocalNotifications.checkPermissions();
      if (status.display === 'granted') return 'granted';
      if (status.display === 'denied') return 'denied';
      return 'prompt';
    } catch {
      return 'unsupported';
    }
  };

/** Requests permission and resolves whether it ended up granted. */
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!isNativeApplication()) return requestWebNotificationPermission();
  try {
    const status = await LocalNotifications.requestPermissions();
    return status.display === 'granted';
  } catch {
    return false;
  }
};
