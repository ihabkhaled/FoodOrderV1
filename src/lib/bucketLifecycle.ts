import { nowIso } from '@/lib/date';
import type { Bucket } from '@/types/domain';

const withLifecycleUpdate = (
  bucket: Bucket,
  patch: Pick<Bucket, 'orderState' | 'frozenAt' | 'frozenBy'>,
  occurredAt: string,
): Bucket => ({
  ...bucket,
  ...patch,
  revision: bucket.revision + 1,
  updatedAt: occurredAt,
});

export const assertBucketMutable = (bucket: Bucket): void => {
  if (bucket.orderState !== 'open') {
    throw new Error('This bucket is frozen and cannot be changed.');
  }
};

export const freezeBucket = (
  bucket: Bucket,
  actorId: string,
  occurredAt = nowIso(),
): Bucket => {
  if (bucket.orderState === 'frozen') return bucket;
  if (bucket.orderState !== 'open') {
    throw new Error(`A bucket in ${bucket.orderState} state cannot be frozen.`);
  }
  if (!actorId.trim()) throw new Error('A freeze actor is required.');

  return withLifecycleUpdate(
    bucket,
    {
      orderState: 'frozen',
      frozenAt: occurredAt,
      frozenBy: actorId,
    },
    occurredAt,
  );
};

export const unfreezeBucket = (
  bucket: Bucket,
  occurredAt = nowIso(),
): Bucket => {
  if (bucket.orderState !== 'frozen') {
    throw new Error('Only a frozen bucket can be reopened.');
  }

  return withLifecycleUpdate(
    bucket,
    {
      orderState: 'open',
      frozenAt: null,
      frozenBy: null,
    },
    occurredAt,
  );
};

export const beginOrdering = (
  bucket: Bucket,
  actorId: string,
  occurredAt = nowIso(),
): Bucket => {
  if (!actorId.trim()) throw new Error('An ordering actor is required.');
  if (bucket.orderState === 'ordering') return bucket;
  if (!['open', 'frozen'].includes(bucket.orderState)) {
    throw new Error(`A bucket in ${bucket.orderState} state cannot be ordered.`);
  }

  return withLifecycleUpdate(
    bucket,
    {
      orderState: 'ordering',
      frozenAt: bucket.frozenAt ?? occurredAt,
      frozenBy: bucket.frozenBy ?? actorId,
    },
    occurredAt,
  );
};

export const completeOrdering = (
  bucket: Bucket,
  occurredAt = nowIso(),
): Bucket => {
  if (bucket.orderState === 'ordered') return bucket;
  if (bucket.orderState !== 'ordering') {
    throw new Error('Only a bucket being ordered can be completed.');
  }

  return withLifecycleUpdate(
    bucket,
    {
      orderState: 'ordered',
      frozenAt: bucket.frozenAt,
      frozenBy: bucket.frozenBy,
    },
    occurredAt,
  );
};

export const failOrdering = (
  bucket: Bucket,
  occurredAt = nowIso(),
): Bucket => {
  if (bucket.orderState !== 'ordering') {
    throw new Error('Only a bucket being ordered can return to frozen state.');
  }

  return withLifecycleUpdate(
    bucket,
    {
      orderState: 'frozen',
      frozenAt: bucket.frozenAt ?? occurredAt,
      frozenBy: bucket.frozenBy,
    },
    occurredAt,
  );
};
