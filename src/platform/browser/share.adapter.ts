/** Native share sheet when available; resolves false so callers can fall back to copy. */
export const shareText = async (title: string, text: string): Promise<boolean> => {
  if (typeof navigator.share !== 'function') return false;
  try {
    await navigator.share({ title, text });
    return true;
  } catch {
    return false;
  }
};
