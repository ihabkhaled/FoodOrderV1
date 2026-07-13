export const isEmail = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

/** Returns a message key so callers localize the failure (NR-012). */
export const validatePassword = (value: string): 'passwordTooShort' | null => {
  if (value.length < 8) return 'passwordTooShort';
  if (!/[a-zA-Z]/.test(value)) return 'passwordTooShort';
  if (!/\d/.test(value)) return 'passwordTooShort';
  return null;
};
