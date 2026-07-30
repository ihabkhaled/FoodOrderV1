/**
 * The browser Notification API. Every entry point degrades to a no-op when the
 * API is missing (older browsers, insecure origins, some in-app webviews) so
 * callers never need to feature-detect.
 */
const notificationApi = (): typeof Notification | null =>
  'Notification' in window ? window.Notification : null;

export const queryWebNotificationPermission = ():
  | 'granted'
  | 'denied'
  | 'prompt'
  | 'unsupported' => {
  const api = notificationApi();
  if (!api) return 'unsupported';
  if (api.permission === 'granted') return 'granted';
  if (api.permission === 'denied') return 'denied';
  return 'prompt';
};

export const requestWebNotificationPermission = async (): Promise<boolean> => {
  const api = notificationApi();
  if (!api) return false;
  try {
    return (await api.requestPermission()) === 'granted';
  } catch {
    return false;
  }
};

/**
 * Shows one OS notification and resolves the tap into the supplied callback.
 * Returns whether the notification was actually raised.
 */
export const showWebNotification = (
  title: string,
  body: string,
  tag: string,
  onActivate: () => void,
): boolean => {
  const api = notificationApi();
  if (!api || api.permission !== 'granted') return false;
  try {
    const notification = new api(title, { body, tag });
    notification.addEventListener('click', () => {
      window.focus();
      notification.close();
      onActivate();
    });
    return true;
  } catch {
    return false;
  }
};
