import { describe, expect, it } from 'vitest';

import {
  buildAuthPathWithReturnTo,
  resolvePostAuthRedirect,
} from '../../src/modules/auth/helpers/post-auth-redirect.helper';

describe('post-auth redirect safety', () => {
  it.each([null, '', 'dashboard', '//evil.example/path', '/\\evil']) (
    'falls back for unsafe return target %s',
    (value) => {
      expect(resolvePostAuthRedirect(value)).toBe('/');
    },
  );

  it('preserves an internal path, query, and fragment', () => {
    expect(resolvePostAuthRedirect('/invite/code?source=share#order')).toBe(
      '/invite/code?source=share#order',
    );
  });

  it('builds an encoded auth target without accepting external redirects', () => {
    expect(buildAuthPathWithReturnTo('/auth/login', '/invite/a.b')).toBe(
      '/auth/login?returnTo=%2Finvite%2Fa.b',
    );
    expect(buildAuthPathWithReturnTo('/auth/login', 'https://evil.example')).toBe(
      '/auth/login?returnTo=%2F',
    );
  });
});
