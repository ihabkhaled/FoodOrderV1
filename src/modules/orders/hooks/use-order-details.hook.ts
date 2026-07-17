import { useEffect, useState } from 'react';

import type { Locale, Order, OrderStatus } from '@/modules/data-access';
import {
  buildRepeatedOrderDraft,
  dataService,
  orderLifecycleService,
} from '@/modules/data-access';
import { useApp } from '@/modules/session';
import { useNavigate, useParams } from '@/packages/router';
import type { MessageKey } from '@/shared/i18n';

import { buildOrderDetailsRoute } from '../routes/orders-route-paths.constants';

export interface OrderDetailsViewModel {
  t: (key: MessageKey) => string;
  locale: Locale;
  order: Order | null;
  loading: boolean;
  error: string;
  transition: (status: OrderStatus) => Promise<void>;
  repeat: () => Promise<void>;
}

export function useOrderDetails(): OrderDetailsViewModel {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { user, locale, t, showToast } = useApp();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user || !orderId) return;
    void dataService
      .getOrder(user.id, orderId)
      .then((value) => {
        if (!value) throw new Error(t('tryAgain'));
        setOrder(value);
      })
      .catch((error_: unknown) => {
        setError(error_ instanceof Error ? error_.message : t('tryAgain'));
      })
      .finally(() => {
        setLoading(false);
      });
  }, [orderId, user, t]);

  const transition = async (status: OrderStatus): Promise<void> => {
    if (!user || !order) return;
    try {
      const saved = order.participants
        ? await orderLifecycleService.transitionGroupOrder(
            user,
            order.id,
            status,
          )
        : await dataService.updateOrderStatus(user.id, order.id, status);
      setOrder(saved);
      showToast(t('orderUpdated'), 'success');
    } catch (error_) {
      showToast(
        error_ instanceof Error ? error_.message : t('tryAgain'),
        'error',
      );
    }
  };

  const repeat = async (): Promise<void> => {
    if (!user || !order) return;
    try {
      const created = order.participants
        ? await orderLifecycleService.repeatGroupOrder(user, order.id)
        : await dataService.createOrder(user.id, buildRepeatedOrderDraft(order));
      showToast(t('draftFromOrder'), 'success');
      await navigate(buildOrderDetailsRoute(created.id));
    } catch (error_) {
      showToast(
        error_ instanceof Error ? error_.message : t('tryAgain'),
        'error',
      );
    }
  };

  return { t, locale, order, loading, error, transition, repeat };
}
