import type { CurrencyCode } from '@/types/domain';

export const roundMoney = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

export const formatMoney = (
  value: number,
  currency: CurrencyCode,
  locale = 'en',
): string => new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value);
