import { useCallback, useEffect, useState } from 'react';

import type { InviteLinkPreview, InviteLinkRedemption } from '@/modules/data-access';
import { inviteLinkService } from '@/modules/data-access';
import { useApp } from '@/modules/session';
import { useNavigate, useParams } from '@/packages/router';

export interface InviteLinkRedemptionViewModel {
  loading: boolean;
  error: string | null;
  preview: InviteLinkPreview | null;
  redeeming: boolean;
  accept: () => Promise<void>;
  retry: () => void;
  t: ReturnType<typeof useApp>['t'];
}

/**
 * Loads what a link grants, then redeems it on confirmation.
 *
 * The preview happens before any write so the person opening a link from a
 * chat sees what they are joining and who shared it. Redemption is idempotent
 * server-side, so re-opening a used link lands on the resource rather than an
 * error.
 */
export const useInviteLinkRedemption = (): InviteLinkRedemptionViewModel => {
  const { token = '' } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { t, showToast } = useApp();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<InviteLinkPreview | null>(null);
  const [redeeming, setRedeeming] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    const load = async (): Promise<void> => {
      try {
        const result = await inviteLinkService.previewLink(token);
        if (active) setPreview(result);
      } catch (error_: unknown) {
        if (active) {
          setError(error_ instanceof Error ? error_.message : t('inviteLinkInvalid'));
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [token, attempt, t]);

  const destinationFor = useCallback((redemption: InviteLinkRedemption): string => {
    if (redemption.kind === 'bucket' && redemption.bucketId) {
      return `/buckets/${redemption.bucketId}`;
    }
    if (redemption.kind === 'group') return '/social/groups';
    return '/social/friends';
  }, []);

  const accept = useCallback(async () => {
    setRedeeming(true);
    try {
      const redemption = await inviteLinkService.redeemLink(token);
      showToast(
        redemption.alreadyGranted ? t('inviteLinkAlready') : t('inviteLinkAccepted'),
        'success',
      );
      await navigate(destinationFor(redemption), { replace: true });
    } catch (error_: unknown) {
      showToast(error_ instanceof Error ? error_.message : t('tryAgain'), 'error');
    } finally {
      setRedeeming(false);
    }
  }, [token, navigate, showToast, t, destinationFor]);

  const retry = useCallback(() => {
    setAttempt((value) => value + 1);
  }, []);

  return { loading, error, preview, redeeming, accept, retry, t };
};
