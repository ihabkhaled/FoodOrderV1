/** Synchronous web storage facade for device-local databases and sessions. */
export const readWebStorage = (key: string): string | null => localStorage.getItem(key);

export const writeWebStorage = (key: string, value: string): void => {
  localStorage.setItem(key, value);
};

export const removeWebStorage = (key: string): void => {
  localStorage.removeItem(key);
};
