import '@/styles.css';
import '@/groupOrder.css';
import '@/virtualLists.css';
import '@/socialNotifications.css';
import '@/shared/ui/ux-polish.css';
import '@/shared/ui/shell-alignment.css';

import { AppProvider } from '@/modules/session';
import { BrowserRouter } from '@/packages/router';

import { AppRoutes } from './router/app.routes';

export function AppBootstrap() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppRoutes />
      </AppProvider>
    </BrowserRouter>
  );
}
