import { Mail, UserPlus, Users } from '@/packages/icons';
import { ErrorState, FeatureTour, LinkRow, SkeletonSection } from '@/shared/ui';

import { SocialHero } from '../components/social-hero/social-hero.component';
import { useSocial } from '../hooks/use-social.hook';
import { useSocialTour } from '../hooks/use-social-tour.hook';
import {
  SOCIAL_FRIENDS_PATH,
  SOCIAL_GROUPS_PATH,
  SOCIAL_REQUESTS_PATH,
} from '../routes/social-route-paths.constants';

/**
 * The friends area is a hub: counts up top, one row per destination. Search,
 * pending invitations, and group management each live on their own page so no
 * single screen carries six sections at once.
 */
export function SocialContainer() {
  const vm = useSocial();
  const { setPeopleElement, steps: tourSteps } = useSocialTour();

  if (vm.loading) {
    return (
      <div className="page narrow stack-lg">
        <SkeletonSection label={vm.t('loading')} variant="row" count={1} />
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

  const pendingCount =
    vm.overview.incomingRequests.length +
    vm.overview.groupInvitations.length +
    (vm.overview.bucketInvitations?.length ?? 0);
  const rows = [
    {
      to: SOCIAL_FRIENDS_PATH,
      icon: UserPlus,
      title: vm.s('friends'),
      hint: vm.s('friendsHubHint'),
    },
    {
      to: SOCIAL_REQUESTS_PATH,
      icon: Mail,
      title:
        pendingCount > 0
          ? `${vm.s('requestsTitle')} (${pendingCount})`
          : vm.s('requestsTitle'),
      hint: vm.s('requestsHubHint'),
    },
    {
      to: SOCIAL_GROUPS_PATH,
      icon: Users,
      title: vm.s('groups'),
      hint: vm.s('groupsHubHint'),
    },
  ];

  return (
    <div className="page narrow stack-lg">
      <SocialHero
        s={vm.s}
        friendCount={vm.overview.friends.length}
        activeGroupCount={vm.activeGroupCount}
        pendingCount={pendingCount}
      />
      <nav
        ref={setPeopleElement}
        className="link-rows"
        aria-label={vm.s('friends')}
      >
        {rows.map((row) => (
          <LinkRow
            key={row.to}
            to={row.to}
            icon={row.icon}
            title={row.title}
            hint={row.hint}
          />
        ))}
      </nav>

      <FeatureTour
        page="social"
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
