import { isProdBuild } from '../environment';

export const registerServiceWorker = async (): Promise<void> => {
  if ('serviceWorker' in navigator && isProdBuild) {
    await navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
};
