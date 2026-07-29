export { dispatchAppEvent, subscribeToAppEvent } from './app-events.adapter';
export type { BrowserBootstrapContext } from './bootstrap-document.adapter';
export {
  getBrowserBootstrapContext,
  replaceBrowserPath,
} from './bootstrap-document.adapter';
export { getBrowserLanguages } from './browser-language.adapter';
export { navigateToBrowserLocale } from './browser-locale-navigation.adapter';
export {
  buildBrowserLocalePath,
  hasBrowserLocalePrefix,
} from './browser-locale-path.helper';
export { copyToClipboard } from './clipboard.adapter';
export { subscribeToPointerDown } from './document-events.adapter';
export {
  applyDocumentLocale,
  applyDocumentTheme,
  getDocumentLanguage,
  subscribeToColorSchemeChange,
} from './document-settings.adapter';
export type { ThemePreference } from './document-settings.types';
export { downloadTextFile } from './file-download.adapter';
export { registerServiceWorker } from './service-worker.adapter';
export { shareText } from './share.adapter';
export {
  getViewportScrollTop,
  scrollViewportToTop,
} from './viewport-scroll.adapter';
