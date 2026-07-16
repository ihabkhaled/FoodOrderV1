import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { NotificationCenter } from '@/components/NotificationCenter';
import type { AppNotification } from '@/types/notifications';

const invitation: AppNotification = {
  id: 'bucket-invitation-1',
  kind: 'bucket_invitation',
  title: 'New bucket invitation',
  message: 'Owner invited you to Lunch.',
  route: '/social',
  entityType: 'bucket',
  entityId: 'bucket-1',
  actorId: 'owner-1',
  actorName: 'Owner',
  createdAt: '2026-07-16T10:00:00.000Z',
  readAt: null,
};

function LocationStateProbe() {
  const location = useLocation();
  const state = location.state as { notificationOpenSequence?: unknown } | null;
  return (
    <output aria-label="notification destination">
      {location.pathname}:{typeof state?.notificationOpenSequence}
    </output>
  );
}

describe('NotificationCenter', () => {
  it('marks an invitation read and refreshes a same-route destination', async () => {
    const user = userEvent.setup();
    const onMarkRead = vi.fn().mockResolvedValue(undefined);
    render(
      <MemoryRouter initialEntries={['/social']}>
        <NotificationCenter
          notifications={[invitation]}
          locale="en"
          placement="topbar"
          onMarkRead={onMarkRead}
        />
        <LocationStateProbe />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: 'Notifications' }));
    await user.click(
      screen.getByRole('button', { name: /new bucket invitation/i }),
    );

    expect(onMarkRead).toHaveBeenCalledWith([invitation.id]);
    expect(screen.getByLabelText('notification destination')).toHaveTextContent(
      '/social:number',
    );
  });
});
