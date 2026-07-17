import { useCallback, useEffect, useRef, useState } from 'react';

import type { PageRequest, PageResult } from '@/shared/helpers';

interface Identified {
  readonly id: string;
}

interface CursorPageState<Item> {
  readonly items: Item[];
  readonly loading: boolean;
  readonly loadingMore: boolean;
  readonly refreshing: boolean;
  readonly hasMore: boolean;
  readonly error: unknown;
  readonly refresh: () => Promise<void>;
  readonly loadMore: () => Promise<void>;
}

const mergeById = <Item extends Identified>(
  current: readonly Item[],
  incoming: readonly Item[],
): Item[] => {
  const values = new Map(current.map((item) => [item.id, item]));
  for (const item of incoming) values.set(item.id, item);
  return [...values.values()];
};

export const useCursorPage = <Item extends Identified>(
  load: (request: PageRequest) => Promise<PageResult<Item>>,
  dependencyKey: string,
  pageSize = 20,
): CursorPageState<Item> => {
  const [items, setItems] = useState<Item[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const requestSequence = useRef(0);
  const activeRequest = useRef(false);

  const requestPage = useCallback(
    async (nextCursor: string | null, replace: boolean): Promise<void> => {
      if (activeRequest.current) return;
      activeRequest.current = true;
      const sequence = ++requestSequence.current;
      try {
        setError(null);
        const result = await load({
          limit: pageSize,
          ...(nextCursor ? { cursor: nextCursor } : {}),
        });
        if (sequence !== requestSequence.current) return;
        setItems((current) =>
          replace ? result.items : mergeById(current, result.items),
        );
        setCursor(result.nextCursor);
        setHasMore(result.hasMore);
      } catch (error_) {
        if (sequence === requestSequence.current) setError(error_);
      } finally {
        if (sequence === requestSequence.current) {
          activeRequest.current = false;
          setLoading(false);
          setLoadingMore(false);
          setRefreshing(false);
        }
      }
    },
    [load, pageSize],
  );

  const refresh = useCallback(async (): Promise<void> => {
    requestSequence.current += 1;
    activeRequest.current = false;
    setRefreshing(true);
    setHasMore(true);
    setCursor(null);
    await requestPage(null, true);
  }, [requestPage]);

  const loadMore = useCallback(async (): Promise<void> => {
    if (!hasMore || !cursor || activeRequest.current) return;
    setLoadingMore(true);
    await requestPage(cursor, false);
  }, [cursor, hasMore, requestPage]);

  useEffect(() => {
    requestSequence.current += 1;
    activeRequest.current = false;
    setItems([]);
    setCursor(null);
    setHasMore(true);
    setLoading(true);
    setError(null);
    void requestPage(null, true);
  }, [dependencyKey, requestPage]);

  return {
    items,
    loading,
    loadingMore,
    refreshing,
    hasMore,
    error,
    refresh,
    loadMore,
  };
};
