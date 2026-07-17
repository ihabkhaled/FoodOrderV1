import type { AppRouteDescriptor } from '@/shared/types';

import { CreateOrderContainer } from '../containers/create-order.container';
import { OrderDetailsContainer } from '../containers/order-details.container';
import { OrdersContainer } from '../containers/orders.container';

/**
 * Route descriptors the app shell mounts under the protected app layout.
 * Paths are relative segments; absolute targets live in
 * `orders-route-paths.constants.ts`.
 */
export const ordersRoutes: AppRouteDescriptor[] = [
  { path: 'orders', element: <OrdersContainer /> },
  { path: 'orders/:orderId', element: <OrderDetailsContainer /> },
  { path: 'buckets/:bucketId/order', element: <CreateOrderContainer /> },
];
