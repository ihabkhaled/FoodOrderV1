import { useState } from 'react';

import type { OrderSessionStatus } from '@/modules/data-access';

import type { SessionLifecycleAction } from './use-session-command-center.hook';

export interface SessionLifecycleConfirmationViewModel {
  pendingAction: SessionLifecycleAction | null;
  request: (action: SessionLifecycleAction) => void;
  cancel: () => void;
  confirm: (
    transition: (status: OrderSessionStatus) => Promise<void>,
  ) => Promise<void>;
}

export function useSessionLifecycleConfirmation(): SessionLifecycleConfirmationViewModel {
  const [pendingAction, setPendingAction] =
    useState<SessionLifecycleAction | null>(null);

  const confirm = async (
    transition: (status: OrderSessionStatus) => Promise<void>,
  ) => {
    if (!pendingAction) return;
    const status = pendingAction.status;
    setPendingAction(null);
    await transition(status);
  };

  return {
    pendingAction,
    request: setPendingAction,
    cancel: () => {
      setPendingAction(null);
    },
    confirm,
  };
}
