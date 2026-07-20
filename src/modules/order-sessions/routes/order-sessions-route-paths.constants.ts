export const ORDER_SESSIONS_PATH = '/sessions';
export const ORDER_SESSION_NEW_PATH = '/sessions/new/:menuTemplateId';
export const ORDER_SESSION_DETAILS_PATH = '/sessions/:sessionId';


export const buildOrderSessionDetailsRoute = (sessionId: string): string =>
  `/sessions/${encodeURIComponent(sessionId)}`;
