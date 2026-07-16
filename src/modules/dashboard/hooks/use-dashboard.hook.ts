import { useCallback, useEffect, useState } from 'react';

import type {
  DashboardSummary,
  Locale,
  SessionUser,
  UserProfile,
} from '@/modules/data-access';
import { dataService } from '@/modules/data-access';
import { useApp } from '@/modules/session';
import type { MessageKey } from '@/shared/i18n';
import { usePageRefresh } from '@/shared/ui';

export interface DashboardViewModel {
  user: SessionUser | null;
  profile: UserProfile | null;
  locale: Locale;
  t: (key: MessageKey) => string;
  errorMessage: (error: unknown) => string;
  summary: DashboardSummary | null;
  error: unknown;
  load: () => Promise<void>;
}

export function useDashboard(): DashboardViewModel {
  const { user, profile, locale, t, errorMessage } = useApp();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async (): Promise<void> => {
    if (!user) return;
    try {
      setError(null);
      setSummary(await dataService.getDashboard(user));
    } catch (error_) {
      setError(error_);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);
  usePageRefresh(load);

  return { user, profile, locale, t, errorMessage, summary, error, load };
}
