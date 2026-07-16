import {
  type PageRequest,
  type PageResult,
  paginateDescending,
} from '@/lib/pagination';

import type { DataService } from '../contracts/data-service.interfaces';
import type { PaginationService } from '../contracts/pagination-service.interfaces';
import type { SharingService } from '../contracts/sharing-service.interfaces';
import type { Bucket, Order, SessionUser } from '../types/domain.types';

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
