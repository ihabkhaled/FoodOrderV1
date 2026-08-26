import type { Locale } from '@/modules/data-access';
import {
  buildPublicContentPath,
  getPublicPageCopy,
  toPublicLocale,
} from '@/modules/public-content';
import { Home, Info, Mail } from '@/packages/icons';

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
 * Built here rather than in each navigation component so the sidebar and the
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
