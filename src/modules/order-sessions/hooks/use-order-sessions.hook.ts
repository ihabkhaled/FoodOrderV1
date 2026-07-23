import { useCallback, useEffect, useState } from 'react';

import {
  type Locale,
  type OrderSession,
  orderSessionService,
} from '@/modules/data-access';
import { useApp } from '@/modules/session';

import { translateOrderSession } from '../i18n/translate-order-session.helper';

export interface OrderSessionsViewModel {
  sessions: OrderSession[];
  loading: boolean;
  error: string;
  locale: Locale;
  translate: typeof translateOrderSession;
  refresh: () => Promise<void>;
}

export function useOrderSessions(): OrderSessionsViewModel {
  const { user, locale } = useApp();
  const [sessions, setSessions] = useState<OrderSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!user) {
      setSessions([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError('');
      setSessions(await orderSessionService.listSessions(user));
    } catch (error_) {
      setError(
        error_ instanceof Error
          ? error_.message
          : translateOrderSession(locale, 'sessionChanged'),
      );
    } finally {
      setLoading(false);
    }
  }, [locale, user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    sessions,
    loading,
    error,
    locale,
    translate: translateOrderSession,
    refresh,
  };
}
