import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from '@/App';
import { initializePlatform } from '@/services/platform';
import { AppProvider } from '@/state/AppContext';
import '@/styles.css';

void initializePlatform();
const container = document.getElementById('root');
if (!container) throw new Error('Root element was not found.');
createRoot(container).render(<StrictMode><BrowserRouter><AppProvider><App /></AppProvider></BrowserRouter></StrictMode>);
