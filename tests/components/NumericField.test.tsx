import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { NumericField } from '@/shared/ui';

function Harness({
  initial = 0,
  max,
  onValueChange = () => {},
}: {
  initial?: number;
  max?: number;
  onValueChange?: (next: number) => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <NumericField
      id="amount"
      label="Amount"
      value={value}
      max={max}
      onValueChange={(next) => {
        setValue(next);
        onValueChange(next);
      }}
    />
  );
}

describe('NumericField', () => {
  it('renders a zero value as an empty input with a zero placeholder', () => {
    render(<Harness initial={0} />);

    const input = screen.getByLabelText('Amount');
    expect(input).toHaveValue(null);
    expect(input).toHaveAttribute('placeholder', '0');
  });

  it('shows a non-zero value directly', () => {
    render(<Harness initial={7} />);

    expect(screen.getByLabelText('Amount')).toHaveValue(7);
  });

  it('types over an empty zero field without a leading zero', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Harness initial={0} onValueChange={onValueChange} />);

    const input = screen.getByLabelText('Amount');
    await user.type(input, '14');

    expect(input).toHaveValue(14);
    expect(onValueChange).toHaveBeenLastCalledWith(14);
  });

  it('clamps entries below the minimum to zero', () => {
    const onValueChange = vi.fn();
    render(<Harness initial={5} onValueChange={onValueChange} />);

    fireEvent.change(screen.getByLabelText('Amount'), {
      target: { value: '-3' },
    });

    expect(onValueChange).toHaveBeenLastCalledWith(0);
    expect(screen.getByLabelText('Amount')).toHaveValue(0);
  });

  it('clamps entries above the maximum', () => {
    const onValueChange = vi.fn();
    render(<Harness initial={5} max={100} onValueChange={onValueChange} />);

    fireEvent.change(screen.getByLabelText('Amount'), {
      target: { value: '250' },
    });

    expect(onValueChange).toHaveBeenLastCalledWith(100);
    expect(screen.getByLabelText('Amount')).toHaveValue(100);
  });

  it('empties the field and reports zero when cleared', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Harness initial={9} onValueChange={onValueChange} />);

    const input = screen.getByLabelText('Amount');
    await user.clear(input);

    expect(input).toHaveValue(null);
    expect(onValueChange).toHaveBeenLastCalledWith(0);
  });

  it('normalizes redundant leading zeros on blur', () => {
    render(<Harness initial={0} />);

    const input = screen.getByLabelText('Amount');
    fireEvent.change(input, { target: { value: '007' } });
    fireEvent.blur(input);

    expect(input).toHaveValue(7);
  });
});
