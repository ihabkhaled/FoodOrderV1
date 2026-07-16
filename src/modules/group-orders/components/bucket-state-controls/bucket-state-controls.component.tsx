import type { Bucket } from '@/modules/data-access';
import { Lock, LockOpen } from '@/packages/icons';

interface BucketStateControlsProps {
  bucket: Bucket;
  freezeLabel: string;
  reopenLabel: string;
  onFreeze: () => void;
  onReopen: () => void;
}

export function BucketStateControls({
  bucket,
  freezeLabel,
  reopenLabel,
  onFreeze,
  onReopen,
}: BucketStateControlsProps) {
  const state = bucket.orderState ?? 'open';

  if (state === 'open') {
    return (
      <button className="button secondary" onClick={onFreeze}>
        <Lock />
        {freezeLabel}
      </button>
    );
  }

  if (state === 'frozen') {
    return (
      <button className="button secondary" onClick={onReopen}>
        <LockOpen />
        {reopenLabel}
      </button>
    );
  }

  return null;
}
