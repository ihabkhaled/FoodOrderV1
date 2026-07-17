import type { SyntheticEvent } from 'react';
import { useState } from 'react';

import type { BucketInvite } from '@/modules/data-access';
import { sharingService } from '@/modules/data-access';
import { useApp } from '@/modules/session';
import { useNavigate } from '@/packages/router';
import type { MessageKey } from '@/shared/i18n';

import { buildBucketCollaborateRoute } from '../routes/group-orders-route-paths.constants';

export interface JoinBucketViewModel {
  t: (key: MessageKey) => string;
  code: string;
  updateCode: (value: string) => void;
  preview: BucketInvite | null;
  busy: boolean;
  error: string;
  lookUp: (event: SyntheticEvent) => Promise<void>;
  joinBucket: () => Promise<void>;
}

export function useJoinBucket(): JoinBucketViewModel {
  const navigate = useNavigate();
  const { user, t, showToast, errorMessage } = useApp();
  const [code, setCode] = useState('');
  const [preview, setPreview] = useState<BucketInvite | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const updateCode = (value: string): void => {
    setCode(value);
    setPreview(null);
  };

  const lookUp = async (event: SyntheticEvent): Promise<void> => {
    event.preventDefault();
    if (!code.trim()) return;
    try {
      setBusy(true);
      setError('');
      setPreview(await sharingService.previewJoinCode(code.trim()));
    } catch (error_) {
      setPreview(null);
      setError(errorMessage(error_, 'joinCodeInvalid'));
    } finally {
      setBusy(false);
    }
  };

  const joinBucket = async (): Promise<void> => {
    if (!user || !preview) return;
    try {
      setBusy(true);
      setError('');
      const bucket = await sharingService.acceptJoinCode(user, code.trim());
      showToast(t('joined'), 'success');
      await navigate(buildBucketCollaborateRoute(bucket.id));
    } catch (error_) {
      setError(errorMessage(error_));
    } finally {
      setBusy(false);
    }
  };

  return { t, code, updateCode, preview, busy, error, lookUp, joinBucket };
}
