import { useCallback, useEffect, useRef, useState } from 'react';

export interface UndoableDeleteOptions {
  /** How long the delete stays cancellable. Match the toast's own duration. */
  windowMs?: number;
}

export interface UndoableDeleteController {
  /** Ids whose delete is scheduled but not yet committed - filter them out of any rendered list so the item disappears the moment the action is taken, not once the window elapses. */
  pendingIds: ReadonlySet<string>;
  /** Starts the countdown. `commit` fires once `windowMs` elapses unless `cancel(id)` is called first. */
  schedule: (
    id: string,
    commit: () => Promise<void> | void,
    options?: UndoableDeleteOptions,
  ) => void;
  /** Cancels a pending delete. Returns false if none was pending for that id. */
  cancel: (id: string) => boolean;
}

const DEFAULT_WINDOW_MS = 6000;

/**
 * A destructive action a person can still take back: the item disappears
 * from the list immediately, but the actual delete does not fire until a
 * grace window elapses, so an "Undo" toast action can cancel it outright
 * instead of having to reverse an already-committed write.
 */
export function useUndoableDelete(): UndoableDeleteController {
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const [pendingIds, setPendingIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  useEffect(
    () => () => {
      for (const timer of timers.current.values()) {
        clearTimeout(timer);
      }
    },
    [],
  );

  const cancel = useCallback((id: string): boolean => {
    const timer = timers.current.get(id);
    if (!timer) return false;
    clearTimeout(timer);
    timers.current.delete(id);
    setPendingIds((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
    return true;
  }, []);

  const schedule = useCallback(
    (
      id: string,
      commit: () => Promise<void> | void,
      options?: UndoableDeleteOptions,
    ): void => {
      setPendingIds((current) => new Set(current).add(id));
      const timer = setTimeout(() => {
        timers.current.delete(id);
        setPendingIds((current) => {
          const next = new Set(current);
          next.delete(id);
          return next;
        });
        void commit();
      }, options?.windowMs ?? DEFAULT_WINDOW_MS);
      timers.current.set(id, timer);
    },
    [],
  );

  return { pendingIds, schedule, cancel };
}
