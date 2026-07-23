import { describe, expect, it } from 'vitest';

import {
  buildPublicContentPath,
  buildPublicContentViewModel,
  buildPublicPageMetadata,
  isPublicAdvertisingEligible,
  matchPublicContentPath,
  PUBLIC_LOCALES,
  PUBLIC_ROUTE_DEFINITIONS,
} from '@/modules/public-content';

describe('public content registry and metadata', () => {
  it('owns 120 unique canonical public paths', () => {
    const paths = PUBLIC_ROUTE_DEFINITIONS.flatMap((route) =>
      PUBLIC_LOCALES.map((locale) =>
        buildPublicContentPath(route.id, locale.code),
      ),
    );

    expect(paths).toHaveLength(120);
    expect(new Set(paths).size).toBe(120);
    expect(paths).toContain('/');
    expect(paths).toContain('/about');
    expect(paths).toContain('/ar');
    expect(paths).toContain('/pt-br/split-bill-and-receipts');
    expect(paths).toContain('/zh-cn/faq');
    expect(paths).not.toContain('/en');
  });

  it('resolves locale-prefixed pages and rejects application paths', () => {
    expect(matchPublicContentPath('/fr/group-ordering/')).toEqual({
      kind: 'page',
      locale: 'fr',
      routeId: 'group-ordering',
    });
    expect(matchPublicContentPath('/app')).toBeNull();
    expect(matchPublicContentPath('/auth/login')).toBeNull();
  });

  it.each(PUBLIC_LOCALES)('builds complete SEO metadata for $code', (locale) => {
    const metadata = buildPublicPageMetadata('faq', locale.code);

    expect(metadata.title).not.toHaveLength(0);
    expect(metadata.description).not.toHaveLength(0);
    expect(metadata.canonical).toBe(
      `https://food-order-v1-peach.vercel.app${buildPublicContentPath('faq', locale.code)}`,
    );
    expect(metadata.alternates).toHaveLength(13);
    expect(metadata.alternates.at(-1)?.hrefLang).toBe('x-default');
    expect(metadata.socialImage).toBe(
      'https://food-order-v1-peach.vercel.app/social-preview.png',
    );
    expect(
      metadata.structuredData.some((entry) => entry['@type'] === 'FAQPage'),
    ).toBe(true);
  });

  it('keeps advertising default-deny and limits it to approved public content', () => {
    expect(isPublicAdvertisingEligible({ routeId: 'home' })).toBe(true);
    expect(isPublicAdvertisingEligible({ routeId: 'faq' })).toBe(true);
    expect(isPublicAdvertisingEligible({ routeId: 'privacy' })).toBe(false);
    expect(isPublicAdvertisingEligible({ routeId: 'contact' })).toBe(false);
    expect(isPublicAdvertisingEligible({ routeId: 'unknown' })).toBe(false);
    expect(
      isPublicAdvertisingEligible({ routeId: 'home', authenticated: true }),
    ).toBe(false);
    expect(
      isPublicAdvertisingEligible({ routeId: 'home', overlayOpen: true }),
    ).toBe(false);
  });

  it('provides localized noindex system-page view models', () => {
    const offline = buildPublicContentViewModel('/ar/offline');
    const notFound = buildPublicContentViewModel('/fa/does-not-exist');

    expect(offline.locale.code).toBe('ar');
    expect(offline.systemPage?.id).toBe('offline');
    expect(notFound.locale.code).toBe('fa');
    expect(notFound.systemPage?.id).toBe('not-found');
    expect(notFound.page).toBeNull();
  });
});
