/** Absolute navigation targets owned by the auth module. */
export const AUTH_PATH = '/auth';
export const LOGIN_PATH = '/auth/login';
export const REGISTER_PATH = '/auth/register';
export const FORGOT_PASSWORD_PATH = '/auth/forgot';
/** In-app Firebase email-action handler (`?mode=resetPassword&oobCode=…`). */
export const RESET_PASSWORD_PATH = '/auth/action';

/** Where a freshly authenticated user lands. */
export const POST_AUTH_REDIRECT_PATH = '/app';
