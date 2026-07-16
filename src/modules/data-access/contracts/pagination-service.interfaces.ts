import type { PageRequest, PageResult } from '@/lib/pagination';

import type { Bucket, Order, SessionUser } from '../types/domain.types';

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
