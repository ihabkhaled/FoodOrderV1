import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Skeleton, SkeletonSection } from '@/shared/ui';

describe('Skeleton', () => {
  it('stays decorative so it never competes with real content', () => {
    render(<Skeleton variant="text" count={3} />);

    // Placeholder blocks are aria-hidden: nothing accessible is exposed.
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByRole('presentation')).toBeNull();
  });
});

describe('SkeletonSection', () => {
  it('announces exactly one busy region carrying its label', () => {
    render(<SkeletonSection label="Loading orders" variant="row" count={4} />);

    const region = screen.getByRole('status', { name: 'Loading orders' });

    expect(region).toHaveAttribute('aria-busy', 'true');
    expect(region).toHaveAttribute('aria-live', 'polite');
  });

  it('keeps sections independent so several can load at once', () => {
    render(
      <>
        <SkeletonSection label="Loading stats" variant="stat" count={6} />
        <SkeletonSection label="Loading recent orders" variant="row" count={3} />
      </>,
    );

    expect(screen.getAllByRole('status')).toHaveLength(2);
    expect(
      screen.getByRole('status', { name: 'Loading stats' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('status', { name: 'Loading recent orders' }),
    ).toBeInTheDocument();
  });
});
