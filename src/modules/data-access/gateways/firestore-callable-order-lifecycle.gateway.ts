import { getFunctions, httpsCallable } from '@/packages/firebase';

import type { OrderLifecycleService } from '../contracts/order-lifecycle-service.interfaces';
import type { Order, OrderStatus, SessionUser } from '../types/domain.types';
import { getFirebaseRuntime } from './firebase-runtime.gateway';

const REGION = 'europe-west1';

const callable = <Request, Response>(name: string) =>
  httpsCallable<Request, Response>(
    getFunctions(getFirebaseRuntime().app, REGION),
    name,
  );

export class FirestoreCallableOrderLifecycleService
  implements OrderLifecycleService
{
  async repeatGroupOrder(
    _user: SessionUser,
    orderId: string,
  ): Promise<Order> {
    const result = await callable<{ orderId: string }, Order>(
      'repeatGroupOrderV133',
    )({ orderId });
    return result.data;
  }

  async transitionGroupOrder(
    _user: SessionUser,
    orderId: string,
    status: OrderStatus,
  ): Promise<Order> {
    const result = await callable<
      { orderId: string; status: OrderStatus },
      Order
    >('transitionGroupOrderV133')({ orderId, status });
    return result.data;
  }
}
