import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { DangerReauthDialog } from '@/shared/ui';

const baseProps = {
  title: 'Confirm it is you',
  warning: 'This permanently deletes your account.',
  emailLabel: 'Email',
  passwordLabel: 'Password',
  confirmLabel: 'Delete account permanently',
  cancelLabel: 'Cancel',
  showPasswordLabel: 'Show password',
  hidePasswordLabel: 'Hide password',
  errorMessage: null,
  busy: false,
};

describe('DangerReauthDialog', () => {
  it('keeps the destructive action disabled until both credentials are entered', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(
      <DangerReauthDialog
        {...baseProps}
        open
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );

    const confirm = screen.getByRole('button', {
      name: 'Delete account permanently',
    });
    expect(confirm).toBeDisabled();

    await user.type(screen.getByLabelText('Email'), 'owner@example.com');
    expect(confirm).toBeDisabled();

    await user.type(screen.getByLabelText('Password'), 'Password1');
    expect(confirm).toBeEnabled();

    await user.click(confirm);
    expect(onConfirm).toHaveBeenCalledWith('owner@example.com', 'Password1');
  });

  it('shows a credential error inline and blocks input while working', () => {
    render(
      <DangerReauthDialog
        {...baseProps}
        open
        busy
        errorMessage="Invalid email or password."
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByText('Invalid email or password.')).toBeVisible();
    expect(screen.getByLabelText('Email')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });

  it('cancels without confirming', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();

    render(
      <DangerReauthDialog
        {...baseProps}
        open
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
