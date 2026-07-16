import '@/styles.css';
import '@/groupOrder.css';
import '@/virtualLists.css';
import '@/socialNotifications.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from '@/App';
import { AppProvider } from '@/modules/session';
import { BrowserRouter } from '@/packages/router';
import { initializePlatform } from '@/platform/device';

void initializePlatform();
const container = document.getElementById('root');
if (!container) throw new Error('Root element was not found.');
createRoot(container).render(
  <StrictMode>
    <BrowserRouter>
      <AppProvider>
        <App />
      </AppProvider>
    </BrowserRouter>
  </StrictMode>,
);
