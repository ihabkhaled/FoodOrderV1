import { type SyntheticEvent, useState } from 'react';

import type { BucketInvite, BucketRole } from '@/modules/data-access';
import { sharingService } from '@/modules/data-access';
import { useApp } from '@/modules/session';
import { ArrowLeft, KeyRound, UserPlus } from '@/packages/icons';
import { Link, useNavigate } from '@/packages/router';
import type { MessageKey } from '@/shared/i18n';

const ROLE_LABEL: Record<BucketRole, MessageKey> = {
  owner: 'roleOwner',
  editor: 'roleEditor',
  contributor: 'roleContributor',
  viewer: 'roleViewer',
};

export function JoinBucketPage() {
  const navigate = useNavigate();
  const { user, t, showToast, errorMessage } = useApp();
  const [code, setCode] = useState('');
  const [preview, setPreview] = useState<BucketInvite | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

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

  const join = async (): Promise<void> => {
    if (!user || !preview) return;
    try {
      setBusy(true);
      setError('');
      const bucket = await sharingService.acceptJoinCode(user, code.trim());
      showToast(t('joined'), 'success');
      await navigate(`/buckets/${bucket.id}/collaborate`);
    } catch (error_) {
      setError(errorMessage(error_));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page narrow stack-lg">
      <Link className="back-link" to="/buckets">
        <ArrowLeft />
        {t('back')}
      </Link>
      <header className="page-heading">
        <div>
          <p className="eyebrow">{t('sharedWithMe')}</p>
          <h1>{t('joinBucket')}</h1>
        </div>
      </header>
      <form className="section-card stack" onSubmit={(event) => void lookUp(event)}>
        <label>
          {t('joinCode')}
          <input
            value={code}
            onChange={(event) => {
              setCode(event.target.value);
              setPreview(null);
            }}
            placeholder={t('joinCodePlaceholder')}
            autoComplete="off"
            spellCheck={false}
            required
          />
        </label>
        <button className="button secondary" disabled={busy || !code.trim()}>
          <KeyRound />
          {busy && !preview ? t('loading') : t('joinWithCode')}
        </button>
      </form>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      {preview ? (
        <section className="section-card stack invite-preview">
          <p className="eyebrow">{t('invitePreviewTitle')}</p>
          <h2>{preview.bucketTitle}</h2>
          <p className="muted">
            {t('joinPreviewOwner')}: {preview.ownerName}
          </p>
          <p className="muted">
            {t('joinPreviewRole')}: {t(ROLE_LABEL[preview.role])}
          </p>
          <button className="button" disabled={busy} onClick={() => void join()}>
            <UserPlus />
            {busy ? t('loading') : t('joinNow')}
          </button>
        </section>
      ) : null}
    </div>
  );
}
