import type { BucketRole } from '@/modules/data-access';
import { ArrowLeft, KeyRound, UserPlus } from '@/packages/icons';
import { Link } from '@/packages/router';
import type { MessageKey } from '@/shared/i18n';

import { useJoinBucket } from '../hooks/use-join-bucket.hook';
import { BUCKETS_REDIRECT_PATH } from '../routes/group-orders-route-paths.constants';

const ROLE_LABEL: Record<BucketRole, MessageKey> = {
  owner: 'roleOwner',
  editor: 'roleEditor',
  contributor: 'roleContributor',
  viewer: 'roleViewer',
};

export function JoinBucketContainer() {
  const vm = useJoinBucket();

  return (
    <div className="page narrow stack-lg">
      <Link className="back-link" to={BUCKETS_REDIRECT_PATH}>
        <ArrowLeft />
        {vm.t('back')}
      </Link>
      <header className="page-heading">
        <div>
          <p className="eyebrow">{vm.t('sharedWithMe')}</p>
          <h1>{vm.t('joinBucket')}</h1>
        </div>
      </header>
      <form
        className="section-card stack"
        onSubmit={(event) => void vm.lookUp(event)}
      >
        <label>
          {vm.t('joinCode')}
          <input
            value={vm.code}
            onChange={(event) => {
              vm.updateCode(event.target.value);
            }}
            placeholder={vm.t('joinCodePlaceholder')}
            autoComplete="off"
            spellCheck={false}
            required
          />
        </label>
        <button
          className="button secondary"
          disabled={vm.busy || !vm.code.trim()}
        >
          <KeyRound />
          {vm.busy && !vm.preview ? vm.t('loading') : vm.t('joinWithCode')}
        </button>
      </form>
      {vm.error ? (
        <p className="form-error" role="alert">
          {vm.error}
        </p>
      ) : null}
      {vm.preview ? (
        <section className="section-card stack invite-preview">
          <p className="eyebrow">{vm.t('invitePreviewTitle')}</p>
          <h2>{vm.preview.bucketTitle}</h2>
          <p className="muted">
            {vm.t('joinPreviewOwner')}: {vm.preview.ownerName}
          </p>
          <p className="muted">
            {vm.t('joinPreviewRole')}: {vm.t(ROLE_LABEL[vm.preview.role])}
          </p>
          <button
            className="button"
            disabled={vm.busy}
            onClick={() => void vm.joinBucket()}
          >
            <UserPlus />
            {vm.busy ? vm.t('loading') : vm.t('joinNow')}
          </button>
        </section>
      ) : null}
    </div>
  );
}
