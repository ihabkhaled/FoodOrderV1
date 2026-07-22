import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import {
  getPublicContentCatalog,
  isPublicContentPath,
  PublicContentRoutes,
} from '@/modules/public-content';
import { BrowserRouter } from '@/packages/router';
import {
  getBrowserBootstrapContext,
  replaceBrowserPath,
} from '@/platform/browser';
import {
  initializePlatform,
  isNativeApplication,
} from '@/platform/device';

const bootstrap = async (): Promise<void> => {
  const context = getBrowserBootstrapContext();
  if (!context.root) throw new Error('Root element was not found.');
  if (context.prerenderedPublicContent) return;

  const applicationPath = getPublicContentCatalog().site.applicationPath;
  const nativeApplication = isNativeApplication();
  let pathname = context.pathname;
  if (nativeApplication && isPublicContentPath(pathname)) {
    replaceBrowserPath(applicationPath);
    pathname = applicationPath;
  }

  if (!nativeApplication && isPublicContentPath(pathname)) {
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
  createRoot(context.root).render(
    <StrictMode>
      <AppBootstrap />
    </StrictMode>,
  );
};

void bootstrap();
