import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { PasswordField } from '@/shared/ui';

function Harness() {
  const [value, setValue] = useState('');
  return (
    <PasswordField
      id="test-password"
      label="Password"
      value={value}
      onChange={setValue}
      autoComplete="current-password"
      showLabel="Show password"
      hideLabel="Hide password"
    />
  );
}

describe('PasswordField', () => {
  it('renders a labelled password input and accepts typing', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const input = screen.getByLabelText('Password');
    expect(input).toHaveAttribute('type', 'password');
    expect(input).toHaveAttribute('autocomplete', 'current-password');

    await user.type(input, 'Password1');
    expect(input).toHaveValue('Password1');
  });

  it('toggles visibility and swaps the toggle accessible name', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'Show password' }));
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'text');

    await user.click(screen.getByRole('button', { name: 'Hide password' }));
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: 'Show password' })).toBeVisible();
  });
});
