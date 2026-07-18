import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { BrowserRouter } from '@/packages/router';
import { SessionInvitePreview } from '../../src/modules/session-invites/components/session-invite-preview/session-invite-preview.component';
import { translateSessionInvite } from '../../src/modules/session-invites/i18n/translate-session-invite.helper';

const PREVIEW = {
  sessionId: 'session-1',
  title: 'Office breakfast',
  organizerDisplayName: 'Ihab',
  deadlineAt: '2099-07-18T10:00:00.000Z',
  currency: 'EGP' as const,
  activeItemCount: 4,
  participantCount: 3,
  isCollecting: true,
};

describe('SessionInvitePreview', () => {
  it('renders safe invitation metadata and submits a guest name', async () => {
    const user = userEvent.setup();
    const onGuestNameChange = vi.fn();
    const onJoin = vi.fn();

    render(
      <BrowserRouter>
        <SessionInvitePreview
          locale="en"
          preview={PREVIEW}
          guestName="Guest One"
          joining={false}
          loginPath="/auth/login?returnTo=%2Finvite%2Fcode"
          registerPath="/auth/register?returnTo=%2Finvite%2Fcode"
          translate={translateSessionInvite}
          onGuestNameChange={onGuestNameChange}
          onJoin={onJoin}
        />
      </BrowserRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Office breakfast' })).toBeVisible();
    expect(screen.getByText('Organized by Ihab')).toBeVisible();
    expect(screen.getByText('4 items available')).toBeVisible();
    expect(screen.queryByText(/guestSecret|session-1/u)).not.toBeInTheDocument();

    await user.clear(screen.getByLabelText('Your name'));
    await user.type(screen.getByLabelText('Your name'), 'Guest Two');
    await user.click(screen.getByRole('button', { name: 'Join order' }));

    expect(onGuestNameChange).toHaveBeenCalled();
    expect(onJoin).toHaveBeenCalledOnce();
  });

  it('blocks joining when the order is closed', () => {
    render(
      <BrowserRouter>
        <SessionInvitePreview
          locale="en"
          preview={{ ...PREVIEW, isCollecting: false }}
          guestName="Guest One"
          joining={false}
          loginPath="/auth/login"
          registerPath="/auth/register"
          translate={translateSessionInvite}
          onGuestNameChange={() => {}}
          onJoin={() => {}}
        />
      </BrowserRouter>,
    );

    expect(screen.getByRole('button', { name: 'Join order' })).toBeDisabled();
    expect(screen.getByText('This order is closed')).toBeVisible();
  });
});
