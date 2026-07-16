import { ArrowLeft, Share2 } from '@/packages/icons';
import { Link } from '@/packages/router';
import { ConfirmDialog, ErrorState, Loading } from '@/shared/ui';

import { ActivityTimeline } from '../components/activity-timeline/activity-timeline.component';
import { BucketInvitePanel } from '../components/bucket-invite-panel/bucket-invite-panel.component';
import { BucketMemberPermissionsPanel } from '../components/bucket-member-permissions-panel/bucket-member-permissions-panel.component';
import { BucketStateBanner } from '../components/bucket-state-banner/bucket-state-banner.component';
import { BucketStateControls } from '../components/bucket-state-controls/bucket-state-controls.component';
import { useBucketShare } from '../hooks/use-bucket-share.hook';
import { buildBucketCollaborateRoute } from '../routes/group-orders-route-paths.constants';

export function BucketShareContainer() {
  const vm = useBucketShare();

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
      <Link className="back-link" to={buildBucketCollaborateRoute(bucket.id)}>
        <ArrowLeft />
        {vm.t('back')}
      </Link>
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
          <section className="section-card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">{vm.t('activity')}</p>
                <h2>{vm.t('activity')}</h2>
              </div>
            </div>
            <ActivityTimeline
              events={vm.activity}
              locale={vm.locale}
              t={vm.t}
            />
          </section>
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
        onConfirm={() => {
          void vm.removeMember();
        }}
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
    </div>
  );
}
