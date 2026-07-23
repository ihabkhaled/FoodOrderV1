import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { PublicContentRoutes } from '@/modules/public-content';

const renderPublicRoute = (pathname: string) =>
  render(
    <MemoryRouter initialEntries={[pathname]}>
      <PublicContentRoutes applicationPath="/app" />
    </MemoryRouter>,
  );

describe('PublicContentRoutes', () => {
  it('renders the English homepage with semantic navigation and footer', () => {
    renderPublicRoute('/');

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Collect group food orders without chasing messages',
      }),
    ).toBeVisible();
    expect(screen.getAllByRole('link', { name: 'About' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: 'Open the app' })[0]).toHaveAttribute(
      'href',
      '/app',
    );
    expect(screen.getByRole('contentinfo')).toBeVisible();
    expect(
      screen.getByRole('document', { name: 'Gama3 Orderak' }),
    ).toHaveAttribute('dir', 'ltr');
    expect(screen.getByRole('document', { name: 'Gama3 Orderak' })).toHaveAttribute(
      'data-ad-eligible',
      'true',
    );
  });

  it('renders Arabic in RTL with all locale alternatives', () => {
    renderPublicRoute('/ar/faq');

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'ما تحتاج إلى معرفته قبل بدء طلب جماعي',
    );
    expect(
      screen.getByRole('document', { name: 'Gama3 Orderak' }),
    ).toHaveAttribute('dir', 'rtl');
    fireEvent.click(screen.getByText('العربية', { selector: 'summary > span' }));
    for (const language of [
      'English',
      'العربية',
      'Italiano',
      'فارسی',
      'Français',
      'Deutsch',
      'Español',
      'Português (Brasil)',
      'हिन्दी',
      'ไทย',
      '简体中文',
      '日本語',
    ]) {
      expect(screen.getByRole('link', { name: language })).toBeVisible();
    }
  });

  it('marks policy and system pages as advertising-ineligible', () => {
    const { unmount } = renderPublicRoute('/privacy');
    expect(screen.getByRole('document', { name: 'Gama3 Orderak' })).toHaveAttribute(
      'data-ad-eligible',
      'false',
    );
    unmount();

    renderPublicRoute('/does-not-exist');
    expect(screen.getByRole('document', { name: 'Gama3 Orderak' })).toHaveAttribute(
      'data-ad-eligible',
      'false',
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'That page is not on the menu',
    );
  });
});
