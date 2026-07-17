import { ErrorState, Loading } from '@/shared/ui';

import { BucketCollaborateContent } from '../components/bucket-collaborate-content/bucket-collaborate-content.component';
import { useBucketCollaborate } from '../hooks/use-bucket-collaborate.hook';

export function BucketCollaborateContainer() {
  const vm = useBucketCollaborate();

  if (vm.loading) return <Loading label={vm.t('loading')} />;
  if (!vm.view || !vm.user || vm.error) {
    return (
      <ErrorState
        retryLabel={vm.t('tryAgain')}
        message={vm.error || vm.t('notAllowed')}
        onRetry={vm.reload}
      />
    );
  }

  return (
    <BucketCollaborateContent
      view={vm.view}
      user={vm.user}
      locale={vm.locale}
      translate={vm.t}
      activity={vm.activity}
      pending={vm.pending}
      myContribution={vm.myContribution}
      drifted={vm.drifted}
      notes={vm.notes}
      ordering={vm.ordering}
      repairing={vm.repairing}
      leaving={vm.leaving}
      onAdjust={vm.adjust}
      onRetry={vm.retryItem}
      onRepair={() => {
        void vm.repair();
      }}
      onNotesChange={vm.setNotes}
      onPlaceOrder={() => {
        void vm.placeGroupOrder();
      }}
      onAddCustomItem={(input) => {
        void vm.addCustomItem(input);
      }}
      onApproveCustomItem={(itemId, unitPrice) => {
        void vm.approveCustomItem(itemId, unitPrice);
      }}
      onRequestLeave={() => {
        vm.setLeaving(true);
      }}
      onConfirmLeave={() => {
        void vm.leave();
      }}
      onCancelLeave={() => {
        vm.setLeaving(false);
      }}
    />
  );
}
