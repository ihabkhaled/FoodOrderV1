import { BackLink, ErrorState, SkeletonSection } from '@/shared/ui';

import { FriendSearch } from '../components/friend-search/friend-search.component';
import { FriendsList } from '../components/friends-list/friends-list.component';
import { useSocial } from '../hooks/use-social.hook';
import { SOCIAL_PATH } from '../routes/social-route-paths.constants';

/** Finding people and the list of accepted friends, apart from everything else. */
export function SocialFriendsContainer() {
  const vm = useSocial();

  if (vm.loading) {
    return (
      <div className="page narrow stack-lg">
        <SkeletonSection label={vm.t('loading')} variant="card" count={1} />
        <SkeletonSection label={vm.t('loading')} variant="row" count={4} />
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
          <h1>{vm.s('friends')}</h1>
        </div>
      </div>
      <FriendSearch
        s={vm.s}
        emailLabel={vm.t('email')}
        loadingLabel={vm.t('loading')}
        email={vm.email}
        searching={vm.searching}
        searched={vm.searched}
        result={vm.result}
        onEmailChange={vm.setEmail}
        onSearch={() => void vm.search()}
        onSendRequest={() => void vm.sendRequest()}
      />
      <FriendsList
        s={vm.s}
        friends={vm.overview.friends}
        onUnfriend={(friendUserId) => void vm.unfriend(friendUserId)}
      />
    </div>
  );
}
