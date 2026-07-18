import { useCallback, useEffect, useState } from 'react';

import {
  orderSessionService,
  type OrderSession,
} from '@/modules/data-access';
import { useApp } from '@/modules/session';

import { translateOrderSession } from '../i18n/translate-order-session.helper';

export interface OrderSessionsViewModel {
  sessions: OrderSession[];
  loading: boolean;
  error: string;
  locale: 'en' | 'ar';
  translate: typeof translateOrderSession;
  refresh: () => Promise<void>;
}

export function useOrderSessions(): OrderSessionsViewModel {
  const { user, profile } = useApp();
  const [sessions, setSessions] = useState<OrderSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const locale = profile?.locale ?? 'en';

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
