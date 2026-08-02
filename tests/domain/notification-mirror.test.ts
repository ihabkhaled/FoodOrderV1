import { describe, expect, it } from 'vitest';

import type { AppNotification } from '@/modules/data-access';

import { selectNewUnreadNotifications } from '../../src/app/shell/helpers/notification-mirror.helper';

const notification = (
  id: string,
  readAt: string | null = null,
): AppNotification => ({
  id,
  kind: 'session_opened',
  title: 'New order round',
  message: 'Owner opened Friday Lunch for orders.',
  route: '/sessions/session-1',
  entityType: 'session',
  entityId: 'session-1',
  actorId: 'owner-1',
  actorName: 'Owner',
  createdAt: '2026-07-29T12:00:00.000Z',
  readAt,
});

describe('selectNewUnreadNotifications', () => {
  it('treats the first payload as history so the inbox is never replayed', () => {
    const result = selectNewUnreadNotifications(null, [
      notification('a'),
      notification('b'),
    ]);

    expect(result).toEqual([]);
  });

  it('returns only notifications that were not present before', () => {
    const result = selectNewUnreadNotifications(
      [notification('a')],
      [notification('b'), notification('a')],
    );

    expect(result.map((item) => item.id)).toEqual(['b']);
  });

  it('ignores notifications that arrive already read', () => {
    const result = selectNewUnreadNotifications(
      [notification('a')],
      [notification('b', '2026-07-29T12:05:00.000Z'), notification('a')],
    );

    expect(result).toEqual([]);
  });

  it('never re-emits a notification once it has been seen', () => {
    const first = [notification('a')];
    const second = [notification('b'), notification('a')];

    expect(selectNewUnreadNotifications(first, second)).toHaveLength(1);
    expect(selectNewUnreadNotifications(second, second)).toHaveLength(0);
  });

  it('returns every genuinely new unread notification', () => {
    const result = selectNewUnreadNotifications(
      [notification('a')],
      [notification('c'), notification('b'), notification('a')],
    );

    expect(result.map((item) => item.id)).toEqual(['c', 'b']);
  });
});
