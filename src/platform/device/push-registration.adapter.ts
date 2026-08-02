import { PushNotifications } from '@/packages/capacitor-push-notifications';

import { isNativeApplication } from './runtime-platform.adapter';

/**
 * Registers this device with the OS push service and resolves its delivery
 * token, or null when push is unavailable.
 *
 * Web is deliberately excluded: browser push needs an FCM service worker and a
 * VAPID key exchange, which is a separate integration. Native registration only
 * succeeds once `google-services.json` (Android) or the APNs entitlement (iOS)
 * is in place, so a missing configuration resolves to null rather than throwing.
 */
export const registerForPushNotifications = async (): Promise<string | null> => {
  if (!isNativeApplication()) return null;

  try {
    const permission = await PushNotifications.requestPermissions();
    if (permission.receive !== 'granted') return null;

    return await new Promise<string | null>((resolve) => {
      // Whichever listener fires first decides the outcome; the OS emits
      // exactly one of the two per `register()` call.
      let settled = false;
      const settle = (token: string | null): void => {
        if (settled) return;
        settled = true;
        resolve(token);
      };

      void PushNotifications.addListener('registration', (item) => {
        settle(item.value);
      });
      void PushNotifications.addListener('registrationError', () => {
        settle(null);
      });
      void PushNotifications.register().catch(() => {
        settle(null);
      });
    });
  } catch {
    return null;
  }
};

/** Stops delivery to this device, used when signing out. */
export const unregisterFromPushNotifications = async (): Promise<void> => {
  if (!isNativeApplication()) return;
  try {
    await PushNotifications.unregister();
  } catch {
    // A device that was never registered needs no cleanup.
  }
};

/** Routes a tapped push notification into the app. */
export const subscribeToPushNotificationTaps = (
  listener: (route: string) => void,
): (() => void) => {
  if (!isNativeApplication()) return () => {};

  const handle = PushNotifications.addListener(
    'pushNotificationActionPerformed',
    (action) => {
      const data = action.notification.data as Record<string, unknown> | undefined;
      const route = data?.['route'];
      if (typeof route === 'string' && route.startsWith('/')) listener(route);
    },
  );

  return () => {
    void handle.then((subscription) => subscription.remove()).catch(() => {});
  };
};
