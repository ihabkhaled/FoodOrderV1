/** First letters of the first two name parts, e.g. "Sara Adel" -> "SA". */
export const initials = (name: string): string =>
  name
    .split(/\s+/u)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('');
