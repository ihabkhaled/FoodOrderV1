import { createContext } from 'react';

import type { AppContextValue } from '../types/session.types';

export const AppContext = createContext<AppContextValue | null>(null);
