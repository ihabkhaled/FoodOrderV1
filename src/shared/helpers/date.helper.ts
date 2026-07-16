export const nowIso = (): string => new Date().toISOString();

export const formatDateTime = (value: string, locale = 'en'): string =>
  new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
