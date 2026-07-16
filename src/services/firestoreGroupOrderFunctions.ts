import { getFunctions, httpsCallable } from '@/packages/firebase';
import { getFirebaseRuntime } from '@/services/firebaseServices';
import { FirestoreGroupOrderService } from '@/services/groupOrderServices';
import type {
  BucketItem,
  Order,
  SessionUser,
} from '@/types/domain';

const REGION = 'europe-west1';

interface CustomItemInput {
  name: string;
  description: string;
  category: string;
  unitPrice: number;
}

const callable = <Request, Response>(name: string) =>
  httpsCallable<Request, Response>(
    getFunctions(getFirebaseRuntime().app, REGION),
    name,
  );

export class FirestoreCallableGroupOrderService extends FirestoreGroupOrderService {
  override async addCustomItem(
    _user: SessionUser,
    bucketId: string,
    input: CustomItemInput,
  ): Promise<BucketItem> {
    const result = await callable<
      CustomItemInput & { bucketId: string },
      BucketItem
    >('addCustomBucketItemV132')({ bucketId, ...input });

    return result.data;
  }

  override async approveCustomItem(
    _user: SessionUser,
    bucketId: string,
    itemId: string,
    unitPrice: number,
  ): Promise<BucketItem> {
    const result = await callable<
      { bucketId: string; itemId: string; unitPrice: number },
      BucketItem
    >('approveCustomBucketItemV132')({ bucketId, itemId, unitPrice });

    return result.data;
  }

  override async placeGroupOrder(
    _user: SessionUser,
    bucketId: string,
    notes: string,
  ): Promise<Order> {
    const result = await callable<
      { bucketId: string; notes: string },
      Order
    >('finalizeGroupOrderV132')({ bucketId, notes });

    return result.data;
  }
}
