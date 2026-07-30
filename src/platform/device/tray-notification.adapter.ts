import { LocalNotifications } from '@/packages/capacitor-local-notifications';

import { showWebNotification } from '../browser/web-notification.adapter';
import { isNativeApplication } from './runtime-platform.adapter';

export interface TrayNotificationRequest {
  /** Stable identity so the same in-app notification never doubles up. */
  readonly id: string;
  readonly title: string;
  readonly body: string;
  /** In-app route the tap should open. */
  readonly route: string;
}

const INT32_LIMIT = 2_147_483_647;

/** Native local notifications need a 32-bit integer id, not our string ids. */
const numericId = (id: string): number => {
  let hash = 0;
  for (const character of id) {
    const code = character.codePointAt(0) ?? 0;
    hash = Math.trunc((hash * 31 + code) % INT32_LIMIT);
  }
  return Math.abs(hash);
};

const routeListeners = new Set<(route: string) => void>();

const emitRoute = (route: string): void => {
  for (const listener of routeListeners) listener(route);
};

let nativeListenerAttached = false;

const attachNativeTapListener = (): void => {
  if (nativeListenerAttached) return;
  nativeListenerAttached = true;
  void LocalNotifications.addListener(
    'localNotificationActionPerformed',
    (action) => {
      const route = (action.notification.extra as { route?: unknown } | null)
        ?.route;
      if (typeof route === 'string' && route.startsWith('/')) emitRoute(route);
    },
  ).catch(() => {
    // A missing plugin listener simply means no tap routing on this platform.
  });
};

/**
 * Raises one OS-tray notification. Resolves to whether it was shown, which is
 * false whenever permission is missing or the platform has no support.
 */
export const showTrayNotification = async (
  request: TrayNotificationRequest,
): Promise<boolean> => {
  if (!isNativeApplication()) {
    return showWebNotification(
      request.title,
      request.body,
      request.id,
      () => {
        emitRoute(request.route);
      },
    );
  }
  try {
    attachNativeTapListener();
    await LocalNotifications.schedule({
      notifications: [
        {
          id: numericId(request.id),
          title: request.title,
          body: request.body,
          extra: { route: request.route },
        },
      ],
    });
    return true;
  } catch {
    return false;
  }
};

/** Subscribes to taps on notifications this app raised. */
export const subscribeToTrayNotificationTaps = (
  listener: (route: string) => void,
): (() => void) => {
  routeListeners.add(listener);
  if (isNativeApplication()) attachNativeTapListener();
  return () => {
    routeListeners.delete(listener);
  };
};
