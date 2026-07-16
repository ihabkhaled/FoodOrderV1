export { dispatchAppEvent, subscribeToAppEvent } from './app-events.adapter';
export { copyToClipboard } from './clipboard.adapter';
export { subscribeToPointerDown } from './document-events.adapter';
export {
  applyDocumentLocale,
  applyDocumentTheme,
  getDocumentLanguage,
} from './document-settings.adapter';
export type { ThemePreference } from './document-settings.types';
export { downloadTextFile } from './file-download.adapter';
export { registerServiceWorker } from './service-worker.adapter';
export { shareText } from './share.adapter';
export { getViewportScrollTop } from './viewport-scroll.adapter';
