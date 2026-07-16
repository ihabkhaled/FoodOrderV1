import {
  decodeSortCursor,
  encodeSortCursor,
  normalizePageLimit,
  type PageRequest,
  type PageResult,
  paginateDescending,
} from '@/lib/pagination';
import {
  collection,
  doc,
  documentId,
  type FieldPath,
  type Firestore,
  getDoc,
  getDocs,
  limit as firestoreLimit,
  orderBy,
  query,
  type QueryConstraint,
  startAfter,
  where,
} from '@/packages/firebase';
import type { DataService, SharingService } from '@/services/contracts';
import { getFirebaseRuntime } from '@/services/firebaseServices';
import type {
  Bucket,
  BucketMembershipRef,
  Order,
  SessionUser,
} from '@/types/domain';

export interface PaginationService {
  listOwnedBuckets(
    user: SessionUser,
    request: PageRequest,
  ): Promise<PageResult<Bucket>>;
  listSharedBuckets(
    user: SessionUser,
    request: PageRequest,
  ): Promise<PageResult<Bucket>>;
  listOrders(
    user: SessionUser,
    request: PageRequest,
  ): Promise<PageResult<Order>>;
}

const nextCursor = <Item extends { id: string }>(
  items: readonly Item[],
  hasMore: boolean,
  sortValue: (item: Item) => string,
): string | null => {
  const last = items.at(-1);
  return hasMore && last
    ? encodeSortCursor({ sortValue: sortValue(last), id: last.id })
    : null;
};

const constraintsFor = (
  request: PageRequest,
  firstOrderField: string,
  identityField: string | FieldPath,
): QueryConstraint[] => {
  const size = normalizePageLimit(request.limit);
  const cursor = decodeSortCursor(request.cursor);
  return [
    orderBy(firstOrderField, 'desc'),
    orderBy(identityField, 'desc'),
    ...(cursor ? [startAfter(cursor.sortValue, cursor.id)] : []),
    firestoreLimit(size + 1),
  ];
};

export class LocalPaginationService implements PaginationService {
  constructor(
    private readonly data: DataService,
    private readonly sharing: SharingService,
  ) {}

  async listOwnedBuckets(
    user: SessionUser,
    request: PageRequest,
  ): Promise<PageResult<Bucket>> {
    return paginateDescending(
      await this.data.listBuckets(user),
      request,
      (bucket) => bucket.updatedAt,
    );
  }

  async listSharedBuckets(
    user: SessionUser,
    request: PageRequest,
  ): Promise<PageResult<Bucket>> {
    return paginateDescending(
      await this.sharing.listSharedWithMe(user),
      request,
      (bucket) => bucket.updatedAt,
    );
  }

  async listOrders(
    user: SessionUser,
    request: PageRequest,
  ): Promise<PageResult<Order>> {
    return paginateDescending(
      await this.data.listOrders(user.id),
      request,
      (order) => order.createdAt,
    );
  }
}

export class FirestorePaginationService implements PaginationService {
  private get firestore(): Firestore {
    return getFirebaseRuntime().firestore;
  }

  async listOwnedBuckets(
    user: SessionUser,
    request: PageRequest,
  ): Promise<PageResult<Bucket>> {
    const snapshot = await getDocs(
      query(
        collection(this.firestore, 'buckets'),
        where('ownerId', '==', user.id),
      ),
    );
    return paginateDescending(
      snapshot.docs.map((entry) => entry.data() as Bucket),
      request,
      (bucket) => bucket.updatedAt,
    );
  }

  async listOrders(
    user: SessionUser,
    request: PageRequest,
  ): Promise<PageResult<Order>> {
    const size = normalizePageLimit(request.limit);
    const snapshot = await getDocs(
      query(
        collection(this.firestore, 'users', user.id, 'orders'),
        ...constraintsFor(request, 'createdAt', documentId()),
      ),
    );
    const values = snapshot.docs.map((entry) => entry.data() as Order);
    const hasMore = values.length > size;
    const items = values.slice(0, size);
    return {
      items,
      hasMore,
      nextCursor: nextCursor(items, hasMore, (order) => order.createdAt),
    };
  }

  async listSharedBuckets(
    user: SessionUser,
    request: PageRequest,
  ): Promise<PageResult<Bucket>> {
    const size = normalizePageLimit(request.limit);
    const cursor = decodeSortCursor(request.cursor);
    const snapshot = await getDocs(
      query(
        collection(this.firestore, 'users', user.id, 'bucketMemberships'),
        orderBy('joinedAt', 'desc'),
        orderBy('bucketId', 'desc'),
        ...(cursor ? [startAfter(cursor.sortValue, cursor.id)] : []),
        firestoreLimit(size + 1),
      ),
    );
    const memberships = snapshot.docs.map(
      (entry) => entry.data() as BucketMembershipRef,
    );
    const hasMore = memberships.length > size;
    const visibleMemberships = memberships
      .slice(0, size)
      .filter((membership) => membership.role !== 'owner');
    const buckets = await Promise.all(
      visibleMemberships.map(async (membership) => {
        const snapshot_ = await getDoc(
          doc(this.firestore, 'buckets', membership.bucketId),
        );
        return snapshot_.exists() ? (snapshot_.data() as Bucket) : null;
      }),
    );
    const last = visibleMemberships.at(-1);
    return {
      items: buckets.filter((bucket): bucket is Bucket => bucket !== null),
      hasMore,
      nextCursor:
        hasMore && last
          ? encodeSortCursor({ sortValue: last.joinedAt, id: last.bucketId })
          : null,
    };
  }
}
