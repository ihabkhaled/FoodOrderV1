import { POST_AUTH_REDIRECT_PATH } from '../routes/auth-route-paths.constants';

export const RETURN_TO_QUERY_PARAMETER = 'returnTo';

const INTERNAL_ROUTE_ORIGIN = 'https://foodorder.local';

export const resolvePostAuthRedirect = (value: string | null): string => {
  const candidate = value?.trim();
  if (!candidate || !candidate.startsWith('/') || candidate.startsWith('//')) {
    return POST_AUTH_REDIRECT_PATH;
  }
  if (candidate.includes('\\')) return POST_AUTH_REDIRECT_PATH;

  try {
    const url = new URL(candidate, INTERNAL_ROUTE_ORIGIN);
    if (url.origin !== INTERNAL_ROUTE_ORIGIN) return POST_AUTH_REDIRECT_PATH;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return POST_AUTH_REDIRECT_PATH;
  }
};

export const buildAuthPathWithReturnTo = (
  authPath: string,
  returnTo: string,
): string => {
  const safeReturnTo = resolvePostAuthRedirect(returnTo);
  const search = new URLSearchParams({
    [RETURN_TO_QUERY_PARAMETER]: safeReturnTo,
  });
  return `${authPath}?${search.toString()}`;
};
