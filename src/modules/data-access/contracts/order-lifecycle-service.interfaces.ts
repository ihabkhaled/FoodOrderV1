import type { Order, OrderStatus, SessionUser } from '../types/domain.types';

export interface OrderLifecycleService {
  repeatGroupOrder(user: SessionUser, orderId: string): Promise<Order>;
  transitionGroupOrder(
    user: SessionUser,
    orderId: string,
    status: OrderStatus,
  ): Promise<Order>;
}
