import { nowIso } from '@/lib/date';

import type { Bucket, BucketOrderState } from '../types/domain.types';

interface LifecyclePatch {
  orderState: BucketOrderState;
  frozenAt: string | null;
  frozenBy: string | null;
}

const currentState = (bucket: Bucket): BucketOrderState => bucket.orderState ?? 'open';

const withLifecycleUpdate = (
  bucket: Bucket,
  patch: LifecyclePatch,
  occurredAt: string,
): Bucket => ({
  ...bucket,
  ...patch,
  revision: bucket.revision + 1,
  updatedAt: occurredAt,
});

export const assertBucketMutable = (bucket: Bucket): void => {
  if (currentState(bucket) !== 'open') {
    throw new Error('This bucket is frozen and cannot be changed.');
  }
};

export const freezeBucket = (
  bucket: Bucket,
  actorId: string,
  occurredAt = nowIso(),
): Bucket => {
  const state = currentState(bucket);
  if (state === 'frozen') return bucket;
  if (state !== 'open') {
    throw new Error(`A bucket in ${state} state cannot be frozen.`);
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
  if (currentState(bucket) !== 'frozen') {
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
  const state = currentState(bucket);
  if (!actorId.trim()) throw new Error('An ordering actor is required.');
  if (state === 'ordering') return bucket;
  if (state !== 'open' && state !== 'frozen') {
    throw new Error(`A bucket in ${state} state cannot be ordered.`);
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
  const state = currentState(bucket);
  if (state === 'ordered') return bucket;
  if (state !== 'ordering') {
    throw new Error('Only a bucket being ordered can be completed.');
  }

  return withLifecycleUpdate(
    bucket,
    {
      orderState: 'ordered',
      frozenAt: bucket.frozenAt ?? occurredAt,
      frozenBy: bucket.frozenBy ?? bucket.ownerId,
    },
    occurredAt,
  );
};

export const failOrdering = (
  bucket: Bucket,
  occurredAt = nowIso(),
): Bucket => {
  if (currentState(bucket) !== 'ordering') {
    throw new Error('Only a bucket being ordered can return to frozen state.');
  }

  return withLifecycleUpdate(
    bucket,
    {
      orderState: 'frozen',
      frozenAt: bucket.frozenAt ?? occurredAt,
      frozenBy: bucket.frozenBy ?? bucket.ownerId,
    },
    occurredAt,
  );
};
