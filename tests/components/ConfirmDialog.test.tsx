import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ConfirmDialog } from '@/components/ConfirmDialog';

describe('ConfirmDialog', () => {
  it('opens with accessible copy and confirms through the primary action', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(
      <ConfirmDialog
        open
        title="Freeze bucket"
        message="No one can change quantities after freezing."
        confirmLabel="Freeze"
        cancelLabel="Cancel"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByRole('dialog')).toHaveAttribute('open');
    expect(screen.getByRole('heading', { name: 'Freeze bucket' })).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Freeze' }));

    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('renders a destructive action and invokes cancellation', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();

    render(
      <ConfirmDialog
        open
        danger
        title="Delete order"
        message="This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Keep order"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    );

    expect(screen.getByRole('button', { name: 'Delete' })).toHaveClass('danger');

    await user.click(screen.getByRole('button', { name: 'Keep order' }));

    expect(onCancel).toHaveBeenCalledOnce();
  });
});
