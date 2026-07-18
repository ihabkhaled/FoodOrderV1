import { type SyntheticEvent, useEffect, useState } from 'react';

import {
  type Bucket,
  dataService,
  orderSessionService,
} from '@/modules/data-access';
import { useApp } from '@/modules/session';
import { useNavigate, useParams } from '@/packages/router';

import { translateOrderSession } from '../i18n/translate-order-session.helper';
import { buildOrderSessionDetailsRoute } from '../routes/order-sessions-route-paths.constants';

const defaultTimezone = (): string =>
  Intl.DateTimeFormat().resolvedOptions().timeZone || 'Africa/Cairo';

const toDeadlineIso = (value: string): string | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

export interface CreateOrderSessionViewModel {
  menu: Bucket | null;
  title: string;
  setTitle: (value: string) => void;
  deadline: string;
  setDeadline: (value: string) => void;
  autoLock: boolean;
  setAutoLock: (value: boolean) => void;
  timezone: string;
  setTimezone: (value: string) => void;
  loading: boolean;
  saving: boolean;
  error: string;
  locale: 'en' | 'ar';
  translate: typeof translateOrderSession;
  submit: (event: SyntheticEvent<HTMLFormElement>) => Promise<void>;
}

export function useCreateOrderSession(): CreateOrderSessionViewModel {
  const { menuTemplateId = '' } = useParams<{ menuTemplateId: string }>();
  const navigate = useNavigate();
  const { user, profile, showToast } = useApp();
  const locale = profile?.locale ?? 'en';
  const [menu, setMenu] = useState<Bucket | null>(null);
  const [title, setTitle] = useState('');
  const [deadline, setDeadline] = useState('');
  const [autoLock, setAutoLock] = useState(false);
  const [timezone, setTimezone] = useState(defaultTimezone);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    if (!user || !menuTemplateId) {
      setLoading(false);
      return () => {
        active = false;
      };
    }
    void dataService
      .getBucket(user, menuTemplateId)
      .then((loadedMenu) => {
        if (!active) return;
        setMenu(loadedMenu);
        setTitle(loadedMenu?.title ?? '');
        setError(
          loadedMenu
            ? ''
            : translateOrderSession(locale, 'sessionNotFound'),
        );
      })
      .catch((error_: unknown) => {
        if (active) {
          setError(
            error_ instanceof Error
              ? error_.message
              : translateOrderSession(locale, 'sessionChanged'),
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [locale, menuTemplateId, user]);

  const submit = async (
    event: SyntheticEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();
    if (!user || !menu) return;
    try {
      setSaving(true);
      setError('');
      const saved = await orderSessionService.createSession(user, {
        menuTemplateId: menu.id,
        title: title.trim() || menu.title,
        timezone: timezone.trim() || defaultTimezone(),
        deadlineAt: toDeadlineIso(deadline),
        autoLock,
      });
      showToast(translateOrderSession(locale, 'sessionCreated'), 'success');
      await navigate(buildOrderSessionDetailsRoute(saved.id));
    } catch (error_) {
      setError(
        error_ instanceof Error
          ? error_.message
          : translateOrderSession(locale, 'sessionChanged'),
      );
    } finally {
      setSaving(false);
    }
  };

  return {
    menu,
    title,
    setTitle,
    deadline,
    setDeadline,
    autoLock,
    setAutoLock,
    timezone,
    setTimezone,
    loading,
    saving,
    error,
    locale,
    translate: translateOrderSession,
    submit,
  };
}
