import type { Locale } from '@/modules/data-access';
import { Home, Info, Mail } from '@/packages/icons';

import { buildPublicContentPath } from '../routes/public-content-route-registry.helper';
import { getPublicPageCopy } from './public-content-catalog.helper';
import { toPublicLocale } from './public-locale.helper';

export interface PublicNavLink {
  id: string;
  href: string;
  label: string;
  icon: typeof Home;
  /** Where it sits relative to the application destinations. */
  placement: 'leading' | 'trailing';
}

/**
 * Marketing destinations shown inside the application shell.
 *
 * Owned by public-content because it is knowledge of the public pages, not of
 * the shell. It lived under app/shell until Settings needed it too, and a
 * module may not import from app.
 *
 * Built in one place rather than in each navigation component so the sidebar and the
 * bottom bar cannot drift apart — the bottom bar was missing these entirely,
 * which left mobile with no way back to the public site. Labels and paths come
 * from the public catalogue, so each one follows the active language.
 */
export const buildPublicNavLinks = (locale: Locale): PublicNavLink[] => {
  const publicLocale = toPublicLocale(locale);
  const entries: { id: 'home' | 'about' | 'contact'; icon: typeof Home; placement: PublicNavLink['placement'] }[] = [
    { id: 'home', icon: Home, placement: 'leading' },
    { id: 'about', icon: Info, placement: 'trailing' },
    { id: 'contact', icon: Mail, placement: 'trailing' },
  ];

  return entries.map(({ id, icon, placement }) => ({
    id,
    icon,
    placement,
    href: buildPublicContentPath(id, publicLocale),
    label: getPublicPageCopy(id, publicLocale).navigationLabel,
  }));
};
