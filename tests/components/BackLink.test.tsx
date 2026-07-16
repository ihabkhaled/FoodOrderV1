import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { BackLink } from '@/shared/ui';

function CurrentPath() {
  const location = useLocation();
  return <output aria-label="current path">{location.pathname}</output>;
}

const renderBackLink = (from: unknown): void => {
  render(
    <MemoryRouter
      initialEntries={[
        {
          pathname: '/buckets/bucket-1/share',
          state: { from },
        },
      ]}
    >
      <BackLink fallback="/buckets" label="Back" />
      <CurrentPath />
    </MemoryRouter>,
  );
};

describe('BackLink', () => {
  it('returns to a safe internal origin', async () => {
    const user = userEvent.setup();
    renderBackLink('/buckets/bucket-1/collaborate');

    await user.click(screen.getByRole('link', { name: 'Back' }));

    expect(screen.getByLabelText('current path')).toHaveTextContent(
      '/buckets/bucket-1/collaborate',
    );
  });

  it.each([undefined, 'https://example.com', '//example.com', 42])(
    'uses the deterministic fallback for unsafe origin %s',
    async (from) => {
      const user = userEvent.setup();
      renderBackLink(from);

      await user.click(screen.getByRole('link', { name: 'Back' }));

      expect(screen.getByLabelText('current path')).toHaveTextContent(
        '/buckets',
      );
    },
  );
});
