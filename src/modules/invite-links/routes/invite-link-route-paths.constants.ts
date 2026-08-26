export const INVITE_LINK_ROUTE_PATH = 'join/:token';

export const buildInviteLinkRoute = (token: string): string =>
  `/join/${encodeURIComponent(token)}`;
