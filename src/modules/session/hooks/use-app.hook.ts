import { useContext } from 'react';

import { AppContext } from '../store/session-context.store';
import type { AppContextValue } from '../types/session.types';

export const useApp = (): AppContextValue => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used inside AppProvider.');
  return context;
};
