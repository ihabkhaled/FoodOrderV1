import { BucketInviteLinkContainer } from '@/modules/invite-links';
import { History, Share2, Users } from '@/packages/icons';
import {
  BackLink,
  ConfirmDialog,
  ErrorState,
  FeatureTour,
  LinkRow,
  Loading,
} from '@/shared/ui';

import { BucketInvitePanel } from '../components/bucket-invite-panel/bucket-invite-panel.component';
import { BucketStateBanner } from '../components/bucket-state-banner/bucket-state-banner.component';
import { BucketStateControls } from '../components/bucket-state-controls/bucket-state-controls.component';
import { useBucketShare } from '../hooks/use-bucket-share.hook';
import { useBucketShareTour } from '../hooks/use-bucket-share-tour.hook';
import {
  BUCKETS_REDIRECT_PATH,
  buildBucketShareActivityRoute,
  buildBucketShareMembersRoute,
} from '../routes/group-orders-route-paths.constants';

export function BucketShareContainer() {
  const vm = useBucketShare();
  const { steps: tourSteps } = useBucketShareTour();

  if (vm.loading) return <Loading label={vm.t('loading')} />;
  if (!vm.view || vm.error) {
    return (
      <ErrorState
        retryLabel={vm.t('tryAgain')}
        message={vm.error || vm.t('notAllowed')}
        onRetry={vm.reload}
      />
    );
  }

  const { bucket, members } = vm.view;

  return (
    <div className="page narrow stack-lg">
      <BackLink fallback={BUCKETS_REDIRECT_PATH} label={vm.t('back')} />
      <header className="page-heading">
        <div>
          <p className="eyebrow">{vm.t('sharing')}</p>
          <h1>{bucket.title}</h1>
        </div>
        <BucketStateControls
          bucket={bucket}
          freezeLabel={vm.gt('freezeBucket')}
          reopenLabel={vm.gt('unfreezeBucket')}
          onFreeze={() => {
            vm.setConfirmingFreeze(true);
          }}
          onReopen={() => {
            void vm.reopen();
          }}
        />
      </header>

      <BucketStateBanner bucket={bucket} locale={vm.locale} />

      {bucket.visibility === 'shared' ? (
        <>
          <BucketInvitePanel
            locale={vm.locale}
            invites={vm.invites}
            inviteRole={vm.inviteRole}
            creating={vm.creating}
            joinCode={vm.joinCode}
            copiedCode={vm.copiedCode}
            translate={vm.t}
            onRoleChange={vm.setInviteRole}
            onCreate={() => {
              void vm.createInvite();
            }}
            onShare={() => {
              void vm.shareOrCopy();
            }}
            onRevoke={(inviteId) => {
              void vm.revokeInvite(inviteId);
            }}
          />
          <BucketInviteLinkContainer
            bucketId={bucket.id}
            bucketTitle={bucket.title}
          />
          <nav className="link-rows" aria-label={vm.t('sharing')}>
            <LinkRow
              to={buildBucketShareMembersRoute(bucket.id)}
              icon={Users}
              title={`${vm.t('members')} (${members.length})`}
              hint={vm.t('shareMembersHint')}
            />
            <LinkRow
              to={buildBucketShareActivityRoute(bucket.id)}
              icon={History}
              title={vm.t('activity')}
              hint={vm.t('shareActivityHint')}
            />
          </nav>
        </>
      ) : (
        <section className="section-card stack">
          <p>{vm.t('sharingDisabledHint')}</p>
          <button
            className="button"
            disabled={vm.enabling}
            onClick={() => {
              void vm.enable();
            }}
          >
            <Share2 />
            {vm.enabling ? vm.t('loading') : vm.t('enableSharing')}
          </button>
        </section>
      )}

      <ConfirmDialog
        open={vm.confirmingFreeze}
        title={vm.gt('freezeBucket')}
        message={vm.gt('confirmFreeze')}
        confirmLabel={vm.gt('freezeBucket')}
        cancelLabel={vm.t('cancel')}
        onConfirm={() => {
          void vm.freeze();
        }}
        onCancel={() => {
          vm.setConfirmingFreeze(false);
        }}
      />

      <FeatureTour
        page="bucket-share"
        steps={tourSteps}
        nextLabel={vm.t('tourNext')}
        doneLabel={vm.t('tourDone')}
        skipLabel={vm.t('tourSkip')}
        closeLabel={vm.t('close')}
        skipAllLabel={vm.t('tourSkipAll')}
      />
    </div>
  );
}
