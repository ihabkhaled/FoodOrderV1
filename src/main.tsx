import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import {
  buildPublicContentPath,
  buildPublicSystemPath,
  getPublicContentCatalog,
  inferPublicLocale,
  matchPublicContentPath,
  PublicContentRoutes,
} from '@/modules/public-content';
import { BrowserRouter } from '@/packages/router';
import {
  buildBrowserLocalePath,
  getBrowserBootstrapContext,
  hasBrowserLocalePrefix,
  replaceBrowserPath,
} from '@/platform/browser';
import {
  initializePlatform,
  isNativeApplication,
  saveDeviceConfig,
} from '@/platform/device';
import { matchSupportedLocale } from '@/shared/i18n';

const bootstrap = async (): Promise<void> => {
  const context = getBrowserBootstrapContext();
  if (!context.root) throw new Error('Root element was not found.');
  if (context.prerenderedPublicContent) return;

  const applicationPath = getPublicContentCatalog().site.applicationPath;
  const nativeApplication = isNativeApplication();
  let pathname = context.pathname;
  const publicMatch = matchPublicContentPath(pathname);
  if (nativeApplication && publicMatch) {
    replaceBrowserPath(applicationPath);
    pathname = applicationPath;
  }

  if (!nativeApplication && publicMatch) {
    const localizedPath =
      publicMatch.kind === 'page'
        ? buildPublicContentPath(publicMatch.routeId, publicMatch.locale)
        : buildPublicSystemPath(publicMatch.routeId, publicMatch.locale);
    if (localizedPath !== pathname) replaceBrowserPath(localizedPath);
    createRoot(context.root).render(
      <StrictMode>
        <BrowserRouter>
          <PublicContentRoutes applicationPath={applicationPath} />
        </BrowserRouter>
      </StrictMode>,
    );
    return;
  }

  await initializePlatform();
  const { AppBootstrap } = await import('@/app');
  if (nativeApplication) {
    createRoot(context.root).render(
      <StrictMode>
        <AppBootstrap />
      </StrictMode>,
    );
    return;
  }
  const pathLocale = inferPublicLocale(pathname);
  const locale = hasBrowserLocalePrefix(pathname)
    ? pathLocale
    : (matchSupportedLocale([context.requestedLocale ?? '']) ?? pathLocale);
  const localizedPath = buildBrowserLocalePath(pathname, locale);
  if (localizedPath !== pathname) replaceBrowserPath(localizedPath);
  await saveDeviceConfig({ locale });
  createRoot(context.root).render(
    <StrictMode>
      <AppBootstrap basename={`/${locale.toLowerCase()}`} initialLocale={locale} />
    </StrictMode>,
  );
};

void bootstrap();
