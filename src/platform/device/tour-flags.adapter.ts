import { getPreference, removePreference, setPreference } from '@/platform/storage';

/** Pages that own a guided tour. */
export const TOUR_PAGES = [
  'dashboard',
  'buckets',
  'orders',
  'social',
  'settings',
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
