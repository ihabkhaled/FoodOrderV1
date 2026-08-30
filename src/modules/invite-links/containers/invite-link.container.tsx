import { ErrorState, Loading } from '@/shared/ui';

import { InviteLinkPreviewCard } from '../components/invite-link-panel/invite-link-preview.component';
import { useInviteLinkRedemption } from '../hooks/use-invite-link-redemption.hook';

/** Redeems a shared invite link after showing the viewer what it grants. */
export function InviteLinkContainer() {
  const vm = useInviteLinkRedemption();

  if (vm.loading) {
    return (
      <div className="page narrow stack-lg">
        <Loading label={vm.t('loading')} />
      </div>
    );
  }

  if (vm.error || !vm.preview) {
    return (
      <div className="page narrow stack-lg">
        <ErrorState
          message={vm.error ?? vm.t('inviteLinkInvalid')}
          retryLabel={vm.t('tryAgain')}
          onRetry={vm.retry}
        />
      </div>
    );
  }

  return (
    <div className="page narrow stack-lg">
      <InviteLinkPreviewCard
        preview={vm.preview}
        redeeming={vm.redeeming}
        onAccept={() => void vm.accept()}
        t={vm.t}
      />
    </div>
  );
}
