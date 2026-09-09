import { BucketInviteLinkContainer } from '@/modules/invite-links';
import {  Share2 } from '@/packages/icons';
import {
  BackLink,
  ConfirmDialog,
  ErrorState,
  FeatureTour,
  Loading,
} from '@/shared/ui';

import { ActivityTimeline } from '../components/activity-timeline/activity-timeline.component';
import { BucketInvitePanel } from '../components/bucket-invite-panel/bucket-invite-panel.component';
import { BucketMemberPermissionsPanel } from '../components/bucket-member-permissions-panel/bucket-member-permissions-panel.component';
import { BucketStateBanner } from '../components/bucket-state-banner/bucket-state-banner.component';
import { BucketStateControls } from '../components/bucket-state-controls/bucket-state-controls.component';
import { useBucketShare } from '../hooks/use-bucket-share.hook';
import { useBucketShareTour } from '../hooks/use-bucket-share-tour.hook';
import {
  BUCKETS_REDIRECT_PATH,
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
          <BucketInviteLinkContainer
            bucketId={bucket.id}
            bucketTitle={bucket.title}
          />
          {/*
            The join code still works for anyone who has one, but it is no
            longer offered beside the link as an equal choice. Two ways to do
            one thing is a decision the person did not ask to make, and the
            link is the one that works by tapping rather than by copying a
            string of characters accurately.
          */}
          <details className="section-card stack" id="other-ways">
            <summary>
              <strong>{vm.t('otherWaysToInvite')}</strong>
              <span className="muted">{vm.t('otherWaysToInviteHint')}</span>
            </summary>
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
          </details>
          {/*
            Members and activity were separate pages reached by a link row.
            Sharing a menu is one job, and splitting it across three screens
            meant reading a person's permissions required leaving the screen
            that granted them. They are sections here, closed by default so
            the page still opens on the one thing most people came for.
          */}
          <details className="section-card stack" id="members">
            <summary>
              <strong>{`${vm.t('members')} (${members.length})`}</strong>
              <span className="muted">{vm.t('shareMembersHint')}</span>
            </summary>
            <BucketMemberPermissionsPanel
              members={members}
              currentUserId={vm.user?.id ?? bucket.ownerId}
              locale={vm.locale}
              translate={vm.t}
              onRoleChange={(member, role) => {
                void vm.changeRole(member, role);
              }}
              onPermissionChange={(member, patch) => {
                void vm.changeCustomPermissions(member, patch);
              }}
              onRemove={vm.setRemoving}
            />
          </details>
          <details className="section-card stack" id="activity">
            <summary>
              <strong>{vm.t('activity')}</strong>
              <span className="muted">{vm.t('shareActivityHint')}</span>
            </summary>
            <ActivityTimeline events={vm.activity} locale={vm.locale} t={vm.t} />
          </details>
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
        open={Boolean(vm.removing)}
        title={vm.t('removeMember')}
        message={vm.t('confirmRemoveMember')}
        confirmLabel={vm.t('removeMember')}
        cancelLabel={vm.t('cancel')}
        danger
        onConfirm={vm.removeMember}
        onCancel={() => {
          vm.setRemoving(null);
        }}
      />
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
