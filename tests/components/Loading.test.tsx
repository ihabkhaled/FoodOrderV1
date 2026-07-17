import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Loading } from '@/shared/ui';

describe('Loading', () => {
  it('announces the active loading state with the supplied label', () => {
    render(<Loading label="Loading orders" />);

    expect(screen.getByRole('status', { name: 'Loading orders' })).toHaveAttribute(
      'aria-busy',
      'true',
    );
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByText('Loading orders')).toBeVisible();
  });

  it('renders the supplied loading label only once as readable copy', () => {
    render(<Loading label="Loading groups" />);

    expect(screen.getByRole('status', { name: 'Loading groups' })).toBeVisible();
    expect(screen.getAllByText('Loading groups')).toHaveLength(1);
  });
});
