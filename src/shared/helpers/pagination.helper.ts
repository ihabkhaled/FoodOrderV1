export interface PageRequest {
  readonly limit?: number;
  readonly cursor?: string;
}

export interface PageResult<Item> {
  readonly items: Item[];
  readonly nextCursor: string | null;
  readonly hasMore: boolean;
}

export interface SortCursor {
  readonly sortValue: string;
  readonly id: string;
}

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 50;

export const normalizePageLimit = (limit: number | undefined): number => {
  if (limit === undefined) return DEFAULT_PAGE_SIZE;
  if (!Number.isSafeInteger(limit) || limit < 1) {
    throw new TypeError('Page limit must be a positive integer.');
  }
  return Math.min(limit, MAX_PAGE_SIZE);
};

export const encodeSortCursor = (cursor: SortCursor): string =>
  encodeURIComponent(JSON.stringify(cursor));

export const decodeSortCursor = (cursor: string | undefined): SortCursor | null => {
  if (!cursor) return null;
  try {
    const value: unknown = JSON.parse(decodeURIComponent(cursor));
    if (
      typeof value !== 'object' ||
      value === null ||
      !('sortValue' in value) ||
      !('id' in value) ||
      typeof value.sortValue !== 'string' ||
      typeof value.id !== 'string' ||
      !value.sortValue ||
      !value.id
    ) {
      throw new TypeError('Invalid cursor shape.');
    }
    return { sortValue: value.sortValue, id: value.id };
  } catch (error) {
    throw new TypeError('The pagination cursor is invalid.', { cause: error });
  }
};

const compareDescending = <Item extends { id: string }>(
  left: Item,
  right: Item,
  sortValue: (item: Item) => string,
): number => {
  const sortComparison = sortValue(right).localeCompare(sortValue(left));
  return sortComparison === 0 ? right.id.localeCompare(left.id) : sortComparison;
};

export const paginateDescending = <Item extends { id: string }>(
  values: readonly Item[],
  request: PageRequest,
  sortValue: (item: Item) => string,
): PageResult<Item> => {
  const limit = normalizePageLimit(request.limit);
  const cursor = decodeSortCursor(request.cursor);
  const sorted = [...values].toSorted((left, right) =>
    compareDescending(left, right, sortValue),
  );
  const startIndex = cursor
    ? sorted.findIndex(
        (item) => item.id === cursor.id && sortValue(item) === cursor.sortValue,
      ) + 1
    : 0;
  if (cursor && startIndex === 0) {
    throw new TypeError('The pagination cursor does not match this result set.');
  }
  const window = sorted.slice(startIndex, startIndex + limit + 1);
  const hasMore = window.length > limit;
  const items = window.slice(0, limit);
  const lastItem = items.at(-1);
  return {
    items,
    hasMore,
    nextCursor:
      hasMore && lastItem
        ? encodeSortCursor({ sortValue: sortValue(lastItem), id: lastItem.id })
        : null,
  };
};
