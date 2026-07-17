import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import {
  AUTH_PATH,
  authRoutes,
  FORGOT_PASSWORD_PATH,
  RESET_PASSWORD_PATH,
} from '@/modules/auth';
import { AppProvider } from '@/modules/session';

const renderAuthRoute = (entry: string) =>
  render(
    <AppProvider>
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path={AUTH_PATH}>
            {authRoutes.map((route) =>
              route.index ? (
                <Route key="index" index element={route.element} />
              ) : (
                <Route key={route.path} path={route.path} element={route.element} />
              ),
            )}
          </Route>
        </Routes>
      </MemoryRouter>
    </AppProvider>,
  );

describe('reset-password action route', () => {
  it('mounts at /auth/action and reports the local-mode limitation for a real code', async () => {
    renderAuthRoute(`${RESET_PASSWORD_PATH}?mode=resetPassword&oobCode=test-code`);

    expect(
      await screen.findByRole('heading', { name: 'This reset link is not valid' }),
    ).toBeVisible();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'This email action link is invalid or has already been used.',
    );
    expect(
      screen.getByRole('link', { name: 'Request a new reset link' }),
    ).toHaveAttribute('href', FORGOT_PASSWORD_PATH);
  });

  it('treats a link without mode and oobCode as invalid with guidance', async () => {
    renderAuthRoute(RESET_PASSWORD_PATH);

    expect(
      await screen.findByRole('heading', { name: 'This reset link is not valid' }),
    ).toBeVisible();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'The password-reset link is incomplete, has expired, or was already used.',
    );
  });
});
