/** Every screen that introduces itself with a guided tour. */
export const TOUR_PAGES = [
  'dashboard',
  'buckets',
  'bucket-editor',
  'bucket-share',
  'bucket-share-members',
  'bucket-share-activity',
  'collaborate',
  'social-share',
  'join',
  'orders',
  'order-details',
  'create-order',
  'sessions',
  'session-details',
  'create-session',
  'social',
  'social-friends',
  'social-requests',
  'social-groups',
  'settings',
  'settings-preferences',
  'settings-privacy',
  'settings-security',
  'settings-account',
] as const;

export type TourPage = (typeof TOUR_PAGES)[number];
