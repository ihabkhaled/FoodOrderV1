/** Every screen that introduces itself with a guided tour. */
export const TOUR_PAGES = [
  'bucket-editor',
  'bucket-share',
  'buckets',
  'dashboard',
  'session-details',
] as const;

export type TourPage = (typeof TOUR_PAGES)[number];
