import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { Settings2 } from '@/packages/icons';

import { SettingsLinkRow } from '../../src/modules/settings/components/settings-link-row/settings-link-row.component';

describe('SettingsLinkRow', () => {
  it('renders an accessible link with title and hint', () => {
    render(
      <MemoryRouter>
        <SettingsLinkRow
          to="/settings/preferences"
          icon={Settings2}
          title="Preferences"
          hint="Name, language, theme, and currency."
        />
      </MemoryRouter>,
    );

    const link = screen.getByRole('link', { name: /Preferences/u });
    expect(link).toHaveAttribute('href', '/settings/preferences');
    expect(
      screen.getByText('Name, language, theme, and currency.'),
    ).toBeVisible();
  });
});
