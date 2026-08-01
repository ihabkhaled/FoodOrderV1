import { getPreference, removePreference, setPreference } from '@/platform/storage';

import type { TourPage } from './tour-pages.constants';
import { TOUR_PAGES } from './tour-pages.constants';



const tourKey = (page: TourPage): string => `ui:tour:${page}`;

/** A dismissed tour never opens itself again on this device. */
export const loadTourDismissed = async (page: TourPage): Promise<boolean> =>
  (await getPreference(tourKey(page))) === 'true';

export const saveTourDismissed = async (page: TourPage): Promise<void> => {
  await setPreference(tourKey(page), 'true');
};

/** Silences every tour in the app at once ("skip all"). */
export const saveAllToursDismissed = async (): Promise<void> => {
  await Promise.all(TOUR_PAGES.map((page) => setPreference(tourKey(page), 'true')));
};

/** Clears every dismissal so the tours introduce themselves again. */
export const clearTourDismissals = async (): Promise<void> => {
  await Promise.all(TOUR_PAGES.map((page) => removePreference(tourKey(page))));
};
