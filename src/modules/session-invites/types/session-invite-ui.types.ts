import type {
  GuestSessionView,
  Locale,
  PublicSessionInvitePreview,
} from '@/modules/data-access';

import type { SessionInviteMessageKey } from '../i18n/session-invite-messages.constants';

export type SessionInviteLocale = Extract<Locale, 'en' | 'ar'>;
export type GuestSessionMenuItem = GuestSessionView['menuItems'][number];
export type GuestResponseAction = 'done' | 'skipped';

export type SessionInviteTranslator = (
  locale: SessionInviteLocale,
  key: SessionInviteMessageKey,
  parameters?: Readonly<Record<string, string | number>>,
) => string;

export interface SessionInviteViewModel {
  locale: SessionInviteLocale;
  setLocale: (locale: SessionInviteLocale) => void;
  loading: boolean;
  error: string;
  notice: string;
  preview: PublicSessionInvitePreview | null;
  guestView: GuestSessionView | null;
  guestName: string;
  setGuestName: (value: string) => void;
  joining: boolean;
  busyItemId: string | null;
  responseBusy: boolean;
  linking: boolean;
  authenticated: boolean;
  loginPath: string;
  registerPath: string;
  translate: SessionInviteTranslator;
  refresh: () => Promise<void>;
  join: () => Promise<void>;
  changeQuantity: (item: GuestSessionMenuItem, quantity: number) => Promise<void>;
  updateResponse: (response: GuestResponseAction) => Promise<void>;
  linkAccount: () => Promise<void>;
}

export interface SessionInviteLanguageSwitchProps {
  locale: SessionInviteLocale;
  translate: SessionInviteTranslator;
  onChange: (locale: SessionInviteLocale) => void;
}

export interface SessionInvitePreviewProps {
  locale: SessionInviteLocale;
  preview: PublicSessionInvitePreview;
  guestName: string;
  joining: boolean;
  loginPath: string;
  registerPath: string;
  translate: SessionInviteTranslator;
  onGuestNameChange: (value: string) => void;
  onJoin: () => void;
}

export interface GuestSessionOrderProps {
  locale: SessionInviteLocale;
  view: GuestSessionView;
  busyItemId: string | null;
  responseBusy: boolean;
  linking: boolean;
  authenticated: boolean;
  loginPath: string;
  registerPath: string;
  translate: SessionInviteTranslator;
  onQuantityChange: (item: GuestSessionMenuItem, quantity: number) => void;
  onResponseChange: (response: GuestResponseAction) => void;
  onLinkAccount: () => void;
}
