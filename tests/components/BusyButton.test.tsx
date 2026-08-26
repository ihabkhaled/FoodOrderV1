import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { BusyButton } from '@/shared/ui';

describe('BusyButton', () => {
  it('is pressable and announces nothing while idle', () => {
    render(
      <BusyButton busy={false} busyLabel="Saving">
        Save
      </BusyButton>,
    );
    const button = screen.getByRole('button', { name: 'Save' });
    expect(button).toBeEnabled();
    expect(button).toHaveAttribute('aria-busy', 'false');
  });

  it('blocks a second press while the first is in flight', async () => {
    // The point of the component: a duplicate press produces a duplicate
    // write, and a slow request makes an unchanged button look broken enough
    // to invite one.
    const onClick = vi.fn();
    render(
      <BusyButton busy onClick={onClick} busyLabel="Saving">
        Save
      </BusyButton>,
    );
    const button = screen.getByRole('button', { name: /Saving/ });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    await userEvent.click(button).catch(() => {});
    expect(onClick).not.toHaveBeenCalled();
  });

  it('swaps the label so the wait is visible, not just felt', () => {
    render(
      <BusyButton busy busyLabel="Saving">
        Save
      </BusyButton>,
    );
    expect(screen.getByRole('button')).toHaveTextContent('Saving');
  });

  it('falls back to the idle label when no busy label is given', () => {
    render(<BusyButton busy>Save</BusyButton>);
    expect(screen.getByRole('button')).toHaveTextContent('Save');
  });

  it('stays disabled when the caller disables it for its own reasons', () => {
    render(
      <BusyButton busy={false} disabled>
        Save
      </BusyButton>,
    );
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
