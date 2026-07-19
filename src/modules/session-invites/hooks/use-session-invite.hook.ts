import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  buildAuthPathWithReturnTo,
  LOGIN_PATH,
  REGISTER_PATH,
} from '@/modules/auth';
import {
  type GuestSessionCapability,
  type GuestSessionView,
  parseSessionShareCode,
  type PublicSessionInvitePreview,
  sessionInviteService,
} from '@/modules/data-access';
import {
  buildOrderSessionDetailsRoute,
} from '@/modules/order-sessions';
import { useApp } from '@/modules/session';
import { useNavigate, useParams } from '@/packages/router';
import { createId } from '@/shared/helpers';

import {
  readGuestSessionCapability,
  removeGuestSessionCapability,
  writeGuestSessionCapability,
} from '../helpers/guest-capability-storage.helper';
import { translateSessionInvite } from '../i18n/translate-session-invite.helper';
import { buildSessionInviteRoute } from '../routes/session-invite-route-paths.constants';
import type {
  GuestResponseAction,
  GuestSessionMenuItem,
  SessionInviteLocale,
  SessionInviteViewModel,
} from '../types/session-invite-ui.types';

const normalizeLocale = (value: string | undefined): SessionInviteLocale =>
  value === 'ar' ? 'ar' : 'en';

export function useSessionInvite(): SessionInviteViewModel {
  const { shareCode = '' } = useParams<{ shareCode: string }>();
  const navigate = useNavigate();
  const { user, profile } = useApp();
  const [locale, setLocale] = useState<SessionInviteLocale>(() =>
    normalizeLocale(profile?.locale),
  );
  const [preview, setPreview] =
    useState<PublicSessionInvitePreview | null>(null);
  const [capability, setCapability] =
    useState<GuestSessionCapability | null>(null);
  const [guestView, setGuestView] = useState<GuestSessionView | null>(null);
  const [guestName, setGuestName] = useState('');
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [responseBusy, setResponseBusy] = useState(false);
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const requestRevision = useRef(0);

  const returnTo = buildSessionInviteRoute(shareCode);
  const loginPath = useMemo(
    () => buildAuthPathWithReturnTo(LOGIN_PATH, returnTo),
    [returnTo],
  );
  const registerPath = useMemo(
    () => buildAuthPathWithReturnTo(REGISTER_PATH, returnTo),
    [returnTo],
  );

  const loadGuestView = useCallback(
    async (storedCapability: GuestSessionCapability): Promise<GuestSessionView> => {
      const view = await sessionInviteService.getGuestSessionView(storedCapability);
      setCapability(storedCapability);
      setGuestView(view);
      setPreview(view.preview);
      setGuestName(storedCapability.displayName);
      return view;
    },
    [],
  );

  const refresh = useCallback(async (): Promise<void> => {
    const revision = requestRevision.current + 1;
    requestRevision.current = revision;
    setLoading(true);
    setError('');
    setNotice('');

    try {
      const loadedPreview = await sessionInviteService.previewInvite(shareCode);
      if (revision !== requestRevision.current) return;
      setPreview(loadedPreview);

      const parsedShareCode = parseSessionShareCode(shareCode);
      const sessionId = parsedShareCode?.sessionId ?? loadedPreview.sessionId;
      const storedCapability = readGuestSessionCapability(sessionId);
      if (!storedCapability) {
        setCapability(null);
        setGuestView(null);
        return;
      }

      try {
        await loadGuestView(storedCapability);
      } catch {
        removeGuestSessionCapability(sessionId);
        if (revision !== requestRevision.current) return;
        setCapability(null);
        setGuestView(null);
      }
    } catch {
      if (revision !== requestRevision.current) return;
      setPreview(null);
      setGuestView(null);
      setCapability(null);
      setError(translateSessionInvite(locale, 'invalidInvite'));
    } finally {
      if (revision === requestRevision.current) setLoading(false);
    }
  }, [loadGuestView, locale, shareCode]);

  useEffect(() => {
    void refresh();
    return () => {
      requestRevision.current += 1;
    };
  }, [refresh]);

  const joinAsGuest = async (): Promise<void> => {
    const normalizedName = guestName.trim();
    if (normalizedName.length < 2) {
      setError(translateSessionInvite(locale, 'guestNameRequired'));
      return;
    }

    try {
      setJoining(true);
      setError('');
      setNotice('');
      const createdCapability = await sessionInviteService.joinAsGuest(
        shareCode,
        normalizedName,
      );
      writeGuestSessionCapability(createdCapability);

      if (user) {
        const linked = await sessionInviteService.linkGuestToAccount(
          user,
          createdCapability,
        );
        removeGuestSessionCapability(createdCapability.sessionId);
        await navigate(buildOrderSessionDetailsRoute(linked.sessionId));
        return;
      }

      await loadGuestView(createdCapability);
    } catch {
      setError(translateSessionInvite(locale, 'invalidInvite'));
    } finally {
      setJoining(false);
    }
  };

  const changeQuantity = async (
    item: GuestSessionMenuItem,
    quantity: number,
  ): Promise<void> => {
    if (!capability || !guestView || quantity < 0 || quantity > 999) return;

    try {
      setBusyItemId(item.id);
      setError('');
      setNotice('');
      await sessionInviteService.updateGuestContribution({
        sessionId: capability.sessionId,
        guestId: capability.guestId,
        guestSecret: capability.guestSecret,
        expectedSessionRevision: guestView.sessionRevision,
        itemId: item.id,
        operation: 'set',
        value: quantity,
        mutationId: createId('guest-mutation'),
      });
      await loadGuestView(capability);
      setNotice(translateSessionInvite(locale, 'contributionUpdated'));
    } catch {
      setError(translateSessionInvite(locale, 'saveFailed'));
    } finally {
      setBusyItemId(null);
    }
  };

  const updateResponse = async (
    response: GuestResponseAction,
  ): Promise<void> => {
    if (!capability || !guestView) return;

    try {
      setResponseBusy(true);
      setError('');
      setNotice('');
      const updatedView = await sessionInviteService.updateGuestResponse({
        sessionId: capability.sessionId,
        guestId: capability.guestId,
        guestSecret: capability.guestSecret,
        expectedSessionRevision: guestView.sessionRevision,
        expectedParticipantRevision: guestView.participantRevision,
        response,
      });
      setGuestView(updatedView);
      setPreview(updatedView.preview);
      setNotice(translateSessionInvite(locale, 'responseUpdated'));
    } catch {
      setError(translateSessionInvite(locale, 'saveFailed'));
    } finally {
      setResponseBusy(false);
    }
  };

  const linkAccount = async (): Promise<void> => {
    if (!user || !capability) return;

    try {
      setLinking(true);
      setError('');
      const linked = await sessionInviteService.linkGuestToAccount(user, capability);
      removeGuestSessionCapability(capability.sessionId);
      setNotice(translateSessionInvite(locale, 'accountLinked'));
      await navigate(buildOrderSessionDetailsRoute(linked.sessionId));
    } catch {
      setError(translateSessionInvite(locale, 'saveFailed'));
    } finally {
      setLinking(false);
    }
  };

  return {
    locale,
    setLocale,
    loading,
    error,
    notice,
    preview,
    guestView,
    guestName,
    setGuestName,
    joining,
    busyItemId,
    responseBusy,
    linking,
    authenticated: Boolean(user),
    loginPath,
    registerPath,
    translate: translateSessionInvite,
    refresh,
    joinAsGuest,
    changeQuantity,
    updateResponse,
    linkAccount,
  };
}
