import { BackLink, ErrorState, FeatureTour, SkeletonSection } from '@/shared/ui';

import { BucketInvitations } from '../components/bucket-invitations/bucket-invitations.component';
import { GroupInvitations } from '../components/group-invitations/group-invitations.component';
import { IncomingRequests } from '../components/incoming-requests/incoming-requests.component';
import { useSocial } from '../hooks/use-social.hook';
import { useSocialRequestsTour } from '../hooks/use-social-requests-tour.hook';
import { SOCIAL_PATH } from '../routes/social-route-paths.constants';

/** Everything waiting on an answer: friend, group, and menu invitations. */
export function SocialRequestsContainer() {
  const vm = useSocial();
  const { steps: tourSteps } = useSocialRequestsTour();

  if (vm.loading) {
    return (
      <div className="page narrow stack-lg">
        <SkeletonSection label={vm.t('loading')} variant="row" count={3} />
      </div>
    );
  }
  if (vm.error) {
    return (
      <ErrorState
        retryLabel={vm.t('tryAgain')}
        message={vm.error}
        onRetry={vm.retry}
      />
    );
  }

  return (
    <div className="page narrow stack-lg">
      <div className="page-heading">
        <div>
          <BackLink fallback={SOCIAL_PATH} label={vm.t('back')} />
          <h1>{vm.s('requestsTitle')}</h1>
        </div>
      </div>
      <BucketInvitations
        s={vm.s}
        t={vm.t}
        invitations={vm.overview.bucketInvitations ?? []}
        onRespond={(bucketId, response) =>
          void vm.respondBucketInvitation(bucketId, response)
        }
      />
      <IncomingRequests
        s={vm.s}
        requests={vm.overview.incomingRequests}
        onRespond={(senderUserId, response) =>
          void vm.respondFriendRequest(senderUserId, response)
        }
      />
      <GroupInvitations
        s={vm.s}
        invitations={vm.overview.groupInvitations}
        onRespond={(groupId, response) =>
          void vm.respondGroupInvitation(groupId, response)
        }
      />

      <FeatureTour
        page="social-requests"
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
