import { registerServiceWorker } from '../browser/service-worker.adapter';
import { styleNativeStatusBar } from './status-bar.adapter';

export const initializePlatform = async (): Promise<void> => {
  await styleNativeStatusBar();
  await registerServiceWorker();
};
