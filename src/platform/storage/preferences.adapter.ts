import { Preferences } from '@/packages/capacitor-preferences';

export const setPreference = async (key: string, value: string): Promise<void> => {
  await Preferences.set({ key, value });
};

export const getPreference = async (key: string): Promise<string | null> => {
  const result = await Preferences.get({ key });
  return result.value;
};
