import '@/styles.css';
import '@/groupOrder.css';
import '@/virtualLists.css';
import '@/socialNotifications.css';
import '@/shared/ui/ux-polish.css';
import '@/shared/ui/shell-alignment.css';

import { AppProvider } from '@/modules/session';
import { BrowserRouter } from '@/packages/router';

import type { AppBootstrapProps } from './app-bootstrap.interfaces';
import { AppRoutes } from './router/app.routes';

export function AppBootstrap({ basename, initialLocale }: AppBootstrapProps) {
  return (
    <BrowserRouter {...(basename ? { basename } : {})}>
      <AppProvider {...(initialLocale ? { initialLocale } : {})}>
        <AppRoutes />
      </AppProvider>
    </BrowserRouter>
  );
}
