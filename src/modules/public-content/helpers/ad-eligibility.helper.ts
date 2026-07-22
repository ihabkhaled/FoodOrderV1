import { findPublicRoute } from '../routes/public-content-route-registry.helper';
import type { PublicRouteId } from '../types/public-content.types';

export interface PublicAdEligibilityContext {
  routeId?: string;
  authenticated?: boolean;
  actionInProgress?: boolean;
  error?: boolean;
  loading?: boolean;
  overlayOpen?: boolean;
}

const isKnownPublicRouteId = (routeId: string): routeId is PublicRouteId =>
  [
    'home',
    'about',
    'how-it-works',
    'features',
    'group-ordering',
    'split-bill-and-receipts',
    'faq',
    'contact',
    'privacy',
    'terms',
  ].includes(routeId);

export const isPublicAdvertisingEligible = (
  context: PublicAdEligibilityContext,
): boolean => {
  if (
    context.authenticated ||
    context.actionInProgress ||
    context.error ||
    context.loading ||
    context.overlayOpen ||
    !context.routeId ||
    !isKnownPublicRouteId(context.routeId)
  ) {
    return false;
  }
  return findPublicRoute(context.routeId).adEligible;
};
