import { getPreference, removePreference, setPreference } from '@/platform/storage';

/** Every screen that introduces itself with a guided tour. */
export const TOUR_PAGES = [
  'dashboard',
  'buckets',
  'bucket-editor',
  'bucket-share',
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
  'settings',
  'settings-preferences',
  'settings-privacy',
  'settings-security',
  'settings-account',
] as const;

export type TourPage = (typeof TOUR_PAGES)[number];

const tourKey = (page: TourPage): string => `ui:tour:${page}`;

/** A dismissed tour never opens itself again on this device. */
export const loadTourDismissed = async (page: TourPage): Promise<boolean> =>
  (await getPreference(tourKey(page))) === 'true';

export const saveTourDismissed = async (page: TourPage): Promise<void> => {
  await setPreference(tourKey(page), 'true');
};

/** Clears every dismissal so the tours introduce themselves again. */
export const clearTourDismissals = async (): Promise<void> => {
  await Promise.all(TOUR_PAGES.map((page) => removePreference(tourKey(page))));
};
