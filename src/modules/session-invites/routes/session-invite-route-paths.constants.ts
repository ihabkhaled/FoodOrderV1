export const SESSION_INVITE_PATH = '/invite/:shareCode';

export const buildSessionInviteRoute = (shareCode: string): string =>
  `/invite/${encodeURIComponent(shareCode)}`;
