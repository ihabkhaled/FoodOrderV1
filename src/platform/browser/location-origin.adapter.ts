/**
 * The origin the app is being served from.
 *
 * Invite links are built against this rather than a compiled-in constant, so a
 * link shared from a preview deployment or an installed PWA points back at the
 * host the sharer is actually using.
 */
export const getCurrentOrigin = (): string => globalThis.location.origin;
