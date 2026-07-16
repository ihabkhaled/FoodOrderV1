import { useContext, useEffect } from 'react';

import { RefreshContext } from './refresh-context.store';

/** Pages register their reload handler for the pull-to-refresh viewport. */
export const usePageRefresh = (handler: () => Promise<void>): void => {
  const register = useContext(RefreshContext)?.register;
  useEffect(() => {
    register?.(handler);
    return () => {
      register?.(null);
    };
  }, [handler, register]);
};
